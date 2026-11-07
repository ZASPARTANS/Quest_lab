// Tests for frontend/src/mapkey.js (the colour key of the map, plan PLAN-012): the words come from config/frontend.json, the colours and the threshold from the manifest.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { agreementKey, modelSentence } from '../../frontend/src/mapkey.js';

const KEY = JSON.parse(readFileSync(new URL('../../config/frontend.json', import.meta.url), 'utf8')).map.key;
const manifest = (extra = {}) => ({ frames: { agreement_colours: { both_wet: '#5aa0ff', disagree: '#2b5fa6' } }, agreement: { wet_threshold_mm: 0.5 }, ...extra });

test('the agreement key has three lines with the manifest colours, and "no colour" has no swatch colour', () => {
  const k = agreementKey(KEY, manifest());
  assert.equal(k.lines.length, 3);
  assert.deepEqual(k.lines.map((l) => l.colour), ['#5aa0ff', '#2b5fa6', null]);
  assert.match(k.lines[0].text, /both models say rain/i);
  assert.match(k.lines[1].text, /only one model says rain/i);
  assert.match(k.lines[2].text, /neither model says rain/i);
});

test('the footnote takes the rain threshold from the manifest, and is left out when the manifest has none', () => {
  assert.equal(agreementKey(KEY, manifest()).footnote, 'Rain here means 0.5 mm or more in a 6-hour block.');
  assert.equal(agreementKey(KEY, manifest({ agreement: {} })).footnote, '');
  assert.equal(agreementKey(KEY, manifest({ agreement: { wet_threshold_mm: 2 } })).footnote, 'Rain here means 2 mm or more in a 6-hour block.');
});

test('no word of the agreement key can be read as heat or as wet/dry (the user found orange read as heat)', () => {
  const k = agreementKey(KEY, manifest());
  const words = [KEY.title, ...k.lines.map((l) => l.text), k.footnote].join(' ');
  assert.doesNotMatch(words, /\b(wet|dry|heat|hot|warm|orange)\b/i);
});

test('the single-model sentence says the colours show rain and not temperature', () => {
  assert.match(modelSentence(KEY), /rain only, not temperature/i);
  assert.equal(KEY.title, 'What the colours mean');
});
