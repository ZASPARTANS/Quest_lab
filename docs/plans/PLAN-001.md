# PLAN-001 — Precipitation forecast app (ECMWF IFS + AIFS)

- Drafted: 2026-11-06 (approx. 18:30–18:42 UTC, in plan mode)
- Written to this file: 2026-11-06 18:42 UTC
- Session: `3e56a452-e5f8-4bb9-b353-63bad43748f4`; first prompt 2026-11-06T18:19:13Z; deadline 2026-11-09T18:19:13Z
- Approval: approved by the user (the owner) through the plan-mode approval prompt, 2026-11-06 ~18:42 UTC. Plan text below is unchanged from what was approved.

## Context / Goal
Project 1 of the QUEST Lab application: fetch precipitation forecasts from ECMWF Open Data, process them, and deploy a **public** web app with an innovative front end. Outcome: a static web app, refreshed automatically from every 00z/12z run, that shows global precipitation from **IFS and AIFS**, with:
- a **2D animated map ↔ 3D globe toggle** (same data, time scrubber),
- an **always-visible location panel**: it uses browser geolocation (with permission; search or map click if denied) and shows a local-time rain timeline, dry windows, and an **IFS-vs-AIFS agreement** bar (labelled as agreement, never as probability),
- visible provenance: model, run time, retrieval time, units, CC-BY-4.0 attribution.

## Decisions already made by the user (to record in docs/DECISIONS.md in step 1)
D1 Models: IFS (oper) + AIFS Single. D2 Architecture: static site + scheduled pipeline (exact free host chosen in step 11). D3 Front end: 2D map + 3D globe toggle, plus the always-present location panel with model agreement, using geolocation. D4 Coverage: global.

## Assumptions (each is checked in the step named)
- A1 `tp` is in metres, accumulated from step 0, in both models (step 3: GRIB keys `units`, `stepType`, `startStep/endStep`).
- A2 Both models use the same regular 0.25° lat/lon grid, 721×1440 (step 4).
- A3 00z/12z runs carry the full range (IFS 3 h to 144 h, then 6 h to 240 h, checked today on the 00z run; AIFS 6 h to 360 h). The 06z/18z runs are shorter or unverified, so they are not used (step 3).
- A4 The official `ecmwf-opendata` client downloads only `tp` messages (byte ranges). If not, we use our own small `.index`-based range download (step 2/3, read the installed source).
- A5 The `eccodes` pip wheel decodes GRIB2 on Windows and Linux without a separate C install (step 2).
- A6 Processed output (frames + point tiles) fits a free static host's limits (step 7 measures the size; step 11 verifies the limits). Fallbacks: coarser quantisation or chunks, or AIFS only to 240 h.
- A7 Geolocation needs HTTPS and user permission; there is a fallback when it is denied (step 8).
- A8 Times are shown in the browser's time zone (labelled) and in UTC. A searched remote place is shown in the browser's zone, not its own. This is a `shortcut:` to record.
- A9 Licence: CC-BY-4.0 + ECMWF Terms of Use (read today on ecmwf.int open-data page). Exact attribution wording still to be read on the terms page (step 10).

## Steps (one at a time; commit after each; tests before every commit; line counts before every commit)

1. **Repo + records.** `git init`; `.gitignore` (`.claude/`, `.env`, `.venv/`, `node_modules/`, `dist/`, `data/`, `site-data/`, `*.grib2`); `docs/PROBLEM.md` with the problem statement exactly as given; this plan as `docs/plans/PLAN-001.md`; `docs/DECISIONS.md` (D1–D4); `docs/ERRORS.md` (empty summary table); update PROGRESS. First commit.
   DONE-CHECK: `git status` clean; `git check-ignore -v .claude/settings.local.json` matches; `git show --stat HEAD` lists PROBLEM.md; a byte comparison of PROBLEM.md against the given statement shows they are identical.

2. **Python environment.** `py -3.11 -m venv .venv`. Check each package on its PyPI page before installing: `ecmwf-opendata`, `eccodes`, `numpy`, `pytest` (+ `Pillow` only if step 6 picks PNG frames). Pin in `requirements.txt`; record in SOURCES. Read the installed `ecmwf-opendata` source for A4. No xarray/cfgrib unless a need appears (eccodes + numpy are enough).
   DONE-CHECK: `python -c "import eccodes; print(eccodes.codes_get_api_version())"` prints a version; `pip freeze` matches `requirements.txt`.

3. **Fetch** (`pipeline/fetch.py`). Find the latest complete 00z/12z run where both models are published. Download only `tp` for all steps into `data/raw/<run>/<model>/` (gitignored).
   DONE-CHECK: the run prints run time, message count per model and total MB; an eccodes key dump shows `shortName=tp`, the units, `stepType` and the step ranges. Facts recorded in DOMAIN (A1, A3), lag between run and availability included.

