# PROGRESS

## Time budget (72 h)
- First user prompt (from the session log): **2026-11-06T18:19:13.452Z**
- Session ID: `3e56a452-e5f8-4bb9-b353-63bad43748f4` (unchanged since the first turn; the resumes after compaction are in the table below)
- Log file: `<Claude Code config folder>/projects/<project folder>/3e56a452-e5f8-4bb9-b353-63bad43748f4.jsonl`
- Deadline (first prompt + 72 h): **2026-11-09T18:19:13Z**
- Warnings due at 24 h (2026-11-07 18:19Z), 48 h (2026-11-08 18:19Z), 60 h (2026-11-09 06:19Z). No new features after hour 64 (2026-11-09 10:19Z). The 24 h warning is due today at 18:19 UTC; at the housekeeping edit (2026-11-07 14:17 UTC) 19.98 h had passed, so none has been due yet.
- The table below is rebuilt from `git log` (commit times are the committer times, UTC); every row is a real commit or an event noted at the time.

| Date/time (UTC) | Event | Elapsed | Remaining |
|---|---|---|---|
| 2026-11-06 18:19 | First prompt (from the session log) | 0.00 h | 72.00 h |
| 2026-11-06 18:19 | `date -u` at the first turn, same session ID | ~0.0 h | ~72.0 h |
| 2026-11-06 18:43 | Commit `ccb24df`: Start project: repo, problem statement, approved plan and records | 0.40 h | 71.60 h |
| 2026-11-06 18:43 | Commit `591a24c`: Record step 1 done-check results in PROGRESS and ENVIRONMENT | 0.41 h | 71.59 h |
| 2026-11-06 18:50 | Commit `7a83bb9`: Adopt PLAN-002: fixed folder layout, config-file rule and Python 3.11 | 0.52 h | 71.48 h |
| 2026-11-06 18:51 | Commit `ba581ee`: Record step 1b done-check results; mark step 1b done | 0.53 h | 71.47 h |
| 2026-11-06 19:07 | Commit `785e774`: Step 2: Python 3.11 virtual environment and pinned requirements | 0.80 h | 71.20 h |
| 2026-11-06 19:14 | Commit `fc08c94`: Step 3: fetch IFS and AIFS precipitation for the latest complete run | 0.92 h | 71.08 h |
| 2026-11-06 19:21 | Commit `1c495fc`: Adopt PLAN-003: units are handled per model (fixes wrong assumption A1) | 1.03 h | 70.97 h |
| 2026-11-06 19:42 | Commit `ca6cd60`: Record step 3 follow-up verification: Linux ok, IFS goes to 360 h, two fetch problems | 1.38 h | 70.62 h |
| 2026-11-06 19:52 | Commit `d3a75eb`: Fix E008 and E009 in the fetch step: safe downloads and a fail-fast run search | 1.56 h | 70.44 h |
| 2026-11-06 20:03 | Commit `5b69d20`: Record decision D9: out-of-date forecast shows a plain warning only | 1.73 h | 70.27 h |
| 2026-11-06 20:04 | Commit `806bfa9`: Record D9 addendum: technical error detail stays available to developers | 1.75 h | 70.25 h |
| 2026-11-06 20:14 | Commit `a9c1f0c`: Adopt PLAN-004: Docker as the official test run and a localhost preview | 1.92 h | 70.08 h |
| 2026-11-06 20:18 | Commit `e61441d`: Step 3b: Docker test environment (official test run) and Linux-complete pins | 1.99 h | 70.01 h |
| 2026-11-06 20:22 | Resume after /compact, same session ID; PROGRESS, DECISIONS and the ERRORS table re-read first | 2.06 h | 69.94 h |
| 2026-11-06 20:33 | Commit `dc2535c`: Step 4: processing core (units per model, 6 h intervals, model agreement) | 2.24 h | 69.76 h |
| 2026-11-06 20:44 | Commit `ec0c104`: Security audit report and draft PLAN-005 (awaiting approval) | 2.41 h | 69.59 h |
| 2026-11-06 20:55 | Commit `4dafae8`: Step S1: repo hygiene (secret patterns in .gitignore, secret-scan test); PLAN-005 approved | 2.60 h | 69.40 h |
| 2026-11-06 20:59 | Commit `aeb3a92`: Step S2: network timeouts on every request (finding S01) | 2.67 h | 69.33 h |
| 2026-11-06 21:05 | Commit `79b0d1e`: Step S3: Docker hardening, fetch/process split (finding S03); fix E015 | 2.77 h | 69.23 h |
| 2026-11-06 21:10 | Commit `21c9d46`: Fix E016: no hardcoded paths (user rule, decision D17) | 2.86 h | 69.14 h |
| 2026-11-06 21:29 | Commit `76d4d49`: Step S4: dependency vetting, vulnerability scan, hashes on all packages (finding S02) | 3.17 h | 68.83 h |
| 2026-11-06 21:36 | Commit `8008a9c`: Step 5: independent validation of the processed data against the raw GRIB | 3.29 h | 68.71 h |
| 2026-11-06 21:39 | Commit `c9fbe00`: Record D19: testing on localhost, public-like preview, one hosted site deployed automatically | 3.34 h | 68.66 h |
| 2026-11-06 22:14 | Commit `c7baf2d`: Step 6 (part 1): front-end spike, two local sites, Docker build/tests/screenshots | 3.93 h | 68.07 h |
| 2026-11-06 22:21 | Commit `ba46ed2`: Step 6 (part 2): adopt MapLibre GL JS and Natural Earth outlines, remove Cesium (D22) | 4.04 h | 67.96 h |
| 2026-11-06 22:21 | Commit `fb92a96`: Correct a guessed time in ERRORS E021 (found by checking the clock) | 4.04 h | 67.96 h |
| 2026-11-06 23:03 | Housekeeping review of all markdown files (this edit; its commit time is in `git log`) | 4.74 h | 67.26 h |
| 2026-11-07 00:00 | Resume after /compact, same session ID; PROGRESS, DECISIONS and the ERRORS table re-read first (I said "about 6.7 h used" in my first message after it; the correct figure was 5.7 h) | 5.68 h | 66.32 h |
| 2026-11-07 00:26 | Step 8 verified (see its results section); commit time in `git log` | 6.12 h | 65.88 h |
| 2026-11-07 00:27 | Commit `1e15254`: Step 8: Plan-my-day page (plan engine, place search, saved places) checked against an independent Python calculation | 6.13 h | 65.87 h |
| 2026-11-07 00:42 | Checkpoint requested by the user after their feedback; all markdown files updated (commit time in `git log`) | 6.39 h | 65.61 h |
| 2026-11-07 00:42 | Commit `394d64f`: Checkpoint after step 8: update all markdown records, record the user's feedback and proposal D29 | 6.40 h | 65.60 h |
| 2026-11-07 00:43 | Commit `3a3ec86`: ERRORS: E024 seen 2 (a time guessed ahead again while writing the checkpoint) | 6.40 h | 65.60 h |
| 2026-11-07 10:41 | The user was away about 10 hours; they replied with the layout (1/4 plan + 3/4 globe) and approved PLAN-007; clock read with `date -u` | 16.37 h | 55.63 h |
| 2026-11-07 10:42 | Commit `a9ca4bf`: Adopt PLAN-007: globe-first map (1/4 plan + 3/4 globe), then a design pass; record D29 decided and D30 | 16.38 h | 55.62 h |
| 2026-11-07 10:45 | Commit `4cd80ed`: Step 9.1: spike gate for the globe fly-in; the zoom-driven projection morph is chosen (D31) | 16.44 h | 55.56 h |
| 2026-11-07 10:52 | Commit `5a10456`: Step 9.2: map data contract (agreement colours in the manifest, checked frames) and pure map helpers | 16.55 h | 55.45 h |
| 2026-11-07 11:07 | Commit `4f2c67e`: Step 9.3 (part 1): globe-first map in a 3/4 area next to the plan (1/4), device position named, cache rules | 16.80 h | 55.20 h |
| 2026-11-07 12:11 | PLAN-008 approved (sharper pictures); 17.87 h used | 17.87 h | 54.13 h |
| 2026-11-07 12:27 | Commit `c124285`: Step 9.3b-1: gate for sharper rain pictures: measured four ways, 1440 px gradient palette PNG chosen (D34) | 18.14 h | 53.86 h |
| 2026-11-07 12:39 | Commit `0d9a3f7`: Step 9.3b-2: sharper rain pictures (1440 px smooth gradient palette PNGs, per-pixel agreement) and 50 m coastlines | 18.34 h | 53.66 h |
| 2026-11-07 13:08 | Commit `b6ec64d`: Record user feedback after the sharper pictures: E030 (reverse geocoder redirect), E031 (still blocky at city zoom) | 18.82 h | 53.17 h |
| 2026-11-07 13:12 | PLAN-009 approved (browser-side drawing, close fly-in, name fix); 18.88 h used | 18.88 h | 53.12 h |
| 2026-11-07 13:18 | Commit `131b60e`: Step 9.3c-0: place name works with the real service, close fly-in by place kind, My place button, rotation off | 18.99 h | 53.01 h |
| 2026-11-07 13:22 | Commit `9430f99`: Step 9.3c-1: browser-side drawing core (smooth sampling, continuous colours, soft agreement), tested against Python | 19.05 h | 52.95 h |
| 2026-11-07 13:24 | Commit `a576824`: Step 9.3c-2: data window for the browser-side drawing (tiles for the view, shared cache, layer accessor) | 19.08 h | 52.92 h |
| 2026-11-07 13:29 | Commit `1390501`: Step 9.3c-3: the rain is drawn in the browser at screen sharpness above zoom 4.5 (monotone cubic from the exact tile values) | 19.17 h | 52.83 h |
| 2026-11-07 13:37 | Commit `880a710`: Record D37: nothing paid, no credit-metered services (user constraint); base-map options researched | 19.30 h | 52.70 h |
| 2026-11-07 13:41 | PLAN-010 approved (stored vector base map); 19.37 h used | 19.37 h | 52.63 h |
| 2026-11-07 13:41 | Commit `b94d35d`: Adopt PLAN-010: a stored vector base map under the rain (user's choice); D38 started, sources read | 19.37 h | 52.63 h |
| 2026-11-07 13:49 | Commit `f9708f4`: Step 9.3d-1: gate for the stored base map: checked downloads, real sizes measured (zoom 0-7 = 189.6 MB), zoom 7 chosen | 19.50 h | 52.50 h |
| 2026-11-07 14:02 | Commit `cf82d26`: Step 9.3d-2: stored OpenStreetMap base map (Protomaps, zoom 0-7) under the rain, bright names and borders, Now button | 19.73 h | 52.27 h |
| 2026-11-07 14:09 | Resume after compaction, same session ID; the markdown records re-read first; clock read with `date -u` | 19.83 h | 52.17 h |
| 2026-11-07 14:17 | Housekeeping review of all markdown files (this edit; its commit time is in `git log`; rows after 00:43 on 2026-11-07 were added here, they were missing) | 19.98 h | 52.02 h |

## Current plan
**`docs/plans/PLAN-010.md`** (approved by the user 2026-11-07 13:41 UTC) is the plan in progress: a stored vector base map (OpenStreetMap through Protomaps, dark style, self-hosted fonts and sprites, English labels) under the rain; nothing paid (D37). Steps 9.3d-1 and 9.3d-2 are done; **next: 9.3d-3 (fit the rain to the map), then 9.3d-4.** After it: PLAN-009 step 9.3c-4, PLAN-007 steps 9.4 and 9.5 and PLAN-006 steps 10-12 (all still in force).

Plan files, oldest first (approved plan files are never edited, so their status is kept only here):

| Plan | Approved (UTC) | Status |
|---|---|---|
| PLAN-001 | 2026-11-06 ~18:42 | superseded by PLAN-002 (no folder layout, E002); its step 1 carried over |
| PLAN-002 | ~18:49 | superseded by PLAN-003 (A1 wrong for AIFS units, E006); steps 1b, 2, 3 carried over |
| PLAN-003 | ~19:20 | superseded by PLAN-004 (no localhost or Docker test run, E010) |
| PLAN-004 | ~20:13 | superseded by PLAN-005 (security, E013); steps 1-4 carried over; its text for steps 7-12 was superseded by PLAN-006 |
| PLAN-005 | ~20:51 | steps S1-S5, 5 and 6 done under it; superseded by PLAN-006 for steps 7-12; its security rules (D15, a security note in every plan) stay in force |
| PLAN-006 | ~23:24 | Plan-my-day (D24): steps 7 and 8 done; its step 9 superseded by PLAN-007; **steps 10-12 remain in force** |
| PLAN-007 | 2026-11-07 ~10:41 | layout 1/4 plan + 3/4 globe, then a design pass: 9.1-9.3 done; its A17 superseded by PLAN-008; **steps 9.4 and 9.5 remain in force** |
| PLAN-008 | 12:11 | sharper pictures: 9.3b-1 and 9.3b-2 done; A19 and 9.3b-3 superseded by PLAN-009 (E031) |
| PLAN-009 | 13:12 | browser-side drawing, close fly-in, name fix: 9.3c-0 to 9.3c-3 done; **9.3c-4 remains** (after PLAN-010) |
| PLAN-010 | 13:41 | stored base map; supersedes D22's outlines-only base map: 9.3d-1 and 9.3d-2 done; **9.3d-3 and 9.3d-4 remain** |

| Step | What | Status |
|---|---|---|
| 1 | Repo + records (git init, .gitignore, PROBLEM.md, DECISIONS, ERRORS, first commit) | **done** 2026-11-06 18:43 UTC, commit `ccb24df` |
| 1b | Apply folder layout (PLAN-002: D5, E002, README, .gitignore) | **done** 2026-11-06 18:50 UTC, commit `7a83bb9` |
| 2 | Python environment + pinned packages | **done** 2026-11-06 19:06 UTC (commit "Step 2: Python 3.11 virtual environment...") |
| 3 | Fetch (IFS + AIFS `tp`) | **done** 2026-11-06 19:16 UTC (commit `fc08c94`) |
| 3b | Docker test environment (PLAN-004) | **done** 2026-11-06 20:18 UTC (commit "Step 3b: Docker test environment...") |
| 4 | Processing core + tests (units per model) | **done** 2026-11-06 (commit "Step 4: processing core...", time in `git log`) |
| S1 | Repo hygiene: ignore patterns + secret-scan test | **done** 2026-11-06 (commit "Step S1...", time in `git log`) |
| S2 | Network timeouts | **done** 2026-11-06 (commit "Step S2...", time in `git log`) |
| S3 | Docker hardening, fetch/process split | **done** 2026-11-06 (commit "Step S3...", time in `git log`) |
| S4 | Dependency vetting + scan (scan approved) | **done** 2026-11-06 (commit "Step S4...", time in `git log`) |
| S5 | Identity decision | **done** (D16: keep e-mail as is, no code) |
| 5 | Independent validation | **done** 2026-11-06 (commit "Step 5...", time in `git log`) |
| 6 | Front-end spike + decision gate + localhost | **done** 2026-11-06 (commits `c7baf2d`, `ba46ed2`); library MapLibre (D22) |
| 7 | Static data export: point tiles, optional lower-resolution frames, manifest; size gate (PLAN-006) | **done** 2026-11-06 (commit "Step 7: ...", time in `git log`); D25, E023 |
| 8 | Plan engine + place panel: activities, day cards, best windows, rain totals with a range, saved places, text first (PLAN-006) | **done** 2026-11-07 (commit "Step 8: ...", time in `git log`); D27, D28, E024, E025 |
| 9 | Map and globe as supporting views (PLAN-006) | **superseded by PLAN-007** (rows 9.1-9.5) |
| 9.1 | Spike gate: fly-in from globe and flatten, two ways, screenshots (PLAN-007) | **done** 2026-11-07 ~10:45 UTC (commit "Step 9.1: ..."); D31 |
| 9.2 | Data contract (frames in the manifest, agreement colours) and pure map helpers (PLAN-007) | **done** 2026-11-07 ~10:53 UTC (commit "Step 9.2: ...") |
| 9.3 | Map module, controls, 1/4 + 3/4 layout, spike removed (PLAN-007) | **done** 2026-11-07 11:07 UTC (commit `4f2c67e`); the points open then (frame quality E027, real-service check of D32) were closed by 9.3b and 9.3c-0 |
| 9.3b-1 | Gate Q1: measure and look at four ways to make the rain pictures sharper (PLAN-008) | **done** 2026-11-07 12:27 UTC (commit "Step 9.3b-1: ..."); D34 |
| 9.3b-2 | Build the sharper frames: smooth up-sampling, agreement per pixel, config, tests, re-export (PLAN-008) | **done** 2026-11-07 12:39 UTC (commit "Step 9.3b-2: ..."); D34 results |
| 9.3b-3 | Look and confirm (Chromium, Edge, the user), records (PLAN-008) | **failed the user's look** (blocky when zoomed in, E031); superseded by PLAN-009 |
| 9.3c-0 | Quick fixes: reverse-geocoder host and name, fly-in zoom by source, rotation off, "My place" button (PLAN-009) | **done** 2026-11-07 13:18 UTC (commit "Step 9.3c-0: ..."); D32 corrected, D35, E030 closed |
| 9.3c-1 | Drawing core: smooth sampling, continuous colours, soft agreement (pure, tested) (PLAN-009) | **done** 2026-11-07 13:21 UTC (commit "Step 9.3c-1: ...") |
| 9.3c-2 | Data window: tiles for the view and a layer accessor (PLAN-009) | **done** 2026-11-07 13:23 UTC (commit "Step 9.3c-2: ...") |
| 9.3c-3 | Map integration: live layer above zoom 4.5, fallback picture (PLAN-009) | **done** 2026-11-07 13:29 UTC (commit "Step 9.3c-3: ..."); D36 |
| 9.3c-4 | Browser checks in the engines, Edge look, records (PLAN-009) | not started (after PLAN-010) |
| 9.3d-1 | Gate: measure the stored base map (extract sizes z4-z7, fonts and sprites) and show the user (PLAN-010) | **done** 2026-11-07 13:48 UTC (commit "Step 9.3d-1: ..."); D38 gate results |
| 9.3d-2 | Serve and style: nginx, the two packages, the dark style, rain below labels, outlines removed (PLAN-010) | **done** 2026-11-07 14:02 UTC (commit "Step 9.3d-2: ..."); D38 results, D39, E032 |
| 9.3d-3 | Fit the rain to the map: opacity, legibility, looks at several zooms (PLAN-010) | not started (next, after the user's go) |
| 9.3d-4 | Browser-check scenarios, records, hosting requirement for step 11 (PLAN-010) | not started |
| 9.4 | Browser checks in three engines, real GPU in Edge, records (PLAN-007) | not started |
| 9.5 | Design pass with the frontend-design skill, user review (PLAN-007) | not started |
| 10 | Provenance + honesty strip, final policy (PLAN-006) | not started |
| 11 | Hosting gate + deploy (free host only, D37; the 190 MB base-map file leaves only GitHub Pages) | not started |
| 12 | README + submission | not started |

Note: the built-in todo/task-list tool is not available in this session's tool set, so this table is the only live step list.

## Status (live, rewritten in the housekeeping of 2026-11-07 14:17 UTC; 19.98 h used)
- **Done:** steps 1-8, 9.1-9.3, 9.3b-1, 9.3b-2, 9.3c-0 to 9.3c-3, 9.3d-1, 9.3d-2 and the security steps S1-S5. The pipeline (fetch, process, validate, export) runs in Docker. The page runs on http://localhost:8080 (Docker preview, running): Plan-my-day on the left (1/4), globe that flies to the place and flattens into a flat map on the right (3/4), a stored OpenStreetMap base map, rain drawn in the browser from zoom 4.5 (pre-made pictures on the globe and zoomed out), time bar with Now, My place, model switch. The testing site on :5173 is not running. The user's overall verdict after the base map: "ok so all looks good". **Next:** step 9.3d-3 (fit the rain to the map, the user's look), 9.3d-4, then PLAN-009 step 9.3c-4, PLAN-007 steps 9.4 and 9.5, PLAN-006 steps 10-12. Not deployed; no remote.
- **Tests (last recorded 2026-11-07 14:02 UTC, step 9.3d-2):** `docker compose -f docker/compose.yaml run --rm tests` = **117 passed**; `... run --rm frontend-tests` = **70 passed**; `BROWSER_NAME=chromium ... run --rm browser-checks` = **9 of 9 scenarios**. `frontend-check` (the browser code on the real tiles equals the independent Python plan: 8 places x 8 activities) was last recorded at step 9.3b-2 and has not been re-run since the live layer; Firefox and WebKit `browser-checks` were last recorded at step 8 (8 of 8) and have not been re-run since the map work.
- **Git:** branch `main`, 48 commits before this housekeeping commit (the last: `cf82d26` at 2026-11-07 14:02 UTC), no remote (GitHub login and repo creation are plan step 11 and need the user's approval and link).
- **Size limits:** the largest source file is `frontend/src/app.js` with 284 lines; no function was written over 50 lines in the last steps (checked by line counts at each commit; the full check is repeated before submission).
- **Records:** this housekeeping checked every markdown file; findings and fixes are in the last section of this file.

## Open items (waiting on someone, or on a later step)
- **Waiting on the user:** (1) the go for step 9.3d-3 (fit the rain to the map); (2) in their Firefox the time bar once showed the first block (Fri 6 Nov 12:00-18:00): did they move the slider? (D39, not reproduced in Edge or Chromium); (3) how fast the live layer feels in their Firefox (only measured in Edge and Chromium); (4) Safari and phone tests, deferred by the user (D23); (5) GitHub login, repo link and approval before any push, and the hosting choice at step 11 (only GitHub Pages fits: D37 and the file size); (6) confirm the plain no-WebGL2 message wording (D23 item 3, built in step 9.3).
- **Settled by the user since the last housekeeping:** the layout (1/4 plan + 3/4 globe, D29), nothing paid (D37), the stored base map (D38), brighter names and borders (D39). The user's overall verdict after the base map, 2026-11-07 (time not logged): "ok so all looks good".
- **E007:** IFS to 360 h is still deferred (D12).
- **Checked in step 8:** `DecompressionStream('gzip')` reads the real tiles in Chromium 158, Firefox 159 and WebKit 27 in Docker, and the user's Firefox draws the page (their screenshots); time zones in Node tests (India, New York DST, Auckland, Kathmandu) and against Python on 8 real places.
- **Pending results of bets:** D2/A6 and D4 (size limits are met locally, host limits are checked at step 11), D8 (once the scheduled job runs), D9 and addendum (step 10), D14 (step 7 done, see DECISIONS), D37 (no bill: step 11), D11/D19 (re-check both local sites with the finished page, step 9.4).
- **Throwaway code:** none left. The spike generator, the spike pages and the picture-quality viewer were removed (steps 7, 9.3, 9.3b-2); `ls` of `frontend/` and `scripts/` on 2026-11-07 14:17 UTC shows none. Shortcut markers in code: see the register in DECISIONS.md (4 `shortcut:` lines in 3 files).
- **Requirements the base map puts on step 11:** a free host that serves a 190 MB file with HTTP range requests (GitHub Pages; not tested), the file kept out of git (A27: how it reaches the build is decided at step 11), the security headers as a CSP `<meta>` if the host cannot set headers (S14).
- **Not yet created by design:** `docs/SUBMISSION.md` and the final README (step 12), `.github/workflows/` (step 11). `backend/` exists since step 7.

## Known issues
- Python 3.10's pip is broken (E001); use `py -3.11` (the project `.venv` is 3.11.9).
- Firefox cannot create a WebGL context inside the Docker test container (environment limit), so the map can only be tested in Chromium (software WebGL), in Edge with the real GPU, and in the user's own Firefox. Safari and phones are untested.
- The plan part works without WebGL (checked with canvas disabled at step 8).
- **The forecast shown is the 2026-11-06 12:00 UTC run (exported 2026-11-07 12:35 UTC).** Nothing refreshes it until the scheduled job exists (step 11), and there is no out-of-date warning yet (step 10, D9). The page shows the run time at the bottom.
- **Timing:** the 24 h warning is due 2026-11-07 18:19 UTC; the map and design work (steps 9.3d-3 to 9.5) should end around hour 32-33 by the estimates in PLAN-010 (estimates, not measurements); the last 8 hours (from hour 64) are for deployment, README and submission.
- **Weight of the page:** first visit of the globe 1.56 MB, of a place at zoom 7 about 4.3 MB; a repeat visit still makes about 53 requests at zoom 7 because browsers cache partial (206) answers poorly (D38 results).
- **Base-map detail** stops at zoom 7 (cities, main roads); further in, the lines stay crisp but no new streets appear (D38).
- **Rain detail:** the cells are 0.25 degree (about 28 km). The live layer is smooth between cell centres and creates no detail the models do not have (D36). On the pre-made pictures (globe and zoomed out) a lone one-cell peak looks about a quarter as strong as its value (D34 and its test).
- Firefox headless cannot answer the location prompt, so the refusal path is exercised in Chromium and WebKit only.
- The user's Firefox once showed the time bar on the first block: not reproduced, cause unknown (D39).
- Linux hosts: file ownership of `data/` and the `APP_UID`/`APP_GID` override are documented but untested (no Linux host).
- The processed 6 h values carry up to about 0.24 mm (IFS, late steps) or 0.125 mm (AIFS) of GRIB packing rounding (DOMAIN.md, D14).
- Test runs of this session used one pair of forecast runs (00z and 12z of 2026-11-06); the publication-lag estimate (about 7.5 h) is from one run.
- Disk: `data/basemap/` is 486 MB because it still holds the three measuring extracts (zoom 0-5 and 0-6) next to the chosen one; they can be deleted, they are not used.

## Submission checklist — security (added at the user's request, 2026-11-06 ~20:43 UTC)
Each item is ticked in `docs/SUBMISSION.md` only after running the check. These come on top of the checklist in CLAUDE.md.
- [ ] Secret scan of the working tree, of every commit (`git grep` over `git rev-list --all`) and of the session log: key formats, plus the values of any token-like environment variables. Zero matches.
- [ ] The Docker test command (which includes the repo secret scan) passes on the final commit.
- [ ] Dependency scan of the final `requirements.txt` and the npm lockfile recorded in `docs/SECURITY.md`, or "not approved" recorded.
- [ ] `curl -I` of the live URL: HTTPS only, the agreed security headers present (or the CSP `<meta>` fallback documented).
- [ ] Every finding in `docs/SECURITY.md` is marked fixed, accepted (with the reason) or open, and the "could not check" list is updated.
- [ ] Public/private check: only the intended files are in the public repo; the identity decision (S06) is applied; no token or personal data beyond the decision appears in any log or file.
- [ ] Every plan file since D15 contains a "Security note".
- [ ] `npm audit` repeated on the final `package-lock.json` (last run at the install of the base-map packages, 0 vulnerabilities) and `pip-audit` on the final `requirements.txt`.
- [ ] The base-map file, fonts and sprites on the public host equal the checked originals (sha256 in `config/basemap.toml` and `config/basemap_assets.lock.json`).

# Results log (oldest first)

## Step 1 done-check results (run 2026-11-06 ~18:44 UTC)
- `git status --short | wc -l` after commit: `0` (clean).
- `git check-ignore -v .claude/settings.local.json`: `.gitignore:2:.claude/` (matched); `git ls-files | grep -c '^.claude'`: `0` (nothing under `.claude/` is tracked).
- `git show --stat HEAD` lists `docs/PROBLEM.md` (1 line).
- Byte comparison: `git show HEAD:docs/PROBLEM.md` piped into Python equals the problem statement exactly (217 bytes, no CR). Note: the pasted statement was wrapped over two lines by the terminal; it is saved as one line.
- Tests: none exist yet (no source code), so none were run. Line counts: no source files yet.

## Step 1b done-check results (run 2026-11-06 ~18:51 UTC)
- Root check `git ls-files | cut -d/ -f1 | sort -u` printed only `.gitignore`, `README.md`, `docs`. `ls -A` shows also `.claude` and `.git`, both untracked/internal (`.claude/` is ignored).
- `git check-ignore -v data/site/x data/raw/x .claude/settings.local.json`: all three matched (`.gitignore:20:/data/` twice, `.gitignore:2:.claude/`). `docs/PROGRESS.md` is not ignored.
- `git status --short | wc -l` after commit `7a83bb9`: `0`.
- `git diff ccb24df HEAD -- docs/plans/PLAN-001.md`: empty, so the superseded plan file is untouched.
- Diff of the approved plan text against committed `docs/plans/PLAN-002.md`: only the header lines (Drafted, Written, Approval) differ; the body is identical.
- Global `CLAUDE.md`: the new "File structure — MANDATORY" section was the only change (8 added lines, 0 removed, diff run before deleting the backup). Heading count is now 14 (was 13).
- No git remote exists (`git remote -v` prints nothing). Nothing has been pushed. The GitHub repo link will be given by the user later; repo creation and push still need the user's approval (plan step 11).
- Tests: none exist yet. Line counts: no source files yet.

## Step 2 done-check results (run 2026-11-06 ~19:05 UTC)
- Venv: `py -3.11 -m venv .venv` inside the project (git-ignored: `.gitignore:9:.venv/`). Python 3.11.9, pip 24.0.
- `.venv/Scripts/python.exe -c "import eccodes; print(eccodes.codes_get_api_version())"` printed `2.50.0` (also numpy 2.4.6). `findlibs.find('eccodes')` returned `None` and `eccodes.dll` sits inside the wheel's folder, so the library is bundled (A5 holds on Windows; Linux not yet checked).
- `pip check`: "No broken requirements found".
- `requirements.txt` pins 23 packages (4 direct, 19 transitive). A throwaway venv built only from it gave a `pip freeze` identical to the real venv (`diff` printed nothing; 23 lines each). Two transient `getaddrinfo failed` retries during that install; pip recovered.
- A4 (client downloads only the requested messages): confirmed by reading `ecmwf/opendata/client.py` `get_parts`; not yet run against the server.
- `pytest -q`: no tests collected, exit code 5, `PytestConfigWarning: No files were found in testpaths` (expected: `tests/` is created in step 4).
- Surprise: numpy 2.5.4 (newest) needs Python >= 3.12; pip chose 2.4.6 (recorded in D7, SOURCES).
- Line counts: no source files yet (`pyproject.toml` is 11 lines, config only).

## Step 3 done-check results (run 2026-11-06 ~19:11 UTC)
- Command: `.venv/Scripts/python.exe -m pipeline.fetch` (about 49 s). It printed: latest run complete for all models = **2026-11-06 00:00 UTC** (checked at 19:11 UTC).
- IFS: 64 messages, 34.54 MB. AIFS: 60 messages, 29.51 MB. Total 64.05 MB. "steps missing vs config: []" and "unexpected: []" for both models.
- eccodes key dump, both models: `shortName=tp`, `stepType=accum`, `startStep=0`, `gridType=regular_ll`, `Ni=1440`, `Nj=721`, `dataDate=20261106`, `dataTime=0`. **units: IFS `m`, AIFS `kg m**-2`** (differs from assumption A1: see E006). IFS endStep 3..240 with gaps {3, 6}; AIFS 6..360 with gaps {6}.
- Units cross-checked against values (area-weighted global mean of cumulative tp, IFS x1000 vs AIFS): 6 h 0.71 vs 0.71 mm; 120 h 15.57 vs 15.94 mm; 240 h 30.89 vs 31.49 mm. The keys are right.
- Hard-coded check: `grep -n -wiE "https?|ifs|aifs-single|aifs|data\.ecmwf" pipeline/*.py` printed nothing; URLs and model names come from `config/pipeline.toml` and the client.
- Tests: `pytest -q` -> `9 passed in 0.72s` (step expansion, bad ranges, real-config step counts 64 and 60, run selection incl. the "12z not published by one model" case, step check).
- Line counts: `pipeline/fetch.py` 144, `tests/pipeline/test_fetch.py` 57, `config/pipeline.toml` 30 (limits 300/50-line functions respected; longest function `summarise` is about 17 lines).
- Root check: only `.gitignore`, `README.md`, `config`, `docs`, `pipeline`, `pyproject.toml`, `requirements.txt`, `tests`. `data/` is untracked and ignored (not in `git status`).
- NOT verified: behaviour when the server is slow or a file is missing mid-download (retries set to 3 x 10 s; not exercised); the 12z IFS step list; Linux.
- **Open problem (resolved in the plan, not yet in code):** assumption A1 was wrong for AIFS (E006). PLAN-003 was approved 2026-11-06 ~19:20 UTC; the fix is applied and tested in step 4.

## Step 3 follow-up verification (asked for by the user; run 2026-11-06 ~19:25-19:41 UTC)
The four items listed as "NOT verified" in the step 3 results below were checked. Details: DOMAIN.md (follow-up section), ERRORS.md (E007-E009), ENVIRONMENT.md (Docker).
- **Linux: PASSED** in the `python:3.11-slim` Docker image (Python 3.11.18): install, `pip check`, `eccodes` 2.50.0 import, `9 passed`, real GRIB files decoded with identical counts, units and grid. Repo untouched (`git status` 0 lines).
- **12z IFS step list: PASSED, with a surprise.** Yesterday's 12z and 00z runs contain all 64 configured IFS steps and AIFS 60/60. IFS also has 20 more files (246..360 h) that contain `tp` (E007). **Needs your decision.**
- **Publication lag: MEASURED (one run).** 12z IFS appeared between 19:33 and 19:35 UTC (about 7 h 34 min after run time); 12z AIFS was already complete at the first poll (<= 7 h 09 min). Suggests starting checks about 07:45 and 19:45 UTC.
- **Error handling: 2 PROBLEMS FOUND, 2 cases fine.** Dead server: loud `ConnectionError` after 26 s (fine). Missing file: `HTTPError 404` after 1.2 s, no file left (fine). Truncated raw file: `download_run` crashes with `PrematureEndOfFileError` (E008, bug). HTTP 503: client retries each file check about 20 s and then silently falls back to an older run (E009; total hang time extrapolated, not measured). **No fix applied yet.**
- Steps 4+ have NOT started. Step 3 stays "done" for its own done-check; E007-E009 are open and listed in ERRORS.md.

## E008 and E009 fixes (asked for by the user; run 2026-11-06 ~19:45-19:53 UTC)
Files changed: `pipeline/fetch.py` (190 lines), `config/pipeline.toml`, `requirements.txt` (`requests` moved to the direct section: it is now imported directly), new `tests/pipeline/test_fetch_failures.py` (140 lines). Details and counters: ERRORS.md E008, E009; decision D8.
- Tests: `pytest -q` -> `20 passed in 3.42s` on Windows (9 old + 11 new); the same suite in the `python:3.11-slim` Docker image -> `20 passed in 5.03s`, `pip check` clean.
- E008 on real data: truncated the real 12z AIFS file to half (14,750,374 of 29,500,748 bytes) and ran `python -m pipeline.fetch`: IFS `(reused)`, AIFS `(downloaded)`, final file byte-identical (same size, same sha256 prefix), no `.part` left. **Fixed.**
- E009 end to end (local servers, real config values): always-503 -> `UnexpectedStatus` after 0.0 s; always-404 -> `ValueError: no run is complete for every model` after 0.8 s; dead port -> `ConnectionError` after 9.1 s. Real server: search found the 12z run (published about 19:34) at 19:49 UTC with 64 and 60 steps. **Fixed.**
- `requirements.txt` pins equal `pip freeze` (diff printed nothing). Root check: only the allowed entries. `data/` untracked and ignored.
- Not tested: a real network cut in the middle of a download; the original multi-hour 503 worst case (an extrapolation) was not reproduced.
- **Still open: E007 (IFS to 360 h).** The user wants it done only if the 240 h setup works perfectly after these fixes. Evidence now: two full real runs (00z and 12z) with all steps, 20 passing tests on Windows and Linux, recovery from a corrupted file, fail-fast on server trouble. It needs a plan revision (PLAN-004) and the user's approval before any change.

## Step 3b done-check results (run 2026-11-06 20:18 UTC)
Official test command from now on: `docker compose -f docker/compose.yaml run --rm tests`.
- (a) `docker info`: server 29.9.2 (linux) running; the local `python:3.11-slim` digest equals the one recorded in SOURCES.md.
- (b) `docker compose -f docker/compose.yaml build`: succeeded; `transferring context: 1.46kB` (1.88 kB after the requirements change), so `.venv/` and `data/` are not sent (A11 verified). `pip check` in the image: "No broken requirements found".
- (c) `docker compose -f docker/compose.yaml run --rm tests` -> `20 passed in 5.88s`, exit code 0.
- (d) Inside the tests container a connection to `data.ecmwf.int:443` fails with `gaierror` ("no network, as intended") while loopback works; the tests pass anyway, so they need no internet.
- (e) After the runs `git status --short` showed only my intended changes (`requirements.txt` modified, `docker/` new): nothing was written into the repo. Root check: tracked root entries unchanged; new top-level folder `docker` only.
- (f) Windows `.venv`: `20 passed in 3.72s` (same result, not used as proof).
- Extra: failure exit codes pass through `docker compose run` (pytest "no tests selected" -> 5; a failing command -> 1), so the scheduled job can rely on it.
- **Found and fixed on the way: E011.** The Linux image installs two packages that the Windows-made `requirements.txt` did not pin (`eccodeslib`, `eckitlib`). They are now pinned with a Linux-only marker; the Linux container's `pip freeze` equals the pins (25 packages), and Windows still needs only its 23 (`pip install --dry-run` installs nothing).
- Line counts: `docker/Dockerfile` 13, `docker/compose.yaml` 19, `docker/Dockerfile.dockerignore` 4; no Python changed in this step.
- Not done yet from PLAN-004: the localhost half (Vite dev server and nginx preview) comes in step 6; the `run` service (fetch/processing inside Docker) is added in step 4.

## Step 4 done-check results (run 2026-11-06 ~20:25-20:35 UTC)
Code: `pipeline/grid.py` (58 lines), `pipeline/process.py` (116), `pipeline/processed.py` (111); config `[grid]`, `[units_to_mm]`, `[process]`, `processed_dir`; tests `test_grid.py`, `test_process.py`, `test_processed.py`, `conftest.py` (20 new tests). Longest function about 17 lines. Decisions D13 (wet threshold 0.5 mm, user), D14 (6 h axis, uint16 format, two marked shortcuts). Errors: E006 fix verified (1/1), new E012 (grid starts at longitude 180).
- Official test run: `docker compose -f docker/compose.yaml run --rm tests` -> `40 passed` (20 old + 20 new), exit 0; `git status` showed only my intended changes. (Final run before the commit is recorded in the commit message.)
- Units: a test builds an IFS-style (metres) and an AIFS-style (kg m**-2) GRIB file with the same rain and reads both through the real reading path: both give 2.5 mm; an unknown unit raises.
- Grid (A2): both models start at longitude 180 (E012). `latlon_to_index` equals `eccodes.codes_grib_find_nearest` at 12 points (wrap, poles). Every message's layout is checked against `[grid]`.
- Real run in Docker (`run` service, Linux), 12z run: IFS 40 intervals (6..240 h), AIFS 60 (6..360 h); area-weighted global mean 0-240 h: **IFS 3.104, AIFS 3.155 mm/day** (1.7 % apart); the 00z run gave 3.091 / 3.149. Processing the same run on Windows gave **byte-identical** files (sha256 of all three .npy files equal).
- Negative differences: 146,269 (IFS) and 161,393 (AIFS) cell-intervals of about 41.5 million, most negative about -0.12 mm. Investigated, not waved away: the largest negative is exactly 0.50 of the two packing steps involved, so it is the 12-bit GRIB packing; clipping adds 0.056 % / 0.014 % of the mass (docs/DOMAIN.md, D14).
- Agreement at 0.5 mm: both dry 67 %, both wet 15 %, disagree 17-18 % (00z and 12z). D13 bet held (about 39 % both wet at 0.1 mm, 9 % at 1.0 mm).
- Output sizes (git-ignored): ifs.npy 83 MB, aifs-single.npy 125 MB, agreement.npy 42 MB per run (these are the processed grids, not the final site files; step 7 measures what the host receives).
- Docker `run` service added to `docker/compose.yaml`; checked that it creates `data/` itself when missing and writes only there (the README sentence that said otherwise was corrected before commit).
- **NOT verified: comparison with a published climatology.** I could not open a source with the number (PMC and MDPI blocked by a browser check/403, Europe PMC error, two other pages gave no value). A search result summary says GPCP V2.3 gives about 2.96 mm/day (1979-2013, Adler et al. 2018, Atmosphere 9(4) 138); I have NOT read that table, so it is not added to SOURCES.md and is not a verified fact. Our 3.1 mm/day is of the same size, but a 10-day sample is not a climatology anyway. The strong checks are the IFS-vs-AIFS match and the unit tests. If you can paste the value from the paper, I will record it.
- Not tested: a run whose raw files are missing a step (covered by unit test only); memory use beyond this machine (the processing holds about 0.5 GB of float32 arrays); real data other than runs 00z and 12z of 2026-11-06.
- Small slip, corrected at once: I wrote guessed times into three record headings before checking `date -u`; they now carry the real "~" times.

## Security audit (user request, run 2026-11-06 ~20:35-20:43 UTC)
- State when paused: step 4 finished and committed (`dc2535c`); `git status` clean on `main`; no remote; step 5 not started.
- Result: `docs/SECURITY.md` (findings S01-S09: no Critical or High; 5 Medium/Low items need code or setup changes, 2 need the user's decision). Not checkable yet: live-site items (HTTPS, headers, CORS, rate limiting), the front end, GitHub settings, a dependency vulnerability scan.
- Errors recorded: E013 (no security in earlier plans), E014 (`requests` used directly without vetting). Decision: D15.
- Fixes: `docs/plans/PLAN-005.md` (steps S1-S5, then steps 5-12 with security notes), **approved by the user ~20:51 UTC**; work in progress, see the step table.

## Step S1 done-check results (run 2026-11-06 ~20:52-20:55 UTC)
Files: `.gitignore` (+9 patterns), new `config/security.toml` (9 key formats, skip list), new `tests/hygiene/test_no_secrets.py` (3 tests, about 55 lines). Code ladder: standard library only (`re`, `tomllib`, `os.walk`).
- `git check-ignore -v` matched `site.pem`, `server.key`, `id_rsa`, `id_rsa.pub`, `credentials.json`, `my.token`, `bundle.p12`, `cert.pfx`, `id_ed25519`.
- Official Docker test command: `43 passed` (40 + 3 new), 7.8 s. The scan of the real repo finds nothing.
- Scanner proof: on a planted fake GitHub-style key, a scanner with no patterns finds `[]` and the configured scanner finds `[('leak.txt', 1, 'github_token')]`; the tests also cover all seven formats built at run time, skipped folders and binary files; results contain the file, line and pattern name, never the value.
- Defect found and fixed in my first version: walking `.venv/` through the Docker bind mount made the run take 141 s; switching to `os.walk` with pruned folders brought it back to 7.8 s.
- Not covered: secret formats not in the list; the git history and the session log (those are checked by hand at submission, see the checklist below).

## Step S2 done-check results (run 2026-11-06 ~20:56-20:59 UTC)
Files: `pipeline/fetch.py` (+`_TimeoutSession`, `_StrictSession` now builds on it, `_client` always sets the session; 208 lines), `config/pipeline.toml` (`connect_timeout_seconds = 10`, `read_timeout_seconds = 60`), `tests/pipeline/test_fetch_failures.py` (+3 tests). Code ladder: a small subclass of the already-installed `requests.Session`; no new package.
- Root cause confirmed in the installed source: the ecmwf-opendata client and multiurl pass `timeout=None` explicitly, so setting a default on the session is not enough; the subclass replaces a `None` timeout in `request()`.
- Official Docker test command: `46 passed` (43 + 3 new), 12.0 s.
- Silent server (accepts, never answers): a session with timeout (1, 1) raised `ReadTimeout` after 1.0 s; the same through `multiurl.download` (1 retry) raised `ReadTimeout` after 3.0 s. **Control:** a session with no timeout was still hanging when killed after 6 s (exit code 124).
- Real server, Docker `run` service: the search found the 12z run (reused files) in about 30 s as before; then the 12z files were moved aside and downloaded again: both files `(downloaded)`, all 64 and 60 steps present, **sha256 identical to the earlier download**, about 64 s. So the 60 s read timeout does not cut a normal download.
- Not tested: a real server that stalls in the middle of a download (the local silent server stalls from the first byte); the values 10 s / 60 s are my choice, not measured on ECMWF's slowest hour.

## Step S3 done-check results (run 2026-11-06 ~20:59-21:04 UTC)
Files: `docker/Dockerfile` (+ user `app`, uid 10001), `docker/compose.yaml` (shared `x-hardened` block; services `tests`, `fetch`, `process`; the old `run` service is gone, `no such service: run`), `pipeline/processed.py`, `tests/pipeline/test_processed.py`, README. Image renamed `precip-forecast:local`.
- Inside each of the three containers (script piped through stdin): uid/gid 10001; `CapEff` and `CapPrm` all zero; `NoNewPrivs: 1`; writing to `/etc`, `/usr/local`, `/work`, `/work/pipeline` is blocked (errno 30, read-only); `/tmp` writable; `/work/data` writable only in `process` and `fetch`; connection to `data.ecmwf.int:443`: `tests` and `process` -> no connection (gaierror), `fetch` -> CONNECTED.
- Official test command: `47 passed` (46 + 1 new regression test).
- `fetch` on the real run: `(reused)` for both models, all steps present. `process` on the real 12z run: all four files regenerated (`processed_at` changed 20:29:34Z -> 21:04:12Z), sha256 of the three .npy files identical to step 4 (`42a40773...`, `f44f1c34...`, `bdf8a927...`), no `.part` folder left.
- Found on the way: E015 (above). First attempt of this check was invalid and was redone.
- `data/` auto-creation re-tested with the non-root user on Docker Desktop: works. Linux hosts: documented (APP_UID/APP_GID, create `data/`), not tested.
- Not tested: Linux host file ownership; the compose `APP_UID` override with a different id.

## Fix E016 (no hardcoded paths) results (run 2026-11-06 ~21:03-21:10 UTC)
Done after S3 and before S4, at the user's reminder; details in ERRORS.md E016 and DECISIONS.md D17. Docker tests `51 passed` (47 + 2 `test_paths` + 2 guard tests); guard test shown to fail on planted names/paths; real `process` and `fetch` runs unchanged in output (sha256 equal to step 4). Line counts: `pipeline/paths.py` 30, `pipeline/fetch.py` 208, `pipeline/processed.py` 127.

## Step S4 done-check results (run 2026-11-06 ~21:12-21:28 UTC)
Files: `docs/SOURCES.md` (requests, pip-audit), `scripts/pin_hashes.py` (about 85 lines, standard library only), `config/security.toml` ([hashes]), `requirements.txt` (hashes on all 25 packages), `docker/Dockerfile` (`--require-hashes`), `tests/tooling/test_pin_hashes.py` (4 tests), `tests/hygiene/test_requirements_hashed.py`, guard test extended to `scripts/`, README. Decision D18 (user: hashes for all platforms).
- (a) `requests` 2.34.2 vetted on the PyPI JSON API (E014 closed, 1/1). The GitHub repo itself was not read.
- (b) `pip-audit` 2.10.1 (vetted first) in a throwaway container (non-root, no capabilities, read-only root, only requirements.txt mounted, no environment): **25 packages checked, 0 vulnerable, 0 skipped**; repeated on the hashed file with the same result and no warning. Data sent: package names and versions to pypi.org.
- (c) Hashes: 430 hashes written in 3.8 s. Official Docker tests `56 passed` (51 + 4 + 1). No-cache image build with `--require-hashes` succeeded, `pip check` clean. Linux container freeze equals the 25 pins. Fresh Windows venv from the hashed file: exit 0, freeze equals the 23 Windows pins, `pip check` clean. Wrong hash -> refused (exit 1); no hash -> refused (exit 1).
- Mistakes on the way, all caught by the checks: my first hygiene-test regex misread the continued lines (test failed, rewritten); the first "no hash is refused" check was invalid because the package was already installed (redone with a fresh target folder); a first quoting slip in a test file; the scanner container needed an executable `/tmp` (only for that throwaway container).
- Not tested: the generator against a real PyPI outage (it stops with an error); regenerating hashes after a real version bump (done once, for the current versions).

## Step 5 done-check results (run 2026-11-06 ~21:33-21:35 UTC)
Files: new `pipeline/validate.py` (80 lines), `scripts/validate_points.py` (35), `config/validation_points.toml` (8 places + tolerance), `config/pipeline.toml` (`validation_points_file`), `tests/pipeline/test_validate.py` (5 tests), README. Security note (PLAN-005): reads local files only, runs in the `process` container (no network), no new package; the optional Open-Meteo second source was NOT used (it would send coordinates to a third party; not approved).
- Independence: the processed side uses `pipeline/grid.py` index maths and `codes_get_values` on whole fields; the check side reads each raw message with eccodes' own `codes_grib_find_nearest`. Shared on purpose and stated in the module: the unit table from the config, the step list, and the 0.1 mm storage step.
- Real run, 12z, `docker compose -f docker/compose.yaml run --rm process python -m scripts.validate_points`: 8 places x 2 models = **16 of 16 rows within tolerance** (0.05 mm + 0.001 slack), exit 0; in every row both code paths picked the **same grid cell** (including Auckland and Suva near the date line). Largest differences: IFS 0.0441-0.0496 mm, AIFS up to 0.0500 mm; mean differences 0.006-0.029 mm. The ceiling of 0.05 mm is exactly half the storage step, as expected. Rain in the series reached 24.2 mm per 6 h at Chennai (AIFS), so the comparison is on real rain, not zeros.
- The 00z run: also 16 of 16.
- The check can fail: 5 new tests (Docker, 61 passed in total) break one thing on purpose and require the validation to flag it: a stored value changed by 0.7 mm, the longitude start set to 180 for a file starting at 0 (the E012 kind of error; shows as a different cell), IFS metres processed as mm (the E006 kind of error), plus the run listing. The matching case must pass for both models and both places.
- Not covered: the unit table itself is shared, so a wrong entry there would not be caught by this script (it is covered by the unit tests and by the IFS-vs-AIFS global means agreeing within 1.7 %); only 8 places and 2 runs; Open-Meteo or another outside source not used.

## Step 6 (part 1: spike, local sites, Docker) results (run 2026-11-06 ~21:40-22:14 UTC)
Files: `frontend/` (package.json + lock, vite.config.js, index.html, src/{badge,geo,outlines}.js, spikes/{maplibre,cesium}.{html,js}, tools/screenshots.mjs), `config/frontend.json`, `config/headers.conf`, `docker/{Dockerfile.node,Dockerfile.node.dockerignore,nginx.conf,compose.yaml}`, `scripts/spike_frame.py` (throwaway), `tests/frontend/geo.test.mjs`, `docs/evidence/`. Decisions D19-D21; errors E017-E020; security S10-S14.
- **Gate answers (D20):** spike MapLibre + Cesium; node:22-slim + nginx + Playwright (digests pinned, SOURCES.md); online geocoder (service chosen at step 8); base map: user asked for research (done, D20) and decides at the second gate.
- **Done-check, localhost:** the testing site `http://localhost:5173` (Vite dev server on the host) answers 200, serves `/data/` and `/cesium/`, shows the DEV badge on every page (host Edge screenshots); the public-like site `http://localhost:8080` (Docker nginx) answers 200 with the five security headers, serves the data folder, shows no badge. Both refuse connections via the LAN address. Dev data route: 3 traversal attempts -> 403; nginx -> 400.
- **Done-check, Docker:** `frontend-build` (no network) builds the app into `frontend/dist` (13 MB, Cesium static folders 7 MB of it); `frontend-tests` (`node --test`) 4 passed; Python tests 61 passed; `screenshots` (Playwright image) reports `ok: true` for all 5 pages: finished drawing, no console/CSP error, no host other than the preview, no DEV badge.
- **Screenshots** (`docs/evidence/step6-*.png` from Docker; `docs/evidence/dev-server/` from host Edge: home with DEV badge, and the MapLibre flat->globe toggle).
- **Runtime toggle (MapLibre):** centre 78E 13N and zoom 2.4 identical after flat -> globe -> flat, rain layer kept, no console errors. Cesium's switch was not tested.
- **Not done yet in step 6:** the second gate (the user chooses the library and base map), then removing the unused spike code; the frame format is decided in step 7. `npm audit` not run (needs approval).
- Not verified: behaviour on a phone or in Firefox/Safari (only Chromium and Edge); real GPU in Docker; the `.vite-temp` tmpfs and read-only mounts on a Linux host.

## Step 6 (part 2: second gate and clean-up) results (run 2026-11-06 ~22:15-22:21 UTC)
Decision D22 (user): MapLibre GL JS, self-hosted Natural Earth outlines, dependency scans when needed. Error E021 (my process slip).
- **Cesium removed:** code, packages (`cesium`, `@cesium/engine`, `@cesium/core`), config section, Vite copy step, compose mounts, screenshot pages. npm tree 98 -> 70 packages; production build 13 MB -> **1.7 MB** (JS 329 kB gzip, worker 147 kB gzip, 10 kB CSS). The two Cesium comparison screenshots stay in `docs/evidence/` as evidence for the decision.
- **`npm audit`** (standing approval, throwaway hardened container, lock file only): 70 packages, **0 vulnerabilities**.
- **Policy tightened** in `config/headers.conf` (`script-src 'self'`, no `child-src`); real-browser run on the public-like site (Docker Chromium): home, MapLibre flat, MapLibre globe all `ok: true`, no console/CSP errors, no outside host, no DEV badge; about 0.57 MB loaded per map page.
- **Testing site re-verified** with the final config (host Edge): DEV badge on every page, pages ready, `/data/` served, 3 traversal attempts -> 403; stopped by PID and verified on `[::1]`, `127.0.0.1`, `localhost`.
- Tests: Python 61 passed, Node 4 passed (Docker). Line counts: `frontend/vite.config.js` 70, `scripts/spike_frame.py` 77, `config/frontend.json` 47.
- Known leftovers (for later steps): `scripts/spike_frame.py` and `frontend/spikes/maplibre.*` are throwaway/spike code (`shortcut:` marked) replaced in steps 7 and 9; `config/headers.conf` is the only copy of the headers (converter for the public host at step 10/11); the frame format is still undecided (step 7).

## Housekeeping review of all markdown files (run 2026-11-06 ~23:00-23:03 UTC; user request, markdown only, no code or config changed)
Checked: README, PROBLEM, PLAN-001..005, PROGRESS, DECISIONS, ERRORS, SOURCES, DOMAIN, ENVIRONMENT, SECURITY (14 files). `docs/SUBMISSION.md` does not exist yet (created at step 12). Plan files were not touched (rule: approved plans are never edited).
Gaps found and fixed:
- **README:** status line, folder list and a stale sentence ("no front end or localhost preview yet") were out of date; added a "Browser support and what was tested" section (Chromium Docker, Edge host, Firefox user-reported, Safari and phones later, no GPU, WebGL2 requirement).
- **ENVIRONMENT:** stopped at step 3b; added the facts of steps 4-6 (images and digests, no-GPU constraint, Firefox in the container, IPv6 loopback and PowerShell quirk, netstat limits, process-stopping lessons, Windows versus Linux `node_modules`, tmpfs `noexec`, Node 22 `--test`, tool-shell limits).
- **SECURITY:** header and scope now say it was extended through `fb92a96`; S06 status updated to accepted (D16); three "could not check" items that were no longer true (vulnerability scan, front end, npm) were replaced; public/private table and the controls section updated for the front end, the self-hosted base map and the online geocoder.
- **DECISIONS:** results appended for bets that were still "pending" although the evidence exists (D1, D3, D5, D6, D7, D11, D19, D20); a shortcut register (4 markers in code, where each is recorded; the headers-file shortcut was missing); new D23.
- **ERRORS:** E010 and E013 counters and fix records brought up to date; E022 added.
- **DOMAIN / SOURCES:** front-end rendering facts and the browser builds of the Playwright image added.
- **PROGRESS (this file):** the result sections were out of order and the time table stopped after step 4; the table is rebuilt from `git log`, results are in chronological order, and Status, Open items and Known issues are rewritten.
Found but not changed (no code changes allowed): `frontend/spikes/maplibre.js` exposes `window.__map` without a `shortcut:` marker (recorded in the shortcut register).
Two things noticed about my own work: three times this session I wrote a time into a record before checking the clock (corrected each time, E021 and earlier slips), and the first Firefox "variants" were not what I thought (E022).

## Front-end innovation ideas offered to the user (~23:06 UTC; NOT decisions)
User request: "i dont see anything innovative here so from any other steps i want you to give me ideas to make the front end genuinely innovative." The ideas build on what this project uniquely has: two independent models (IFS physics, AIFS machine learning), an agreement field for 6-240 h, a static data approach, and rendering in the visitor's own browser (no server GPU, D23). Hour figures are the AI's rough estimates, not measurements.
- **I1 Agreement-aware rain map:** one map that shows how much rain AND how sure the two models are (colour for amount; hatching or desaturation where they disagree). Replaces the separate agreement bar. About 4-6 h. Risk: legibility and colour-blind safety; must always say agreement is not a probability (D3).
- **I2 Butterfly timeline for the chosen place:** IFS mm bars above the axis, AIFS mirrored below, shaded where they agree; scrubbing moves the map and the chart together. About 3-4 h.
- **I3 Compare lens:** drag a circle (or a curtain slider) over the map; inside it you see the other model. Two synchronised maps. About 2-3 h; doubles map memory.
- **I4 Rain spiral:** a 10-day clock, one ring per day, angle = local hour, colour = rain; shows daily rhythms at a glance. About 3-4 h; novelty versus readability.
- **I5 Hear the forecast:** Web Audio plays the 10 days in about 20 s as rain sound (loudness = mm, IFS left ear, AIFS right ear); doubles as an accessibility feature. About 2-3 h; needs a click to start (browser rule).
- **I6 Storm tour:** the pipeline finds the biggest rain systems of each run; the globe flies to them with auto-written captions. About 6-8 h; accuracy risk for captions.
- **I7 Plan-my-day:** activity presets (commute, laundry, picnic, cricket, farming) with their own dry thresholds; ranks dry windows in plain words with agreement as confidence. About 3-4 h; very useful.
- **I8 Smooth motion between 6 h frames:** motion vectors computed in the pipeline let the browser animate between frames; must be labelled as interpolation. About 8-12 h; research risk.
- **I9 Offline-capable installable app (PWA):** last forecast cached, age always shown (D9). About 3 h; practical rather than visual.
AI recommendation was: signature "agreement-first" = I1 + I2 + I3 + I5, with I7 as the everyday-use feature. **The user chose I7 (Plan-my-day) as the signature and asked that extras be genuinely helpful** (saved places, rain totals with a range); the sound, lens, spiral and smooth-motion ideas were dropped. Decision D24, plan PLAN-006 (approved ~23:24 UTC).

## Step 7 done-check results (run 2026-11-06 ~23:29-23:55 UTC)
Files: new `backend/` (`tiles.py` 91 lines, `frames.py` 68, `manifest.py` 72, `export.py` 96, `readback.py` 29), `config/backend.toml`, `scripts/validate_site.py`, `tests/backend/` (4 files), `tests/hygiene/test_config_consistency.py`, `docker/compose.yaml` (`export` service), `pipeline/paths.py` (`remove_folder` shared); `scripts/spike_frame.py` deleted (replaced). Config: `site_dir`, `backend_config_file` in `pipeline.toml`; the spike page now reads an exported frame. Decision D25; error E023. Plan PLAN-006 step 7.
- **Size gate (measured first):** prototype on the real 12z run, 8 layouts and 2 tile sizes (D25): chosen 16 x 16, layer-major, byte-shuffled, gzip 9 = 27.9 MB in 4140 files. Naive estimate in the plan was about 200 MB raw before compression (207.6 MB measured raw). **Real export: 36.0 MB in 4281 files** (tiles 27.9 MB, 140 frames 8.1 MB, manifest 10.7 kB); fits GitHub Pages (1 GB) and Cloudflare Pages (20,000 files, 25 MiB per file); no fallback needed; host limits read from the official pages (SOURCES.md).
- **Official tests:** `95 passed` (93 + 2 config guards; 33 new backend tests: tile geometry incl. longitude start 180, byte layouts, 6 kinds of malformed tile, every cell of a synthetic run read back from tiles equals the processed arrays, frame placement, manifest damage cases, retrieval time, replace-on-export). Node tests 4 passed. Line counts all under 100 per file.
- **Independent check on the real run:** `scripts/validate_site.py` (Docker, no network): 8 places x 2 models = 16 rows, tile values **identical** to the processed arrays, within 0.05 mm of the raw GRIB read with eccodes' own nearest-point search (0.0312-0.0500 mm), manifest problems: none.
- **Frames looked at:** the IFS +24 h frame and the agreement frame show the same weather systems as the earlier spike picture; agreement is blue where both wet, orange where they disagree, transparent where both dry.
- **Real-browser check of the public-like site** with the exported data (Docker Chromium): home, MapLibre flat, MapLibre globe all `ok: true`, no console or policy errors, no outside host, 484 kB loaded per map page; the manifest, a frame and tiles are served (tiles as `application/octet-stream`, which is right for files the browser decompresses itself).
- **Found on the way:** E023 (small showers lost by nearest-cell resampling) plus four small self-review fixes listed in it. A very slow command (the size probe, 11 min) was moved to the background by the tool.
- **Not verified yet:** reading the tiles in a browser with `DecompressionStream` (step 8); export time on Linux; behaviour of two consecutive scheduled exports on a real host (step 11); the attribution wording (step 10).

## Step 8 done-check results (run 2026-11-07 ~00:05-00:30 UTC)
Files: `frontend/src/` time.js, plan.js, windows.js, wording.js, view.js, tiles.js, manifest.js, data.js, places.js, geocode.js, dom.js, render.js, app.js, style.css; `frontend/index.html` (now the Plan-my-day page); `config/activities.json`; `config/frontend.json` (geocoder, saved places, check, browser checks); `config/headers.conf` (geocoder host in connect-src); `pipeline/process.py` + `processed.py` (D28 rule 1); `scripts/plan_reference.py`, `scripts/make_js_fixtures.py`; `frontend/tools/plan_check.mjs`, `browser_checks.mjs`; compose services `frontend-check`, `browser-checks`; tests (`tests/frontend/*.test.mjs`, `tests/frontend/fixtures/python_reference.json`). Largest new source file 243 lines. Decisions D27, D28; errors E024, E025. Code ladder: standard browser APIs (Intl, DecompressionStream, fetch, localStorage), no new package.
- **Pipeline change first (D28 rule 1):** the agreement field is decided on the stored 0.1 mm values. Re-ran `process` and `export` on the real 12z run: agreement both wet 17.6 % (was 15.1 %), both dry 64.6 %, disagree 17.8 %; export again 36.1 MB in 4281 files. Python tests 99 passed (97 + 2 config guards; 2 new tests for the rule).
- **Node tests:** 41 passed (time zones incl. India +05:30, Kathmandu +05:45, New York DST change at 06:00 UTC on 1 Nov, the local date differing from UTC; blocks across local midnight; threshold edge; current partly elapsed block at exactly half and one second less; window ranking; totals incl. the AIFS-only tail; hostile tiles, manifests, addresses, storage and geocoder replies). Mutation check: 5 deliberate breaks (round-half-up, `>` for `>=`, day by block start, wrong byte order, reversed window order) each made at least one test fail; baseline restored.
- **Tiles read by the browser code equal the Python code:** 2 tile files made by `backend/tiles.py` (shuffled and plain) decode to the same numbers; 16 tricky places (ties, date line, poles, longitudes beyond 360) land in the same grid cell and tile as `pipeline/grid.py` (round-half-even was needed: JavaScript's `Math.round` picks another cell).
- **Real data, independent calculation:** `scripts/plan_reference.py` (raw GRIB through eccodes' nearest-point search, its own Python version of the rules, fixed check time 2026-11-07 08:00 UTC) vs the browser code on the real exported tiles (`frontend-check`, no network): **8 places x 8 activities match** (windows, day states, totals for 3/7/10 days); all **800 tile values are identical** to the raw reads (0 off by one step); the browser's time zone database agrees with the offsets I wrote for the 8 zones. The check fails when the logic is broken (mutation: day by block start made Chennai and Sydney fail).
- **Real browsers (Docker, `browser-checks`, site http://localhost:8080 as a secure context):** 8 scenarios (address, no canvas/WebGL, location allowed, location refused, search with a MOCK geocoder, saved places, activity change, hostile storage and address) pass in **chromium 158, firefox 159 and webkit 27** (webkit is Safari's engine, not Safari). One more run with the REAL Open-Meteo geocoder (one request, "Chennai") in Chromium passed: the policy allows exactly that host, the answer's time zone is used instead of the device's, the request carried no cookie and no referrer. Hostile text in the address is shown as text (`window.__pwned` stays undefined). Screenshots: `docs/evidence/step8-<engine>-*.png`.
- **Fixed on the way (all in my checks, not in the page):** E025 (three flaws in my checks). Firefox's refusal path is not exercised headlessly (limit stated above).
- **Not verified:** the user's own Firefox and any Safari or phone; the real geolocation prompt with a person answering; behaviour on the public HTTPS host (step 11); the wording "rounded to 0.1 mm" with a user; whether the windows match a place the user knows (D24 bet); two scheduled exports in a row.

## Checkpoint (2026-11-07 ~00:42 UTC; requested by the user)
- State: steps 1-8 done and committed (`1e15254`); the working tree held only the markdown updates of this checkpoint, which are committed with it. Tests at the checkpoint: Python 99 passed, Node 41 passed, `frontend-check` 8 x 8 match, `browser-checks` 8 of 8 in chromium, firefox and webkit (run at ~00:25 UTC, before the markdown edits; no code changed since).
- Running: the Docker preview on http://localhost:8080 (left on for the user). Nothing was pushed; no remote exists.
- Not started: step 9 and later; the design pass; the age warning (step 10); hosting (step 11).
- Time: about 6.4 h of 72 h used; the 24 h warning is due 2026-11-07 18:19 UTC.
- Records touched in the checkpoint: README (status, layout, browser table), PROGRESS, DECISIONS (D29 proposal), ERRORS (E026), SOURCES, DOMAIN, ENVIRONMENT. SECURITY was updated at step 8 and has no new facts. Plan files were not edited (rule).

## Step 9.1 done-check results (run 2026-11-07 ~10:42-10:46 UTC)
Files: `frontend/spikes/flyin.{html,js}` and `frontend/tools/spike_flyin.mjs` (throwaway, removed in step 9.3), `config/frontend.json` (`build_pages` + the spike page, removed with it), screenshots `docs/evidence/step9-1-{chromium,msedge}-{A,B}-{1-start-globe,2-mid-flight,3-end}.png` (12 files). Decision D31.
- Real browsers: Docker Chromium 158 (software WebGL, public-like site) and the host's Microsoft Edge (real GPU, Vite testing site on 5173), way A and way B each: finished on the target within 0.00000 degrees and zoom 4.500, no console or policy error. Mid-flight pictures: A shows the full globe, B is already flattening; end pictures identical. Choice: B (D31), A kept as fallback.
- Not measured: how smooth the animation is in frames per second (software rendering is slow, a screenshot cannot show it); Firefox and Safari (Firefox in Docker has no WebGL); a phone.
- Process note: the host dev server was first "stopped" with a lookup by port that found nothing and `curl` still answered 200; it was then found by command line and stopped by PID, and checked on `localhost`, `::1` and `127.0.0.1` (the E021 lesson applied, one wasted step).

## Step 9.2 done-check results (run 2026-11-07 ~10:46-10:53 UTC)
Files: `backend/manifest.py` (agreement colours in `frames`, checked by `validate`), `frontend/src/mapstate.js` (new, 88 lines), `frontend/src/manifest.js` (frame checks), `config/frontend.json` (`map` section: start view, zoom limits, fly-in, start model, sea colour), tests `tests/backend/test_manifest_export.py` (+3), `tests/frontend/mapstate.test.mjs` (9 tests), `tests/frontend/tiles.test.mjs` (fixture has `frames`). Code ladder: standard library and the existing helpers only; no new package.
- **Tests:** Python 102 passed (99 + 3: colours present and equal to the config minus the transparent class, two kinds of damage caught); Node 50 passed (41 + 9: hostile frame paths (`..`, absolute, query string, `javascript:`), wrong steps, bad colours, frames switched off, block -> step, first upcoming step incl. the block that ended exactly now, frame choice for IFS / AIFS / both incl. the steps only AIFS reaches, model options, frame URLs with the export version, fly rules, reduced motion, projection spec, WebGL2 detection with an injected canvas, the name of a map point). Mutation check: 3 deliberate breaks (a click on the map flies, an off-by-one at the block that ended now, the path rule removed) each made a test fail; restored.
- **Real data:** re-exported the real 12z run (36.1 MB, 4281 files, manifest 10.7 kB); the manifest holds `agreement_colours` (`both_wet` #2a6fd6, `disagree` #f28a17); `scripts.validate_site`: all 16 rows identical and within 0.05 mm of the raw GRIB, manifest problems none; `frontend-check` (the browser code validates the real manifest, frame paths included, then 8 places x 8 activities) still matches.
- **Not verified:** nothing is drawn yet (step 9.3); the colour of the legend in a browser.

## Step 9.3 progress notes (2026-11-07 11:07 UTC; not the final results)
- Built: `frontend/src/{mapview,mapcontrols,mapapp,pagemap,reverse}.js`, new `index.html` / `style.css` (left panel about 1/4, map about 3/4, stacked on narrow screens), day-card blocks are buttons that show the block on the map, map click chooses a place, spike pages and driver tool removed, `window.__map` gone. Plan chunk 35 kB (14 kB gzipped); map chunk 1.19 MB (335 kB gzipped), loaded in parallel with the manifest.
- User feedback during the step: the search box kept an old search after "Use my location" (fixed, D32); "can we cache the globe loading" (D33, measured); "integrated GPUs" (right, see D33); **"the image does not look good at all"** (E027: the frames are too coarse; the fix needs a revised plan, PLAN-008, before any change).
- Verified: Node 53 passed, Python 102 passed, Chromium browser checks 8 of 8 (incl. the search box and the device name with a MOCK reverse service), screenshots of the globe start and of an address place (flat, zoom 4.5). Load times in Edge (real GPU) in D33.
- Not verified: Firefox and WebKit with the new page, the real BigDataCloud call, map scenarios of step 9.4, the image quality fix.

## Step 9.3b-1 done-check results (run 2026-11-07 12:27 UTC; 18.14 h used)
Files: `scripts/proto_frames.py` (prototype, removed in 9.3b-2), `frontend/spikes/quality.{html,js}` and `frontend/tools/spike_quality.mjs` (throwaway viewer and driver, removed in 9.3b-2), `config/frontend.json` (`build_pages` + the viewer, `docker/compose.yaml` spikes mount: both temporary), screenshots `docs/evidence/step9-3b-chromium-*.png`. Decision D34.
- Table of sizes and times and the choice: D34 (1440 px, 16-level gradient in a palette PNG with adaptive row filters = 390 kB for the largest measured frame; limits from the plan respected: about 400 kB per frame, about 100 MB for the export).
- Looked at in Chromium (Docker): today's picture is blocky; 2048 px with hard bands still stair-steps at zoom 4.5; the gradient looks like a normal weather map at zoom 4.5 and zoom 3.5; 50 m coastlines show the real coast shape. The user chose the 50 m outlines (+197 kB gzipped, first visit only).
- Measured on one block (IFS +24 h of the 12z run); the real export prints the largest frame so the limit is checked on all 140.
- Not done in the gate: Edge with the real GPU (9.3b-3), the load-time effect of larger pictures (9.3b-3), the user's own look (9.3b-3).

## Step 9.3b-2 done-check results (run 2026-11-07 12:39 UTC; 18.34 h used)
Files: `backend/frames.py` (rewritten: palette PNG writer with per-row filters, bilinear up-sampling, rain gradient, per-pixel agreement; the old block-based functions are gone), `backend/export.py`, `config/backend.toml` (`size` 1440, `gradient_levels`, `fade_levels`, `fade_from_mm`), `config/frontend.json` (`map.resampling`), `frontend/src/{mapview,mapcontrols,outlines,render,style}`, `tests/backend/test_frames.py` (10 tests), `tests/frontend/mapstate.test.mjs`; removed: `scripts/proto_frames.py`, `frontend/spikes/`, `frontend/tools/spike_quality.mjs`, the temporary compose mount.
- **Tests:** Python 105 passed (new: palette PNG round trip decoded by an independent reader incl. both row filters, refusal of bad palettes, linear ramp reproduced exactly and north at the top, values within neighbour range and a smooth date-line seam, longitude of a column for both grid conventions, a lone cell stays visible and in place (with its stated limit), rain palette and index edges, per-pixel agreement with the plan's rule, empty classes transparent); Node 53 passed.
- **Real export (Docker, no network, about 8 minutes):** 4281 files, 64.3 MB (tiles 27.9 MB unchanged, frames 36.4 MB, manifest 10.7 kB); largest frame 495 kB (D34 results). `scripts.validate_site`: 16 of 16 rows identical to the processed arrays and within 0.05 mm of the raw GRIB, manifest problems none. `frontend-check`: 8 places x 8 activities match. The preview was restarted after the export (E029) and serves manifest and a frame (200).
- **Looked at:** Edge with the real GPU (`docs/evidence/edge/step9-home*.png`): the globe-first start with the gradient legend, and the Chennai view as a smooth weather map with real coastlines; no console or policy error, no outside host. Chromium browser checks: 8 of 8 scenarios.
- **Load time (Edge, D34 results):** first visit 1.29 MB and map drawn at about 1.5 s; repeat visit 1 request, 0.45 s.
- **Not verified:** the user's verdict; Firefox and WebKit with the new pictures (9.4); the real BigDataCloud call; the globe-scale look of the 50 m outlines is busy (white specks at the coast), a design-pass item; the first-visit weight on a slow connection (not measured).

## User feedback after the sharper pictures (2026-11-07 13:08 UTC; the user's own Firefox, with a screenshot)
- "when i zoom in it still is showing in blocks not smooth"; "the 2d (flat) is not working, because when i use the location it has to be accurate and zoom to that location"; "do u think people will like it? NOPE". The screenshot (Flat + both models + the UK) also shows: **the map draws in the user's Firefox** (D23 bet held: WebGL works there; the user runs an ad blocker, extensions icons visible), the name box still says "Your location" (E030), the time bar at Fri 6 Nov 12:00-18:00 (not reproduced, see E031), the marker off-centre (caused by scroll-zooming around the mouse).
- Checked before answering (Edge, real GPU): zoom 7 pictures `docs/evidence/edge/step9-3b-zoom-{ifs,both}.png`; real BigDataCloud call (E030); default block (`ifs_30`, correct).
- Consequence: PLAN-008's step 9.3b-3 did not pass the user's look. A revised plan (PLAN-009) is needed; E027 stays open and E031 is added.

## Step 9.3c-0 done-check results (run 2026-11-07 13:18 UTC; 18.99 h used)
Files: `config/frontend.json` (reverse host, `map.fly.zoom_by_source`, `max_zoom` 10), `config/headers.conf`, `frontend/src/{reverse,mapstate,mapview,mapcontrols,mapapp,style}`, `frontend/tools/browser_checks.mjs`, `tests/frontend/{places,mapstate}.test.mjs`. Decisions D32 corrected, D35; E030 closed.
- **Tests:** Node 53 passed (the changed tests: the real London answer, a bad country code, the zoom by source, the zoom limits), Python 105 passed.
- **Real browsers:** Chromium in Docker (MOCK geocoders): 9 of 9 scenarios, including "location allowed" (name, search box, the map landing at zoom 8 on 11.46 N 78.19 E within 0.01 degrees, flat view) and the new "my place button" (drag away, press the button, back within 0.01 degrees). Edge with the real GPU and the REAL Open-Meteo and BigDataCloud services: 9 of 9, the device position was named "Rasipuram, Tamil Nadu, India".
- **Found on the way:** the preview must be restarted after a policy change (ENVIRONMENT); a stale `moveend` after drag inertia (fixed with `map.stop()`).
- **Not verified:** the user's Firefox with these changes; the visual sharpness at zoom 7-8 (still the pre-made picture: that is steps 9.3c-1 to 9.3c-3).

## Step 9.3c-1 done-check results (run 2026-11-07 13:21 UTC; 19.04 h used)
Files: `frontend/src/live.js` (new, 153 lines: view rows and columns in Web Mercator, Catmull-Rom sampling limited to the range of the four cells around the point, window of cell values with the date-line wrap, continuous rain colour ramp with a soft edge, soft agreement), `config/frontend.json` (`map.live`), `scripts/make_js_fixtures.py` (+ Python's independent versions of the view maths and the sampling), `tests/frontend/fixtures/python_reference.json` (regenerated), `tests/frontend/live.test.mjs` (10 tests). Code ladder: standard JavaScript only, no package.
- **Tests:** Node 63 passed (53 + 10): the view rows and columns equal the independent Python numbers for three views (one across the date line, one with high latitudes); the smooth field equals Python at ten places incl. the edge rows and the wrap; exact at cell centres; a linear ramp reproduced; 300 random places with sharp dry/wet contrasts never leave the range of their four cells and never go negative; continuity across the date line; colour ramp edges (soft edge, first and last stop, no bands); agreement: dry-dry clear, wet-wet and one-wet colours, symmetric, half strength exactly at the threshold; config consistency (`fade_from_mm` equals the Python frames setting). Mutation check: 4 deliberate breaks (no clamp, threshold off by half a step, rows linear in latitude, a wrong sign in the weights) each made at least one test fail; restored.
- **Found by my own test:** Catmull-Rom is not monotone between two cells (it can overshoot the two endpoint values); the promise is the 2 x 2 range of the four cells around the point, and that is what the code and the tests now say.
- **Not verified:** speed in a browser (9.3c-3), the picture itself (9.3c-3), the tile data window (9.3c-2).

## Step 9.3c-2 done-check results (run 2026-11-07 13:23 UTC; 19.08 h used)
Files: `frontend/src/livedata.js` (new, 49 lines: `layerIndex`, `tilesFor`, `loadWindowTiles`, `layerAccessor`), `frontend/src/tiles.js` (the tile fetch + decode + cache extracted as `loadTile` and `tileShape`; `loadSeries` now uses it, so the plan and the map share one cache), `tests/frontend/livedata.test.mjs` (5 tests).
- **Tests:** Node 68 passed (63 + 5): a layer is found by model and block; the tiles for a view equal a brute-force cell-by-cell answer for five views incl. one across the date line and the whole world (6 tiles); tiles are fetched once and shared through the cache; more tiles than the limit gives "use the picture" and fetches nothing; a failed tile is a clean rejection and is forgotten so it can be tried again; a damaged tile is refused; the accessor returns every cell of every layer exactly (3 layers x 200 cells) and refuses a cell whose tile was not loaded; tiles -> accessor -> smooth field equals the stored value at cell centres. The 63 earlier tests (incl. `loadSeries`) still pass after the refactor. Mutation check: 3 deliberate breaks (no margin, row and column swapped, cache never hit) each made at least one test fail; restored.
- **Not verified:** real tiles in a browser and the cost of the fetches (9.3c-3).

## Step 9.3c-3 done-check results (run 2026-11-07 13:29 UTC; 19.17 h used)
Files: `frontend/src/maplive.js` (new, 97 lines: decides when to draw, fetches the view's tiles, draws, hands the picture over, falls back on any failure), `frontend/src/live.js` (PCHIP replaces Catmull-Rom + clamp), `frontend/src/{mapview,mapapp,pagemap}.js` (live image layer, view and bounds, hand-over without flicker, wiring), `config/frontend.json` (`map.live.agreement_opacity`), `scripts/make_js_fixtures.py` + fixture (Python's PCHIP), tests, `frontend/tools/live_look.mjs` (screenshots and timing in a real browser). Decision D36.
- **Tests:** Node 68 passed (a new PCHIP test replaces the Catmull-Rom weights test; the JavaScript equals Python's independent PCHIP at ten places; mutation check on PCHIP: 3 deliberate breaks each failed 4-5 tests); Python 105 passed; `frontend-build` passes (map code 541 kB gzipped, unchanged by this step in size order).
- **Real browsers (live_look.mjs, London and Chennai, zoom 5 / 7 / 8, IFS and agreement, 12 views each):** Edge with the real GPU: live layer on in all 12, drawing 21-48 ms for a 734 x 560 picture (first run with Catmull-Rom 29-118 ms); Chromium with software rendering: all 12, 19-76 ms; no console or policy error in either. Pictures: `docs/evidence/edge/step9-3c-msedge-*.png`, `docs/evidence/step9-3c-chromium-*.png`.
- **Looked at:** the first picture (Catmull-Rom + clamp) was smooth but had straight rectangular cut-outs in the dry areas; replaced by PCHIP and looked at again: smooth dry areas and a realistic weather-map look at zoom 5 (UK-wide) and zoom 7 (London). The agreement is smooth with soft edges.
- **Not verified:** the user's own Firefox (speed and look); Firefox/WebKit in Docker have no WebGL (message path only); the scenarios for the live layer in `browser_checks.mjs` (step 9.3c-4); phones.

## User message after the live layer (2026-11-07 13:37 UTC)
- "Is there no open world map that we can use, store and use? Because those don't change and the remaining data we have" (a stored base map under the rain). Researched (official pages, AI estimates marked): Protomaps/OpenStreetMap planet file about 120 GB, extracts to zoom 6-7 estimated 0.2-0.5 GB (not stated by the page); Natural Earth II shaded relief 84.78 MB download; OpenFreeMap online (free, no key, no limits, third party). Asked the user to choose; the answer was "I don't want to spend money on this project so no credit based please" = D37 (nothing paid, no credit-metered services). The base-map choice is asked again with the misunderstanding about "credit" (attribution) cleared up.

## Step 9.3d-1 done-check results (run 2026-11-07 13:48 UTC; 19.49 h used)
Files: `config/basemap.toml` (new), `config/basemap_assets.lock.json` (new, 23 sha256), `config/pipeline.toml` (`[paths]` basemap_*), `pipeline/basemap.py` (new, 217 lines: checked tool download, asset lock and fetch, planet lookup, extract, measure), `tests/pipeline/test_basemap.py` (10 tests), `docker/compose.yaml` (service `basemap`). Code ladder: standard library + the already vetted `requests`; the one new executable is the pinned `pmtiles` release.
- **Tests:** Python 115 passed (105 + 10: git blob hash equals git's own, tool refused on a wrong sha256 and nothing written, only the exact named archive member accepted (a nested name, a `..` name and a missing one refused), failed download, newest existing world build (a missing day skipped, a 500 stops the run), extract command is a list built from config, the asset list follows the config, the lock refuses a file that does not match the commit's hash and writes nothing, assets verified against the lock (kept when right, replaced when damaged, refused when poisoned, nothing wrong stored), a lock for another commit or other files refused). The hygiene guard caught two literal names equal to config values (`"assets"`) and I renamed them.
- **Real run (Docker, network):** see the D38 gate results: 1.77 MB of assets, extracts 15.1 / 45.1 / 189.6 MB for zoom 0-5 / 6 / 7 in 13.6 / 12.1 / 21.3 s; the tool's `show` confirms valid complete world pyramids. First run failed because the project folder is read-only inside the container (lock file); fixed by writing a draft under `data/` and copying it by hand.
- **Recommendation (made):** zoom 0-7 (189.6 MB). **Not done in the gate:** pictures of the extracts (need the two packages, step 9.3d-2).

## Step 9.3d-2 done-check results (run 2026-11-07 14:02 UTC; 19.72 h used)
Files: `frontend/src/basemap.js` (new, style builder), `frontend/src/mapview.js` (base map instead of the outlines, rain below the first label layer), `frontend/vite.config.js` (base-map route, range requests), `docker/nginx.conf` + `docker/compose.yaml` (location and mount), `config/frontend.json` (`map.basemap`, `dev_basemap_dir`, colours), `config/basemap.toml` (all glyph ranges), `config/basemap_assets.lock.json` (773 files), `frontend/package.json` + lock (+2 packages, -2), `tests/frontend/basemap.test.mjs` (6 tests), `tests/hygiene/test_config_consistency.py` (+2), `frontend/tools/{browser_checks,screenshots}.mjs`; removed `outlines.js`, `geo.js` and its test. Time bar: "already over" and a Now button (D39).
- **Tests:** Node 70 passed (4 geo tests removed, 6 basemap tests added: every style address is same-origin; labels above the rain; only stored fonts; the language changes the style; our colours are real flavor fields and in the style; contrast at least 7 : 1 against the land, with the old defaults failing it); Python 117 passed; `frontend-build` passes (map code 310 kB gzipped); Chromium browser checks 9 of 9 (the map starts on the block under way; drag to a past block says so; Now returns).
- **Real browsers:** Edge with the real GPU and the user's own Firefox (their screenshot): the base map, the rain, the credit and the labels draw; after the user's remark the names and borders are bright (Edge screenshots `docs/evidence/edge/step9-3c-*.png`); range requests answered 206 by nginx; fonts and sprites 200; no outside host. Load times in D38 results.
- **Open:** the user's Firefox showed the time bar on the first block (not reproduced; D39); 9.3d-3 (fit the rain to the map); the user's verdict on the base map's look; Firefox timing of the live layer.

## Housekeeping review of all markdown files (run 2026-11-07 14:17 UTC; 19.98 h used; user request: "find all the stale .md and update them"; markdown only, no code or config changed)
Checked: README, PROBLEM, PLAN-001..010, PROGRESS, DECISIONS, ERRORS, SOURCES, DOMAIN, ENVIRONMENT, SECURITY (22 files). `docs/SUBMISSION.md` does not exist yet (step 12). The plan files and PROBLEM.md were not touched (rule).
Stale and fixed:
- **README:** status, folder layout, commands, test counts, browser table and credits described the plan-page stage (outline map, a spike page); rewritten for the current state: map, live layer, stored base map, the two outside services, nothing paid, what is not done.
- **PROGRESS (this file):** the time table had no commit after 00:43 on 2026-11-07 (17 rows added from `git log`, plus the 14:09 resume); step 9.3 still said "in progress"; the Current plan section repeated lines; Status said 25 commits and a spike page; Open items and Known issues spoke of spikes and a blank map page; the security checklist got two new items.
- **DECISIONS:** bets that now have a result are closed in a new section (D22, D23, D34, D35, D36, D38 and the size bets); the shortcut register was rebuilt from `grep` (the spike entries were gone).
- **ERRORS:** counters brought up to date (E007 wording, E026, E027, E031); a mislabelled "repeat" paragraph in E026 is corrected by a note (it was a guessed time, the E024 class).
- **SECURITY:** header and "what exists today" said there was no front end or hosting host list; the "could not check" lines for the front end, npm and the geocoder were out of date; a status summary of S01-S14 was added with what remains for steps 10 and 11.
- **SOURCES:** a summary of what the project uses now (the 13:41 section says "nothing installed yet"; it was installed at 14:02). **DOMAIN:** pointers where an earlier fact is superseded. **ENVIRONMENT:** the current state found by running commands.
Found but not changed: the plan-mode file in the Claude folder (`plans/groovy-waddling-octopus.md`) is a working copy of PLAN-010 and not a record.
Small slip of mine in this pass: my first README draft said the map shows its plain message in the Docker Firefox and WebKit; I had not run that since the map work, so the sentence now says only what is known.
Verification of this pass: `docker compose -f docker/compose.yaml run --rm tests` = 117 passed in 18.74 s (2026-11-07 14:18 UTC; the secret scan covers the docs); tracked root entries: .gitignore README.md backend config docker docs frontend pipeline pyproject.toml requirements.txt scripts tests (allowed); `git status` shows only the eight markdown files.

## User answers after the housekeeping (2026-11-07 14:20 UTC)
- The time bar showing Fri 6 Nov in their Firefox: they had moved the slider (D39 result). The live layer is fast in their Firefox (their words, not measured). Open items (2) and (3) of the list above are closed. Still waiting: the go for step 9.3d-3.
