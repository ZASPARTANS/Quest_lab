// Draws the plan into the page. Input is the plain data from view.js; every text goes in with textContent (see dom.js).
import { el, fill } from './dom.js';
import { clock, dayKey, dayLabel } from './time.js';
import { blockText, CONFIDENCE_WORD, STATE_WORD, totalsLines, windowText } from './wording.js';

const BADGE = { sure: 'Both models agree', uncertain: 'Models disagree in part', 'one-model': 'One model only' };

export function renderActivities(container, list, selected, onChange) {
  fill(container, list.map((a) => {
    const id = `activity-${a.id}`;
    const input = el('input', { attrs: { type: 'radio', name: 'activity', id, value: a.id } });
    input.checked = a.id === selected;
    input.addEventListener('change', () => onChange(a.id));
    return el('span', { class: 'chip' }, [input, el('label', { text: a.label, attrs: { for: id } })]);
  }));
}

export function activityNote(activity, wetMm) {
  const [from, to] = activity.hours;
  const hours = from === 0 && to === 24 ? 'any time of day' : `${String(from).padStart(2, '0')}:00–${String(to).padStart(2, '0')}:00`;
  return `${activity.blurb} Wet means ${wetMm} mm or more in a 6-hour block (rain is rounded to 0.1 mm). Hours used: ${hours}. Shortest window shown: ${activity.min_blocks * 6} hours.`;
}

export function renderWindows(node, view, activity) {
  if (!view.windows.length) {
    fill(node, el('li', { class: 'empty', text: `No dry stretch of at least ${activity.min_blocks * 6} hours in your hours in the forecast.` }));
    return;
  }
  fill(node, view.windows.map((w, i) => {
    const hours = w.blocks * 6;
    return el('li', { class: `window conf-${w.confidence}` }, [
      el('p', { class: 'when', text: `${i + 1}. ${windowText(w, view.zone)}` }),
      el('p', { class: 'how' }, [el('span', { class: 'badge', text: BADGE[w.confidence] }), el('span', { text: ` ${hours} hours` })]),
      el('p', { class: 'why', text: CONFIDENCE_WORD[w.confidence] }),
    ]);
  }));
}

function blockCell(block, zone) {
  const flags = [block.past ? 'over' : null, block.inHours ? null : 'outside your hours', block.single && !block.past ? 'one model only' : null].filter(Boolean);
  return el('li', { class: `block state-${block.state}${block.past ? ' past' : ''}${block.inHours ? '' : ' off'}` }, [
    el('span', { class: 'time', text: blockText(block, zone) }),
    el('span', { class: 'word', text: STATE_WORD[block.state] }),
    flags.length ? el('span', { class: 'flag', text: flags.join(', ') }) : null,
  ]);
}

export function renderDays(node, view) {
  fill(node, view.days.map((d, i) => el('article', { class: 'day' }, [
    el('h4', { text: i === 0 ? `${d.label} (today)` : d.label }),
    el('p', { class: 'verdict', text: d.verdict }),
    el('ol', { class: 'blocks', attrs: { 'aria-label': `Blocks of ${d.label}` } }, d.blocks.map((b) => blockCell(b, view.zone))),
  ])));
}

export function renderTotals(node, view, labels) {
  fill(node, view.totals.map((t) => {
    const lines = totalsLines(t, labels);
    return el('article', { class: 'total' }, [
      el('h4', { text: `Next ${t.days} days` }),
      el('p', { class: 'big', text: lines[0].strong }),
      el('p', { class: 'detail', text: lines[0].detail }),
      ...lines.slice(1).map((l) => el('p', { class: 'detail extra', text: l.detail })),
    ]);
  }));
}

export function renderSaved(node, items, onOpen, onRemove) {
  if (!items.length) {
    fill(node, el('li', { class: 'empty', text: 'Nothing saved yet. Choose a place, then press "Save this place".' }));
    return;
  }
  fill(node, items.map(({ place, summary, active }) => {
    const open = el('button', { class: 'open', attrs: { type: 'button' } }, [el('strong', { text: place.name }), el('span', { text: summary })]);
    open.addEventListener('click', () => onOpen(place));
    const remove = el('button', { class: 'remove', text: '×', attrs: { type: 'button', 'aria-label': `Remove ${place.name} from saved places` } });
    remove.addEventListener('click', () => onRemove(place));
    return el('li', { class: active ? 'saved active' : 'saved' }, [open, remove]);
  }));
}

export function renderResults(node, places, onPick) {
  fill(node, places.map((p) => {
    const b = el('button', { class: 'result', text: p.name, attrs: { type: 'button' } });
    b.addEventListener('click', () => onPick(p));
    return el('li', {}, b);
  }));
}

/** Footer facts from the manifest: which run, when retrieved, which zone the times are in. */
export function renderAbout(node, manifest, zone, zoneIsDevice) {
  const at = (iso) => `${dayLabel(dayKey(Date.parse(iso), 'UTC'))} ${clock(Date.parse(iso), 'UTC')} UTC`;
  const s = manifest.source ?? {};
  const lines = [
    `Forecast run: ${at(manifest.run)}. Retrieved: ${at(manifest.retrieved_at)}.`,
    `Times are local to the place (${zone}${zoneIsDevice ? ", this device's time zone" : ''}). Blocks are 6 hours long on the UTC clock, so in many places they start at odd times such as 05:30.`,
    'Two models are compared: IFS (ECMWF’s physics-based forecast) and AIFS (its machine-learning forecast). Agreement between them is not a probability of rain.',
    'This is not an official weather warning.',
  ];
  if (typeof s.name === 'string' && typeof s.licence === 'string') lines.push(`Data: ${s.name}, licence ${s.licence}.`);
  fill(node, lines.map((t) => el('p', { text: t })));
}
