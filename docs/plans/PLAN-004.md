# PLAN-004 — Precipitation forecast app (ECMWF IFS + AIFS): Docker as the official test run, localhost preview

- Drafted: 2026-11-06 (approx. 20:05-20:13 UTC, in plan mode)
- Written to this file: 2026-11-06 20:13 UTC
- Session: `3e56a452-e5f8-4bb9-b353-63bad43748f4`; first prompt 2026-11-06T18:19:13Z; deadline 2026-11-09T18:19:13Z
- Approval: approved by the user (Nishaanth Senthilkumar) through the plan-mode approval prompt, 2026-11-06 ~20:13 UTC. Plan text below is unchanged from what was approved.
- **Replaces: PLAN-003** (approved 2026-11-06 ~19:20 UTC). Steps 1, 1b, 2 and 3 are done and carried over as done.

## Why PLAN-003 is replaced
- **Changed scope (user request, 2026-11-06 ~20:05 UTC):** (1) a localhost preview of the site for checking it locally; (2) "we will use the docker to do all the testing". PLAN-003 had neither; its tests ran from the Windows `.venv` and Docker was a one-off hand-typed check.
- **User decisions given while planning:** Docker is the official test run (the Windows `.venv` stays only for quick trying, never as proof). Localhost = Vite dev server on the host **plus** a Docker preview of the built site. IFS stays at 240 h for now (E007 stays open; the "AIFS only past 240 h" case stays in the plan).
- **Evidence the setup is feasible:** `docker compose` 5.6.1 and buildx 0.38.1 are installed, Docker is running (29.9.2, Linux/WSL2, 16 CPUs, ~16.6 GB), `python:3.11-slim` is already pulled, a read-only bind mount of this project worked in the earlier Linux check, and ports 5173 and 8080 are free (checked with `netstat`).
- **What changes:**
  1. **New folder `docker/`** (layout change to D5, raised here and recorded as D10): `docker/Dockerfile`, `docker/Dockerfile.dockerignore`, `docker/compose.yaml`. No new file in the repo root.
  2. **New step 3b** builds the Docker test environment before step 4. After it, "tests pass" means the Docker command passes.
  3. **Step 6** adds the localhost preview (Vite dev server on the host, nginx preview container) and puts front-end tests/build into Docker too.
  4. **Steps 4, 5, 7, 8, 9, 11** gain Docker wording in their done-checks (details below). Step 11 runs the same Docker command in the scheduled job, so CI equals local.
  5. **Decisions since PLAN-003 are reflected:** D7 (pinning without hashes), D8 (fail-fast run search), D9 (plain age warning only, plus addendum: developers keep technical detail, proposed status record), D10 (this plan), D11 (localhost), D12 (keep IFS at 240 h for now).
- Everything else (goal, D1–D6, steps 5, 7, 10, 12 apart from the wording noted, time targets) is unchanged from PLAN-003.

## Context / Goal (unchanged)
Project 1 of the QUEST Lab application: fetch precipitation forecasts from ECMWF Open Data, process them, and deploy a **public** web app with an innovative front end. Outcome: a static web app, refreshed automatically from every 00z/12z run, that shows global precipitation from **IFS and AIFS**, with:
- a **2D animated map ↔ 3D globe toggle** (same data, time scrubber),
- an **always-visible location panel**: it uses browser geolocation (with permission; search or map click if denied) and shows a local-time rain timeline, dry windows, and an **IFS-vs-AIFS agreement** bar (labelled as agreement, never as probability),
- visible provenance: model, run time, retrieval time, units, CC-BY-4.0 attribution; a short plain-language warning when the forecast is out of date (D9).

## Folder layout (D5 plus the `docker/` folder from D10)

```
Project/
├── README.md            what works, how to run, what was verified
├── .gitignore
├── pyproject.toml       Python project metadata + pytest settings
├── requirements.txt     pinned Python dependencies
├── config/              ALL settings, no code
│   ├── pipeline.toml        (exists) source, run hours, steps, retries, raw path; step 4 adds units_to_mm + wet threshold
│   ├── backend.toml         tile size, quantisation, frame format, output path, attribution text
│   ├── frontend.json        colour scale, staleness threshold, default view (imported by Vite at build time)
│   └── validation_points.toml   named check locations with coordinates (step 5)
├── pipeline/            data FETCHING and PROCESSING (Python): fetch.py (exists), process.py, grid.py
├── backend/             builder of the STATIC DATA API the frontend reads: export.py, manifest schema
├── frontend/            Vite web app: index.html, src/, package.json, vite.config.js
├── tests/               pipeline/ and backend/ (pytest), frontend/ (node --test)
├── scripts/             thin command-line entry points: run_pipeline.py, validate_points.py
├── docker/              NEW: Dockerfile, Dockerfile.dockerignore, compose.yaml (tests now; node/preview from step 6)
├── docs/                project records, plans/, evidence/ (screenshots)
├── .github/workflows/   scheduled fetch → test → build → deploy (step 11)
└── data/                IGNORED: raw/<YYYYMMDDHH>/<model>/tp.grib2, processed/<run>/, site/ (exported static API)
```
Folders appear with their first real file. Root rule: tracked root entries may only be `README.md`, `.gitignore`, `pyproject.toml`, `requirements.txt`, (`.env.example` only if needed) and the folders above. Layout changes are raised with the user first and recorded in DECISIONS.

