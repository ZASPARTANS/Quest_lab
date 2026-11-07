// Map decisions as pure functions (no DOM, no MapLibre): which frame to show, when to fly, the projection, WebGL2 and reduced motion.
// Tested in tests/frontend/mapstate.test.mjs. Frames are untrusted input; the manifest check (manifest.js) has already validated their paths.

const HOUR_MS = 3600 * 1000;
const FLY_SOURCES = new Set(['location', 'search', 'saved', 'address']); // a place chosen outside the map; a click ON the map does not fly

export const shouldFly = (source) => FLY_SOURCES.has(source);

/** Forecast step (hours after the run) of a block, or null if the block does not sit on the run's whole-hour axis. */
export function frameStep(manifest, block) {
  const hours = (block.endMs - Date.parse(manifest.run)) / HOUR_MS;
  return Number.isInteger(hours) ? hours : null;
}

/** All steps any model covers, ascending (AIFS reaches further than IFS). */
export function allSteps(manifest) {
  return [...new Set(Object.values(manifest.models).flatMap((m) => m.steps ?? []))].sort((a, b) => a - b);
}

/** The first step whose block is not over at `nowMs`; the last step if the forecast is all in the past. */
export function firstUpcomingStep(manifest, nowMs) {
  const steps = allSteps(manifest);
  const runMs = Date.parse(manifest.run);
  return steps.find((s) => runMs + s * HOUR_MS > nowMs) ?? steps[steps.length - 1];
}

/** Model choices for the map: each model that has frames, and 'both' when agreement frames exist. */
export function modelOptions(manifest, labels) {
  const files = manifest.frames?.files ?? {};
  const options = Object.keys(manifest.models).filter((m) => files[m]).map((id) => ({ id, label: labels[id] ?? id }));
  if (files.agreement) options.push({ id: 'both', label: 'Both models (agreement)' });
  return options;
}

/** Which frame kind to draw for a model choice and step: { kind, note }. kind is null when nothing can be drawn. */
export function chooseFrame(manifest, model, step, labels) {
  const files = manifest.frames?.files;
  if (!files) return { kind: null, note: 'No map frames are available.' };
  const has = (kind) => Boolean(files[kind]?.[String(step)]);
  if (model === 'both') {
    if (has('agreement')) return { kind: 'agreement', note: null };
    const fallback = manifest.agreement.models.find(has);
    return fallback ? { kind: fallback, note: `Only ${labels[fallback] ?? fallback} reaches this far, so the agreement cannot be shown.` } : { kind: null, note: 'No frame for this time.' };
  }
  return has(model) ? { kind: model, note: null } : { kind: null, note: `${labels[model] ?? model} does not reach this far.` };
}

/** URL of a frame below the data base URL, with the export time as a version (like the tiles), or null if the manifest has no such frame. */
export function frameUrl(base, manifest, kind, step) {
  const path = manifest.frames?.files?.[kind]?.[String(step)];
  if (typeof path !== 'string') return null;
  const version = typeof manifest.exported_at === 'string' ? `?v=${encodeURIComponent(manifest.exported_at)}` : '';
  return base + path + version;
}

/** MapLibre projection for a mode: 'auto' = a globe when zoomed out that flattens while zooming in (D31), 'globe' or 'flat' = fixed. */
export function projectionSpec(mode, cfg) {
  if (mode === 'globe') return { type: 'globe' };
  if (mode === 'flat') return { type: 'mercator' };
  return { type: ['interpolate', ['linear'], ['zoom'], cfg.fly.morph_from_zoom, 'vertical-perspective', cfg.fly.zoom, 'mercator'] };
}

/** What the map looks like now: 'globe', 'morph' (flattening) or 'flat', from the mode and the zoom (used for test hooks and the page state). */
export function effectiveView(mode, zoom, cfg) {
  if (mode === 'globe') return 'globe';
  if (mode === 'flat') return 'flat';
  if (zoom <= cfg.fly.morph_from_zoom) return 'globe';
  return zoom >= cfg.fly.zoom ? 'flat' : 'morph';
}

/** How to move to a chosen place: animated flight, or an instant jump when the system asks for reduced motion. */
export function flightPlan(reducedMotion, cfg) {
  return { zoom: cfg.fly.zoom, duration: reducedMotion ? 0 : cfg.fly.duration_ms, animate: !reducedMotion };
}

export function prefersReducedMotion(matchMedia) {
  try {
    return Boolean(matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch {
    return false;
  }
}

/** True if a WebGL2 context can be created (`makeCanvas` is injected so tests need no browser). */
export function webgl2Available(makeCanvas) {
  try {
    return Boolean(makeCanvas().getContext('webgl2'));
  } catch {
    return false;
  }
}

/** Name of a place chosen by clicking the map (no reverse lookup: the name only says what it is, decision D30). */
export function mapPointName(lat, lon) {
  return `Map point (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
}
