// Fetching the forecast data (manifest and tiles) from the site itself. Everything fetched is untrusted: size-limited and checked.
import { manifestProblems } from './manifest.js';

/** Load and check the manifest. Throws with the technical reason (the page shows a plain message, the console keeps the detail). */
export async function loadManifest(base, file, maxChars) {
  const response = await fetch(base + file, { credentials: 'omit', cache: 'no-cache' });
  if (!response.ok) throw new Error(`manifest answered ${response.status}`);
  const text = await response.text();
  if (text.length > maxChars) throw new Error('manifest is larger than allowed');
  const manifest = JSON.parse(text);
  const problems = manifestProblems(manifest);
  if (problems.length) throw new Error(`manifest is not usable: ${problems.join('; ')}`);
  return manifest;
}

/** A `get(url) -> ArrayBuffer` for tiles that refuses anything larger than `maxBytes` (the biggest possible compressed tile). */
export function bufferGetter(maxBytes) {
  return async (url) => {
    const response = await fetch(url, { credentials: 'omit' });
    if (!response.ok) throw new Error(`tile answered ${response.status}`);
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) throw new Error('tile is larger than allowed');
    return buffer;
  };
}

/** Largest tile file the manifest allows: the unpacked size plus a little for gzip framing. */
export function maxTileBytes(manifest) {
  return 10 + 2 * manifest.tiles.size * manifest.tiles.size * manifest.tiles.layers + 1024;
}

/** Ask the browser for the device position. Resolves { lat, lon } or rejects with { code: 'denied' | 'timeout' | 'unavailable' | 'unsupported' }. */
export function devicePosition(options) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject({ code: 'unsupported' });
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => reject({ code: e.code === 1 ? 'denied' : e.code === 3 ? 'timeout' : 'unavailable' }), // 1 = refused, 3 = too slow, anything else = no position
      { timeout: options.timeout_ms, maximumAge: options.max_age_ms, enableHighAccuracy: false },
    );
  });
}

/** True only if the visitor has already allowed location for this site (then the page may use it without asking again). */
export async function locationAlreadyAllowed() {
  try {
    return (await navigator.permissions.query({ name: 'geolocation' })).state === 'granted';
  } catch {
    return false;
  }
}
