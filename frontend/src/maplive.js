// The live layer (plan PLAN-009, decision D35): on the flat map from a configured zoom upwards the rain is drawn here, in the browser, at screen
// sharpness from the exact tile values, instead of showing the pre-made picture. This file decides when, fetches the tiles of the view, draws
// (live.js) and hands the picture to the map (mapview.js). Any failure leaves the pre-made picture on screen. State for tests: data-live.
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

/** `o` = { cfg, manifest, base, labels, getTile, tileCache, view, current(), onProblem(error), container }; current() gives { model, step, mode }. */
export function createLive(o) {
  const { cfg, manifest, view, container } = o;
  const live = cfg.map.live;
  const grid = manifest.grid;
  const colours = rainColours(cfg.colour_scale, live.lut_size, live.fade_from_mm);
  const agree = manifest.agreement;
  const state = { token: 0, timer: null };
  container.dataset.live = 'off';

  const off = () => {
    view.clearLive();
    container.dataset.live = 'off';
  };

  /** The smooth stored-value field of one layer for the rows and columns of the view. */
  const fieldOf = (data, layer, rows, cols) => sampleView(buildWindow(grid, rows, cols, layerAccessor(data, layer)), rows, cols);

  async function draw() {
    const token = (state.token += 1);
    const want = o.current();
    const v = view.getView();
    const frame = chooseFrame(manifest, want.model, want.step, o.labels);
    if (want.mode === 'globe' || !frame.kind || v.zoom < live.min_zoom || effectiveView(want.mode, v.zoom, cfg.map) !== 'flat') return off();
    container.dataset.live = 'drawing';
    try {
      const bounds = grown(v.bounds);
      const data = await loadWindowTiles(o.base, manifest, bounds, o.getTile, o.tileCache, live.max_tiles);
      if (token !== state.token) return undefined;
      if (!data) return off(); // zoomed out too far for tiles: the pre-made picture
      const started = performance.now();
      const width = Math.max(8, Math.ceil(v.width * (1 + 2 * GROW) * live.canvas_scale));
      const height = Math.max(8, Math.ceil(v.height * (1 + 2 * GROW) * live.canvas_scale));
      const rows = viewRows(grid, bounds, height);
      const cols = viewCols(grid, bounds, width);
      let rgba;
      if (frame.kind === 'agreement') {
        const [a, b] = agree.models.map((m) => layerIndex(manifest, m, want.step));
        const limit = wetLimit(agree.wet_threshold_mm, manifest.quantum_mm);
        const colour = manifest.frames.agreement_colours;
        rgba = agreementPicture(fieldOf(data, a, rows, cols), fieldOf(data, b, rows, cols), limit, live.agreement_soft_steps, colour.both_wet, colour.disagree, live.agreement_opacity);
      } else {
        const layer = layerIndex(manifest, frame.kind, want.step);
        if (layer < 0) return off();
        rgba = rainPicture(fieldOf(data, layer, rows, cols), manifest.quantum_mm, colours);
      }
      const drawn = performance.now() - started;
      const blob = await toBlob(rgba, width, height);
      if (token !== state.token) return undefined;
      view.setLive(blob, bounds);
      container.dataset.liveMs = String(Math.round(drawn));
      container.dataset.liveSize = `${width}x${height}`;
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