## Docker design (the "official test run")
- **Image:** `docker/Dockerfile` starts from `python:3.11-slim` **pinned by digest** (the digest already pulled: `sha256:65bd3d9f…`; full value copied from `docs/SOURCES.md`), copies only `requirements.txt` and runs `pip install -r requirements.txt`. Project code is **not** baked in: it is mounted at run time, so no rebuild is needed when code changes, only when `requirements.txt` changes.
- **Build context stays tiny:** `docker/Dockerfile.dockerignore` (BuildKit reads it next to the Dockerfile, so no `.dockerignore` in the root) ignores everything except `requirements.txt`. The context size is checked in the done-check so `.venv/` and `data/` are provably not sent.
- **`tests` service in `docker/compose.yaml`:** mounts the project read-only at `/work`, sets `PYTHONDONTWRITEBYTECODE=1`, runs `python -m pytest -q -p no:cacheprovider`, and uses **`network_mode: none`**, which proves the unit tests need no internet (the local HTTP-server tests use loopback, which still works).
- **Official command (recorded in README and PROGRESS):** `docker compose -f docker/compose.yaml run --rm tests`
- **Later services (added only when their step needs them, so no unused files):** `run` (project read-only + `data/` writable + network, for fetch, processing and the step 5 validation script); a Node image for `node --test`, the Vite build and Playwright (step 6); `preview` (nginx serving the built site and `data/site/` on `http://localhost:8080`, step 6).
- **Windows `.venv`:** kept for quick trying; `pytest` there is never used as proof.

## Localhost design
- **Dev:** `npm run dev` on the host (Node 22.23.4 is installed) → `http://localhost:5173` with instant reload. It serves the forecast data from `data/site/` through a path set in `vite.config.js` and `config/frontend.json`.
- **Production-like:** the Docker `preview` service serves `frontend/dist` and `data/site/` on `http://localhost:8080`, the closest local thing to the real static host.
- **Geolocation:** browsers treat `http://localhost` as a secure context (to be verified in a real browser in step 8, not assumed).
- Images (Node, nginx, Playwright) are chosen at the step 6 decision gate, verified on their official pages, and pinned by digest.

## Decisions
D1 Models: IFS (oper) + AIFS Single. D2 Static site + scheduled pipeline (host chosen in step 11). D3 Front end: 2D map + 3D globe toggle + always-present location panel with model agreement, using geolocation. D4 Global. D5 Folder layout. D6 Python 3.11 only. D7 Pin without hashes (AI shortcut). D8 Run search fails fast on server trouble. D9 Out-of-date forecast → plain warning only; addendum: technical detail stays for developers. **D10 (this plan): Docker is the official test run; `docker/` folder. D11 (this plan): localhost = Vite dev on host + Docker nginx preview. D12 (this plan): IFS stays at 240 h for now, E007 stays open.**

## Assumptions (status)
- A1 `tp` accumulated from forecast start in both models (verified). Units: IFS `m`, AIFS `kg m**-2` (verified; handled per message in step 4).
- A2 Both models `regular_ll`, 1440 × 721 (verified). Row order and longitude start are checked in step 4.
- A3 00z and 12z IFS carry 3 h steps to 144 h then 6 h to 240 h; AIFS 6 h to 360 h (verified for 00z and 12z). **IFS in fact also has files to 360 h (E007); not used for now (D12).** 06z IFS stops at 144 h, so 06z/18z are not used.
- A4 The client downloads only the requested messages (verified).
- A5 `eccodes` wheel bundles its library on Windows and Linux (verified both; Linux again inside the Docker image in step 3b).
- A6 Processed output fits a free static host's limits (measured step 7, verified step 11). Fallbacks: coarser quantisation or chunks, or AIFS only to 240 h.
- A7 Geolocation needs a secure context and user permission; there is a fallback when it is denied (step 8).
- A8 Times are shown in the browser's time zone (labelled) and in UTC; a searched remote place is shown in the browser's zone. This is a `shortcut:` to record.
- A9 Licence: CC-BY-4.0 + ECMWF Terms of Use; exact attribution wording read in step 10.
- **A10 (new)** Docker Desktop stays running on the user's machine (Windows, WSL2). Checked at the start of step 3b.
- **A11 (new)** BuildKit honours `docker/Dockerfile.dockerignore`, so no root `.dockerignore` is needed. Checked in step 3b by the build-context size.
- **A12 (new)** `http://localhost` counts as a secure context for geolocation. Checked in step 8.
- **A13 (new)** Publication lag: about 7.5 h after 00z and 12z (one run measured). The step 11 schedule starts checking around 07:45 and 19:45 UTC.

