// Tests for frontend/src/sitepath.js: the data address follows the page's base (the public site lives in a sub-folder).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { dataPath } from '../../frontend/src/sitepath.js';
import { basemapUrls, buildBasemap } from '../../frontend/src/basemap.js';

const FRONTEND = JSON.parse(readFileSync(new URL('../../config/frontend.json', import.meta.url), 'utf8'));

test('the data address starts from the base: the root, a sub-folder, and a base given without its closing slash', () => {
  assert.equal(dataPath('/', '/data/'), '/data/');
  assert.equal(dataPath('/Quest_lab/', '/data/'), '/Quest_lab/data/');
  assert.equal(dataPath('/Quest_lab', '/data/'), '/Quest_lab/data/');
  assert.equal(dataPath('./', '/data/'), './data/');
});

test('every address of the base map follows the sub-folder too (nothing is rooted at "/")', () => {
  const dataBase = dataPath('/Quest_lab/', FRONTEND.data_url_path);
  const parts = buildBasemap(FRONTEND.map, dataBase, 'https://zaspartans.github.io');
  for (const url of basemapUrls(parts)) assert.ok(url.startsWith('https://zaspartans.github.io/Quest_lab/data/basemap/'), url);
});
