// Tests for frontend/src/livedata.js (the data for the browser-side drawing). TEST FIXTURES ONLY: a small invented grid with tile files built here
// in the tile format (the decoder is already checked against tiles written by the real Python code in tiles.test.mjs).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { buildWindow, sampleView } from '../../frontend/src/live.js';
import { layerAccessor, layerIndex, loadWindowTiles, tilesFor } from '../../frontend/src/livedata.js';

const GRID = { ni: 20, nj: 10, step_degrees: 18, lat_first: 81, lon_first: 180 };
const SIZE = 8;
const MANIFEST = { grid: GRID, tiles: { size: SIZE, layers: 3, path: 'tiles/{row}_{col}.bin.gz' },
  models: { a: { layer_offset: 0, steps: [6, 12] }, b: { layer_offset: 2, steps: [6] } } };
const value = (layer, r, c) => (r * 31 + c * 17 + layer * 5) % 200;

/** The tile file the exporter would write for tile (tileRow, tileCol): header + little-endian uint16, layer-major, not shuffled, gzip. */
function tileFile(tileRow, tileCol) {
  const rows = Math.min(SIZE, GRID.nj - tileRow * SIZE);
  const cols = Math.min(SIZE, GRID.ni - tileCol * SIZE);
  const raw = Buffer.alloc(10 + 2 * rows * cols * 3);
  [1, rows, cols, 3, 0].forEach((v, i) => raw.writeUInt16LE(v, 2 * i));
  let at = 10;
  for (let layer = 0; layer < 3; layer += 1) for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) { raw.writeUInt16LE(value(layer, tileRow * SIZE + r, tileCol * SIZE + c), at); at += 2; }
  return gzipSync(raw);
}

/** A fake server: counts every request. `broken` = a set of tile addresses that fail. */
function server(broken = new Set()) {
  const calls = [];
  const get = async (url) => {
    calls.push(url);
    const [, row, col] = /tiles\/(\d+)_(\d+)\.bin\.gz/.exec(url);
    if (broken.has(`${row}_${col}`)) throw new Error('offline');
    return tileFile(Number(row), Number(col));
  };
  return { get, calls };
}

/** Brute force: the tiles that hold any cell of the view plus a margin, worked out cell by cell. */
function expectedTiles(bounds, margin = 3) {
  const rowLow = Math.max(0, Math.floor((GRID.lat_first - bounds.north) / GRID.step_degrees) - margin);
  const rowHigh = Math.min(GRID.nj - 1, Math.ceil((GRID.lat_first - bounds.south) / GRID.step_degrees) + margin);
  const start = Math.floor(((((bounds.west - GRID.lon_first) % 360) + 360) % 360) / GRID.step_degrees) - margin;
  const count = Math.ceil((bounds.east - bounds.west) / GRID.step_degrees) + 2 * margin + 1;
  const found = new Set();
  for (let r = rowLow; r <= rowHigh; r += 1) for (let k = 0; k < count; k += 1) found.add(`${Math.floor(r / SIZE)},${Math.floor(((((start + k) % GRID.ni) + GRID.ni) % GRID.ni) / SIZE)}`);
  return found;
}

test('a layer is found by model and block; an unknown block or model gives -1', () => {
  assert.equal(layerIndex(MANIFEST, 'a', 6), 0);
  assert.equal(layerIndex(MANIFEST, 'a', 12), 1);
  assert.equal(layerIndex(MANIFEST, 'b', 6), 2);
  assert.equal(layerIndex(MANIFEST, 'b', 12), -1);
  assert.equal(layerIndex(MANIFEST, 'c', 6), -1);
});

