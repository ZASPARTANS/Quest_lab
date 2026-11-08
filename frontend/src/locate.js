// "Use my location" (decisions D24 and D35, error E038): one search at a time, and a slow first fix gets one more, longer try before the page says it failed.
// The page also starts a search by itself at load when the visitor has already allowed location, so a press of the button used to start a SECOND search,
// and the failure message of one could appear while the other was still going: a phone showed "Search for a place instead" and a moment later took the position.
import { devicePosition } from './data.js';
import { cleanCoordinates } from './places.js';

/**
 * Looks for the device position. Resolves { lat, lon } (checked) or rejects with { code: 'denied' | 'timeout' | 'unavailable' | 'unsupported' }.
 * `options` = config geolocation (timeout_ms, retry_timeout_ms, max_age_ms); `report(text)` tells the visitor what is going on; `ask` is devicePosition (a test passes its own).
 */
export async function findPosition(options, report, ask = devicePosition) {
  report('Looking for your location…');
  let position;
  try {
    position = await ask(options);
  } catch (error) {
    if (error?.code !== 'timeout') throw error; // a refusal is final; only a slow first fix is tried again
    report('Still looking for your location… the first search can take a little longer.');
    position = await ask({ ...options, timeout_ms: options.retry_timeout_ms });
  }
  const where = cleanCoordinates(position.lat, position.lon);
  if (!where) throw { code: 'unavailable' };
  return where;
}

/** A task that runs once at a time: a call made while it is running gets the same promise instead of starting it again. */
export function onePerTime(task) {
  let running = null;
  return () => {
    if (!running) running = Promise.resolve().then(task).finally(() => { running = null; });
    return running;
  };
}
