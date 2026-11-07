// The three small rain drops of a day-view tile (plan PLAN-011 step 11.3): as many drops are filled as the rain level (0 none, 1 light, 2 moderate, 3 heavy).
// A second signal next to the colour and the word, so a red tile reads as rain and not as heat. Drawn as inline SVG, no image file, no markup from text.
const DROP = 'M5 0.8 C5 0.8 1.3 5.2 1.3 7.6 A3.7 3.7 0 0 0 8.7 7.6 C8.7 5.2 5 0.8 5 0.8 Z'; // a drop in a 10 x 10 box
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Which of the three drops are filled for a level index: level 2 gives [true, true, false]. */
export function dropStates(level, count = 3) {
  return Array.from({ length: count }, (_, i) => i < level);
}

/** The drops as an SVG element (decorative: the tile's word and label say the same). */
export function dropsSvg(level) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 30 10');
  svg.setAttribute('class', 'drops');
  svg.setAttribute('aria-hidden', 'true');
  dropStates(level).forEach((filled, i) => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', DROP);
    path.setAttribute('transform', `translate(${i * 10} 0)`);
    path.setAttribute('class', filled ? 'drop on' : 'drop');
    svg.appendChild(path);
  });
  return svg;
}
