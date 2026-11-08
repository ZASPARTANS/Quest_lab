// The two rain layers of the map (split out of mapview.js in PLAN-016, decision D47): the pre-made picture of the frame ('rain') and the live picture drawn in the
// browser ('live'), which replaces it when it is shown. Every function takes the shared context of the map view:
// ctx = { map, ready, state, container, manifest, mapCfg, belowLabels }, state = { liveUrl, liveVisible, ... }.

/** Show the frame at `url` (null = no frame). Frames are Web Mercator images covering the whole world up to the Mercator latitude limit. */
export async function setFrame(ctx, url) {
  const { map, ready, state, manifest, mapCfg, belowLabels } = ctx;
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
  map.addLayer({ id: 'rain', type: 'raster', source: 'rain', paint: { 'raster-fade-duration': 0, 'raster-resampling': mapCfg.resampling } }, belowLabels);
}

/** Show a live picture (a PNG blob made in the browser) over `bounds`; the pre-made picture is hidden once the new one has loaded (no flicker). */
export function setLive(ctx, blob, bounds) {
  const { map, state, mapCfg, belowLabels } = ctx;
  const url = URL.createObjectURL(blob);
  const coordinates = [[bounds.west, bounds.north], [bounds.east, bounds.north], [bounds.east, bounds.south], [bounds.west, bounds.south]];
  if (map.getSource('live')) {
    map.getSource('live').updateImage({ url, coordinates });
  } else {
    map.addSource('live', { type: 'image', url, coordinates });
    map.addLayer({ id: 'live', type: 'raster', source: 'live', layout: { visibility: 'none' }, paint: { 'raster-fade-duration': 0, 'raster-resampling': mapCfg.resampling } }, belowLabels);
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
export function clearLive(ctx) {
  const { map, state, container } = ctx;
  state.liveVisible = false;
  if (map.getLayer('live')) map.setLayoutProperty('live', 'visibility', 'none');
  if (map.getLayer('rain') && container.dataset.frame !== 'none') map.setLayoutProperty('rain', 'visibility', 'visible');
  if (state.liveUrl) URL.revokeObjectURL(state.liveUrl);
  state.liveUrl = null;
}
