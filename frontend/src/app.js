// The page: wires the place choice, the activity choice and the plan together. All forecast maths is in plan.js / windows.js / view.js.
// Privacy: the position, the saved places and the settings stay in this browser; only a typed search text goes out (geocode.js, D27).
import activities from '../../config/activities.json';
import config from '../../config/frontend.json';
import './badge.js';
import { bufferGetter, loadManifest, locationAlreadyAllowed, maxTileBytes } from './data.js';
import { byId, el, fill } from './dom.js';
import { searchPlaces, searchText } from './geocode.js';
import { addPlace, cleanCoordinates, loadSaved, readAddress, removePlace, samePlace, storeSaved, writeAddress } from './places.js';
import { buildBlocks } from './plan.js';
import { atMost, levelLegendText } from './wording.js';
import { applyLevelColours } from './levelcolours.js';
import { activityNote, renderAbout, renderActivities, renderFreshness, renderDays, renderResults, renderSaved, renderTotals, renderWindows } from './render.js';
import { clock, dayKey, dayLabel, deviceZone, offsetLabel } from './time.js';
import { mapPointName } from './mapstate.js';
import * as pageMap from './pagemap.js';
import { nameOfPosition } from './reverse.js';
import { findPosition, onePerTime } from './locate.js';
import { loadSeries } from './tiles.js';
import { buildView } from './view.js';
import { dataPath } from './sitepath.js';

const cfg = { ...config, data_url_path: dataPath(import.meta.env.BASE_URL, config.data_url_path) }; // the site may live in a sub-folder (GitHub Pages project site)

const LIST = [...activities.activities, activities.custom];
const IDS = LIST.map((a) => a.id);
const MESSAGES = {
  denied: 'Location is switched off for this site. Search for a place instead.',
  unavailable: 'Your location could not be found. Search for a place instead.',
  timeout: 'Finding your location is taking too long. Press "Use my location" to try again, or search for a place instead.',
  unsupported: 'This browser cannot share its location. Search for a place instead.',
};
const state = { manifest: null, getter: null, place: null, fromDevice: false, activityId: activities.default_activity,
  customLevel: activities.custom.default_level, saved: [], blocks: new Map(), tiles: new Map(), token: 0,
  map: null, hasMap: false, step: null, lastView: null };
const ui = {};

const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => { throw new Error('storage blocked'); } }; // the page works, it just cannot remember
  }
})();

const setStatus = (text) => { ui.status.textContent = text; };
const currentActivity = () => {
  const a = LIST.find((x) => x.id === state.activityId);
  return a.id === 'custom' ? { ...a, max_level: state.customLevel } : a;
};

function loadSettings() {
  try {
    const s = JSON.parse(storage.getItem(cfg.saved_places.settings_key) ?? '{}');
    if (IDS.includes(s.activity)) state.activityId = s.activity;
    if (activities.custom.level_choices.includes(s.accept)) state.customLevel = s.accept;
  } catch {
    // damaged or blocked settings are ignored: the defaults stay
  }
}

function storeSettings() {
  try {
    storage.setItem(cfg.saved_places.settings_key, JSON.stringify({ activity: state.activityId, accept: state.customLevel }));
  } catch {
    // cannot remember: fine
  }
}

function blocksFor(place) {
  const key = `${place.lat},${place.lon}`;
  if (!state.blocks.has(key)) {
    const promise = loadSeries(cfg.data_url_path, state.manifest, place.lat, place.lon, state.getter, state.tiles)
      .then((series) => buildBlocks(state.manifest, series));
    state.blocks.set(key, promise);
    promise.catch(() => state.blocks.delete(key));
  }
  return state.blocks.get(key);
}

function viewOptions(place) {
  const m = state.manifest;
  return { zone: place.zone ?? deviceZone(), nowMs: Date.now(), quantumMm: m.quantum_mm, intervalHours: m.interval_hours, models: m.agreement.models,
    minRemaining: activities.current_block_min_remaining_fraction, daysShown: activities.days_shown, windowsShown: activities.windows_shown,
    totalsDays: activities.totals_days, levels: activities.levels, labels: cfg.model_labels };
}

const withMap = (fn) => pageMap.withMap(state, fn);
const cardPick = () => pageMap.cardPick(state, withMap);

function mapStep(step) {
  state.step = step;
  if (state.lastView) renderDays(ui.days, state.lastView, cardPick(), step);
}

function pickOnMap(lat, lon) {
  const where = cleanCoordinates(lat, lon);
  if (where) showPlace({ name: mapPointName(where.lat, where.lon), ...where, zone: null }, false, 'map'); // device time zone, labelled (D30)
}

