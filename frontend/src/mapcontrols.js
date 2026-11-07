// The tools that float on the map: view (Auto / Flat / Globe), model, legend, and the time bar. Built with DOM text only (see dom.js).
import { el, fill } from './dom.js';

const MODES = [{ id: 'auto', label: 'Auto' }, { id: 'flat', label: 'Flat' }, { id: 'globe', label: 'Globe' }];
const HEX = /^#[0-9a-fA-F]{6}$/;
const AGREEMENT_WORDS = { both_wet: 'Both models wet', disagree: 'Models disagree' };

/** A group of radio buttons that looks like a segmented control. `onChange(id)` is called when another one is chosen. */
function segmented(name, legend, items, selected, onChange) {
  const inputs = items.map((item) => {
    const input = el('input', { attrs: { type: 'radio', name, id: `${name}-${item.id}`, value: item.id } });
    input.checked = item.id === selected;
    input.addEventListener('change', () => onChange(item.id));
    return input;
  });
  const parts = items.map((item, i) => el('span', { class: 'seg-item' }, [inputs[i], el('label', { text: item.label, attrs: { for: `${name}-${item.id}` } })]));
  return { node: el('fieldset', { class: 'seg' }, [el('legend', { class: 'sr-only', text: legend }), ...parts]), inputs };
}

/** The rain legend: one bar that fades through the colour stops, with the stop values under it (positions by log10(mm), as the pictures are made). */
function rainLegend(scale) {
  const logs = scale.stops.map(([mm]) => Math.log10(mm));
  const at = (mm) => (100 * (Math.log10(mm) - logs[0])) / (logs[logs.length - 1] - logs[0]);
  const bar = el('span', { class: 'legend-bar' });
  const ok = scale.stops.every(([, colour]) => HEX.test(colour));
  if (ok) bar.style.background = `linear-gradient(to right, ${scale.stops.map(([mm, colour]) => `${colour} ${at(mm).toFixed(1)}%`).join(', ')})`;
  const ticks = el('span', { class: 'legend-ticks' }, scale.stops.map(([mm]) => {
    const tick = el('span', { class: 'tick', text: String(mm) });
    tick.style.left = `${at(mm).toFixed(1)}%`;
    return tick;
  }));
  return [el('li', { class: 'caption', text: scale.unit }), el('li', { class: 'legend-gradient' }, [bar, ticks])];
}

function legendNodes(kind, scale, colours) {
  if (kind === 'agreement') {
    const items = Object.entries(colours).map(([name, colour]) => el('li', {}, [swatch(colour), el('span', { text: AGREEMENT_WORDS[name] ?? name })]));
    return [...items, el('li', {}, [el('span', { class: 'swatch empty' }), el('span', { text: 'Both dry: no colour' })])];
  }
  return rainLegend(scale);
}

function swatch(colour) {
  const node = el('span', { class: 'swatch' });
  if (HEX.test(colour)) node.style.background = colour; // from our own config / manifest, checked as #rrggbb
  return node;
}

/**
 * Build the tools inside `root`. `handlers` = { onMode(id), onModel(id), onStep(step), onMyPlace(), onNow() }.
 * Returns { update({ model, mode, steps, step, when, note, legendKind, hasPlace }) }.
 */
export function createControls({ root, cfg, manifest, options, selectedModel, handlers }) {
  const view = segmented('map-mode', 'Map view', MODES, 'auto', handlers.onMode);
  const model = segmented('map-model', 'Model shown on the map', options, selectedModel, handlers.onModel);
  const myPlace = el('button', { class: 'my-place', text: 'My place', attrs: { type: 'button', 'aria-label': 'Fly back to the chosen place' } });
  myPlace.disabled = true;
  myPlace.addEventListener('click', () => handlers.onMyPlace());
  const note = el('p', { class: 'map-note', attrs: { role: 'status' } });
  const legend = el('ul', { class: 'legend', attrs: { 'aria-label': 'Map legend' } });
  const prev = el('button', { text: '◀', attrs: { type: 'button', 'aria-label': 'Previous 6-hour block' } });
  const next = el('button', { text: '▶', attrs: { type: 'button', 'aria-label': 'Next 6-hour block' } });
  const nowButton = el('button', { class: 'now-button', text: 'Now', attrs: { type: 'button', 'aria-label': 'Show the 6-hour block that is under way' } });
  nowButton.addEventListener('click', () => handlers.onNow());
  const range = el('input', { attrs: { type: 'range', min: '0', 'aria-label': 'Forecast block shown on the map' } });
  const when = el('span', { class: 'when-label' });
  let steps = [];
  const move = (delta) => {
    const i = steps.indexOf(Number(range.dataset.step)) + delta;
    if (i >= 0 && i < steps.length) handlers.onStep(steps[i]);
  };
  prev.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  range.addEventListener('input', () => handlers.onStep(steps[Number(range.value)]));
  fill(root, [el('div', { class: 'map-top' }, [view.node, model.node, myPlace]),
    el('div', { class: 'map-bottom' }, [note, legend, el('div', { class: 'timebar' }, [prev, range, next, nowButton]), when])]);

  return {
    update(s) {
      steps = s.steps;
      const i = Math.max(0, steps.indexOf(s.step));
      range.max = String(steps.length - 1);
      range.value = String(i);
      range.dataset.step = String(s.step);
      range.setAttribute('aria-valuetext', s.when);
      myPlace.disabled = !s.hasPlace;
      prev.disabled = i === 0;
      next.disabled = i === steps.length - 1;
      when.textContent = s.when;
      note.textContent = s.note ?? '';
      view.inputs.forEach((input) => { input.checked = input.value === s.mode; });
      model.inputs.forEach((input) => { input.checked = input.value === s.model; });
      fill(legend, s.legendKind ? legendNodes(s.legendKind, cfg.colour_scale, manifest.frames?.agreement_colours ?? {}) : []);
    },
  };
}
