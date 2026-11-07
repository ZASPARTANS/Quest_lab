// Tests for frontend/src/plan.js and windows.js: wet rule, blocks, windows, current block, totals.
// TEST FIXTURES ONLY: invented rain values (in stored 0.1 mm steps) for a pretend run at 2026-11-06 00:00 UTC.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildBlocks, blockState, HOUR_MS, planBlocks, wetLimit } from '../../frontend/src/plan.js';
import { buildView } from '../../frontend/src/view.js';
import { findWindows, rainTotals } from '../../frontend/src/windows.js';

const RUN = Date.parse('2026-11-06T00:00:00Z');
const iso = (ms) => new Date(ms).toISOString().replace('.000Z', 'Z');
const MODELS = ['ifs', 'aifs-single'];
const WET = 50;

/** Manifest + series for a run at RUN: block k ends at RUN + 6 h * (k + 1). */
function make(ifs, aifs) {
  const times = (n) => Array.from({ length: n }, (_, k) => iso(RUN + 6 * HOUR_MS * (k + 1)));
  const manifest = { interval_hours: 6, models: {
    ifs: { layer_offset: 0, layers: ifs.length, valid_times: times(ifs.length) },
    'aifs-single': { layer_offset: ifs.length, layers: aifs.length, valid_times: times(aifs.length) } } };
  const all = Uint16Array.from([...ifs, ...aifs]);
  const series = { ifs: all.subarray(0, ifs.length), 'aifs-single': all.subarray(ifs.length) };
  return { manifest, blocks: buildBlocks(manifest, series) };
}
const activity = (over = {}) => ({ wet_mm: 0.5, min_blocks: 1, hours: [0, 24], ...over });
const ctx = (over = {}) => ({ zone: 'UTC', nowMs: RUN, minRemaining: 0.5, ...over });

test('the wet rule: a stored value at or above the threshold is wet (0.5 mm = 5 steps), one step below is dry', () => {
  assert.equal(wetLimit(0.5, 0.1), 5);
  assert.equal(wetLimit(0.3, 0.1), 3);
  assert.equal(wetLimit(0.55, 0.1), 6);
  const state = (a, b) => blockState({ tenths: { ifs: a, 'aifs-single': b } }, 5).state;
  assert.equal(state(5, 5), 'wet');
  assert.equal(state(4, 4), 'dry');
  assert.equal(state(5, 4), 'disagree');
  assert.equal(blockState({ tenths: { 'aifs-single': 9 } }, 5).single, true);
  assert.equal(blockState({ tenths: { ifs: 9, 'aifs-single': 9 } }, 5).single, false);
});

test('blocks are joined by their END time, sorted, and a block beyond the IFS range has one model only', () => {
  const { blocks } = make([1, 2, 3, 4], [10, 20, 30, 40, 50, 60]);
  assert.equal(blocks.length, 6);
  assert.deepEqual(blocks[0].tenths, { ifs: 1, 'aifs-single': 10 });
  assert.deepEqual(blocks[5].tenths, { 'aifs-single': 60 });
  assert.equal(blocks[0].endMs - blocks[0].startMs, 6 * HOUR_MS);
  assert.ok(blocks.every((b, i) => i === 0 || b.startMs === blocks[i - 1].endMs));
  assert.throws(() => buildBlocks({ interval_hours: 6, models: { x: { valid_times: ['not a time'] } } }, { x: [1] }), /bad valid time/);
});

test('India: the block that crosses local midnight belongs to the day that holds its midpoint, and hours use the midpoint', () => {
  const { blocks } = make([0, 0, 0, 0], [0, 0, 0, 0]);
  const planned = planBlocks(blocks, activity({ hours: [8, 22] }), ctx({ zone: 'Asia/Kolkata' }), 0.1);
  // blocks end 06:00Z, 12:00Z, 18:00Z, 00:00Z = 11:30, 17:30, 23:30, 05:30 IST; they start 05:30, 11:30, 17:30, 23:30
  assert.deepEqual(planned.map((b) => b.day), ['2026-11-06', '2026-11-06', '2026-11-06', '2026-11-07']); // 23:30-05:30 -> mostly the 7th
  assert.deepEqual(planned.map((b) => b.inHours), [true, true, true, false]); // midpoints 08:30, 14:30, 20:30 and 02:30
});

