// Browser scenarios for the guide "What this page does" (PLAN-017, decision D48), added to browser_checks.mjs. Every scenario here opens the page as a FIRST visit
// (open(..., { showGuide: true }): no "hide" mark is planted); all other scenarios open it as a returning visitor (guide_skip.mjs).
import assert from 'node:assert/strict';

const PARTS = ['What this page does', 'next 10 days', 'Where.', 'What.', 'Best times.', 'Which model?', 'IFS:', 'AIFS:', 'Both models (agreement):', 'Close', "Don't show again"];

/** The small tools the groups share. `h` = { open, mapState, shot, base, frontend, ADDRESS, timeout }. */
function guideTools(h) {
  const { base, frontend, ADDRESS, timeout } = h;
  return {
    ...h,
    KEY: frontend.guide.storage_key,
    isOpen: (page) => page.evaluate(() => document.getElementById('guide').open),
    waitOpen: (page, want) => page.waitForFunction((w) => document.getElementById('guide').open === w, want, { timeout }),
    visit: async (page) => { await page.goto(base + ADDRESS); await page.waitForSelector('#plan:not([hidden]) .day', { timeout }); }, // the plan loads behind the guide
    stored: (page) => page.evaluate((k) => localStorage.getItem(k), frontend.guide.storage_key),
    inView: (page, ids) => page.evaluate((list) => list.map((id) => { const b = document.getElementById(id).getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; }), ids),
  };
}

/** The first visit, "Close", "Don't show again", "How to use" and Escape. */
function choiceScenarios(t) {
  const { open, mapState, shot, isOpen, waitOpen, visit, stored } = t;
  return {
    async 'guide: a first visit says what the page does and how to use it; Close hides it for this visit only'(browser) {
      const { page, log } = await open(browser, { showGuide: true });
      await visit(page);
      assert.equal(await isOpen(page), true, 'the guide is open on a first visit');
      const words = await page.locator('#guide').innerText();
      for (const part of PARTS) assert.ok(words.includes(part), `the guide says "${part}"`);
      assert.equal(await page.evaluate(() => document.getElementById('guide').contains(document.activeElement)), true, 'focus is inside the guide');
      assert.equal(await page.evaluate(() => document.getElementById('guide').scrollTop), 0, 'it starts at the first line');
      assert.deepEqual(await t.inView(page, ['guide-close', 'guide-hide']), [true, true], 'both choices are in view without scrolling the guide');
      await shot(page, 'guide-first-visit');
      await page.click('#guide-close');
      await waitOpen(page, false);
      assert.equal(await stored(page), null, 'Close remembers nothing');
      await mapState(page);
      await visit(page); // a second visit
      assert.equal(await isOpen(page), true, 'Close was for one visit only: the guide is there again');
      return log;
    },
    async 'guide: "Don\'t show again" is remembered after a reload, and "How to use" opens the guide again'(browser) {
      const { page, log } = await open(browser, { showGuide: true });
      await visit(page);
      await page.click('#guide-hide');
      await waitOpen(page, false);
      assert.equal(await stored(page), '1');
      await mapState(page);
      await visit(page);
      assert.equal(await isOpen(page), false, 'it stays hidden');
      await page.click('#guide-open');
      await waitOpen(page, true);
      await page.keyboard.press('Escape');
      await waitOpen(page, false);
      assert.equal(await stored(page), '1', 'Escape and reopening do not undo the choice');
      return log;
    },
    async 'guide: Escape closes it for this visit only'(browser) {
      const { page, log } = await open(browser, { showGuide: true });
      await visit(page);
      await page.keyboard.press('Escape');
      await waitOpen(page, false);
      assert.equal(await stored(page), null);
      await mapState(page);
      await visit(page);
      assert.equal(await isOpen(page), true);
      return log;
    },
  };
}

