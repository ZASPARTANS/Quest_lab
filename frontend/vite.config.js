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

/** Dev-server middleware: GET/HEAD files below `dir` at `urlPath`. Anything outside `dir` is refused (path traversal). */
function serveFolder(urlPath, dir) {
  const base = resolve(dir);
  return {
    name: `serve-folder-${urlPath}`,
    configureServer(server) {
      server.middlewares.use(urlPath, (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        let target;
        try {
          target = resolve(base, '.' + decodeURIComponent((req.url ?? '/').split('?')[0]));
        } catch {
          res.statusCode = 400;
          return res.end('bad request');
        }
        if (target.includes('\0') || !target.startsWith(base + sep)) {
          res.statusCode = 403;
          return res.end('forbidden');
        }
        let info;
        try {
          info = statSync(target);
        } catch {
          res.statusCode = 404;
          return res.end('not found');
        }
        if (!info.isFile()) {
          res.statusCode = 404;
          return res.end('not found');
        }
        res.setHeader('Content-Type', MIME[extname(target).toLowerCase()] ?? 'application/octet-stream');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        let start = 0;
        let end = info.size - 1;
        const range = req.headers.range;
        if (range) {
          // one range only: bytes=a-b, bytes=a- or bytes=-n (the last n bytes); anything else is refused
          const m = /^bytes=(\d*)-(\d*)$/.exec(range);
          if (m && (m[1] !== '' || m[2] !== '')) {
            if (m[1] === '') start = Math.max(0, info.size - Number(m[2]));
            else {
              start = Number(m[1]);
              if (m[2] !== '') end = Math.min(Number(m[2]), info.size - 1);
            }
          }
          if (!m || start > end || start >= info.size) {
            res.statusCode = 416;
            res.setHeader('Content-Range', `bytes */${info.size}`);
            return res.end();
          }
          res.statusCode = 206;
          res.setHeader('Content-Range', `bytes ${start}-${end}/${info.size}`);
        }
        res.setHeader('Content-Length', end - start + 1);
        if (req.method === 'HEAD') return res.end();
        createReadStream(target, { start, end }).pipe(res);
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
