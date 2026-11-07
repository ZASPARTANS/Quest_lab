// Tests for frontend/src/tiles.js and manifest.js. The tile files and the grid cells in tests/frontend/fixtures/python_reference.json were
// made by the real Python code (scripts/make_js_fixtures.py); the values in them are invented.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { gunzipSync, gzipSync } from 'node:zlib';
import { manifestProblems } from '../../frontend/src/manifest.js';
import { cellSeries, decodeTile, gridIndex, loadSeries, locate, roundHalfEven, seriesByModel, tileUrl } from '../../frontend/src/tiles.js';

const REF = JSON.parse(readFileSync(new URL('./fixtures/python_reference.json', import.meta.url), 'utf8'));
const bytes = (c) => Buffer.from(c.file_base64, 'base64');
const shape = (c) => ({ rows: c.rows, cols: c.cols, layers: c.layers });

test('tiles written by the Python code decode to the same numbers (byte-shuffled and plain)', async () => {
  assert.equal(REF.tiles.length, 2);
  for (const c of REF.tiles) assert.deepEqual([...await decodeTile(bytes(c), shape(c))], c.values, `shuffled=${c.shuffled}`);
  assert.equal(REF.tiles[0].values.includes(65535) && REF.tiles[0].values.includes(256) && REF.tiles[0].values.includes(255), true);
});

test('a host that already removed the gzip layer is accepted; the same bytes still give the same numbers', async () => {
  const c = REF.tiles[0];
  assert.deepEqual([...await decodeTile(gunzipSync(bytes(c)), shape(c))], c.values);
});

test('damaged or hostile tiles are refused', async () => {
  const c = REF.tiles[0];
  const good = bytes(c);
  await assert.rejects(decodeTile(good, { ...shape(c), rows: 3 }), /wrong length|does not match/);       // manifest says another shape
  await assert.rejects(decodeTile(good.subarray(0, good.length - 6), shape(c)));                          // cut short
  await assert.rejects(decodeTile(Buffer.from('this is not a tile at all'), shape(c)), /wrong length/);   // not gzip, not a tile
  await assert.rejects(decodeTile(gzipSync(Buffer.alloc(2_000_000)), shape(c)), /larger than the manifest allows/); // gzip bomb
  const raw = gunzipSync(good);
  raw.writeUInt16LE(9, 0);                                                                                // unknown version
  await assert.rejects(decodeTile(gzipSync(raw), shape(c)), /unknown tile version/);
  const wrongShape = gunzipSync(good);
  wrongShape.writeUInt16LE(5, 2);                                                                         // header rows != manifest rows
  await assert.rejects(decodeTile(gzipSync(wrongShape), shape(c)), /does not match the manifest/);
});

test('Python rounds halves to the even number; so do we (JavaScript Math.round would not)', () => {
  assert.deepEqual([0.5, 1.5, 2.5, 359.5, 360.5, -0.5, -1.5, 3.4999, 3.5001].map(roundHalfEven), [0, 2, 2, 360, 360, 0, -2, 3, 4]);
  assert.notEqual(Math.round(360.5), roundHalfEven(360.5));
});

test('every place in the fixture lands in the same grid cell and tile as in Python', () => {
  const manifest = { grid: REF.grid, tiles: { size: REF.tile_size } };
  assert.equal(REF.cells.length, 16);
  for (const c of REF.cells) {
    assert.deepEqual(gridIndex(c.lat, c.lon, REF.grid), { row: c.row, col: c.col }, `${c.lat},${c.lon}`);
    const w = locate(manifest, c.lat, c.lon);
    assert.deepEqual([w.tileRow, w.tileCol, w.rowIn, w.colIn], c.tile, `${c.lat},${c.lon}`);
  }
  assert.equal(gridIndex(Number.NaN, 0, REF.grid), null);
  assert.equal(gridIndex(0, Number.POSITIVE_INFINITY, REF.grid), null);
});

test('edge tiles are smaller: the south and east tiles report their real shape', () => {
  const manifest = { grid: REF.grid, tiles: { size: 16 } };
  const south = locate(manifest, -90, 0);
  assert.equal(south.rows, 721 - 45 * 16); // 721 rows = 45 full tiles + 1 row
  assert.equal(south.cols, 16);
});

