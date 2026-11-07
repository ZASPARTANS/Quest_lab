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

/**
 * State of one block for a wet limit: 'dry' (every model dry), 'wet' (every model wet) or 'disagree'.
 * `single` is true when only one model covers the block (beyond the IFS range): then nothing can be compared.
 */
export function blockState(block, limit) {
  const wet = Object.values(block.tenths).map((v) => v >= limit);
  const state = wet.every(Boolean) ? 'wet' : wet.some(Boolean) ? 'disagree' : 'dry';
  return { state, single: wet.length < 2 };
}

/**
 * Blocks classified for one activity, from `ctx` = { zone, nowMs, minRemaining }.
 * Each entry: the block plus { state, single, day, inHours, past, current, usable }.
 *  - day: the local day that holds the block's MIDPOINT (so a block across midnight belongs to the day it mostly lies in)
 *  - inHours: the midpoint lies inside the activity's allowed local hours [from, to)
 *  - current: the block is under way; it is usable only if at least `minRemaining` of it is left
 */
export function planBlocks(blocks, activity, ctx, quantumMm) {
  const limit = wetLimit(activity.wet_mm, quantumMm);
  const [from, to] = activity.hours;
  return blocks.map((block) => {
    const middle = (block.startMs + block.endMs) / 2;
    const hour = hourOfDay(middle, ctx.zone);
    const past = block.endMs <= ctx.nowMs;
    const current = !past && block.startMs < ctx.nowMs;
    const remaining = current ? (block.endMs - ctx.nowMs) / (block.endMs - block.startMs) : 1;
    const inHours = hour >= from && hour < to;
    const { state, single } = blockState(block, limit);
    const usable = inHours && !past && state !== 'wet' && remaining >= ctx.minRemaining;
    return { ...block, state, single, day: dayKey(middle, ctx.zone), inHours, past, current, remaining, usable };
  });
}
