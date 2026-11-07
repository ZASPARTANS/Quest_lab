// Tests for frontend/src/places.js, geocode.js, wording.js and config/activities.json. Everything that comes from outside is hostile here.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseReply, searchPlaces, searchText, searchUrl } from '../../frontend/src/geocode.js';
import { addPlace, cleanCoordinates, cleanPlace, loadSaved, parseSaved, readAddress, removePlace, storeSaved, writeAddress } from '../../frontend/src/places.js';
import { nameOfPosition, parseReverse, reverseUrl } from '../../frontend/src/reverse.js';
import { dayVerdict, placeSummary, rangeText, windowText } from '../../frontend/src/wording.js';

const readJson = (rel) => JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8'));
const ACTIVITIES = readJson('../../config/activities.json');
const FRONTEND = readJson('../../config/frontend.json');
const CHENNAI = { name: 'Chennai', lat: 13.088, lon: 80.278, zone: 'Asia/Kolkata' };

test('coordinates are limited and wrapped; text and non-numbers are handled', () => {
  assert.deepEqual(cleanCoordinates(95, 190), { lat: 90, lon: -170 });
  assert.deepEqual(cleanCoordinates('13.0878', '-80.12345'), { lat: 13.088, lon: -80.123 });
  assert.deepEqual(cleanCoordinates(0, 540), { lat: 0, lon: -180 });
  for (const bad of [[null, 1], [1, undefined], ['', 1], ['abc', 1], [Number.NaN, 1], [1, Infinity], [{}, 1]]) assert.equal(cleanCoordinates(...bad), null, JSON.stringify(bad));
});

test('a place needs a name and coordinates; a bad zone is dropped, control characters and long names are cleaned', () => {
  assert.deepEqual(cleanPlace(CHENNAI), CHENNAI);
  assert.equal(cleanPlace({ ...CHENNAI, zone: 'Not/AZone' }).zone, null);
  assert.equal(cleanPlace({ ...CHENNAI, name: '  A\u0000B\n\tC  ' }).name, 'A B C');
  assert.equal(cleanPlace({ ...CHENNAI, name: 'x'.repeat(500) }).name.length, 80);
  for (const bad of [null, 'text', 5, { lat: 1, lon: 1 }, { name: '', lat: 1, lon: 1 }, { name: 'x', lat: 'a', lon: 1 }]) assert.equal(cleanPlace(bad), null, JSON.stringify(bad));
});

test('saved places: bad JSON, wrong types, duplicates and too many are dropped; storage failures never throw', () => {
  const four = Array.from({ length: 8 }, (_, i) => ({ name: `P${i}`, lat: i * 10, lon: i * 10, zone: 'UTC' }));
  assert.equal(parseSaved(JSON.stringify(four), 5).length, 5);
  assert.deepEqual(parseSaved('{not json', 5), []);
  assert.deepEqual(parseSaved('{"a":1}', 5), []);
  assert.deepEqual(parseSaved(null, 5), []);
  assert.deepEqual(parseSaved('x'.repeat(9000), 5), []);
  assert.equal(parseSaved(JSON.stringify([CHENNAI, { ...CHENNAI, name: 'Same spot' }, 7, null, { lat: 1 }]), 5).length, 1);
  assert.deepEqual(loadSaved({ getItem() { throw new Error('blocked'); } }, 'k', 5), []);
  assert.equal(storeSaved({ setItem() { throw new Error('full'); } }, 'k', []), false);
  const memory = new Map();
  const storage = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  assert.equal(storeSaved(storage, 'k', [CHENNAI]), true);
  assert.deepEqual(loadSaved(storage, 'k', 5), [CHENNAI]);
});

test('adding and removing saved places: newest first, no duplicates, a full list stays full', () => {
  let { places, added } = addPlace([], CHENNAI, 2);
  assert.equal(added, true);
  assert.equal(addPlace(places, { ...CHENNAI, name: 'again' }, 2).added, false);
  ({ places } = addPlace(places, { name: 'London', lat: 51.5, lon: -0.1, zone: 'Europe/London' }, 2));
  assert.deepEqual(places.map((p) => p.name), ['London', 'Chennai']);
  assert.equal(addPlace(places, { name: 'Third', lat: 1, lon: 1 }, 2).added, false);
  assert.deepEqual(removePlace(places, CHENNAI).map((p) => p.name), ['London']);
  assert.equal(addPlace(places, { name: '', lat: 1, lon: 1 }, 5).added, false);
});

