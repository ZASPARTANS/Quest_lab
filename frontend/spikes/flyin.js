// SPIKE (PLAN-007 step 9.1, throwaway, removed in step 9.3): the globe flies to a place and ends as the flat map, two ways.
//   ?way=A  fly on a 'globe' projection, then setProjection({type:'mercator'}) when the flight ends
//   ?way=B  the projection is a zoom expression that morphs from 'vertical-perspective' (globe) to 'mercator' while the map zooms in
// Other query values: lon, lat (target), duration (ms). State for the browser test is written to data- attributes of <body> (no globals).
import { Map as MapLibreMap, Marker, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import cfg from '../../config/frontend.json';
import { borders, coastlines } from '../src/outlines.js';

setWorkerUrl(workerUrl);
const q = new URLSearchParams(location.search);
const way = q.get('way') === 'B' ? 'B' : 'A';
const target = [Number(q.get('lon') ?? 80.27), Number(q.get('lat') ?? 13.08)];
const duration = Number(q.get('duration') ?? 3000);
const ZOOM = 4.5;
const body = document.body.dataset;
body.way = way;
body.phase = 'loading';

const projection = way === 'B' ? { type: ['interpolate', ['linear'], ['zoom'], 2.5, 'vertical-perspective', ZOOM, 'mercator'] } : { type: 'globe' };
const map = new MapLibreMap({ container: 'map', center: [20, 20], zoom: 1.3, attributionControl: false,
  style: { version: 8, projection, sources: {}, layers: [{ id: 'sea', type: 'background', paint: { 'background-color': '#12304f' } }] } });

function report() {
  const c = map.getCenter();
  body.lon = c.lng.toFixed(4);
  body.lat = c.lat.toFixed(4);
  body.zoom = map.getZoom().toFixed(3);
}

map.on('load', () => {
  const lat = cfg.spike.mercator_max_latitude;
  map.addSource('rain', { type: 'image', url: `${cfg.data_url_path}${cfg.spike.folder}/${cfg.spike.mercator_file}`, coordinates: [[-180, lat], [180, lat], [180, -lat], [-180, -lat]] });
  map.addLayer({ id: 'rain', type: 'raster', source: 'rain', paint: { 'raster-fade-duration': 0, 'raster-resampling': 'nearest' } });
  map.addSource('coast', { type: 'geojson', data: coastlines });
  map.addSource('borders', { type: 'geojson', data: borders });
  map.addLayer({ id: 'borders', type: 'line', source: 'borders', paint: { 'line-color': '#fff', 'line-opacity': 0.35, 'line-width': 0.6 } });
  map.addLayer({ id: 'coast', type: 'line', source: 'coast', paint: { 'line-color': '#fff', 'line-opacity': 0.8, 'line-width': 0.9 } });
  const dot = document.createElement('div');
  dot.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#ffd48a;border:2px solid #fff';
  new Marker({ element: dot }).setLngLat(target).addTo(map);
  map.once('idle', () => { body.phase = 'ready'; report(); });
});
map.on('move', report);
map.on('error', (e) => { body.error = String(e.error?.message ?? e.error ?? e); });

document.getElementById('go').addEventListener('click', () => {
  body.phase = 'flying';
  map.once('moveend', () => {
    report();
    if (way === 'A') map.setProjection({ type: 'mercator' });
    map.once('idle', () => { report(); body.phase = 'done'; });
  });
  map.flyTo({ center: target, zoom: ZOOM, duration, essential: true });
});
