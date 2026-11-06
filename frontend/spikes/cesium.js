// SPIKE: one real rainfall frame on CesiumJS, flat (?mode=2d) or globe (?mode=3d). No Cesium ion, no online imagery: the base layer is
// switched off and the rainfall is a single latitude/longitude image over the whole globe (see scripts/spike_frame.py).
// Uses CesiumWidget from @cesium/engine, not the ready-made Viewer: the Viewer's widgets pull in Knockout, which evaluates a string as code
// and therefore needs 'unsafe-eval' in the Content-Security-Policy (found with the preview's real headers, docs/DECISIONS.md D21).
import { Cartesian3, Color, Rectangle } from '@cesium/core';
import { CesiumWidget, Material, PolylineCollection, SceneMode, SingleTileImageryProvider } from '@cesium/engine';
import '@cesium/engine/Source/Widget/CesiumWidget.css';
import cfg from '../../config/frontend.json';
import { borders, coastlines } from '../src/outlines.js';

window.CESIUM_BASE_URL = cfg.cesium.url_path;
const globe = new URLSearchParams(location.search).get('mode') === '3d';
const widget = new CesiumWidget('map', {
  baseLayer: false, skyBox: false, sceneMode: globe ? SceneMode.SCENE3D : SceneMode.SCENE2D, requestRenderMode: true,
});
widget.scene.backgroundColor = Color.fromCssColorString('#0b1d33');
widget.scene.globe.baseColor = Color.fromCssColorString('#12304f');

function addLines(feature, alpha, width) {
  const lines = new PolylineCollection();
  const material = Material.fromType('Color', { color: Color.WHITE.withAlpha(alpha) });
  const parts = feature.geometry.type === 'MultiLineString' ? feature.geometry.coordinates : [feature.geometry.coordinates];
  for (const part of parts) lines.add({ positions: Cartesian3.fromDegreesArray(part.flat()), width, material });
  widget.scene.primitives.add(lines);
}

async function main() {
  const url = cfg.data_url_path + cfg.spike.folder + '/' + cfg.spike.equirectangular_file;
  const provider = await SingleTileImageryProvider.fromUrl(url, { rectangle: Rectangle.fromDegrees(-180, -90, 180, 90) });
  widget.imageryLayers.addImageryProvider(provider);
  addLines(borders, 0.35, 1);
  addLines(coastlines, 0.8, 1.5);
  widget.camera.setView({ destination: Cartesian3.fromDegrees(20, 25, globe ? 24000000 : 30000000) });
  widget.scene.requestRender();
  widget.scene.postRender.addEventListener(function ready() {
    if (widget.scene.globe.tilesLoaded) { window.__ready = true; widget.scene.postRender.removeEventListener(ready); }
  });
}
main().catch((e) => { window.__error = String(e?.message ?? e); });
