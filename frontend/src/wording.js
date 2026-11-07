// Plain-language text for the plan (decisions D3, D9, D41: rain levels, never a probability, no technical terms). Pure functions; times are local to the place.
// `levels` = the config levels (no rain, light, moderate, heavy), `max` = the index of the most rain the activity accepts.
import { clock, dayKey, dayLabel } from './time.js';

/** The level cut-offs in plain words, from the config (the page shows this under the day cards; they are ours, not an official standard). */
export function levelLegendText(levels) {
  const parts = levels.map((level, i) => {
    if (i === 0) return `${level.label}: under ${levels[1].from_mm} mm`;
    if (i === levels.length - 1) return `${level.label}: ${level.from_mm} mm or more`;
    return `${level.label}: ${level.from_mm}–${levels[i + 1].from_mm} mm`;
  });
  return `${parts.join(' · ')}, per 6 hours. These cut-offs are our own; there is no official standard for 6-hour blocks.`;
}

export const CONFIDENCE_WORD = {
  sure: 'Neither model expects more rain than this.',
  uncertain: 'The models differ about part of it.',
  'one-model': 'Only one model reaches this far, so it cannot be checked against the other.',
};

/** 'Sat 7 Nov 11:30-17:30', 'Now-17:30', or across days 'Sat 7 Nov 17:30 - Sun 8 Nov 11:30'. */
export function windowText(w, zone) {
  const start = w.startsNow ? 'Now' : `${dayLabel(dayKey(w.startMs, zone))} ${clock(w.startMs, zone)}`;
  const endDay = dayKey(w.endMs - 1, zone);
  if (!w.startsNow && dayKey(w.startMs, zone) === endDay) return `${start}–${clock(w.endMs, zone)}`;
  if (w.startsNow && dayKey(w.startMs, zone) === endDay) return `Now–${clock(w.endMs, zone)}`;
  return `${start} – ${dayLabel(endDay)} ${clock(w.endMs, zone)}`;
}

/** 'Fri 11:30-17:30' for one block. */
export function blockText(block, zone) {
  return `${clock(block.startMs, zone)}–${clock(block.endMs, zone)}`;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** What a window or a block holds at most: 'No rain' or 'Light rain at most' (the wetter model decides). */
export function atMost(levels, level) {
  return level === 0 ? levels[0].label : `${levels[level].label} at most`;
}

/** The word of a block cell: the level of the wetter model ('No rain', 'Light', 'Moderate', 'Heavy'). */
export const blockWord = (levels, block) => levels[block.level].short;

/** Where the two models stand, for blocks where they are in different levels: 'IFS: No rain, AIFS: Light rain'. */
export function modelsText(levels, block, labels) {
  return Object.entries(block.levels).map(([model, level]) => `${(labels ?? {})[model] ?? model}: ${levels[level].label}`).join(', ');
}

/** What the activity accepts, in words: 'no rain' or 'light rain at most'. */
export function acceptText(levels, max) {
  return max === 0 ? levels[0].label.toLowerCase() : `${levels[max].label.toLowerCase()} at most`;
}

/** One line for a day card. `blocks` = the day's planned entries, `best` = the best window that starts that day (or undefined). */
export function dayVerdict(blocks, best, zone, levels, max) {
  const counted = blocks.filter((b) => b.inHours && !b.past);
  if (!counted.length) return blocks.every((b) => b.past) ? 'Over.' : 'Outside the hours for this activity.';
  const over = counted.filter((b) => b.fit === 'over').length;
  const unsure = counted.filter((b) => b.fit === 'maybe').length;
  const worst = Math.max(...counted.map((b) => b.level));
  const rain = max === 0 ? 'Rain' : `${levels[max + 1].label} or more`;
  const of = `${over} of ${plural(counted.length, 'block')}`;
  if (over === counted.length) return `${levels[worst].label} all day.`;
  if (over === 0 && unsure === 0) {
    const how = counted.some((b) => b.single) ? 'one model only' : 'both models agree';
    return worst === 0 ? `No rain (${how}).` : `${atMost(levels, worst)} (${how}).`;
  }
  if (over === 0) return `The models differ about ${plural(unsure, 'block')}.`;
  return best ? `${rain} in ${of}. Best window ${windowText(best, zone)}.` : `${rain} in ${of}. No window long enough.`;
}

/** Range text for a total: '4–7 mm' or '5 mm'. */
export function rangeText(low, high) {
  return low === high ? `${low} mm` : `${low}–${high} mm`;
}

/** Lines for one rain-totals horizon. `labels` maps a model name to its short label. */
export function totalsLines(t, labels) {
  const lines = [];
  const each = Object.entries(t.common.perModel).map(([m, mm]) => `${labels[m]} ${mm} mm`).join(' · ');
  lines.push({ strong: t.common.blocks ? rangeText(t.common.low, t.common.high) : 'No data', detail: each });
  if (t.extra) lines.push({ strong: '', detail: `The last ${plural(t.extra.blocks, 'block')} are covered by ${labels[t.extra.model]} alone: +${t.extra.mm} mm (not part of the range).` });
  if (!t.complete) lines.push({ strong: '', detail: `The forecast covers only ${t.blocks} of ${t.wanted} blocks of this period.` });
  return lines;
}

/** One line for a saved place: the first block over the activity's limit (or where the models differ), or that it stays within it. */
export function placeSummary(planned, zone, levels, max) {
  const upcoming = planned.filter((b) => b.inHours && !b.past);
  if (!upcoming.length) return 'No forecast left in your hours.';
  const next = upcoming.find((b) => b.fit !== 'ok');
  if (!next) return max === 0 ? `No rain through ${dayLabel(upcoming[upcoming.length - 1].day)}.` : `${atMost(levels, max)} through ${dayLabel(upcoming[upcoming.length - 1].day)}.`;
  const when = `${dayLabel(next.day)} ${blockText(next, zone)}`;
  return next.fit === 'over' ? `${levels[next.level].label} ${when}.` : `${levels[next.level].label} possible ${when} (models differ).`;
}
