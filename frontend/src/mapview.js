// The MapLibre map (loaded on demand, after the plan is on screen). It draws the exported rain frame as an image on a globe that flattens
// while it zooms in (decision D31), the Natural Earth outlines, and a marker for the chosen place. No outside request: no online style or tiles.
// State for the browser tests is written to data- attributes of the container (no globals).
import { Map as MapLibreMap, Marker, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'; // the worker is a separate file the bundler must emit and name (E017)
import 'maplibre-gl/dist/maplibre-gl.css';
import { effectiveView, projectionSpec } from './mapstate.js';
import { borders, coastlines } from './outlines.js';

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`); // MapLibre writes the attribution as HTML

export function createMapView({ container, cfg, manifest, onClick, onProblem }) {
  setWorkerUrl(workerUrl);
  const mapCfg = cfg.map;
  const source = manifest.source ?? {};
  const state = { mode: 'auto', marker: null, liveUrl: null, liveVisible: false };
  const map = new MapLibreMap({
    container, center: mapCfg.start.center, zoom: mapCfg.start.zoom, minZoom: mapCfg.min_zoom, maxZoom: mapCfg.max_zoom, renderWorldCopies: false,
    dragRotate: false, pitchWithRotate: false, maxPitch: 0, touchPitch: false, // a weather map stays north-up and flat on the screen
    attributionControl: { compact: true, customAttribution: `Forecast: ${escapeHtml(source.name)}, ${escapeHtml(source.licence)}. Outlines: Natural Earth.` },
    style: { version: 8, projection: projectionSpec('auto', mapCfg), sources: {}, layers: [{ id: 'sea', type: 'background', paint: { 'background-color': mapCfg.sea_colour } }] },
  });
  const data = container.dataset;
  data.mode = 'auto';
  data.flying = 'false';
  const reflect = () => {
    const c = map.getCenter();
    data.zoom = map.getZoom().toFixed(3);
    data.center = `${c.lng.toFixed(4)},${c.lat.toFixed(4)}`;
    data.effective = effectiveView(state.mode, map.getZoom(), mapCfg);
  };
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  map.on('move', reflect);
  map.on('error', (e) => onProblem(e.error ?? e));
  map.on('click', (e) => onClick(e.lngLat.lat, e.lngLat.lng));

  const ready = new Promise((resolve) => map.on('load', () => {
    map.addSource('coast', { type: 'geojson', data: coastlines });
    map.addSource('borders', { type: 'geojson', data: borders });
    map.addLayer({ id: 'borders', type: 'line', source: 'borders', paint: { 'line-color': '#ffffff', 'line-opacity': 0.35, 'line-width': 0.6 } });
    map.addLayer({ id: 'coast', type: 'line', source: 'coast', paint: { 'line-color': '#ffffff', 'line-opacity': 0.8, 'line-width': 0.9 } });
    reflect();
    resolve();
  }));

  /** Show the frame at `url` (null = no frame). Frames are Web Mercator images covering the whole world up to the Mercator latitude limit. */
  async function setFrame(url) {
    await ready;
    if (!url) {
      if (map.getLayer('rain')) map.setLayoutProperty('rain', 'visibility', 'none');
      return;
    }
    if (map.getSource('rain')) {
      map.getSource('rain').updateImage({ url });
      map.setLayoutProperty('rain', 'visibility', state.liveVisible ? 'none' : 'visible'); // the live picture, when shown, replaces it
      return;
    }
    const lat = manifest.frames.max_latitude;
    map.addSource('rain', { type: 'image', url, coordinates: [[-180, lat], [180, lat], [180, -lat], [-180, -lat]] });
    map.addLayer({ id: 'rain', type: 'raster', source: 'rain', paint: { 'raster-fade-duration': 0, 'raster-resampling': mapCfg.resampling } }, 'borders');
  }

  function setMode(mode) {
    state.mode = mode;
    data.mode = mode;
    map.setProjection(projectionSpec(mode, mapCfg));
    reflect();
  }

  function showPlace(lat, lon) {
    if (!state.marker) {
      const dot = document.createElement('div');
      dot.className = 'place-marker';
      dot.setAttribute('role', 'img');
      dot.setAttribute('aria-label', 'Chosen place');
      state.marker = new Marker({ element: dot }).setLngLat([lon, lat]).addTo(map);
    } else {
      state.marker.setLngLat([lon, lat]);
    }
  }

  /** Fly to the place (or jump, with reduced motion); `plan` is from flightPlan(). data-flying says when the move is over. */
  function fly(lat, lon, plan) {
    map.stop(); // end any drag inertia or earlier flight first, so its 'moveend' cannot mark THIS flight as finished
    data.flying = 'true';
    map.once('moveend', () => { data.flying = 'false'; reflect(); });
    const target = { center: [lon, lat], zoom: plan.zoom };
    if (plan.animate) map.flyTo({ ...target, duration: plan.duration, essential: true });
    else map.jumpTo(target);
  }

  /** Where the map is looking: bounds, zoom and the size of the map in screen pixels (the map is never rotated or tilted). */
  function getView() {
    const b = map.getBounds();
    return { bounds: { west: b.getWest(), east: b.getEast(), south: b.getSouth(), north: b.getNorth() }, zoom: map.getZoom(), width: container.clientWidth, height: container.clientHeight };
  }

  /** Show a live picture (a PNG blob made in the browser) over `bounds`; the pre-made picture is hidden once the new one has loaded (no flicker). */
  function setLive(blob, bounds) {
    const url = URL.createObjectURL(blob);
    const coordinates = [[bounds.west, bounds.north], [bounds.east, bounds.north], [bounds.east, bounds.south], [bounds.west, bounds.south]];
    if (map.getSource('live')) {
      map.getSource('live').updateImage({ url, coordinates });
    } else {
      map.addSource('live', { type: 'image', url, coordinates });
      map.addLayer({ id: 'live', type: 'raster', source: 'live', layout: { visibility: 'none' }, paint: { 'raster-fade-duration': 0, 'raster-resampling': mapCfg.resampling } }, 'borders');
    }
    const old = state.liveUrl;
    state.liveUrl = url;
    map.once('idle', () => {
      if (state.liveUrl !== url) return; // a newer picture has been asked for meanwhile
      map.setLayoutProperty('live', 'visibility', 'visible');
      if (map.getLayer('rain')) map.setLayoutProperty('rain', 'visibility', 'none');
      state.liveVisible = true;
      if (old) URL.revokeObjectURL(old);
    });
    map.triggerRepaint();
  }

  /** Go back to the pre-made picture. */
  function clearLive() {
    state.liveVisible = false;
    if (map.getLayer('live')) map.setLayoutProperty('live', 'visibility', 'none');
    if (map.getLayer('rain') && container.dataset.frame !== 'none') map.setLayoutProperty('rain', 'visibility', 'visible');
    if (state.liveUrl) URL.revokeObjectURL(state.liveUrl);
    state.liveUrl = null;
  }

  /** Move the view to a place picked on the map itself: keep the zoom, no flight. */
  function recentre(lat, lon, animate) {
    if (animate) map.easeTo({ center: [lon, lat], duration: 600 });
    else map.jumpTo({ center: [lon, lat] });
  }

  return { ready, setFrame, setMode, showPlace, fly, recentre, getView, setLive, clearLive, onMoveEnd: (fn) => map.on('moveend', fn), onceIdle: (fn) => map.once('idle', fn) };
}
