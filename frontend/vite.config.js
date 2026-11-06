// Vite settings. Every value (ports, folders, pages) comes from config/frontend.json; the only fixed location is that file itself,
// found from this file's own folder (decision D17). Serves the forecast data folder and CesiumJS's static folders in the dev server,
// and copies the CesiumJS folders into the build; the forecast data itself is never copied into the build (nginx or the host serves it).
import { cpSync, createReadStream, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const frontendDir = dirname(fileURLToPath(import.meta.url));
const repoDir = resolve(frontendDir, '..');
const cesiumPackageDir = dirname(createRequire(import.meta.url).resolve('cesium/package.json')); // works on the host and in the Docker image
const cfg = JSON.parse(readFileSync(join(repoDir, 'config', 'frontend.json'), 'utf8'));
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.js': 'text/javascript', '.css': 'text/css',
  '.xml': 'application/xml', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary' };

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

/** Build step: copy the CesiumJS folders (minus the ones listed to skip) to <outDir>/<cesium url path>. */
function copyCesium() {
  let outDir;
  return {
    name: 'copy-cesium-folders',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const source = join(cesiumPackageDir, cfg.cesium.package_subdir);
      const skip = cfg.cesium.skip_folders.map((f) => resolve(source, f));
      for (const folder of cfg.cesium.copy_folders) {
        cpSync(join(source, folder), join(outDir, cfg.cesium.url_path, folder), {
          recursive: true,
          filter: (path) => !skip.some((s) => path === s || path.startsWith(s + sep)),
        });
      }
    },
  };
}

export default defineConfig({
  root: frontendDir,
  cacheDir: process.env[cfg.cache_dir_env] ?? join(frontendDir, 'node_modules', '.vite'),
  plugins: [
    serveFolder(cfg.data_url_path, join(repoDir, cfg.dev_data_dir)),
    serveFolder(cfg.cesium.url_path, join(cesiumPackageDir, cfg.cesium.package_subdir)),
    copyCesium(),
  ],
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
