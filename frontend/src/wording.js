// Plain-language text for the plan (decisions D3, D9: never a probability, no technical terms). Pure functions; times are local to the place.
import { clock, dayKey, dayLabel } from './time.js';

export const STATE_WORD = { dry: 'Dry', wet: 'Wet', disagree: 'Models disagree' };

export const CONFIDENCE_WORD = {
  sure: 'Both models say dry.',
  uncertain: 'The models disagree about part of it.',
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

/** One line for a day card. `blocks` = the day's planned entries, `best` = the best window that starts that day (or undefined). */
export function dayVerdict(blocks, best, zone) {
  const counted = blocks.filter((b) => b.inHours && !b.past);
  if (!counted.length) return blocks.every((b) => b.past) ? 'Over.' : 'Outside the hours for this activity.';
  const wet = counted.filter((b) => b.state === 'wet').length;
  const unsure = counted.filter((b) => b.state === 'disagree').length;
  const of = `${wet} of ${plural(counted.length, 'block')}`;
  if (wet === counted.length) return 'Wet all day.';
  if (wet === 0 && unsure === 0) return counted.some((b) => b.single) ? 'Dry (one model only).' : 'Dry. Both models agree.';
  if (wet === 0) return `No block is wet in both models; they disagree about ${plural(unsure, 'block')}.`;
  return best ? `Rain in ${of}. Best window ${windowText(best, zone)}.` : `Rain in ${of}. No dry window long enough.`;
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

/** One line for a saved place: the first block that is not dry in both models, or that it stays dry. */
export function placeSummary(planned, zone) {
  const upcoming = planned.filter((b) => b.inHours && !b.past);
  if (!upcoming.length) return 'No forecast left in your hours.';
  const next = upcoming.find((b) => b.state !== 'dry');
  if (!next) return `Dry through ${dayLabel(upcoming[upcoming.length - 1].day)}.`;
  const when = `${dayLabel(next.day)} ${blockText(next, zone)}`;
  return next.state === 'wet' ? `Rain ${when}.` : `Rain possible ${when} (models disagree).`;
}