function draw(place, act, view) {
  const now = Date.now();
  ui.plan.hidden = false;
  ui.title.textContent = place.name;
  ui.meta.textContent = `Now ${dayLabel(dayKey(now, view.zone))} ${clock(now, view.zone)} (${offsetLabel(now, view.zone)}${place.zone ? '' : ", this device's time zone"})`;
  const isSaved = state.saved.some((p) => samePlace(p, place));
  ui.save.textContent = isSaved ? '★ Saved (press to remove)' : '☆ Save this place';
  ui.save.setAttribute('aria-pressed', String(isSaved));
  ui.note.textContent = activityNote(act, activities.levels);
  ui.customBox.hidden = state.activityId !== 'custom';
  renderWindows(ui.windows, view, act);
  state.lastView = view;
  renderDays(ui.days, view, cardPick(), state.step);
  withMap((m) => m.setZone(view.zone));
  renderTotals(ui.totals, view, cfg.model_labels);
  renderAbout(ui.about, state.manifest, view.zone, !place.zone, cfg.credit_lines);
}

async function render() {
  const token = ++state.token;
  if (!state.place) {
    ui.plan.hidden = true;
    ui.welcome.hidden = false;
    return renderSavedList();
  }
  if (!state.manifest) return undefined; // the forecast list is still loading; chooseStart() draws the plan once it is there (E033)
  ui.welcome.hidden = true;
  const place = state.place;
  try {
    const blocks = await blocksFor(place);
    if (token !== state.token) return undefined;
    draw(place, currentActivity(), buildView(blocks, currentActivity(), viewOptions(place)));
  } catch (error) {
    if (token !== state.token) return undefined;
    console.error('the forecast for this place could not be shown:', error); // technical detail for developers only (decision D9)
    ui.plan.hidden = true;
    setStatus('The forecast for this place could not be loaded. Please try again in a few minutes.');
  }
  return renderSavedList();
}

async function renderSavedList() {
  const act = currentActivity();
  const token = state.token;
  ui.savedBox.hidden = state.saved.length === 0; // nothing saved: no empty box (the Save button under the place name is the way to add one)
  const row = (place, summary) => ({ place, summary, active: Boolean(state.place) && samePlace(place, state.place) });
  renderSaved(ui.saved, state.saved.map((p) => row(p, 'Loading…')), showSaved, forget);
  const items = await Promise.all(state.saved.map((place) => blocksFor(place)
    .then((blocks) => row(place, buildView(blocks, act, viewOptions(place)).summary))
    .catch(() => row(place, 'Could not be loaded.'))));
  if (token === state.token) renderSaved(ui.saved, items, showSaved, forget);
}

function showSaved(place) {
  showPlace(place, false, 'saved');
}

function showPlace(place, fromDevice, source) {
  state.place = place;
  ui.input.value = place.name; // the box always shows the place that is chosen now, never an earlier search
  withMap((m) => m.setPlace(place, source));
  state.fromDevice = fromDevice;
  fill(ui.results, []);
  setStatus('');
  history.replaceState(null, '', fromDevice ? location.pathname : location.pathname + writeAddress(place, state.activityId, state.customLevel));
  render();
}

const useLocation = onePerTime(async () => {
  try {
    const where = await findPosition(cfg.geolocation, setStatus);
    // shortcut: a place found by the device has no known time zone, so the device's own zone is used and labelled (decision D24, A8)
    const place = { name: 'Your location', ...where, zone: null };
    showPlace(place, true, 'location');
    nameDevicePlace(place);
  } catch (error) {
    setStatus(MESSAGES[error?.code] ?? MESSAGES.unavailable);
  }
});

/** Replace "Your location" by the place name when the reverse lookup answers (decision D32); on any failure the name stays. */
async function nameDevicePlace(place) {
  try {
    const name = await nameOfPosition(cfg.reverse_geocoder, place.lat, place.lon, (url, init) => fetch(url, init));
    if (!name) return;
    place.name = name;
    if (state.place === place) {
      ui.input.value = name;
      ui.title.textContent = name;
    }
  } catch (error) {
    console.error('the name of the position could not be looked up:', error); // developers only; the page keeps "Your location"
  }
}

async function search(event) {
  event.preventDefault();
  if (!searchText(ui.input.value, cfg.geocoder)) return setStatus(`Type at least ${cfg.geocoder.min_chars} letters of a place name.`);
  setStatus('Searching…');
  try {
    const places = await searchPlaces(cfg.geocoder, ui.input.value, (url, init) => fetch(url, init));
    if (!places.length) return setStatus('No place found. Check the spelling, or try a larger town nearby.');
    setStatus('');
    return places.length === 1 ? showPlace(places[0], false, 'search') : renderResults(ui.results, places, (p) => showPlace(p, false, 'search'));
  } catch (error) {
    console.error('place search failed:', error);
    return setStatus('Place search is not available right now. You can still use your location or a saved place.');
  }
}

