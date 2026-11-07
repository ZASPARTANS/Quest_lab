// SPIKE driver (PLAN-007 step 9.1, throwaway): runs frontend/spikes/flyin.html in a real browser for way A and way B, takes a screenshot at the
// start (globe), in the middle of the flight and at the end, and prints where the map ended. Same environment variables as screenshots.mjs.
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const cfg = JSON.parse(readFileSync(new URL('../../config/frontend.json', import.meta.url), 'utf8')).screenshots;
const base = process.env[cfg.base_url_env];
const outDir = process.env[cfg.out_dir_env];
const channel = process.env[cfg.browser_channel_env];
const tag = process.env.SPIKE_TAG ?? (channel ?? 'chromium');
if (!base || !outDir) throw new Error(`set ${cfg.base_url_env} and ${cfg.out_dir_env}`);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch(channel ? { channel } : { args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--unsafely-treat-insecure-origin-as-secure=${new URL(base).origin}`] });
const target = { lon: 80.27, lat: 13.08 };
let failed = false;
for (const way of ['A', 'B']) {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => problems.push(e.message.slice(0, 200)));
  await page.goto(`${base}/spikes/flyin.html?way=${way}&duration=4000`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.body.dataset.phase === 'ready' || document.body.dataset.error, null, { timeout: 90000 });
  const shot = (name) => page.screenshot({ path: join(outDir, `step9-1-${tag}-${way}-${name}.png`) });
  await shot('1-start-globe');
  await page.click('#go');
  await page.waitForFunction(() => Number(document.body.dataset.zoom) >= 3.2, null, { timeout: 60000 });
  await shot('2-mid-flight');
  await page.waitForFunction(() => document.body.dataset.phase === 'done', null, { timeout: 90000 });
  await page.waitForTimeout(800);
  await shot('3-end');
  const end = await page.evaluate(() => ({ ...document.body.dataset }));
  const off = Math.max(Math.abs(Number(end.lon) - target.lon), Math.abs(Number(end.lat) - target.lat));
  const ok = off < 0.01 && Math.abs(Number(end.zoom) - 4.5) < 0.01 && !end.error && problems.length === 0;
  failed ||= !ok;
  console.log(JSON.stringify({ way, ok, endLon: end.lon, endLat: end.lat, endZoom: end.zoom, maxOffsetDegrees: Number(off.toFixed(5)), error: end.error ?? null, problems: problems.slice(0, 3) }));
}
await browser.close();
process.exit(failed ? 1 : 0);
