// Plan step 9.4 done-check (PLAN-007): browser scenarios for the map page, added to browser_checks.mjs: the globe at start, the fly-in (pictures mid-flight and flat),
// the model switch and a day-card click change what the map shows, Flat/Globe keeps the place and the block, a map click chooses a "Map point", the plain message
// without WebGL2, reduced motion (the view jumps), and the layout (a quarter plan + three quarters map on a wide window, stacked on a phone-sized one).
// The page tells the checks its state through data- attributes of #map (frame, effective, flying, zoom, center) and of body (map).
import assert from 'node:assert/strict';

/** `h` = { open, mapState, assertLanded, shot, base, frontend, ADDRESS, timeout }. */
export function mapScenarios(h) {
  const { open, mapState, assertLanded, shot, base, frontend, ADDRESS, timeout } = h;
  const data = (page, key) => page.evaluate((k) => document.getElementById('map').dataset[k], key);
  const frame = async (page) => { const [kind, step] = (await data(page, 'frame')).split('_'); return { kind, step: Number(step) }; };
  const title = (page) => page.locator('#title').first().innerText();
  const planShown = (page) => page.waitForSelector('#plan:not([hidden]) .day', { timeout });
  const stateReady = (page) => page.waitForFunction(() => document.getElementById('map').dataset.ready === 'true', null, { timeout });

  async function onMap(browser, options, address = ADDRESS) {
    const opened = await open(browser, options);
    await opened.page.goto(base + address);
    const ready = (await mapState(opened.page)) === 'ready';
    return { ...opened, ready };
  }

  return {
    async 'globe at start'(browser) {
      const { page, log, ready } = await onMap(browser, {}, '/');
      if (!ready) return log;
      await stateReady(page);
      assert.equal(await data(page, 'effective'), 'globe');
      assert.ok(Math.abs(Number(await data(page, 'zoom')) - frontend.map.start.zoom) < 0.01, 'the map opens at the configured start zoom');
      assert.equal(await data(page, 'live'), 'off', 'the live layer is off on the globe');
      await shot(page, 'globe-start');
      return log;
    },
    async 'fly-in ends flat on the place'(browser) {
      const { page, log, ready } = await onMap(browser);
      if (!ready) return log;
      await page.waitForFunction(() => document.getElementById('map').dataset.flying === 'true', null, { timeout }).catch(() => {}); // a fast engine may be done already
      await page.waitForTimeout(900);
      await shot(page, 'flight-mid');
      await assertLanded(page, 13.08, 80.27, frontend.map.fly.zoom_by_source.address);
      await shot(page, 'flight-flat');
      return log;
    },
    async 'model switch and a day card change the frame'(browser) {
      const { page, log, ready } = await onMap(browser);
      if (!ready) return log;
      await assertLanded(page, 13.08, 80.27, frontend.map.fly.zoom_by_source.address);
      const first = await frame(page);
      const kinds = new Set([first.kind]);
      for (const label of [/^AIFS$/, /Both models/]) {
        await page.locator('label', { hasText: label }).click();
        await page.waitForFunction((k) => !k.includes(document.getElementById('map').dataset.frame.split('_')[0]), [...kinds], { timeout });
        kinds.add((await frame(page)).kind);
      }
      assert.equal(kinds.size, 3, `IFS, AIFS and the agreement are three different frame kinds, got ${[...kinds]}`);
      const before = (await frame(page)).step;
      const blocks = page.locator('.day .block-hit');
      const pick = (await blocks.count()) - 3; // a block late in the list, so it differs from the one under way
      await blocks.nth(pick).click();
      await page.waitForFunction((s) => Number(document.getElementById('map').dataset.frame.split('_').pop()) !== s, before, { timeout });
      assert.equal(await blocks.nth(pick).getAttribute('aria-pressed'), 'true', 'the pressed block is marked');
      return log;
    },
    async 'flat and globe switch keep the place and the block'(browser) {
      const { page, log, ready } = await onMap(browser);
      if (!ready) return log;
      await assertLanded(page, 13.08, 80.27, frontend.map.fly.zoom_by_source.address);
      const before = await data(page, 'frame');
      await page.click('label[for="map-mode-globe"]');
      await page.waitForFunction(() => document.getElementById('map').dataset.effective === 'globe', null, { timeout });
      assert.equal(await data(page, 'frame'), before, 'the block and model stay on the globe');
      assert.equal(await page.locator('.place-marker').count(), 1, 'the place marker stays');
      await page.click('label[for="map-mode-flat"]');
      await page.waitForFunction(() => document.getElementById('map').dataset.effective === 'flat', null, { timeout });
      assert.equal(await data(page, 'frame'), before);
      assert.equal(await title(page), 'Chennai');
      return log;
    },
    async 'a map click chooses a map point'(browser) {
      const { page, log, ready } = await onMap(browser);
      if (!ready) return log;
      await assertLanded(page, 13.08, 80.27, frontend.map.fly.zoom_by_source.address);
      const box = await page.locator('#map').boundingBox();
      await page.mouse.click(box.x + box.width / 2 + 120, box.y + box.height / 2 + 70);
      await page.waitForFunction(() => /^Map point \(/.test(document.getElementById('title').textContent), null, { timeout });
      assert.match(await page.locator('#meta').innerText(), /this device's time zone/);
      const query = new URL(page.url()).searchParams; // a chosen map point is written into the address (a link to share), unlike the device position
      assert.ok(Math.abs(Number(query.get('lat')) - 13.08) > 0.001 && Math.abs(Number(query.get('lat')) - 13.08) < 3, `the address has the clicked latitude: ${query.get('lat')}`);
      assert.ok(Math.abs(Number(query.get('lon')) - 80.27) > 0.001 && Math.abs(Number(query.get('lon')) - 80.27) < 3, `the address has the clicked longitude: ${query.get('lon')}`);
      return log;
    },
    async 'no WebGL2 shows the plain message'(browser) {
      const { page, log } = await open(browser);
      await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
      await page.goto(base + ADDRESS);
      await planShown(page);
      assert.equal(await mapState(page), 'unavailable');
      assert.match(await page.locator('#map-message').innerText(), /needs WebGL2/);
      assert.equal(await page.locator('.maplibregl-canvas').count(), 0, 'no map canvas');
      return log;
    },
    async 'reduced motion jumps instead of flying'(browser) {
      const { page, log, ready } = await onMap(browser, { reducedMotion: 'reduce' });
      if (!ready) return log;
      const started = Date.now();
      await assertLanded(page, 13.08, 80.27, frontend.map.fly.zoom_by_source.address);
      assert.ok(Date.now() - started < frontend.map.fly.duration_ms * 0.6, `landed after ${Date.now() - started} ms: the view should jump, not fly (${frontend.map.fly.duration_ms} ms)`);
      return log;
    },
    async 'layout: a quarter plan and three quarters map, stacked on a phone'(browser) {
      const wide = await onMap(browser, { viewport: { width: 1280, height: 800 } });
      await planShown(wide.page);
      const side = await wide.page.locator('.side').boundingBox();
      const stage = await wide.page.locator('.stage').boundingBox();
      assert.ok(Math.abs(side.width / 1280 - 0.25) < 0.04, `the plan is ${Math.round((side.width / 1280) * 100)} % of the width`);
      assert.ok(Math.abs(side.width + stage.width - 1280) < 3 && Math.abs(side.y - stage.y) < 2, 'the map takes the rest, side by side');
      await shot(wide.page, 'layout-1280');
      const phone = await onMap(browser, { viewport: { width: 390, height: 800 } });
      await planShown(phone.page);
      const s = await phone.page.locator('.side').boundingBox();
      const m = await phone.page.locator('.stage').boundingBox();
      assert.ok(m.y < s.y, 'the map is above the plan on a phone');
      assert.ok(s.width > 340 && m.width > 340, 'both use the full width');
      assert.ok(await phone.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no sideways scrolling');
      await shot(phone.page, 'layout-390');
      wide.log.problems.push(...phone.log.problems);
      return wide.log;
    },
  };
}
