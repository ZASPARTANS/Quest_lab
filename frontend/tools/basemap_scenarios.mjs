// Plan step 9.3d-4 done-check: browser scenarios for the stored base map (PLAN-010, D38), added to the list in browser_checks.mjs.
// Kept in its own file (200-line rule); the helpers of browser_checks.mjs are handed in, so there is one copy of each.
// 1. the base map comes from our own site: the .pmtiles file by range requests (HTTP 206), the fonts and the sprite, nothing from outside.
// 2. the base-map file is missing (answered 404): the page and the plan still work, the rain is still on the map, and the failure is only a developer console note.
// What this does NOT prove in a browser: that place names sit above the rain (the layer order is unit-tested in tests/frontend/basemap.test.mjs).
import assert from 'node:assert/strict';

/** `h` = { open, mapState, assertLanded, checkPlanShown, shot, base, frontend, ADDRESS, siteHost, timeout }. */
export function basemapScenarios(h) {
  const { open, mapState, assertLanded, checkPlanShown, shot, base, frontend, ADDRESS, timeout } = h;
  const cfg = frontend.map.basemap;
  const root = `${h.sitePath}${frontend.data_url_path}${cfg.url_prefix}`; // the site may live in a sub-folder (the public host)

  return {
    async 'base map from our own site'(browser) {
      const { page, log } = await open(browser);
      const seen = { file: [], glyphs: 0, sprite: 0 };
      page.on('response', (r) => {
        const path = new URL(r.url()).pathname;
        if (path === root + cfg.file) seen.file.push(r.status());
        else if (path.startsWith(`${root}${cfg.assets_dir}/fonts/`) && r.status() === 200) seen.glyphs += 1;
        else if (path.startsWith(`${root}${cfg.assets_dir}/${cfg.sprite_set}/`) && r.status() === 200) seen.sprite += 1;
      });
      await page.goto(base + ADDRESS);
      if ((await mapState(page)) !== 'ready') return log; // no WebGL2 in this engine here: the plain message is checked by 'no webgl, no canvas'
      await assertLanded(page, 13.08, 80.27, frontend.map.fly.zoom_by_source.address);
      await page.waitForFunction(() => document.getElementById('map').dataset.ready === 'true', null, { timeout });
      assert.ok(seen.file.length >= 1, 'the base-map file was requested');
      assert.ok(seen.file.every((s) => s === 206), `the base-map file is read by range requests (206), got ${seen.file}`);
      assert.ok(seen.glyphs >= 1, 'a font file was loaded');
      assert.ok(seen.sprite >= 1, 'a sprite file was loaded');
      assert.match(await page.locator('.maplibregl-ctrl-attrib').innerText(), /OpenStreetMap/);
      await shot(page, 'basemap');
      return log;
    },
    async 'base map file missing'(browser) {
      const { context, page, log } = await open(browser);
      let blocked = 0;
      await context.route(`**${root}${cfg.file}`, (route) => { blocked += 1; return route.fulfill({ status: 404, body: 'not found' }); });
      await page.goto(base + ADDRESS);
      await checkPlanShown(page, 'Chennai');
      if ((await mapState(page)) !== 'ready') return log;
      await assertLanded(page, 13.08, 80.27, frontend.map.fly.zoom_by_source.address);
      assert.ok(blocked >= 1, 'the fault was applied: the base-map file was asked for and answered 404');
      assert.notEqual(await page.evaluate(() => document.getElementById('map').dataset.frame), 'none', 'the rain frame is still chosen');
      assert.equal(await page.locator('.maplibregl-canvas').count(), 1, 'the map canvas is still there');
      // the missing file is only a developer note in the console (the browser's own 404 line and the page's "map problem" line): nothing else may be reported
      log.problems = log.problems.filter((p) => !/Failed to load resource|map problem|404/i.test(p));
      await shot(page, 'basemap-missing');
      return log;
    },
  };
}
