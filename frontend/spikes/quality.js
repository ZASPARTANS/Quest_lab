// SPIKE (PLAN-008 step 9.3b-1, throwaway): shows one prototype picture from <site>/proto/ on the globe or the flat map with a chosen resampling and
// coastline detail, so the variants can be compared at the same view. Query: file, resampling (nearest|linear), view (globe|flat), outline (110|50).
import { Map as MapLibreMap, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { mesh } from 'topojson-client';
import countries110 from 'world-atlas/countries-110m.json';
import countries50 from 'world-atlas/countries-50m.json';
import cfg from '../../config/frontend.json';
import { splitAtDateLine } from '../src/geo.js';

setWorkerUrl(workerUrl);
const q = new URLSearchParams(location.search);
const file = q.get('file');
const resampling = q.get('resampling') === 'nearest' ? 'nearest' : 'linear';
const globe = q.get('view') === 'globe';
const detail = q.get('outline') === '50' ? countries50 : countries110;
const line = (geometry) => ({ type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: splitAtDateLine(geometry.coordinates) } });
const lat = 85.0511287798;
const map = new MapLibreMap({ container: 'map', attributionControl: false, renderWorldCopies: false,
  center: globe ? [60, 25] : [80.27, 13.08], zoom: globe ? 1.9 : Number(q.get('zoom') ?? 4.5),
  style: { version: 8, projection: { type: globe ? 'globe' : 'mercator' }, sources: {}, layers: [{ id: 'sea', type: 'background', paint: { 'background-color': cfg.map.sea_colour } }] } });
map.on('load', () => {
  map.addSource('coast', { type: 'geojson', data: line(mesh(detail, detail.objects.land)) });
  map.addSource('borders', { type: 'geojson', data: line(mesh(detail, detail.objects.countries, (a, b) => a !== b)) });
  map.addSource('rain', { type: 'image', url: `${cfg.data_url_path}proto/${file}`, coordinates: [[-180, lat], [180, lat], [180, -lat], [-180, -lat]] });
  map.addLayer({ id: 'rain', type: 'raster', source: 'rain', paint: { 'raster-fade-duration': 0, 'raster-resampling': resampling } });
  map.addLayer({ id: 'borders', type: 'line', source: 'borders', paint: { 'line-color': '#ffffff', 'line-opacity': 0.35, 'line-width': 0.6 } });
  map.addLayer({ id: 'coast', type: 'line', source: 'coast', paint: { 'line-color': '#ffffff', 'line-opacity': 0.8, 'line-width': 0.9 } });
  map.once('idle', () => { document.body.dataset.ready = 'true'; });
});
map.on('error', (e) => { document.body.dataset.error = String(e.error?.message ?? e.error ?? e); });
