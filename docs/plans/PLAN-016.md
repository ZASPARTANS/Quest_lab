# PLAN-016 — Bring every function under the 50-line rule, and keep it there (steps 16.0 to 16.6)

- Drafted: 2026-11-08 about 19:25 UTC in plan mode; written into this file 2026-11-08 19:34 UTC (`date -u` read right after the approval); session `3e56a452-e5f8-4bb9-b353-63bad43748f4`; first prompt 2026-11-06T18:19:13Z; deadline 2026-11-09T18:19:13Z; about 49 h used, about 23 h left
- Approval: **approved by the user through plan mode, 2026-11-08 19:34 UTC** (clock read right after the approval). The plan below is the approved text, unchanged except for these two header lines.
- **Replaces:** nothing. It is part of step 12 (the submission list item "line counts respect the code size limits") and does not touch PLAN-006 step 12's other sub-steps.

## Context
- **The rule** (the user's `CLAUDE.md`, "Code size, HARD LIMITS"): a function is at most 50 lines; a file at most 300.
- **What I found (a real parser, not a guess):** `rolldown`'s `parseAst`, already installed with Vite, measured every function (declarations, arrows, methods) in `frontend/src`, `frontend/tools`, `tests/frontend` and `vite.config.js` (61 files): **6 functions are over 50 lines**: `createMapView` 130 (`frontend/src/mapview.js`), `mapScenarios` 145 (`frontend/tools/map_scenarios.mjs`), `liveScenarios` 84 (`frontend/tools/live_scenarios.mjs`), `createLive` 71 (`frontend/src/maplive.js`), `createMapApp` 70 (`frontend/src/mapapp.js`), `serveFolder` 60 (`frontend/vite.config.js`, with its inner `configureServer` at 54 and 52). Python: none (AST). **Correction of my earlier records:** they said 7; the seventh, `smallTargets`, is 15 lines (my crude scan of 2026-11-08 counted wrongly). To be fixed in README, DECISIONS, PROGRESS and SUBMISSION.
- **Why now:** the submission checklist item cannot be ticked while the rule is broken and unmarked; 23 hours remain; the user was asked twice (refactor or list) and did not choose; the rule is theirs, so the default is to follow it. No new feature: behaviour must not change.
- **Intended outcome:** 0 functions over 50 lines (checked by a test that runs with the other tests), identical behaviour (all browser scenarios and phone checks still pass), the deviation removed from the README.

## Assumptions
- **A47:** the parser's line count (start to end of the function) is the same measure as "lines of the function" in the rule; comments inside a function count.
- **A48:** the splits below keep behaviour identical because they only move code between functions and files and pass shared state explicitly; the 32 browser scenarios (4 engines) and the phone checks cover the map, the live layer, the controls and the plan; the dev-server middleware (`serveFolder`) is not covered by them, so it gets a before/after request comparison.
- **A49:** `rolldown/parseAst` is available inside the `frontend-tests` container (`/node_modules`, the same image that builds the page); checked in 16.1.

## Steps (one at a time; tests, line counts and the root check before each commit; each step has a security note)

**16.0 Records.** `docs/plans/PLAN-016.md` (this text with the approval), PROGRESS rows 16.0-16.6, the correction 7 to 6 (README "Known limits", SUBMISSION line-count item, DECISIONS register, PROGRESS status; as an addition, not a rewrite of history).
DONE-CHECK: files exist; `git grep -n "seven JavaScript"` lists only places that say it was corrected.

**16.1 The rule enforced by tests (written first, red first).** `tests/frontend/function_sizes.test.mjs` parses every `.js` and `.mjs` of `frontend/src`, `frontend/tools`, `tests/frontend` and `frontend/vite.config.js` with `rolldown/parseAst` and fails with a list (file, line, name, lines) for any function over 50 lines; `tests/hygiene/test_function_sizes.py` does the same for every tracked `.py` with `ast`. `docker/compose.yaml` `frontend-tests` gets read-only mounts of `frontend/tools` and `frontend/vite.config.js`. A negative control: a deliberately long function in a temporary copy makes the test fail.
DONE-CHECK: the Node test fails and names exactly the 6 functions above (red); the Python test passes (none); the negative control fails as it should.
Security note: no new dependency (rolldown is already in the image); read-only mounts.

**16.2 The scenario factories (tools only, no page code).** `map_scenarios.mjs`: a small `mapTools(h)` for the shared helpers and four group functions (each at most 50 lines) combined by `mapScenarios(h)`; `live_scenarios.mjs`: `liveTools(h)` and three groups (live layer follows zoom/mode/model, tile fault, north-up) combined by `liveScenarios(h)`. Scenario names and bodies are unchanged.
DONE-CHECK: `browser-checks` in Chromium: the same 32 scenarios, all pass.
Security note: test code only.

**16.3 The live layer and the map app.** `maplive.js`: `createLive` keeps its small job (state, `draw`, `update`, `soon`); the picture-making moves to a top-level `pictureFor(...)` (returns the blob, the bounds, the time and size, or null) and `fieldOf` becomes top-level; `mapapp.js`: `whenText` becomes a pure function (`mapstate.js`, tested in Node) and `setPlace` moves to a new small module `mapplace.js` that receives `{ view, cfg, state, refresh }`.
DONE-CHECK: Node tests pass (incl. a new test for `whenText`: past block says "already over", zone and UTC labels); the 32 browser scenarios in Chromium pass; both functions at most 50 lines.
Security note: none (no new input, no new host).

**16.4 The map view.** `mapview.js` keeps `createMapView` (create the map, wire the events, merge the parts); two new modules: `maprain.js` (`setFrame`, `setLive`, `clearLive`: the pre-made and the live raster layers) and `mapmove.js` (`showPlace`, `fly`, `recentre`, `getView`: the marker and the moves); both take one context object `{ map, ready, state, container, manifest, mapCfg, belowLabels }` instead of closing over variables; `newMap(...)` and `reflect(...)` become top-level helpers. The returned API of `createMapView` stays exactly the same (`ready, setFrame, setMode, showPlace, fly, recentre, getView, setLive, clearLive, onMoveEnd, onceIdle`), so no caller changes.
DONE-CHECK: Node tests pass; **32 of 32 browser scenarios in Chromium, Firefox, WebKit and Edge (real GPU)**; phone checks pass (Pixel 7, iPhone 15); the Pixel 7 probe of 2026-11-08 gives the same landing zoom (7) and zoom limit (8); `createMapView` at most 50 lines, every new function at most 50.
Security note: none; the MapLibre options (north-up, no rotation, the base-map style) are moved, not changed; a diff review of the options object is part of the check.

**16.5 The dev-server middleware.** `vite.config.js`: `serveFolder` is split into top-level helpers `safeTarget(base, url)` (the path-traversal guard: 400 / 403 / 404), `byteRange(header, size)` (one range only, 206 / 416) and `sendFile(...)`; the middleware only calls them. Before and after, the same list of requests against the dev server (a file, a HEAD, `Range: bytes=0-9`, `bytes=-10`, `bytes=5-`, a bad range, `../` and an encoded `%2e%2e/` traversal, a missing file, a directory, a POST) must give identical statuses and headers (I run the dev server on this computer, which is how it is used).
DONE-CHECK: identical answers for every request in the list (table in PROGRESS); `vite build` still works; `serveFolder` and its inner functions at most 50 lines.
Security note: **the traversal guard is security code**: its behaviour is compared request by request, including the encoded traversal; nothing is relaxed.

**16.6 Final checks and records.** The new size tests pass (0 offenders); Python 175+ and Node 110+ pass; `frontend-check` 8x8; the browser scenarios in four engines and the phone checks once more on the final code; `frontend-build`, the Pages-like build and the smoke test of the local sub-folder site; line counts of every source file (largest at most 300). Records: DECISIONS (the deviation closed, the register rebuilt), README (the "deviation" sentence removed, counts), SUBMISSION (the item ticked with the command and result), PROGRESS, ERRORS if anything went wrong. Commit; push only after the user's go; then the live smoke test.
DONE-CHECK: all of the above, shown.
Security note: the push goes only to `ZASPARTANS/Quest_lab`.

## Critical files
Modify: `frontend/src/{mapview,maplive,mapapp,mapstate}.js`, `frontend/tools/{map_scenarios,live_scenarios}.mjs`, `frontend/vite.config.js`, `docker/compose.yaml` (two mounts), README and `docs/`. New: `frontend/src/{maprain,mapmove,mapplace}.js`, `tests/frontend/function_sizes.test.mjs`, `tests/hygiene/test_function_sizes.py`, `docs/plans/PLAN-016.md`. Reuse: `mapstate.js` helpers, `time.js` (`clock`, `dayKey`, `dayLabel`), `livedata.js`, `live.js`, the browser-check helpers (`open`, `mapState`, `assertLanded`, `shot`) and `phone_checks.mjs`.

## Time (estimates, not measurements)
16.0 0.2 h, 16.1 0.4 h, 16.2 0.4 h, 16.3 0.5 h, 16.4 0.7 h, 16.5 0.4 h, 16.6 0.6 h: about 3.2 h, so done around hour 52-53 if started now; no new features after hour 64 (2026-11-09 10:19 UTC); the last 8 hours stay for the README and submission. The 60 h warning is due 2026-11-09 06:19 UTC.

## Security note (this plan)
No new dependency, host, input or permission. The map code is moved, not changed; the dev-server path guard is compared request by request. The new tests read source files only. The push goes only to the user's own repository and only after the user's go.

## Verification (end to end)
The new size tests (red before, green after); Docker `tests` and `frontend-tests`; `frontend-check`; `browser-checks` in four engines (32 scenarios) and `phone_checks`; the before/after request table for the dev server; the Pages-like site and the live smoke test after the push.

## Not doing
Changing what the page does or looks like; refactoring anything that is within the rule; adding a linter or a new tool (the test is enough); touching the Python code (already within the rule).
