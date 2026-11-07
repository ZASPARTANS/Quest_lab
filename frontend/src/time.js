// Local time for a place, using the browser's own time zone database (Intl). Pure functions; `ms` is always UTC milliseconds.
// Risky logic (zones, DST, local midnight): tested in tests/frontend/time.test.mjs, including India (+05:30) and a DST zone.

const ZONE_PATTERN = /^[A-Za-z][A-Za-z0-9_+-]*(\/[A-Za-z0-9_+-]+){0,2}$/;
const formatters = new Map();

/** True for an IANA zone name this browser knows (pattern first, then Intl); anything else is refused. */
export function validZone(zone) {
  if (typeof zone !== 'string' || zone.length > 64 || !ZONE_PATTERN.test(zone)) return false;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** The device's own zone, or UTC if the browser does not tell. */
export function deviceZone() {
  try {
    const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    return validZone(zone) ? zone : 'UTC';
  } catch {
    return 'UTC';
  }
}

function formatter(zone) {
  if (!formatters.has(zone)) {
    formatters.set(zone, new Intl.DateTimeFormat('en-GB', {
      timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }));
  }
  return formatters.get(zone);
}

/** Wall-clock parts of an instant in a zone: { year, month, day, hour, minute, second } (numbers). */
export function localParts(ms, zone) {
  const out = {};
  for (const { type, value } of formatter(zone).formatToParts(ms)) {
    if (type !== 'literal') out[type] = Number(value);
  }
  out.hour %= 24; // some engines write midnight as 24
  return out;
}

/** Offset of the zone from UTC at that instant, in minutes (India: 330). */
export function offsetMinutes(ms, zone) {
  const p = localParts(ms, zone);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((wall - Math.floor(ms / 1000) * 1000) / 60000);
}

const two = (n) => String(n).padStart(2, '0');

/** Local calendar day as 'YYYY-MM-DD'. */
export function dayKey(ms, zone) {
  const p = localParts(ms, zone);
  return `${p.year}-${two(p.month)}-${two(p.day)}`;
}

/** Local time of day as a fraction of hours (11:30 -> 11.5). */
export function hourOfDay(ms, zone) {
  const p = localParts(ms, zone);
  return p.hour + p.minute / 60;
}

/** Local clock time 'HH:MM'. */
export function clock(ms, zone) {
  const p = localParts(ms, zone);
  return `${two(p.hour)}:${two(p.minute)}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'Sat 7 Nov' for a 'YYYY-MM-DD' key (the weekday of a calendar date does not depend on any zone). Fixed tables, not the browser's locale: Safari wrote 'Sat, 7 Nov'
 *  and some engines write 'Sept', so the same page read differently on different phones (found by the browser checks in step 13.1). */
export function dayLabel(key) {
  const [y, m, d] = key.split('-').map(Number);
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
}

/** Name of the zone's offset, e.g. 'UTC+05:30', for showing next to times. */
export function offsetLabel(ms, zone) {
  const minutes = offsetMinutes(ms, zone);
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  return `UTC${sign}${two(Math.floor(abs / 60))}:${two(abs % 60)}`;
}