4. **Processing core** (`pipeline/process.py`, pure functions + `tests/`). Decode to numpy; verify grid orientation and longitude convention (A2); de-accumulate to mm per interval (m→mm, small negatives clipped and counted); aggregate IFS 3 h to 6 h on the common axis; agreement classes per 6 h interval (both wet / both dry / disagree, with a wet threshold to be stated and recorded as a decision); quantise to 0.1 mm uint16. Tests use small synthetic arrays, clearly labelled as test fixtures.
   DONE-CHECK: `pytest -q` passes (de-accumulation, units, valid-time axis, lat/lon→index incl. lon wrap, quantise round trip, agreement). A real-run summary prints the negative-clip count and the global area-weighted mean mm/day, which is compared with a published climatology value (source opened and cited in SOURCES).

5. **Independent validation.** For about 6 named cities, read values straight from the raw GRIB with eccodes `codes_grib_find_nearest` (an independent code path) and compare them with the processed arrays. Optional second source: Open-Meteo's ECMWF API, **only if you approve** sending coordinate requests to it.
   DONE-CHECK: the script prints a comparison table; max abs diff ≤ 0.05 mm (the quantisation step).

6. **Front-end spike + decision gate.** Propose options with a recommendation for: the map/globe library (e.g. MapLibre GL v5 globe projection vs CesiumJS vs globe.gl), the basemap (self-hosted Natural Earth vs a free tile service), the search fallback (bundled offline city list vs a geocoding API), the frame format, and a headless-screenshot dev tool (Playwright) for verification. **You decide.** Then a Vite page renders one real frame in both 2D and 3D.
   DONE-CHECK: `npm run build` ok; screenshots of both modes (or your visual confirmation if no screenshot tool is approved).

7. **Static data export** (`pipeline/export.py`). Writes per-step map frames per model, point tiles (chunked grid, uint16), and `manifest.json` (run, retrieval time UTC, steps, valid times, units, source URLs, licence) into `site-data/`.
   DONE-CHECK: `pytest -q` (tile index maths, manifest schema); the total size is printed and compared with the step 11 limits; reading a city back from a tile matches step 5.

8. **Location panel** (frontend data layer). Loads the manifest; gets location by geolocation, with search or click as fallback; fetches only the needed tile; shows the local-time timeline, dry windows and the agreement bar (no agreement shown past 240 h: "AIFS only"). Risky JS logic (tile index, time conversion, dry windows) is tested with Node's built-in `node --test`.
   DONE-CHECK: `node --test` passes; a fixed test location shows values equal to the step 7 readback.

9. **Map ↔ globe views.** Animated time scrubber, colour legend with units stated (map shows the mean rate in mm/h so 3 h and 6 h intervals are comparable; the panel shows totals), and a toggle between pure 2D and pure 3D.
   DONE-CHECK: build ok; screenshots (or your confirmation) of both modes at two time steps; the toggle keeps the selected time and place.

10. **Provenance + honesty UI.** Run time, retrieval time, model names, units, staleness banner (data older than an agreed threshold), "agreement ≠ probability" note, and the ECMWF attribution text verified on the official terms page.
    DONE-CHECK: build ok; a grep of the built HTML/JS finds the attribution string and the manifest run time is displayed.

11. **Hosting gate + deploy.** Check the current free-tier terms of GitHub Pages / Cloudflare Pages / Netlify on official pages; **you choose**. You log in (`! gh auth login`); **with your approval** a public repo is created. A GitHub Actions workflow runs on a schedule after the 00z/12z data appears: fetch → tests → process → export → build → deploy. If any stage fails, the previous deployment stays live.
    DONE-CHECK: the workflow run is green (`gh run view`); a fresh `curl` of the public URL returns the page, and the manifest has the latest run time.

12. **README + submission.** The README states what works, what does not, how to run it, what was verified and how, and known limitations (every `shortcut:`). Then `docs/SUBMISSION.md` per CLAUDE.md.
    DONE-CHECK: every checklist item is ticked only after running it (clean clone in a temp folder runs from the README; secret search; no `subagents/` folder; commit times within 72 h; line counts; `shortcut:` list).

## Time targets (elapsed hours)
Steps 1–5 by ~h18 · steps 6–10 by ~h50 · step 11 by ~h58 · h64–72 reserved for README/submission/fixes (no new features after h64). Warnings at 24/48/60 h.

## Rules applied throughout
Functions ≤ 50 lines and files ≤ 300 lines (500 is the hard max), checked with `wc -l` before each commit. `shortcut:` comments are mirrored in DECISIONS. Each error goes in ERRORS with an ID and counters. Facts go in DOMAIN, sources in SOURCES. `date -u` is logged in PROGRESS at every commit. No subagents.

## Verification (end to end)
`pytest -q` and `node --test` pass. The step 5 validation table is within 0.05 mm. The public URL loads via `curl` with the current run's manifest. Screenshots or user confirmation of both views. The scheduled workflow has refreshed the data at least once on its own.
