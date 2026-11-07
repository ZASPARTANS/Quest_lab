# PLAN-007 — Globe-first map on the home page, then a design pass (replaces PLAN-006 step 9; steps 10-12 unchanged)

- Drafted: 2026-11-07, after the checkpoint commit at 00:43 UTC and before the user's reply at about 10:40 UTC. The body below says "~00:55" and "~01:00"; those were my estimates, the clock was not read (see the time correction). Written into this file: 2026-11-07 10:41 UTC (`date -u`).
- Session: `3e56a452-e5f8-4bb9-b353-63bad43748f4`; first prompt 2026-11-06T18:19:13Z; deadline 2026-11-09T18:19:13Z; about 6.6 h used
- Approval: **approved by the user through plan mode, 2026-11-07 about 10:41 UTC** (after one change: the layout clarification "the current design ... 1/4th of the page ... the remaining 3/4th will have this globe [which includes 3d to 2d switching after location use]", already included in the text below).
- **Time correction (written at approval, `date -u` = 10:41 UTC):** the body below says "about 6.6 h used". That was a guess. The real elapsed time at approval was **16.4 h** (first prompt 2026-11-06 18:19:13 UTC), **55.6 h remaining**. The user was away for about ten hours between the checkpoint (00:43 UTC) and the approval. The estimates in the section "Time" below therefore shift by +9.8 h: the plan should end around hour 27-28 (about 2026-11-07 21:00-22:00 UTC) and the **24 h warning (2026-11-07 18:19 UTC) falls during step 9**. See ERRORS E024 (seen 3).
- **Replaces:** PLAN-006 step 9 ("Map and globe as supporting views"); adds a design-pass step 9b. PLAN-006 steps 10-12 (provenance, hosting, README/submission) stay as written. Steps 1-8 are done.

