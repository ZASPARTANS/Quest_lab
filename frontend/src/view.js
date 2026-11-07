// Everything the page shows for one place and one activity, as plain data (no DOM). The page only draws this (render.js).
import { maxLevelIndex, planBlocks } from './plan.js';
import { findWindows, rainTotals } from './windows.js';
import { dayLabel } from './time.js';
import { dayVerdict, placeSummary } from './wording.js';

/**
 * `blocks` from buildBlocks, `activity` = { max_level, min_blocks, hours }, `o` = { zone, nowMs, quantumMm, intervalHours, models,
 * minRemaining, daysShown, windowsShown, totalsDays, levels, labels }.
 */
export function buildView(blocks, activity, o) {
  const max = maxLevelIndex(activity, o.levels);
  const planned = planBlocks(blocks, activity, { zone: o.zone, nowMs: o.nowMs, minRemaining: o.minRemaining, levels: o.levels }, o.quantumMm);
  const windows = findWindows(planned, activity, o.nowMs);
  const keys = [...new Set(planned.filter((b) => !b.past).map((b) => b.day))].slice(0, o.daysShown);
  const days = keys.map((key) => {
    const own = planned.filter((b) => b.day === key);
    const best = windows.find((w) => w.day === key);
    return { key, label: dayLabel(key), blocks: own, best, verdict: dayVerdict(own, best, o.zone, o.levels, max) };
  });
  return {
    zone: o.zone, planned, days, windows: windows.slice(0, o.windowsShown), windowCount: windows.length,
    totals: rainTotals(blocks, o.nowMs, o.totalsDays, o.quantumMm, o.intervalHours, o.models),
    summary: placeSummary(planned, o.zone, o.levels, max), levels: o.levels, labels: o.labels, max,
  };
}
