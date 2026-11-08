// The MapLibre map (loaded on demand, after the plan is on screen). It draws the stored OpenStreetMap base map (decision D38), the rain on top of it (a pre-made
// picture, or the live picture drawn in the browser) with the place names above the rain, on a globe that flattens while it zooms in (decision D31), and a
// marker for the chosen place. No outside request: the base map, its fonts and sprites are files of our own site.
// State for the browser tests is written to data- attributes of the container (no globals).
// Split in PLAN-016 (decision D47): this file makes the map and joins the parts; the rain layers are in maprain.js, the moves and the marker in mapmove.js.
import { addProtocol, Map as MapLibreMap, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'; // the worker is a separate file the bundler must emit and name (E017)
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { buildBasemap } from './basemap.js';
import { effectiveView, projectionSpec } from './mapstate.js';
import { fly, getView, recentre, showPlace } from './mapmove.js';
import { clearLive, setFrame, setLive } from './maprain.js';

let protocolRegistered = false;
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`); // MapLibre writes the attribution as HTML

/** The map itself: the stored base map as its style, north-up and flat on the screen, the credit of the forecast and of the map in the corner. */
function newMap({ container, mapCfg, source, base }) {
  return new MapLibreMap({
    container, center: mapCfg.start.center, zoom: mapCfg.start.zoom, minZoom: mapCfg.min_zoom, maxZoom: mapCfg.max_zoom, renderWorldCopies: false,
    dragRotate: false, pitchWithRotate: false, maxPitch: 0, touchPitch: false, // a weather map stays north-up and flat on the screen
    attributionControl: { compact: true, customAttribution: `Forecast: ${escapeHtml(source.name)}, ${escapeHtml(source.licence)}. Map: ${mapCfg.basemap.attribution_html}` }, // the map credit is our own config text
    style: { version: 8, projection: projectionSpec('auto', mapCfg), sources: base.sources, glyphs: base.glyphs, sprite: base.sprite, layers: base.layers },
  });
}

/** Write what the browser checks read (zoom, centre, which view is really shown, bearing and pitch) into the data- attributes of the container. */
function reflect({ map, container, state, mapCfg }) {
  const c = map.getCenter();
  const data = container.dataset;
  data.zoom = map.getZoom().toFixed(3);
  data.center = `${c.lng.toFixed(4)},${c.lat.toFixed(4)}`;
  data.effective = effectiveView(state.mode, map.getZoom(), mapCfg);
  data.bearing = map.getBearing().toFixed(2); // for the browser checks: the map must stay north-up and flat (rotation and tilt are off)
  data.pitch = map.getPitch().toFixed(2);
}

export function createMapView({ container, cfg, manifest, onClick, onProblem }) {
  setWorkerUrl(workerUrl);
  if (!protocolRegistered) {
    addProtocol('pmtiles', new Protocol().tile); // lets the style read the stored .pmtiles file with range requests
    protocolRegistered = true;
  }
  const mapCfg = cfg.map;
  const base = buildBasemap(mapCfg, cfg.data_url_path, location.origin);
  const map = newMap({ container, mapCfg, source: manifest.source ?? {}, base });
  // the shared context of maprain.js and mapmove.js; the rain goes below the first label layer, so names stay readable above it
  const ctx = { map, container, manifest, mapCfg, belowLabels: base.firstLabelId ?? undefined, state: { mode: 'auto', marker: null, liveUrl: null, liveVisible: false } };
  container.dataset.mode = 'auto';
  container.dataset.flying = 'false';
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  map.on('move', () => reflect(ctx));
  map.on('error', (e) => onProblem(e.error ?? e));
  map.on('click', (e) => onClick(e.lngLat.lat, e.lngLat.lng));
  ctx.ready = new Promise((resolve) => map.on('load', () => {
    reflect(ctx);
    resolve();
  }));

  function setMode(mode) {
    ctx.state.mode = mode;
    container.dataset.mode = mode;
    map.setProjection(projectionSpec(mode, mapCfg));
    reflect(ctx);
  }

  return {
    ready: ctx.ready,
    setFrame: (url) => setFrame(ctx, url),
    setMode,
    showPlace: (lat, lon) => showPlace(ctx, lat, lon),
    fly: (lat, lon, plan) => fly(ctx, lat, lon, plan, () => reflect(ctx)),
    recentre: (lat, lon, animate) => recentre(ctx, lat, lon, animate),
    getView: () => getView(ctx),
    setLive: (blob, bounds) => setLive(ctx, blob, bounds),
    clearLive: () => clearLive(ctx),
    onMoveEnd: (fn) => map.on('moveend', fn),
    onceIdle: (fn) => map.once('idle', fn),
  };
}
