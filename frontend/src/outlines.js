// Coastlines and country borders from Natural Earth 1:50m (public domain) through the world-atlas package, as GeoJSON lines (the 50 m detail was
// the user's choice, D34: real coast shapes at regional zoom, about 197 kB more to download than 110 m, cached after the first visit).
// Lines are cut where they cross the date line, so they are not drawn straight across the whole map.
import { mesh } from 'topojson-client';
import world from 'world-atlas/countries-50m.json';
import { splitAtDateLine } from './geo.js';

function lines(geometry) {
  return { type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: splitAtDateLine(geometry.coordinates) } };
}

export const coastlines = lines(mesh(world, world.objects.land));
export const borders = lines(mesh(world, world.objects.countries, (a, b) => a !== b));
