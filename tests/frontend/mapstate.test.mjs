// Tests for frontend/src/mapstate.js and the frame checks of manifest.js. TEST FIXTURES ONLY: an invented small manifest.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { manifestProblems } from '../../frontend/src/manifest.js';
import { allSteps, chooseFrame, effectiveView, firstUpcomingStep, flightPlan, frameStep, frameUrl, mapPointName, modelOptions, prefersReducedMotion, projectionSpec,
  shouldFly, webgl2Available } from '../../frontend/src/mapstate.js';

const FRONTEND = JSON.parse(readFileSync(new URL('../../config/frontend.json', import.meta.url), 'utf8'));
const LABELS = FRONTEND.model_labels;
const RUN = '2026-11-06T12:00:00Z';
const HOUR = 3600e3;

/** IFS 4 blocks (6..24 h), AIFS 6 blocks (6..36 h), agreement over the first 4. */
function manifest() {
  const times = (n) => Array.from({ length: n }, (_, k) => new Date(Date.parse(RUN) + 6 * HOUR * (k + 1)).toISOString().replace('.000Z', 'Z'));
  const steps = (n) => Array.from({ length: n }, (_, k) => 6 * (k + 1));
  const files = (kind, n) => Object.fromEntries(steps(n).map((s) => [String(s), `frames/${kind}_${s}.png`]));
  return { format_version: 1, interval_hours: 6, quantum_mm: 0.1, run: RUN, retrieved_at: '2026-11-06T19:40:00Z', exported_at: '2026-11-07T00:10:00Z',
    grid: { ni: 1440, nj: 721, step_degrees: 0.25, lat_first: 90, lon_first: 180 }, tiles: { size: 16, rows: 46, cols: 90, layers: 10, path: 'tiles/{row}_{col}.bin.gz' },
    models: { ifs: { layer_offset: 0, layers: 4, steps: steps(4), valid_times: times(4) }, 'aifs-single': { layer_offset: 4, layers: 6, steps: steps(6), valid_times: times(6) } },
    agreement: { models: ['ifs', 'aifs-single'], steps: steps(4) },
    frames: { size: 720, max_latitude: 85.05, projection: 'web-mercator', agreement_colours: { both_wet: '#2a6fd6', disagree: '#f28a17' },
      files: { ifs: files('ifs', 4), 'aifs-single': files('aifs-single', 6), agreement: files('agreement', 4) } } };
}

test('the manifest check accepts good frames and refuses unsafe paths, wrong steps and bad colours', () => {
  assert.deepEqual(manifestProblems(manifest()), []);
  const damage = [
    [(m) => { m.frames.files.ifs['6'] = '../../etc/passwd.png'; }, 'unsafe frame path'], [(m) => { m.frames.files.ifs['6'] = '/abs/path.png'; }, 'unsafe frame path'],
    [(m) => { m.frames.files.ifs['6'] = 'frames/x.png?evil=1'; }, 'unsafe frame path'], [(m) => { m.frames.files.ifs['6'] = 'javascript:alert(1).png'; }, 'unsafe frame path'],
    [(m) => { delete m.frames.files.ifs['12']; }, 'frames for ifs do not match its steps'], [(m) => { m.frames.files.nope = { 6: 'frames/n.png' }; }, 'frames for nope'],
    [(m) => { m.frames.agreement_colours.both_wet = 'red'; }, 'agreement_colours'], [(m) => { delete m.frames.agreement_colours; }, 'agreement_colours'],
    [(m) => { m.frames.size = 'big'; }, 'frames size'], [(m) => { delete m.frames; }, 'missing frames'],
  ];
  for (const [change, text] of damage) {
    const m = manifest();
    change(m);
    assert.match(manifestProblems(m).join(' | '), new RegExp(text), text);
  }
  const off = manifest();
  off.frames = null; // frames switched off in the export: the plan still works, the map has nothing to draw
  assert.deepEqual(manifestProblems(off), []);
});

test('a block gives its forecast step; a time off the hour axis gives null', () => {
  const m = manifest();
  assert.equal(frameStep(m, { endMs: Date.parse(RUN) + 18 * HOUR }), 18);
  assert.equal(frameStep(m, { endMs: Date.parse(RUN) + 18.5 * HOUR }), null);
  assert.deepEqual(allSteps(m), [6, 12, 18, 24, 30, 36]);
});

test('the first upcoming step is the block under way; after the last block it stays on the last', () => {
  const m = manifest();
  const run = Date.parse(RUN);
  assert.equal(firstUpcomingStep(m, run - HOUR), 6);
  assert.equal(firstUpcomingStep(m, run + 6 * HOUR), 12); // the 6 h block ended exactly now: it is over
  assert.equal(firstUpcomingStep(m, run + 6 * HOUR - 1), 6);
  assert.equal(firstUpcomingStep(m, run + 100 * HOUR), 36);
});

