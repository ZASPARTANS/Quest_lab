// Tests for frontend/src/live.js (the browser-side drawing). The view maths and the interpolation are compared with independent Python numbers
// (tests/frontend/fixtures/python_reference.json, made by scripts/make_js_fixtures.py). All field values here are invented test values.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { agreementPicture, buildWindow, catmullRom, rainColours, rainPicture, sampleView, viewCols, viewRows } from '../../frontend/src/live.js';

const REF = JSON.parse(readFileSync(new URL('./fixtures/python_reference.json', import.meta.url), 'utf8')).live;
const FRONTEND = JSON.parse(readFileSync(new URL('../../config/frontend.json', import.meta.url), 'utf8'));
const GRID = REF.grid;
const stored = (r, c) => (r * 7 + c * 13) % 50 + ((r * c) % 5) * 3; // the same pattern as the Python fixture (rows are clamped and columns wrapped by buildWindow)
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

/** One value at a fractional position: a 1 x 1 picture. */
function at(rowf, colf, valueAt = stored, grid = GRID) {
  const rows = Float64Array.of(rowf);
  const cols = Float64Array.of(colf);
  return sampleView(buildWindow(grid, rows, cols, valueAt), rows, cols)[0];
}

test('the rows and columns of a view equal the independent Python numbers (Mercator rows, columns unwrapped across the date line)', () => {
  assert.equal(REF.views.length, 3);
  for (const v of REF.views) {
    const rows = viewRows(GRID, v, v.height);
    const cols = viewCols(GRID, v, v.width);
    v.rowf.forEach((x, i) => assert.ok(near(rows[i], x), `row ${i} of ${JSON.stringify(v)}: ${rows[i]} vs ${x}`));
    v.colf.forEach((x, j) => assert.ok(near(cols[j], x), `column ${j} of ${JSON.stringify(v)}: ${cols[j]} vs ${x}`));
    assert.ok(rows.every((x, i) => i === 0 || x > rows[i - 1]), 'north is at the top: the row number grows downwards');
    assert.ok(cols.every((x, j) => j === 0 || x > cols[j - 1]), 'columns grow eastwards without wrapping');
  }
});

test('Catmull-Rom weights: they sum to one and sit on the cell at the ends', () => {
  for (const t of [0, 0.1, 0.5, 0.77, 0.999]) assert.ok(near(catmullRom(t).reduce((a, b) => a + b), 1));
  assert.deepEqual(catmullRom(0), [0, 1, 0, 0]);
  assert.ok(near(catmullRom(1)[2], 1) && near(catmullRom(1)[1], 0));
});

test('the smooth field equals Python at ten places, including the edge rows and the wrap of the columns', () => {
  assert.equal(REF.samples.length, 10);
  for (const s of REF.samples) assert.ok(near(at(s.rowf, s.colf), s.value, 1e-6), `${s.rowf},${s.colf}: ${at(s.rowf, s.colf)} vs ${s.value}`);
});

test('at a cell centre the picture equals the stored value exactly', () => {
  for (const [r, c] of [[0, 0], [3, 4], [6, 11], [2, 7], [5, 0]]) assert.equal(at(r, c), stored(r, c), `cell ${r},${c}`);
});

test('a linear ramp is reproduced between cells, and the field never leaves the range of the four cells around it', () => {
  const ramp = (r, c) => 3 * r + 2 * c;
  for (const [rowf, colf] of [[2.3, 3.7], [3.5, 5.5], [1.1, 8.9]]) assert.ok(near(at(rowf, colf, ramp), 3 * rowf + 2 * colf, 1e-6));
  let seed = 12345;
  const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const field = Array.from({ length: GRID.nj }, () => Array.from({ length: GRID.ni }, () => (random() < 0.5 ? 0 : 40 * random()))); // sharp contrasts: dry cells beside wet ones
  const valueAt = (r, c) => field[r][c];
  for (let n = 0; n < 300; n += 1) {
    const rowf = random() * (GRID.nj - 1);
    const colf = random() * 20 - 4; // beyond the columns on both sides: wraps
    const r = Math.floor(rowf);
    const c = Math.floor(colf);
    const around = [0, 1].flatMap((a) => [0, 1].map((b) => field[Math.min(r + a, GRID.nj - 1)][(((c + b) % GRID.ni) + GRID.ni) % GRID.ni]));
    const v = at(rowf, colf, valueAt);
    assert.ok(v >= Math.min(...around) - 1e-6 && v <= Math.max(...around) + 1e-6, `overshoot at ${rowf},${colf}`);
    assert.ok(v >= 0);
  }
});

