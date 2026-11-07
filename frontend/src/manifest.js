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
  if (typeof m.run !== 'string' || !Number.isFinite(Date.parse(m.run))) problems.push('bad run time');
  if (typeof m.retrieved_at !== 'string' || !Number.isFinite(Date.parse(m.retrieved_at))) problems.push('bad retrieved_at');
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
