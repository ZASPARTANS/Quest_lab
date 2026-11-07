// Tests for frontend/src/basemap.js (the stored base map style, plan PLAN-010). The style comes from the real @protomaps/basemaps package.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { DARK } from '@protomaps/basemaps';
import { basemapUrls, buildBasemap } from '../../frontend/src/basemap.js';

const FRONTEND = JSON.parse(readFileSync(new URL('../../config/frontend.json', import.meta.url), 'utf8'));
const BASEMAP_TOML = readFileSync(new URL('../../config/basemap.toml', import.meta.url), 'utf8');
const ORIGIN = 'http://localhost:8080';

test('every address of the base map is a file of our own site (no outside host anywhere in the style)', () => {
  const parts = buildBasemap(FRONTEND.map, FRONTEND.data_url_path, ORIGIN);
  const urls = basemapUrls(parts);
  assert.equal(urls.length, 3);
  for (const url of urls) assert.ok(url.startsWith(`${ORIGIN}/data/basemap/`), url);
  assert.equal(parts.sources.protomaps.url, 'pmtiles://http://localhost:8080/data/basemap/world.pmtiles');
  assert.ok(parts.glyphs.endsWith('/assets/fonts/{fontstack}/{range}.pbf'), 'the braces are left for MapLibre to fill in');
  assert.equal(parts.sprite, `${ORIGIN}/data/basemap/assets/sprites/v4/dark`);
  assert.doesNotMatch(JSON.stringify(parts.layers), /https?:\/\//); // no layer carries an address
});

test('the rain goes below the first label layer: every layer before it is not a label, and names exist', () => {
  const { layers, firstLabelId } = buildBasemap(FRONTEND.map, FRONTEND.data_url_path, ORIGIN);
  assert.ok(layers.length > 20);
  const at = layers.findIndex((l) => l.id === firstLabelId);
  assert.ok(at > 0, 'there are label layers, and some map layers lie below them');
  assert.ok(layers.slice(0, at).every((l) => l.type !== 'symbol'));
  assert.ok(layers.slice(at).some((l) => l.type === 'symbol'));
  assert.equal(layers[0].type, 'background'); // the style brings its own background
  assert.ok(new Set(layers.map((l) => l.id)).size === layers.length, 'layer ids are unique, so the rain layers can be added next to them');
  assert.ok(!layers.some((l) => l.id === 'rain' || l.id === 'live'));
});

test('the style asks only for fonts that are stored (the fonts of config/basemap.toml), and the glyph ranges stored cover English labels', () => {
  const stored = JSON.parse(`[${/fonts\s*=\s*\[([^\]]*)\]/.exec(BASEMAP_TOML)[1]}]`);
  const { layers } = buildBasemap(FRONTEND.map, FRONTEND.data_url_path, ORIGIN);
  // a layer's font may be a plain list or a conditional expression: collect every font name written anywhere inside it
  const wanted = new Set(layers.flatMap((l) => [...JSON.stringify(l.layout?.['text-font'] ?? []).matchAll(/"(Noto Sans[^"]*)"/g)].map((m) => m[1])));
  assert.ok(wanted.size >= 1);
  for (const font of wanted) assert.ok(stored.includes(font), `the style uses the font ${font}, which is not stored`);
  const max = Number(/font_range_max\s*=\s*(\d+)/.exec(BASEMAP_TOML)[1]);
  assert.ok(max >= 1535, 'ranges 0-1535 hold Latin, Greek and Cyrillic letters'); // English labels need only Latin
});

test('English labels: the style is made with the configured language', () => {
  assert.equal(FRONTEND.map.basemap.language, 'en');
  const en = JSON.stringify(buildBasemap(FRONTEND.map, FRONTEND.data_url_path, ORIGIN).layers);
  const other = JSON.stringify(buildBasemap({ ...FRONTEND.map, basemap: { ...FRONTEND.map.basemap, language: 'fr' } }, FRONTEND.data_url_path, ORIGIN).layers);
  assert.notEqual(en, other); // the language really changes the label expressions
});

/** WCAG relative luminance and contrast ratio of two #rrggbb colours. */
const luminance = (hex) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255)
  .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);

test('our colour overrides are real fields of the dark flavor, written as #rrggbb, and the style really uses them', () => {
  const colours = Object.entries(FRONTEND.map.basemap.colours).filter(([key]) => !key.startsWith('_'));
  assert.ok(colours.length >= 10);
  for (const [key, value] of colours) {
    assert.ok(key in DARK, `${key} is not a field of the dark flavor (a typo would be ignored silently)`);
    assert.match(value, /^#[0-9a-fA-F]{6}$/, key);
  }
  const styled = JSON.stringify(buildBasemap(FRONTEND.map, FRONTEND.data_url_path, ORIGIN).layers).toLowerCase();
  assert.ok(styled.includes(FRONTEND.map.basemap.colours.city_label.toLowerCase()) && styled.includes(FRONTEND.map.basemap.colours.boundaries.toLowerCase()));
  assert.ok(!styled.includes(DARK.city_label.toLowerCase()), 'the style default for city names is gone');
});

test('names and borders are readable on the dark land: every text colour has a contrast of at least 7 : 1, the borders at least 7 : 1, against the land', () => {
  const land = { ...DARK, ...FRONTEND.map.basemap.colours }.earth;
  const own = FRONTEND.map.basemap.colours;
  for (const key of ['country_label', 'state_label', 'city_label', 'subplace_label', 'ocean_label', 'roads_label_major', 'roads_label_minor', 'address_label', 'boundaries']) {
    assert.ok(contrast(own[key], land) >= 7, `${key} ${own[key]} on ${land}: ${contrast(own[key], land).toFixed(1)} : 1`);
  }
  assert.ok(contrast(DARK.city_label, land) < 7, 'the old default would have failed this test: the user could not read it'); // the test can fail
  assert.ok(contrast(DARK.state_label, land) < 3);
});

// Found in step 9.3c-4 (E032 again): the style names a fourth font, the Devanagari one, that was not stored, so the page asked for files that answered 404.
test('every font the style names is stored with every glyph range (and so is in the assets lock)', () => {
  const { layers } = buildBasemap(FRONTEND.map, FRONTEND.data_url_path, ORIGIN);
  const names = new Set(JSON.stringify(layers).match(/"Noto Sans[^"]*"/g).map((quoted) => JSON.parse(quoted))); // anywhere in the style: some names sit inside the label text expressions
  assert.ok(names.size >= 4, `the style names ${[...names]}`);
  const lock = JSON.parse(readFileSync(new URL('../../config/basemap_assets.lock.json', import.meta.url), 'utf8')).files;
  for (const name of names) {
    assert.ok(`fonts/${name}/0-255.pbf` in lock && `fonts/${name}/65280-65535.pbf` in lock, `${name} is not stored from its first to its last glyph range`);
    assert.ok(BASEMAP_TOML.includes(`"${name}"`), `${name} is not in config/basemap.toml fonts`);
  }
});