test('across the date line the field is continuous (column 11 and column 0 are neighbours)', () => {
  const values = [11.0, 11.2, 11.4, 11.6, 11.8, 12.0].map((c) => at(3, c));        // from cell 11 to column 12, which is cell 0 again
  const around = [stored(3, 11), stored(3, 0), stored(4, 11), stored(4, 0)];   // the four cells around the points (the guarantee is the 2 x 2 range, not just the two cells)
  assert.ok(values.every((v) => v >= Math.min(...around) - 1e-9 && v <= Math.max(...around) + 1e-9));
  assert.ok(near(values[0], stored(3, 11)) && near(values[5], stored(3, 0)));
  assert.ok(near(at(3, 12), at(3, 0)) && near(at(3, 13), at(3, 1)) && near(at(3, -1), at(3, 11))); // the columns repeat around the globe
});

test('a whole picture is made from a window, and its size does not depend on the number of cells', () => {
  const view = { west: -10, east: 10, south: 40, north: 60 };
  const rows = viewRows(GRID, view, 350);
  const cols = viewCols(GRID, view, 500);
  const window = buildWindow(GRID, rows, cols, stored);
  const field = sampleView(window, rows, cols);
  assert.equal(field.length, 500 * 350);
  assert.ok(field.every((v) => Number.isFinite(v) && v >= 0));
  assert.ok(window.rows < 12 && window.cols < 12); // a window holds only the cells that are on screen, not the world
});

const SCALE = { stops: [[0.1, '#000010'], [1.0, '#00ff00'], [10.0, '#ff0000']], opacity: 0.5 };

test('rain colours: nothing at or below the fade level, a soft edge up to the first stop, then a continuous gradient', () => {
  const colours = rainColours(SCALE, 512, 0.05);
  const px = (mm) => { const out = new Uint8ClampedArray(4); colours.colourAt(mm, out, 0); return [...out]; };
  assert.equal(px(0)[3], 0);
  assert.equal(px(0.05)[3], 0);
  assert.equal(px(0.075)[3], Math.round(128 * 0.5));
  assert.deepEqual(px(0.1), [0, 0, 16, 128]);                                           // the first stop: its colour at full opacity
  assert.ok(px(1.0).every((v, i) => Math.abs(v - [0, 255, 0, 128][i]) <= 3));           // the middle stop (look-up resolution 1/512)
  assert.deepEqual(px(10), [255, 0, 0, 128]);
  assert.deepEqual(px(99), [255, 0, 0, 128]);                                          // above the last stop keeps the last colour
  const greens = [0.2, 0.4, 0.6, 0.8].map((mm) => px(mm)[1]);
  assert.ok(greens.every((g, i) => i === 0 || g > greens[i - 1]));                      // no bands: every value gets its own step along the gradient
  const picture = rainPicture(Float32Array.of(0, 5, 10, 400), 0.1, colours);            // stored units: 0, 0.5, 1.0, 40 mm
  assert.equal(picture[3], 0);
  assert.ok(picture[7] === 128 && picture[11] === 128 && picture[15] === 128);
});

test('agreement is soft: dry-dry is clear, wet-wet is the "both" colour, one wet is the "disagree" colour, and the edge fades with the threshold', () => {
  const run = (a, b) => [...agreementPicture(Float32Array.of(a), Float32Array.of(b), 5, 1, '#2a6fd6', '#f28a17', 0.8)];
  const full = Math.round(255 * 0.8);
  assert.equal(run(0, 0)[3], 0);
  assert.deepEqual(run(20, 20), [0x2a, 0x6f, 0xd6, full]);
  assert.deepEqual(run(20, 0), [0xf2, 0x8a, 0x17, full]);
  assert.deepEqual(run(0, 20), run(20, 0));                                              // symmetric in the two models
  assert.equal(run(4.5, 4.5)[3], Math.round(255 * 0.8 * 0.5));                          // exactly in the middle of the threshold: half strength
  const edge = [3.4, 4.0, 4.5, 5.0, 5.6].map((v) => run(v, v)[3]);
  assert.ok(edge.every((a, i) => i === 0 || a >= edge[i - 1]) && edge[0] === 0 && edge[4] === full); // rises smoothly from dry to wet
});

test('the live settings in the config are consistent with the pre-made pictures and with themselves', () => {
  const live = FRONTEND.map.live;
  const backend = readFileSync(new URL('../../config/backend.toml', import.meta.url), 'utf8');
  assert.equal(live.fade_from_mm, Number(/fade_from_mm\s*=\s*([\d.]+)/.exec(backend)[1])); // the same soft edge as the pre-made pictures
  assert.ok(live.min_zoom >= FRONTEND.map.fly.zoom && live.min_zoom < FRONTEND.map.max_zoom);   // only where the flat map is already shown
  assert.ok(live.canvas_scale > 0 && live.canvas_scale <= 1 && live.lut_size >= 64 && live.max_tiles >= 20 && live.agreement_soft_steps > 0);
});
