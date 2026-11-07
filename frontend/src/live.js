// Browser-side drawing of the rain at screen sharpness (plan PLAN-009, decision D35): the exact cell values of the forecast are interpolated smoothly
// between cell centres for every pixel of the view and coloured with a continuous ramp. Pure functions: no DOM, no network; the caller supplies the
// cell values (frontend/src/livedata.js) and turns the result into an image. At a cell centre the picture equals the stored value exactly; between
// cell centres it is a smooth curve that never goes outside the range of the four cells around it, so it adds no rain that the models do not have.
// Tested in tests/frontend/live.test.mjs against independent Python numbers (scripts/make_js_fixtures.py).

const mercatorY = (latDegrees) => Math.log(Math.tan(Math.PI / 4 + (latDegrees * Math.PI) / 360));
const latOfY = (y) => (Math.atan(Math.sinh(y)) * 180) / Math.PI;

/** Fractional grid ROW of every picture row centre for a view; bounds = { west, east, south, north } in degrees (Web Mercator between south and north). */
export function viewRows(grid, bounds, height) {
  const yNorth = mercatorY(bounds.north);
  const ySouth = mercatorY(bounds.south);
  return Float64Array.from({ length: height }, (_, i) => (grid.lat_first - latOfY(yNorth + ((ySouth - yNorth) * (i + 0.5)) / height)) / grid.step_degrees);
}

/** Fractional grid COLUMN of every picture column centre; increasing and NOT wrapped (the data window wraps it), so a view across the date line stays continuous. */
export function viewCols(grid, bounds, width) {
  const base = ((((bounds.west - grid.lon_first) % 360) + 360) % 360) / grid.step_degrees;
  const span = (bounds.east - bounds.west) / grid.step_degrees;
  return Float64Array.from({ length: width }, (_, j) => base + (span * (j + 0.5)) / width);
}

/** Catmull-Rom weights of the four cells around a fractional position t in [0, 1): they sum to 1, and are exactly [0, 1, 0, 0] at t = 0. */
export function catmullRom(t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return [-0.5 * t3 + t2 - 0.5 * t, 1.5 * t3 - 2.5 * t2 + 1, -1.5 * t3 + 2 * t2 + 0.5 * t, 0.5 * t3 - 0.5 * t2];
}

/**
 * The cell values the view needs, as one array: rows r0..r0+rows-1 (outside the grid they repeat the edge row) and columns c0..c0+cols-1
 * (unwrapped; column numbers beyond the grid wrap around the globe). `valueAt(row, col)` returns the stored value of a real cell.
 */
export function buildWindow(grid, rowf, colf, valueAt) {
  const r0 = Math.floor(rowf[0] < rowf[rowf.length - 1] ? rowf[0] : rowf[rowf.length - 1]) - 1;
  const r1 = Math.floor(Math.max(rowf[0], rowf[rowf.length - 1])) + 2;
  const c0 = Math.floor(colf[0]) - 1;
  const c1 = Math.floor(colf[colf.length - 1]) + 2;
  const rows = r1 - r0 + 1;
  const cols = c1 - c0 + 1;
  const values = new Float32Array(rows * cols);
  for (let r = 0; r < rows; r += 1) {
    const row = Math.min(Math.max(r0 + r, 0), grid.nj - 1);
    for (let c = 0; c < cols; c += 1) values[r * cols + c] = valueAt(row, (((c0 + c) % grid.ni) + grid.ni) % grid.ni);
  }
  return { r0, c0, rows, cols, values };
}

/**
 * The smooth field for every pixel: Float32Array(width * height) in stored units. Catmull-Rom between the four nearest cells in each direction,
 * limited to the range of the four cells around the point (so a dry edge stays dry and a peak stays a peak).
 */
export function sampleView(window, rowf, colf) {
  const height = rowf.length;
  const width = colf.length;
  const out = new Float32Array(width * height);
  const colBase = new Int32Array(width);
  const colWeights = new Float64Array(width * 4);
  for (let j = 0; j < width; j += 1) {
    const c = Math.floor(colf[j]);
    colBase[j] = c - window.c0;
    colWeights.set(catmullRom(colf[j] - c), j * 4);
  }
  for (let i = 0; i < height; i += 1) {
    const r = Math.floor(rowf[i]);
    const wr = catmullRom(rowf[i] - r);
    const top = r - 1 - window.r0;
    for (let j = 0; j < width; j += 1) {
      const base = top * window.cols + colBase[j] - 1;
      let total = 0;
      for (let a = 0; a < 4; a += 1) {
        const at = base + a * window.cols;
        const k = j * 4;
        total += wr[a] * (colWeights[k] * window.values[at] + colWeights[k + 1] * window.values[at + 1] + colWeights[k + 2] * window.values[at + 2] + colWeights[k + 3] * window.values[at + 3]);
      }
      const n = base + window.cols + 1;
      const m = n + window.cols;
      const a1 = window.values[n];
      const a2 = window.values[n + 1];
      const b1 = window.values[m];
      const b2 = window.values[m + 1];
      out[i * width + j] = Math.min(Math.max(total, Math.min(a1, a2, b1, b2)), Math.max(a1, a2, b1, b2));
    }
  }
  return out;
}

