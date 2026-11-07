// Several REAL browser visitors at the same moment (plan PLAN-014 steps 14.2 and 14.3): N browser contexts (empty caches, like N different people) open the same
// place link together; for each it measures the time until the plan is shown, until the map is ready and until the live rain picture is drawn, the bytes it
// downloaded, console errors, and the JavaScript memory in use. The default browser is Edge with the computer's own GPU (Chromium in Docker draws in software).
//   node tools/concurrent_visitors.mjs http://127.0.0.1:8081/Quest_lab 10
//   node tools/concurrent_visitors.mjs https://zaspartans.github.io/Quest_lab 3 --approved "user go 2026-11-07 HH:MM"
// SAFETY: a site that is not on this computer is refused unless --approved "<who, when>" is given, and then at most 3 visitors are allowed (about 12 MB).
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const [base, countText] = args;
const approvedAt = args.indexOf('--approved');
const approved = approvedAt >= 0 ? args[approvedAt + 1] : '';
const count = Number(countText);
if (!base || !Number.isInteger(count) || count < 1) throw new Error('usage: node tools/concurrent_visitors.mjs <site address> <visitors> [--approved "<who, when>"]');
const host = new URL(base).hostname;
const local = ['localhost', '127.0.0.1', '::1'].includes(host);
if (!local && (!approved || count > 3)) {
  console.log(`REFUSED: ${host} is not on this computer; it needs --approved "<who, when>" and at most 3 visitors (asked for ${count})`);
  process.exit(2);
}
const ADDRESS = '/?lat=13.08&lon=80.27&name=Chennai&tz=Asia/Kolkata&activity=outdoor';
const channel = process.env.SCREENSHOT_BROWSER_CHANNEL ?? 'msedge';

async function visit(browser, number) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  let bytes = 0;
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
  page.on('pageerror', (e) => errors.push(`page error: ${e.message.slice(0, 120)}`));
  page.on('response', async (r) => { const body = await r.body().catch(() => null); if (body) bytes += body.length; });
  const started = Date.now();
  const since = () => Date.now() - started;
  const time = {};
  try {
    await page.goto(base + ADDRESS, { timeout: 120000 }); // many browsers on one computer start slowly: give the load the same time as the waits below
    await page.waitForSelector('#plan:not([hidden]) .day', { timeout: 120000 });
    time.plan = since();
    await page.waitForFunction(() => ['ready', 'unavailable', 'failed'].includes(document.body.dataset.map), null, { timeout: 120000 });
    time.map = since();
    time.state = await page.evaluate(() => document.body.dataset.map);
    await page.waitForFunction(() => document.getElementById('map').dataset.live === 'on', null, { timeout: 120000 });
    time.live = since();
  } catch (error) {
    errors.push(`did not finish: ${String(error.message).split('\n')[0].slice(0, 100)}`);
  }
  await page.waitForTimeout(1500);
  const heap = await page.evaluate(() => (performance.memory ? performance.memory.usedJSHeapSize / 1e6 : null)).catch(() => null);
  await context.close();
  return { number, ...time, mb: bytes / 1e6, heapMb: heap, errors };
}

const stats = (values) => { const v = values.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? `median ${v[Math.floor(v.length / 2)].toFixed(0)}  max ${v[v.length - 1].toFixed(0)}` : 'n/a'; };
console.log(`${count} real browser visitor(s) at once on ${base}${local ? '' : ` (approved: ${approved})`}`);
const browser = await chromium.launch({ channel });
const t0 = Date.now();
const results = await Promise.all(Array.from({ length: count }, (_, i) => visit(browser, i + 1)));
await browser.close();
console.log(`all done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log(`  plan shown (ms):       ${stats(results.map((r) => r.plan))}`);
console.log(`  map ready (ms):        ${stats(results.map((r) => r.map))}`);
console.log(`  live rain drawn (ms):  ${stats(results.map((r) => r.live))}`);
console.log(`  downloaded per visitor (MB): ${stats(results.map((r) => r.mb))}   total ${results.reduce((s, r) => s + r.mb, 0).toFixed(1)} MB`);
console.log(`  JS memory (MB):        ${stats(results.map((r) => r.heapMb))}`);
const bad = results.filter((r) => r.errors.length || r.state !== 'ready' || !r.live);
console.log(bad.length ? `PROBLEMS in ${bad.length} visitor(s): ${bad.slice(0, 3).map((r) => `#${r.number} state=${r.state} ${r.errors.slice(0, 2).join(' | ')}`).join(' ;; ')}` : 'every visitor got the plan, the map and the live rain picture, with no console error');
process.exit(bad.length ? 1 : 0);
