// Screenshots of the page at several window widths with one place chosen (PLAN-007 step 9.5, for the user's look at the design).
// For each width: one shot of the window as a visitor sees it, and one "tall" shot of the whole plan column (or the whole page on a phone).
// Settings: config/frontend.json "design_shots". Example, with the computer's own browser and its real GPU:
//   SCREENSHOT_BROWSER_CHANNEL=msedge SCREENSHOT_BASE_URL=http://localhost:8080 SCREENSHOT_OUT_DIR=../docs/evidence/design node tools/design_shots.mjs
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { skipGuide } from './guide_skip.mjs';

const cfg = JSON.parse(readFileSync(new URL('../../config/frontend.json', import.meta.url), 'utf8')).design_shots;
const base = process.env[cfg.base_url_env];
const outDir = process.env[cfg.out_dir_env];
const channel = process.env[cfg.channel_env];
if (!base || !outDir) throw new Error(`set ${cfg.base_url_env} and ${cfg.out_dir_env}`);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch(channel ? { channel } : { args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--unsafely-treat-insecure-origin-as-secure=${new URL(base).origin}`] });
let failed = false;
for (const width of cfg.widths) {
  const context = await browser.newContext({ viewport: { width, height: cfg.height } });
  await skipGuide(context);
  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => problems.push(`page error: ${e.message.slice(0, 160)}`));
  await page.goto(base + cfg.path, { waitUntil: 'load' });
  await page.waitForSelector('#plan:not([hidden]) .day', { timeout: cfg.ready_timeout_seconds * 1000 });
  await page.waitForFunction(() => ['ready', 'unavailable', 'failed'].includes(document.body.dataset.map), null, { timeout: cfg.ready_timeout_seconds * 1000 });
  await page.waitForFunction(() => document.getElementById('map').dataset.flying !== 'true', null, { timeout: cfg.ready_timeout_seconds * 1000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(outDir, `${cfg.file_prefix}${width}.png`) });
  const wide = width > 896; // the layout switches to one column at 56 rem
  const tall = wide ? await page.evaluate(() => document.querySelector('.side').scrollHeight) : null;
  if (wide) {
    await page.setViewportSize({ width, height: Math.min(cfg.tall_max_height, tall + 20) });
    await page.waitForTimeout(800);
    await page.locator('.side').screenshot({ path: join(outDir, `${cfg.file_prefix}${width}-plan.png`) });
  } else {
    await page.screenshot({ path: join(outDir, `${cfg.file_prefix}${width}-full.png`), fullPage: true });
  }
  const mapState = await page.evaluate(() => document.body.dataset.map);
  failed ||= mapState !== 'ready' || problems.length > 0;
  console.log(JSON.stringify({ width, map: mapState, tallPx: tall, problems: problems.slice(0, 3) }));
  await context.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
