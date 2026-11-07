// The map side of the page: joins the MapLibre view, its tools and the choices of the plan (place, block, model). Loaded on demand by app.js.
import { createControls } from './mapcontrols.js';
import { createLive } from './maplive.js';
import { createMapView } from './mapview.js';
import { allSteps, chooseFrame, firstUpcomingStep, flightPlan, frameUrl, modelOptions, prefersReducedMotion, shouldFly } from './mapstate.js';
import { clock, dayKey, dayLabel } from './time.js';

const HOUR_MS = 3600 * 1000;

/**
 * `o` = { cfg, manifest, base, labels, container, toolsRoot, getTile, tileCache, onPickPlace(lat, lon), onStep(step), onProblem(error) }.
 * Returns { setPlace(place, source), setStep(step), setZone(zone, isPlace), step() }.
 */
export async function createMapApp(o) {
  const { cfg, manifest, base, labels, container } = o;
  const steps = allSteps(manifest);
  const options = modelOptions(manifest, labels);
  const wanted = cfg.map.start_model;
  const state = { model: options.some((x) => x.id === wanted) ? wanted : options[0]?.id, mode: 'auto', step: firstUpcomingStep(manifest, Date.now()), zone: 'UTC', hasPlace: false, url: undefined };
  const view = createMapView({ container, cfg, manifest, onClick: o.onPickPlace, onProblem: o.onProblem });
  const live = createLive({ cfg, manifest, base, labels, getTile: o.getTile, tileCache: o.tileCache, view, container, onProblem: o.onProblem,
    current: () => ({ model: state.model, step: state.step, mode: state.mode }) });
  view.onMoveEnd(() => live.soon());

  const whenText = () => {
    const end = Date.parse(manifest.run) + state.step * HOUR_MS;
    const start = end - manifest.interval_hours * HOUR_MS;
    const day = dayLabel(dayKey((start + end) / 2, state.zone));
    const over = end <= Date.now() ? ' \u2013 already over' : ''; // a block that has passed is said so, never shown as if it were current
    return `${day} ${clock(start, state.zone)}\u2013${clock(end, state.zone)} (${state.hasPlace ? state.zone : 'UTC'})${over}`;
  };

  const controls = createControls({ root: o.toolsRoot, cfg, manifest, options, selectedModel: state.model, handlers: {
    onMode: (mode) => { state.mode = mode; view.setMode(mode); refresh(); live.update(); },
    onModel: (model) => { state.model = model; refresh(); live.update(); },
    onStep: (step) => setStep(step),
    onNow: () => setStep(firstUpcomingStep(manifest, Date.now())),
    onMyPlace: () => {
      if (!state.place) return;
      const reduced = prefersReducedMotion((q) => window.matchMedia(q));
      view.fly(state.place.lat, state.place.lon, flightPlan(reduced, cfg.map, state.place.source));
    },
  } });

  async function refresh() {
    const choice = chooseFrame(manifest, state.model, state.step, labels);
    container.dataset.model = state.model ?? '';
    container.dataset.frame = choice.kind ? `${choice.kind}_${state.step}` : 'none';
    controls.update({ steps, step: state.step, model: state.model, mode: state.mode, when: whenText(), note: choice.note, legendKind: choice.kind === 'agreement' ? 'agreement' : choice.kind ? 'rain' : null, hasPlace: state.hasPlace });
    const url = choice.kind ? frameUrl(base, manifest, choice.kind, state.step) : null;
    if (url === state.url) return; // the picture is already there: do not load it again
    state.url = url;
    await view.setFrame(url);
  }

  function setStep(step) {
    if (!steps.includes(step) || step === state.step) return;
    state.step = step;
    o.onStep(step);
    refresh();
    live.update();
  }

  function setPlace(place, source) {
    state.hasPlace = true;
    view.showPlace(place.lat, place.lon);
    const reduced = prefersReducedMotion((q) => window.matchMedia(q));
    if (shouldFly(source)) {
      state.place = { ...place, source };
      view.fly(place.lat, place.lon, flightPlan(reduced, cfg.map, source));
    } else {
      state.place = { ...place, source: state.place?.source ?? 'search' };
      view.recentre(place.lat, place.lon, !reduced);
    }
    refresh();
  }

  await view.ready;
  await refresh();
  view.onceIdle(() => { container.dataset.ready = 'true'; });
  o.onStep(state.step);
  return { setPlace, setStep, step: () => state.step, setZone: (zone) => { if (zone !== state.zone) { state.zone = zone; refresh(); } } };
}
