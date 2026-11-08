// Vite settings. Every value (ports, folders, pages) comes from config/frontend.json; the only fixed location is that file itself,
// found from this file's own folder (decision D17). The dev server also serves the forecast data folder at the data URL path; the
// forecast data itself is never copied into the build (nginx or the public host serves it).
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const frontendDir = dirname(fileURLToPath(import.meta.url));
const repoDir = resolve(frontendDir, '..');
const cfg = JSON.parse(readFileSync(join(repoDir, 'config', 'frontend.json'), 'utf8'));
const MIME = { '.pbf': 'application/x-protobuf', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.js': 'text/javascript', '.css': 'text/css',
  '.xml': 'application/xml', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' };

// The dev-server middleware below is in three small functions (PLAN-016, decision D47); their answers were compared request by request with the earlier one-piece version.

/** The file for a request address below `base`: { target, size }, or { status, text } when the request is refused (400 bad address, 403 outside `base`, 404 not a file). */
function safeTarget(base, rawUrl) {
  let target;
  try {
    target = resolve(base, '.' + decodeURIComponent((rawUrl ?? '/').split('?')[0]));
  } catch {
    return { status: 400, text: 'bad request' };
  }
  if (target.includes('\0') || !target.startsWith(base + sep)) return { status: 403, text: 'forbidden' };
  let info;
  try {
    info = statSync(target);
  } catch {
    return { status: 404, text: 'not found' };
  }
  return info.isFile() ? { target, size: info.size } : { status: 404, text: 'not found' };
}

/** The bytes to send for a Range header on a file of `size` bytes: { start, end, partial }, or { invalid: true } (416). One range only: bytes=a-b, bytes=a- or bytes=-n (the last n bytes). */
function byteRange(header, size) {
  let start = 0;
  let end = size - 1;
  if (!header) return { start, end, partial: false };
  const m = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (m && (m[1] !== '' || m[2] !== '')) {
    if (m[1] === '') start = Math.max(0, size - Number(m[2]));
    else {
      start = Number(m[1]);
      if (m[2] !== '') end = Math.min(Number(m[2]), size - 1);
    }
  }
  if (!m || start > end || start >= size) return { invalid: true };
  return { start, end, partial: true };
}

/** Answer a GET or HEAD for the file `target` of `size` bytes, with the type, the range support and nosniff headers. */
function sendFile(req, res, target, size) {
  res.setHeader('Content-Type', MIME[extname(target).toLowerCase()] ?? 'application/octet-stream');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const range = byteRange(req.headers.range, size);
  if (range.invalid) {
    res.statusCode = 416;
    res.setHeader('Content-Range', `bytes */${size}`);
    return res.end();
  }
  if (range.partial) {
    res.statusCode = 206;
    res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
  }
  res.setHeader('Content-Length', range.end - range.start + 1);
  if (req.method === 'HEAD') return res.end();
  return createReadStream(target, { start: range.start, end: range.end }).pipe(res);
}

/** Dev-server middleware: GET/HEAD files below `dir` at `urlPath`. Anything outside `dir` is refused (path traversal). */
function serveFolder(urlPath, dir) {
  const base = resolve(dir);
  return {
    name: `serve-folder-${urlPath}`,
    configureServer(server) {
      server.middlewares.use(urlPath, (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        const found = safeTarget(base, req.url);
        if (found.status) {
          res.statusCode = found.status;
          return res.end(found.text);
        }
        return sendFile(req, res, found.target, found.size);
      });
    },
  };
}

export default defineConfig({
  root: frontendDir,
  cacheDir: process.env[cfg.cache_dir_env] ?? join(frontendDir, 'node_modules', '.vite'),
  // the base-map folder first: its address lies below the data address, and the first matching folder answers
  plugins: [serveFolder(cfg.data_url_path + cfg.map.basemap.url_prefix, join(repoDir, cfg.dev_basemap_dir)), serveFolder(cfg.data_url_path, join(repoDir, cfg.dev_data_dir))],
  server: {
    host: cfg.dev_server.host,
    port: cfg.dev_server.port,
    strictPort: true,
    fs: { allow: [frontendDir, join(repoDir, 'config')] },
  },
  build: {
    outDir: process.env[cfg.build_dir_env] ?? join(frontendDir, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(cfg.build_pages.map((p) => [p.replace(/\.html$/, '').replaceAll('/', '_'), join(frontendDir, p)])),
      // MapLibre's worker is a .mjs file. A host that serves .mjs with another content type would break the map (E018), so it is emitted as .js, which every host serves as JavaScript.
      output: { assetFileNames: (asset) => ((asset.names?.[0] ?? asset.name ?? '').endsWith('.mjs') ? 'assets/[name]-[hash].js' : 'assets/[name]-[hash][extname]') },
    },
  },
});
