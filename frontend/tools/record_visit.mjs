// Record what real first visits request (plan PLAN-014 step 14.1): the exact list of requests (path, Range header, status, bytes) of three kinds of visitor,
// written to a JSON file that scripts/load_test.py replays. Run it against the LOCAL test site only (it opens a real browser with an empty cache):
//   node tools/record_visit.mjs http://localhost:8081/Quest_lab ../docs/evidence/visits.json
// The three visitors: a place from a link (Chennai, close fly-in); another place (London); a visitor who starts on the globe and clicks the map.
// Only requests to the site's own host are recorded; the two geocoder hosts are never contacted by these visitors. No personal data is involved.
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { skipGuide } from './guide_skip.mjs';

const [base, out] = process.argv.slice(2);
if (!base || !out) throw new Error('usage: node tools/record_visit.mjs <site address> <output file>');
const origin = new URL(base).origin;
const sitePath = new URL(base).pathname.replace(/\/$/, '');

const KIND = [[/\/data\/tiles\//, 'tile'], [/\/data\/frames\//, 'picture'], [/\/data\/manifest\.json/, 'manifest'], [/\/data\/status\.json/, 'status'], [/\.pmtiles$/, 'basemap'],
  [/\/data\/basemap\/assets\/fonts\//, 'font'], [/\/data\/basemap\/assets\/sprites\//, 'sprite'], [/\/assets\//, 'asset']];
const kindOf = (path) => (KIND.find(([re]) => re.test(path)) ?? [null, 'page'])[1];

async function record(browser, name, start, act) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  await skipGuide(context);
  const page = await context.newPage();
  const seen = [];
  page.on('response', async (r) => {
    const url = new URL(r.url());
    if (url.origin !== origin || !(url.pathname === sitePath || url.pathname.startsWith(`${sitePath}/`))) return; // only the site's own files, not the browser's own requests
    const body = await r.body().catch(() => null);
    seen.push({ at: Date.now(), path: url.pathname.slice(sitePath.length) + url.search, range: r.request().headers().range ?? null, status: r.status(), bytes: body ? body.length : 0 });
  });
  await page.goto(base + start);
  await page.waitForFunction(() => ['ready', 'unavailable', 'failed'].includes(document.body.dataset.map), null, { timeout: 60000 });
  if (act) await act(page);
  await page.waitForTimeout(4000); // the last tiles and pictures arrive
  await context.close();
  const t0 = Math.min(...seen.map((s) => s.at));
  return { name, requests: seen.sort((a, b) => a.at - b.at).map((s) => ({ path: s.path === '' ? '/' : s.path, range: s.range, status: s.status, bytes: s.bytes, kind: kindOf(s.path), atMs: s.at - t0 })) };
}

const browser = await chromium.launch({ channel: 'msedge' });
const visitors = [
  await record(browser, 'Chennai from a link', '/?lat=13.08&lon=80.27&name=Chennai&tz=Asia/Kolkata&activity=outdoor', async (page) => {
    await page.waitForFunction(() => document.getElementById('map').dataset.live === 'on', null, { timeout: 60000 });
  }),
  await record(browser, 'London from a link', '/?lat=51.5&lon=-0.12&name=London&tz=Europe/London&activity=commute', async (page) => {
    await page.waitForFunction(() => document.getElementById('map').dataset.live === 'on', null, { timeout: 60000 });
  }),
  await record(browser, 'Globe, then a click on the map', '/', async (page) => {
    await page.waitForFunction(() => document.getElementById('map').dataset.ready === 'true', null, { timeout: 60000 });
    const box = await page.locator('#map').boundingBox();
    await page.mouse.click(box.x + box.width * 0.62, box.y + box.height * 0.5);
    await page.waitForSelector('#plan:not([hidden]) .day', { timeout: 60000 });
  }),
];
await browser.close();
const doc = { recorded_from: 'the local Pages-like test site (a real browser with an empty cache)', recorded_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), visitors };
writeFileSync(out, JSON.stringify(doc, null, 1));
for (const v of visitors) {
  const total = v.requests.reduce((s, r) => s + r.bytes, 0);
  const kinds = Object.entries(v.requests.reduce((m, r) => ({ ...m, [r.kind]: (m[r.kind] ?? 0) + 1 }), {})).map(([k, n]) => `${k} ${n}`).join(', ');
  console.log(`${v.name}: ${v.requests.length} requests, ${(total / 1e6).toFixed(2)} MB (${kinds})`);
}
