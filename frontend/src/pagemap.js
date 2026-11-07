// Starts the map for the page and keeps its state apart from the plan code (app.js). The plan never waits for the map.
import { frameStep, webgl2Available } from './mapstate.js';

let mapCode = null;

/** Start downloading the map code now (before the manifest has arrived); it does nothing without WebGL2. Safe to call twice. */
export function preloadMap() {
  if (!mapCode && webgl2Available(() => document.createElement('canvas'))) mapCode = import('./mapapp.js');
  return mapCode;
}

/** Run `fn` with the map app once it is ready (does nothing when there is no map). */
export function withMap(state, fn) {
  return state.map ? state.map.then((m) => m && fn(m)) : undefined;
}

/** What a day-card block does when pressed: show that block on the map (null = no map, plain blocks). */
export function cardPick(state, run) {
  return state.hasMap ? { stepOf: (block) => frameStep(state.manifest, block), onPick: (step) => run((m) => m.setStep(step)) } : null;
}

/**
 * Start the map without waiting for it. No WebGL2 (or a failure) leaves a plain message and the plan keeps working.
 * Returns a promise of the map app, or null. `o` = { state, ui, cfg, onPick(lat, lon), onStep(step), redrawBlocks() }.
 */
export function startMap({ state, ui, cfg, onPick, onStep, redrawBlocks }) {
  const supported = webgl2Available(() => document.createElement('canvas'));
  document.body.dataset.map = supported ? 'loading' : 'unavailable';
  ui.mapMessage.hidden = false;
  if (!supported) {
    ui.mapMessage.textContent = 'The map needs WebGL2, which this browser or device does not provide. The plan works without it.';
    return null;
  }
  state.hasMap = true;
  ui.mapMessage.textContent = 'Loading the map\u2026';
  return (preloadMap() ?? import('./mapapp.js'))
    .then(({ createMapApp }) => createMapApp({ cfg, manifest: state.manifest, base: cfg.data_url_path, labels: cfg.model_labels, container: ui.map,
      toolsRoot: ui.mapTools, getTile: state.getter, tileCache: state.tiles, onPickPlace: onPick, onStep, onProblem: (error) => console.error('map problem:', error) }))
    .then((app) => {
      ui.mapMessage.hidden = true;
      ui.mapTools.hidden = false;
      document.body.dataset.map = 'ready';
      return app;
    })
    .catch((error) => {
      console.error('the map could not be started:', error); // technical detail for developers only (decision D9)
      state.hasMap = false;
      ui.mapMessage.textContent = 'The map could not be loaded. The plan still works.';
      document.body.dataset.map = 'failed';
      redrawBlocks();
      return null;
    });
}