test('the tiles for a view are the tiles of its cells plus the margin, also across the date line and for the whole world', () => {
  const views = [{ west: 0, east: 40, south: 0, north: 40 }, { west: 170, east: 200, south: -30, north: 30 }, { west: -180, east: 180, south: -80, north: 80 },
    { west: 20, east: 25, south: 10, north: 12 }, { west: 100, east: 179, south: -80, north: -40 }];
  for (const view of views) {
    const got = new Set(tilesFor(MANIFEST, view).map((t) => `${t.tileRow},${t.tileCol}`));
    assert.deepEqual([...got].sort(), [...expectedTiles(view)].sort(), JSON.stringify(view));
  }
  assert.equal(tilesFor(MANIFEST, views[2]).length, 6); // 2 tile rows x 3 tile columns cover the whole grid
});

test('the tiles are fetched once, shared through the cache, limited in number, and a failure is a clean rejection that may be retried', async () => {
  const view = { west: 20, east: 25, south: 10, north: 12 };
  const { get, calls } = server();
  const cache = new Map();
  const data = await loadWindowTiles('/data/', MANIFEST, view, get, cache, 150);
  assert.equal(calls.length, tilesFor(MANIFEST, view).length);
  const before = calls.length;
  await loadWindowTiles('/data/', MANIFEST, view, get, cache, 150);
  assert.equal(calls.length, before); // the second view uses the cached tiles
  assert.equal(data.tiles.size, before);

  const strict = server();
  assert.equal(await loadWindowTiles('/data/', MANIFEST, { west: -180, east: 180, south: -80, north: 80 }, strict.get, new Map(), 3), null); // too many tiles: use the picture
  assert.equal(strict.calls.length, 0); // and nothing was fetched for it

  const broken = new Set(['0_0']);
  const flaky = server(broken);
  const cache2 = new Map();
  const whole = { west: -180, east: 180, south: -80, north: 80 };
  await assert.rejects(loadWindowTiles('/data/', MANIFEST, whole, flaky.get, cache2, 150), /offline/);
  broken.clear();
  assert.ok(await loadWindowTiles('/data/', MANIFEST, whole, flaky.get, cache2, 150)); // the failed tile was forgotten, so it can be tried again

  await assert.rejects(loadWindowTiles('/data/', MANIFEST, view, async () => Buffer.from('not a tile'), new Map(), 150)); // a damaged tile is refused
});

test('the accessor returns every cell of every layer exactly, and refuses a cell whose tile was not loaded', async () => {
  const { get } = server();
  const data = await loadWindowTiles('/data/', MANIFEST, { west: -180, east: 180, south: -80, north: 80 }, get, new Map(), 150);
  for (let layer = 0; layer < 3; layer += 1) {
    const valueAt = layerAccessor(data, layer);
    for (let r = 0; r < GRID.nj; r += 1) for (let c = 0; c < GRID.ni; c += 1) assert.equal(valueAt(r, c), value(layer, r, c), `layer ${layer} cell ${r},${c}`);
  }
  const small = await loadWindowTiles('/data/', MANIFEST, { west: 20, east: 25, south: 10, north: 12 }, get, new Map(), 150);
  const far = [...Array(GRID.nj).keys()].flatMap((r) => [...Array(GRID.ni).keys()].map((c) => [r, c])).find(([r, c]) => !small.tiles.has(`${Math.floor(r / SIZE)},${Math.floor(c / SIZE)}`));
  assert.ok(far, 'the small view does not hold the whole grid');
  assert.throws(() => layerAccessor(small, 0)(...far), /not in the loaded tiles/);
});

test('tiles -> accessor -> smooth field: at a cell centre the drawn value is the value the tile holds', async () => {
  const { get } = server();
  const data = await loadWindowTiles('/data/', MANIFEST, { west: -180, east: 180, south: -80, north: 80 }, get, new Map(), 150);
  const valueAt = layerAccessor(data, layerIndex(MANIFEST, 'a', 12));
  for (const [r, c] of [[0, 0], [4, 9], [9, 19], [3, 7], [8, 8]]) {
    const rows = Float64Array.of(r);
    const cols = Float64Array.of(c);
    assert.equal(sampleView(buildWindow(GRID, rows, cols, valueAt), rows, cols)[0], value(1, r, c), `cell ${r},${c}`);
  }
});
