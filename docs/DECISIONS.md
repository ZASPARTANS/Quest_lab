# DECISIONS

Append only. Each entry: date/time, what was chosen, alternatives, why, who decided, and a bet that can be checked later.

## D1 — Models: IFS (oper) + AIFS Single
- 2026-11-06 ~18:35 UTC. Decided by: **user** (AI recommended the same).
- Chosen: ECMWF IFS HRES (`ifs/0p25/oper`) and AIFS Single (`aifs-single/0p25/oper`), both total precipitation `tp`.
- Alternatives: IFS only; AIFS only. Both would drop the always-visible IFS-vs-AIFS agreement panel the user asked for.
- Why: IFS gives 3-hourly detail to 144 h then 6-hourly to 240 h; AIFS gives 6-hourly to 360 h. Where they overlap they can be compared. Agreement is shown as agreement, never as a probability.
- Checkable bet: both models publish the full step range on 00z/12z runs (checked on the 00z run of 2026-11-06 only; to be checked again in plan step 3).
- Result: pending.

## D2 — Architecture: static site + scheduled pipeline
- 2026-11-06 ~18:38 UTC. Decided by: **user** (AI recommended).
- Chosen: a Python pipeline run on a schedule writes processed static files; a static front end loads only what it needs. No live server. The exact free static host is chosen later (plan step 11) after the AI checks current free-tier terms on official pages.
- Alternatives: FastAPI on a free PaaS (cold starts, small RAM, ephemeral disk, coordinates sent to a server); local run with one fixed snapshot (goes stale).
- Why: no server to sleep or crash, no RAM cap for the global grid, location stays in the browser, app can be public.
- Checkable bet (assumption A6): the processed output fits free static-host limits. Measured in plan step 7, verified in step 11.
- Result: pending.