test('cellSeries picks the right cell of every layer, and the series are split by model with the manifest offsets', () => {
  const c = REF.tiles[1];
  const values = Uint16Array.from(c.values);
  const where = { rows: c.rows, cols: c.cols, rowIn: 1, colIn: 2 };
  const series = cellSeries(values, where);
  assert.deepEqual([...series], [0, 1, 2].map((layer) => c.values[layer * c.rows * c.cols + 1 * c.cols + 2]));
  const split = seriesByModel({ models: { a: { layer_offset: 0, layers: 1 }, b: { layer_offset: 1, layers: 2 } } }, series);
  assert.deepEqual([[...split.a], [...split.b]], [[series[0]], [series[1], series[2]]]);
});

test('loadSeries fetches a tile once for places in it, and may try again after a failed fetch', async () => {
  const c = REF.tiles[0];
  const manifest = { grid: { ni: 4, nj: 2, step_degrees: 1, lat_first: 1, lon_first: 0 }, tiles: { size: 16, layers: 3, path: 'tiles/{row}_{col}.bin.gz' },
    models: { m: { layer_offset: 0, layers: 3 } } };
  let calls = 0;
  const cache = new Map();
  const get = async (url) => {
    calls += 1;
    assert.equal(url, '/data/tiles/0_0.bin.gz');
    return bytes(c);
  };
  const a = await loadSeries('/data/', manifest, 1, 0, get, cache);
  const b = await loadSeries('/data/', manifest, 0, 3, get, cache);
  assert.equal(calls, 1);
  assert.equal(a.m.length, 3);
  assert.equal(b.m[0], c.values[1 * 4 + 3]); // layer 0, row 1, column 3
  await assert.rejects(loadSeries('/data/', manifest, 99, Number.NaN, get, cache), /valid coordinate/);
  const failing = new Map();
  await assert.rejects(loadSeries('/data/', manifest, 1, 0, async () => { throw new Error('offline'); }, failing), /offline/);
  assert.equal(failing.size, 0);
});

test('tile URLs come only from the manifest template', () => {
  assert.equal(tileUrl('/data/', { tiles: { path: 'tiles/{row}_{col}.bin.gz' } }, 12, 34), '/data/tiles/12_34.bin.gz');
  const versioned = tileUrl('/data/', { exported_at: '2026-11-07T00:10:00Z', tiles: { path: 'tiles/{row}_{col}.bin.gz' } }, 1, 2);
  assert.equal(versioned, '/data/tiles/1_2.bin.gz?v=2026-11-07T00%3A10%3A00Z'); // a new export is a new address
});

const GOOD = () => ({ format_version: 1, interval_hours: 6, quantum_mm: 0.1, run: '2026-11-06T12:00:00Z', retrieved_at: '2026-11-06T19:40:00Z',
  grid: { ni: 1440, nj: 721, step_degrees: 0.25, lat_first: 90, lon_first: 180 },
  tiles: { size: 16, rows: 46, cols: 90, layers: 3, path: 'tiles/{row}_{col}.bin.gz' },
  models: { ifs: { layer_offset: 0, layers: 1, valid_times: ['2026-11-06T18:00:00Z'] }, 'aifs-single': { layer_offset: 1, layers: 2, valid_times: ['2026-11-06T18:00:00Z', '2026-11-07T00:00:00Z'] } },
  agreement: { models: ['ifs', 'aifs-single'] } });

test('the manifest check accepts a good manifest and names what is wrong in damaged ones', () => {
  assert.deepEqual(manifestProblems(GOOD()), []);
  const damage = [
    [(m) => { m.format_version = 2; }, 'format_version'], [(m) => { m.interval_hours = 5; }, 'interval_hours'],
    [(m) => { m.tiles.path = '../../etc/{row}{col}'; }, 'tiles.path'], [(m) => { m.tiles.path = 'tiles/x.bin.gz'; }, 'tiles.path'],
    [(m) => { m.tiles.layers = 9; }, 'sum of the model layers'], [(m) => { m.models.ifs.valid_times = ['nonsense']; }, 'valid_times'],
    [(m) => { m.agreement.models.push('nope'); }, 'agreement models'], [(m) => { m.grid.ni = 'many'; }, 'grid.ni'],
    [(m) => { m.models = {}; }, 'no models'], [(m) => { m.quantum_mm = 0; }, 'quantum_mm'],
  ];
  for (const [change, text] of damage) {
    const m = GOOD();
    change(m);
    assert.match(manifestProblems(m).join(' | '), new RegExp(text), text);
  }
  assert.deepEqual(manifestProblems(null), ['not an object']);
});
