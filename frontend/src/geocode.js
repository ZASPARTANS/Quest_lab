// Place search through the online geocoder chosen in decision D27 (Open-Meteo). Only the typed text and the visitor's IP address go to it.
// The reply is untrusted: its size is limited, every field is checked, and nothing from it is ever written as HTML.
import { cleanPlace } from './places.js';

/** The text to send, or null if it is too short or too long (rules in config/frontend.json `geocoder`). */
export function searchText(raw, cfg) {
  if (typeof raw !== 'string') return null;
  const text = raw.replace(/\s+/g, ' ').trim();
  return text.length >= cfg.min_chars && text.length <= cfg.max_chars ? text : null;
}

export function searchUrl(cfg, text) {
  const q = new URLSearchParams({ name: text, count: String(cfg.max_results), language: cfg.language, format: 'json' });
  return `${cfg.url}?${q.toString()}`;
}

/** Geocoder reply (parsed JSON) -> places. A reply without `results` means "nothing found". */
export function parseReply(data, maxResults) {
  if (data === null || typeof data !== 'object' || !Array.isArray(data.results)) return [];
  const out = [];
  for (const item of data.results.slice(0, maxResults)) {
    if (item === null || typeof item !== 'object') continue;
    const label = [item.name, item.admin1, item.country].filter((x) => typeof x === 'string' && x).join(', ');
    const place = cleanPlace({ name: label, lat: item.latitude, lon: item.longitude, zone: item.timezone });
    if (place) out.push(place);
  }
  return out;
}

/** Search. `fetchFn` is injected for tests; in the page it is the browser's fetch. Throws on any failure (the page shows a plain message). */
export async function searchPlaces(cfg, raw, fetchFn) {
  const text = searchText(raw, cfg);
  if (!text) throw new Error('search text out of range');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeout_ms);
  try {
    const response = await fetchFn(searchUrl(cfg, text), { credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal });
    if (!response.ok) throw new Error(`geocoder answered ${response.status}`);
    const body = await response.text();
    if (body.length > cfg.max_reply_chars) throw new Error('geocoder reply too large');
    return parseReply(JSON.parse(body), cfg.max_results);
  } finally {
    clearTimeout(timer);
  }
}
