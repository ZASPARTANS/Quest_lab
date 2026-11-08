// Plan step 8 done-check in a real browser engine (Playwright): the plan page with a place from the address, from the device position
// (allowed and refused), from a place search, saved places, hostile input and no WebGL. The site is reached as http://localhost:8080
// (the browser container shares the preview's network), so the browser treats it as a secure context like the HTTPS public site.
// The place search is answered by a MOCK geocoder unless the real-search switch is set (then one real request goes to Open-Meteo).
// Base-map scenarios are in basemap_scenarios.mjs, live-layer scenarios in live_scenarios.mjs, map-page scenarios in map_scenarios.mjs. Exit code 1 if any scenario fails. Engines: chromium | firefox | webkit (BROWSER_NAME). WebKit is the engine of Safari, not Safari itself.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { basemapScenarios } from './basemap_scenarios.mjs';
import { liveScenarios } from './live_scenarios.mjs';
import { mapScenarios } from './map_scenarios.mjs';
import { provenanceScenarios } from './provenance_scenarios.mjs';
import { locationScenarios } from './location_scenarios.mjs';

const frontend = JSON.parse(readFileSync(new URL('../../config/frontend.json', import.meta.url), 'utf8'));
const cfg = frontend.browser_checks;
const base = process.env[cfg.base_url_env];
const outDir = process.env[cfg.out_dir_env];
const engineName = process.env[cfg.browser_env] ?? 'chromium';
const channel = process.env[cfg.channel_env];
const realSearch = Boolean(process.env[cfg.real_search_env]);
if (!base || !outDir) throw new Error(`set ${cfg.base_url_env} and ${cfg.out_dir_env}`);
mkdirSync(outDir, { recursive: true });
const siteHost = new URL(base).host;
const sitePath = new URL(base).pathname.replace(/\/$/, ''); // '' at the root of a host, '/Quest_lab' on the public site
const geocoderHost = new URL(frontend.geocoder.url).host;
const reverseHost = new URL(frontend.reverse_geocoder.url).host;
const timeout = cfg.timeout_seconds * 1000;
const ADDRESS = '/?lat=13.08&lon=80.27&name=Chennai&tz=Asia/Kolkata&activity=outdoor';
const MOCK = { results: [
  { name: 'Chennai', latitude: 13.08784, longitude: 80.27847, timezone: 'Asia/Kolkata', country: 'India', admin1: 'Tamil Nadu' },
  { name: 'Chennai International Airport', latitude: 12.98833, longitude: 80.16578, timezone: 'Asia/Kolkata', country: 'India', admin1: 'Tamil Nadu' }] };

async function open(browser, options = {}, allowedHosts = [siteHost]) {
  const context = await browser.newContext({ viewport: cfg.viewport, ...options });
  const page = await context.newPage();
  const log = { problems: [], tiles: 0, geocoder: [], dialogs: 0 };
  page.on('request', (r) => {
    const url = new URL(r.url());
    const host = url.host;
    if (url.protocol !== 'blob:' && url.protocol !== 'data:' && !allowedHosts.includes(host)) log.problems.push(`request to ${host || url.protocol}`); // a blob: or data: address is the page's own memory, not a network request
    if (r.url().includes('/tiles/')) log.tiles += 1;
    if (host === geocoderHost) log.geocoder.push(r);
  });
  // LIMIT: WebKit reports the requests that a SECOND navigation cancels (the first page's map still loading) as errors ("access control checks", "map problem").
  // Those two messages are not counted in WebKit after the page was navigated a second time; a page that stays put (address, base map, live layer scenarios) is checked strictly.
  let navigations = 0;
  page.on('request', (r) => { if (r.isNavigationRequest() && r.frame() === page.mainFrame()) navigations += 1; }); // counted when the navigation starts: the cancellations are reported just before it commits
  const cancelled = (text) => engineName === 'webkit' && navigations > 1 && /access control checks|map problem|Worker failed to load/.test(text);
  page.on('console', (m) => { if (m.type() === 'error' && !cancelled(m.text())) log.problems.push(`console error: ${m.text().slice(0, 200)} [${m.location().url.slice(0, 160)}]`); });
  page.on('pageerror', (e) => { if (!cancelled(e.message)) log.problems.push(`page error: ${e.message.slice(0, 200)}`); });
  page.on('dialog', (d) => { log.dialogs += 1; d.dismiss(); });
  return { context, page, log };
}

const shot = (page, name) => page.screenshot({ path: join(outDir, `${cfg.file_prefix}${engineName}-${name}.png`), fullPage: true });
const waitPlan = (page) => page.waitForSelector('#plan:not([hidden]) .day', { timeout });
const text = (page, selector) => page.locator(selector).first().innerText();

