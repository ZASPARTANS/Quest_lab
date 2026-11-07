// Plan step 9.3c-4 done-check: browser scenarios for the live rain layer (PLAN-009, D35, D36) and the north-up map, added to browser_checks.mjs.
// The page tells the checks its state through data- attributes of #map: data-live = off | drawing | on, data-live-ms, data-live-size, data-bearing, data-pitch.
// 1. live layer on at a close zoom, for IFS, AIFS and the agreement; off on the globe and when zoomed out; on again when flat.
// 2. a tile that cannot be fetched: the live layer gives way to the pre-made picture and the page keeps working.
// 3. rotation and tilt are off (right-button drag, shift+arrow keys).
// Not proven here: that the live picture equals the exact tile values (tests/frontend/live.test.mjs against the Python reference); the look (screenshots).
import assert from 'node:assert/strict';

/** `h` = { open, mapState, assertLanded, checkPlanShown, shot, base, frontend, ADDRESS, timeout }. */
export function liveScenarios(h) {
  const { open, mapState, assertLanded, checkPlanShown, shot, base, frontend, ADDRESS, timeout } = h;
  const minZoom = frontend.map.live.min_zoom;
  const live = (page, want) => page.waitForFunction((w) => document.getElementById('map').dataset.live === w, want, { timeout });
  const zoomNow = (page) => page.evaluate(() => Number(document.getElementById('map').dataset.zoom));
  const centreOfMap = async (page) => { const b = await page.locator('#map').boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };

  /** Open the page on Chennai; returns null when this engine has no WebGL2 (the plain message path is tested by 'no webgl, no canvas'). */
  async function openOnMap(browser, options) {
    const opened = await open(browser, options);
    await opened.page.goto(base + ADDRESS);
    if ((await mapState(opened.page)) !== 'ready') return { ...opened, ready: false };
    await assertLanded(opened.page, 13.08, 80.27, frontend.map.fly.zoom_by_source.address);
    return { ...opened, ready: true };
  }

  return {
    async 'live layer follows zoom, mode and model'(browser) {
      const { page, log, ready } = await openOnMap(browser);
      if (!ready) return log;
      await live(page, 'on');
      const ms = Number(await page.evaluate(() => document.getElementById('map').dataset.liveMs));
      assert.ok(ms >= 0 && ms < 2000, `drawing took ${ms} ms`);
      assert.match(await page.evaluate(() => document.getElementById('map').dataset.liveSize), /^\d+x\d+$/);
      await shot(page, 'live-ifs');
      await page.locator('label', { hasText: /^AIFS$/ }).click();
      await live(page, 'on');
      await page.locator('label', { hasText: 'Both models' }).click();
      await live(page, 'on');
      await shot(page, 'live-agreement');
      await page.click('label[for="map-mode-globe"]');
      await live(page, 'off');
      await page.click('label[for="map-mode-flat"]');
      await live(page, 'on');
      const at = await centreOfMap(page);
      await page.mouse.move(at.x, at.y);
      for (let i = 0; i < 12 && (await zoomNow(page)) >= minZoom; i += 1) { await page.mouse.wheel(0, 400); await page.waitForTimeout(250); }
      assert.ok((await zoomNow(page)) < minZoom, 'zoomed out below the live layer limit');
      await live(page, 'off');
      return log;
    },
    async 'live layer gives way when a tile fails'(browser) {
      const { context, page, log, ready } = await openOnMap(browser);
      if (!ready) return log;
      await live(page, 'on');
      let refused = 0;
      await context.route('**/tiles/**', (route) => { refused += 1; return route.fulfill({ status: 404, body: 'not found' }); }); // tiles not in the browser's memory yet fail from now on
      const at = await centreOfMap(page);
      for (let i = 0; i < 6; i += 1) { // six drags of 300 px = about 10 degrees west at this zoom: tiles that were never loaded are needed
        await page.mouse.move(at.x - 150, at.y);
        await page.mouse.down();
        await page.mouse.move(at.x + 150, at.y, { steps: 6 });
        await page.mouse.up();
      }
      await live(page, 'off');
      assert.ok(refused >= 1, 'the fault was applied: a tile was asked for and answered 404');
      assert.equal(await page.locator('.maplibregl-canvas').count(), 1, 'the map is still there');
      await page.click('.my-place'); // the place was loaded before the fault, so the live picture comes back there
      await live(page, 'on');
      await checkPlanShown(page, 'Chennai');
      log.problems = log.problems.filter((p) => !/Failed to load resource|map problem|404/i.test(p)); // the browser's own 404 line and the page's developer line
      await shot(page, 'live-tile-fault');
      return log;
    },
    async 'map stays north-up and flat'(browser) {
      const { page, log, ready } = await openOnMap(browser);
      if (!ready) return log;
      const at = await centreOfMap(page);
      await page.mouse.move(at.x, at.y);
      await page.mouse.down({ button: 'right' });
      await page.mouse.move(at.x + 200, at.y - 120, { steps: 8 });
      await page.mouse.up({ button: 'right' });
      await page.locator('.maplibregl-canvas').focus();
      await page.keyboard.down('Shift');
      for (const key of ['ArrowLeft', 'ArrowUp']) await page.keyboard.press(key);
      await page.keyboard.up('Shift');
      await page.waitForTimeout(500);
      const [bearing, pitch] = await page.evaluate(() => [document.getElementById('map').dataset.bearing, document.getElementById('map').dataset.pitch]);
      assert.equal(Number(bearing), 0, `the map was turned: bearing ${bearing}`);
      assert.equal(Number(pitch), 0, `the map was tilted: pitch ${pitch}`);
      return log;
    },
  };
}
