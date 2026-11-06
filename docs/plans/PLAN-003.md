# PLAN-003 — Precipitation forecast app (ECMWF IFS + AIFS): units per model, state after step 3

- Drafted: 2026-11-06 (approx. 19:17-19:20 UTC, in plan mode)
- Written to this file: 2026-11-06 19:20 UTC
- Session: `3e56a452-e5f8-4bb9-b353-63bad43748f4`; first prompt 2026-11-06T18:19:13Z; deadline 2026-11-09T18:19:13Z
- Approval: approved by the user (Nishaanth Senthilkumar) through the plan-mode approval prompt, 2026-11-06 ~19:20 UTC. Plan text below is unchanged from what was approved.
- **Replaces: PLAN-002** (approved 2026-11-06 ~18:49 UTC). Steps 1, 1b, 2 and 3 of PLAN-002 are done and carried over as done.

## Why PLAN-002 is replaced
- **Wrong assumption:** A1 said `tp` is in metres in both models, and step 4 said "m → mm". In step 3 the GRIB keys showed **IFS `units = m` but AIFS `units = kg m**-2`** (numerically mm of water). Applying ×1000 to both would make AIFS 1000 times too large, and the error would be silent. Logged as **E006** in `docs/ERRORS.md`.
- **Evidence:** eccodes key dump of the real 00z 2026-11-06 files (`python -m pipeline.fetch`), cross-checked against values: area-weighted global mean of cumulative `tp`, IFS ×1000 vs AIFS, at 6 h: 0.71 vs 0.71 mm; 120 h: 15.57 vs 15.94 mm; 240 h: 30.89 vs 31.49 mm. The keys are right.
- **What changes (small):**
  1. **A1 corrected.** Accumulation is confirmed (`stepType = accum`, `startStep = 0`); units are per model.
  2. **Step 4 amended:** the unit of every message is read from its GRIB `units` key and converted to mm with a factor from `config/pipeline.toml` (`m → 1000`, `kg m**-2 → 1`). An unknown unit stops the run with an error. Tests cover both units and the unknown-unit case.
  3. **A3 refined** (verified in step 3): the 06z IFS run stops at 144 h, the 12z IFS run was not yet published about 7 h after run time while the 12z AIFS run was complete. Run hours stay `[0, 12]`; the client's completeness check decides which run is used.
  4. **A4 and A5 marked verified:** A4 by reading the client source and by the real download (only `tp` messages, 64 MB total instead of about 120 MB of full files per model); A5 on Windows only (Linux is still checked in step 11).
  5. **Step 11 gains two checks:** the schedule times are chosen from observed first-seen times of runs (the `Last-Modified` header proved unreliable), and the Linux runner must pass the same `eccodes` import check.
- Everything else (goal, decisions D1–D7, folder layout, steps 5–10 and 12, time targets) is unchanged from PLAN-002.

## Context / Goal (unchanged)
Project 1 of the QUEST Lab application: fetch precipitation forecasts from ECMWF Open Data, process them, and deploy a **public** web app with an innovative front end. Outcome: a static web app, refreshed automatically from every 00z/12z run, that shows global precipitation from **IFS and AIFS**, with:
- a **2D animated map ↔ 3D globe toggle** (same data, time scrubber),
- an **always-visible location panel**: it uses browser geolocation (with permission; search or map click if denied) and shows a local-time rain timeline, dry windows, and an **IFS-vs-AIFS agreement** bar (labelled as agreement, never as probability),
- visible provenance: model, run time, retrieval time, units, CC-BY-4.0 attribution.

## Folder layout (decision D5, unchanged)

```
Project/
├── README.md            what works, how to run, what was verified
├── .gitignore
├── pyproject.toml       Python project metadata + pytest settings
├── requirements.txt     pinned Python dependencies
├── config/              ALL settings, no code
│   ├── pipeline.toml        (exists) source, run hours, steps, raw path; step 4 adds units_to_mm + wet threshold
│   ├── backend.toml         tile size, quantisation, frame format, output path, attribution text
│   ├── frontend.json        colour scale, staleness threshold, default view (imported by Vite at build time)
│   └── validation_points.toml   named check locations with coordinates (step 5)
├── pipeline/            data FETCHING and PROCESSING (Python): fetch.py (exists), process.py, grid.py
├── backend/             builder of the STATIC DATA API the frontend reads: export.py, manifest schema
├── frontend/            Vite web app: index.html, src/, package.json, vite.config.js
├── tests/               pipeline/ and backend/ (pytest), frontend/ (node --test)
├── scripts/             thin command-line entry points: run_pipeline.py, validate_points.py
├── docs/                project records, plans/, evidence/ (screenshots)
├── .github/workflows/   scheduled fetch → test → build → deploy (step 11)
└── data/                IGNORED: raw/<YYYYMMDDHH>/<model>/tp.grib2, processed/<run>/, site/ (exported static API)
```
Folders appear with their first real file. Root rule: tracked root entries may only be `README.md`, `.gitignore`, `pyproject.toml`, `requirements.txt`, (`.env.example` only if needed) and the folders above. Layout changes are raised with the user first and recorded in DECISIONS.

