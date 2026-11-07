// Draws the plan into the page. Input is the plain data from view.js; every text goes in with textContent (see dom.js).
import { el, fill } from './dom.js';
import { clock, dayKey, dayLabel } from './time.js';
import { dropsSvg } from './drops.js';
import { acceptText, atMost, blockText, blockWord, CONFIDENCE_WORD, modelsText, totalsLines, windowText } from './wording.js';

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

export function activityNote(activity, levels) {
  const [from, to] = activity.hours;
  const hours = from === 0 && to === 24 ? 'any time of day' : `${String(from).padStart(2, '0')}:00–${String(to).padStart(2, '0')}:00`;
  const max = levels.findIndex((level) => level.id === activity.max_level);
  return `${activity.blurb} A good time has ${acceptText(levels, max)} in a 6-hour block. Hours used: ${hours}. Shortest window shown: ${activity.min_blocks * 6} hours.`;
}

export function renderWindows(node, view, activity) {
  if (!view.windows.length) {
    fill(node, el('li', { class: 'empty', text: `No time of at least ${activity.min_blocks * 6} hours fits in your hours in the forecast.` }));
    return;
  }
  fill(node, view.windows.map((w, i) => {
    const hours = w.blocks * 6;
    return el('li', { class: `window conf-${w.confidence}` }, [
      el('p', { class: 'when', text: `${i + 1}. ${windowText(w, view.zone)}` }),
      el('p', { class: 'how' }, [el('span', { class: 'badge', text: BADGE[w.confidence] }), el('span', { text: ` ${atMost(view.levels, w.level)} · ${hours} hours` })]),
      el('p', { class: 'why', text: CONFIDENCE_WORD[w.confidence] }),
    ]);
  }));
}

/** What a screen reader hears for one tile: the time, the level, where the models differ, whether it fits, and what pressing it does. */
function blockLabel(block, zone, view, pressable) {
  const parts = [`${blockText(block, zone)}: ${view.levels[block.level].label}`];
  if (block.differ && !block.single) parts.push(`the models differ (${modelsText(view.levels, block, view.labels)})`);
  if (block.single && !block.past) parts.push('one model only');
  if (block.past) parts.push('already over');
  else if (!block.inHours) parts.push('outside your hours');
  else if (block.usable) parts.push('fits what you want to do');
  return pressable ? `${parts.join(', ')}. Show on the map` : parts.join(', ');
}

/**
 * One 6-hour tile of a day: three drops (as many filled as the level), the word of the wetter model's level, the start time, and small marks (a tick when the block
 * fits what you want to do, "models differ" or "one model" in words). With a map (`pick`) the tile is a button that shows this block on the map.
 */
function blockCell(block, zone, view, pick, selected) {
  const note = block.past ? null : block.single ? 'one model' : block.differ ? 'models differ' : null;
  const fits = block.usable && !block.past;
  const inner = [
    dropsSvg(block.level),
    el('span', { class: 'word', text: blockWord(view.levels, block) }),
    el('span', { class: 'time', text: clock(block.startMs, zone) }),
    note ? el('span', { class: 'flag', text: note }) : null,
    fits ? el('span', { class: 'tick', text: '✓', attrs: { 'aria-hidden': 'true' } }) : null,
  ];
  const step = pick ? pick.stepOf(block) : null;
  const chosen = step !== null && step === selected;
  let content;
  if (step !== null) {
    content = el('button', { class: 'block-hit', attrs: { type: 'button', 'aria-pressed': String(chosen), 'aria-label': blockLabel(block, zone, view, true) } }, inner);
    content.addEventListener('click', () => pick.onPick(step));
  } else {
    content = el('span', { class: 'block-hit' }, inner);
  }
  const cls = `block level-${block.level}${fits ? ' fits' : ''}${block.past ? ' past' : ''}${block.inHours ? '' : ' off'}${chosen ? ' chosen' : ''}`;
  return el('li', { class: cls, attrs: step === null ? { role: 'group', 'aria-label': blockLabel(block, zone, view, false) } : {} }, content);
}

/** `pick` = { stepOf(block) -> step or null, onPick(step) } or null when there is no map; `selected` = the step shown on the map. */
export function renderDays(node, view, pick = null, selected = null) {
  fill(node, view.days.map((d, i) => el('article', { class: 'day' }, [
    el('h4', { text: i === 0 ? `${d.label} (today)` : d.label }),
    el('p', { class: 'verdict', text: d.verdict }),
    el('ol', { class: 'blocks', attrs: { 'aria-label': `Blocks of ${d.label}` } }, d.blocks.map((b) => blockCell(b, view.zone, view, pick, selected))),
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
    'The map is smoothed between forecast grid points, so a single small spot can look lighter on it; the plan uses the exact value at the grid point nearest your place.',
    'This is not an official weather warning.',
  ];
  if (typeof s.name === 'string' && typeof s.licence === 'string') lines.push(`Data: ${s.name}, licence ${s.licence}.`);
  fill(node, lines.map((t) => el('p', { text: t })));
}
