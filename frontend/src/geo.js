// Small pure helpers for map data (tested with `node --test`, see tests/frontend).

/**
 * Splits GeoJSON line coordinates wherever two neighbouring points are more than `maxJump` degrees of longitude apart.
 * Such a jump is the line crossing the date line (180 degrees); drawn as it is, the line would run straight across the whole map.
 * `lines` is an array of lines, each an array of [longitude, latitude]. Returns the new array of lines (pieces with fewer than 2 points are dropped).
 */
export function splitAtDateLine(lines, maxJump = 180) {
  const out = [];
  for (const line of lines) {
    let piece = [];
    for (const point of line) {
      if (piece.length && Math.abs(point[0] - piece[piece.length - 1][0]) > maxJump) {
        if (piece.length > 1) out.push(piece);
        piece = [];
      }
      piece.push(point);
    }
    if (piece.length > 1) out.push(piece);
  }
  return out;
}