test('windows: wet blocks split runs; sure beats uncertain even when shorter; then longer, then sooner', () => {
  // dry dry WET dry dry dry WET dry (IFS 8 blocks); AIFS agrees except block 4 where it is wet (disagree)
  const ifs = [0, 0, WET, 0, 0, 0, WET, 0];
  const aifs = [0, 0, WET, 0, WET, 0, WET, 0];
  const { blocks } = make(ifs, aifs);
  const planned = planBlocks(blocks, activity(), ctx(), 0.1);
  const windows = findWindows(planned, activity(), RUN);
  // runs: blocks 0-1 (sure, 2), 3-5 (uncertain, 3 long), 7 (sure, 1)
  assert.deepEqual(windows.map((w) => [w.blocks, w.confidence]), [[2, 'sure'], [1, 'sure'], [3, 'uncertain']]);
  assert.equal(windows[0].startMs, RUN);
  assert.equal(windows[0].endMs, RUN + 12 * HOUR_MS);
});

test('equal confidence and length: the sooner window comes first; min_blocks drops short windows', () => {
  const { blocks } = make([0, WET, 0, WET, 0], [0, WET, 0, WET, 0]);
  const planned = planBlocks(blocks, activity(), ctx(), 0.1);
  const windows = findWindows(planned, activity(), RUN);
  assert.deepEqual(windows.map((w) => w.startMs), [RUN, RUN + 12 * HOUR_MS, RUN + 24 * HOUR_MS]);
  assert.equal(findWindows(planned, activity({ min_blocks: 2 }), RUN).length, 0);
});

test('a window that reaches beyond the IFS range is marked "one model" and ranks last', () => {
  const { blocks } = make([0, 0], [0, 0, 0, 0, 0]);
  const planned = planBlocks(blocks, activity(), ctx(), 0.1);
  const w = findWindows(planned, activity(), RUN);
  assert.equal(w.length, 1);
  assert.equal(w[0].confidence, 'one-model');
  // a wet block between: the part with both models stays "sure" and ranks above the one-model part
  const split = make([0, 0, WET], [0, 0, WET, 0, 0, 0]);
  const windows = findWindows(planBlocks(split.blocks, activity(), ctx(), 0.1), activity(), RUN);
  assert.deepEqual(windows.map((x) => [x.blocks, x.confidence]), [[2, 'sure'], [3, 'one-model']]);
});

test('past blocks are dropped and the block under way counts only if enough of it is left', () => {
  const { blocks } = make([0, 0, 0, 0], [0, 0, 0, 0]);
  // now = 3 h into block 1 (06:00-12:00 UTC): exactly half left -> usable
  const half = planBlocks(blocks, activity(), ctx({ nowMs: RUN + 9 * HOUR_MS }), 0.1);
  assert.deepEqual(half.map((b) => [b.past, b.current, b.usable]), [[true, false, false], [false, true, true], [false, false, true], [false, false, true]]);
  const w = findWindows(half, activity(), RUN + 9 * HOUR_MS);
  assert.equal(w[0].startsNow, true);
  assert.equal(w[0].startMs, RUN + 9 * HOUR_MS);
  assert.equal(w[0].blocks, 3);
  // one second later less than half is left -> not usable, the window starts with the next block
  const less = planBlocks(blocks, activity(), ctx({ nowMs: RUN + 9 * HOUR_MS + 1000 }), 0.1);
  assert.equal(less[1].usable, false);
  const w2 = findWindows(less, activity(), RUN + 9 * HOUR_MS + 1000);
  assert.equal(w2[0].startsNow, false);
  assert.equal(w2[0].startMs, RUN + 12 * HOUR_MS);
});