/** 'ready' (the map is drawn), 'unavailable' (no WebGL2: a plain message) or 'failed'; waits until the page has decided. */
async function mapState(page) {
  await page.waitForFunction(() => ['ready', 'unavailable', 'failed'].includes(document.body.dataset.map), null, { timeout });
  return page.evaluate(() => document.body.dataset.map);
}

/** The map has flown to the place: flight over, the expected zoom, centred on the place within 0.01 degrees, and the flat view. */
async function assertLanded(page, lat, lon, zoom) {
  await page.waitForFunction((z) => { const m = document.getElementById('map'); return m.dataset.flying === 'false' && Math.abs(Number(m.dataset.zoom) - z) < 0.01; }, zoom, { timeout });
  const [clon, clat] = (await page.evaluate(() => document.getElementById('map').dataset.center)).split(',').map(Number);
  assert.ok(Math.abs(clon - lon) < 0.01 && Math.abs(clat - lat) < 0.01, `the map centre is ${clon},${clat}, not ${lon},${lat}`);
  assert.equal(await page.evaluate(() => document.getElementById('map').dataset.effective), 'flat');
}

async function checkPlanShown(page, title) {
  await waitPlan(page);
  assert.equal(await text(page, '#title'), title);
  assert.ok((await page.locator('.day').count()) >= 8, 'at least 8 day cards');
  assert.equal(await page.locator('.total .big').count(), 3, 'three rain totals');
  assert.ok((await page.locator('.window, #windows .empty').count()) >= 1, 'windows or the "no dry stretch" line');
}

