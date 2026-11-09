# PLAN-002 — Precipitation forecast app (ECMWF IFS + AIFS), with a fixed folder structure

- Drafted: 2026-11-06 (approx. 18:46–18:49 UTC, in plan mode)
- Written to this file: 2026-11-06 18:49 UTC
- Session: `3e56a452-e5f8-4bb9-b353-63bad43748f4`; first prompt 2026-11-06T18:19:13Z; deadline 2026-11-09T18:19:13Z
- Approval: approved by the user (the owner) through the plan-mode approval prompt, 2026-11-06 ~18:49 UTC. Plan text below is unchanged from what was approved.
- **Replaces: PLAN-001** (approved 2026-11-06 ~18:42 UTC). PLAN-001 step 1 is done (commits `ccb24df`, `591a24c`) and is carried over as done.

## Why PLAN-001 is replaced
- **What was wrong:** PLAN-001 had no agreed folder layout and no rule that settings live in config files. It named paths ad hoc (`pipeline/export.py`, `site-data/`) and mixed the static-API export into the processing folder. A professional plan should have proposed a layout without being asked. This is a planning gap by the AI, recorded as E002 in `docs/ERRORS.md`.
- **Evidence:** after step 1, the user asked for a clean, professional structure: separate folders for fetching/processing, backend, frontend, tests, scripts and docs; a tidy root; generated data out of git; config in config files; the layout recorded in DECISIONS and followed for the whole project.
- **What changes:** (1) a new step **1b** applies the layout (decision D5); (2) export moves from `pipeline/` to `backend/`; (3) generated data goes under one ignored folder, `data/` (`site-data/` becomes `data/site/`); (4) settings move to `config/`; (5) tests are split by area under `tests/`; (6) a root-tidiness check runs before every commit. Steps 2–12, assumptions A1–A9, decisions D1–D4 and the time targets are otherwise unchanged.
- **Honest limit:** the first commit (`ccb24df`) was made before this layout was agreed. It only holds `.gitignore` and `docs/`, which already sit where the layout puts them, so nothing has to move. I will **not** rewrite git history. The layout applies from the next commit.
- Already done at the user's explicit request, before this plan: a new "File structure — MANDATORY" section was added to the global `CLAUDE.md`. A diff against a backup showed 8 added lines and 0 removed or changed lines. The backup was deleted.

## Context / Goal (unchanged from PLAN-001)
Project 1 of the QUEST Lab application: fetch precipitation forecasts from ECMWF Open Data, process them, and deploy a **public** web app with an innovative front end. Outcome: a static web app, refreshed automatically from every 00z/12z run, that shows global precipitation from **IFS and AIFS**, with:
- a **2D animated map ↔ 3D globe toggle** (same data, time scrubber),
- an **always-visible location panel**: it uses browser geolocation (with permission; search or map click if denied) and shows a local-time rain timeline, dry windows, and an **IFS-vs-AIFS agreement** bar (labelled as agreement, never as probability),
- visible provenance: model, run time, retrieval time, units, CC-BY-4.0 attribution.

## Proposed folder layout (decision D5, recorded in docs/DECISIONS.md in step 1b)

```
Project/
├── README.md            what works, how to run, what was verified
├── .gitignore
├── pyproject.toml       Python project metadata + pytest settings (step 2)
├── requirements.txt     pinned Python dependencies (step 2)
├── config/              ALL settings, no code
│   ├── pipeline.toml        source URL, models, param, runs, expected steps, wet threshold, data paths
│   ├── backend.toml         tile size, quantisation, frame format, output path, attribution text
│   ├── frontend.json        colour scale, staleness threshold, default view (imported by Vite at build time)
│   └── validation_points.toml   named check locations with coordinates (step 5)
├── pipeline/            data FETCHING and PROCESSING (Python): fetch.py, process.py, grid.py
├── backend/             the "backend" = builder of the STATIC DATA API the frontend reads:
│                        export.py (frames, point tiles, manifest.json), manifest schema
├── frontend/            Vite web app: index.html, src/, package.json, vite.config.js
├── tests/
│   ├── pipeline/            pytest
│   ├── backend/             pytest
│   └── frontend/            node --test (built-in Node test runner)
├── scripts/             thin command-line entry points: run_pipeline.py, validate_points.py
├── docs/                project records (PROGRESS, DECISIONS, ERRORS, ...), plans/, evidence/ (screenshots)
├── .github/workflows/   scheduled fetch → test → build → deploy (step 11; GitHub requires this path)
└── data/                IGNORED: raw/<run>/<model>/ downloads, processed/<run>/, site/ (exported static API)
```

