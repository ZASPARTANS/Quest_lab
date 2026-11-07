// SPIKE driver (PLAN-008 step 9.3b-1, throwaway): screenshots of the prototype pictures at the same view for each variant. Same environment variables as screenshots.mjs.
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const cfg = JSON.parse(readFileSync(new URL('../../config/frontend.json', import.meta.url), 'utf8')).screenshots;
const base = process.env[cfg.base_url_env];
const outDir = process.env[cfg.out_dir_env];
const channel = process.env[cfg.browser_channel_env];
const tag = channel ?? 'chromium';
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch(channel ? { channel } : { args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--unsafely-treat-insecure-origin-as-secure=${new URL(base).origin}`] });
const CASES = [
  // name, file, resampling, outline, view, zoom
  ['E-1440-fullgradient-z4.5', 'E-1440-gradient_rain.png', 'linear', 110, 'flat', 4.5],
  ['L16-1440-z4.5', 'L16-1440_rain.png', 'linear', 110, 'flat', 4.5],
  ['L32-1440-z4.5', 'L32-1440_rain.png', 'linear', 110, 'flat', 4.5],
  ['L16-1440-z3.5', 'L16-1440_rain.png', 'linear', 110, 'flat', 3.5],
  ['D-2048-bands-z3.5', 'D-2048-bilinear_rain.png', 'linear', 110, 'flat', 3.5],
  ['L16-1440-globe', 'L16-1440_rain.png', 'linear', 110, 'globe', 1.9],
];
for (const [name, file, resampling, outline, view, zoom] of CASES) {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await page.goto(`${base}/spikes/quality.html?file=${file}&resampling=${resampling}&view=${view}&outline=${outline}&zoom=${zoom}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.body.dataset.ready === 'true' || document.body.dataset.error, null, { timeout: 90000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(outDir, `step9-3b-${tag}-${name}.png`) });
  console.log(JSON.stringify({ name, error: await page.evaluate(() => document.body.dataset.error ?? null) }));
  await page.close();
}
await browser.close();