## Steps (one at a time; commit after each; tests (Docker command), line counts and the root check before every commit)

1. **Repo + records.** DONE (`ccb24df`, `591a24c`).
1b. **Apply the folder layout.** DONE (`7a83bb9`, `ba581ee`).
2. **Python environment.** DONE (`785e774`).
3. **Fetch.** DONE (`fc08c94`), plus follow-up verification (`ca6cd60`) and fixes E008/E009 (`d3a75eb`): `pipeline/fetch.py`, `config/pipeline.toml`, 20 tests pass on Windows and Linux; two full real runs (00z, 12z).

3b. **Docker test environment** (`docker/Dockerfile`, `docker/Dockerfile.dockerignore`, `docker/compose.yaml`; README + PROGRESS get the official command). Files are written as described under "Docker design". Image digest and any other source recorded in `docs/SOURCES.md`; the layout change and the reasons recorded as D10 in `docs/DECISIONS.md`; the "tests before every commit" rule in PROGRESS now names the Docker command.
   DONE-CHECK: (a) `docker info` answers; (b) `docker compose -f docker/compose.yaml build` succeeds and its log shows a build context of well under 1 MB; (c) `docker compose -f docker/compose.yaml run --rm tests` prints `20 passed`; (d) the `tests` container has no network (a one-line check inside it, e.g. a name lookup fails) yet the tests still pass; (e) `git status --short` is empty afterwards, so nothing was written into the repo, and `git ls-files | cut -d/ -f1 | sort -u` shows only allowed entries plus `docker`; (f) the Windows `.venv` still gives the same `20 passed` (not used as proof).

4. **Processing core** (`pipeline/process.py`, `pipeline/grid.py`; settings added to `config/pipeline.toml`; tests in `tests/pipeline/`). Reuses `pipeline/fetch.py` (`load_config`, `expand_steps`, `describe_messages`, `is_complete`).
   - Decode to numpy (`eccodes.codes_get_values`, reshape to 721 × 1440); verify row order and longitude convention from the GRIB keys (A2).
   - **Convert units per message** from the GRIB `units` key using `[units_to_mm]` in the config (`m` → 1000, `kg m**-2` → 1); stop with an error on any other unit (E006).
   - De-accumulate to mm per interval (difference of consecutive steps; first interval = first step, since accumulation starts at 0); small negatives clipped and counted.
   - Aggregate IFS 3 h to 6 h on the common axis; agreement classes per 6 h interval, **only over 6–240 h** where both models exist (both wet / both dry / disagree; wet threshold in the config, **proposed to the user with options before it is set**, recorded as a decision); AIFS-only beyond 240 h; quantise to 0.1 mm uint16; write `data/processed/<run>/`.
   - Tests use small synthetic arrays, clearly labelled as test fixtures.
   DONE-CHECK: the Docker test command passes (de-accumulation, **both units converted to the same mm values**, unknown unit raises, valid-time axis, lat/lon→index incl. lon wrap, quantise round trip, agreement). A real-run summary (run in the `run` service) prints the negative-clip count and the global area-weighted mean mm/day for IFS and AIFS, compared with each other and with a published climatology value (source opened and cited in SOURCES).

5. **Independent validation** (`scripts/validate_points.py`, points in `config/validation_points.toml`; run in the Docker `run` service). For about 6 named cities, read values straight from the raw GRIB with eccodes `codes_grib_find_nearest` (independent code path), apply the unit factor, and compare with the processed arrays. Optional second source: Open-Meteo's ECMWF API, **only if you approve**.
   DONE-CHECK: the script prints a comparison table for both models; max abs diff ≤ 0.05 mm.

6. **Front-end spike + decision gate + localhost** (`frontend/`, `config/frontend.json`, `docker/` additions). Propose options with a recommendation for: the map/globe library (e.g. MapLibre GL v5 globe projection vs CesiumJS vs globe.gl), the basemap (self-hosted Natural Earth vs a free tile service), the search fallback (bundled offline city list vs a geocoding API), the frame format, the Node, nginx and Playwright images (pinned by digest), and how the host dev server reaches `data/site/`. **You decide.** Then: a Vite page renders one real frame in both 2D and 3D; `npm run dev` serves it at `http://localhost:5173`; a Docker `preview` service serves the built site at `http://localhost:8080`; `node --test` and the build run in a Docker Node image.
   DONE-CHECK: `curl -I http://localhost:5173` and `curl -I http://localhost:8080` both answer 200; the build succeeds inside Docker; screenshots in `docs/evidence/` (or your visual confirmation) of both URLs and both modes.

