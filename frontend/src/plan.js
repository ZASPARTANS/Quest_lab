// Plan engine, part 1: from the stored rain series of one place to classified 6-hour blocks (decision D28). Pure functions, no DOM,
// no network. Values are the stored integers (multiples of the storage step, 0.1 mm); a block's time is the END of the block (UTC).
import { dayKey, hourOfDay } from './time.js';

export const HOUR_MS = 3600 * 1000;

/** Smallest stored value that counts as wet: stored * quantum >= threshold_mm. Same rule as pipeline/process.py `wet_limit`. */
export function wetLimit(thresholdMm, quantumMm) {
  return Math.ceil(thresholdMm / quantumMm - 1e-9);
}

/**
 * Blocks of one place, oldest first, from the manifest and the per-model series (Uint16Array of all layers of the tile cell).
 * Result: [{ startMs, endMs, tenths: { model: stored value } }]. A model that has no value for a block is simply absent.
 */
export function buildBlocks(manifest, series) {
  const length = manifest.interval_hours * HOUR_MS;
  const byEnd = new Map();
  for (const [model, info] of Object.entries(manifest.models)) {
    info.valid_times.forEach((time, i) => {
      const endMs = Date.parse(time);
      if (!Number.isFinite(endMs)) throw new Error(`bad valid time for ${model}`);
      const block = byEnd.get(endMs) ?? { startMs: endMs - length, endMs, tenths: {} };
      block.tenths[model] = series[model][i];
      byEnd.set(endMs, block);
    });
  }
  return [...byEnd.values()].sort((a, b) => a.endMs - b.endMs);
}

/** Stored-value lower bound of every rain level (config `levels`, lowest first; the first is 0): same ceiling rule as `wetLimit` (D28, D41). */
export function levelLimits(levels, quantumMm) {
  return levels.map((level, i) => (i === 0 ? 0 : wetLimit(level.from_mm, quantumMm)));
}

/** Index of the rain level of a stored value: the highest level whose lower bound it reaches. */
export function levelOf(stored, limits) {
  let level = 0;
  for (let i = 1; i < limits.length; i += 1) if (stored >= limits[i]) level = i;
  return level;
}

/** Index of the most rain an activity accepts (`activity.max_level`); it must be a level that has a level above it. */
export function maxLevelIndex(activity, levels) {
  const i = levels.findIndex((level) => level.id === activity.max_level);
  if (i < 0 || i >= levels.length - 1) throw new Error(`activity ${activity.id}: max_level ${activity.max_level} is not a level with a higher one`);
  return i;
}

/**
 * How one block fits an activity whose limit is `limit` (stored value of the first level it does NOT accept): 'ok' (every model is within it),
 * 'over' (every model is over it) or 'maybe' (the models differ). Same logic as the old dry / wet / disagree (D28).
 * `single` is true when only one model covers the block (beyond the IFS range): then nothing can be compared.
 */
export function blockFit(block, limit) {
  const over = Object.values(block.tenths).map((v) => v >= limit);
  const fit = over.every(Boolean) ? 'over' : over.some(Boolean) ? 'maybe' : 'ok';
  return { fit, single: over.length < 2 };
}

/**
 * Blocks classified for one activity, from `ctx` = { zone, nowMs, minRemaining, levels } (`levels` = config levels).
 * Each entry: the block plus { level, levels, differ, fit, single, day, inHours, past, current, usable }.
 *  - level: index of the rain level of the WETTER model (what the page shows); levels: the level index of each model; differ: the models are in different levels
 *  - fit: 'ok' | 'maybe' | 'over' for this activity (see blockFit)
 *  - day: the local day that holds the block's MIDPOINT (so a block across midnight belongs to the day it mostly lies in)
 *  - inHours: the midpoint lies inside the activity's allowed local hours [from, to)
 *  - current: the block is under way; it is usable only if at least `minRemaining` of it is left
 */
export function planBlocks(blocks, activity, ctx, quantumMm) {
  const limits = levelLimits(ctx.levels, quantumMm);
  const limit = limits[maxLevelIndex(activity, ctx.levels) + 1];
  const [from, to] = activity.hours;
  return blocks.map((block) => {
    const middle = (block.startMs + block.endMs) / 2;
    const hour = hourOfDay(middle, ctx.zone);
    const past = block.endMs <= ctx.nowMs;
    const current = !past && block.startMs < ctx.nowMs;
    const remaining = current ? (block.endMs - ctx.nowMs) / (block.endMs - block.startMs) : 1;
    const inHours = hour >= from && hour < to;
    const levels = Object.fromEntries(Object.entries(block.tenths).map(([model, value]) => [model, levelOf(value, limits)]));
    const found = Object.values(levels);
    const { fit, single } = blockFit(block, limit);
    const usable = inHours && !past && fit !== 'over' && remaining >= ctx.minRemaining;
    return { ...block, level: Math.max(...found), levels, differ: new Set(found).size > 1, fit, single, day: dayKey(middle, ctx.zone), inHours, past, current, remaining, usable };
  });
}
