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
