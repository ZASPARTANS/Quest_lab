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
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.js': 'text/javascript', '.css': 'text/css',
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
        res.setHeader('Content-Length', info.size);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        if (req.method === 'HEAD') return res.end();
        createReadStream(target).pipe(res);
      });
    },
  };
}

export default defineConfig({
  root: frontendDir,
  cacheDir: process.env[cfg.cache_dir_env] ?? join(frontendDir, 'node_modules', '.vite'),
  plugins: [serveFolder(cfg.data_url_path, join(repoDir, cfg.dev_data_dir))],
  server: {
    host: cfg.dev_server.host,
    port: cfg.dev_server.port,
    strictPort: true,
    fs: { allow: [frontendDir, join(repoDir, 'config')] },
  },
  build: {
    outDir: process.env[cfg.build_dir_env] ?? join(frontendDir, 'dist'),
    emptyOutDir: true,
    rollupOptions: { input: Object.fromEntries(cfg.build_pages.map((p) => [p.replace(/\.html$/, '').replaceAll('/', '_'), join(frontendDir, p)])) },
  },
});
