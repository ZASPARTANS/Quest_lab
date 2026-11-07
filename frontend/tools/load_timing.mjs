// Measures how fast the page gets to a drawn map: first visit (empty browser cache) and a second visit in the same browser (cache in use).
// For each visit it prints the milliseconds until the plan was on screen and until the map was ready (data-ready), and how many files came
// from the browser cache, from the network, and how many bytes were transferred. Same environment variables as screenshots.mjs.
// Run with the computer's own browser and its real GPU:  SCREENSHOT_BROWSER_CHANNEL=msedge SCREENSHOT_BASE_URL=http://localhost:8080 node tools/load_timing.mjs
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const cfg = JSON.parse(readFileSync(new URL('../../config/frontend.json', import.meta.url), 'utf8')).screenshots;
const base = process.env[cfg.base_url_env];
const channel = process.env[cfg.browser_channel_env];
if (!base) throw new Error(`set ${cfg.base_url_env}`);
const browser = await chromium.launch(channel ? { channel } : { args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--unsafely-treat-insecure-origin-as-secure=${new URL(base).origin}`] });
const PAGES = { globe_first: '/', place_from_address: '/?lat=13.08&lon=80.27&name=Chennai&tz=Asia/Kolkata&activity=outdoor' };

async function visit(context, path) {
  const page = await context.newPage();
  await page.goto(base + path, { waitUntil: 'commit' });
  const marks = await page.evaluate(() => new Promise((resolve) => {
    const out = {};
    const check = () => {
      const t = performance.now();
      if (out.plan === undefined && document.querySelector('#plan:not([hidden]) .day, #welcome:not([hidden])')) out.plan = Math.round(t);
      const map = document.getElementById('map');
      if (out.map === undefined && map && map.dataset.ready === 'true' && map.dataset.flying !== 'true') out.map = Math.round(t);
      if (out.map !== undefined && out.plan !== undefined) return resolve(out);
      if (t > 90000) return resolve(out);
      return setTimeout(check, 20);
    };
    check();
  }));
  const files = await page.evaluate(() => {
    const entries = performance.getEntriesByType('resource');
    return { cached: entries.filter((e) => e.transferSize === 0).length, network: entries.filter((e) => e.transferSize > 0).length,
      kilobytes: Math.round(entries.reduce((s, e) => s + e.transferSize, 0) / 1000) };
  });
  await page.close();
  return { plan_ms: marks.plan, map_ready_ms: marks.map, ...files };
}

for (const [name, path] of Object.entries(PAGES)) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } }); // a new context = an empty cache
  const first = await visit(context, path);
  const second = await visit(context, path);
  console.log(JSON.stringify({ page: name, first_visit: first, second_visit: second }));
  await context.close();
}
console.log(`browser: ${browser.version()}${channel ? ` (${channel})` : ' (software WebGL in Docker)'}`);
await browser.close();