## Decisions already made by the user
D1 Models: IFS (oper) + AIFS Single. D2 Static site + scheduled pipeline (host chosen in step 11). D3 Front end: 2D map + 3D globe toggle + always-present location panel with model agreement, using geolocation. D4 Coverage: global. D5 Folder layout. D6 Python 3.11 only. (D7 pinning without hashes was an AI shortcut, recorded in DECISIONS.)

## Assumptions (status after step 3)
- A1 **CORRECTED:** `tp` is accumulated from forecast start in both models (verified: `stepType = accum`, `startStep = 0`). Units: IFS `m`, AIFS `kg m**-2` (verified by keys and by values). Handled per message in step 4.
- A2 Both models use `regular_ll` with `Ni = 1440`, `Nj = 721` (verified for both). Row order (north→south?) and longitude start (0 or −180?) are checked in step 4.
- A3 00z carries the full range (verified: IFS 3..144 every 3 h then 150..240 every 6 h = 64 messages; AIFS 6..360 every 6 h = 60 messages). 06z IFS stops at 144 h (verified), so 06z/18z are not used. 12z IFS step list is assumed equal to 00z, not yet verified (12z IFS was unpublished at 19:12 UTC).
- A4 **VERIFIED:** the official client downloads only the requested messages (source read + real download).
- A5 **VERIFIED on Windows:** the `eccodes` 2.50.0 wheel bundles its C library. Linux not yet checked (step 11).
- A6 Processed output fits a free static host's limits (measured step 7, verified step 11). Fallbacks: coarser quantisation or chunks, or AIFS only to 240 h.
- A7 Geolocation needs HTTPS and user permission; there is a fallback when it is denied (step 8).
- A8 Times are shown in the browser's time zone (labelled) and in UTC; a searched remote place is shown in the browser's zone. This is a `shortcut:` to record.
- A9 Licence: CC-BY-4.0 + ECMWF Terms of Use (page read 2026-11-06; client prints the same notice); exact attribution wording read in step 10.

## Steps (one at a time; commit after each; tests, line counts and the root check before every commit)

1. **Repo + records.** DONE (commits `ccb24df`, `591a24c`).
1b. **Apply the folder layout.** DONE (commits `7a83bb9`, `ba581ee`).
2. **Python environment.** DONE (commit `785e774`): `.venv/` on Python 3.11.9, 23 pinned packages, fresh-venv rebuild identical.
3. **Fetch.** DONE (commit `fc08c94`): `pipeline/fetch.py`, `config/pipeline.toml`, 9 tests passing; real 00z run downloaded (IFS 34.54 MB, AIFS 29.51 MB), all steps present; E006 found.

4. **Processing core** (`pipeline/process.py`, `pipeline/grid.py`; settings added to `config/pipeline.toml`; tests in `tests/pipeline/`). Reuses `pipeline/fetch.py` (`load_config`, `expand_steps`, `describe_messages` for the key dump).
   - Decode to numpy (`eccodes.codes_get_values`, reshape to 721 × 1440); verify row order and longitude convention from the GRIB keys (A2).
   - **Convert units per message** from the GRIB `units` key using `[units_to_mm]` in the config (`m` → 1000, `kg m**-2` → 1); stop with an error on any other unit.
   - De-accumulate to mm per interval (difference of consecutive steps; first interval = first step, since accumulation starts at 0); small negatives clipped and counted.
   - Aggregate IFS 3 h to 6 h on the common axis; agreement classes per 6 h interval (both wet / both dry / disagree; wet threshold in the config, recorded as a decision); quantise to 0.1 mm uint16; write `data/processed/<run>/`.
   - Tests use small synthetic arrays, clearly labelled as test fixtures.
   DONE-CHECK: `pytest -q` passes (de-accumulation, **both units converted to the same mm values**, unknown unit raises, valid-time axis, lat/lon→index incl. lon wrap, quantise round trip, agreement). A real-run summary prints the negative-clip count and the global area-weighted mean mm/day for IFS and for AIFS, compared with each other and with a published climatology value (source opened and cited in SOURCES).