test('the page address: place, activity and wet level are checked; anything unknown is ignored', () => {
  const ids = ACTIVITIES.activities.map((a) => a.id).concat('custom');
  const got = readAddress('?lat=13.09&lon=80.28&name=Chennai&tz=Asia/Kolkata&activity=laundry&wet=2', ids, ACTIVITIES.custom.wet_choices_mm);
  assert.deepEqual(got.place, { name: 'Chennai', lat: 13.09, lon: 80.28, zone: 'Asia/Kolkata' });
  assert.equal(got.activity, 'laundry');
  assert.equal(got.wet, 2);
  const bad = readAddress('?lat=999&lon=abc&activity=<script>&wet=77&tz=../x', ids, ACTIVITIES.custom.wet_choices_mm);
  assert.deepEqual([bad.place, bad.activity, bad.wet], [null, null, null]);
  assert.equal(readAddress('?lat=10&lon=20', ids, []).place.name, 'Shared place');
  assert.equal(readAddress('?lat=10', ids, []).place, null);
  const link = writeAddress(CHENNAI, 'custom', 1);
  assert.deepEqual(readAddress(link, ids, ACTIVITIES.custom.wet_choices_mm).place, CHENNAI);
  assert.match(link, /wet=1/);
});

test('the geocoder: text limits, the request address, and a reply is parsed field by field', () => {
  const cfg = FRONTEND.geocoder;
  assert.equal(searchText('  Chen  nai ', cfg), 'Chen nai');
  assert.equal(searchText('a', cfg), null);
  assert.equal(searchText('x'.repeat(cfg.max_chars + 1), cfg), null);
  assert.equal(searchText(42, cfg), null);
  const url = new URL(searchUrl(cfg, 'Chennai & co'));
  assert.equal(url.origin + url.pathname, cfg.url);
  assert.equal(url.searchParams.get('name'), 'Chennai & co');
  const reply = { results: [
    { name: 'Chennai', latitude: 13.08784, longitude: 80.27847, timezone: 'Asia/Kolkata', country: 'India', admin1: 'Tamil Nadu' },
    { name: 'No coordinates' }, null, { name: 'Bad zone', latitude: 1, longitude: 2, timezone: 'javascript:alert(1)', country: 'X' },
    { name: '<img src=x onerror=alert(1)>', latitude: 3, longitude: 4, timezone: 'UTC' },
  ] };
  const places = parseReply(reply, 5);
  assert.deepEqual(places.map((p) => p.name), ['Chennai, Tamil Nadu, India', 'Bad zone, X', '<img src=x onerror=alert(1)>']); // text stays text; the page writes it with textContent
  assert.equal(places[1].zone, null);
  assert.deepEqual(parseReply({ generationtime_ms: 0.1 }, 5), []); // the real "nothing found" reply has no `results`
  assert.deepEqual(parseReply('nonsense', 5), []);
  assert.equal(parseReply(reply, 1).length, 1);
});

test('searching never sends cookies or a referrer, and failures throw', async () => {
  const cfg = FRONTEND.geocoder;
  const seen = [];
  const ok = async (url, init) => { seen.push([url, init]); return { ok: true, text: async () => JSON.stringify({ results: [{ name: 'Chennai', latitude: 13, longitude: 80, timezone: 'Asia/Kolkata' }] }) }; };
  assert.equal((await searchPlaces(cfg, 'Chennai', ok)).length, 1);
  assert.equal(seen[0][1].credentials, 'omit');
  assert.equal(seen[0][1].referrerPolicy, 'no-referrer');
  await assert.rejects(searchPlaces(cfg, 'x', ok), /out of range/);
  await assert.rejects(searchPlaces(cfg, 'Chennai', async () => ({ ok: false, status: 429 })), /429/);
  await assert.rejects(searchPlaces(cfg, 'Chennai', async () => ({ ok: true, text: async () => 'x'.repeat(cfg.max_reply_chars + 1) })), /too large/);
  await assert.rejects(searchPlaces(cfg, 'Chennai', async () => ({ ok: true, text: async () => '<html>' })));
});

test('the activity presets are consistent: unique ids, thresholds in storage steps, and enough allowed hours for the minimum window', () => {
  const ids = ACTIVITIES.activities.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes(ACTIVITIES.default_activity));
  assert.ok(!ids.includes(ACTIVITIES.custom.id));
  for (const a of [...ACTIVITIES.activities, ACTIVITIES.custom]) {
    const [from, to] = a.hours;
    assert.ok(from >= 0 && to <= 24 && from < to, a.id);
    assert.ok(Math.floor((to - from) / 6) >= a.min_blocks, `${a.id}: the hours are too short for min_blocks`); // a 6 h block fits at least floor(L/6) times
    const wet = a.wet_mm ?? ACTIVITIES.custom.default_wet_mm;
    assert.ok(Math.abs(wet * 10 - Math.round(wet * 10)) < 1e-9, `${a.id}: wet_mm is not a multiple of 0.1`);
  }
  assert.ok(ACTIVITIES.custom.wet_choices_mm.includes(ACTIVITIES.custom.default_wet_mm));
});

