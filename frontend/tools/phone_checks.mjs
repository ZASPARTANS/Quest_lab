// Phone checks (plan PLAN-013 step 13.5c): the page in an emulated phone (touch, small screen, high pixel density) in the engine of Android Chrome (Chromium)
// and of iPhones (WebKit). It MEASURES what matters on a phone and prints a report; the exit code is 1 if a limit is broken:
//   - no sideways scrolling;  - every tap target at least 44 x 44 CSS pixels (WCAG 2.5.5; the map library's own attribution button is listed apart);
//   - the map is visible on the first screen and the controls (top row, key, time bar) cover no more than 45 % of it;  - a tap on a day tile moves the map;
//   - "Use my location" with an emulated position names the place (the place-name service is answered by a test double, so no real position or address is sent anywhere).
// Usage (Docker, which has both engines):  docker compose -f docker/compose.yaml run --rm -e SCREENSHOT_BASE_URL=https://zaspartans.github.io/Quest_lab browser-checks node tools/phone_checks.mjs
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, devices, webkit } from 'playwright';

const frontend = JSON.parse(readFileSync(new URL('../../config/frontend.json', import.meta.url), 'utf8'));
const cfg = frontend.browser_checks;
const base = process.env[cfg.base_url_env];
const outDir = process.env[cfg.out_dir_env];
if (!base || !outDir) throw new Error(`set ${cfg.base_url_env} and ${cfg.out_dir_env}`);
mkdirSync(outDir, { recursive: true });
const reverseHost = new URL(frontend.reverse_geocoder.url).host;
const MIN_TARGET = 44;
const MAX_COVER = 0.45;
const ADDRESS = '/?lat=13.08&lon=80.27&name=Chennai&tz=Asia/Kolkata&activity=outdoor';

const profiles = [
  { name: 'Pixel 7 (Chromium)', engine: chromium, device: devices['Pixel 7'], launch: { args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
  { name: 'iPhone 15 (WebKit)', engine: webkit, device: devices['iPhone 15'], launch: {} },
];

/** Visible interactive things smaller than the minimum, measured in CSS pixels. */
const smallTargets = (page) => page.evaluate((min) => {
  const out = [];
  for (const el of document.querySelectorAll('button, a[href], input:not([type="radio"]):not([hidden]), select, label[for], summary, [role="button"]')) {
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    if (r.width === 0 || r.height === 0 || style.visibility === 'hidden' || style.display === 'none' || el.closest('[hidden]')) continue;
    if (el.classList.contains('sr-only') || r.width <= 2) continue; // text only for screen readers, not a tap target
    if (el.tagName === 'A' && el.closest('p')) continue; // a link inside a sentence is exempt from the target size rule (WCAG 2.5.8, inline exception)
    if (r.width < min || r.height < min) {
      const text = (el.textContent || el.getAttribute('aria-label') || el.id || el.className || '').trim().replace(/\s+/g, ' ').slice(0, 28);
      out.push({ tag: el.tagName.toLowerCase(), text, w: Math.round(r.width), h: Math.round(r.height), library: Boolean(el.closest('.maplibregl-ctrl')) });
    }
  }
  return out;
}, MIN_TARGET);

const coverage = (page) => page.evaluate(() => {
  const map = document.getElementById('map').getBoundingClientRect();
  const view = { top: Math.max(0, map.top), bottom: Math.min(window.innerHeight, map.bottom) };
  const visible = Math.max(0, view.bottom - view.top);
  const rects = [...document.querySelectorAll('.map-top, .map-bottom')].map((n) => n.getBoundingClientRect());
  // overlays are stacked at the top and the bottom of the map: the covered height is the part of each inside the visible map (they do not overlap each other unless the map is tiny)
  let covered = 0;
  for (const r of rects) covered += Math.max(0, Math.min(r.bottom, view.bottom) - Math.max(r.top, view.top)) * Math.min(1, r.width / map.width);
  return { mapTop: Math.round(map.top), mapHeight: Math.round(map.height), visible: Math.round(visible), covered: Math.round(covered), share: visible ? covered / visible : 1, viewport: [window.innerWidth, window.innerHeight] };
});

async function check(profile) {
  const browser = await profile.engine.launch(profile.launch);
  const context = await browser.newContext({ ...profile.device, permissions: ['geolocation'], geolocation: { latitude: 11.46, longitude: 78.19 }, timezoneId: 'Asia/Kolkata' });
  await context.route(`https://${reverseHost}/**`, (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify({ locality: 'Rasipuram', principalSubdivision: 'Tamil Nadu', countryName: 'India' }) }));
  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) problems.push(`console: ${m.text().slice(0, 140)}`); });
  await page.goto(base + ADDRESS);
  await page.waitForSelector('#plan:not([hidden]) .day', { timeout: 60000 });
  await page.waitForFunction(() => ['ready', 'unavailable', 'failed'].includes(document.body.dataset.map), null, { timeout: 60000 });
  const mapState = await page.evaluate(() => document.body.dataset.map);
  await page.waitForTimeout(2500);
  const report = { profile: profile.name, mapState, problems };
  report.overflowPx = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  report.cover = await coverage(page);
  const all = await smallTargets(page);
  report.small = all.filter((t) => !t.library);
  report.smallLibrary = all.filter((t) => t.library);
  const slug = profile.name.split(' ')[0].toLowerCase() + profile.name.split(' ')[1];
  await page.screenshot({ path: join(outDir, `phone-${slug}-first-screen.png`) });
  await page.screenshot({ path: join(outDir, `phone-${slug}-full-page.png`), fullPage: true });
  // a tap on a day tile moves the map to that block
  if (mapState === 'ready') {
    const before = await page.evaluate(() => document.getElementById('map').dataset.frame);
    const tile = page.locator('.day .block-hit').nth(6);
    await tile.scrollIntoViewIfNeeded();
    await tile.tap();
    await page.waitForTimeout(800);
    report.tapMovedMap = before !== await page.evaluate(() => document.getElementById('map').dataset.frame);
  }
  // the device position names the place: a NEW visitor (no permission yet) opens the page, allows the position and taps the button
  const fresh = await browser.newContext({ ...profile.device, geolocation: { latitude: 11.46, longitude: 78.19 }, timezoneId: 'Asia/Kolkata' });
  await fresh.route(`https://${reverseHost}/**`, (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify({ locality: 'Rasipuram', principalSubdivision: 'Tamil Nadu', countryName: 'India' }) }));
  const second = await fresh.newPage();
  await second.goto(base + '/');
  await second.waitForSelector('#use-location', { timeout: 30000 });
  await fresh.grantPermissions(['geolocation'], { origin: new URL(base).origin });
  await second.locator('#use-location').tap();
  await second.waitForFunction(() => /Rasipuram/.test(document.getElementById('title').textContent), null, { timeout: 30000 }).catch(() => {});
  report.locationNamed = /Rasipuram/.test(await second.locator('#title').innerText());
  await browser.close();
  return report;
}