const hex = (colour) => [1, 3, 5].map((k) => parseInt(colour.slice(k, k + 2), 16));

/**
 * Colour look-up for rain: a continuous gradient in log10(mm) between the stops of config/frontend.json `colour_scale` (the same colours and
 * scale as the pre-made pictures), and a soft edge where rain starts (alpha rises from 0 at `fadeFromMm` to full at the first stop).
 * Returns { lut, colourAt(mm, out, offset) } writing RGBA into `out`.
 */
export function rainColours(scale, size, fadeFromMm) {
  const stops = scale.stops.map(([mm]) => mm);
  const logs = stops.map(Math.log10);
  const colours = scale.stops.map(([, c]) => hex(c));
  const full = Math.round(255 * scale.opacity);
  const lut = new Uint8ClampedArray(size * 3);
  for (let n = 0; n < size; n += 1) {
    const x = logs[0] + ((logs[logs.length - 1] - logs[0]) * n) / (size - 1);
    let k = 0;
    while (k < logs.length - 2 && x > logs[k + 1]) k += 1;
    const f = (x - logs[k]) / (logs[k + 1] - logs[k]);
    for (let ch = 0; ch < 3; ch += 1) lut[n * 3 + ch] = Math.round(colours[k][ch] + (colours[k + 1][ch] - colours[k][ch]) * f);
  }
  const span = logs[logs.length - 1] - logs[0];
  function colourAt(mm, out, at) {
    if (mm <= fadeFromMm) {
      out[at + 3] = 0;
      return;
    }
    const level = Math.min(Math.max((Math.log10(Math.max(mm, stops[0])) - logs[0]) / span, 0), 1);
    const n = Math.round(level * (size - 1)) * 3;
    out[at] = lut[n];
    out[at + 1] = lut[n + 1];
    out[at + 2] = lut[n + 2];
    out[at + 3] = mm >= stops[0] ? full : Math.round((full * (mm - fadeFromMm)) / (stops[0] - fadeFromMm));
  }
  return { lut, colourAt, full };
}

/** Smooth stored-value field -> RGBA bytes (width * height * 4) with the rain colours. `quantumMm` converts stored units to mm. */
export function rainPicture(field, quantumMm, colours) {
  const out = new Uint8ClampedArray(field.length * 4);
  for (let p = 0; p < field.length; p += 1) colours.colourAt(field[p] * quantumMm, out, p * 4);
  return out;
}

/**
 * Soft agreement of two smooth stored-value fields -> RGBA bytes. Each model's value becomes a "wet" strength that rises from 0 to 1 across
 * `softSteps` storage steps either side of the plan's threshold (rint(value) >= wetLimit, D28, so the middle is wetLimit - 0.5). Both strongly wet:
 * `bothColour`; one wet and the other dry: `disagreeColour`; strength sets the opacity, so edges are smooth and dry-dry is clear.
 */
export function agreementPicture(fieldA, fieldB, wetLimit, softSteps, bothColour, disagreeColour, opacity) {
  const out = new Uint8ClampedArray(fieldA.length * 4);
  const both = hex(bothColour);
  const disagree = hex(disagreeColour);
  const low = wetLimit - 0.5 - softSteps;
  const width = 2 * softSteps;
  for (let p = 0; p < fieldA.length; p += 1) {
    const sa = Math.min(Math.max((fieldA[p] - low) / width, 0), 1);
    const sb = Math.min(Math.max((fieldB[p] - low) / width, 0), 1);
    const together = Math.min(sa, sb);
    const apart = Math.abs(sa - sb);
    const colour = together >= apart ? both : disagree;
    out.set(colour, p * 4);
    out[p * 4 + 3] = Math.round(255 * opacity * Math.max(together, apart));
  }
  return out;
}
