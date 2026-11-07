// Tests for mapProblemText in frontend/src/mapstate.js: which map errors the developer console shows, and how they are described (E034, step 13.2).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapProblemText } from '../../frontend/src/mapstate.js';

test('a cancelled request is silent: it is normal when the map moves faster than its tiles arrive', () => {
  assert.equal(mapProblemText({ name: 'AbortError', message: 'signal is aborted without reason' }), null);
  assert.equal(mapProblemText({ error: { name: 'AbortError', message: 'x' } }), null); // a MapLibre error event wraps the error
  assert.equal(mapProblemText(new Error('The user aborted a request.')), null);
  assert.equal(mapProblemText({ message: 'Request aborted' }), null);
});

test('any other error is described by name, message, address and status, so a rare one says what it is', () => {
  assert.equal(mapProblemText(new TypeError('Failed to fetch')), 'TypeError: Failed to fetch');
  const tile = { name: 'AJAXError', message: 'Not Found', url: 'https://example.org/Quest_lab/data/basemap/assets/fonts/Noto%20Sans%20Regular/0-255.pbf', status: 404 };
  assert.equal(mapProblemText({ error: tile }), `AJAXError: Not Found ${tile.url} (HTTP 404)`); // a short address is kept whole
  const long = mapProblemText({ name: 'E', message: 'm', url: `https://example.org/${'a'.repeat(200)}/end.pbf` });
  assert.ok(long.endsWith('/end.pbf') && long.length < 140, 'a long address is cut from the front: the end is what tells which file');
  assert.equal(mapProblemText('plain text'), 'error: plain text');
  assert.ok(mapProblemText({ name: 'E', message: 'x'.repeat(500) }).length < 260, 'long messages are cut');
});

test('a word that only contains "abort" inside another word is not mistaken for a cancelled request', () => {
  assert.notEqual(mapProblemText(new Error('abortive result of the style')), null);
});
