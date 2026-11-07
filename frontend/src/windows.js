// Plan engine, part 2: dry windows and rain totals (decision D28). Pure functions.
const RANK = { sure: 0, uncertain: 1, 'one-model': 2 };

function confidenceOf(run) {
  if (run.some((b) => b.single)) return 'one-model'; // part of it is covered by one model only: nothing to compare
  if (run.some((b) => b.state === 'disagree')) return 'uncertain';
  return 'sure';
}

/**
 * All dry windows of a planned block list, best first. A window is a run of consecutive usable blocks (not wet, in hours, not over)
 * that is at least `activity.min_blocks` long. Order: confidence (sure, uncertain, one model), then longer, then sooner.
 * A window that starts in the block under way starts "now" (`startsNow`, and startMs becomes nowMs).
 */
export function findWindows(planned, activity, nowMs) {
  const runs = [];
  let run = [];
  for (const block of planned) {
    const touches = run.length > 0 && run[run.length - 1].endMs === block.startMs;
    if (block.usable && (run.length === 0 || touches)) {
      run.push(block);
      continue;
    }
    if (run.length) runs.push(run);
    run = block.usable ? [block] : [];
  }
  if (run.length) runs.push(run);
  return runs
    .filter((r) => r.length >= activity.min_blocks)
    .map((r) => ({ startMs: r[0].current ? nowMs : r[0].startMs, endMs: r[r.length - 1].endMs, startsNow: r[0].current,
      blocks: r.length, confidence: confidenceOf(r), day: r[0].day }))
    .sort((a, b) => RANK[a.confidence] - RANK[b.confidence] || b.blocks - a.blocks || a.startMs - b.startMs);
}

/**
 * Rain totals for each horizon (in days) as a range between the models.
 * The horizon is `days * 24 / interval` whole blocks, starting with the block under way (no pro-rating).
 * common: blocks both models cover: each model's own sum and the range (low..high).
 * extra: blocks only one model covers (after the IFS range): kept apart, never mixed into the range.
 */
export function rainTotals(blocks, nowMs, horizonsDays, quantumMm, intervalHours, models) {
  const upcoming = blocks.filter((b) => b.endMs > nowMs);
  return horizonsDays.map((days) => {
    const wanted = (days * 24) / intervalHours;
    const slice = upcoming.slice(0, wanted);
    const common = slice.filter((b) => models.every((m) => m in b.tenths));
    const rest = slice.filter((b) => !models.every((m) => m in b.tenths));
    const perModel = Object.fromEntries(models.map((m) => [m, toMm(common.reduce((s, b) => s + b.tenths[m], 0), quantumMm)]));
    const sums = Object.values(perModel);
    const extraModel = rest.length ? models.find((m) => m in rest[0].tenths) : null;
    return {
      days, blocks: slice.length, wanted, complete: slice.length === wanted, includesCurrent: slice.length > 0 && slice[0].startMs < nowMs,
      common: { blocks: common.length, perModel, low: Math.min(...sums), high: Math.max(...sums) },
      extra: rest.length ? { model: extraModel, blocks: rest.length, mm: toMm(rest.reduce((s, b) => s + (b.tenths[extraModel] ?? 0), 0), quantumMm) } : null,
    };
  });
}

/** Sum of stored integers -> millimetres, without floating-point dust (0.1 * 3 = 0.30000000000000004). */
function toMm(storedSum, quantumMm) {
  return Number((storedSum * quantumMm).toFixed(6));
}
