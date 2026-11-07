// The map side of the page: joins the MapLibre view, its tools and the choices of the plan (place, block, model). Loaded on demand by app.js.
import { createControls } from './mapcontrols.js';
import { createMapView } from './mapview.js';
import { allSteps, chooseFrame, firstUpcomingStep, flightPlan, frameUrl, modelOptions, prefersReducedMotion, shouldFly } from './mapstate.js';
import { clock, dayKey, dayLabel } from './time.js';

const HOUR_MS = 3600 * 1000;

/**
 * `o` = { cfg, manifest, base, labels, container, toolsRoot, onPickPlace(lat, lon), onStep(step), onProblem(error) }.
 * Returns { setPlace(place, source), setStep(step), setZone(zone, isPlace), step() }.
 */
export async function createMapApp(o) {
  const { cfg, manifest, base, labels, container } = o;
  const steps = allSteps(manifest);
  const options = modelOptions(manifest, labels);
  const wanted = cfg.map.start_model;
  const state = { model: options.some((x) => x.id === wanted) ? wanted : options[0]?.id, mode: 'auto', step: firstUpcomingStep(manifest, Date.now()), zone: 'UTC', hasPlace: false, url: undefined };
  const view = createMapView({ container, cfg, manifest, onClick: o.onPickPlace, onProblem: o.onProblem });

  const whenText = () => {
    const end = Date.parse(manifest.run) + state.step * HOUR_MS;
    const start = end - manifest.interval_hours * HOUR_MS;
    const day = dayLabel(dayKey((start + end) / 2, state.zone));
    return `${day} ${clock(start, state.zone)}–${clock(end, state.zone)} (${state.hasPlace ? state.zone : 'UTC'})`;
  };

  const controls = createControls({ root: o.toolsRoot, cfg, manifest, options, selectedModel: state.model, handlers: {
    onMode: (mode) => { state.mode = mode; view.setMode(mode); refresh(); },
    onModel: (model) => { state.model = model; refresh(); },
    onStep: (step) => setStep(step),
  } });

  async function refresh() {
    const choice = chooseFrame(manifest, state.model, state.step, labels);
    container.dataset.model = state.model ?? '';
    container.dataset.frame = choice.kind ? `${choice.kind}_${state.step}` : 'none';
    controls.update({ steps, step: state.step, model: state.model, mode: state.mode, when: whenText(), note: choice.note, legendKind: choice.kind === 'agreement' ? 'agreement' : choice.kind ? 'rain' : null });
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
  }

  function setPlace(place, source) {
    state.hasPlace = true;
    view.showPlace(place.lat, place.lon);
    const reduced = prefersReducedMotion((q) => window.matchMedia(q));
    if (shouldFly(source)) view.fly(place.lat, place.lon, flightPlan(reduced, cfg.map));
    else view.recentre(place.lat, place.lon, !reduced);
    refresh();
  }

  await view.ready;
  await refresh();
  view.onceIdle(() => { container.dataset.ready = 'true'; });
  o.onStep(state.step);
  return { setPlace, setStep, step: () => state.step, setZone: (zone) => { if (zone !== state.zone) { state.zone = zone; refresh(); } } };
}
