// The honesty strip (plan PLAN-013 step 13.1, decisions D9 and D26): which forecast run the page shows, how old it is, and a plain warning when it is too old.
// Pure functions (no DOM): the page draws the result with textContent (render.js). The wording of the credits is in config/frontend.json `credit_lines`.
import { clock, dayKey, dayLabel } from './time.js';

const HOUR_MS = 3600 * 1000;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** 'Sat 7 Nov 12:00 UTC' for an ISO time, or null when it is not a valid time. */
export function runText(iso) {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? `${dayLabel(dayKey(ms, 'UTC'))} ${clock(ms, 'UTC')} UTC` : null;
}

/** The age in hours as a phrase: 'less than an hour', '5 hours', '1 day 3 hours', '2 days'. */
export function ageText(hours) {
  const whole = Math.floor(hours);
  if (whole < 1) return 'less than an hour';
  if (whole < 24) return plural(whole, 'hour');
  const days = Math.floor(whole / 24);
  const rest = whole % 24;
  return rest ? `${plural(days, 'day')} ${plural(rest, 'hour')}` : plural(days, 'day');
}

/**
 * What the strip says. `manifest.run` is the forecast run (UTC), `nowMs` the time now, `maxAgeHours` the age above which the plain warning shows.
 * Result: { line, warning, ageHours } where `warning` is '' while the forecast is fresh enough. A device clock that is behind the run counts as age 0.
 */
export function freshness(manifest, nowMs, maxAgeHours, models = 'IFS and AIFS') {
  const at = runText(manifest?.run);
  if (at === null) return { line: 'Forecast: ECMWF (the time of the run is not known).', warning: 'The age of this forecast could not be checked, so please do not rely on it.', ageHours: null };
  const ageHours = Math.max(0, (nowMs - Date.parse(manifest.run)) / HOUR_MS);
  const warning = ageHours > maxAgeHours ? `This forecast is more than ${plural(maxAgeHours, 'hour')} old (run ${at}). The newest run could not be loaded, so please do not rely on it and check again later.` : '';
  return { line: `Forecast: ECMWF run ${at} (${models}), ${ageText(ageHours)} old.`, warning, ageHours };
}