/** The edges: blocked browser storage and a small phone screen. */
function edgeScenarios(t) {
  const { open, shot, isOpen, waitOpen, visit } = t;
  return {
    async 'guide: with the browser storage blocked it still opens and "Don\'t show again" still closes it, with no error'(browser) {
      const { context, page, log } = await open(browser, { showGuide: true });
      await context.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage blocked'); } }); });
      await visit(page);
      assert.equal(await isOpen(page), true);
      await page.click('#guide-hide');
      await waitOpen(page, false);
      return log;
    },
    async 'guide: on a 390 px phone it fits the screen, scrolls inside itself, and its buttons are at least 44 px high'(browser) {
      const { page, log } = await open(browser, { showGuide: true, viewport: { width: 390, height: 664 } });
      await visit(page);
      const fit = await page.evaluate(() => {
        const box = document.getElementById('guide').getBoundingClientRect();
        return { top: box.top, bottom: box.bottom, left: box.left, right: box.right, width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      assert.ok(fit.top >= 0 && fit.bottom <= fit.height && fit.left >= 0 && fit.right <= fit.width, `the guide is inside the screen: ${JSON.stringify(fit)}`);
      assert.equal(fit.overflow, 0, 'no sideways scrolling');
      assert.deepEqual(await t.inView(page, ['guide-close', 'guide-hide']), [true, true], 'both choices stay in view on a phone');
      await shot(page, 'guide-phone');
      for (const id of ['guide-close', 'guide-hide']) {
        const box = await page.locator(`#${id}`).boundingBox();
        assert.ok(box.height >= 44, `${id} is ${box.height} px high`);
      }
      return log;
    },
  };
}

/** What the visitor does right after the guide: pick a point on the map (reported by the user on 2026-11-09: "after I close the guide the map point does not work"). */
function afterGuideScenarios(t) {
  const { open, mapState, isOpen, waitOpen, visit } = t;
  async function pickAfter(browser, buttonId) {
    const { page, log } = await open(browser, { showGuide: true });
    await visit(page);
    if ((await mapState(page)) !== 'ready') return log; // no WebGL2 in this engine: the page shows its plain message (covered by another scenario)
    await page.click(buttonId);
    await waitOpen(page, false);
    assert.equal(await isOpen(page), false);
    const box = await page.locator('#map').boundingBox();
    await page.mouse.click(box.x + box.width * 0.62, box.y + box.height * 0.45);
    await page.waitForFunction(() => /^Map point/.test(document.getElementById('title').textContent), null, { timeout: t.timeout });
    assert.equal(await page.locator('.place-marker').count(), 1, 'one marker on the chosen point');
    assert.equal(await page.locator('.place-marker').first().isVisible(), true, 'the marker is visible');
    return log;
  }
  async function clickBehind(browser) {
    const { page, log } = await open(browser, { showGuide: true });
    await visit(page);
    if ((await mapState(page)) !== 'ready') return log;
    const box = await page.locator('#map').boundingBox();
    const [x, y] = [box.x + box.width * 0.92, box.y + box.height * 0.45]; // on the map, outside the guide window
    await page.mouse.click(x, y);
    await waitOpen(page, false);
    assert.equal(await page.evaluate((k) => localStorage.getItem(k), t.KEY), null, 'a click outside remembers nothing');
    await page.mouse.click(x, y);
    await page.waitForFunction(() => /^Map point/.test(document.getElementById('title').textContent), null, { timeout: t.timeout });
    return log;
  }
  return {
    'guide: after "Close" a click on the map chooses a map point and shows its marker': (browser) => pickAfter(browser, '#guide-close'),
    'guide: a click on the map behind the guide closes it, and the next click chooses a map point': clickBehind,
    [`guide: after "Don't show again" a click on the map chooses a map point and shows its marker`]: (browser) => pickAfter(browser, '#guide-hide'),
  };
}

export function guideScenarios(h) {
  const tools = guideTools(h);
  return { ...choiceScenarios(tools), ...edgeScenarios(tools), ...afterGuideScenarios(tools) };
}
