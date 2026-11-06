// Opens every page listed in config/frontend.json ("screenshots") in a real browser (Playwright, Docker image), saves a screenshot of
// each and prints what the page did: did it finish drawing, console and Content-Security-Policy errors, which hosts it contacted and
// how many bytes it loaded. Exit code 1 if a page did not finish, reported an error, or contacted any host other than the site itself.
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const cfg = JSON.parse(readFileSync(new URL('../../config/frontend.json', import.meta.url), 'utf8')).screenshots;
const base = process.env[cfg.base_url_env];
const outDir = process.env[cfg.out_dir_env];
if (!base || !outDir) throw new Error(`set ${cfg.base_url_env} and ${cfg.out_dir_env}`);
mkdirSync(outDir, { recursive: true });
const siteHost = new URL(base).host;

const channel = process.env[cfg.browser_channel_env]; // e.g. msedge: use the browser installed on this computer instead of the Docker one
const browser = await chromium.launch(channel ? { channel } : {
  // --no-sandbox: the container is the sandbox. swiftshader: software WebGL, there is no GPU in the container.
  // The test site is reached as http://preview:8080, which a browser does not trust like http://localhost; treating it as secure here makes
  // the browser behave as it will on the HTTPS public site (security headers such as COOP, geolocation in step 8). Test browser only.
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    `--unsafely-treat-insecure-origin-as-secure=${new URL(base).origin}`],
});
let failed = false;
for (const item of cfg.pages) {
  const context = await browser.newContext({ viewport: cfg.viewport });
  const page = await context.newPage();
  const hosts = new Set();
  const problems = [];
  let bytes = 0;
  page.on('request', (r) => hosts.add(new URL(r.url()).host));
  page.on('requestfinished', async (r) => {
    const sizes = await r.sizes();
    bytes += sizes.responseBodySize + sizes.responseHeadersSize;
  });
  page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`console ${m.type()}: ${m.text().slice(0, 240)}`); });
  page.on('pageerror', (e) => problems.push(`page error: ${e.message.slice(0, 200)} | ${String(e.stack ?? '').split('\n').slice(1, 3).join(' ').slice(0, 200)}`));

  const started = Date.now();
  await page.goto(base + item.path, { waitUntil: 'load' });
  let state = { ready: true, error: null };
  if (item.wait_for_ready) {
    await page.waitForFunction(() => window.__ready === true || window.__error, null, { timeout: cfg.ready_timeout_seconds * 1000 }).catch(() => {});
    state = await page.evaluate(() => ({ ready: window.__ready === true, error: window.__error ?? null }));
  }
  await page.waitForTimeout(1500); // let the last frame settle
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const badge = await page.evaluate(() => { const b = document.getElementById('env-badge'); return b ? !b.hidden : null; });
  await page.screenshot({ path: join(outDir, `${cfg.file_prefix}${item.name}.png`) });
  const outsiders = [...hosts].filter((h) => h !== siteHost);
  const bad = !state.ready || state.error || problems.length || outsiders.length;
  failed ||= Boolean(bad);
  console.log(JSON.stringify({ page: item.name, ok: !bad, ready: state.ready, error: state.error, seconds: Number(seconds), kilobytes_loaded: Math.round(bytes / 1000),
    devBadgeVisible: badge, otherHosts: outsiders, problems: problems.slice(0, 6) }));
  await context.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