let failed = 0;
for (const profile of profiles) {
  const r = await check(profile);
  console.log(`\n== ${r.profile}: map ${r.mapState}`);
  console.log(`   sideways overflow: ${r.overflowPx} px ${r.overflowPx > 0 ? 'FAIL' : 'ok'}`);
  console.log(`   map on the first screen: top ${r.cover.mapTop}px, ${r.cover.visible}px of ${r.cover.mapHeight}px visible (screen ${r.cover.viewport.join('x')}), controls cover ${(r.cover.share * 100).toFixed(0)} % ${r.cover.share > MAX_COVER ? 'FAIL (limit 45 %)' : 'ok'}`);
  console.log(`   tap targets under ${MIN_TARGET} px: ${r.small.length} ${r.small.length ? 'FAIL' : 'ok'}${r.smallLibrary.length ? `   (map library's own: ${r.smallLibrary.length}, listed apart)` : ''}`);
  for (const t of r.small.slice(0, 14)) console.log(`      ${t.tag} "${t.text}" ${t.w}x${t.h}`);
  if (r.small.length > 14) console.log(`      ... and ${r.small.length - 14} more`);
  if ('tapMovedMap' in r) console.log(`   a tap on a day tile moves the map: ${r.tapMovedMap ? 'ok' : 'FAIL'}`);
  console.log(`   "Use my location" names the place: ${r.locationNamed ? 'ok' : 'FAIL'}`);
  if (r.problems.length) console.log(`   console errors: ${r.problems.slice(0, 3).join(' | ')}`);
  failed += (r.overflowPx > 0) + (r.cover.share > MAX_COVER) + (r.small.length > 0) + ('tapMovedMap' in r && !r.tapMovedMap) + !r.locationNamed + r.problems.length;
}
console.log(failed ? `\n${failed} phone problem(s)` : '\nall phone checks passed');
process.exit(failed ? 1 : 0);
