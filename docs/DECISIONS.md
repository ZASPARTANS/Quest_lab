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

### D29 decided (2026-11-07 ~10:41 UTC)
- Decided by: **user** ("go, map first then the design pass. so what we will do is we have 3d map once the user uses the location it will model to that location and then show it in 2d ... all the options that we have now will also be there"; then the layout: "the current design that we have will be in the same page so 1/4th of the page uses the current design and the remaining 3/4th will have this globe [which includes 3d to 2d switching after location use]"). Approved through plan mode as `docs/plans/PLAN-007.md`.
- Chosen: one page, the plan panel (the step 8 design) about 1/4 of the width on the left, the globe/map about 3/4 on the right; the globe opens first; a place chosen from outside the map (location, search, saved place, address) makes the globe fly there and settle into the flat 2D map; map tools: Flat/Globe, model switch IFS / AIFS / Both (agreement), time control, click to choose a place; everything from step 8 stays; the design pass follows the map. Alternative not chosen: design first.
- Status of the earlier proposal: accepted as stated, with the layout above.

## D30 — A map click gives a place in the device's time zone (labelled)
- 2026-11-07 ~10:41 UTC. Decided by: **AI** inside the approved PLAN-007 (assumption A16; follows the user's earlier approval of the device-zone shortcut in D24).
- Chosen: a place picked by clicking the map is named "Map point (lat, lon)" and shows times in the device's own time zone, labelled; no reverse lookup (the geocoder has none, and sending coordinates to a third party was not approved). Searching the place gives its exact zone.
- Known weakness: for a place far from the device the local day boundaries can be off by hours. Alternative not chosen: estimate the zone from the longitude (wrong for countries such as India).
- Checkable bet: users understand the label. Result: pending.

## D31 — Fly-in and flatten: the zoom-driven projection morph (way B) (PLAN-007 step 9.1)
- 2026-11-07 ~10:45 UTC. Decided by: **AI** within the approved PLAN-007 (the plan made step 9.1 a visual decision gate; the user can overrule after looking at the screenshots).
- Chosen: the map's projection is a zoom expression, `['interpolate', ['linear'], ['zoom'], 2.5, 'vertical-perspective', 4.5, 'mercator']`, so the globe flattens gradually while the map flies in; the flight ends at zoom 4.5 on the flat map. The explicit Flat / Globe buttons will set a fixed projection (mercator / globe) and so override the morph. Way A (fly on a fixed 'globe', call `setProjection({type:'mercator'})` at the end) stays the fallback.
- Evidence (`docs/evidence/step9-1-*.png`, `frontend/tools/spike_flyin.mjs`): both ways, in Chromium in Docker (software WebGL) and in the developer's Edge with the real GPU, ended **exactly** on the target (Chennai 80.27 E, 13.08 N, zoom 4.5; offset 0.00000 degrees) with no console error. In the middle of the flight (zoom 3.2) way A still shows a full globe and way B is already flattening; the end pictures are identical.
- Findings to carry into the design pass: at zoom 4.5 the 0.5 degree pixels of the frames look blocky (resampling is `nearest`; a `linear` look or a lower fly-in zoom of about 3.5-4 may look better); the spike page is throwaway and goes with the spike pages in step 9.3.
- Alternatives not chosen: way A (simpler, a visible switch at the end); a fixed globe all the way (never becomes the flat map the user asked for).
- Checkable bet: the morph looks right to the user. Result: pending (the user's look at the finished page, step 9.4).

## D32 — The device position is named by BigDataCloud's client-side reverse geocoder
- 2026-11-07 11:07 UTC (clock read by the script). Decided by: **user** (messages: "when I click use my location, it should show the location name in that box, not the location I previously checked"; "I want the exact location"; then chose "BigDataCloud client-side (Recommended)" out of BigDataCloud / Nominatim / no outside lookup).
- Chosen: after "Use my location" (and when the browser had already been allowed to share it) the page asks `api.bigdatacloud.net/data/reverse-geocode-client` for the name and shows e.g. "Rasipuram, Tamil Nadu, India" in the search box and as the title; until the answer arrives, and if it fails, it shows "Your location". The search box always shows the place that is chosen now (the fix for the user's screenshot, where an old search text stayed). Map clicks are NOT looked up: they are named "Map point (lat, lon)" (D30), because the service's terms (read today) say calls must come directly from the client with the device's current location.
- Facts from the official pages read today: BigDataCloud: no key, fair use, a ban shown as HTTP 402, returns city, locality (suburb/village), region, country, no street and no time zone; Nominatim: at most 1 request per second for the whole website, identification by Referer or User-Agent, ODbL credit, access may be withdrawn, "may change without notice".
- Privacy cost accepted by the user's choice: the position and the visitor's IP address go to that host each time the device location is used; the page says so in plain words (`index.html`, #privacy), the host is the second and last outside host in `connect-src` (a test keeps config and policy in step), requests use `credentials: omit` and `referrerPolicy: no-referrer`.
- Time zone: unchanged (the device's own zone, which is right for the device position).
- Alternatives not chosen: Nominatim (street detail but a 1 request per second limit for the whole site and a credit/ban risk); no lookup ("Your location (lat, lon)"); a bundled nearest-city list (also gives time zones, no outside service; the user wanted the exact location).
- Checkable bet: the name appears within about a second on a normal connection and never blocks the plan. Result: held in Chromium with a MOCK service (the plan appears at once, the name follows); the real service has NOT been called yet.

## D33 — Long cache for files whose name changes; the page and manifest are always re-checked (preview server)
- 2026-11-07 11:07 UTC. Decided by: **AI** (user asked: "cant we cache it and use it again and again so it loads fast?"; the numbers decided it).
- Measured first in the developer's Edge with the real GPU (`frontend/tools/load_timing.mjs`, 1280 x 720): first visit plan on screen at about 0.4 s and map drawn at about 1.2 s (681 kB, 7 network requests); repeat visit before the change 0.46 s with 6 network requests (every file re-checked, the server sent no cache rule).
- Chosen (`docker/nginx.conf`): `Cache-Control: public, max-age=31536000, immutable` for `/assets/` (hashed names), `/data/tiles/` and `/data/frames/` (the page adds `?v=<export time>`, so a new export is a new address); `no-cache` for the page and `manifest.json` (a small revalidation). The security headers are repeated inside each location (nginx drops inherited `add_header` lines in a location that has its own). The map code now starts downloading at page start, in parallel with the manifest (`pagemap.preloadMap`).
- Result after the change (same test): repeat visit 6 of 7 files from the browser cache, 1 network request, 0 kB, map drawn at about 0.32 s. First visit unchanged. On localhost the network is instant, so a real host with latency gains more.
- Hosting requirement for step 11: the public host must send the same cache rules (Cloudflare Pages: a `_headers` file; GitHub Pages cannot set headers and uses its own short cache, so repeat visits there would revalidate more). Not a service worker/offline app (D24: not chosen).
- Lighter library question (user): no lighter library gives both a globe and a flat map; MapLibre (D22) is the user's choice and its chunk is about 335 kB gzipped, loaded after the plan. The user's point that normal PCs, laptops and phones have integrated GPUs is right: the "no GPU" constraint (D23) is about the free server and my Docker test browsers, not about visitors.

## D34 — Sharper rain pictures: 1440 px, smooth values, a 16-level colour gradient in a palette PNG (PLAN-008 gate Q1)
- 2026-11-07 12:27 UTC (clock read by the script). Decided by: **AI** within the approved PLAN-008 for the picture format; the **user** decided the outlines (asked, chose "Yes, 50 m coastlines (Recommended)").
- Measured on the real 2026-11-06 12z run, IFS +24 h block and its agreement (`scripts/proto_frames.py`, one run each; PNG kB, rain / agreement):

| variant | px | rain kB | agreement kB | looks |
|---|---|---|---|---|
| A today: maximum of covered cells, hard bands | 720 | 78.6 | 36.6 | blocks (the user's complaint) |
| C bilinear values, hard bands | 1440 | 191.9 | 91.1 | smoother, still stair-steps |
| D bilinear, hard bands | 2048 | 327.5 | 161.4 | still stair-steps at zoom 4.5 |
| E continuous gradient, 24-bit RGBA | 1440 | 1561.2 | 91.1 | very smooth, **far too big** |
| F continuous gradient, 24-bit RGBA | 2048 | 3335.4 | 161.4 | too big |
| G / H gradient, 160 levels, palette PNG | 1440 / 2048 | 707.4 / 1391.1 | | too big |
| L16 gradient, 16 levels, palette PNG, Sub filter | 1440 | 420.3 | 91.1 | smooth |
| **L16, palette PNG, best of 2 row filters per row** | **1440** | **389.9** | | **smooth** |
| L24 / L32, adaptive filters | 1440 | 430.8 / 462.3 | | slightly smoother |

- Chosen: frames of **1440 px**; the stored values are interpolated bilinearly between grid cell centres (wrapping at the date line) before colouring; colours are a **continuous gradient in log10(mm) quantised to 16 levels**, with a soft edge (alpha rising from 0 at 0.05 mm to full at the first stop, colour never black); written as an **8-bit palette PNG** (PLTE + tRNS) with the better of the Sub and Up row filters chosen per row; the browser draws it with `raster-resampling: linear`. Agreement frames: the same interpolation of both models' stored values, classified per pixel with the plan's rule (`rint(value) >= wet_limit`, D28), written as a 3-colour palette PNG. Size budget: the biggest rain frame is about 390 kB (limit set in the plan: about 400 kB); estimated export frames about 40 MB, whole site about 70 MB (limit in the plan: about 100 MB; GitHub Pages allows 1 GB). Make time about 0.2 s and PNG writing about 1.4 s per frame, so about 3 minutes more for 140 frames.
- Looked at (Chromium Docker, `docs/evidence/step9-3b-chromium-*.png`): at the fly-in zoom 4.5 the gradient picture reads as a normal weather map; 16 levels is very slightly less smooth than the full gradient at that zoom and looks excellent at zoom 3.5. **Not yet looked at in Edge with the real GPU**: that is part of 9.3b-3 on the final frames.
- Visible consequences the user should know: the colour scale changes from hard bands to a smooth gradient (same colours at the same values, the legend becomes a gradient bar); light rain gets soft edges; the page will say the map is smoothed between forecast grid points while the plan uses the exact values (A19).
- Outlines: 50 m Natural Earth (`world-atlas` `countries-50m.json`, public domain, already installed) instead of 110 m: **+197 kB gzipped** (236 kB against 39 kB) in the map code, adopted by the user's choice; it is the map code only, cached for a year after the first visit (D33).
- Proposed with this (AI, config only, easy to change): the fly-in zoom 4.0 instead of 4.5 so each picture pixel is smaller on screen; decided after the user's look in 9.3b-3.
- Alternatives not chosen: 2048 px (the palette gradient is 834 kB, too big); full gradient in 24-bit PNG (1.6-3.3 MB); hard bands at higher resolution (still stair-steps); a colour ramp in the browser (MapLibre 6.16 has no `raster-color`, checked in the installed typings).
- Checkable bet: the user finds the map good-looking at the fly-in zoom. Result: pending (9.3b-3).

### D34 results (real export, 2026-11-07 12:39 UTC)
- **Size gate on the real export (all 140 frames):** rain frames 100 files, median 292 kB, mean 330 kB, p90 410 kB, **largest 495 kB** (`ifs_96`); 23 of 100 are above 400 kB; agreement frames 40 files, about 87-92 kB; frames 36.4 MB in total (was 8.2 MB), whole site 64.3 MB in 4281 files (was 36.1 MB; limit set in the plan about 100 MB; GitHub Pages 1 GB, Cloudflare Pages 25 MiB per file). **The largest frame is above the plan's "about 400 kB" line**: the gate measured one typical block (390 kB), the rainiest blocks are bigger. Kept and reported to the user; the knobs are `frames.gradient_levels` (16) and `frames.size` (1440) in `config/backend.toml`.
- **Cost for the visitor (Edge, real GPU, `load_timing.mjs`):** first visit transfers 1.29 MB (was 0.68 MB: the map code with 50 m outlines 538 kB gzipped plus one 380 kB picture) and draws the map at about 1.5 s (was 1.2 s); a repeat visit is 1 network request and 0.45 s (cached for a year, D33). On a slow mobile connection the first visit will take several seconds longer than before.
- **Found by a test, kept as a stated limit:** at 1440 px the picture's pixel centres fall between grid cell centres, so a LONE single-cell peak is drawn at about a quarter of its value (a 5 mm cell looks like about 1.25 mm). Smooth rain fields are unaffected and the plan reads exact cell values. The test now says so; the page says "a single small spot can look lighter on it". Alternatives not taken: 2048 px (834 kB palette frames), shifting the sampling by half a pixel (a small systematic position error).
- **Visible change for the user:** hard colour bands became a smooth gradient (legend is a gradient bar, values 0.1 to 40 mm per 6 h), soft edge where rain starts, 50 m coastlines.

### D32 correction (2026-11-07 13:18 UTC, E030)
- The host in config and in the security policy is **`api-bdc.io`** (the documented `api.bigdatacloud.net` answers `307` to it). Still two outside hosts; the consistency test keeps config and policy equal. The name is now: local name, city, region, country (a long country name becomes its code), e.g. "City of Westminster, London, England, GB". Checked against the REAL service in a real browser (Edge, real GPU): the device position at 11.46 N 78.19 E was named "Rasipuram, Tamil Nadu, India".

## D35 — The fly-in goes close to the chosen place, by kind of place; rotation off; a "My place" button
- 2026-11-07 13:18 UTC. Decided by: **AI** inside the approved PLAN-009 (user's words: "when i use the location it has to be accurate and zoom to that location"); the numbers are config (`config/frontend.json` `map.fly.zoom_by_source`) and can be changed without code.
- Chosen: after the globe flattens the flight goes on to **zoom 8** for the device location (about 300 km across on a 1000 px map), **zoom 7** for a searched place, a saved place and a page address; a click on the map only recentres (no flight). `max_zoom` is 10. Rotation and tilt are switched off (`dragRotate`, `pitchWithRotate`, `touchPitch`, keyboard and touch rotation). A **"My place"** button on the map flies back to the chosen place at its zoom (scroll-zooming moves the view around the mouse, so the place drifts off-centre; the button recentres it).
- Verified in real browsers (Chromium Docker with mock services; Edge with the REAL Open-Meteo and BigDataCloud): the flight ends flat at zoom 8.000 centred on the place within 0.01 degrees; "My place" returns there after a drag.
- Checkable bet: people see their own place without zooming by hand. Result: pending (the user's look).

## D36 — The rain is drawn in the browser from the exact tile values above zoom 4.5, with a monotone cubic (PCHIP) (PLAN-009 steps 9.3c-1 to 9.3c-3)
- 2026-11-07 13:29 UTC. Decided by: **AI** inside the approved PLAN-009 (the user's complaint: blocks when zooming in; E031).
- Chosen: on the flat map from zoom 4.5 the browser fetches the point tiles of the view (the files the plan already uses, shared cache, at most 150 per view), interpolates the stored values for every pixel of a half-resolution picture covering the view plus 20 % each side, colours it with the continuous log-scale ramp of `config/frontend.json` with a soft edge at 0.05 mm, and shows it as an image layer (a PNG blob of our own); redrawn 150 ms after the map stops moving and when the model, block or mode changes. The pre-made picture stays visible until the new live picture has loaded and is used below zoom 4.5, on the globe, and whenever anything fails. The agreement is drawn from the two models' values as soft strengths around the plan's threshold (blue = both wet, orange = they disagree, strength = opacity).
- **Interpolation: PCHIP, not Catmull-Rom.** My first version used Catmull-Rom limited to the range of the four cells around the point; the first real look (Edge, London, zoom 7) showed straight, rectangular edges in the dry areas where the clamp cut the curve flat along cell boundaries. A monotone cubic is smooth across cell edges, equals the stored value at every cell centre, and never goes beyond the neighbouring cells (no negative rain), so no clamp is needed; the picture lost its rectangles. Both versions are tested against independent Python numbers.
- Honest limit: the forecast cells are 0.25 degree (about 28 km); the live layer shows the models' own values smoothly between cell centres and creates no detail the models do not have.
- Measured (real GPU Edge / Chromium with software rendering): drawing takes 21-48 ms (Edge) and 19-76 ms (Chromium software) per view for a 734 x 560 picture (target: under 150 ms), at zoom 5, 7 and 8, rain and agreement, London and Chennai, no console or policy error. Firefox timing: not measured (the user's own look).
- Alternatives not chosen: a WebGL shader layer, vector contour tiles, bigger pre-made pictures (PLAN-009 text).
- Checkable bet: people find the map good-looking when they zoom in. Result: pending (the user's look in Firefox).

## D37 — Nothing paid: no paid services and no credit-metered hosting (constraint from the user)
- 2026-11-07 13:37 UTC (clock read by the script). Decided by: **user** (answering the base-map question: "I dont want to spendmoeny on this project so no credit based based please").
- Chosen: the project must cost nothing. No paid service, no paid tier and no credit-metered plan (for example Netlify's Free plan with 300 credits per month, D25 / SOURCES: a deploy costs 15 credits) for hosting, map data, geocoding or anything else. Services must be free to use under their published terms.
- AI's reading, stated so it can be corrected: "credit based" means paid or metered credits. It is NOT about the text line that crediting OpenStreetMap or Natural Earth on the map (attribution is a licence condition, costs nothing, and stays). If the user meant attribution lines, this decision is to be re-read.
- Consequences: the hosting choice at step 11 is between free static hosts with no credits (GitHub Pages, Cloudflare Pages); Netlify is out. The base-map question stays open (asked again with this clarified); every base-map option is free of charge, but a stored vector map of more than 25 MiB per file only fits GitHub Pages (Cloudflare Pages limit 25 MiB per file).
- Checkable bet: the whole project, including the hosted site, runs without any bill. Result: pending (step 11).

## D38 — A stored vector base map (OpenStreetMap through Protomaps) under the rain (started; sizes to be measured in step 9.3d-1)
- 2026-11-07 13:41 UTC. Decided by: **user** (asked for "an open world map that we can store and use, because those don't change"; chose "Stored vector map, measure first (Recommended)"; D37: nothing paid, no credit-metered services; "if we just need to give them credit ... then we can use that to get accurate information" = the OpenStreetMap attribution line is accepted). Approved through plan mode as `docs/plans/PLAN-010.md`.
- Chosen: a base map made of OpenStreetMap data (Protomaps daily world build, ODbL, "OpenStreetMap attribution required") stored as a PMTiles extract with our own site and served by it, with self-hosted fonts and sprites, dark style, English labels; no outside request, no cost. The rain layers go below the label layers. Replaces the outlines-only base map of D22.
- Alternatives not chosen: Natural Earth shaded-relief picture (no roads or names), OpenFreeMap online tiles (third party), outlines only (what the user finds unattractive).
- Facts read today: planet build `20261107.pmtiles` is 139,356,959,640 bytes with `Accept-Ranges: bytes`; `pmtiles extract --maxzoom` reads a remote file efficiently; sizes of z4-z7 extracts are NOT published (estimate 0.2-0.5 GB from the "each zoom level doubles" rule): measured in the gate. Hosting consequence for step 11: a file above 25 MiB cannot go on Cloudflare Pages; GitHub Pages (1 GB site) can.
- Checkable bet: a z6/z7 world extract plus assets fits within about 400 MB. Result: pending (gate 9.3d-1).

### D38 gate results (2026-11-07 13:48 UTC; step 9.3d-1, real download, `docker compose run --rm basemap`)
- **Tool and assets:** `pmtiles` 1.31.2 (Linux x86_64) downloaded and its sha256 checked against `config/basemap.toml` (matches the digest GitHub shows); 23 asset files (Noto Sans Regular, Medium and Italic glyph ranges 0-1535, the dark sprite at 1x and 2x, the SIL OFL font licence) = **1.77 MB**; each file's git blob hash equalled the commit's own tree listing (`028c18f7...`), then the sha256 lock `config/basemap_assets.lock.json` was written (draft under `data/`, reviewed, copied by hand) and the download repeated against it.
- **World extract of OpenStreetMap data** from the daily build `20261107.pmtiles` (139.4 GB, read by range requests): **zoom 0-5: 15.1 MB in 13.6 s; zoom 0-6: 45.1 MB in 12.1 s; zoom 0-7: 189.6 MB in 21.3 s.** (My estimate in PLAN-010 was 0.2 GB for z6 and 0.5 GB for z7; the real files are about 4 times and 2.6 times smaller.) The tool's own `show` reports for z6 and z7: PMTiles spec v3, vector tiles (MVT), bounds the whole Web Mercator world, clustered, gzip, 5,461 and 21,845 tiles (complete pyramids), attribution "(c) OpenStreetMap" inside the file.
- **Chosen:** zoom 0-7 (189.6 MB) for the site, `extract.maxzoom = 7` in `config/basemap.toml`; the page overzooms these vector tiles above zoom 7 (lines stay crisp, detail is that of zoom 7: cities, main and secondary roads, not streets). Zoom 8 would be about 4 times bigger again (my extrapolation, not measured: about 0.8 GB), too big for the free host. Whole site then about 64 MB + 190 MB + 2 MB = about 256 MB (GitHub Pages limit 1 GB). A single file of this size cannot go on Cloudflare Pages (25 MiB per file); even z6 (45 MB) cannot: only GitHub Pages remains among the free hosts for step 11.
- Not yet looked at (needs the two packages of step 9.3d-2): the pictures at each zoom.

### D38 results of step 9.3d-2 (2026-11-07 14:02 UTC)
- Done: the stored base map is served by the preview (nginx location with range requests, 206 verified) and by the dev server (range requests added), styled with the dark flavor of `@protomaps/basemaps` 5.7.2 through `pmtiles` 4.5.0, English labels, glyphs and sprites from our own folder; the rain layers sit below the first label layer; the outline code and packages are gone (the map code is 310 kB gzipped, was 541 kB). The map credit "Map: (c) OpenStreetMap contributors, Protomaps" is on the map (config text with two https links, tested).
- Measured in the user's Edge (real GPU, `load_timing.mjs`): first visit of the globe 1.56 MB / map drawn at 2.1 s (before the base map: 1.29 MB / 1.5 s); first visit of a place at zoom 7: 4.25 MB and 79 requests (base-map tiles by range requests, fonts, the live rain), 4.0 s including the 2.5 s flight; a repeat visit still makes about 53 requests and 2.3 MB at zoom 7 because browsers cache partial (206) answers poorly. Honest limit: that is the price of a real base map; a lower zoom limit (extract maxzoom 6, 45 MB) would cut it.
- Files on disk: `data/basemap/world.pmtiles` 181 MiB (189.6 MB), assets 12 MB (773 files, all glyph ranges of the three fonts), `data/site` 71 MB: the whole site about 265 MB (GitHub Pages limit 1 GB).

## D39 — Brighter names and borders on the base map; a "Now" button and an "already over" note on the time bar
- 2026-11-07 14:02 UTC. Decided by: **user** (screenshot from their Firefox: "the name and the borders make it white because the dark colour makes it hard to see" = make them light) for the colours; **AI** for the time bar (the user's screenshot again showed the first block, Fri 6 Nov 12:00-18:00, at Sat 13:55; not reproduced in Edge or Chromium).
- Chosen: label and border colours in `config/frontend.json` `map.basemap.colours` override the dark flavor (city and country names white, other names #dde4ef-#d6deea, borders #d3dbe8, outlines of #0b1020 around the text); a test checks every key is a real field of the flavor and that every label colour has a contrast of at least 7 : 1 with the land colour (the old defaults, #3d3d3d to #7a7a7a on #1f1f1f, are shown by the same test to fail it: 1.4 to 4.2 : 1 against the land). The time bar says "already over" for a block that has passed and has a **Now** button that jumps to the block under way; the browser check proves the map starts on the block under way and that the two controls work.
- Not explained: why the user's Firefox showed the first block. Possible causes I can name: the slider was moved (the label now says so); an unknown Firefox-only difference. To be asked.

## Results of checkable bets and register update (housekeeping, 2026-11-07 14:17 UTC)
Appended because evidence now exists; the original entries above are unchanged.
- **D2/A6 and D4 (size on the host):** the data part is met locally: `data/site` is 71 MB on disk (the export reported 64.3 MB in 4281 files at step 9.3b-2), the stored base map 190 MB and its fonts and sprites 12 MB: about 265 MB in all, under the 1 GB limit of GitHub Pages read on its official page (SOURCES, 2026-11-06). The host itself is checked at step 11.
- **D22 (base map = Natural Earth outlines):** superseded by D38 (user, 2026-11-07); the outline code and packages are removed. Its other parts stand (MapLibre GL JS 6.16.0 is in use; scans under standing approval). Its bet (flat <-> globe at run time keeps place and time) is still to be checked in the finished page in step 9.4.
- **D23 (the app shows the map in Firefox on the user's PC):** **held** (the user's own Firefox screenshots on 2026-11-07 show the base map, the rain and the names; their Firefox runs an ad blocker). Item 3 (a plain message without WebGL2) was adopted in D24 and built in step 9.3.
- **D34 (50 m outlines chosen by the user):** superseded by D38; the outline files are no longer shipped.
- **D35 and D36 (people see their own place without zooming by hand; the zoomed-in map looks good):** the user's overall verdict after the base map was "ok so all looks good" (2026-11-07, time not logged); not tested with anyone else, and not measured in Firefox.
- **D38 (a z6/z7 extract plus assets within about 400 MB):** **held**: 189.6 MB plus 12 MB of assets (gate and results above).
- **D37 (no bill):** still pending until the host is chosen and used (step 11).
- Still pending, by design: D8, D9 and its addendum (step 10), D11 and D19 for the finished page (step 9.4), D12 (E007), D14.

## Shortcut register (rebuilt from `grep -rn "shortcut:"`, 2026-11-07 14:17 UTC)
Four marker lines in three files; each is recorded here and has to appear in the README's known limits (it does):
1. `pipeline/process.py`: IFS 3-hourly detail dropped, 6 h common axis (D14, shortcut 1).
2. `pipeline/process.py`: negative differences from packing rounding set to 0, not carried to the next interval (D14, shortcut 2).
3. `config/headers.conf`: the security headers exist as one copy for the local preview; a converter for the public host's own format comes at step 11 (D19, D21).
4. `frontend/src/app.js`: a place found by the device has no known time zone, so the device's own zone is used and labelled (D24, A8, D30).
Gone since the earlier register: `scripts/spike_frame.py` (deleted at step 7), the spike pages and `window.__map` (deleted at step 9.3). Known limits that have no `shortcut:` marker in code (mark them when the files are next touched): the lone one-cell peak on the pre-made pictures (stated in `tests/backend/test_frames.py` and DOMAIN), the base map stopping at zoom 7 (D38), 6 h blocks (D14).

### D39 result (2026-11-07 14:20 UTC)
- The user answered: they had moved the time-bar slider, which explains the first block shown in their Firefox; no Firefox-only defect. The "already over" note and the Now button (this decision) are what tell a visitor that a moved slider shows a past block. They also said the live rain layer is fast in their Firefox ("it fast", their words; no number measured).

## D40 — Step 9.3d-3 (fit the rain to the base map) is not done as a separate step (scope cut)
- 2026-11-07 14:24 UTC. Decided by: **user** ("is it really necessary to fit the rain to the base map? if yes then we can do that, if not we will not spend time on that"), after the **AI** answered that it is not necessary. This cut is not a plan failure, so there is no PLAN-011; the status is kept in PROGRESS (approved plan files are never edited).
- Why it is not needed: the points it was meant to cover are already in place and checked. The rain layers sit below the first label layer, so names and borders stay above the rain (step 9.3d-2); label and border colours were brightened to a contrast of at least 7:1 on the dark land (D39); the user's own verdict after looking at the finished map in their Firefox was "ok so all looks good". No opacity or edge defect has been reported or seen.
- What is lost: a planned side-by-side look at the rain over London, Chennai, a coast and mountains at zoom 3, 5 and 7, with the opacity and soft edge tuned for them. The rain opacity stays at the value in `config/frontend.json`.
- Where the one useful part goes: the screenshots at several sizes and the contrast test of the design pass (PLAN-007 step 9.5) will include the map with rain at zoom 3, 5 and 7 for a place or two; if a legibility problem shows there, it is fixed there, in config only.
- Bet that can be checked later: no legibility defect of the rain over the base map shows in step 9.5 or in the user's later looks. Result: not known yet.

### D38 result of step 9.3d-4 (2026-11-07 14:32 UTC)
- Two browser scenarios now guard the base map (range requests answered 206 from our own site; the page and the rain keep working when the file is missing): Chromium (Docker) and Edge (real GPU) 11 of 11. Not proven in Firefox or WebKit (no WebGL in the container). The bet "no outside request and the map degrades safely" held in the two engines that can draw it. The hosting requirements for step 11 are listed in PROGRESS (step 9.3d-4 results).

### D38 / D36 results of step 9.3c-4 (2026-11-07 15:48 UTC)
- **D38 addendum (font list):** the stored base map needs the style's fourth font, `Noto Sans Devanagari Regular v1`, because labels of Indian places can carry Devanagari text; stored now (all 256 glyph ranges), lock rebuilt from the same pinned commit. The site's assets are 1029 files, 11.54 MB (the whole stored base map about 201 MB, the site about 265 MB; the host limit stays 1 GB). Decided by: AI (a defect fix inside the approved plan, same source, same checks, no new host). Bet "the three fonts are all the style uses" was **wrong** (E032 seen again); a test now keeps list, lock and style in step.
- **D36 (the live layer):** now guarded by browser scenarios in Chromium, WebKit and Edge: on at a close zoom for IFS, AIFS and the agreement, off on the globe and when zoomed out, and it gives way to the pre-made picture when a tile fails. Drawing time is still the 21-65 ms measured in Edge at step 9.3c-3.
- **Start-up order (new, small):** the plan page now ignores a choice of place made before the forecast list is loaded until it is loaded, then draws it (E033). Decided by: AI (bug fix; the user's own approach to "do not show errors to visitors", D9).

### Saved places made findable (2026-11-07 16:40 UTC)
- Decided by: **user** (feedback "there is not option for it at all", then "do it now" to the proposal), details by the **AI**. The Save button stays in the place header but is clearer (star, "Saved (press to remove)"), the saved places move above the search and the box hides when empty, and the privacy text is short with the full text in an expandable part. This is an early part of the design pass (PLAN-007 step 9.5), not a new plan. Bet to check: the user finds the Save button without help (their next look). Result: not known yet.

### D29/D31 result of step 9.4 (2026-11-07 16:58 UTC)
- The 1/4 plan + 3/4 map layout (D29, user) is now measured by a browser check: on 1280 px the plan is a quarter within 4 points, and on 390 px the map stacks above the plan with no sideways scroll. The globe start and the fly-in (D31) are guarded by scenarios in four engines (Edge with the real GPU). Bet "the map layout works on a phone-sized window" held for the stacking itself; the controls crowd a small map (design pass).

## D41 — Rain levels for the plan (no rain / light / moderate / heavy) instead of wet and dry (PLAN-011)
- 2026-11-07 17:37 UTC. Decided by: **user** (their request: wet and dry are confusing; use no rain, light, moderate and heavy for planning; then in plan mode: thresholds option A, the wetter model + a "models differ" note, map legend words only), details by the **AI**.
- Chosen (per 6-hour block, from the stored value in 0.1 mm steps, D28): **No rain under 0.5 mm; Light 0.5 to under 3 mm; Moderate 3 to under 10 mm; Heavy 10 mm and over.** The 0.5 mm limit is the user's D13 value. An activity accepts a maximum level (outdoor, laundry, picnic, cricket: no rain; commute, field work, road travel: light at most; Custom: the visitor picks), and its old mm limit becomes the lower bound of the next level, so the D28 window logic is unchanged. Cost: laundry (was 0.1 mm), picnic (0.3) and cricket (0.2) now accept up to 0.5 mm as "no rain".
- Alternatives shown to the user: B the Indian daily scale divided by 4 (0.5 / 3.9 / 16 mm), D more cautious (0.5 / 2 / 6 mm), C the hourly standard x 6 (0.5 / 15 / 45 mm). **Measured on the real run 2026-11-06 12:00 UTC** (first 7 days = 28 blocks, whole globe, area-weighted, a throw-away script; to be reproduced by `scripts/level_shares.py` in step 11.1): IFS none / light / moderate / heavy: A 71.3 / 21.6 / 6.1 / 1.0 %; B 71.3 / 23.3 / 5.1 / 0.3 %; D 71.3 / 17.7 / 8.2 / 2.8 %; C 71.3 / 28.3 / 0.3 / 0.0 %. AIFS: A 67.8 / 25.0 / 6.6 / 0.6 %. C was rejected because moderate and heavy almost never appear.
- Sources: there is **no agreed definition** of rain intensity classes; see SOURCES (AMS glossary and yr.no read; IMD and BoM only as search results) and DOMAIN. The page will say the cut-offs are ours.
- Bet that can be checked later: the user and later visitors find "light / moderate / heavy at 3 and 10 mm per 6 hours" sensible for their own place (the user's later looks; Chennai monsoon rain should reach moderate and heavy). Result: not known yet.
- **Amended by the user at 17:40-17:42 UTC (PLAN-012):** decision 3 of PLAN-011 ("map: only reword the legend") is replaced: orange for "models disagree" reads as heat; the agreement view gets one colour family (solid blue = both models, pale blue = only one) and a titled colour key. Why decision 3 was wrong: I assumed a small key was enough; the user's screenshot showed it is not noticed.

### D41 / PLAN-012 result (2026-11-07 18:06 UTC)
- The map's agreement view is one blue family (bright = both models, dim = one model) with a titled colour key for both map views; decided by the user ("One colour + a clear key"), colours chosen by the AI by measurement (first candidate rejected: brighter than the "both" colour). Bet to check: the user no longer reads the map colours as heat and finds the key without help (their next look). Result: not known yet.

### D41 / PLAN-012 bet result (2026-11-07 18:59 UTC)
- The user looked at the new map colours and the key and said: "ok ;i like it." The bet "the user no longer reads the colours as heat and finds the key" held for the user (one person, at 1100 px; phones not looked at). The 390 px problem (key covers the map) remains for the design pass.

### D41 result of step 11.1 (2026-11-07 19:15 UTC)
- The engine speaks in levels: block level = the wetter model's, fit (ok / maybe / over) from the activity's maximum level, D28 window logic unchanged. The independent Python calculation and the browser code agree on 8 places x 8 activities (levels, fits, windows, totals). The shares of the levels on the real run were reproduced by `scripts/level_shares.py` (D41's numbers). The wet limit of the activities is now only derived from the levels: laundry, picnic and cricket accept up to 0.5 mm per 6 h as "no rain" (stated in D41).

## D42 — Public hosting on GitHub Pages, 6-hourly refresh, honesty strip first (PLAN-013)
- 2026-11-07 19:37 UTC. Decided by: **user** (their request: "I think we start the hosting now and checking on mobiles"; the empty public repository `ZASPARTANS/Quest_lab` they created; plan-mode answers: a public repo is accepted, a short step 10 before the first deploy, refresh every 6 hours), details by the **AI**.
- Chosen: **GitHub Pages** through a GitHub Actions workflow, at `https://zaspartans.github.io/Quest_lab/` (a sub-folder site, so the page needs a base path). The only free host found that fits the single 190 MB base-map file (Cloudflare Pages: 25 MiB per file; Netlify excluded by D37). The base-map file travels as a **GitHub Release asset** (`basemap-v1`) checked by sha256, not through git (A27); the forecast data is rebuilt by the workflow every 6 hours (02:20, 08:20, 14:20, 20:20 UTC); the workflow uses no secrets.
- Alternatives considered: Cloudflare Pages (file size), Netlify (credit-metered, D37), a private repository (not confirmed to work on a free plan, and a public repository was accepted), rebuilding the base map inside the workflow from the 139 GB Protomaps planet file (slow, depends on a third party at each build).
- Costs and exposure accepted by the user: the repository is public (code, `docs/`, 70 commits, the author e-mail: S06, D16); the scheduled job keeps running until the owner disables it.
- Facts read from GitHub's documentation today (SOURCES): published Pages sites up to 1 GB; deployments time out after 10 minutes; Actions standard runners are free for public repositories; custom workflows need `pages: write` and `id-token: write`. **Not yet verified (13.5):** HTTP range requests for the 190 MB file, the response headers, the deploy time of a 265 MB artifact.
- Bets that can be checked later: (1) Pages serves range requests for a 190 MB file and the map works from it (step 13.5); (2) the 6-hourly build stays within its free limits and keeps the forecast less than 18 hours old; (3) the page works on real phones. Results: not known yet.

### D42 addendum (2026-11-07 20:06 UTC): numbers corrected, credits decided
- **Age limit 30 hours, smoke limit 30 hours** (not 18 and 12 as written in PLAN-013): runs only at 00z and 12z (D12, `run_hours`), about 7.5 hours late; a normal page shows a run 8 to 21 hours old. Decided by: AI, from the pipeline config and DOMAIN; the user's bet "refresh every 6 hours" still holds (the 6-hourly job only makes sure a new run is adopted within about 6 hours after it appears).
- **Credits:** the wording of ECMWF's Terms of Use for a service is used word for word (manifest `source.attribution`, test) plus the CC BY licence line, the disclaimer and a statement that the data was changed; Open-Meteo is linked next to the place search as its licence asks; GeoNames, OpenStreetMap, Protomaps and BigDataCloud are credited. The ECMWF sentence is also shown at the top of the page next to the run time (the terms say attribution must be prominent). Decided by: AI, from the pages read today; the user may change the wording.

### D42 addendum (2026-11-07 21:05 UTC): what the host without headers costs
- The security policy of the public site is carried by two `<meta>` tags (CSP and referrer) built from `config/headers.conf`; four protections cannot be set that way and are LOST on Pages: `nosniff`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` and `frame-ancestors` (D21 and S14 named this risk; measured now by the test site that sends no headers: the page and the map work with the meta policy alone). Accepted by the AI as small for a page that only reads public data and has no logins or state; the user can ask for a different host later (none free fits the 190 MB file, D37). The MapLibre worker is emitted as `.js` so a wrong content type for `.mjs` cannot break the map. Bet: Pages serves range requests for the 190 MB file (13.5).

### D42 addendum (2026-11-07 21:38 UTC): how the unattended job is kept safe
- The workflow's safety rules are enforced by a script and tests, not by good intentions: only GitHub-owned actions pinned to commits; write access only in the deploy job; no secrets; no pull-request trigger; no environment dump; no `${{ }}` in shell code. The base-map file is downloaded from a GitHub Release asset and refused unless its size and sha256 equal the values in `config/basemap.toml` (the same pattern as the `pmtiles` tool and the fonts). Decided by: AI, as part of the approved PLAN-013; the user approves the outward actions (login, push, release, Pages) at step 13.4.

### D42 result (2026-11-07 22:45 UTC): the site is public; bets checked
- **Bet 1 held:** GitHub Pages serves the 190 MB base-map file by HTTP range request (206, correct `Content-Range`) and the map works from it (26 browser scenarios on the real site in Edge, Chromium and Firefox). **Bet on deploy size/time held:** a 267 MB site deployed in about one minute (deploy job 22:11:34-22:11:55); the whole run took 7 minutes. **Bet 3 (phones) did NOT hold at first:** the controls covered most of a phone's map and tap targets were too small (13.5 c); fixed in 13.6 and measured again; the user's own phone is the final verdict.
- The repository is public (73 commits at the first push); the scheduled job runs unattended every 6 hours until the owner disables it (GitHub: Actions tab, workflow, Disable).

### D42 final result (2026-11-07 22:57 UTC)
- Bet 3 (the page works on real phones): **held on the user's Android phone** ("androde looks good the the site works"), after the 13.6 fixes. Not yet checked by a person on an iPhone. All three bets of D42 are now checked: Pages serves range requests (held), the build fits the free limits and the deploy time (held: 7 minutes), phones (held on Android, iPhone emulated only).

## D43 — Concurrent-visitor testing: full test locally, one tiny capped test of the live site (PLAN-014)
- 2026-11-07 23:01 UTC. Decided by: **user** (their request "need to do concurrent testing"; of the four meanings offered they chose "A gentle test on the live public site"), caps and method by the **AI**, approved in plan mode.
- **Correction of my own earlier statement:** in the question I wrote that "GitHub's terms discourage load testing Pages". I had not read the text. Read afterwards (SOURCES): GitHub's Acceptable Use Policies do not mention load testing; they prohibit "excessive automated bulk activity" and placing "undue burden on our servers through automated means", and allow GitHub to "suspend your Account, throttle your file hosting, or otherwise limit your activity" for bandwidth use judged "significantly excessive". The risk is therefore to the user's account, and the public test is capped accordingly: 60 MB in total, 3 minutes, 40 requests per second, at most 10 simultaneous visitors, once, stop at the first 429, 403 or 5xx or at more than 5 % failed requests, and only after the user's explicit go on the printed plan.
- Chosen: a tool that replays the requests of a real visit (recorded locally), a full range of levels on the local copy of the site (no outside traffic), real browsers in parallel locally and 3 on the live site. Alternatives not chosen: a refresh-while-browsing consistency test (offered; can be added), parallel test runs, a bigger public test.
- Bet that can be checked: the live site answers every request correctly for 10 simultaneous visitors without a 429 or a 5xx. Result: not known yet. Limit stated up front: a test from one computer cannot show behaviour at thousands of visitors.

### D43 note (2026-11-07 23:29 UTC): the public ladder had to change
- The approved ladder 1, 3, 5, 10 (19 visitors) would need about 72.7 MB with the real recorded visits (mean 3.7 MB each), more than the approved 60 MB total, and the 3 real browsers of the second part (about 11.1 MB) come on top. So the ladder is lowered, not the cap raised. Candidates with the printed plan (HTTP part plus 11.1 MB of browsers): **A: 1, 3, 5** = 9 visitors, 401 requests, 35.0 MB, total about 46 MB, top level 5 at once; **B: 2, then 10** = 12 visitors, 525 requests, 46.3 MB, total about 57.4 MB, top level 10 at once (the approved top). The user chooses at step 14.3.

### D43 note (2026-11-08 00:10 UTC): what the live test showed so far
- On the live site, everything answered in the first minutes of replay was correct (statuses and sizes), and 3 real browsers at once all drew the page and the map in about 13 seconds without errors; no 403, 429 or 5xx was seen. The 5 %-failure stop that ended part 1 early was a false alarm of my own check (a blank line), not a host problem. Bet "10 simultaneous visitors without a 429 or 5xx": **not tested** (the approved top level was lowered to 5 to fit the byte cap with the real visit sizes, and the higher levels have not been sent). Honest limit: the live evidence is for 1 to 3 simultaneous visitors; more is covered only by the local test, which measures this PC.

## Results of checkable bets and register update (housekeeping, 2026-11-08 00:47 UTC)
Appended because evidence now exists; the original entries above are unchanged.
- **D2/A6 and D4 (size on the host):** met: the assembled site is **267.3 MB** in 5319 files against GitHub Pages' 1 GB limit; the deploy of 267 MB took 17 to 21 seconds.
- **D8 (the scheduled refresh):** **not yet proven**: the workflow ran on push and by hand (three green runs, 7 minutes each); the first scheduled run is 2026-11-08 02:20 UTC.
- **D9 (an out-of-date forecast shows a plain warning only):** **held**: the page warns in plain words above 30 hours (tested in Node and in three browser scenarios; the real local page showed it honestly while its data was 32 hours old), technical detail only in the console.
- **D11 and D19 (the finished page works on both local sites):** **held**: the root preview, the sub-folder test site and the live site pass 26 browser scenarios in four engines.
- **D13 and D41 (rain levels):** the 0.5 mm bound is the user's D13 value; the shares of blocks per level on the first real run (IFS 71.3 / 21.6 / 6.1 / 1.0 %) are reproduced by `scripts/level_shares.py`. The bet that users find the cut-offs sensible is open (the only real-device verdict so far: "androde looks good the the site works").
- **D23 (the app shows the map in Firefox on the user's PC):** held on 2026-11-07; a real Android phone also drew it (the user's verdict); an iPhone with Safari is untested by a person.
- **D37 (nothing paid):** so far held: GitHub Pages and the Actions minutes of a public repository are free; no bill, no card.
- **D42 (public hosting):** bets held: range requests (206), deploy size and time, phones on Android. **D43 (concurrency):** local results recorded (100 replayed visitors, 20 real browsers); the live bet for 10 simultaneous visitors is untested (the top level was lowered to fit the cap).
- **D12 (IFS to 240 h, E007) and D14:** unchanged.

## Shortcut register (rebuilt from `git grep "shortcut:"`, 2026-11-08 00:47 UTC)
Four marker lines in three files, each recorded here and in the README's known limits:
1. `pipeline/process.py`: IFS 3-hourly detail dropped, 6 h common axis (D14, shortcut 1).
2. `pipeline/process.py`: negative differences from packing rounding set to 0, not carried to the next interval (D14, shortcut 2).
3. `config/headers.conf`: the marker comment is STALE: it says one copy of the headers exists "for now" and that a converter "is added at step 10/11 (nothing is hosted yet)"; the converter exists (`backend/pages.py` writes the policy as meta tags) and the site is hosted. The shortcut itself is resolved; fix the comment the next time the config is touched (this housekeeping may not change config).
4. `frontend/src/app.js`: a place found by the device has no known time zone, so the device's own zone is used and labelled (D24, A8, D30).
**Deviations that have NO marker in the code (found by this housekeeping):** seven JavaScript functions are longer than 50 lines (`createMapView` 130, `mapScenarios` 145, `liveScenarios` 84, `createLive` 71, `smallTargets` 72, `createMapApp` 70, `serveFolder` 60); they are factories with small inner functions, but the size rule is broken; they go to the user as an open item and, if accepted, must be marked and listed in the README. Known limits with no marker: the lone one-cell peak on the smoothed pictures (D34), the 10-minute page cache and the lost headers on GitHub Pages (D42).

## D44 — Design pass, round 1: flatten, widen, quiet the dry days (PLAN-007 step 9.5, 2026-11-08 01:25 UTC; decided by the AI inside the approved plan, open to the user's correction)
- **Chosen:** flat sections instead of nested cards; a `calm` row style for days with nothing to report; the day explanation folded away; totals before the day list; one new colour `--control` for control borders; a contrast test over the stylesheet's own variables. **Alternatives not taken:** a new palette (the user approved the colours: "ok ;i like it."), a downloaded font (not allowed by the policy `font-src 'self'`, and nothing external, D37/D42), dropping the dry days altogether (the page would no longer show that every block was checked), a "best time at a glance" line (needs `app.js` space; offered to the user as a later step).
- **Bet:** the plan column becomes clearly shorter and "Moderate" no longer breaks. **Result:** 4977 to 4061 px at 1280 wide; "Moderate" whole at 352 px (screenshot `docs/evidence/design-round2/step9-5-1280-plan.png`).
- **shortcut:** the line colour `--line` (hairlines between sections, about 1.3 to 1.8 : 1) is kept as decoration; only controls have to reach 3 : 1 and do (tested).

## D45 - Do not download what the build already has: cache the map file, keep the fonts and sprites in our repo, retry the download (PLAN-015, 2026-11-08 12:10 UTC; the user chose it, the AI proposed the details)
- **Chosen by the user (about 11:55 UTC, "1 and 2"):** (1) an Actions cache for `world.pmtiles` between runs, with a retry on the download; (2) the 13 MB of fonts and sprites (1029 files) committed to the repository instead of being fetched from the Protomaps repository at every build. **Details the AI proposed in PLAN-015, which the user approved with the plan:** the new folder `frontend/basemap_assets/` (a layout change: the page's own static assets), `.gitattributes` `-text` for it, an offline `install-assets` command that checks every file against the lock file, the split `actions/cache/restore` and `actions/cache/save` with a key from `hashFiles('config/basemap.toml')`.
- **Why:** each build starts on an empty machine and Pages replaces the whole site, so the map file (190 MB) and the assets (13 MB) were downloaded on every run (203 MB, two hosts); on 2026-11-08 the download timed out twice (E039). **Alternatives not taken:** git or Git LFS for the map file (100 MB file limit, LFS has quotas), hosting the map file elsewhere (D37, D42), an authenticated download (a token in the workflow, against the no-secrets rule), doing nothing but a retry.
- **Bets (checkable):** (a) the second run on GitHub after the change restores the cache and does not download the map file; (b) it is faster than 7 minutes. Results to be recorded in 15.4 and 15.5.

## D46 - Do not zoom the map past the detail of the stored base map (2026-11-08 14:19 UTC; the user chose it after the AI's reproduction)
- **Chosen by the user:** maximum zoom 10 to 8 and the device location lands at zoom 7 (like a search). **Why:** the stored world extract ends at zoom 7 (D38) and the forecast cells are about 28 km, so zooming further shows enlarged, chunky map shapes and a bigger blur, not more information; the user's phone report: "the phone image loks rouch and zoom is not good". **Supersedes** the part of D35 that let the device position land closest (zoom 8) and the max_zoom 10 of D31/D35; the visitor can still zoom one level above the stored detail (8). **Alternatives:** draw the rain at the phone's real pixel ratio (offered, not chosen: 4 to 7 times more drawing work per move and it cannot add detail the data does not have); a bigger stored map (zoom 8 about 0.8 GB: too big for the free host, D37/D42); a "map detail ends here" notice (not asked for).
- **Guard:** `tests/frontend/mapstate.test.mjs` keeps `max_zoom` at most one above `extract.maxzoom` and every landing zoom at most `extract.maxzoom`, so a bigger zoom cannot be set again by mistake.
- **Bet:** the user finds the phone map less rough. **Result:** pending (the change is not live until a push; the user's verdict on their phone is needed).

### D45 results (2026-11-08 15:57 UTC)
- Bet (a) **yes**: the second real run restored the cache ("Cache hit", "Cache restored successfully", 181 MB in 3 s) and `fetch-release` printed "already there and matches"; the save step was skipped; the fonts and sprites were installed from the repository (1029 files, all matching the lock). Bet (b) **no**: not faster, the download is about 3 s either way; the value is resilience, and that is not proven (the cache service might also have timed out in the incident). The first run after a cache eviction (7 days unused, my assumption A45, not verified) downloads as before, with the retry.

### D43 results (step 14.4, 2026-11-08 16:29 UTC)
- **Local (this computer, one nginx worker in Docker Desktop; not transferable to GitHub):** 1, 10, 25, 50 and 100 replayed visitors (7,740 requests, 701 MB): **every answer was correct** at every level; time per request grew about in step with the number of visitors (page median 13 ms at 1 visitor, 2.2 s at 100; map-file reads 88 ms to 5.8 s), the sign of a saturated server, not of a faulty page. 5, 10 and 20 real Edge browsers at once all drew the plan, the map and the live rain picture with no console error (20 was slow: plan after 79 s).
- **Live (GitHub Pages):** part 1 (replay, levels 1 and 3) stopped itself after 77 requests and 8.8 MB on a false alarm of my own page-size check (E025), with every status correct and no 403, 429 or 5xx; part 2 (3 real browsers at once) all fine in 13 s, 12.3 MB. Total sent to GitHub: about 21 MB of the approved 60 MB. **The rest of the ladder (3 and 5 replayed visitors, about 26 MB) was not run**: the user was offered it and did not ask for it, and I judged it adds little. The bet "10 simultaneous visitors without a 429 or a 5xx" stays **not tested**; the honest statement is: 1 to 3 simultaneous visitors on the live site worked.
- **Estimate (arithmetic, labelled as an estimate):** the three recorded visits cost 3.71, 4.68 and 2.72 MB (mean 3.70 MB); GitHub's soft limit of 100 GB a month (SOURCES, read 2026-11-07) divided by 3.7 MB is about 27,000 first visits a month. Not tested; ignores repeat visits (cheaper) and any earlier throttling.
- **What the tests found about my own tools (E025, three times):** the recorder kept junk requests, the replay judged cancelled map reads by a wrong size, the browser tool's 30 s timeout; none was a defect of the site.

### D41 result of step 11.4 (2026-11-08 17:08 UTC)
- The four level scenarios pass in four engines. They check the words and cut-offs on the page, that nothing on the page uses the old words (wet, dry, heat, hot), that what fits follows the activity's limit, that Custom has exactly the three choices of the config and keeps its choice after a reload, and that a hostile or unknown `accept=` is ignored. The bet of D41 (that light, moderate and heavy at 0.5, 3 and 10 mm per 6 hours feel right to users) is still only partly checked: the user's own words on the day view were "androde looks good the the site works" and "i like how it shows in the android" (2026-11-07, 2026-11-08); nobody else has been asked.

## Results of checkable bets and register update (housekeeping, 2026-11-08 17:39 UTC)
- **D8** (a scheduled run must happen): **partly**: one scheduled run happened (09:10 UTC on 2026-11-08, green, 50 minutes late); the 02:20 and 14:20 runs did not appear (checked 15:48 UTC). GitHub's scheduler is not reliable on time; pushes also refresh the forecast; the page warns above 30 hours.
- **D37** (nothing paid): no charge was seen; I have not looked at a GitHub bill. **D42** (Pages, public repo, refresh every 6 hours): live and working, the refresh interval is not kept by GitHub's scheduler (above). **D43**: results in the D43 section (live part small, local part complete, the bet for 10 simultaneous visitors untested). **D44** (design pass round 1): the user liked it on Android (Firefox, Chrome, Samsung Internet). **D45** (do not download what we have): bet (a) yes, bet (b) no (see D45 results). **D46** (zoom limit): waits for the user's phone verdict.
- **D41's bet** (the cut-offs feel right): still only the user's word "androde looks good the the site works"; nobody else was asked.
- **Shortcut register (rebuilt from `git grep "shortcut:"`, 2026-11-08 17:39 UTC):** 4 markers in 3 files, unchanged since the last register: (1) and (2) `pipeline/process.py` (3 h detail dropped, negative packing differences set to 0, D14); (3) `config/headers.conf:3` marker is STALE (it says the only copy of the headers exists "for now" and nothing is hosted yet; a converter, `backend/pages.py`, exists since step 13.2); (4) `frontend/src/app.js` (a place found by the device has no known time zone, so the device's zone is used and labelled, D24). **Deviations with NO marker:** six JavaScript functions (corrected 2026-11-08, see D47) longer than 50 lines (`createMapView` 130, `mapScenarios` 145, `liveScenarios` 84, `createLive` 71, `createMapApp` 70, `serveFolder` 60); `tests/pipeline/test_basemap.py` is exactly 300 lines (at the limit). No new shortcut was added since the last register.

## D47 - Follow the 50-line rule: refactor the six long JavaScript functions instead of listing them (PLAN-016, 2026-11-08 19:34 UTC; the AI's choice, approved by the user with the plan)
- **Chosen:** refactor, with a test that keeps the rule. **Why:** the rule is a hard limit in the user's own instructions; 23 hours remain; the user was asked twice and gave no choice; listing the deviations would leave one submission item unticked. **Correction:** the count was 6, not 7 (see PROGRESS). **Alternatives:** list them as known deviations (cheaper, rule stays broken); mark each with a `shortcut:` comment (hides nothing, but still breaks the rule). **Bet:** behaviour does not change: all 32 browser scenarios in four engines, the phone checks and a before/after request table for the dev server pass after the refactor. Result: to be recorded in step 16.6.

### D47 result (2026-11-08 20:00 UTC)
- Bet "behaviour does not change": **held** by every check listed in PROGRESS (33 of 33 scenarios in Chromium, Firefox, WebKit and Edge after the map split; phone checks and the Pixel 7 zoom probe unchanged; `frontend-check` 8x8; 25 of 25 dev-server answers identical, including the four path-traversal attempts). The register above no longer lists deviations without a marker; the only `shortcut:` markers are the four in `pipeline/process.py`, `config/headers.conf` (stale), and `frontend/src/app.js`.

## Shortcut register (final, rebuilt from `git grep "shortcut:"`, 2026-11-08 21:15 UTC)
- **3 markers in 2 files:** `pipeline/process.py` (two: 3 h detail dropped; negative packing differences set to 0; D14) and `frontend/src/app.js` (device zone for a place found by the device; D24, D30). The fourth marker, `config/headers.conf`, was stale and was removed (comment corrected). **No deviation without a marker remains:** no function is over 50 lines (D47) and no file over 300. One test file is exactly 300 lines.

## D48 - Add a "what this page does and how to use it" guide with "Don't show again", after hour 64 (PLAN-017, 2026-11-09 13:14 UTC; the user's decision)
- **Prompted by:** the user's feedback that people are confused about what the site is for, what it does and how to use it.
- **Chosen by the user:** option 3 of three ("Intro plus first-visit tour"), plus "an option that says DON'T SHOW AGAIN, this needs to be in the site". I had recommended option 1 (words only) and advised against option 3 because of the little time left; the user chose it with that advice in front of them.
- **Design (the AI's, approved with the plan):** a native modal `<dialog>` with static text (purpose, three steps that match the page's own headings, where the forecast comes from), two buttons ("Close" for this visit, "Don't show again" stored in this browser as a fixed value), and a "How to use" button in the header to open it again. Alternatives not taken: a tour pointing at page elements (more code, more risk); a README-only fix (the live page would stay unclear).
- **Past hour 64:** the rule "no new features after hour 64" was passed at 2026-11-09 10:19 UTC; the user knowingly chose to add this (I had also missed the 60 h and 64 h warnings while idle: see PROGRESS).
- **Bet (can be checked later):** a first-time visitor understands what the page is for without being told. Only the user can check it by asking people; I have no measurement of it. Result: _not known yet_.

### D48 addition (2026-11-09 14:26 UTC)
- **Asked by the user while PLAN-017 step 17.1 ran:** "Add the model information as well here" and "Like what each of that model does and so people know which to select". Added to the guide (what IFS, AIFS and "Both models (agreement)" are, and which to start with) and to the README. **Choice of advice (the AI's):** start with "Both models (agreement)", because it shows where the two agree; IFS or AIFS for one model's own rain. No claim that one model is better: not measured here.