test('which frame is drawn: a model, both models (agreement), and the steps only AIFS reaches', () => {
  const m = manifest();
  assert.deepEqual(chooseFrame(m, 'ifs', 12, LABELS), { kind: 'ifs', note: null });
  assert.deepEqual(chooseFrame(m, 'both', 12, LABELS), { kind: 'agreement', note: null });
  assert.deepEqual(chooseFrame(m, 'aifs-single', 36, LABELS), { kind: 'aifs-single', note: null });
  const late = chooseFrame(m, 'both', 30, LABELS); // beyond the agreement: AIFS alone, and it says so
  assert.equal(late.kind, 'aifs-single');
  assert.match(late.note, /Only AIFS reaches this far/);
  const none = chooseFrame(m, 'ifs', 30, LABELS);
  assert.equal(none.kind, null);
  assert.match(none.note, /IFS does not reach this far/);
  assert.equal(chooseFrame(m, 'both', 99, LABELS).kind, null);
  assert.equal(chooseFrame({ ...m, frames: null }, 'ifs', 6, LABELS).kind, null);
});

test('model choices follow the frames the export made', () => {
  const m = manifest();
  assert.deepEqual(modelOptions(m, LABELS).map((o) => o.id), ['ifs', 'aifs-single', 'both']);
  delete m.frames.files.agreement;
  assert.deepEqual(modelOptions(m, LABELS).map((o) => o.id), ['ifs', 'aifs-single']);
  assert.deepEqual(modelOptions({ ...m, frames: null }, LABELS), []);
});

test('frame URLs come only from the manifest and carry the export time as a version', () => {
  const m = manifest();
  assert.equal(frameUrl('/data/', m, 'ifs', 12), '/data/frames/ifs_12.png?v=2026-11-07T00%3A10%3A00Z');
  assert.equal(frameUrl('/data/', m, 'ifs', 13), null);
  assert.equal(frameUrl('/data/', m, 'nope', 12), null);
  assert.equal(frameUrl('/data/', { ...m, frames: null }, 'ifs', 12), null);
});

test('a place chosen outside the map flies there; a click on the map does not; reduced motion jumps', () => {
  for (const s of ['location', 'search', 'saved', 'address']) assert.equal(shouldFly(s), true, s);
  for (const s of ['map', 'other', undefined]) assert.equal(shouldFly(s), false, String(s));
  const cfg = FRONTEND.map;
  assert.deepEqual(flightPlan(false, cfg), { zoom: cfg.fly.zoom, duration: cfg.fly.duration_ms, animate: true });
  assert.deepEqual(flightPlan(true, cfg), { zoom: cfg.fly.zoom, duration: 0, animate: false });
  assert.equal(prefersReducedMotion(() => ({ matches: true })), true);
  assert.equal(prefersReducedMotion(() => ({ matches: false })), false);
  assert.equal(prefersReducedMotion(() => { throw new Error('no matchMedia'); }), false);
});

test('the projection: the automatic mode morphs from a globe to a flat map by zoom; the buttons fix it', () => {
  const cfg = FRONTEND.map;
  assert.deepEqual(projectionSpec('globe', cfg), { type: 'globe' });
  assert.deepEqual(projectionSpec('flat', cfg), { type: 'mercator' });
  const auto = projectionSpec('auto', cfg).type;
  assert.deepEqual(auto, ['interpolate', ['linear'], ['zoom'], cfg.fly.morph_from_zoom, 'vertical-perspective', cfg.fly.zoom, 'mercator']);
  assert.ok(cfg.fly.morph_from_zoom < cfg.fly.zoom && cfg.min_zoom < cfg.start.zoom && cfg.start.zoom < cfg.fly.morph_from_zoom && cfg.fly.zoom <= cfg.max_zoom);
  assert.ok(['ifs', 'aifs-single', 'both'].includes(cfg.start_model));
  assert.ok(['linear', 'nearest'].includes(cfg.resampling)); // the smooth look of the pictures depends on this (D34)
});

test('WebGL2 detection and the name of a map point', () => {
  assert.equal(webgl2Available(() => ({ getContext: (kind) => (kind === 'webgl2' ? {} : null) })), true);
  assert.equal(webgl2Available(() => ({ getContext: () => null })), false);
  assert.equal(webgl2Available(() => { throw new Error('no canvas'); }), false);
  assert.equal(mapPointName(13.0827, 80.2707), 'Map point (13.08, 80.27)');
  assert.equal(mapPointName(-33.8688, -0.5), 'Map point (-33.87, -0.50)');
});

test('the effective view follows the mode and, in the automatic mode, the zoom', () => {
  const cfg = FRONTEND.map;
  assert.equal(effectiveView('auto', cfg.start.zoom, cfg), 'globe');
  assert.equal(effectiveView('auto', cfg.fly.morph_from_zoom, cfg), 'globe');
  assert.equal(effectiveView('auto', (cfg.fly.morph_from_zoom + cfg.fly.zoom) / 2, cfg), 'morph');
  assert.equal(effectiveView('auto', cfg.fly.zoom, cfg), 'flat');
  assert.equal(effectiveView('flat', 1, cfg), 'flat');
  assert.equal(effectiveView('globe', 6, cfg), 'globe');
});
