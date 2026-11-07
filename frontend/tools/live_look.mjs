// Looks at the live layer (plan PLAN-009 step 9.3c-3) in a real browser: for two places, at three zoom levels, for the IFS rain and for the agreement,
// it waits until the live picture is on, prints how long the drawing took (data-live-ms) and the picture size, and saves a screenshot.
// Same environment variables as screenshots.mjs, e.g. with the computer's own browser and its real GPU:
//   SCREENSHOT_BROWSER_CHANNEL=msedge SCREENSHOT_BASE_URL=http://localhost:8080 SCREENSHOT_OUT_DIR=../docs/evidence/edge node tools/live_look.mjs
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const cfg = JSON.parse(readFileSync(new URL('../../config/frontend.json', import.meta.url), 'utf8')).screenshots;
const base = process.env[cfg.base_url_env];
const outDir = process.env[cfg.out_dir_env];
const channel = process.env[cfg.browser_channel_env];
if (!base || !outDir) throw new Error(`set ${cfg.base_url_env} and ${cfg.out_dir_env}`);
mkdirSync(outDir, { recursive: true });
const tag = channel ?? 'chromium';
const browser = await chromium.launch(channel ? { channel } : { args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--unsafely-treat-insecure-origin-as-secure=${new URL(base).origin}`] });
const PLACES = [['London', 51.5, -0.12, 'Europe/London'], ['Chennai', 13.08, 80.27, 'Asia/Kolkata']];
const dataset = (page) => page.evaluate(() => ({ ...document.getElementById('map').dataset }));
const live = (page) => page.waitForFunction(() => { const m = document.getElementById('map').dataset; return m.flying === 'false' && m.live === 'on'; }, null, { timeout: 60000 });
let failed = false;

for (const [name, lat, lon, tz] of PLACES) {
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 800 } })).newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => problems.push(e.message.slice(0, 160)));
  await page.goto(`${base}/?lat=${lat}&lon=${lon}&name=${name}&tz=${tz}&activity=outdoor`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.getElementById('map').dataset.ready === 'true', null, { timeout: 90000 });
  for (const model of ['ifs', 'both']) {
    await page.click(`label[for="map-model-${model}"]`);
    // zoom 7 (where the address flight lands), then out to 5, then in to 8
    for (const [label, keys] of [['z7', []], ['z5', ['Minus', 'Minus']], ['z8', ['Equal', 'Equal', 'Equal']]]) {
      if (keys.length) {
        await page.mouse.click(1000, 400);
        await page.waitForTimeout(300);
        for (const k of keys) { await page.keyboard.press(k); await page.waitForTimeout(500); }
      }
      await live(page).catch(() => { failed = true; });
      await page.waitForTimeout(700);
      const d = await dataset(page);
      console.log(JSON.stringify({ place: name, model, view: label, zoom: Number(d.zoom), live: d.live, drawMs: Number(d.liveMs), pictureSize: d.liveSize, frame: d.frame }));
      await page.screenshot({ path: join(outDir, `step9-3c-${tag}-${name}-${label}-${model}.png`) });
    }
  }
  if (problems.length) { failed = true; console.log('PROBLEMS', problems.slice(0, 3)); }
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