const scenarios = {
  async address(browser) {
    const { page, log } = await open(browser);
    await page.goto(base + ADDRESS);
    await checkPlanShown(page, 'Chennai');
    assert.ok(log.tiles >= 1, 'a tile was fetched and decoded');
    assert.match(await text(page, '#meta'), /UTC\+05:30/);
    if ((await mapState(page)) === 'ready') {
      await assertLanded(page, 13.08, 80.27, frontend.map.fly.zoom_by_source.address);
      // the block the map shows first is the one under way: it ends after now and not more than one block (6 h) after now
      const shown = await page.evaluate(async (manifestPath) => {
        const run = Date.parse((await (await fetch(manifestPath)).json()).run);
        const step = Number(document.getElementById('map').dataset.frame.split('_').pop());
        return { endMs: run + step * 3600e3, nowMs: Date.now(), label: document.querySelector('.when-label').textContent };
      }, `${sitePath}${frontend.data_url_path}manifest.json`);
      assert.ok(shown.endMs > shown.nowMs && shown.endMs <= shown.nowMs + 6 * 3600e3, `the map starts on a block that is not the one under way: ${shown.label}`);
      assert.doesNotMatch(shown.label, /already over/);
      await page.click('.timebar input[type="range"]', { position: { x: 2, y: 5 } }); // drag to the first block (over)
      await page.waitForFunction(() => /already over/.test(document.querySelector('.when-label').textContent), null, { timeout });
      await page.click('.now-button');
      await page.waitForFunction(() => !/already over/.test(document.querySelector('.when-label').textContent), null, { timeout });
    }
    await shot(page, 'address');
    return log;
  },
  async 'no webgl, no canvas'(browser) {
    const { page, log } = await open(browser);
    await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
    await page.goto(base + ADDRESS);
    await checkPlanShown(page, 'Chennai');
    return log;
  },
  async 'location allowed'(browser) {
    const { context, page, log } = await open(browser, { permissions: ['geolocation'], geolocation: { latitude: 11.46, longitude: 78.19 }, timezoneId: 'Asia/Kolkata' }, [siteHost, reverseHost]);
    const asked = [];
    if (!realSearch) {
      await context.route(`https://${reverseHost}/**`, (route) => { asked.push(route.request().url()); return route.fulfill({ status: 200, contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ locality: 'Rasipuram', city: 'Rasipuram', principalSubdivision: 'Tamil Nadu', countryName: 'India' }) }); });
    }
    await page.goto(base + '/');
    await waitPlan(page);
    // the position is named by the reverse geocoder: a MOCK by default, the REAL service when the real-search switch is set
    await page.waitForFunction((real) => { const name = document.getElementById('title').textContent; return real ? /Rasipuram/.test(name) : name === 'Rasipuram, Tamil Nadu, India'; }, realSearch, { timeout });
    const named = await text(page, '#title');
    assert.match(await text(page, '#meta'), /UTC\+05:30, this device's time zone/);
    assert.equal(await page.inputValue('#search-input'), named, 'the search box shows the place that is chosen now');
    if ((await mapState(page)) === 'ready') await assertLanded(page, 11.46, 78.19, frontend.map.fly.zoom_by_source.location);
    assert.equal(new URL(page.url()).search, '', 'the position is not written into the address');
    if (!realSearch) {
      const sent = new URL(asked[0]);
      assert.deepEqual([...sent.searchParams.keys()].sort(), ['latitude', 'localityLanguage', 'longitude']);
    }
    await page.fill('#search-input', 'rasipuram'); // an earlier search is still typed in the box: using the location must replace it
    await page.fill('#search-input', 'some earlier search');
    await page.click('#use-location');
    await page.waitForFunction((name) => document.getElementById('search-input').value === name, named, { timeout });
    await shot(page, 'location-allowed');
    return log;
  },
  async 'my place button'(browser) {
    const { page, log } = await open(browser);
    await page.goto(base + ADDRESS);
    if ((await mapState(page)) !== 'ready') return log; // no WebGL here (Firefox and WebKit in Docker): the message path is tested elsewhere
    await assertLanded(page, 13.08, 80.27, frontend.map.fly.zoom_by_source.address);
    const box = await page.locator('#map').boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 300, cy - 150, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(600);
    const moved = (await page.evaluate(() => document.getElementById('map').dataset.center)).split(',').map(Number);
    assert.ok(Math.abs(moved[0] - 80.27) > 0.05, 'dragging moved the map away from the place');
    await page.click('.my-place');
    await assertLanded(page, 13.08, 80.27, frontend.map.fly.zoom_by_source.address);
    await shot(page, 'my-place');
    return log;
  },
  async 'location refused'(browser) {
    const { page, log } = await open(browser);
    await page.goto(base + '/');
    await page.click('#use-location');
    // Firefox (headless) leaves the permission prompt unanswered, and the location timeout only starts after an answer, so the page keeps waiting.
    // LIMIT of this check: in Firefox the refusal path is therefore NOT exercised, only "still waiting for the visitor's answer" (chromium and webkit do exercise it).
    const final = /switched off|could not be found|cannot share/;
    await page.waitForFunction((source) => new RegExp(source).test(document.getElementById('status').textContent), final.source, { timeout: 12000 }).catch(() => {});
    const status = await text(page, '#status');
    assert.ok(final.test(status) || (engineName === 'firefox' && /^Looking for your location/.test(status)), `status was: ${status}`);
    assert.equal(await page.locator('#plan').isHidden(), true);
    assert.equal(await page.locator('#welcome').isVisible(), true);
    log.problems = log.problems.filter((p) => !/geolocation|location/i.test(p)); // the browser itself may log the refusal
    await shot(page, 'location-refused');
    return log;
  },
  async search(browser) {
    const { context, page, log } = await open(browser, { timezoneId: 'Europe/London' }, [siteHost, geocoderHost]);
    if (!realSearch) {
      await context.route(`https://${geocoderHost}/**`, (route) => route.fulfill({ status: 200, contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(route.request().url().includes('Zzzz') ? { generationtime_ms: 0.1 } : MOCK) }));
    }
    await page.goto(base + '/');
    await page.fill('#search-input', 'Chennai');
    await page.press('#search-input', 'Enter');
    await page.waitForSelector('.result', { timeout });
    await page.locator('.result').first().click();
    await waitPlan(page);
    assert.match(await text(page, '#title'), /^Chennai/);
    assert.match(await page.inputValue('#search-input'), /^Chennai/);
    assert.match(await text(page, '#meta'), /UTC\+05:30\)$/, 'time zone comes from the geocoder, not from the device (London)');
    const request = log.geocoder[0];
    const sent = new URL(request.url());
    assert.deepEqual([...sent.searchParams.keys()].sort(), ['count', 'format', 'language', 'name']);
    assert.ok(!request.headers().referer, 'no referrer is sent (an empty header counts as none)');
    assert.ok(!request.headers().cookie, 'no cookie is sent');
    await shot(page, realSearch ? 'search-real' : 'search-mock');
    if (!realSearch) {
      await page.fill('#search-input', 'Zzzz');
      await page.press('#search-input', 'Enter');
      await page.waitForFunction(() => /No place found/.test(document.getElementById('status').textContent), null, { timeout });
    }
    return log;
  },
  async 'place chosen before the forecast list has loaded'(browser) { // E033: a slow connection; the choice must be kept and drawn once the list arrives
    const { context, page, log } = await open(browser, { timezoneId: 'Europe/London' }, [siteHost, geocoderHost]);
    await context.route(`https://${geocoderHost}/**`, (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(MOCK) }));
    await context.route('**/data/manifest.json', async (route) => { await new Promise((resolve) => setTimeout(resolve, 1500)); await route.continue(); });
    await page.goto(base + '/');
    await page.fill('#search-input', 'Chennai');
    await page.press('#search-input', 'Enter');
    await page.waitForSelector('.result', { timeout });
    await page.locator('.result').first().click(); // the manifest is still being held back here
    await waitPlan(page); // once the list is there the chosen place is drawn (not the start place), and no console error was raised meanwhile
    assert.match(await text(page, '#title'), /^Chennai/);
    assert.equal(await page.locator('.total .big').count(), 3, 'three rain totals');
    return log;
  },
  async saved(browser) {
    const { page, log } = await open(browser);
    await page.goto(base + ADDRESS);
    await waitPlan(page);
    await page.click('#save');
    await page.waitForSelector('.saved', { timeout });
    assert.match(await text(page, '#save'), /Saved/);
    assert.equal(await page.getAttribute('#save', 'aria-pressed'), 'true');
    assert.equal(await page.locator('#saved-box').isVisible(), true, 'the saved places show above the search once one is saved');
    const stored = JSON.parse(await page.evaluate((k) => localStorage.getItem(k), frontend.saved_places.storage_key));
    assert.equal(stored.length, 1);
    assert.equal(stored[0].name, 'Chennai');
    await page.goto(base + '/');
    await checkPlanShown(page, 'Chennai');
    await page.waitForFunction(() => /^(No rain|Light|Moderate|Heavy)/.test(document.querySelector('.saved .open span')?.textContent ?? ''), null, { timeout });
    await shot(page, 'saved');
    await page.click('.saved .remove');
    await page.waitForSelector('#saved .empty', { state: 'attached', timeout });
    assert.equal(await page.locator('#saved-box').isHidden(), true, 'no empty saved-places box');
    assert.match(await text(page, '#save'), /Save this place/);
    assert.equal(await page.evaluate((k) => localStorage.getItem(k), frontend.saved_places.storage_key), '[]');
    return log;
  },
  async 'activity change'(browser) {
    const { page, log } = await open(browser);
    await page.goto(base + ADDRESS);
    await waitPlan(page);
    await page.click('label[for="activity-laundry"]');
    await page.waitForFunction(() => /Shortest window shown: 12 hours/.test(document.getElementById('note').textContent), null, { timeout });
    assert.match(new URL(page.url()).search, /activity=laundry/);
    return log;
  },
  async 'hostile storage and address'(browser) {
    const { page, log } = await open(browser);
    await page.addInitScript(([a, b]) => { localStorage.setItem(a, '{"evil":true'); localStorage.setItem(b, '<script>alert(1)</script>'); },
      [frontend.saved_places.storage_key, frontend.saved_places.settings_key]);
    await page.goto(base + '/?lat=999&lon=abc&activity=%3Cscript%3E&wet=77');
    await page.waitForSelector('#welcome:not([hidden])', { timeout }); // the welcome text is there from the start, before the forecast list has loaded
    await mapState(page); // so wait until the page has finished starting; leaving at once cancels its requests and WebKit reports that as errors (E034)
    const hostile = '<img src=x onerror=window.__pwned=1>';
    await page.goto(`${base}/?lat=10&lon=20&name=${encodeURIComponent(hostile)}`);
    await waitPlan(page);
    assert.equal(await text(page, '#title'), hostile, 'a place name is shown as text, never as markup');
    assert.equal(await page.evaluate(() => window.__pwned), undefined);
    assert.equal(log.dialogs, 0);
    return log;
  },
};

