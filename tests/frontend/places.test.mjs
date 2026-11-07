// Tests for frontend/src/places.js, geocode.js, wording.js and config/activities.json. Everything that comes from outside is hostile here.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseReply, searchPlaces, searchText, searchUrl } from '../../frontend/src/geocode.js';
import { addPlace, cleanCoordinates, cleanPlace, loadSaved, parseSaved, readAddress, removePlace, storeSaved, writeAddress } from '../../frontend/src/places.js';
import { nameOfPosition, parseReverse, reverseUrl } from '../../frontend/src/reverse.js';
import { activityNote } from '../../frontend/src/render.js';
import { CONFIDENCE_WORD, dayVerdict, levelLegendText, placeSummary, rangeText, windowText } from '../../frontend/src/wording.js';

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

test('the page address: place, activity and the accepted rain level are checked; anything unknown (also the old wet=) is ignored', () => {
  const ids = ACTIVITIES.activities.map((a) => a.id).concat('custom');
  const choices = ACTIVITIES.custom.level_choices;
  const got = readAddress('?lat=13.09&lon=80.28&name=Chennai&tz=Asia/Kolkata&activity=custom&accept=light', ids, choices);
  assert.deepEqual(got.place, { name: 'Chennai', lat: 13.09, lon: 80.28, zone: 'Asia/Kolkata' });
  assert.equal(got.activity, 'custom');
  assert.equal(got.accept, 'light');
  const bad = readAddress('?lat=999&lon=abc&activity=<script>&accept=heavy&tz=../x', ids, choices); // 'heavy' is not a choice: nothing is accepted beyond moderate
  assert.deepEqual([bad.place, bad.activity, bad.accept], [null, null, null]);
  assert.equal(readAddress('?lat=10&lon=20&activity=custom&wet=2', ids, choices).accept, null); // the old parameter is not read
  assert.equal(readAddress('?lat=10&lon=20', ids, []).place.name, 'Shared place');
  assert.equal(readAddress('?lat=10', ids, []).place, null);
  const link = writeAddress(CHENNAI, 'custom', 'moderate');
  assert.deepEqual(readAddress(link, ids, choices).place, CHENNAI);
  assert.match(link, /accept=moderate/);
  assert.doesNotMatch(writeAddress(CHENNAI, 'outdoor', 'moderate'), /accept=/); // only the Custom activity carries it
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

test('the rain levels are consistent: lowest first from 0, multiples of the storage step, distinct words, and every activity accepts a real level that has one above it', () => {
  const levels = ACTIVITIES.levels;
  assert.deepEqual(levels.map((l) => l.id), ['none', 'light', 'moderate', 'heavy']);
  assert.equal(levels[0].from_mm, 0);
  levels.forEach((l, i) => {
    assert.ok(i === 0 || l.from_mm > levels[i - 1].from_mm, `${l.id}: levels must rise`);
    assert.ok(Math.abs(l.from_mm * 10 - Math.round(l.from_mm * 10)) < 1e-9, `${l.id}: from_mm is not a multiple of 0.1`);
  });
  assert.equal(new Set(levels.flatMap((l) => [l.label, l.short])).size, levels.length * 2 - 1); // "No rain" is both label and short word of the first level
  const ids = levels.map((l) => l.id);
  for (const a of [...ACTIVITIES.activities, { ...ACTIVITIES.custom, max_level: ACTIVITIES.custom.default_level }]) {
    assert.ok(ids.includes(a.max_level) && a.max_level !== ids[ids.length - 1], `${a.id}: max_level ${a.max_level} must be a level that has a higher one`);
  }
  assert.ok(ACTIVITIES.custom.level_choices.every((id) => ids.includes(id) && id !== ids[ids.length - 1]));
  assert.ok(ACTIVITIES.custom.level_choices.includes(ACTIVITIES.custom.default_level));
});

test('the activity presets are consistent: unique ids and enough allowed hours for the minimum window', () => {
  const ids = ACTIVITIES.activities.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes(ACTIVITIES.default_activity));
  assert.ok(!ids.includes(ACTIVITIES.custom.id));
  for (const a of [...ACTIVITIES.activities, ACTIVITIES.custom]) {
    const [from, to] = a.hours;
    assert.ok(from >= 0 && to <= 24 && from < to, a.id);
    assert.ok(Math.floor((to - from) / 6) >= a.min_blocks, `${a.id}: the hours are too short for min_blocks`); // a 6 h block fits at least floor(L/6) times
  }
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
  const L = ACTIVITIES.levels;
  // a planned block: its fit for the activity ('ok' | 'maybe' | 'over') and the level index of the wetter model (0 none, 1 light, 2 moderate, 3 heavy)
  const b = (fit, level, over = {}) => ({ fit, level, inHours: true, past: false, single: false, day: '2026-11-07', ...over });
  assert.equal(dayVerdict([b('ok', 0), b('ok', 0)], undefined, 'UTC', L, 0), 'No rain (both models agree).');
  assert.equal(dayVerdict([b('ok', 0, { single: true })], undefined, 'UTC', L, 0), 'No rain (one model only).');
  assert.equal(dayVerdict([b('ok', 1), b('ok', 0)], undefined, 'UTC', L, 1), 'Light rain at most (both models agree).'); // an activity that accepts light rain
  assert.equal(dayVerdict([b('over', 1), b('over', 2)], undefined, 'UTC', L, 0), 'Moderate rain all day.'); // the wettest level of the day
  assert.match(dayVerdict([b('ok', 0), b('maybe', 1)], undefined, 'UTC', L, 0), /^The models differ about 1 block\.$/);
  assert.match(dayVerdict([b('over', 1), b('ok', 0)], w(6, 12), 'Asia/Kolkata', L, 0), /^Rain in 1 of 2 blocks\. Best window Sat 7 Nov 11:30–17:30\.$/);
  assert.match(dayVerdict([b('over', 2), b('ok', 1)], undefined, 'UTC', L, 1), /^Moderate rain or more in 1 of 2 blocks\. No window long enough\.$/);
  assert.equal(dayVerdict([b('ok', 0, { past: true })], undefined, 'UTC', L, 0), 'Over.');
  assert.equal(dayVerdict([b('ok', 0, { inHours: false })], undefined, 'UTC', L, 0), 'Outside the hours for this activity.');
  const planned = [b('ok', 0, { startMs: t0, endMs: t0 + 6 * HOUR }), b('maybe', 1, { startMs: t0 + 6 * HOUR, endMs: t0 + 12 * HOUR })];
  assert.equal(placeSummary(planned, 'Asia/Kolkata', L, 0), 'Light rain possible Sat 7 Nov 11:30–17:30 (models differ).');
  planned[1] = b('over', 2, { startMs: t0 + 6 * HOUR, endMs: t0 + 12 * HOUR });
  assert.equal(placeSummary(planned, 'Asia/Kolkata', L, 0), 'Moderate rain Sat 7 Nov 11:30–17:30.');
  assert.equal(placeSummary([planned[0]], 'UTC', L, 0), 'No rain through Sat 7 Nov.');
  assert.equal(placeSummary([planned[0]], 'UTC', L, 1), 'Light rain at most through Sat 7 Nov.');
  assert.equal(placeSummary([], 'UTC', L, 0), 'No forecast left in your hours.');
});

test('no sentence of the plan uses "wet" or "dry" any more (the user found them confusing, D41)', () => {
  const L = ACTIVITIES.levels;
  const b = (fit, level) => ({ fit, level, inHours: true, past: false, single: false, day: '2026-11-07', startMs: 0, endMs: 6 * 3600e3 });
  const texts = [];
  for (const max of [0, 1, 2]) {
    for (const blocks of [[b('ok', 0)], [b('over', 3)], [b('maybe', 1)], [b('over', 1), b('ok', 0)], [b('ok', 1)]]) {
      texts.push(dayVerdict(blocks, undefined, 'UTC', L, max), placeSummary(blocks, 'UTC', L, max));
    }
  }
  assert.ok(texts.length > 20);
  assert.doesNotMatch(texts.join(' '), /\b(wet|dry)\b/i);
});

test('the level legend, the window sentences, every activity note and the static page text speak in rain levels', () => {
  const L = ACTIVITIES.levels;
  assert.equal(levelLegendText(L), 'No rain: under 0.5 mm · Light rain: 0.5–3 mm · Moderate rain: 3–10 mm · Heavy rain: 10 mm or more, per 6 hours. These cut-offs are our own; there is no official standard for 6-hour blocks.');
  const notes = [...ACTIVITIES.activities, { ...ACTIVITIES.custom, max_level: ACTIVITIES.custom.default_level }].map((a) => activityNote(a, L));
  assert.match(notes[0], /A good time has no rain in a 6-hour block\. Hours used: 08:00–22:00\. Shortest window shown: 6 hours\./); // outdoor
  assert.match(notes[1], /A good time has light rain at most in a 6-hour block/); // commute
  const html = readFileSync(new URL('../../frontend/index.html', import.meta.url), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  const all = [levelLegendText(L), ...Object.values(CONFIDENCE_WORD), ...notes, html].join(' ');
  assert.doesNotMatch(all, /\b(wet|dry)\b/i);
  assert.match(html, /3\. Best times/);
});

test('the reverse lookup names a device position: most local name, region, country; repeats and junk are dropped', () => {
  const cfg = FRONTEND.reverse_geocoder;
  const url = new URL(reverseUrl(cfg, 11.4602, 78.1862));
  assert.equal(url.origin + url.pathname, cfg.url);
  assert.deepEqual([...url.searchParams.keys()].sort(), ['latitude', 'localityLanguage', 'longitude']);
  assert.equal(parseReverse({ locality: 'Rasipuram', city: 'Rasipuram', principalSubdivision: 'Tamil Nadu', countryName: 'India' }), 'Rasipuram, Tamil Nadu, India');
  assert.equal(parseReverse({ locality: '', city: 'London', principalSubdivision: 'England', countryName: 'United Kingdom' }), 'London, England, United Kingdom');
  // the real answer for central London (checked today): a long country name becomes its code, the local name and the city both stay
  assert.equal(parseReverse({ locality: 'City of Westminster', city: 'London', principalSubdivision: 'England', countryName: 'United Kingdom of Great Britain and Northern Ireland', countryCode: 'GB' }),
    'City of Westminster, London, England, GB');
  assert.equal(parseReverse({ city: 'X', countryName: 'A very long country name indeed', countryCode: '<b>' }), 'X, A very long country name indeed'); // a bad code is not used
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
