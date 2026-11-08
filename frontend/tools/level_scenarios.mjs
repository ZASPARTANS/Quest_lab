// Browser scenarios for the rain levels of the plan (PLAN-011 step 11.4, decision D41), added to browser_checks.mjs. The checks do not depend on what the forecast
// says today: they look at the words that are on the page, at what "fits" means for each activity, and at the Custom choice and the address that must not be trusted.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const activities = JSON.parse(readFileSync(new URL('../../config/activities.json', import.meta.url), 'utf8'));
const WORDS = activities.levels.map((level) => level.short); // the word of a tile: No rain, Light, Moderate, Heavy
const OLD_WORDS = /\b(wet|dry|heat|hot)\b/i; // the vocabulary the levels replaced (D41); "wetter" in the explanation is a different word

/** The tools both groups use. `h` = { open, base, timeout, ADDRESS }. */
function tools(h) {
  const { open, base, timeout, ADDRESS } = h;
  return {
    open,
    base,
    timeout,
    ADDRESS,
    waitPlan: (page) => page.waitForSelector('#plan:not([hidden]) .day', { timeout }),
    words: (page, selector) => page.locator(selector).evaluateAll((nodes) => nodes.map((n) => n.querySelector('.word').textContent.trim())),
    // the tiles that fit AND where both models agree: a tile where the models differ also fits when one of them is within the limit (D28), so its word may be higher
    settled: (page) => page.locator('.block.fits').evaluateAll((nodes) => nodes.filter((n) => !n.querySelector('.flag')).map((n) => n.querySelector('.word').textContent.trim())),
    fitCount: (page) => page.locator('.block.fits').count(),
    choose: async (page, id) => { await page.click(`label[for="activity-${id}"]`); await page.waitForFunction((i) => document.getElementById(`activity-${i}`).checked, id, { timeout }); },
    custom: (address) => address.replace('activity=outdoor', 'activity=custom'),
  };
}

/** The words on the page and what fits for each activity. */
export function levelWordScenarios(h) {
  const { open, base, ADDRESS, waitPlan, words, settled, fitCount, choose, timeout } = tools(h);
  return {
    async 'levels: the four level words, the cut-offs and none of the old words are on the page'(browser) {
      const { page, log } = await open(browser);
      await page.goto(base + ADDRESS);
      await waitPlan(page);
      const legend = await page.locator('#level-legend').innerText();
      const [none, light, moderate, heavy] = activities.levels;
      for (const part of [`${none.label}: under ${light.from_mm} mm`, `${light.label}: ${light.from_mm}–${moderate.from_mm} mm`, `${moderate.label}: ${moderate.from_mm}–${heavy.from_mm} mm`,
        `${heavy.label}: ${heavy.from_mm} mm or more`, 'our own; there is no official standard']) assert.ok(legend.includes(part), `the legend lacks "${part}": ${legend}`);
      const shown = await words(page, '.day .block');
      assert.ok(shown.length >= 8 * 4, `${shown.length} tiles`);
      for (const word of shown) assert.ok(WORDS.includes(word), `a tile says "${word}"`);
      for (const part of ['#plan', '#welcome', '.top']) assert.doesNotMatch(await page.locator(part).first().innerText(), OLD_WORDS, `${part} still uses an old word`);
      return log;
    },
    async 'levels: what fits follows the activity (Outdoor accepts no rain, Commute up to light, Custom what the visitor chooses)'(browser) {
      const { page, log } = await open(browser);
      await page.goto(base + ADDRESS);
      await waitPlan(page);
      await choose(page, 'outdoor');
      const outdoor = { words: await settled(page), count: await fitCount(page) };
      assert.ok(outdoor.words.every((w) => w === WORDS[0]), `Outdoor accepted: ${[...new Set(outdoor.words)]}`);
      await choose(page, 'commute');
      const commute = { words: await settled(page), count: await fitCount(page) };
      assert.ok(commute.words.every((w) => w === WORDS[0] || w === WORDS[1]), `Commute accepted: ${[...new Set(commute.words)]}`);
      assert.ok(commute.count >= outdoor.count, `Commute (${commute.count}) fits at least as many blocks as Outdoor (${outdoor.count}): more hours and more tolerance`);
      await choose(page, 'custom');
      await page.selectOption('#custom-accept', 'moderate');
      await page.waitForFunction(() => /moderate rain at most/.test(document.getElementById('note').textContent), null, { timeout });
      const custom = { words: await settled(page), count: await fitCount(page) };
      assert.ok(custom.words.every((w) => w !== WORDS[3]), 'Custom "up to moderate" never settles on heavy rain');
      assert.ok(custom.count >= commute.count, 'up to moderate fits at least as much as up to light');
      return log;
    },
  };
}

/** The Custom choice and the address that must not be trusted. */
export function levelCustomScenarios(h) {
  const { open, base, ADDRESS, waitPlan, custom, timeout } = tools(h);
  return {
    async 'levels: Custom offers three choices and remembers the one chosen after a reload'(browser) {
      const { page, log } = await open(browser);
      await page.goto(base + custom(ADDRESS));
      await waitPlan(page);
      const choices = await page.locator('#custom-accept option').evaluateAll((nodes) => nodes.map((n) => n.value));
      assert.deepEqual(choices, activities.custom.level_choices);
      assert.equal(choices.length, 3);
      await page.selectOption('#custom-accept', 'light');
      await page.waitForFunction(() => document.getElementById('custom-accept').value === 'light' && /accept=light/.test(location.search), null, { timeout });
      await page.goto(base + custom(ADDRESS)); // no accept in the address: the choice comes from this browser's own storage
      await waitPlan(page);
      assert.equal(await page.inputValue('#custom-accept'), 'light', 'the choice survived a reload');
      return log;
    },
    async 'levels: a hostile or unknown accept value in the address is ignored'(browser) {
      const { page, log } = await open(browser);
      for (const bad of ['%3Cscript%3Ealert(1)%3C%2Fscript%3E', 'heavy', 'evil', '', '0.5']) { // "heavy" is a real level but not one of Custom's choices
        await page.goto(base + ADDRESS.replace('activity=outdoor', `activity=custom&accept=${bad}`));
        await waitPlan(page);
        assert.equal(await page.inputValue('#custom-accept'), activities.custom.default_level, `accept=${bad} was taken`);
      }
      assert.equal(log.dialogs, 0);
      return log;
    },
  };
}