## D3 — Front end: 2D map + 3D globe toggle + always-present location panel
- 2026-11-06 ~18:36 UTC. Decided by: **user** (user's own combination of the offered options).
- Chosen: animated precipitation map with time scrubber, and a 3D globe view, switchable between pure 2D and pure 3D. A location panel with a local-time rain timeline and the IFS-vs-AIFS agreement is present in both views. Browser geolocation is used to start at the user's place, with search/click as fallback when permission is denied.
- Alternatives offered: map only; place-first planner only; globe only.
- Why (user): a location result without searching is faster and more comfortable; model agreement must always be visible.
- Checkable bet: one library can serve both 2D and 3D (e.g. a map library with globe projection). Decided at plan step 6 with the user.
- Result: pending.

## D4 — Coverage: global
- 2026-11-06 ~18:38 UTC. Decided by: **user** (AI recommended).
- Chosen: the whole 0.25-degree grid, delivered as chunked tiles so the browser loads only the area it needs.
- Alternatives: Europe; India / South Asia.
- Fallback if output is too large for the host: coarser quantisation, bigger chunks, or AIFS only beyond 240 h.
- Result: pending (size measured in plan step 7).

## D5 — Folder structure (clean, separated by responsibility)
- 2026-11-06 18:49 UTC. Decided by: **user** (requested the principles; AI proposed the exact layout in PLAN-002; user approved it).
- Chosen layout (root entries allowed: `README.md`, `.gitignore`, `pyproject.toml`, `requirements.txt`, `.env.example` only if a secret is ever needed, and these folders):
  - `config/` — ALL settings, no code: `pipeline.toml`, `backend.toml`, `frontend.json`, `validation_points.toml`.
  - `pipeline/` — data fetching and processing (Python): `fetch.py`, `process.py`, `grid.py`.
  - `backend/` — builds the static data API the frontend reads (`export.py`: frames, point tiles, `manifest.json`).
  - `frontend/` — Vite web app (`index.html`, `src/`, `package.json`, `vite.config.js`).
  - `tests/` — `pipeline/` and `backend/` (pytest), `frontend/` (`node --test`).
  - `scripts/` — thin command-line entry points only (`run_pipeline.py`, `validate_points.py`).
  - `docs/` — project records, `plans/`, `evidence/` (screenshots).
  - `.github/workflows/` — scheduled build and deploy (GitHub requires this path).
  - `data/` — IGNORED: `raw/`, `processed/`, `site/` (everything downloaded or generated).
- Why: each responsibility can be read, tested and replaced on its own; the root stays tidy; nothing generated can reach git; settings can be changed without touching code (Python reads TOML with the standard-library `tomllib`).
- "Backend" meaning: because of D2 there is no live server. `backend/` is the part that publishes the static data API (tiles + manifest). A literal running server would reverse D2 and needs a new decision.
- Folders are created with their first real file (git cannot hold empty folders; placeholder files would be stray files).
- Alternatives considered: one `src/` package with sub-packages (less visible separation); export inside `pipeline/` (mixes processing with publishing, which was PLAN-001's shape).
- Honest limit: the first commit `ccb24df` predates this decision; it holds only `.gitignore` and `docs/`, which already match the layout. History is not rewritten.
- Any later change to this structure is raised with the user first and recorded here.
- Checkable bet: the root check (`git ls-files | cut -d/ -f1 | sort -u`) shows only allowed entries at every commit. Result: pending.

## D6 — Python version: 3.11 (not 3.10)
- 2026-11-06 ~18:52 UTC. Decided by: **user** (message: "use the Python 3.11 as the 3.10 has broken files"; matches the AI's workaround for E001).
- Chosen: all Python work uses Python 3.11.9 (`py -3.11`) in a virtual environment `.venv/`. `pyproject.toml` will state `requires-python = ">=3.11"` (plan step 2). Python 3.11 also provides `tomllib` for the config files (D5).
- Alternative: repair the Python 3.10 install. Rejected by the user; the broken `pip` there is not touched (see E001).
- Checkable bet: step 2 installs all pinned packages into the 3.11 venv without errors. Result: pending.

## D7 — Dependency pinning: exact versions, no hashes (shortcut)
- 2026-11-06 ~19:00 UTC. Decided by: **AI** (follows the CLAUDE.md rule "pin versions"; the user asked for a proper history of the libraries in `requirements.txt`).
- Chosen: `requirements.txt` pins every installed package (4 direct + 19 transitive = 23) with `==`, with the direct ones listed first and a reason after each. The history of changes is kept by git (`git log -p requirements.txt`) and by `docs/SOURCES.md`.
- Shortcut: no `--hash` lines (`--require-hashes`). Reason: time budget; versions are pinned and checked by a fresh-venv rebuild, but a tampered package at the same version would not be caught. Noted in the header of `requirements.txt`; to be listed in the README known limitations.
- Alternatives: a separate `requirements.in` + lock file (needs another tool and another root file); `pyproject.toml` dependencies (would duplicate the pins).
- Note: `numpy` 2.5.4 is the newest release but needs Python >= 3.12, so pip chose 2.4.6 on Python 3.11 (D6).
- Checkable bet: a fresh venv built from `requirements.txt` equals the working one. Result: **held** on 2026-11-06 ~19:00 UTC (both lists identical, 23 packages).

## D8 — Run search policy: fail fast and loud on server trouble
- 2026-11-06 ~19:52 UTC. Decided by: **AI**, following the user's instruction to fix E008 and E009 first (the exact policy was proposed to the user and the user told the AI to fix both).
- Chosen: during the search for the latest complete run, an answer other than 200 (published) or 404 (not published yet) stops the run with `UnexpectedStatus`; the search uses 2 attempts 5 s apart (config keys `search_max_retries`, `search_retry_after_seconds`). Downloads keep 3 attempts 10 s apart. Downloads are written to a `.part` file and renamed only when the file holds exactly the expected steps.
- Alternatives: keep the client's default (silent fall-back to an older run on a 503, very slow); retry 503 with long back-off (hides outages and risks the hang seen in E009).
- Why: a scheduled job that fails loudly leaves the previous deployment live and is visible in the logs; silently serving an older run would be wrong data that looks right.
- Checkable bet: transient 503/429 from the ECMWF server are rare enough that aborting is acceptable. Result: pending (to be observed once the scheduled job runs).

## D9 — Old or missing forecast: plain-language warning only
- 2026-11-06 20:03 UTC. Decided by: **user** (message: "we will just stick to the warning instead of giving detailed information because not all users know what it means").
- Chosen: when the shown forecast is older than a threshold (set in `config/frontend.json`), the app shows one short, plain-language warning that the forecast is out of date, together with the forecast's run time. It does NOT show technical causes (server errors, HTTP codes, "ECMWF source unavailable"). The technical detail stays in the pipeline logs and in docs/ERRORS.md.
- Alternatives: name the cause in the UI ("data source unavailable"); show an empty/error page instead of the last good forecast. Not chosen.
- Context: because of D2 the site is static and never contacts ECMWF; if a scheduled job fails, the last good forecast stays online (plan step 11), so the age warning is what tells a visitor the data is old (plan step 10).
- Not built yet: no front end exists. The exact wording and threshold are decided in plan step 10 and shown to the user before use.
- Checkable bet: visitors understand a simple age warning. Result: pending.

### D9 addendum — technical detail stays available to developers
- 2026-11-06 20:04 UTC. Decided by: **user** (message: "the technical warning can be helpful for developer to find the exact error"). The exact place was proposed by the AI and is to be confirmed with the user in plan step 10.
- Chosen: visitors see only the plain age warning (D9). Developers get the exact technical error from places visitors do not look at:
  1. the pipeline log and the failed scheduled job (already true today: errors carry the exception type, URL and status, e.g. `UnexpectedStatus: HEAD <url> answered 503`);
  2. recommended addition, not built yet: a small machine-readable status record published next to the data (last successful run time, last attempt time, last error text), readable with `curl` but not shown on the page.
- Alternative not chosen for now: a "Details" toggle on the page. It would put technical text in front of visitors, which D9 wanted to avoid.
- Checkable bet: the status record is enough to find the cause of a stale forecast without opening the job logs. Result: pending.

## D10 — Docker is the official test run; new `docker/` folder (layout change to D5)
- 2026-11-06 20:13 UTC. Decided by: **user** ("we will use the docker to do all the testing"; chose "Docker is the official test run"); the exact files were proposed by the AI in PLAN-004 and approved.
- Chosen: "tests pass" means `docker compose -f docker/compose.yaml run --rm tests` passes. The image is `python:3.11-slim` pinned by digest with only `requirements.txt` installed; project code is mounted read-only at run time; the tests container has no network. The Windows `.venv` stays for quick trying only, never as proof.
- Layout change (raised with the user before doing it, as the rule requires): new top-level folder `docker/` holding `Dockerfile`, `Dockerfile.dockerignore`, `compose.yaml`. No new file in the repo root.
- Alternatives: Docker only and remove the Windows venv (slower to iterate; drops what step 2 built); keep both with no rule (no guaranteed Linux proof per commit).
- Why: most servers run Linux (the user's reason), and the scheduled job will run the same command, so local and CI results match.
- Checkable bet: the Docker run gives the same `20 passed` as the venv and writes nothing into the repo. Result: pending (plan step 3b).

## D11 — Localhost preview: Vite dev server on the host plus a Docker nginx preview
- 2026-11-06 20:13 UTC. Decided by: **user** (chose "Both: Vite on host + Docker preview").
- Chosen: `npm run dev` on Windows at http://localhost:5173 (instant reload) and a Docker `preview` service serving the built site and `data/site/` at http://localhost:8080 (closest to a real static host). Images (Node, nginx, Playwright) are chosen and pinned at the plan step 6 decision gate.
- Alternatives: everything in Docker (file-change detection through Windows folders is unreliable); host only (nothing tests the built site as a static host serves it).
- Checkable bet: both URLs answer 200 and show the same site (plan steps 6 and 9). Result: pending.

## D12 — IFS stays at 240 h for now (E007 stays open)
- 2026-11-06 20:13 UTC. Decided by: **user** (chose "Not now, keep 240 h").
- Chosen: `config/pipeline.toml` keeps IFS steps 3..240 h. The agreement bar is computed only over 6..240 h; beyond that the app shows AIFS only. IFS files exist up to 360 h with precipitation (E007), so this can be revisited later as a small config change plus re-verification.
- Alternative: extend to 360 h now (full 15-day agreement, about 12 MB more per run).
- Result: pending.

### D7 correction (2026-11-06 20:18 UTC)
- The D7 result "held (both lists identical, 23 packages)" was true for Windows only. Linux needs 25 packages (E011). `requirements.txt` now pins both sets with a `sys_platform == "linux"` marker on the two extra packages. The no-hashes shortcut is unchanged.

### D10 result (2026-11-06 20:18 UTC)
- Held. The Docker test run gives the same `20 passed` as the venv, writes nothing into the repo (`git status` showed only my intended changes), runs with no network, and passes failure exit codes through (5 for "no tests selected", 1 for a failing command). Details: PROGRESS.md, step 3b.

## D13 — "Wet" threshold for the agreement bar: 0.5 mm per 6 h
- 2026-11-06 ~20:23 UTC. Decided by: **user** (chose the AI-recommended option out of 0.1 / 0.5 / 1.0 mm per 6 h).
- Chosen: a 6-hour interval counts as wet for a model when its precipitation is >= 0.5 mm. Agreement per interval and grid cell: both wet, both dry, or disagree. The value lives in `config/pipeline.toml` (`wet_threshold_mm`), so changing it needs no code change.
- Alternatives: 0.1 mm (most sensitive, models spread faint drizzle widely, so "both wet" could dominate); 1.0 mm (clean signal, but light showers count as dry).
- Why: 0.5 mm is rain a person would notice, and it ignores model drizzle noise. The AI's reasoning here is a judgement, not a measurement.
- Checkable bet: the share of "both wet" cells on a real run is neither near 0 nor near the share at 0.1 mm. Result: pending (to be printed in the step 4 real-run summary).

## D14 — Processed data: one 6-hour axis for both models, uint16 files (two shortcuts)
- 2026-11-06 ~20:32 UTC. Decided by: **AI**, following PLAN-004 step 4 (the plan already said "aggregate IFS 3 h to 6 h on the common axis"); the details below were not asked of the user.
- Chosen: both models are stored as mm per 6 h interval (IFS 40 intervals to 240 h, AIFS 60 to 360 h). Format: `data/processed/<YYYYMMDDHH>/<model>.npy` (uint16, units of `quantise_mm` = 0.1 mm, shape intervals x 721 x 1440, row 0 = north, column 0 = 180 E), `agreement.npy` (uint8: 0 both dry, 1 both wet, 2 disagree) and `meta.json`. The folder is built as `<run>.part` and replaces the final folder at the end.
- Shortcut 1 (marked `shortcut:` in `pipeline/process.py`): IFS 3-hourly detail (0-144 h) is dropped. IFS 6 h = difference of its own 6-hourly accumulations, which is exact, so only the 3 h view is lost. Reason: one common axis keeps the agreement, the export and the front end simple. Reversible by adding a second axis later (new plan).
- Shortcut 2 (marked in the same place): negative differences are set to 0 and counted, not carried into the next interval. Measured cost: 0.056 % (IFS) and 0.014 % (AIFS) of the precipitation mass.
- Not a shortcut but a limit: the GRIB fields are packed at 12 bits, so a 6 h value can be off by up to about 0.24 mm (IFS, late) or 0.125 mm (AIFS) (docs/DOMAIN.md). 0.1 mm storage is finer than that, so no precision is lost by quantising.
- Alternatives: keep IFS 3 h as a second array (about 1.6x larger IFS file, a second time axis for the front end); `.npz` compressed (slower, no benefit while the data stays out of git).
- Checkable bet: the export step (7) can build map frames and point tiles from these arrays within the host limits (A6). Result: pending.

### D13 result (2026-11-06 ~20:32 UTC)
- Held on two runs (00z and 12z of 2026-11-06): "both wet" is 15.3 % / 15.1 % of cell-intervals at 0.5 mm, against about 39 % at 0.1 mm and 8.8 % at 1.0 mm, so the value is neither extreme. Note: AIFS has more light-rain cells than IFS (27 % vs 20 % at 0.5 mm), a model difference the UI must not hide.

## D15 — Security first: audit now, fixes as a plan, a security note in every plan
- 2026-11-06 ~20:43 UTC. Decided by: **user** (message before step 5: "we need to make sure about the security which I forgot to mention", with a five-point instruction).
- Chosen: (1) step 4 is finished and committed (`dc2535c`), step 5 is paused; (2) the whole project so far is audited and the result is in `docs/SECURITY.md`; (3) the fixes are written as `docs/plans/PLAN-005.md` and no code is changed before the user approves; (4) a security check is added to the submission checklist in `docs/PROGRESS.md`; (5) every plan from now on contains a short "Security note".
- Alternatives: fix the findings immediately (rejected by the user's instruction: plan first, approval first); postpone security to the end (rejected: S03 and S01 are cheaper to fix before more code depends on them).
- Result of the audit: no Critical or High finding; nine findings (S01-S09); see SECURITY.md. Result of the decision: pending the approval of PLAN-005.

## D16 — Identity in the public repo: keep the author e-mail as is (S06)
- 2026-11-06 ~20:51 UTC. Decided by: **user** (message: "the S5 is fine it can have my email").
- Chosen: the commits keep the author e-mail they already have (the user's own address); no history rewrite, no noreply address. Machine name, local paths and the user's name in `docs/` also stay (the session-log path is required by the submission checklist anyway).
- Alternatives offered: GitHub noreply address for new commits; noreply plus rewriting the 14 local commits before the first push.
- Consequence the user accepted: the address will be public in the git history once the repo is pushed, and cannot be removed afterwards without rewriting a public history.
- Checkable bet: none. Result: PLAN-005 step S5 is complete with this decision (no code change).

## D17 — No hardcoded paths: every folder, file name and format comes from config
- 2026-11-06 ~21:03 UTC. Decided by: **user** (message: "also dont forget no HARDCODING THE PATH"); it restates the config rule already in CLAUDE.md.
- Chosen: no absolute path anywhere in the code; all folder names, file names, name formats and suffixes of the data layout are in `config/pipeline.toml` `[paths]` and are read through `pipeline/paths.py`. A test fails if one of those names appears as a string literal in `pipeline/*.py` or if an absolute path appears (`tests/hygiene/test_no_hardcoded_paths.py`). The same rule applies to everything built from now on (export, front end, scripts, workflows).
- Alternatives: leave names in code as a "layout contract" (rejected by the user's instruction).
- Fixed exceptions (written down so they are not hidden): the config file's own location relative to the project folder; container-internal mount points `/work` and `/tmp` in the Docker files (the host side of the data mount is `DATA_DIR`).
- Result: applied in the fix of E016; checked by the guard test.

## D18 — Pin hashes for every package, all platforms (ends the D7 no-hashes shortcut)
- 2026-11-06 ~21:28 UTC. Decided by: **user** (chose "Hashes for all platforms (Recommended)" out of: all platforms / Linux set only / keep pins without hashes), after the AI proposed the options in PLAN-005 step S4.
- Chosen: `requirements.txt` holds, for each of the 25 pinned packages, the sha256 of every file PyPI published for that exact version (430 hashes). `pip install --require-hashes` is used by the Docker image and in the README for the venv. `scripts/pin_hashes.py` (settings in `config/security.toml` [hashes]) regenerates the hash lines after a version change; it needs internet and is run on the host.
- Alternatives: hashes for the Linux set only (two sets to keep in step); keep D7's pins without hashes (leaves the "replaced package at the same version" risk open).
- Honest limit: the hashes come from PyPI at the time the script runs. They catch a file that changes later; they cannot catch a file that was already bad when the hashes were generated. The vulnerability scan (SECURITY.md) is a separate control.
- Effect on D7: the shortcut "no hashes" is gone; the other part of D7 (exact pins, direct before transitive) stays. The README no longer needs to list "no hashes" as a known limitation.
- Checkable bet: a fresh install from the hashed file reproduces the working environment on both platforms. Result: **held** (Windows fresh venv freeze equals the 23 Windows pins; Linux image freeze equals the 25 pins; `pip check` clean on both).

## D19 — Two sites: localhost for testing and for the public look; one hosted public site, deployed automatically
- 2026-11-06 ~21:39 UTC. Decided by: **user** (message: "we need to host one is similar to how public user see and other is for testing"; then, answering the AI's questions: "i am talking about the local host for now for testing" and "Automatic after tests pass"). Approved through plan mode.
- Chosen: (1) `http://localhost:5173` (Vite dev server) is the TESTING site and shows a small DEV badge; (2) `http://localhost:8080` (Docker nginx preview) is the site similar to how the public sees it: the production build, the same headers/CSP, no badge; (3) only ONE hosted site exists, the public one, deployed automatically when the Docker tests pass (scheduled run and push to `main`); a failed stage leaves the previous deployment live. The DEV badge rule is in `config/frontend.json` (D17).
- Consequence accepted by the user: no hosted staging gate. The gate is the user's own look at `localhost:8080` before pushing to `main`, plus the tests. Mitigation planned for step 11: a post-deploy smoke test and a documented one-command redeploy of the previous commit.
- Alternatives not chosen: a second hosted staging site; a manual promotion button; an access-protected test site. All would need a new plan; they stay possible later.
- This is the same structure as D11; D19 sharpens the roles and fixes the deploy rule. No new plan file (PLAN-005 stays current).
- Checkable bet: the two local sites show the same content, and only the testing one shows the badge (plan steps 6 and 9). Result: pending.

## D20 — Step 6 decision gate, part 1: what to try, which images, how places are found
- 2026-11-06 ~21:48 UTC. Decided by: **user** (answers to the AI's gate questions).
- Chosen: (1) **Spike both MapLibre GL JS and CesiumJS** with one real rainfall frame in flat and globe mode; the library is chosen afterwards from screenshots and bundle sizes (a second gate). (2) **Images**: `node:22-slim` (same line as the host's Node 22.23.4), `nginx:stable-alpine`, and a Playwright browser image, each pinned by digest. (3) **Place search when location is refused: an online geocoding service.** The specific service is chosen with the user at step 8 from the researched options below. (4) **Base map**: the user asked the AI to research it first; the result is below and the decision stays open until the second gate. The spikes use self-hosted Natural Earth outlines as a neutral base, which commits to nothing.
- Research results (official pages and real requests, 2026-11-06):
  - Natural Earth: "All versions of Natural Earth raster + vector map data ... are in the public domain"; no permission or attribution needed; some bundled third-party extras have narrower terms (naturalearthdata.com/about/terms-of-use). CesiumJS ships a Natural Earth II offline image set (`Assets/Textures/NaturalEarthII/`, EPSG:4326 JPG tiles; HTTP 200 on the file in the published 1.147.0 package).
  - OpenStreetMap tile server: allowed for normal interactive viewing on a public site; visible "(c) OpenStreetMap contributors" attribution; browsers must send a valid Referer; no bulk or offline use; "no SLA or guarantee" and "access may be blocked without prior notice" (operations.osmfoundation.org/policies/tiles).
  - OpenFreeMap: public instance free, no API key, no request limits stated, attribution required, no SLA, can be self-hosted (openfreemap.org).
  - Nominatim public API: at most 1 request per second for the whole app; no client-side autocomplete; must identify the app (Referer or User-Agent); ODbL attribution; OSMF may switch the use off (operations.osmfoundation.org/policies/nominatim).
  - Open-Meteo geocoding API: endpoint `geocoding-api.open-meteo.com/v1/search`, no key for standard use, GeoNames data, **real request with an Origin header returned `access-control-allow-origin: *`** (browser use works); free tier "less than 10'000 API calls per day, 5'000 per hour and 600 per minute", **non-commercial only** (ads or subscriptions count as commercial), CC BY 4.0 credit requested; server logs with IP addresses kept up to 90 days (open-meteo.com/en/terms). The terms page does not name the geocoding API separately.
- AI recommendations for the second gate (not decisions): base map = self-hosted Natural Earth outlines (public domain, no third-party request); geocoder = Open-Meteo, search on Enter or after a short pause with a minimum length, results cached in the browser, a privacy line on the page, and the Content-Security-Policy allowing only that host. Consequences of any online geocoder, accepted by the user's choice: the typed text and the visitor's IP go to a third party; the free service can change its terms.
- Checkable bet: one of the two libraries draws the rainfall frame correctly on both the flat map and the globe. Result: pending (spike).

## D21 — Step 6 spike results and what stays open (second gate)
- 2026-11-06 ~22:14 UTC. Decided by: **AI** for the spike design (shortcuts below); the library, base map and geocoder are **the user's decisions and are still open**.
- Spike design (shortcuts, marked in the code): `scripts/spike_frame.py` draws ONE real IFS 6 h interval (+24 h of the 12z run) as colour PNGs (a latitude/longitude image for Cesium, a Web Mercator image for MapLibre); it is throwaway and is replaced by `backend/export.py` in step 7, where the frame format is decided. The frame is not committed (it lives in git-ignored `data/site/spike/`). The outlines are Natural Earth 110m, a neutral base for both libraries.
- Evidence (real browser, both sites; screenshots in `docs/evidence/`): all 4 spike pages (2 libraries x flat/globe) finish drawing under the strict Content-Security-Policy of `config/headers.conf`, with no console or CSP error and no request to any host other than the site itself; the testing site on localhost:5173 shows the DEV badge, the public-like site on localhost:8080 does not.
- Measured per page (nginx with gzip, rain image included): **MapLibre about 0.57 MB loaded, Cesium about 1.78 MB**; time to finish drawing in a headless browser with software WebGL about 2.0-2.2 s vs 2.4-2.6 s. Build output: MapLibre JS 287 kB gzip + worker 147 kB gzip; Cesium JS 1,041 kB gzip plus 7 MB of its own static folders (dist total 13 MB).
- What each library did: **MapLibre 6.16.0**: an ordinary image source renders correctly on the flat map AND on the globe (verified by screenshots; before the spike this was unknown); switching flat <-> globe at run time kept centre, zoom and the rain layer (tested in Edge: view 78E 13N zoom 2.4 stayed identical after switching to globe and back); works with a strict policy out of the box; the Mercator image loses the poles beyond 85.05 degrees (the globe shows them blank) and high latitudes look stretched in the flat view. **CesiumJS 1.147.0**: single latitude/longitude image on a flat map and on the globe, whole planet pole to pole, lit globe; needs `CesiumWidget` instead of `Viewer` for a strict policy (E019); shows a "CESIUM ion" credit logo; deprecations in 1.146 (moved classes) show the API is still moving; flat/globe switch at run time was NOT tested.
- AI recommendation for the second gate (not a decision): **MapLibre GL JS** (3x less to download, strict-policy friendly, tested runtime switch that keeps time and place, simpler place markers); accept that frames are Mercator images or tiles and that the poles beyond 85 degrees are not shown. Cesium is the right choice only if pole-to-pole coverage and a lit 3D globe outweigh weight and policy constraints.
- Still open for the user: library; base map (AI recommends self-hosted Natural Earth outlines, research in D20); geocoder service (AI recommends Open-Meteo, decided at step 8); whether `npm audit` may be run (sends the package list to the registry).
- Checkable bet from D20 (one library draws the rain frame correctly on both flat and globe): **held for both**.

## D22 — Library: MapLibre GL JS; base map: self-hosted Natural Earth outlines; dependency scans may be run when needed
- 2026-11-06 ~22:21 UTC. Decided by: **user** (second gate of step 6: chose "MapLibre GL JS 6.16 (Recommended)" and "Self-hosted Natural Earth outlines (Recommended)"; on `npm audit`: "Run it when needed dont have to as this again").
- Chosen: (1) **MapLibre GL JS 6.16.0** for the flat map and the globe; (2) **base map = Natural Earth outlines** stored with the site (public domain, no third-party request); (3) the AI may run **dependency vulnerability scans (`npm audit`, `pip-audit`) when needed without asking each time**. The AI's reading of (3), stated so it can be corrected: it covers only those scans, which send package names and versions to the package registry; it does not cover any other outside service, account, or data.
- Alternatives not chosen: CesiumJS (richer globe, pole to pole, but about 3x the download, ready-made widgets need `unsafe-eval`, flat/globe switch untested); OpenStreetMap tiles or OpenFreeMap (visitors' IP and view area go to a third party; no availability guarantee).
- Done as a result (same day): Cesium code, packages, config and build step removed; the npm tree went from 98 to 70 packages and the production build from 13 MB to 1.7 MB; the Content-Security-Policy was tightened (`wasm-unsafe-eval` and `child-src` removed) and re-checked in a real browser (3 pages ok, no CSP error, no outside host). `npm audit` (run under the standing approval, throwaway hardened container, lock file only): **70 packages audited, 0 vulnerabilities**.
- Consequences accepted with the choice: frames are Web Mercator images or tiles (step 7); the poles beyond 85.05 degrees are not drawn; the globe is MapLibre's simple unlit globe.
- Checkable bet: the runtime flat <-> globe switch keeps time and place in the finished app (plan step 9). Result: held in the spike (view and layer unchanged after switching); pending in the app.

## Results of checkable bets that were still marked "pending" (housekeeping, ~23:03 UTC)
Appended because the evidence now exists; the original entries above are unchanged.
- **D1** (both models publish the full step range on 00z and 12z): **held.** The 00z and 12z runs of 2026-11-05 and 2026-11-06 were complete for both models; IFS even has 20 more steps than configured (E007), AIFS 60 of 60 (docs/DOMAIN.md, step 3 follow-up).
- **D3** (one library can serve both the flat map and the globe): **held.** MapLibre GL JS 6.16 draws the rain frame on both and switches at run time while keeping place and zoom (D21, D22).
- **D5** (the root check shows only allowed entries at every commit): **held** at every commit checked; at the last one the tracked root entries were `.gitignore`, `README.md`, `config`, `docker`, `docs`, `frontend`, `pipeline`, `pyproject.toml`, `requirements.txt`, `scripts`, `tests`.
- **D6** (all pinned packages install into the 3.11 venv without errors): **held** in step 2; later rebuilds with `--require-hashes` also worked on Windows and Linux (D18).
- **D7** (no hashes, a shortcut): **ended** by D18 on 2026-11-06 (hashes for every package on all platforms).
- **D11** (both local URLs answer 200 and show the same site): **held for the spike** (5173 and 8080 answered 200 with the same pages, only 5173 shows the DEV badge); to be re-checked with the finished app in step 9.
- **D19** (the two local sites show the same content and only the testing site shows the badge): **held for the spike** (screenshots in `docs/evidence/`).
- **D20** (one of the two libraries draws the frame correctly in both modes): **held for both** libraries (D21).
- Still pending, by design: D2/A6 and D4 (size limits, measured in step 7 and 11), D8 (observed once the scheduled job runs), D9 and its addendum (steps 7 and 10), D12 (IFS stays at 240 h; E007 open), D14 (export step 7).

## Shortcut register (housekeeping, ~23:03 UTC)
Every `shortcut:` marker found by `grep -rn "shortcut:"` in the code and config, and where it is recorded:
1. `pipeline/process.py`: IFS 3-hourly detail dropped, 6 h common axis (D14, shortcut 1).
2. `pipeline/process.py`: negative differences set to 0, not carried to the next interval (D14, shortcut 2).
3. `scripts/spike_frame.py`: throwaway spike frame generator, replaced by `backend/export.py` in step 7 (D21).
4. `config/headers.conf`: the security headers exist as one copy for the local preview; a converter for the public host's own format comes at step 10/11 (D19, D21; recorded here because it was not listed in DECISIONS before).
Shortcuts that are known but not yet marked in code (no code changes were allowed in this housekeeping; mark them when the files are next touched): `frontend/spikes/maplibre.js` exposes `window.__map` for the browser test (spike only, goes away with the spike in step 9); the spike pages and `frontend/index.html` are not the finished app.
The README's "known limitations" (step 12) must list every item above and every item still open in `docs/PROGRESS.md`.

## D23 — Browsers to test, no GPU anywhere, and what a visitor without WebGL2 must see
- 2026-11-06 ~23:03 UTC. Decided by: **user** for items 1-2 (messages: "lets test the firefox now and phones and safari later. Also we cant have the GPU as when we host we are using free so we cant have the GPU"; then "i can open it in firefox and see if it loads", later "the site loads files"). Item 3 is the **AI's proposal and needs the user's confirmation**.
- Chosen: (1) **Browser order:** Chromium (Docker) and Edge (host) are done; **Firefox now**; **phones and Safari later**. The AI could not test Firefox in Docker (no WebGL context in 3 configurations, ENVIRONMENT.md), so Firefox is tested by the user on their own PC: the user reports that the site loads; whether the map and rain layer drew correctly has not been confirmed. (2) **No GPU on the server side:** the pipeline and the hosting must never need one (free static hosting has none); the map is drawn in the visitor's browser, so Docker browser tests deliberately use software rendering, and anything GPU-heavy on the visitor's side must degrade gracefully.
- Proposed (needs confirmation, steps 9-10): (3) detect missing WebGL2 and show a short plain message instead of a blank page (found by the Firefox attempt: `docs/evidence/firefox-headless-maplibre-flat.png`), ideally with a non-WebGL fallback (for example a simple table or still image of the forecast for the visitor's place).
- Alternatives: test Safari/phones now (deferred by the user); a hosted GPU (not possible on free hosting).
- Checkable bet: the app shows the map in Firefox on the user's PC. Result: pending the user's confirmation.

## D24 — Signature feature: Plan-my-day; helpful extras only; 6-hour blocks; steps 7-12 reshaped
- 2026-11-06 ~23:24 UTC. Decided by: **user** (messages: "i dont see anything innovative here so from any other steps i want you to giive me idea to make the front end genuinely innovative"; answers: signature "Plan-my-day", extras "Saved places" and "Rain totals with a range", resolution "6-hour blocks everywhere"; "this extras might look good but well not help an user, the extra should be an helpful feature as well"). Approved through plan mode as `docs/plans/PLAN-006.md`.
- Chosen: (1) the signature of the app is **Plan-my-day**: pick an activity, get day cards, the best dry windows in plain words with model agreement as confidence, rain totals as a range between the two models, and up to 5 saved places stored only in the browser; (2) **text first, map second**: the plan works without WebGL; the map and globe are supporting views loaded afterwards, with a plain message when WebGL2 is missing (this adopts the AI's proposal in D23 item 3); (3) **6-hour blocks everywhere** (D14 stays; IFS 3-hourly detail stays dropped); (4) the model switch (pure IFS / pure AIFS / both with agreement always visible) stays, as in the user's first request.
- Dropped on purpose (user: extras must help): hear-the-forecast sound, compare lens, rain spiral, smooth motion, hatched agreement map as a signature, storm tour. Not chosen, possible later only if the user asks: share + calendar file, offline/installable app, other languages.
- Shortcut to record (A8, stated in the plan): places from geolocation, URL or map click use the device's time zone (labelled as such); places from the geocoder use the IANA time zone in its answer (seen in a real response: `Asia/Kolkata`).
- Unverified assumption carried by the plan: the point-tile store fits the free host's limits (A6; about 200 MB raw before compression in a naive layout); step 7 measures it and stops at a decision gate if it does not fit.
- Alternatives considered (from the nine ideas in `docs/PROGRESS.md`): agreement-first signature (agreement-aware map, butterfly timeline, lens); storm tour; sound and spiral; smooth interpolation. The user preferred usefulness over spectacle.
- Checkable bet: a user can say, for a place they know, whether the best window and the rain totals match their own judgement of the forecast. Result: pending (steps 8 and 10, user check).

## D25 — Static data export design (step 7 of PLAN-006): tiles, frames, manifest, and the size gate result
- 2026-11-06 ~23:55 UTC. Decided by: **AI** within the approved PLAN-006 (the format is a technical detail; the user's decisions D4, D14, D24 are unchanged).
- **Measured first (prototype on the real 2026-11-06 12z run, 100 six-hour layers = IFS 40 + AIFS 60, 207.6 MB raw, 45.6 % of values exactly 0):** gzip level 9 over all tiles: 16 x 16 cells layer-major **byte-shuffled 27.9 MB** (4140 files, largest 19.9 kB, average 6.7 kB); layer-major plain 32.0 MB; cell-major plain 42.9 MB; cell-major shuffled 36.0 MB; 32 x 32 tiles: 26.3 MB shuffled in 1035 files (average 25 kB per fetch), 29.8 MB plain, 42.1 / 35.8 MB cell-major.
- **Chosen:** point tiles of 16 x 16 cells; layers in the order IFS blocks then AIFS blocks; little-endian uint16 in tenths of a millimetre; bytes shuffled (all high bytes, then all low bytes); gzip 9; a 10-byte header of five uint16 (version, rows, columns, layers, flags) so the file describes itself; the browser decodes with `DecompressionStream('gzip')` (**assumption, not yet checked:** supported by the browsers we target; verified for Chromium and the user's Firefox in step 8, Safari later). Edge tiles are smaller; names `{row}_{col}.bin.gz`; place -> tile uses the same index maths as `pipeline/grid.py` (longitude starts at 180).
- **Map frames:** Web Mercator 720 x 720 PNG per model and block plus an agreement frame; a pixel shows the **maximum** of the grid cells it covers (a nearest-cell picture dropped small showers, E023). Agreement colours: both dry transparent, both wet blue, disagree orange (disagree wins in a pixel). Rain colours come from `config/frontend.json`.
- **Manifest** (`manifest.json`): run time, retrieval time, processed and export times, 6 h interval, unit, storage step, grid, tile layout, per-model steps and valid times (block END), agreement settings, frame list, source and licence. **Retrieval time = the newest modification time of the raw GRIB files** (assumption: a reused file keeps its download time, true here; fresh in the scheduled job). The attribution wording stays empty until step 10 (nothing invented). A schema check runs inside the export and fails it if the manifest is inconsistent.
- **Result of the size gate (A6 held, D4 global kept, no fallback needed):** real export **36.0 MB in 4281 files** (tiles 27.9 MB, frames 140 files 8.1 MB with the largest 93 kB, manifest 10.7 kB = 1.9 kB gzipped). A visitor fetches the manifest (about 2 kB), one tile (0.1-20 kB, average 6.7 kB) and frames on demand (average 58 kB). Fits GitHub Pages (1 GB; 3.6 %) and Cloudflare Pages (20,000 files; 21 %; 25 MiB per file) per docs/SOURCES.md; Netlify's credit model does not carry two scheduled deploys a day (derived from its page). The hosting choice stays the user's at step 11.
- **Checked end to end:** for 8 places x 2 models (16 rows) what the tiles hold is **identical** to the processed arrays and within 0.05 mm of the raw GRIB read with eccodes' own nearest-point search (`scripts/validate_site.py`); every cell of every tile of a small synthetic run equals the processed data (pytest).
- Known limit: the export took 4 min 37 s through the Windows bind mount (4281 small file writes); on Linux it should be faster (not measured).
- Alternatives not chosen: 32 x 32 tiles (fewer files, bigger fetches); plain or cell-major layouts (larger); a coarser storage grid or a land-only store (not needed at this size).
- Checkable bet: the browser reader (step 8) returns the same numbers as the Python read-back. Result: pending (step 8, Node test on a real tile).

## D26 — Public status file: error category and time only (closes S04)
- 2026-11-06 ~23:57 UTC. Decided by: **user** (chose "Category and time only (Recommended)" out of: category and time / full error text / no public status file).
- Chosen: when the scheduled job (step 11) writes a status file next to the data, it contains only the time of the last successful forecast, the time of the last attempt and a problem category (for example "data source unavailable", "run incomplete", "processing failed"). No URLs, paths, library messages or raw error text. Developers keep the full error in the job log (D9 addendum).
- Alternatives not chosen: full error text in the public file; no public status file (visitors would rely only on the age warning from the manifest's run time).
- Consequence: the categories are a fixed list in config (D17), written by the job; the file is built at step 11, and the browser shows nothing from it except what D9 allows (a plain out-of-date warning).
- Checkable bet: a stale forecast can be diagnosed from the category and the job log without exposing internals. Result: pending (step 11).

## D27 — Step 8 gate: place search by Open-Meteo geocoding; activity presets with the AI's per-activity defaults
- 2026-11-07 ~00:05 UTC. Decided by: **user** (AskUserQuestion at the start of step 8: "Open-Meteo geocoding (Recommended)" out of Open-Meteo / Nominatim / no search; "My defaults per activity (Recommended)" out of AI defaults / one threshold for all / the user gives the list).
- Chosen: (1) typed place names go to `geocoding-api.open-meteo.com/v1/search` (no key); only that one host is added to `connect-src` in `config/headers.conf`; the page says in plain words what is sent (the typed text and the visitor's IP address). Shape checked on a real response today (00:05 UTC): HTTP 200, `access-control-allow-origin: *`, `results[]` with `name`, `latitude`, `longitude`, `timezone` (IANA, e.g. `Asia/Kolkata`), `country`, `country_code`, `admin1`; a name with no match returns an object WITHOUT a `results` key. (2) Presets live in `config/activities.json` (own wet threshold, minimum window, allowed local hours); the numbers are the AI's judgement, not measured, and can be changed without code.
- Alternatives: Nominatim (1 request per second for the whole app, no time zone in its answer); no search (a visitor who refuses location could only click a map that needs WebGL2).
- Consequence accepted by the user's choice: the free tier is non-commercial only, the service keeps IP logs for up to 90 days and may change its terms (D20).
- Checkable bet: a typed city returns a place with a valid time zone in the real browser (Chromium, then the user's Firefox). Result: pending.

## D28 — Plan rules for Plan-my-day (step 8; AI's choices inside the approved PLAN-006, open to the user's correction)
- 2026-11-07 ~00:06 UTC. Decided by: **AI**. Written down before the code so that the rules can be challenged.
1. **One wet rule everywhere:** a block is wet for a model when the STORED value (0.1 mm steps) is at or above the threshold. The pipeline used the unrounded value for the agreement field, so at the 0.5 mm edge the map (0.47 mm = dry) and the plan (stored 0.5 mm = wet) could disagree. Fix: the agreement field is computed from the stored values (`pipeline/processed.py`, `process.agreement` now compares stored integers with the threshold in stored units). Needs a re-run of `process` and `export` (about 10 minutes).
2. **Blocks and days:** a block is (end - 6 h, end] in UTC (D14, valid time = END). It belongs to the local day that contains its MIDPOINT, so every day normally has 4 blocks (India: 05:30-11:30, 11:30-17:30, 17:30-23:30 and 23:30-05:30 of the next day). A block is "in hours" for an activity when its midpoint falls inside the activity's allowed hours.
3. **Block state per activity** (threshold t): both dry = "dry"; both wet = "wet"; one wet, one dry = "models disagree"; beyond the IFS range only AIFS exists: "dry" or "wet" marked "one model only".
4. **Window** = a run of consecutive blocks that are in hours and not "wet", at least `min_blocks` long. Confidence: "sure" (every block both-dry), "uncertain" (some block where the models disagree), "one model" (some block covered by AIFS alone). Ranking: sure, uncertain, one model; then longer first; then sooner first. Top 3 are shown. Never shown as a probability (D3).
5. **Now:** past blocks are dropped. The block under way counts for a window only if at least half of it remains (`current_block_min_remaining_fraction` in `config/activities.json`); a window that starts in it is shown as starting "now".
6. **Rain totals** (3, 7 and 10 days) cover 12, 28 and 40 blocks starting with the block under way (whole blocks, no pro-rating). Range = lower and higher of the two models' sums over the blocks BOTH models cover, with each model's own number; blocks beyond the IFS range are added as an "AIFS only" line, never mixed into the range. IFS ends 40 blocks after the run time, so the 10-day total is always partly AIFS only.
7. **Time zones:** a place from the geocoder uses the IANA zone in its answer; a place from geolocation, the URL or a map click uses the device's zone and says so (A8). A zone name is checked by pattern and by `Intl` before use; an invalid one falls back to the device zone.
8. **Tile reader defends against a host that already decodes gzip:** if the bytes do not start with the gzip magic (1f 8b) but with the tile header, they are used as they are.
- Checkable bets: the windows and totals for known places equal an independent Python calculation from the raw GRIB reads (step 8 done-check); a user finds the best window for a place they know plausible (user check). Result: pending.

### D28 consequence found while applying rule 1 (2026-11-07 ~00:15 UTC; corrected from a guessed "00:50" - see E024)
- Deciding "wet" on the STORED value changes where the cut-off really lies: a stored value of 0.5 mm means a raw value from 0.45 mm, so "wet at 0.5 mm" now catches 0.45-0.5 mm too. Measured by re-processing the same 12z run: both wet **17.6 %** (was 15.1 %), both dry **64.6 %** (was 67 %), disagree 17.8 % (was 17-18 %) of cell-intervals. D13's bet (neither extreme) still holds. The page says "rain is rounded to 0.1 mm" next to the threshold. Alternative not chosen: keep the unrounded rule in the pipeline and accept map/plan disagreement at the edge (a block shown as "0.5 mm" would sometimes count as dry on the map but wet in the plan).

### Results of bets (step 8, 2026-11-07 ~00:30 UTC)
- **D25** (the browser reader returns the same numbers as Python; `DecompressionStream` is supported): **held** in Chromium 158, Firefox 159 and WebKit 27 (Docker); 800 values from 8 real places are identical to the raw reads; the user's own Firefox and Safari are still to be seen.
- **D27** (a typed city returns a place with a valid time zone in the real browser): **held in Chromium** with the real service (zone `Asia/Kolkata` used for the plan); the mock replies pass in Firefox and WebKit; the user's own Firefox pending.
- **D28** (the plan equals an independent Python calculation): **held**, 8 places x 8 activities, windows, day states and totals. The user's judgement of the windows is still pending (D24).
- **Shortcut register:** one new marker, `frontend/src/app.js` (device time zone for a place found by the device, labelled in the page; D24, A8). Still unmarked: `window.__map` in the spike page.

## D29 — Map back on the home page and a visual design pass (PROPOSED, waiting for the user)
- 2026-11-07 ~00:42 UTC. Status: **proposal by the AI, not decided.** Trigger: the user's feedback after trying the plan page ("it gives the answer that we need but it should also look good right? also y did u remove the 2d view and 3d view?").
- Facts: D3 (the user's own choice) asked for a 2D/3D toggle with the location panel always present; PLAN-006 step 9 puts the map and globe back as supporting views, but until then they are only reachable as spike links at the bottom of the plan page, which the user did not expect. The plan page is correct but visually plain (own judgement from the screenshot `docs/evidence/step8-chromium-address.png`).
- Proposal: (1) step 9 brings the map and globe onto the home page (flat/globe toggle that keeps place and block, model switch IFS / AIFS / both with agreement, click to set the place, plain message without WebGL2, plan text still above so it works without the map); (2) a design pass with the frontend-design skill (layout, type, colour, a more visual day timeline) with screenshots shown to the user before moving on. Order is the user's choice: map first (AI's recommendation) or design first.
- Alternatives: keep the plan page as it is and do the map only; design pass only. Cost: both are front-end only; fits the time budget (about 6.4 h used of 72).
- Checkable bet: the user finds the result both useful and good-looking. Result: pending.