5. **Independent validation** (`scripts/validate_points.py`, points in `config/validation_points.toml`). For about 6 named cities, read values straight from the raw GRIB with eccodes `codes_grib_find_nearest` (independent code path), apply the unit factor, and compare with the processed arrays. Optional second source: Open-Meteo's ECMWF API, **only if you approve**.
   DONE-CHECK: the script prints a comparison table for both models; max abs diff ≤ 0.05 mm.

6. **Front-end spike + decision gate** (`frontend/`, `config/frontend.json`). Propose options with a recommendation for: the map/globe library (e.g. MapLibre GL v5 globe projection vs CesiumJS vs globe.gl), the basemap (self-hosted Natural Earth vs a free tile service), the search fallback (bundled offline city list vs a geocoding API), the frame format, and a headless-screenshot dev tool (Playwright). **You decide.** Then a Vite page renders one real frame in both 2D and 3D.
   DONE-CHECK: `npm run build` ok; screenshots in `docs/evidence/` (or your visual confirmation).

7. **Static data API export** (`backend/export.py`, settings in `config/backend.toml`; tests in `tests/backend/`). Reads `data/processed/<run>/`; writes per-step map frames per model, point tiles (chunked grid, uint16) and `manifest.json` (run, retrieval time UTC, steps, valid times, units = mm, source URLs, licence) into `data/site/`.
   DONE-CHECK: `pytest -q` (tile index maths, manifest schema); total size printed and compared with the step 11 limits; reading a city back from a tile matches step 5.

8. **Location panel** (`frontend/src/`; tests in `tests/frontend/`). Loads the manifest; location by geolocation, with search or click as fallback; fetches only the needed tile; local-time timeline, dry windows and agreement bar ("AIFS only" past 240 h). Risky JS logic tested with `node --test tests/frontend/`.
   DONE-CHECK: `node --test tests/frontend/` passes; a fixed test location shows values equal to the step 7 readback.

9. **Map ↔ globe views** (`frontend/src/`). Animated time scrubber, colour legend with units stated (map shows mean rate in mm/h so 3 h and 6 h intervals are comparable; panel shows totals), toggle between pure 2D and pure 3D.
   DONE-CHECK: build ok; screenshots in `docs/evidence/` (or your confirmation) of both modes at two time steps; the toggle keeps the selected time and place.

10. **Provenance + honesty UI.** Run time, retrieval time, model names, units, staleness banner (threshold in `config/frontend.json`), "agreement ≠ probability" note, and the ECMWF attribution text (in `config/backend.toml`, passed through the manifest) verified on the official terms page.
    DONE-CHECK: build ok; grep of the built HTML/JS or manifest finds the attribution string; the manifest run time is displayed.

11. **Hosting gate + deploy** (`.github/workflows/`, `scripts/run_pipeline.py`). Check current free-tier terms of GitHub Pages / Cloudflare Pages / Netlify on official pages; **you choose**. You log in (`! gh auth login`); **with your approval** a public repo is created (you said the repo link will be given later; nothing is pushed before that). A scheduled workflow: fetch → tests → process → export → build → deploy; if any stage fails, the previous deployment stays live. **New:** the cron times are chosen from observed first-seen times of 00z/12z runs (the `Last-Modified` header is not used), and the workflow's first job checks that `eccodes` imports and decodes a test message on the Linux runner.
    DONE-CHECK: the workflow run is green (`gh run view`); a fresh `curl` of the public URL returns the page, and the manifest has the latest run time.

12. **README + submission.** The README states what works, what does not, how to run it, what was verified and how, known limitations (every `shortcut:`), and the final folder layout. Then `docs/SUBMISSION.md` per CLAUDE.md.
    DONE-CHECK: every checklist item is ticked only after running it (clean clone runs from the README; secret search; no `subagents/` folder; commit times within 72 h; line counts; `shortcut:` list; root check).

## Time targets (elapsed hours, unchanged)
Steps 1–5 by ~h18 (now at ~h1.0, ahead of target) · steps 6–10 by ~h50 · step 11 by ~h58 · h64–72 reserved for README/submission/fixes (no new features after h64). Warnings at 24/48/60 h.

## Rules applied throughout
Functions ≤ 50 lines and files ≤ 300 lines (500 hard max), checked with `wc -l` before each commit. Root check before each commit. Settings go into `config/`. `shortcut:` comments are mirrored in DECISIONS; errors go in ERRORS with IDs and counters; facts in DOMAIN; sources in SOURCES; `date -u` in PROGRESS at every commit. No subagents.

## Verification (end to end)
`pytest -q` and `node --test tests/frontend/` pass. The step 5 validation table is within 0.05 mm for both models. IFS and AIFS global means agree after unit conversion (as in step 3). The public URL loads via `curl` with the current run's manifest. Screenshots or user confirmation of both views. The scheduled workflow has refreshed the data at least once on its own. The root check shows only allowed entries.
