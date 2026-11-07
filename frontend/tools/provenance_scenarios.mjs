// Plan step 13.1 done-check: browser scenarios for the honesty strip and the credits (PLAN-013, decisions D9 and D26), added to browser_checks.mjs.
// The device time is fixed by the test (page.clock), because the exported forecast gets older every hour: "fresh" means 9 hours after the run, "old" 40 hours.
import assert from 'node:assert/strict';

const ECMWF_SENTENCE = 'This service is based on data and products of the European Centre for Medium-Range Weather Forecasts (ECMWF).';

/** `h` = { open, base, frontend, ADDRESS, timeout, siteHost }. */
export function provenanceScenarios(h) {
  const { open, base, frontend, ADDRESS, timeout } = h;

  async function openAt(browser, hoursAfterRun) {
    const opened = await open(browser);
    const manifestUrl = `${base}${frontend.data_url_path}manifest.json`;
    const manifest = await (await opened.context.request.get(manifestUrl)).json();
    await opened.page.clock.setFixedTime(new Date(Date.parse(manifest.run) + hoursAfterRun * 3600e3));
    await opened.page.goto(base + ADDRESS);
    await opened.page.waitForSelector('#plan:not([hidden]) .day', { timeout });
    return { ...opened, manifest };
  }

  return {
    async 'honesty strip: a fresh run shows its time and age and no warning'(browser) {
      const { page, log } = await openAt(browser, 9);
      const line = await page.locator('#freshness').innerText();
      assert.match(line, /^Forecast: ECMWF run \w{3} \d{1,2} \w{3} \d{2}:\d{2} UTC \(IFS and AIFS\), 9 hours old\.$/);
      assert.equal(await page.locator('#attribution').innerText(), ECMWF_SENTENCE);
      assert.equal(await page.locator('#freshness-warning').isHidden(), true, 'no warning for a run that is 9 hours old');
      return log;
    },
    async 'honesty strip: an old run shows a plain warning'(browser) {
      const { page, log } = await openAt(browser, 40);
      const warning = page.locator('#freshness-warning');
      assert.equal(await warning.isVisible(), true);
      assert.match(await warning.innerText(), /^This forecast is more than 30 hours old \(run .* UTC\)\. The newest run could not be loaded, so please do not rely on it and check again later\.$/);
      assert.match(await page.locator('#freshness').innerText(), /1 day 16 hours old\.$/);
      assert.doesNotMatch(await warning.innerText(), /error|manifest|exception/i);
      return log;
    },
    async 'credits: ECMWF wording, the changes statement, and every party with a safe link'(browser) {
      const { page, log } = await openAt(browser, 9);
      const footer = await page.locator('.about').innerText();
      assert.ok(footer.includes(ECMWF_SENTENCE));
      assert.match(footer, /Source: www\.ecmwf\.int\. This ECMWF data is published under a Creative Commons Attribution 4\.0 International licence \(CC BY 4\.0\)\./);
      assert.match(footer, /The data was changed:/);
      assert.match(footer, /This is not an official weather warning\./);
      const links = await page.locator('.about a').evaluateAll((nodes) => nodes.map((n) => ({ href: n.href, rel: n.rel, target: n.target, text: n.textContent })));
      assert.ok(links.length >= 6);
      for (const l of links) { assert.match(l.href, /^https:\/\//); assert.match(l.rel, /noopener/); assert.equal(l.target, '_blank'); }
      assert.ok(links.some((l) => l.href === 'https://open-meteo.com/'), 'the Open-Meteo link');
      assert.equal(await page.locator('#privacy a[href="https://open-meteo.com/"]').count(), 1, 'the Open-Meteo link next to the place search');
      return log;
    },
  };
}