test('wording: ranges, windows across midnight, day verdicts and the one-line summary of a saved place', () => {
  assert.equal(rangeText(4, 7.2), '4–7.2 mm');
  assert.equal(rangeText(5, 5), '5 mm');
  const HOUR = 3600e3;
  const t0 = Date.parse('2026-11-07T00:00:00Z'); // 05:30 IST
  const w = (startOffset, endOffset, over = {}) => ({ startMs: t0 + startOffset * HOUR, endMs: t0 + endOffset * HOUR, startsNow: false, ...over });
  assert.equal(windowText(w(6, 12), 'Asia/Kolkata'), 'Sat 7 Nov 11:30–17:30');
  assert.equal(windowText(w(12, 24), 'Asia/Kolkata'), 'Sat 7 Nov 17:30 – Sun 8 Nov 05:30');
  assert.equal(windowText(w(0, 6, { startsNow: true }), 'Asia/Kolkata'), 'Now–11:30');
  const b = (state, over = {}) => ({ state, inHours: true, past: false, single: false, day: '2026-11-07', ...over });
  assert.equal(dayVerdict([b('dry'), b('dry')], undefined, 'UTC'), 'Dry. Both models agree.');
  assert.equal(dayVerdict([b('wet'), b('wet')], undefined, 'UTC'), 'Wet all day.');
  assert.match(dayVerdict([b('dry'), b('disagree')], undefined, 'UTC'), /No block is wet in both models; they disagree about 1 block\./);
  assert.match(dayVerdict([b('wet'), b('dry')], w(6, 12), 'Asia/Kolkata'), /Rain in 1 of 2 blocks\. Best window Sat 7 Nov 11:30–17:30\./);
  assert.match(dayVerdict([b('wet'), b('disagree')], undefined, 'UTC'), /No dry window/);
  assert.equal(dayVerdict([b('dry', { past: true })], undefined, 'UTC'), 'Over.');
  assert.equal(dayVerdict([b('dry', { inHours: false })], undefined, 'UTC'), 'Outside the hours for this activity.');
  const planned = [b('dry', { startMs: t0, endMs: t0 + 6 * HOUR }), b('disagree', { startMs: t0 + 6 * HOUR, endMs: t0 + 12 * HOUR })];
  assert.equal(placeSummary(planned, 'Asia/Kolkata'), 'Rain possible Sat 7 Nov 11:30–17:30 (models disagree).');
  assert.equal(placeSummary([planned[0]], 'UTC'), 'Dry through Sat 7 Nov.');
  assert.equal(placeSummary([], 'UTC'), 'No forecast left in your hours.');
});

test('the reverse lookup names a device position: most local name, region, country; repeats and junk are dropped', () => {
  const cfg = FRONTEND.reverse_geocoder;
  const url = new URL(reverseUrl(cfg, 11.4602, 78.1862));
  assert.equal(url.origin + url.pathname, cfg.url);
  assert.deepEqual([...url.searchParams.keys()].sort(), ['latitude', 'localityLanguage', 'longitude']);
  assert.equal(parseReverse({ locality: 'Rasipuram', city: 'Rasipuram', principalSubdivision: 'Tamil Nadu', countryName: 'India' }), 'Rasipuram, Tamil Nadu, India');
  assert.equal(parseReverse({ locality: '', city: 'London', principalSubdivision: 'England', countryName: 'United Kingdom' }), 'London, England, United Kingdom');
  assert.equal(parseReverse({ city: 'Singapore', principalSubdivision: 'singapore', countryName: 'Singapore' }), 'Singapore'); // same name three times
  assert.equal(parseReverse({ locality: '  A B  ', countryName: 'X' }), 'A B, X');
  assert.equal(parseReverse({ locality: '<img src=x onerror=1>' }), '<img src=x onerror=1>'); // stays text; the page uses textContent / input.value
  for (const bad of [null, 'text', 5, [], {}, { locality: 7, city: null }]) assert.equal(parseReverse(bad), null, JSON.stringify(bad));
});

test('asking for the name sends no cookie and no referrer, and any failure throws (the page then keeps "Your location")', async () => {
  const cfg = FRONTEND.reverse_geocoder;
  let seen;
  const ok = async (url, init) => { seen = [url, init]; return { ok: true, text: async () => JSON.stringify({ locality: 'Rasipuram', countryName: 'India' }) }; };
  assert.equal(await nameOfPosition(cfg, 11.46, 78.19, ok), 'Rasipuram, India');
  assert.equal(seen[1].credentials, 'omit');
  assert.equal(seen[1].referrerPolicy, 'no-referrer');
  await assert.rejects(nameOfPosition(cfg, 1, 2, async () => ({ ok: false, status: 402 })), /402/);
  await assert.rejects(nameOfPosition(cfg, 1, 2, async () => ({ ok: true, text: async () => 'x'.repeat(cfg.max_reply_chars + 1) })), /too large/);
  await assert.rejects(nameOfPosition(cfg, 1, 2, async () => ({ ok: true, text: async () => '<html>' })));
});