function forget(place) {
  state.saved = removePlace(state.saved, place);
  persistSaved();
  render();
}

function persistSaved() {
  if (!storeSaved(storage, cfg.saved_places.storage_key, state.saved)) setStatus('This browser does not let the page remember places.');
}

function toggleSave() {
  if (!state.place) return;
  if (state.saved.some((p) => samePlace(p, state.place))) {
    forget(state.place);
    return;
  }
  const result = addPlace(state.saved, state.place, cfg.saved_places.max);
  if (!result.added) return setStatus(`You can save ${cfg.saved_places.max} places. Remove one first.`);
  state.saved = result.places;
  persistSaved();
  return render();
}

function chooseActivity(id) {
  state.activityId = id;
  storeSettings();
  if (state.place && !state.fromDevice) history.replaceState(null, '', location.pathname + writeAddress(state.place, id, state.customLevel));
  render();
}

function chooseAccept() {
  const value = ui.customAccept.value;
  if (!activities.custom.level_choices.includes(value)) return;
  state.customLevel = value;
  storeSettings();
  if (state.place && !state.fromDevice) history.replaceState(null, '', location.pathname + writeAddress(state.place, state.activityId, state.customLevel)); // else a reload would bring back the old accept= (E040)
  render();
}

async function chooseStart() {
  const fromAddress = readAddress(location.search, IDS, activities.custom.level_choices);
  if (fromAddress.activity) state.activityId = fromAddress.activity;
  if (fromAddress.accept !== null) state.customLevel = fromAddress.accept;
  renderActivities(ui.activities, LIST, state.activityId, chooseActivity);
  if (state.place) return render(); // the visitor chose a place while the forecast was loading: keep it (E033)
  if (fromAddress.place) return showPlace(fromAddress.place, false, 'address');
  if (await locationAlreadyAllowed()) return useLocation();
  if (state.saved.length) return showPlace(state.saved[0], false, 'saved');
  return render();
}

function collect() {
  for (const id of ['status', 'welcome', 'plan', 'title', 'meta', 'save', 'note', 'windows', 'days', 'totals', 'about', 'saved', 'saved-box', 'results',
    'freshness', 'attribution', 'freshness-warning', 'activities', 'level-legend', 'custom-box', 'custom-accept', 'search-form', 'search-input', 'use-location', 'map', 'map-message', 'map-tools']) {
    ui[id.replace(/-(.)/g, (_, c) => c.toUpperCase())] = byId(id);
  }
  ui.input = ui.searchInput;
  ui.levelLegend.textContent = levelLegendText(activities.levels);
  applyLevelColours(document.documentElement, cfg.plan_levels, activities.levels);
  fill(ui.customAccept, activities.custom.level_choices.map((id) => el('option', { text: atMost(activities.levels, activities.levels.findIndex((l) => l.id === id)), attrs: { value: id } })));
}

async function main() {
  pageMap.preloadMap(); // the map code downloads while the manifest loads
  collect();
  loadSettings();
  state.saved = loadSaved(storage, cfg.saved_places.storage_key, cfg.saved_places.max);
  ui.customAccept.value = state.customLevel;
  ui.useLocation.addEventListener('click', useLocation);
  ui.input.addEventListener('focus', () => ui.input.select()); // typing replaces the shown place name
  ui.searchForm.addEventListener('submit', search);
  ui.save.addEventListener('click', toggleSave);
  ui.customAccept.addEventListener('change', chooseAccept);
  try {
    state.manifest = await loadManifest(cfg.data_url_path, cfg.manifest_file, cfg.max_manifest_bytes);
  } catch (error) {
    console.error('forecast data could not be loaded:', error);
    return setStatus('The forecast could not be loaded. Please try again in a few minutes.');
  }
  state.getter = bufferGetter(maxTileBytes(state.manifest));
  state.map = pageMap.startMap({ state, ui, cfg, onPick: pickOnMap, onStep: mapStep, redrawBlocks: () => state.lastView && renderDays(ui.days, state.lastView, null, null) });
  setInterval(() => { if (!document.hidden) { render(); renderFreshness(ui, state.manifest, Date.now(), cfg.freshness); } }, cfg.refresh_seconds * 1000);
  renderFreshness(ui, state.manifest, Date.now(), cfg.freshness);
  return chooseStart();
}

main();
