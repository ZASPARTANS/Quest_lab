// Browser scenarios for "Use my location" when the device is slow (error E038), added to browser_checks.mjs. The browser's position call is replaced by a fake
// that times out the first time(s) and answers later, and the permission is "already allowed", so the page starts a search by itself at load; the scenarios then
// press the button while that search is still running. What the visitor must never see: "Search for a place instead" and then, a moment later, the position.
import assert from 'node:assert/strict';

/** `h` = { open, base, timeout, siteHost, reverseHost }. */
export function locationScenarios(h) {
  const { open, base, timeout, siteHost, reverseHost } = h;
  const MOCK_NAME = { locality: 'Rasipuram', city: 'Rasipuram', principalSubdivision: 'Tamil Nadu', countryName: 'India' };

  /** `answers` = what the fake position call does on its 1st, 2nd, ... call: 'timeout' (code 3 after 1 s) or 'fix' (a position after 1 s). */
  async function openSlow(browser, answers) {
    const opened = await open(browser, { timezoneId: 'Asia/Kolkata' }, [siteHost, reverseHost]);
    await opened.context.route(`https://${reverseHost}/**`, (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(MOCK_NAME) }));
    await opened.page.addInitScript((list) => {
      window.__calls = 0;
      window.__statuses = [];
      navigator.permissions.query = async () => ({ state: 'granted' }); // allowed earlier: the page starts the search by itself
      navigator.geolocation.getCurrentPosition = (ok, fail) => {
        const answer = list[window.__calls] ?? list[list.length - 1];
        window.__calls += 1;
        setTimeout(() => (answer === 'fix' ? ok({ coords: { latitude: 11.46, longitude: 78.19 } }) : fail({ code: 3, message: 'timeout' })), 1000);
      };
      new MutationObserver(() => { const t = document.getElementById('status')?.textContent; if (t) window.__statuses.push(t); }).observe(document, { subtree: true, childList: true, characterData: true });
    }, answers);
    await opened.page.goto(base + '/');
    return opened;
  }

  return {
    async 'location: a slow first search and a press of the button never show a failure, and the position arrives'(browser) {
      const { page, log } = await openSlow(browser, ['timeout', 'fix']);
      await page.waitForFunction(() => document.getElementById('status')?.textContent.startsWith('Looking') || window.__calls > 0, null, { timeout });
      await page.click('#use-location'); // while the search that the page started by itself is still running
      await page.waitForSelector('#plan:not([hidden]) .day', { timeout });
      const seen = await page.evaluate(() => ({ statuses: window.__statuses, calls: window.__calls }));
      assert.ok(!seen.statuses.some((t) => /could not be found|taking too long|search for a place instead/i.test(t)), `a failure was shown: ${seen.statuses.join(' | ')}`);
      assert.equal(seen.calls, 2, 'one search, and one more try after the timeout, not three');
      assert.match(await page.locator('#meta').innerText(), /this device's time zone/);
      return log;
    },
    async 'location: two timeouts end with a plain "taking too long" message, and the button works again'(browser) {
      const { page, log } = await openSlow(browser, ['timeout', 'timeout', 'fix']);
      await page.waitForFunction(() => /taking too long/.test(document.getElementById('status')?.textContent ?? ''), null, { timeout });
      assert.equal(await page.locator('#plan').isHidden(), true);
      assert.doesNotMatch(await page.locator('#status').innerText(), /error|exception|undefined/i);
      await page.click('#use-location');
      await page.waitForSelector('#plan:not([hidden]) .day', { timeout });
      assert.equal(await page.locator('#status').innerText(), '');
      return log;
    },
  };
}
