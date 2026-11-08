// What the map does when the plan's place changes (split out of mapapp.js in PLAN-016, decision D47): the marker, then a flight (a place chosen outside the map)
// or a plain recentre (a click on the map itself), with reduced motion respected, then a redraw of the frame.
import { flightPlan, prefersReducedMotion, shouldFly } from './mapstate.js';

/**
 * `ctx` = { view, cfg, state, refresh }: the map view, the page config, the state of the map app (it receives `hasPlace` and `place`) and its redraw function.
 * Returns setPlace(place, source), where `source` says how the place was chosen (location, search, saved, address, map).
 */
export function placeSetter({ view, cfg, state, refresh }) {
  return function setPlace(place, source) {
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
  };
}
