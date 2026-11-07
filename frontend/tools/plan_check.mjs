// Checks the browser plan code on the REAL exported tiles against the independent Python reference (scripts/plan_reference.py).
// Run: docker compose -f docker/compose.yaml run --rm frontend-check     Exit code 0 only if everything matches.
// Two comparisons per place and activity:
//   (1) the browser logic fed with the Python reference's own numbers must give EXACTLY the reference windows, days and totals;
//   (2) the same logic fed with what the tiles hold: the tiles may differ from the raw reads by one storage step at a rounding tie
//       (float32 versus float64), so a difference there is allowed only when the stored numbers differ; otherwise it must match too.
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { manifestProblems } from '../src/manifest.js';
import { buildBlocks } from '../src/plan.js';
import { offsetMinutes } from '../src/time.js';
import { loadSeries } from '../src/tiles.js';
import { buildView } from '../src/view.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const readJson = async (...parts) => JSON.parse(await readFile(join(root, ...parts), 'utf8'));
const frontend = await readJson('config', 'frontend.json');
const activities = await readJson('config', 'activities.json');
const site = join(root, frontend.check.site_dir);
const manifest = JSON.parse(await readFile(join(site, frontend.manifest_file), 'utf8'));
const reference = await readJson(frontend.check.reference_file);
const base = frontend.data_url_path;
const get = (url) => readFile(join(site, url.slice(base.length).split('?')[0]));
const iso = (ms) => new Date(ms).toISOString().replace('.000Z', 'Z');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const close = (a, b) => Math.abs(a - b) < 1e-6;

function options(place, nowMs) {
  return { zone: place.zone, nowMs, quantumMm: manifest.quantum_mm, intervalHours: manifest.interval_hours, models: manifest.agreement.models,
    minRemaining: activities.current_block_min_remaining_fraction, daysShown: activities.days_shown, windowsShown: 1000, totalsDays: activities.totals_days, levels: activities.levels };
}

function compare(view, expected) {
  const problems = [];
  const windows = view.windows.map((w) => [iso(w.startMs), iso(w.endMs), w.blocks, w.confidence, w.startsNow, w.level]);
  if (!same(windows, expected.windows)) problems.push(`windows ${JSON.stringify(windows)} != ${JSON.stringify(expected.windows)}`);
  const days = Object.fromEntries(view.days.map((d) => [d.key, d.blocks.map((b) => [b.level, b.fit])]));
  if (!same(days, expected.days)) problems.push('day levels or fits differ');
  return problems;
}

function compareTotals(view, expected) {
  return view.totals.flatMap((t, i) => {
    const e = expected[i];
    const ok = t.days === e.days && t.blocks === e.blocks && t.common.blocks === e.common.blocks && close(t.common.low, e.common.low)
      && close(t.common.high, e.common.high) && Object.keys(e.common.perModel).every((m) => close(t.common.perModel[m], e.common.perModel[m]))
      && same(Boolean(t.extra), Boolean(e.extra)) && (!e.extra || (t.extra.model === e.extra.model && t.extra.blocks === e.extra.blocks && close(t.extra.mm, e.extra.mm)));
    return ok ? [] : [`totals for ${t.days} days differ`];
  });
}

async function checkPlace(place, nowMs, list) {
  const problems = [];
  if (offsetMinutes(nowMs, place.zone) !== place.offset_minutes) problems.push(`zone ${place.zone}: browser says ${offsetMinutes(nowMs, place.zone)}, table says ${place.offset_minutes}`);
  const fromTiles = await loadSeries(base, manifest, place.lat, place.lon, get);
  const fromRaw = Object.fromEntries(Object.entries(place.stored).map(([m, v]) => [m, Uint16Array.from(v)]));
  let exact = 0;
  let off = 0;
  let worse = 0;
  for (const m of Object.keys(place.stored)) {
    place.stored[m].forEach((v, i) => { const d = Math.abs(v - fromTiles[m][i]); if (d === 0) exact += 1; else if (d === 1) off += 1; else worse += 1; });
  }
  if (worse) problems.push(`${worse} stored values differ by more than one step`);
  const blocksRaw = buildBlocks(manifest, fromRaw);
  const blocksTile = buildBlocks(manifest, fromTiles);
  for (const act of list) {
    const expected = place.plans[act.id];
    problems.push(...compare(buildView(blocksRaw, act, options(place, nowMs)), expected).map((p) => `${act.id} [raw numbers]: ${p}`));
    if (off === 0) problems.push(...compare(buildView(blocksTile, act, options(place, nowMs)), expected).map((p) => `${act.id} [tile numbers]: ${p}`));
  }
  problems.push(...compareTotals(buildView(blocksRaw, list[0], options(place, nowMs)), place.totals).map((p) => `[raw numbers] ${p}`));
  if (off === 0) problems.push(...compareTotals(buildView(blocksTile, list[0], options(place, nowMs)), place.totals).map((p) => `[tile numbers] ${p}`));
  return { exact, off, problems };
}

const list = [...activities.activities, { ...activities.custom, max_level: activities.custom.default_level }];
const found = manifestProblems(manifest);
if (found.length) throw new Error(`manifest: ${found.join('; ')}`);
if (manifest.run !== reference.run) throw new Error(`manifest run ${manifest.run} is not the reference run ${reference.run}`);
let failed = 0;
for (const place of reference.places) {
  const r = await checkPlace(place, Date.parse(reference.now), list);
  failed += r.problems.length;
  console.log(`${r.problems.length ? 'FAIL' : 'ok  '} ${place.name.padEnd(12)} ${place.zone.padEnd(20)} tile values: ${r.exact} identical, ${r.off} off by one step | ${list.length} activities, totals`);
  for (const p of r.problems.slice(0, 6)) console.log(`      ${p}`);
}
console.log(failed ? `${failed} problem(s)` : `all ${reference.places.length} places x ${list.length} activities match (check time ${reference.now}, run ${reference.run})`);
process.exit(failed ? 1 : 0);
