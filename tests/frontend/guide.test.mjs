// The guide (PLAN-017, D48): it shows until the visitor presses "Don't show again"; a browser that cannot store still works; the stored mark is a fixed value.
// The page's <dialog> is replaced by a small fake so the wiring can be tested without a browser (the real dialog is checked by frontend/tools/guide_scenarios.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import config from '../../config/frontend.json' with { type: 'json' };
import { guideHidden, hideGuide, startGuide } from '../../frontend/src/guide.js';

const KEY = config.guide.storage_key;
const memory = (start = {}) => {
  const data = { ...start };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = String(v); } };
};
const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };

function fakePage({ dialogSupported = true } = {}) {
  const handlers = {};
  const make = (id) => ({ id, hidden: false, addEventListener: (type, fn) => { handlers[`${id}:${type}`] = fn; } });
  const dialog = { ...make('guide'), open: false, scrollTop: 5, closed: 0 };
  dialog.getBoundingClientRect = () => ({ left: 100, right: 500, top: 50, bottom: 450 });
  if (dialogSupported) dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; dialog.closed += 1; };
  const parts = { guide: dialog, 'guide-open': make('guide-open'), 'guide-close': make('guide-close'), 'guide-hide': make('guide-hide') };
  return { doc: { getElementById: (id) => parts[id] ?? null }, parts, press: (id, event) => handlers[`${id}:click`](event) };
}

test('the storage key is its own config value, not one of the other keys', () => {
  assert.equal(typeof KEY, 'string');
  assert.ok(KEY.length > 0);
  assert.notEqual(KEY, config.saved_places.storage_key);
  assert.notEqual(KEY, config.saved_places.settings_key);
});

test('only the fixed mark "1" hides the guide; empty, damaged or blocked storage shows it', () => {
  assert.equal(guideHidden(memory(), KEY), false);
  assert.equal(guideHidden(memory({ [KEY]: '1' }), KEY), true);
  for (const bad of ['0', 'true', '', '{"evil":true', '<script>alert(1)</script>', '11']) assert.equal(guideHidden(memory({ [KEY]: bad }), KEY), false, bad);
  assert.equal(guideHidden(blocked, KEY), false);
});

test('hideGuide stores the mark and says so; a browser that cannot store returns false and does not throw', () => {
  const store = memory();
  assert.equal(hideGuide(store, KEY), true);
  assert.equal(store.data[KEY], '1');
  assert.equal(hideGuide(blocked, KEY), false);
});

test('a first visit opens the guide at its first line; "Close" closes it without remembering', () => {
  const { doc, parts, press } = fakePage();
  const store = memory();
  startGuide(doc, store, KEY);
  assert.equal(parts.guide.open, true);
  assert.equal(parts.guide.scrollTop, 0);
  press('guide-close');
  assert.equal(parts.guide.open, false);
  assert.deepEqual(store.data, {});
});

test('"Don\'t show again" closes the guide and remembers; the next visit stays closed; "How to use" opens it again', () => {
  const { doc, parts, press } = fakePage();
  const store = memory();
  startGuide(doc, store, KEY);
  press('guide-hide');
  assert.equal(parts.guide.open, false);
  assert.equal(store.data[KEY], '1');
  const next = fakePage();
  startGuide(next.doc, store, KEY);
  assert.equal(next.parts.guide.open, false);
  next.press('guide-open');
  assert.equal(next.parts.guide.open, true);
});

test('with blocked storage the guide still opens and "Don\'t show again" still closes it', () => {
  const { doc, parts, press } = fakePage();
  startGuide(doc, blocked, KEY);
  assert.equal(parts.guide.open, true);
  press('guide-hide');
  assert.equal(parts.guide.open, false);
});

test('a browser without <dialog> keeps the page as it was: no guide, no opener button', () => {
  const { doc, parts } = fakePage({ dialogSupported: false });
  startGuide(doc, memory(), KEY);
  assert.equal(parts.guide.open, false);
  assert.equal(parts['guide-open'].hidden, true);
});

test('a click on the dimmed page closes the guide for this visit; a click inside it, or a key press on a button, does not', () => {
  const { doc, parts, press } = fakePage();
  const store = memory();
  startGuide(doc, store, KEY);
  press('guide', { target: parts.guide, clientX: 300, clientY: 200 }); // the dialog's own padding, inside its box
  assert.equal(parts.guide.open, true);
  press('guide', { target: { id: 'guide-close' }, clientX: 0, clientY: 0 }); // a key press on a button reports 0,0 but its target is the button
  assert.equal(parts.guide.open, true);
  press('guide', { target: parts.guide, clientX: 900, clientY: 200 }); // the backdrop, over the map
  assert.equal(parts.guide.open, false);
  assert.deepEqual(store.data, {}, 'closing by a click outside remembers nothing');
});