const helpers = { open, mapState, assertLanded, checkPlanShown, shot, base, frontend, ADDRESS, siteHost, reverseHost, timeout, sitePath };
Object.assign(scenarios, basemapScenarios(helpers), liveScenarios(helpers), mapScenarios(helpers), provenanceScenarios(helpers), locationScenarios(helpers));

const engines = { chromium, firefox, webkit };
const launchOptions = engineName === 'chromium' ? (channel ? { channel } : { args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }) : {};
const browser = await engines[engineName].launch(launchOptions);
console.log(`engine ${engineName} ${browser.version()}${channel ? ` (${channel})` : ''}; site ${base}; place search: ${realSearch ? 'REAL Open-Meteo' : 'MOCK geocoder'}`);
let failed = 0;
for (const [name, run] of Object.entries(scenarios)) {
  if (name === 'search' && realSearch && !process.env[cfg.real_search_env]) continue;
  try {
    const log = await run(browser);
    const bad = log.problems.length > 0;
    failed += bad ? 1 : 0;
    console.log(`${bad ? 'FAIL' : 'ok  '} ${name}${bad ? `: ${log.problems.slice(0, 4).join(' | ')}` : ''}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name}: ${String(error.message).split('\n')[0].slice(0, 300)}`);
  }
}
await browser.close();
console.log(failed ? `${failed} scenario(s) failed` : 'all scenarios passed');
process.exit(failed ? 1 : 0);
