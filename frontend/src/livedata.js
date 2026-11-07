// The data for the browser-side drawing (plan PLAN-009): which point tiles cover the view, loading them (the same size-limited reader, checks and cache
// as the plan: tiles.js), and a value accessor for one layer (a model and a 6 h block). Tiles are untrusted files; anything wrong rejects, and the
// caller keeps showing the pre-made picture.
import { loadTile, tileShape } from './tiles.js';

/** Index of a model's block in the tile layers, or -1 if the model has no such block. */
export function layerIndex(manifest, model, step) {
  const info = manifest.models[model];
  const at = info ? info.steps.indexOf(step) : -1;
  return at < 0 ? -1 : info.layer_offset + at;
}

/** The tiles that hold the cells needed to draw a view, with a margin of `margin` cells all round (the smoothing reads two cells beyond the edge). */
export function tilesFor(manifest, bounds, margin = 3) {
  const { grid } = manifest;
  const size = manifest.tiles.size;
  const rowLow = Math.max(0, Math.floor((grid.lat_first - bounds.north) / grid.step_degrees) - margin);
  const rowHigh = Math.min(grid.nj - 1, Math.ceil((grid.lat_first - bounds.south) / grid.step_degrees) + margin);
  const colStart = Math.floor(((((bounds.west - grid.lon_first) % 360) + 360) % 360) / grid.step_degrees) - margin;
  const colCount = Math.ceil((bounds.east - bounds.west) / grid.step_degrees) + 2 * margin + 1;
  const tileCols = new Set();
  for (let k = 0; k < Math.min(colCount, grid.ni); k += 1) tileCols.add(Math.floor(((((colStart + k) % grid.ni) + grid.ni) % grid.ni) / size));
  const tiles = [];
  for (let tileRow = Math.floor(rowLow / size); tileRow <= Math.floor(rowHigh / size); tileRow += 1) {
    for (const tileCol of [...tileCols].sort((a, b) => a - b)) tiles.push({ tileRow, tileCol });
  }
  return tiles;
}

/**
 * Load every tile a view needs. Resolves { manifest, tiles: Map('row,col' -> { values, rows, cols }) }, or null when more than `maxTiles` are needed
 * (zoomed out too far: use the pre-made picture). Rejects if any tile fails or is not exactly the tile the manifest describes.
 */
export async function loadWindowTiles(base, manifest, bounds, get, cache, maxTiles) {
  const wanted = tilesFor(manifest, bounds);
  if (wanted.length > maxTiles) return null;
  const loaded = await Promise.all(wanted.map(async ({ tileRow, tileCol }) => [`${tileRow},${tileCol}`, { values: await loadTile(base, manifest, tileRow, tileCol, get, cache), ...tileShape(manifest, tileRow, tileCol) }]));
  return { manifest, tiles: new Map(loaded) };
}

/** `valueAt(row, col)` for one layer of the loaded tiles (real cell numbers); throws if the cell is in a tile that was not loaded. */
export function layerAccessor(data, layer) {
  const size = data.manifest.tiles.size;
  return (row, col) => {
    const tile = data.tiles.get(`${Math.floor(row / size)},${Math.floor(col / size)}`);
    if (!tile) throw new Error(`cell ${row},${col} is not in the loaded tiles`);
    return tile.values[layer * tile.rows * tile.cols + (row % size) * tile.cols + (col % size)];
  };
}
