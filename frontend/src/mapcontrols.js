// The tools that float on the map: view (Auto / Flat / Globe), model, legend, and the time bar. Built with DOM text only (see dom.js).
import { el, fill } from './dom.js';

const MODES = [{ id: 'auto', label: 'Auto' }, { id: 'flat', label: 'Flat' }, { id: 'globe', label: 'Globe' }];
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

function legendNodes(kind, scale, colours) {
  if (kind === 'agreement') {
    const items = Object.entries(colours).map(([name, colour]) => el('li', {}, [swatch(colour), el('span', { text: AGREEMENT_WORDS[name] ?? name })]));
    return [...items, el('li', {}, [el('span', { class: 'swatch empty' }), el('span', { text: 'Both dry: no colour' })])];
  }
  return [el('li', { class: 'caption', text: scale.unit }), ...scale.stops.map(([mm, colour]) => el('li', {}, [swatch(colour), el('span', { text: `${mm}` })]))];
}

function swatch(colour) {
  const node = el('span', { class: 'swatch' });
  node.style.background = colour; // the colours come from our own config / manifest and were checked as #rrggbb
  return node;
}

/**
 * Build the tools inside `root`. `handlers` = { onMode(id), onModel(id), onStep(step) }.
 * Returns { update({ model, mode, steps, step, when, note, legendKind }) }.
 */
export function createControls({ root, cfg, manifest, options, selectedModel, handlers }) {
  const view = segmented('map-mode', 'Map view', MODES, 'auto', handlers.onMode);
  const model = segmented('map-model', 'Model shown on the map', options, selectedModel, handlers.onModel);
  const note = el('p', { class: 'map-note', attrs: { role: 'status' } });
  const legend = el('ul', { class: 'legend', attrs: { 'aria-label': 'Map legend' } });
  const prev = el('button', { text: '◀', attrs: { type: 'button', 'aria-label': 'Previous 6-hour block' } });
  const next = el('button', { text: '▶', attrs: { type: 'button', 'aria-label': 'Next 6-hour block' } });
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
  fill(root, [el('div', { class: 'map-top' }, [view.node, model.node]),
    el('div', { class: 'map-bottom' }, [note, legend, el('div', { class: 'timebar' }, [prev, range, next]), when])]);

  return {
    update(s) {
      steps = s.steps;
      const i = Math.max(0, steps.indexOf(s.step));
      range.max = String(steps.length - 1);
      range.value = String(i);
      range.dataset.step = String(s.step);
      range.setAttribute('aria-valuetext', s.when);
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
