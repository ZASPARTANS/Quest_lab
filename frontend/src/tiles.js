// Point tiles: find the tile of a place, fetch it, decode it, read one cell. The file format is described in backend/tiles.py.
// Tile bytes are untrusted: the size of everything is checked against the manifest BEFORE and WHILE it is decoded.

const HEADER_BYTES = 10;
const VERSION = 1;
const FLAG_SHUFFLED = 1;

/** Python's round(): halves go to the even number (JavaScript's Math.round sends them up, which would pick another cell). */
export function roundHalfEven(x) {
  const floor = Math.floor(x);
  const diff = x - floor;
  if (diff < 0.5) return floor;
  if (diff > 0.5) return floor + 1;
  return floor % 2 === 0 ? floor : floor + 1;
}

/** Latitude/longitude -> grid cell, the same maths as pipeline/grid.py `latlon_to_index`. Returns null for non-numbers. */
export function gridIndex(lat, lon, grid) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const row = roundHalfEven((grid.lat_first - lat) / grid.step_degrees);
  const wrapped = (((lon - grid.lon_first) % 360) + 360) % 360;
  const col = roundHalfEven(wrapped / grid.step_degrees) % grid.ni;
  return { row: Math.min(Math.max(row, 0), grid.nj - 1), col };
}

/** Place -> which tile file and which cell inside it. */
export function locate(manifest, lat, lon) {
  const cell = gridIndex(lat, lon, manifest.grid);
  if (!cell) return null;
  const size = manifest.tiles.size;
  const tileRow = Math.floor(cell.row / size);
  const tileCol = Math.floor(cell.col / size);
  return {
    tileRow, tileCol, rowIn: cell.row % size, colIn: cell.col % size,
    rows: Math.min(size, manifest.grid.nj - tileRow * size), cols: Math.min(size, manifest.grid.ni - tileCol * size),
  };
}

/**
 * URL of a tile below the data base URL (the path template comes from the manifest and was checked there). The export time is added as
 * a version, so a browser can never combine an old cached tile with a newer manifest.
 */
export function tileUrl(base, manifest, tileRow, tileCol) {
  const version = typeof manifest.exported_at === 'string' ? `?v=${encodeURIComponent(manifest.exported_at)}` : '';
  return base + manifest.tiles.path.replace('{row}', String(tileRow)).replace('{col}', String(tileCol)) + version;
}

async function readLimited(stream, maxBytes) {
  const reader = stream.getReader();
  const parts = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error('tile is larger than the manifest allows');
    }
    parts.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** Bytes of a tile file -> the decompressed bytes. A host that already decoded the gzip is accepted (the header then comes first). */
async function gunzip(bytes, maxBytes) {
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return readLimited(stream, maxBytes);
  }
  if (bytes.length > maxBytes) throw new Error('tile is larger than the manifest allows');
  return bytes;
}

/**
 * Tile file bytes -> Uint16Array (layers, rows, cols), each value in storage steps. `expect` = { rows, cols, layers } from the manifest.
 * Throws for anything that is not exactly the expected tile.
 */
export async function decodeTile(buffer, expect) {
  const count = expect.rows * expect.cols * expect.layers;
  const raw = await gunzip(new Uint8Array(buffer), HEADER_BYTES + 2 * count);
  if (raw.length !== HEADER_BYTES + 2 * count) throw new Error('tile has the wrong length');
  const head = new DataView(raw.buffer, raw.byteOffset, HEADER_BYTES);
  const [version, rows, cols, layers, flags] = [0, 2, 4, 6, 8].map((at) => head.getUint16(at, true));
  if (version !== VERSION || (flags & ~FLAG_SHUFFLED) !== 0) throw new Error('unknown tile version or flags');
  if (rows !== expect.rows || cols !== expect.cols || layers !== expect.layers) throw new Error('tile shape does not match the manifest');
  const payload = raw.subarray(HEADER_BYTES);
  const values = new Uint16Array(count);
  if (flags & FLAG_SHUFFLED) {
    for (let i = 0; i < count; i += 1) values[i] = (payload[i] << 8) | payload[count + i];
  } else {
    const view = new DataView(payload.buffer, payload.byteOffset, payload.length);
    for (let i = 0; i < count; i += 1) values[i] = view.getUint16(2 * i, true);
  }
  return values;
}

/** One cell's series (one value per layer) out of a decoded tile. */
export function cellSeries(values, where) {
  const layerSize = where.rows * where.cols;
  const layers = values.length / layerSize;
  const out = new Uint16Array(layers);
  for (let layer = 0; layer < layers; layer += 1) out[layer] = values[layer * layerSize + where.rowIn * where.cols + where.colIn];
  return out;
}

/** Split a cell series into one series per model with the manifest's layer offsets. */
export function seriesByModel(manifest, series) {
  return Object.fromEntries(Object.entries(manifest.models).map(([name, info]) => [name, series.subarray(info.layer_offset, info.layer_offset + info.layers)]));
}

/** Rows and columns of one tile (tiles at the south and east edge may be smaller than the tile size). */
export function tileShape(manifest, tileRow, tileCol) {
  const size = manifest.tiles.size;
  return { rows: Math.min(size, manifest.grid.nj - tileRow * size), cols: Math.min(size, manifest.grid.ni - tileCol * size) };
}

/**
 * One tile, fetched, checked and decoded: Uint16Array (layers, rows, cols). `get(url)` returns an ArrayBuffer (injected so tests need no network).
 * Tiles are kept in `cache` (a Map shared by the plan and the map); a failed tile is forgotten so that it may be tried again.
 */
export function loadTile(base, manifest, tileRow, tileCol, get, cache) {
  const url = tileUrl(base, manifest, tileRow, tileCol);
  if (!cache.has(url)) {
    const { rows, cols } = tileShape(manifest, tileRow, tileCol);
    cache.set(url, get(url).then((buffer) => decodeTile(buffer, { rows, cols, layers: manifest.tiles.layers })));
    cache.get(url).catch(() => cache.delete(url));
  }
  return cache.get(url);
}

/** Fetch + decode + read for a place. */
export async function loadSeries(base, manifest, lat, lon, get, cache = new Map()) {
  const where = locate(manifest, lat, lon);
  if (!where) throw new Error('place is not a valid coordinate');
  const values = await loadTile(base, manifest, where.tileRow, where.tileCol, get, cache);
  return seriesByModel(manifest, cellSeries(values, where));
}