7. **Static data API export** (`backend/export.py`, settings in `config/backend.toml`; tests in `tests/backend/`). Reads `data/processed/<run>/`; writes per-step map frames per model, point tiles (chunked grid, uint16) and `manifest.json` (run, retrieval time UTC, steps, valid times, units = mm, source URLs, licence) into `data/site/`.
   DONE-CHECK: Docker tests pass (tile index maths, manifest schema); total size printed and compared with the step 11 limits; reading a city back from a tile matches step 5.

8. **Location panel** (`frontend/src/`; tests in `tests/frontend/`). Loads the manifest; location by geolocation, with search or click as fallback; fetches only the needed tile; local-time timeline, dry windows and agreement bar ("AIFS only" past 240 h). Risky JS logic tested with `node --test tests/frontend/` **inside Docker**.
   DONE-CHECK: the Docker Node tests pass; a fixed test location shows values equal to the step 7 readback; geolocation is exercised on `http://localhost` (granted and denied) in a real browser or Playwright (A12).

9. **Map ↔ globe views** (`frontend/src/`). Animated time scrubber, colour legend with units stated (map shows mean rate in mm/h so 3 h and 6 h intervals are comparable; panel shows totals), toggle between pure 2D and pure 3D.
   DONE-CHECK: build ok in Docker; screenshots in `docs/evidence/` (or your confirmation) of both modes at two time steps on both localhost URLs; the toggle keeps the selected time and place.

10. **Provenance + honesty UI.** Run time, retrieval time, model names, units, "agreement ≠ probability" note, the ECMWF attribution text (in `config/backend.toml`, passed through the manifest) verified on the official terms page, and (D9) a **short plain-language "forecast is out of date" warning** with the run time, threshold in `config/frontend.json`, wording shown to the user first. Developer detail (D9 addendum): the proposed machine-readable status record next to the data is confirmed with the user and, if approved, written by the pipeline.
    DONE-CHECK: build ok; grep of the built HTML/JS or manifest finds the attribution string; the manifest run time is displayed; the warning appears when the manifest is made older than the threshold (tested with a changed fixture), and shows no technical text.

11. **Hosting gate + deploy** (`.github/workflows/`, `scripts/run_pipeline.py`). Check current free-tier terms of GitHub Pages / Cloudflare Pages / Netlify on official pages; **you choose**. You log in (`! gh auth login`); **with your approval** a public repo is created (you said the repo link will be given later; nothing is pushed before that). A scheduled workflow: fetch → **the same Docker test command** → process → export → build → deploy; if any stage fails, the previous deployment stays live. Cron times start checking about 7.5 h after 00z and 12z (A13) and retry for a while; the first job also confirms `eccodes` decodes a test message on the Linux runner.
    DONE-CHECK: the workflow run is green (`gh run view`); a fresh `curl` of the public URL returns the page, and the manifest has the latest run time.

12. **README + submission.** The README states what works, what does not, how to run it (including the Docker test command and the two localhost URLs), what was verified and how, known limitations (every `shortcut:`), and the final folder layout. Then `docs/SUBMISSION.md` per CLAUDE.md.
    DONE-CHECK: every checklist item is ticked only after running it (clean clone runs from the README; secret search; no `subagents/` folder; commit times within 72 h; line counts; `shortcut:` list; root check).

## Time targets (elapsed hours)
Now ~h1.7. Step 3b by ~h3 · steps 4–5 by ~h18 · steps 6–10 by ~h50 · step 11 by ~h58 · h64–72 reserved for README/submission/fixes (no new features after h64). Warnings at 24/48/60 h.

## Rules applied throughout
Functions ≤ 50 lines and files ≤ 300 lines (500 hard max), checked with `wc -l` before each commit. **Before each commit: the Docker test command, line counts, root check.** Settings go into `config/`. `shortcut:` comments are mirrored in DECISIONS; errors go in ERRORS with IDs and counters; facts in DOMAIN; sources in SOURCES; `date -u` in PROGRESS at every commit. No subagents.

## Verification (end to end)
`docker compose -f docker/compose.yaml run --rm tests` passes (Python now; Node tests from step 6). The step 5 validation table is within 0.05 mm for both models. IFS and AIFS global means agree after unit conversion. `http://localhost:5173` and `http://localhost:8080` both serve the working site. The public URL loads via `curl` with the current run's manifest. Screenshots or user confirmation of both views. The scheduled workflow has refreshed the data at least once on its own. The root check shows only allowed entries.
