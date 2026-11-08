// The live layer (plan PLAN-009, decision D35): on the flat map from a configured zoom upwards the rain is drawn here, in the browser, at screen
// sharpness from the exact tile values, instead of showing the pre-made picture. This file decides when, fetches the tiles of the view, draws
// (live.js) and hands the picture to the map (mapview.js). Any failure leaves the pre-made picture on screen. State for tests: data-live.
// (Split into small functions in PLAN-016, decision D47: the picture is made by pictureFor(), the layer is driven by createLive().)
import { agreementPicture, buildWindow, rainColours, rainPicture, sampleView, viewCols, viewRows } from './live.js';
import { layerAccessor, layerIndex, loadWindowTiles } from './livedata.js';
import { wetLimit } from './plan.js';
import { chooseFrame, effectiveView } from './mapstate.js';

const MERCATOR_LIMIT = 85.0511287798;
const GROW = 0.2; // the picture covers 20 % more than the screen on every side, so a small drag does not show an edge before the next drawing

function grown(bounds) {
  const dw = (bounds.east - bounds.west) * GROW;
  const dh = (bounds.north - bounds.south) * GROW;
  return { west: Math.max(-180, bounds.west - dw), east: Math.min(180, bounds.east + dw), south: Math.max(-MERCATOR_LIMIT, bounds.south - dh), north: Math.min(MERCATOR_LIMIT, bounds.north + dh) };
}

function toBlob(rgba, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').putImageData(new ImageData(rgba, width, height), 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('the picture could not be made'))), 'image/png'));
}

/** The smooth stored-value field of one layer for the rows and columns of the view. */
const fieldOf = (grid, data, layer, rows, cols) => sampleView(buildWindow(grid, rows, cols, layerAccessor(data, layer)), rows, cols);

/** The RGBA bytes of the rain or of the agreement for the rows and columns of the view; null when the layer is not in the manifest. */
function pictureRgba(o, colours, frame, want, data, rows, cols) {
  const { cfg, manifest } = o;
  const live = cfg.map.live;
  const grid = manifest.grid;
  if (frame.kind === 'agreement') {
    const agree = manifest.agreement;
    const [a, b] = agree.models.map((m) => layerIndex(manifest, m, want.step));
    const limit = wetLimit(agree.wet_threshold_mm, manifest.quantum_mm);
    const colour = manifest.frames.agreement_colours;
    return agreementPicture(fieldOf(grid, data, a, rows, cols), fieldOf(grid, data, b, rows, cols), limit, live.agreement_soft_steps, colour.both_wet, colour.disagree, live.agreement_opacity);
  }
  const layer = layerIndex(manifest, frame.kind, want.step);
  return layer < 0 ? null : rainPicture(fieldOf(grid, data, layer, rows, cols), manifest.quantum_mm, colours);
}

/**
 * Make the picture of the view `v`. Returns { blob, bounds, ms, size }, null when the pre-made picture must stay (zoomed out too far for tiles, or the layer is
 * missing), or undefined when a newer drawing has been asked for meanwhile (`isCurrent()` is false): the caller then does nothing.
 */
async function pictureFor(o, colours, want, frame, v, isCurrent) {
  const live = o.cfg.map.live;
  const bounds = grown(v.bounds);
  const data = await loadWindowTiles(o.base, o.manifest, bounds, o.getTile, o.tileCache, live.max_tiles);
  if (!isCurrent()) return undefined;
  if (!data) return null;
  const started = performance.now();
  const width = Math.max(8, Math.ceil(v.width * (1 + 2 * GROW) * live.canvas_scale));
  const height = Math.max(8, Math.ceil(v.height * (1 + 2 * GROW) * live.canvas_scale));
  const rgba = pictureRgba(o, colours, frame, want, data, viewRows(o.manifest.grid, bounds, height), viewCols(o.manifest.grid, bounds, width));
  if (!rgba) return null;
  const ms = Math.round(performance.now() - started);
  const blob = await toBlob(rgba, width, height);
  if (!isCurrent()) return undefined;
  return { blob, bounds, ms, size: `${width}x${height}` };
}

/** `o` = { cfg, manifest, base, labels, getTile, tileCache, view, current(), onProblem(error), container }; current() gives { model, step, mode }. */
export function createLive(o) {
  const { cfg, manifest, view, container } = o;
  const live = cfg.map.live;
  const colours = rainColours(cfg.colour_scale, live.lut_size, live.fade_from_mm);
  const state = { token: 0, timer: null };
  container.dataset.live = 'off';

  const off = () => {
    view.clearLive();
    container.dataset.live = 'off';
  };

  async function draw() {
    const token = (state.token += 1);
    const want = o.current();
    const v = view.getView();
    const frame = chooseFrame(manifest, want.model, want.step, o.labels);
    if (want.mode === 'globe' || !frame.kind || v.zoom < live.min_zoom || effectiveView(want.mode, v.zoom, cfg.map) !== 'flat') return off();
    container.dataset.live = 'drawing';
    try {
      const made = await pictureFor(o, colours, want, frame, v, () => token === state.token);
      if (made === undefined) return undefined;
      if (made === null) return off();
      view.setLive(made.blob, made.bounds);
      container.dataset.liveMs = String(made.ms);
      container.dataset.liveSize = made.size;
      container.dataset.live = 'on';
    } catch (error) {
      if (token === state.token) {
        o.onProblem(error); // developers only; the pre-made picture stays
        off();
      }
    }
    return undefined;
  }

  return {
    /** Draw now (the model, block or mode changed). */
    update: draw,
    /** Draw after the map has stopped moving for `debounce_ms`. */
    soon() {
      clearTimeout(state.timer);
      state.timer = setTimeout(draw, live.debounce_ms);
    },
  };
}
