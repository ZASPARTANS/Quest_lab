// The manifest is untrusted input (it comes from the network): check its shape before anything is built from it.
// The server side of the same contract is backend/manifest.py (`validate`).

const isInt = (x, min, max) => Number.isInteger(x) && x >= min && x <= max;
const TILE_PATH = /^[A-Za-z0-9_\-./{}]+$/;

/** List of problems (empty = fine). Checks what the browser relies on, not everything the exporter checks. */
export function manifestProblems(m) {
  if (m === null || typeof m !== 'object') return ['not an object'];
  const problems = [];
  if (m.format_version !== 1) problems.push('unknown format_version');
  if (!isInt(m.interval_hours, 1, 24) || 24 % m.interval_hours !== 0) problems.push('bad interval_hours');
  if (!(typeof m.quantum_mm === 'number' && m.quantum_mm > 0 && m.quantum_mm <= 10)) problems.push('bad quantum_mm');
  const g = m.grid ?? {};
  for (const key of ['ni', 'nj']) if (!isInt(g[key], 1, 100000)) problems.push(`bad grid.${key}`);
  for (const key of ['step_degrees', 'lat_first', 'lon_first']) if (!Number.isFinite(g[key])) problems.push(`bad grid.${key}`);
  const t = m.tiles ?? {};
  if (!isInt(t.size, 1, 4096) || !isInt(t.layers, 1, 10000) || !isInt(t.rows, 1, 100000) || !isInt(t.cols, 1, 100000)) problems.push('bad tiles');
  if (typeof t.path !== 'string' || !TILE_PATH.test(t.path) || t.path.includes('..') || !t.path.includes('{row}') || !t.path.includes('{col}')) problems.push('bad tiles.path');
  problems.push(...modelProblems(m, t));
  problems.push(...frameProblems(m));
  if (typeof m.run !== 'string' || !Number.isFinite(Date.parse(m.run))) problems.push('bad run time');
  if (typeof m.retrieved_at !== 'string' || !Number.isFinite(Date.parse(m.retrieved_at))) problems.push('bad retrieved_at');
  return problems;
}

const FRAME_PATH = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_.-]+)*\.png$/;
const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

/** The map frames (null = switched off). Paths are untrusted: a safe pattern, no `..`, and the steps must be the model's own steps. */
function frameProblems(m) {
  if (m.frames === null) return [];
  const f = m.frames;
  if (f === undefined || typeof f !== 'object') return ['missing frames'];
  const problems = [];
  if (!isInt(f.size, 1, 8192) || !Number.isFinite(f.max_latitude) || f.max_latitude <= 0 || f.max_latitude > 90) problems.push('bad frames size or latitude');
  const colours = f.agreement_colours;
  if (colours === null || typeof colours !== 'object' || !Object.values(colours).length || !Object.values(colours).every((c) => HEX_COLOUR.test(c))) problems.push('bad frames.agreement_colours');
  for (const [kind, files] of Object.entries(f.files ?? {})) {
    const known = kind === 'agreement' ? m.agreement?.steps : m.models?.[kind]?.steps;
    const steps = Object.keys(files ?? {}).map(Number).sort((a, b) => a - b);
    if (!Array.isArray(known) || JSON.stringify(steps) !== JSON.stringify([...known].sort((a, b) => a - b))) problems.push(`frames for ${kind} do not match its steps`);
    if (Object.values(files ?? {}).some((p) => typeof p !== 'string' || !FRAME_PATH.test(p) || p.includes('..'))) problems.push(`unsafe frame path for ${kind}`);
  }
  return problems;
}

function modelProblems(m, t) {
  const models = m.models;
  if (models === null || typeof models !== 'object' || Object.keys(models).length === 0) return ['no models'];
  const problems = [];
  let layers = 0;
  for (const [name, info] of Object.entries(models)) {
    const times = info?.valid_times;
    if (!Array.isArray(times) || !times.length || times.some((x) => !Number.isFinite(Date.parse(x)))) problems.push(`${name}: bad valid_times`);
    else if (info.layer_offset !== layers || info.layers !== times.length) problems.push(`${name}: layer bookkeeping`);
    layers += times?.length ?? 0;
  }
  if (layers !== t.layers) problems.push('tiles.layers is not the sum of the model layers');
  const names = m.agreement?.models;
  if (!Array.isArray(names) || names.some((n) => !(n in models))) problems.push('agreement models are not among the models');
  return problems;
}