Why this shape:
- **pipeline vs backend:** under D2 there is no live server. The "backend" is the part that publishes the data contract the browser talks to (tiles + manifest = a static API). Processing produces arrays; the backend turns them into the public API. They talk through files in `data/processed/`, not shared code, so each can be tested on its own. *If you want a literal running server instead, that would reverse D2 and needs a new decision.*
- **scripts/** holds only short entry points that call `pipeline/` and `backend/`, so the logic stays testable and the CI workflow calls one script.
- **config/** keeps every URL, model name, threshold, path and limit out of the code. Python reads TOML with the standard-library `tomllib` (Python 3.11), so no new package is needed.
- **data/** is one ignored folder for everything downloaded or generated; it can be re-created by `scripts/run_pipeline.py`. Frontend build output `frontend/dist/` is ignored by the existing `dist/` rule.
- **Secrets:** none are expected (no keys for ECMWF Open Data). If one is ever needed, it goes in `.env` with a `.env.example` listing names only.
- **Folders appear with their first real file** in the step that needs them (git cannot hold empty folders, and placeholder files would be stray files). The README shows the full intended layout from step 1b.
- **Root rule:** tracked root entries may only be `README.md`, `.gitignore`, `pyproject.toml`, `requirements.txt`, (`.env.example` only if needed) and the folders above.

## Decisions already made by the user
D1 Models: IFS (oper) + AIFS Single. D2 Architecture: static site + scheduled pipeline (exact free host chosen in step 11). D3 Front end: 2D map + 3D globe toggle, plus the always-present location panel with model agreement, using geolocation. D4 Coverage: global. **D5 (this plan): the folder layout above.**

## Assumptions (unchanged from PLAN-001; each is checked in the step named)
- A1 `tp` is in metres, accumulated from step 0, in both models (step 3).
- A2 Both models use the same regular 0.25° lat/lon grid, 721×1440 (step 4).
- A3 00z/12z runs carry the full range (IFS 3 h to 144 h, then 6 h to 240 h; AIFS 6 h to 360 h). 06z/18z runs are not used (step 3).
- A4 The official `ecmwf-opendata` client downloads only `tp` messages (byte ranges). If not, we use our own small `.index`-based range download (step 2/3).
- A5 The `eccodes` pip wheel decodes GRIB2 on Windows and Linux without a separate C install (step 2).
- A6 Processed output fits a free static host's limits (measured step 7, verified step 11). Fallbacks: coarser quantisation or chunks, or AIFS only to 240 h.
- A7 Geolocation needs HTTPS and user permission; there is a fallback when it is denied (step 8).
- A8 Times are shown in the browser's time zone (labelled) and in UTC; a searched remote place is shown in the browser's zone. This is a `shortcut:` to record.
- A9 Licence: CC-BY-4.0 + ECMWF Terms of Use; exact attribution wording read in step 10.

## Steps (one at a time; commit after each; tests, line counts and the root check before every commit)

1. **Repo + records.** DONE under PLAN-001 (commits `ccb24df`, `591a24c`; done-check results in PROGRESS).

1b. **Apply the folder layout.** Write `docs/plans/PLAN-002.md`; D5 in DECISIONS (layout + reasons); E002 in ERRORS; PROGRESS marks PLAN-001 "superseded by PLAN-002"; `.gitignore`: replace `/site-data/` with the single `/data/` rule (already present); `README.md` with the intended layout and a plain "work in progress: nothing runs yet" line.
   DONE-CHECK: `git ls-files | cut -d/ -f1 | sort -u` shows only allowed root entries (`.gitignore`, `README.md`, `docs`); `git check-ignore -v data/site/x data/raw/x .claude/settings.local.json` matches all three; `git status` clean after commit.

2. **Python environment.** `py -3.11 -m venv .venv`. Check each package on its PyPI page before installing: `ecmwf-opendata`, `eccodes`, `numpy`, `pytest` (+ `Pillow` only if step 6 picks PNG frames). Pinned in `requirements.txt`; `pyproject.toml` with pytest settings (`testpaths = ["tests"]`). Record in SOURCES. Read the installed `ecmwf-opendata` source for A4. No xarray/cfgrib unless a need appears.
   DONE-CHECK: `python -c "import eccodes; print(eccodes.codes_get_api_version())"` prints a version; `pip freeze` matches `requirements.txt`; `pytest` runs (0 tests collected is the expected result).

3. **Fetch** (`pipeline/fetch.py`, settings in `config/pipeline.toml`). Find the latest complete 00z/12z run where both models are published. Download only `tp` for all steps into `data/raw/<run>/<model>/`.
   DONE-CHECK: the run prints run time, message count per model and total MB; an eccodes key dump shows `shortName=tp`, the units, `stepType` and step ranges; a grep shows no URL or model name hard-coded in `pipeline/`. Facts recorded in DOMAIN (A1, A3), lag between run and availability included.

4. **Processing core** (`pipeline/process.py`, `pipeline/grid.py`; tests in `tests/pipeline/`). Decode to numpy; verify grid orientation and longitude convention (A2); de-accumulate to mm per interval (m→mm, small negatives clipped and counted); aggregate IFS 3 h to 6 h on the common axis; agreement classes per 6 h interval (both wet / both dry / disagree; wet threshold set in `config/pipeline.toml` and recorded as a decision); quantise to 0.1 mm uint16; write `data/processed/<run>/`. Tests use small synthetic arrays, clearly labelled as test fixtures.
   DONE-CHECK: `pytest -q` passes (de-accumulation, units, valid-time axis, lat/lon→index incl. lon wrap, quantise round trip, agreement). A real-run summary prints the negative-clip count and the global area-weighted mean mm/day, compared with a published climatology value (source opened and cited in SOURCES).

5. **Independent validation** (`scripts/validate_points.py`, points in `config/validation_points.toml`). For about 6 named cities, read values straight from the raw GRIB with eccodes `codes_grib_find_nearest` (independent code path) and compare them with the processed arrays. Optional second source: Open-Meteo's ECMWF API, **only if you approve**.
   DONE-CHECK: the script prints a comparison table; max abs diff ≤ 0.05 mm.

6. **Front-end spike + decision gate** (`frontend/`, `config/frontend.json`). Propose options with a recommendation for: the map/globe library (e.g. MapLibre GL v5 globe projection vs CesiumJS vs globe.gl), the basemap (self-hosted Natural Earth vs a free tile service), the search fallback (bundled offline city list vs a geocoding API), the frame format, and a headless-screenshot dev tool (Playwright). **You decide.** Then a Vite page renders one real frame in both 2D and 3D.
   DONE-CHECK: `npm run build` ok; screenshots in `docs/evidence/` (or your visual confirmation if no screenshot tool is approved).

7. **Static data API export** (`backend/export.py`, settings in `config/backend.toml`; tests in `tests/backend/`). Reads `data/processed/<run>/`; writes per-step map frames per model, point tiles (chunked grid, uint16) and `manifest.json` (run, retrieval time UTC, steps, valid times, units, source URLs, licence) into `data/site/`.
   DONE-CHECK: `pytest -q` (tile index maths, manifest schema); total size printed and compared with the step 11 limits; reading a city back from a tile matches step 5.

8. **Location panel** (`frontend/src/`; tests in `tests/frontend/`). Loads the manifest; location by geolocation, with search or click as fallback; fetches only the needed tile; local-time timeline, dry windows and agreement bar ("AIFS only" past 240 h). Risky JS logic (tile index, time conversion, dry windows) tested with `node --test tests/frontend/`.
   DONE-CHECK: `node --test tests/frontend/` passes; a fixed test location shows values equal to the step 7 readback.

9. **Map ↔ globe views** (`frontend/src/`). Animated time scrubber, colour legend with units stated (map shows mean rate in mm/h so 3 h and 6 h intervals are comparable; panel shows totals), toggle between pure 2D and pure 3D.
   DONE-CHECK: build ok; screenshots in `docs/evidence/` (or your confirmation) of both modes at two time steps; the toggle keeps the selected time and place.

10. **Provenance + honesty UI.** Run time, retrieval time, model names, units, staleness banner (threshold in `config/frontend.json`), "agreement ≠ probability" note, and the ECMWF attribution text (in `config/backend.toml`, passed through the manifest) verified on the official terms page.
    DONE-CHECK: build ok; grep of the built HTML/JS or manifest finds the attribution string; the manifest run time is displayed.

11. **Hosting gate + deploy** (`.github/workflows/`, `scripts/run_pipeline.py`). Check current free-tier terms of GitHub Pages / Cloudflare Pages / Netlify on official pages; **you choose**. You log in (`! gh auth login`); **with your approval** a public repo is created. A scheduled workflow after 00z/12z data appears: fetch → tests → process → export → build → deploy; if any stage fails, the previous deployment stays live.
    DONE-CHECK: the workflow run is green (`gh run view`); a fresh `curl` of the public URL returns the page, and the manifest has the latest run time.

12. **README + submission.** The README states what works, what does not, how to run it, what was verified and how, known limitations (every `shortcut:`), and the final folder layout. Then `docs/SUBMISSION.md` per CLAUDE.md.
    DONE-CHECK: every checklist item is ticked only after running it (clean clone runs from the README; secret search; no `subagents/` folder; commit times within 72 h; line counts; `shortcut:` list; root check).

## Time targets (elapsed hours, unchanged)
Steps 1–5 by ~h18 · steps 6–10 by ~h50 · step 11 by ~h58 · h64–72 reserved for README/submission/fixes (no new features after h64). Warnings at 24/48/60 h.

## Rules applied throughout
Functions ≤ 50 lines and files ≤ 300 lines (500 hard max), checked with `wc -l` before each commit. **Before each commit also run the root check** (`git ls-files | cut -d/ -f1 | sort -u`) and check that new settings went into `config/`. Any change to the layout is raised with the user first and recorded in DECISIONS. `shortcut:` comments are mirrored in DECISIONS; errors go in ERRORS with IDs and counters; facts in DOMAIN; sources in SOURCES; `date -u` in PROGRESS at every commit. No subagents.

## Verification (end to end)
`pytest -q` and `node --test tests/frontend/` pass. The step 5 validation table is within 0.05 mm. The public URL loads via `curl` with the current run's manifest. Screenshots or user confirmation of both views. The scheduled workflow has refreshed the data at least once on its own. The root check shows only allowed entries.
