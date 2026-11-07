// Tests for frontend/src/provenance.js (the honesty strip, PLAN-013 step 13.1) and the credit wording in config/frontend.json.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ageText, freshness, runText } from '../../frontend/src/provenance.js';

const FRONTEND = JSON.parse(readFileSync(new URL('../../config/frontend.json', import.meta.url), 'utf8'));
const RUN = '2026-11-07T12:00:00Z';
const at = (hoursAfterRun) => Date.parse(RUN) + hoursAfterRun * 3600e3;

test('the run time is written in UTC, and anything that is not a time gives null', () => {
  assert.equal(runText(RUN), 'Sat 7 Nov 12:00 UTC');
  assert.equal(runText('not a time'), null);
  assert.equal(runText(undefined), null);
});

test('the age is a plain phrase: under an hour, hours, days and hours', () => {
  assert.equal(ageText(0.4), 'less than an hour');
  assert.equal(ageText(1), '1 hour');
  assert.equal(ageText(8.9), '8 hours');
  assert.equal(ageText(24), '1 day');
  assert.equal(ageText(27.5), '1 day 3 hours');
  assert.equal(ageText(50), '2 days 2 hours');
});

test('a fresh forecast shows the run and its age and no warning; the edge is "more than" the limit', () => {
  const fresh = freshness({ run: RUN }, at(8.7), 30);
  assert.equal(fresh.line, 'Forecast: ECMWF run Sat 7 Nov 12:00 UTC (IFS and AIFS), 8 hours old.');
  assert.equal(fresh.warning, '');
  assert.equal(freshness({ run: RUN }, at(30), 30).warning, ''); // exactly the limit is still fine
  assert.match(freshness({ run: RUN }, at(30.01), 30).warning, /^This forecast is more than 30 hours old \(run Sat 7 Nov 12:00 UTC\)\./);
});

test('an old forecast warns in plain words, without technical terms', () => {
  const old = freshness({ run: RUN }, at(60), 30);
  assert.match(old.line, /2 days 12 hours old\.$/);
  assert.match(old.warning, /please do not rely on it and check again later\.$/);
  assert.doesNotMatch(old.warning, /manifest|error|exception|http|json/i);
});

test('a missing or broken run time warns that the age is unknown; a device clock behind the run counts as age 0', () => {
  for (const bad of [{}, { run: 'x' }, null, undefined]) {
    const r = freshness(bad, at(5), 30);
    assert.equal(r.ageHours, null);
    assert.match(r.warning, /could not be checked/);
  }
  const early = freshness({ run: RUN }, at(-3), 30);
  assert.equal(early.ageHours, 0);
  assert.match(early.line, /less than an hour old\.$/);
});

test('the credit lines name every party, keep ECMWF wording and the "changed" statement, and only link to https addresses', () => {
  const lines = FRONTEND.credit_lines;
  const text = lines.map((l) => l.map((p) => (typeof p === 'string' ? p : p[0])).join('')).join(' | ');
  assert.match(text, /Source: www\.ecmwf\.int\. This ECMWF data is published under a Creative Commons Attribution 4\.0 International licence \(CC BY 4\.0\)\./);
  assert.match(text, /Disclaimer: ECMWF does not accept any liability whatsoever for any error or omission in the data, their availability, or for any loss or damage arising from their use\./);
  assert.match(text, /The data was changed:/); // CC BY: "indicate if changes were made"
  for (const party of ['OpenStreetMap', 'Protomaps', 'Open-Meteo.com', 'GeoNames', 'BigDataCloud', 'not an official weather warning']) assert.ok(text.includes(party), `${party} is not credited`);
  const links = lines.flatMap((l) => l.filter((p) => typeof p !== 'string'));
  assert.ok(links.length >= 6);
  for (const [label, url] of links) assert.match(url, /^https:\/\/[a-z0-9.-]+\//, `${label}: ${url}`);
  assert.ok(links.some(([, url]) => url === 'https://creativecommons.org/licenses/by/4.0/'), 'a link to the licence');
  assert.ok(links.some(([, url]) => url === 'https://open-meteo.com/'), 'the link Open-Meteo asks for next to its location data');
});

test('the age limit is longer than the longest normal age of a run (a new run every 12 hours, about 8 hours late, so up to about 21 hours)', () => {
  assert.ok(FRONTEND.freshness.max_age_hours >= 24, `max_age_hours is ${FRONTEND.freshness.max_age_hours}`);
  assert.ok(Number.isInteger(FRONTEND.freshness.max_age_hours));
});
