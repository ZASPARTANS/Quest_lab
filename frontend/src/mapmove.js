// How the map view moves and what it marks (split out of mapview.js in PLAN-016, decision D47): the marker of the chosen place, the flight to a place, the move to a
// place picked on the map itself, and the view the live layer needs. Every function takes the shared context of the map view: ctx = { map, container, state }.
import { Marker } from 'maplibre-gl';

/** Mark the chosen place (one marker, moved when the place changes). */
export function showPlace(ctx, lat, lon) {
  const { map, state } = ctx;
  if (!state.marker) {
    const dot = document.createElement('div');
    dot.className = 'place-marker';
    dot.setAttribute('role', 'img');
    dot.setAttribute('aria-label', 'Chosen place');
    state.marker = new Marker({ element: dot }).setLngLat([lon, lat]).addTo(map);
  } else {
    state.marker.setLngLat([lon, lat]);
  }
}

/** Fly to the place (or jump, with reduced motion); `plan` is from flightPlan(). data-flying says when the move is over; `reflect()` refreshes the data- attributes. */
export function fly(ctx, lat, lon, plan, reflect) {
  const { map, container } = ctx;
  const data = container.dataset;
  map.stop(); // end any drag inertia or earlier flight first, so its 'moveend' cannot mark THIS flight as finished
  data.flying = 'true';
  map.once('moveend', () => { data.flying = 'false'; reflect(); });
  const target = { center: [lon, lat], zoom: plan.zoom };
  if (plan.animate) map.flyTo({ ...target, duration: plan.duration, essential: true });
  else map.jumpTo(target);
}

/** Where the map is looking: bounds, zoom and the size of the map in screen pixels (the map is never rotated or tilted). */
export function getView(ctx) {
  const { map, container } = ctx;
  const b = map.getBounds();
  return { bounds: { west: b.getWest(), east: b.getEast(), south: b.getSouth(), north: b.getNorth() }, zoom: map.getZoom(), width: container.clientWidth, height: container.clientHeight };
}

/** Move the view to a place picked on the map itself: keep the zoom, no flight. */
export function recentre(ctx, lat, lon, animate) {
  if (animate) ctx.map.easeTo({ center: [lon, lat], duration: 600 });
  else ctx.map.jumpTo({ center: [lon, lat] });
}