## Context
- **User feedback after trying the step 8 page (2026-11-07 ~00:40 UTC):** the plan "gives the answer that we need but it should also look good", and "why did you remove the 2D and 3D view?" (the map had been demoted to two spike links; E026).
- **User decision (go, ~00:50 UTC):** "map first then the design pass". Design request, in the user's words: *the 3D map is shown first; once the user uses the location it moves to that location and then shows it in 2D; all the options that exist now stay.* This settles proposal D29.
- **Layout (user's clarification, ~01:00 UTC):** ONE page, split in two: the **current design (the plan: place, activities, windows, day cards, totals, saved places) takes about 1/4 of the width as a left panel**, and the **globe/map takes the remaining 3/4** (full height of the window). Map tools (Flat/Globe, model switch, time control, legend) float on the map. On a narrow screen (phone) the two stack: map on top, plan below.
- **What the visitor gets (the design request, made concrete):**
  1. The home page opens with the **globe** (3D) in the large right area, showing the rain of the block that is under way, with coastlines and borders.
  2. When a place is chosen from outside the map (device location, search, saved place, page address) the globe **flies to the place and then settles into the flat 2D map** centred there; a marker shows the place. With "reduce motion" set in the system the view jumps instead of flying.
  3. Everything from step 8 stays: place search, "Use my location", activity buttons, best windows, day cards, rain totals, saved places, the honesty lines. The plan still works with no map at all.
  4. Map tools: **Flat / Globe** switch (keeps place and time), **model switch IFS / AIFS / Both (agreement)**, **time control** (previous / next block and a slider over all blocks), legend, **click the map to choose a place**. Day-card blocks are buttons: clicking one shows that block on the map.
  5. No WebGL2: the map area shows a plain message ("The map needs WebGL2, which this browser does not provide. The plan below works without it.") and the controls are hidden.

## Assumptions (stated before building on them)
- **A15 (verified in this session's reading, unverified at run time):** MapLibre GL JS 6.16 accepts the projection as a zoom expression (style spec example `['interpolate', ['linear'], ['zoom'], ..., 'vertical-perspective', ..., 'mercator']`) and `setProjection({type})` works at run time (tested in the step 6 spike: view and layer kept). Whether the smooth morph looks right is decided by a short spike (step 9.1).
- **A16:** a place picked by map click has no known time zone; it uses the device's zone, labelled in the page and named "Map point (lat, lon)" (decision A8 / D24 shortcut already approved; the geocoder has no reverse lookup, so no coordinates are sent anywhere). Searching the place gives the exact zone.
- **A17:** the existing 720x720 Mercator frames are enough for globe and flat (verified in step 6/7: image source works on both; poles beyond 85.05 degrees are not drawn, D22).
- **A18:** the map chunk (about 330 kB gzip) is loaded after the plan text is on screen, so the plan appears as fast as today.
- Defaults (change in config, not code): start model **IFS** (amounts in mm), start block = first block not over, start view = globe over the whole earth, fly-in zoom about 4.5, flight about 2.5 s.

## Steps (one at a time; Docker tests, line counts and root check before every commit; every step has a security note)

**9.1 Spike gate: fly-in and flatten (decision gate, visual).** In the existing spike page (throwaway) try (A) `flyTo` on the globe then `setProjection({type:'mercator'})` at the end, and (B) a zoom-driven projection expression morph. Screenshots of both mid-flight and at the end (Chromium Docker software WebGL; host Edge with the real GPU). Choose the one that looks right; (A) is the fallback.
DONE-CHECK: screenshots of A and B in `docs/evidence/`, the choice and the reason written in DECISIONS; place and zoom after the flight equal the target within 0.01 degrees (read from the map in the test page).
Security note: spike only, no outside requests.

**9.2 Data contract and pure helpers.** `backend/manifest.py` + `backend/export.py`: put the agreement colours (from `config/backend.toml`) into `manifest.frames` (single source, no copy in the front end), update `manifest.validate` and tests, re-export. `frontend/src/manifest.js`: validate `frames` (paths from a safe pattern, no `..`, steps match the models). New `frontend/src/mapstate.js` (pure): block -> frame step, frame URL with the export version, which frame kind to show for model + block (beyond the IFS range "Both" shows AIFS and says so; IFS is unavailable there), when to fly and flatten (place from outside the map: yes; map click: no), WebGL2 detection (injectable canvas), reduced-motion decision.
DONE-CHECK: Docker `tests` and `frontend-tests` pass with new tests (hostile frame paths, steps 6..360, beyond-IFS cases, agreement colours present, fly rules); real manifest re-exported and `scripts/validate_site.py` still clean.
Security note: frame paths are untrusted input like tile paths; no new host.

**9.3 Map module, controls, wiring.** `frontend/src/mapview.js` (MapLibre wrapper, loaded with a dynamic `import()` after the plan renders; worker via the existing `?url` + `setWorkerUrl`; image source for the frame; outlines from `src/outlines.js`; marker from DOM elements; no global objects; state exposed only as `data-` attributes for tests), `frontend/src/mapcontrols.js` (toolbar, legend, time slider floating on the map), `index.html` + `style.css` layout (wide screens: left panel about 25 % of the width with its own scrolling, minimum about 22 rem, and the map filling the other 75 % at full window height; narrow screens: map on top, plan below). The step 8 plan blocks are re-flowed for the narrow panel (one day card per row, the four blocks of a day in a compact row), no change to their logic or text. `app.js` wiring (place events -> fly/flatten, day-card blocks -> block, map click -> place). Remove the spike: `frontend/spikes/`, the `spike` and `build_pages` spike entry in `config/frontend.json`, the spike pages in the screenshot list, `window.__map`; update compose mounts. Attribution text on the map comes from the manifest source fields (the final wording is checked at step 10).
DONE-CHECK: `frontend-build` passes (chunk sizes printed: plan chunk and map chunk); all Node and Python tests pass; line counts under the limits.
Security note: no third-party tiles, fonts or scripts; CSP unchanged (blob worker already allowed); the only outside host stays the geocoder; map-click coordinates go through `cleanCoordinates`; marker and labels use DOM text only.

**9.4 Browser checks, real GPU, records.** Add scenarios to `frontend/tools/browser_checks.mjs`: globe at start; address place -> ends flat (`data-projection="mercator"`) centred on the place; Flat/Globe switch keeps place and block; day-card block click changes the frame; model switch changes the frame kind; map click sets a "Map point" place; no-WebGL message (forced in all engines, and for real in Firefox-in-Docker); reduced motion jumps; no outside host except the geocoder; no console or policy errors. Engines: Chromium (software WebGL), Firefox and WebKit (expect the message path where there is no WebGL), plus one run in the developer's Edge with the real GPU (screenshots). Update README, PROGRESS, DECISIONS (D29 decided, plus the 9.1 choice), SECURITY, DOMAIN, ERRORS; checkpoint commit.
DONE-CHECK: `browser-checks` pass in the three engines (including a check that on a 1280 px wide window the left panel is about a quarter of the width and the map the rest, and that on a 390 px window they stack); Edge screenshots of globe, mid-flight and flat; the user looks at it on localhost:8080 in their Firefox and says whether the map draws (the real check for D23); the preview is left running.
Security note: re-run the hostile-input scenarios with the map present.

**9.5 Design pass (the user's "it should also look good").** Uses the frontend-design skill. First a short written direction (palette, type scale, layout, the day-card timeline idea, icons drawn as inline SVG, no external fonts because `font-src 'self'`), then build, then screenshots at 390 (stacked), 768 and 1280 and 1920 px wide (the 1/4 + 3/4 split) for the user to look at; at most two rounds of the user's feedback. Colour is never the only signal (words and hatching stay); keyboard focus visible; contrast of every text/background pair computed by a Node test; `prefers-reduced-motion` respected.
DONE-CHECK: contrast test passes (WCAG AA); browser checks still pass; screenshots shown to the user and the user's verdict recorded.
Security note: no new dependency or host; only CSS, SVG and markup changes.

## Critical files
Modify: `frontend/index.html`, `frontend/src/{app,render,style,manifest}.js|css`, `backend/{manifest,export}.py`, `config/frontend.json`, `docker/compose.yaml`, `frontend/tools/{browser_checks,screenshots}.mjs`, `tests/backend/*`, `tests/frontend/*`. New: `frontend/src/{mapview,mapcontrols,mapstate}.js`, `tests/frontend/mapstate.test.mjs`. Delete: `frontend/spikes/*`. Reuse: `frontend/src/outlines.js` + `geo.js` (coastlines/borders), `places.js` `cleanCoordinates`, `tiles.js` `tileUrl` pattern for the frame URL version, `frontend/tools/browser_checks.mjs` helpers, the existing `?url` + `setWorkerUrl` worker setup from the spike.

## Time (elapsed hours; estimates, not measurements)
Now about 6.6 h. 9.1 about 1 h, 9.2 about 1 h, 9.3 about 3 h, 9.4 about 1.5 h, 9.5 about 4 h: about 10-11 h, so this plan ends around hour 17-18. The 24 h warning (2026-11-07 18:19 UTC) falls after it. Steps 10-12 then follow as planned; the last 8 hours stay reserved; no new features after hour 64.

## Records to write after approval (before 9.1)
`docs/plans/PLAN-007.md` (this text with date, time and approval), D29 marked decided by the user (with the design request quoted), D30 for A16, PROGRESS (current plan, step table 9.1-9.5, PLAN-006 "step 9 superseded"), ERRORS only if a planning gap shows up.

## Security note (this plan)
Everything stays same-origin except the geocoder. Frames and tiles are untrusted input (paths validated, sizes limited). The device position is never written into the address or sent anywhere; map clicks are not reverse-geocoded. No new package; MapLibre stays pinned (6.16.0, `npm audit` clean at step 6; re-run before the final commit under the standing approval).

## Verification (end to end)
Docker: `tests`, `frontend-tests`, `frontend-check`, `frontend-build` pass; `browser-checks` in chromium, firefox, webkit; Edge with the real GPU for the globe and the fly-in; both local sites (5173 with the DEV badge, 8080 public-like) show the same page; screenshots reviewed by the user; the user's own Firefox confirms the map draws.

## Not doing
Reverse geocoding, third-party map tiles, sound, animation between blocks, a different map library, a new colour scale, external fonts.
