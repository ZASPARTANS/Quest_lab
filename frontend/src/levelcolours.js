// Colours of the four rain levels in the day view (plan PLAN-011 step 11.3). They live in config/frontend.json `plan_levels`; this file turns them into CSS
// variables on the page (--lv-0-bar, --lv-0-bg, --lv-0-text, ...), after checking every value is a plain #rrggbb colour.
const HEX = /^#[0-9a-fA-F]{6}$/;

/** [[variable name, colour]] for every level that has a colour entry; a missing or malformed colour is left out (the CSS fallback stays). */
export function levelColourVars(planLevels, levels) {
  const vars = [];
  levels.forEach((level, i) => {
    const entry = planLevels?.[level.id];
    for (const part of ['bar', 'bg', 'text']) if (HEX.test(entry?.[part] ?? '')) vars.push([`--lv-${i}-${part}`, entry[part]]);
  });
  return vars;
}

/** Put the colours on `root` (the document element). */
export function applyLevelColours(root, planLevels, levels) {
  for (const [name, colour] of levelColourVars(planLevels, levels)) root.style.setProperty(name, colour);
}
