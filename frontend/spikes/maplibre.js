// SPIKE (library chosen: MapLibre GL JS, D22): one real rainfall frame, flat (?mode=2d) or globe (?mode=3d). No outside requests: the style has no
// online sources. The rainfall is an image source (an exported Web Mercator frame, see backend/export.py).
import { Map as MapLibreMap, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'; // the worker is a separate file the bundler must emit and name
import 'maplibre-gl/dist/maplibre-gl.css';
import cfg from '../../config/frontend.json';
import { borders, coastlines } from '../src/outlines.js';

setWorkerUrl(workerUrl);
const globe = new URLSearchParams(location.search).get('mode') === '3d';
const lat = cfg.spike.mercator_max_latitude;
const map = new MapLibreMap({
  container: 'map',
  center: [20, 25],
  zoom: globe ? 2.1 : 1.1,
  attributionControl: { compact: true, customAttribution: 'Forecast: ECMWF Open Data (CC BY 4.0). Outlines: Natural Earth.' },
  style: {
    version: 8,
    projection: { type: globe ? 'globe' : 'mercator' },
    sources: {},
    layers: [{ id: 'sea', type: 'background', paint: { 'background-color': '#12304f' } }],
  },
});

map.on('load', () => {
  map.addSource('rain', {
    type: 'image',
    url: cfg.data_url_path + cfg.spike.folder + '/' + cfg.spike.mercator_file,
    coordinates: [[-180, lat], [180, lat], [180, -lat], [-180, -lat]],
  });
  map.addLayer({ id: 'rain', type: 'raster', source: 'rain', paint: { 'raster-fade-duration': 0, 'raster-resampling': 'nearest' } });
  map.addSource('coast', { type: 'geojson', data: coastlines });
  map.addSource('borders', { type: 'geojson', data: borders });
  map.addLayer({ id: 'borders', type: 'line', source: 'borders', paint: { 'line-color': '#ffffff', 'line-opacity': 0.35, 'line-width': 0.6 } });
  map.addLayer({ id: 'coast', type: 'line', source: 'coast', paint: { 'line-color': '#ffffff', 'line-opacity': 0.8, 'line-width': 0.9 } });
  map.once('idle', () => { window.__ready = true; });
});
window.__map = map; // spike only: lets the browser test switch the projection
map.on('error', (e) => { window.__error = String(e.error?.message ?? e.error ?? e); });
