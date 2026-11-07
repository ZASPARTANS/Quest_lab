// Tests for frontend/src/levelcolours.js and drops.js (the day view of plan PLAN-011 step 11.3): the colours are checked values, readable (WCAG AA) and distinct.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { dropStates } from '../../frontend/src/drops.js';
import { levelColourVars } from '../../frontend/src/levelcolours.js';

const readJson = (rel) => JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8'));
const LEVELS = readJson('../../config/activities.json').levels;
const COLOURS = readJson('../../config/frontend.json').plan_levels;

const channel = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b); };
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

test('every level has a bar, a tile and a text colour, as plain #rrggbb values', () => {
  const vars = levelColourVars(COLOURS, LEVELS);
  assert.equal(vars.length, LEVELS.length * 3);
  assert.deepEqual(vars.slice(0, 3).map(([name]) => name), ['--lv-0-bar', '--lv-0-bg', '--lv-0-text']);
  assert.ok(vars.every(([, colour]) => /^#[0-9a-fA-F]{6}$/.test(colour)));
});

test('a malformed colour or an unknown level is left out, never passed on to the page', () => {
  const vars = levelColourVars({ none: { bar: 'red', bg: '#16294a', text: 'url(javascript:1)' }, nonsense: { bar: '#ffffff', bg: '#000000', text: '#ffffff' } }, LEVELS);
  assert.deepEqual(vars, [['--lv-0-bg', '#16294a']]);
  assert.deepEqual(levelColourVars(undefined, LEVELS), []);
});

test('the words on every tile are readable (WCAG AA 4.5 : 1) and the coloured bar stands out from its tile (3 : 1)', () => {
  for (const level of LEVELS) {
    const c = COLOURS[level.id];
    assert.ok(contrast(c.text, c.bg) >= 4.5, `${level.id}: text on tile is ${contrast(c.text, c.bg).toFixed(2)} : 1`);
    assert.ok(contrast(c.bar, c.bg) >= 3, `${level.id}: bar on tile is ${contrast(c.bar, c.bg).toFixed(2)} : 1`);
  }
});

test('the four levels look different: every pair of bars is far apart in colour (distance in RGB at least 70) and the tiles are distinct', () => {
  const bars = LEVELS.map((l) => COLOURS[l.id].bar.toLowerCase());
  const tiles = LEVELS.map((l) => COLOURS[l.id].bg.toLowerCase());
  assert.equal(new Set(bars).size, bars.length);
  assert.equal(new Set(tiles).size, tiles.length);
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const distance = (a, b) => Math.hypot(...rgb(a).map((v, k) => v - rgb(b)[k]));
  for (let i = 0; i < bars.length; i += 1) for (let j = i + 1; j < bars.length; j += 1) assert.ok(distance(bars[i], bars[j]) >= 70, `${LEVELS[i].id} and ${LEVELS[j].id} bars are too alike (${distance(bars[i], bars[j]).toFixed(0)})`);
});

test('the drops: as many are filled as the level (0 to 3)', () => {
  assert.deepEqual(dropStates(0), [false, false, false]);
  assert.deepEqual(dropStates(1), [true, false, false]);
  assert.deepEqual(dropStates(2), [true, true, false]);
  assert.deepEqual(dropStates(3), [true, true, true]);
});
