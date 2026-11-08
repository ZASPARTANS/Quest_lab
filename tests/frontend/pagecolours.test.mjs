// PLAN-007 step 9.5: the text colours of the page are readable on the surfaces they sit on (WCAG AA: 4.5 : 1 for text, 3 : 1 for lines and large marks).
// The colours are read from the real stylesheet (frontend/src/style.css, :root), so a change of the palette is checked, not a copy of it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../frontend/src/style.css', import.meta.url), 'utf8');
const root = css.match(/:root\s*\{([^}]*)\}/)[1];
const colour = (name) => { const m = root.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`)); assert.ok(m, `--${name} is not a #rrggbb colour in :root`); return m[1]; };
const channel = (hex, i) => { const v = parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const luminance = (hex) => 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

const SURFACES = ['bg', 'panel', 'panel-2'];
test('body, muted and link colours are readable on every surface of the page (4.5 : 1)', () => {
  for (const text of ['text', 'muted', 'accent']) {
    for (const surface of SURFACES) {
      const ratio = contrast(colour(text), colour(surface));
      assert.ok(ratio >= 4.5, `--${text} on --${surface}: ${ratio.toFixed(2)} : 1`);
    }
  }
});

test('the dark text on the accent buttons and chips is readable (4.5 : 1)', () => {
  const ink = css.match(/button\.primary\s*\{[^}]*color:\s*(#[0-9a-fA-F]{6})/)[1];
  assert.ok(contrast(ink, colour('accent')) >= 4.5, `button ink ${ink} on the accent: ${contrast(ink, colour('accent')).toFixed(2)} : 1`);
});

test('the warm status text (amber) is readable on the page background and the panel (4.5 : 1)', () => {
  const amber = css.match(/\.status\s*\{[^}]*color:\s*(#[0-9a-fA-F]{6})/)[1];
  for (const surface of SURFACES) assert.ok(contrast(amber, colour(surface)) >= 4.5, `${amber} on --${surface}: ${contrast(amber, colour(surface)).toFixed(2)} : 1`);
});

test('the border of every control (button, input, chip, saved place) is visible against each surface (3 : 1, WCAG 1.4.11)', () => {
  for (const surface of SURFACES) assert.ok(contrast(colour('control'), colour(surface)) >= 3, `--control on --${surface}: ${contrast(colour('control'), colour(surface)).toFixed(2)} : 1`);
  const controlRules = css.split('\n').filter((line) => /^(button|input\[type="search"\], select|\.chip label|\.saved) ?\{/.test(line) || /^\.chip label, /.test(line));
  assert.ok(controlRules.length >= 4, 'the control rules were found');
  for (const rule of controlRules) assert.match(rule, /border: 1px solid var\(--control\)/, `a control still uses the quiet hairline colour: ${rule.slice(0, 60)}`);
});

test('a focused control is marked by a 3 px amber outline that is visible on the page and the panels (3 : 1)', () => {
  const focus = css.match(/:focus-visible\s*\{[^}]*outline:\s*3px solid (#[0-9a-fA-F]{6})/)[1];
  for (const surface of SURFACES) assert.ok(contrast(focus, colour(surface)) >= 3, `${focus} on --${surface}`);
});
