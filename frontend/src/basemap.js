// The stored base map (plan PLAN-010, decision D38): the style of an OpenStreetMap world extract (Protomaps, PMTiles) that is stored with the site, with its fonts
// and sprites. Everything is a same-origin address below the data folder: no outside request. Pure function (the two libraries are imported only for their
// style layers), so the style can be tested without a browser. Settings: config/frontend.json `map.basemap`.
import { layers as protomapsLayers, namedFlavor } from '@protomaps/basemaps';

/**
 * Style parts for the base map. `dataBase` = the data URL path (config `data_url_path`, e.g. '/data/'), `origin` = the page's origin.
 * Returns { sources, glyphs, sprite, layers, firstLabelId }: `firstLabelId` is the first text/icon layer, below which the rain layers are inserted so that
 * place names stay readable above the rain (null if the style has no labels).
 */
export function buildBasemap(mapCfg, dataBase, origin) {
  const b = mapCfg.basemap;
  const root = `${new URL(dataBase + b.url_prefix, origin).href}`; // ends with '/'
  const layers = protomapsLayers('protomaps', { ...namedFlavor(b.flavor), ...Object.fromEntries(Object.entries(b.colours).filter(([key]) => !key.startsWith('_'))) }, { lang: b.language }); // our own brighter label and border colours on top of the dark flavor
  return {
    sources: { protomaps: { type: 'vector', url: `pmtiles://${root}${b.file}` } },
    glyphs: `${root}${b.assets_dir}/fonts/{fontstack}/{range}.pbf`, // the braces are for MapLibre to fill in, so no URL object here
    sprite: `${root}${b.assets_dir}/${b.sprite_set}/${b.flavor}`,
    layers,
    firstLabelId: layers.find((layer) => layer.type === 'symbol')?.id ?? null,
  };
}

/** Every address in a style built by `buildBasemap` (source URL without its `pmtiles://` prefix, glyphs, sprite): used by the tests to prove nothing is outside the site. */
export function basemapUrls(parts) {
  return [...Object.values(parts.sources).map((s) => s.url.replace(/^pmtiles:\/\//, '')), parts.glyphs, parts.sprite];
}
