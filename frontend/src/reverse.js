// Names the DEVICE position (decision D32): the browser asks BigDataCloud's free client-side reverse geocoder "what place is this?".
// Only used for the position the browser reports for this device (that is what the service is for); a click on the map is not looked up.
// The coordinates and the visitor's IP address go to that one host. The reply is untrusted: size-limited, checked field by field, text only.
import { cleanName } from './places.js';

export function reverseUrl(cfg, lat, lon) {
  const q = new URLSearchParams({ latitude: String(lat), longitude: String(lon), localityLanguage: cfg.language });
  return `${cfg.url}?${q.toString()}`;
}

const text = (value) => (typeof value === 'string' ? cleanName(value) : null);

const MAX_COUNTRY_CHARS = 20;

/** The country as a short text: its name, or its code when the name is long ("United Kingdom of Great Britain and Northern Ireland" -> "GB"). */
function country(data) {
  const name = text(data.countryName);
  if (name && name.length <= MAX_COUNTRY_CHARS) return name;
  return typeof data.countryCode === 'string' && /^[A-Za-z]{2,3}$/.test(data.countryCode) ? data.countryCode.toUpperCase() : name;
}

/** Reply -> 'Rasipuram, Tamil Nadu, India' (local name, city, region, country; empty or repeated parts left out), or null. */
export function parseReverse(data) {
  if (data === null || typeof data !== 'object') return null;
  const parts = [text(data.locality), text(data.city), text(data.principalSubdivision), country(data)].filter(Boolean);
  const unique = parts.filter((p, i) => parts.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i);
  return unique.length ? cleanName(unique.join(', ')) : null;
}

/** Ask for the name. `fetchFn` is injected for tests. Throws on any failure; the page then keeps "Your location". */
export async function nameOfPosition(cfg, lat, lon, fetchFn) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeout_ms);
  try {
    const response = await fetchFn(reverseUrl(cfg, lat, lon), { credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal });
    if (!response.ok) throw new Error(`reverse geocoder answered ${response.status}`);
    const body = await response.text();
    if (body.length > cfg.max_reply_chars) throw new Error('reverse geocoder reply too large');
    return parseReverse(JSON.parse(body));
  } finally {
    clearTimeout(timer);
  }
}
