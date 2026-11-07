// Places: validation of anything that names a place (typed search result, URL, saved list in this browser) and the saved-places store.
// Every input here is untrusted. Nothing in this file touches the DOM or the network; storage is injected (a localStorage-like object).
import { validZone } from './time.js';

const MAX_NAME = 80;
const MAX_STORED_CHARS = 8000;

function cleanName(value) {
  if (typeof value !== 'string') return null;
  const text = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
  return text || null;
}

/** Latitude limited to the globe, longitude wrapped to -180..180 (3 decimals are far finer than the 0.25 degree grid). Null if not numbers. */
export function cleanCoordinates(lat, lon) {
  const a = typeof lat === 'string' && lat.trim() !== '' ? Number(lat) : lat;
  const b = typeof lon === 'string' && lon.trim() !== '' ? Number(lon) : lon;
  if (typeof a !== 'number' || typeof b !== 'number' || !Number.isFinite(a) || !Number.isFinite(b)) return null;
  const wrapped = ((((b + 180) % 360) + 360) % 360) - 180;
  return { lat: Math.round(Math.min(Math.max(a, -90), 90) * 1000) / 1000, lon: Math.round(wrapped * 1000) / 1000 };
}

/** A place from anywhere -> { name, lat, lon, zone|null } or null when it is not usable. A zone that is not valid is dropped. */
export function cleanPlace(raw) {
  if (raw === null || typeof raw !== 'object') return null;
  const where = cleanCoordinates(raw.lat, raw.lon);
  const name = cleanName(raw.name);
  if (!where || !name) return null;
  return { name, lat: where.lat, lon: where.lon, zone: validZone(raw.zone) ? raw.zone : null };
}

export const samePlace = (a, b) => Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01;

/** Saved places from storage text: bad JSON, bad entries and duplicates are dropped, at most `max` are kept. */
export function parseSaved(text, max) {
  if (typeof text !== 'string' || text.length > MAX_STORED_CHARS) return [];
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out = [];
  for (const item of data) {
    const place = cleanPlace(item);
    if (place && !out.some((p) => samePlace(p, place))) out.push(place);
    if (out.length >= max) break;
  }
  return out;
}

export function loadSaved(storage, key, max) {
  try {
    return parseSaved(storage.getItem(key), max);
  } catch {
    return []; // storage blocked (private mode, policy): the app works, it just cannot remember
  }
}

/** Add a place (newest first). Returns { places, added } where added is false for a duplicate or when the list is full. */
export function addPlace(places, place, max) {
  const clean = cleanPlace(place);
  if (!clean || places.some((p) => samePlace(p, clean)) || places.length >= max) return { places, added: false };
  return { places: [clean, ...places], added: true };
}

export function removePlace(places, place) {
  return places.filter((p) => !samePlace(p, place));
}

export function storeSaved(storage, key, places) {
  try {
    storage.setItem(key, JSON.stringify(places));
    return true;
  } catch {
    return false;
  }
}

/** Page address (?lat=&lon=&name=&tz=&activity=&wet=) -> { place, activity, wet } with everything checked; missing parts are null. */
export function readAddress(search, activityIds, wetChoices) {
  const q = new URLSearchParams(search);
  const place = cleanPlace({ name: q.get('name') ?? 'Shared place', lat: q.get('lat'), lon: q.get('lon'), zone: q.get('tz') });
  const hasWhere = q.has('lat') && q.has('lon');
  const activity = activityIds.includes(q.get('activity')) ? q.get('activity') : null;
  const wet = wetChoices.find((w) => String(w) === q.get('wet')) ?? null;
  return { place: hasWhere ? place : null, activity, wet };
}

/** The address query for a place and choices (used to keep the page link in step with what is shown). */
export function writeAddress(place, activity, wet) {
  const q = new URLSearchParams({ lat: String(place.lat), lon: String(place.lon), name: place.name, activity });
  if (place.zone) q.set('tz', place.zone);
  if (activity === 'custom' && wet !== null) q.set('wet', String(wet));
  return `?${q.toString()}`;
}