test('the edge: 0.5 mm per 6 h counts as wet for a 0.5 mm activity but not for a 0.6 mm one', () => {
  const { blocks } = make([5, 5], [5, 5]);
  assert.equal(planBlocks(blocks, activity({ wet_mm: 0.5 }), ctx(), 0.1)[0].state, 'wet');
  assert.equal(planBlocks(blocks, activity({ wet_mm: 0.6 }), ctx(), 0.1)[0].state, 'dry');
});

test('rain totals: whole blocks from the one under way; range and each model; the single-model blocks stay apart', () => {
  // 10 blocks: IFS has 6, AIFS has 10. Values in 0.1 mm.
  const ifs = [10, 10, 10, 10, 10, 10];
  const aifs = [20, 20, 20, 20, 20, 20, 30, 30, 30, 30];
  const { blocks } = make(ifs, aifs);
  const [one, two, tooMany] = rainTotals(blocks, RUN, [1, 2, 3], 0.1, 6, MODELS);
  assert.deepEqual(one.common.perModel, { ifs: 4, 'aifs-single': 8 }); // 4 blocks of 1.0 and of 2.0 mm
  assert.equal(one.common.low, 4);
  assert.equal(one.common.high, 8);
  assert.equal(one.extra, null);
  assert.equal(two.common.blocks, 6);
  assert.deepEqual(two.extra, { model: 'aifs-single', blocks: 2, mm: 6 }); // blocks 7-8: 2 x 3.0 mm, AIFS alone
  assert.equal(two.complete, true);
  assert.equal(tooMany.blocks, 10);
  assert.equal(tooMany.complete, false); // 3 days want 12 blocks, only 10 exist
  assert.equal(tooMany.wanted, 12);
});

test('rain totals start at the block under way, skip the blocks that are over, and show that the current block is included', () => {
  const { blocks } = make([10, 20, 30, 40], [10, 20, 30, 40]);
  const [t] = rainTotals(blocks, RUN + 7 * HOUR_MS, [1], 0.1, 6, MODELS); // 1 h into block 1: blocks 1..3 remain
  assert.equal(t.blocks, 3);
  assert.equal(t.includesCurrent, true);
  assert.deepEqual(t.common.perModel, { ifs: 9, 'aifs-single': 9 }); // 2.0 + 3.0 + 4.0
  const [exact] = rainTotals(blocks, RUN + 6 * HOUR_MS, [1], 0.1, 6, MODELS); // block 0 ended exactly now
  assert.equal(exact.blocks, 3);
  assert.equal(exact.includesCurrent, false);
});

test('rain totals have no floating-point dust (three steps of 0.1 mm are 0.3 mm)', () => {
  const { blocks } = make([1, 1, 1], [1, 1, 1]);
  const [t] = rainTotals(blocks, RUN, [1], 0.1, 6, MODELS);
  assert.equal(t.common.perModel.ifs, 0.3);
});

test('the view: day cards start with the first day that is not over, keep the past blocks of that day, and are limited', () => {
  const { blocks } = make(Array(16).fill(0), Array(16).fill(0)); // 4 days of blocks from 2026-11-06 00:00 UTC
  const nowMs = RUN + 30 * HOUR_MS; // 2026-11-07 06:00 UTC: blocks ending at or before it are over
  const options = { zone: 'UTC', nowMs, quantumMm: 0.1, intervalHours: 6, models: MODELS, minRemaining: 0.5, daysShown: 2, windowsShown: 1, totalsDays: [1] };
  const view = buildView(blocks, activity({ hours: [0, 24] }), options);
  assert.deepEqual(view.days.map((d) => d.key), ['2026-11-07', '2026-11-08']);
  assert.deepEqual(view.days[0].blocks.map((b) => b.past), [true, false, false, false]); // 03:00 block is over, the rest of the 7th is not
  assert.equal(view.windows.length, 1);
  assert.ok(view.windowCount >= 1);
  assert.match(view.days[0].verdict, /^Dry/);
  assert.equal(view.totals[0].blocks, 4);
});
