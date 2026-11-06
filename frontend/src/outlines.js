// Coastlines and country borders from Natural Earth (public domain) through the world-atlas package, as GeoJSON lines.
// Lines are cut where they cross the date line, so they are not drawn straight across the whole map.
import { mesh } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';
import { splitAtDateLine } from './geo.js';

function lines(geometry) {
  return { type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: splitAtDateLine(geometry.coordinates) } };
}

export const coastlines = lines(mesh(world, world.objects.land));
export const borders = lines(mesh(world, world.objects.countries, (a, b) => a !== b));
