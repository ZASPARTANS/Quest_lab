// Tests for frontend/src/time.js: zones, daylight saving time and local days. Run: docker compose -f docker/compose.yaml run --rm frontend-tests
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clock, dayKey, dayLabel, deviceZone, hourOfDay, localParts, offsetLabel, offsetMinutes, validZone } from '../../frontend/src/time.js';

const at = (iso) => Date.parse(iso);

test('zone names are checked by pattern and by the browser database', () => {
  for (const ok of ['Asia/Kolkata', 'Europe/London', 'America/Argentina/Buenos_Aires', 'UTC', 'Etc/GMT+5']) assert.equal(validZone(ok), true, ok);
  for (const bad of ['', '../etc/passwd', 'Not/AZone', 'Asia/Kolkata; drop', '<script>', 'a'.repeat(100), 123, null, undefined]) assert.equal(validZone(bad), false, String(bad));
  assert.equal(validZone(deviceZone()), true);
});

test('India is UTC+05:30 all year, and the labels say so', () => {
  assert.equal(offsetMinutes(at('2026-11-07T00:00:00Z'), 'Asia/Kolkata'), 330);
  assert.equal(offsetMinutes(at('2026-07-01T00:00:00Z'), 'Asia/Kolkata'), 330);
  assert.equal(offsetLabel(at('2026-11-07T00:00:00Z'), 'Asia/Kolkata'), 'UTC+05:30');
  assert.equal(offsetLabel(at('2026-11-07T00:00:00Z'), 'Asia/Kathmandu'), 'UTC+05:45');
  assert.equal(offsetLabel(at('2026-01-07T00:00:00Z'), 'America/New_York'), 'UTC-05:00');
});

test('6-hour UTC blocks start at 05:30, 11:30, 17:30, 23:30 in India', () => {
  const ends = ['2026-11-06T18:00:00Z', '2026-11-07T00:00:00Z', '2026-11-07T06:00:00Z', '2026-11-07T12:00:00Z'];
  assert.deepEqual(ends.map((e) => clock(at(e) - 6 * 3600e3, 'Asia/Kolkata')), ['17:30', '23:30', '05:30', '11:30']);
});

test('daylight saving time: the offset changes on the right instant (New York, 1 Nov 2026 at 06:00 UTC) and London in summer', () => {
  assert.equal(offsetMinutes(at('2026-11-01T05:59:00Z'), 'America/New_York'), -240);
  assert.equal(offsetMinutes(at('2026-11-01T06:00:00Z'), 'America/New_York'), -300);
  assert.equal(offsetMinutes(at('2026-07-01T12:00:00Z'), 'Europe/London'), 60);
  assert.equal(offsetMinutes(at('2026-11-07T12:00:00Z'), 'Europe/London'), 0);
  // the local day of that Sunday is 25 hours long: 05:00 UTC and 07:00 UTC fall on the same local calendar day
  assert.equal(dayKey(at('2026-11-01T04:30:00Z'), 'America/New_York'), '2026-11-01');
  assert.equal(dayKey(at('2026-11-02T04:30:00Z'), 'America/New_York'), '2026-11-01'); // 23:30 EST on the 1st
});

test('the local date can differ from the UTC date, and midnight is hour 0, not 24', () => {
  assert.equal(dayKey(at('2026-11-06T20:00:00Z'), 'Asia/Kolkata'), '2026-11-07'); // 01:30 IST
  assert.equal(dayKey(at('2026-11-06T20:00:00Z'), 'Pacific/Auckland'), '2026-11-07');
  assert.equal(dayKey(at('2026-11-07T03:00:00Z'), 'America/Los_Angeles'), '2026-11-06'); // 19:00 PST on the 6th
  assert.equal(localParts(at('2026-11-07T00:00:00Z'), 'UTC').hour, 0);
  assert.equal(localParts(at('2026-11-06T18:30:00Z'), 'Asia/Kolkata').hour, 0);
  assert.equal(hourOfDay(at('2026-11-06T12:00:00Z'), 'Asia/Kolkata'), 17.5);
  assert.equal(clock(at('2026-11-06T18:30:00Z'), 'Asia/Kolkata'), '00:00');
});

test('the label of a calendar day does not depend on any zone', () => {
  assert.equal(dayLabel('2026-11-07'), 'Sat 7 Nov');
  assert.equal(dayLabel('2026-12-31'), 'Thu 31 Dec');
  // fixed tables: the same text in every browser (Safari wrote "Sat, 7 Nov" and some engines write "Sept" with the locale formatter)
  assert.deepEqual(['2026-09-08', '2026-01-01', '2026-02-28', '2024-02-29', '2026-05-03'].map(dayLabel), ['Tue 8 Sep', 'Thu 1 Jan', 'Sat 28 Feb', 'Thu 29 Feb', 'Sun 3 May']);
  assert.ok(Array.from({ length: 12 }, (_, i) => dayLabel(`2026-${String(i + 1).padStart(2, '0')}-15`)).every((t) => /^[A-Z][a-z]{2} 15 [A-Z][a-z]{2}$/.test(t)));
});
