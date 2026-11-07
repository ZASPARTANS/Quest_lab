# PLAN-009 — Rain drawn in the browser at screen sharpness; a close fly-in; the place name fixed (steps 9.3c-0 to 9.3c-4)

- Drafted: 2026-11-07 13:09 UTC (`date -u` read while drafting)
- Session: `3e56a452-e5f8-4bb9-b353-63bad43748f4`; first prompt 2026-11-06T18:19:13Z; deadline 2026-11-09T18:19:13Z; about 18.8 h used, about 53.2 h left
- Approval: **approved by the user through plan mode, 2026-11-07 13:12 UTC** (written into this file at that time, clock read by the script).
- **Replaces:** PLAN-008 assumption A19 ("smooth up-sampling of a 1440 px picture is enough at every zoom") and step 9.3b-3. Steps 9.3b-1 and 9.3b-2 stay done. PLAN-007 steps 9.4 (browser checks in three engines, real GPU) and 9.5 (design pass) stay as written and follow this plan.

## Context (why this plan exists)
- **User feedback, 2026-11-07 ~13:05 UTC (their own Firefox, with a screenshot):** "when i zoom in it still is showing in blocks not smooth"; "the 2d (flat) is not working, because when i use the location it has to be accurate and zoom to that location"; "do u think people will like it? NOPE they will not". The screenshot also shows the map drawing in their Firefox, the name box still saying "Your location", and the marker off-centre.
- **What I checked before planning (read-only/measured today, ERRORS E030 and E031):**
  1. At city zoom (7) in Edge with the real GPU: the rain picture is smooth but blurry with stair-stepped dry edges; the agreement picture is a hard-edged 3-class picture and shows blocks. One 0.25 degree cell (about 28 km) is about 45 screen pixels wide at zoom 7; **no pre-made picture can look sharp at that magnification**.
  2. The fly-in ends at zoom 4.5 (regional). The user then scroll-zooms by hand, which zooms around the mouse and moves the marker off-centre; that is why the place did not look "accurate".
  3. A real call to the reverse geocoder: `api.bigdatacloud.net` answers `307` to `api-bdc.io`, which my security policy blocks, so the name never appears (my tests used a mock). The redirect target works and returns CORS `*`.
  4. The default time-bar block is correct in Edge (`ifs_30`); the user's screenshot at Fri 6 Nov 12:00-18:00 is not reproduced (they probably moved the slider).
- **Intended outcome:** when a person looks at their place, the rain is smooth and sharp at any zoom, accurate to the model's own cell values; "Use my location" lands close on the place and names it; the pre-made pictures remain for the globe and the wide view.

## Design (what is built, in plain words)
- **Browser-side drawing ("live layer")** for the flat map from a configured zoom (about 4.5) upwards: for the part of the world on screen, the browser reads the **exact cell values from the point tiles it already uses for the plan** (about 7 kB per 4 degree tile, a handful to a few dozen tiles, cached), interpolates them smoothly between cell centres (bicubic, clamped so it never overshoots) at screen resolution, and colours each pixel with a **continuous colour ramp** (no bands) with a soft edge where rain starts. The picture is handed to MapLibre as an image source and redrawn when the view, model or block changes. While it is being drawn, the pre-made picture stays visible (no gaps).
- **Agreement** is drawn the same way: each model's value becomes a soft "wet" strength around the plan's threshold; blue = both wet, orange = they disagree, strength = opacity; edges are smooth instead of blocky.
- **Honest limit:** the forecast cells are 0.25 degree; the live layer shows the models' own values smoothly between cell centres and creates no detail that the models do not have. At cell centres it equals the stored value exactly (tested).
- **Fly-in:** by source: device location zoom 8 (about 300 km across), search / saved place / address zoom 7; a click on the map recentres only. A "My place" button on the map flies back to the chosen place. Rotation and tilt are switched off (they only confuse a weather map).
- **Not chosen:** a WebGL shader layer (faster but a lot more code), vector contour tiles (server work and size), bigger pre-made pictures (4096 px frames would be several MB each), 50 m outlines changes (already done).

## Assumptions
- **A22:** the browser can interpolate and colour a half-resolution viewport (about 500 x 350 pixels, each stretched to 2 screen pixels) in well under 150 ms in the user's Firefox and in Edge. To be measured in 9.3c-3; if too slow the pixel count is reduced (config), not the method.
- **A23:** the tiles needed for the view stay below about 150 per render at the live zoom limit (4.5: about 8 x 5 = 40 tiles, about 280 kB, cached after the first view); above the limit the pre-made picture is used.
- **A24:** MapLibre 6.16's image source (`updateImage` with a blob URL, same-origin, `img-src blob:` already allowed) switches pictures without flicker when the new picture is loaded before the old is hidden; to be checked in the real browsers.

## Steps (one at a time; Docker tests, line counts and root check before every commit; every step has a security note)

**9.3c-0 Quick fixes the user saw.** (a) `config/frontend.json` `reverse_geocoder.url` -> `https://api-bdc.io/data/reverse-geocode-client`; `config/headers.conf` connect-src host the same; the config-consistency test keeps them equal; privacy line still names BigDataCloud. (b) `frontend/src/reverse.js` `parseReverse`: local name, city, region, and the country CODE when the country name is long (London: "City of Westminster, London, England, GB"). (c) `frontend/src/mapstate.js` `flightPlan(reduced, cfg, source)` with `fly.zoom_by_source` in config; `max_zoom` 10; `frontend/src/mapview.js`: rotation and tilt off (`dragRotate: false`, `maxPitch: 0`, touch rotation off); a "My place" button (in `mapcontrols.js`) that flies back to the chosen place. (d) tests for all of it, and ONE real call to the reverse geocoder from a real browser (Chromium Docker and Edge) with a public test coordinate, recorded.
DONE-CHECK: Docker `tests` and `frontend-tests` pass; the real-browser run shows the name in the box; the fly-in ends at zoom 8 on the place within 0.01 degrees (read from `data-zoom`/`data-center`); screenshots.
Security note: the host in the policy is replaced, not added (still two outside hosts); a test fails if the policy and the config differ.

**9.3c-1 The drawing core (pure functions, tested).** New `frontend/src/live.js`: bicubic (Catmull-Rom) sampling of a cell-value accessor with clamping to the neighbouring range, Mercator pixel -> latitude/longitude, a continuous colour look-up table from the colour stops in `config/frontend.json` (log scale, soft edge from `fade_from_mm`), and the soft agreement. Settings (soft width, ramp resolution, canvas scale) in `config/frontend.json` `map.live`.
DONE-CHECK: Node tests: at a cell centre the picture value equals the stored value exactly; a linear ramp is reproduced; no value outside the range of its neighbours; the date-line wrap; north at the top and the Mercator rows at the right latitudes (compared with Python numbers from `scripts/make_js_fixtures.py`); colour table edges equal the stops; agreement strength is 0 for dry-dry, 1 for wet-wet, split for one wet; mutation checks as in earlier steps.
Security note: pure functions, no I/O.

**9.3c-2 The data window.** New `frontend/src/livedata.js`: which tiles cover the visible bounds (`tiles.js` `locate`/`tileUrl`), fetch and decode them with the existing size-limited reader and cache (`decodeTile`, the page's tile cache), a value accessor for one layer (model + block, via the manifest's `layer_offset` and steps), a limit on tiles per render, a stale-render guard.
DONE-CHECK: Node tests with the Python-made fixture tiles (cell values equal Python's); a view crossing a tile edge; too many tiles -> "use the picture"; failed tile -> clean fallback.
Security note: tiles stay untrusted (the existing header, length and size checks apply); no new host.

**9.3c-3 Map integration.** `frontend/src/mapview.js`: a second image layer (the live picture) below the outlines, shown only in the flat view above the live zoom; updated after `moveend` (debounced), model, block and place changes; the pre-made picture stays until the new live picture has loaded; blob URLs are revoked. `frontend/src/mapapp.js`: connects view changes to `livedata` + `live`; shows a small "sharpening..." state in `data-` attributes for tests. The legend, attribution and time bar are unchanged; the page's smoothing line is updated.
DONE-CHECK: `frontend-build`; in Edge (real GPU) and Chromium (software) the render time per view is measured and printed (target under 150 ms), screenshots at zoom 5, 7 and 8 of London and Chennai for IFS, AIFS and the agreement; no console or policy error; the user's Firefox look.
Security note: blob URLs of our own canvas only; `img-src blob:` is already in the policy.

**9.3c-4 Browser checks and records.** Add scenarios to `frontend/tools/browser_checks.mjs` (live layer on at close zoom, off when zoomed out and in globe mode, falls back when a tile fails, My place button, rotation off), run in the three engines (Firefox and WebKit in Docker have no WebGL, so they test the message path; Edge and Chromium test the map), Edge screenshots, load timing; PROGRESS, DECISIONS (D32 corrected, new D35), E027/E030/E031 results, README, SECURITY; commit. The user looks at http://localhost:8080 in their Firefox.
DONE-CHECK: all browser scenarios pass; the user's verdict recorded.

(PLAN-007 steps 9.4 and 9.5 follow unchanged. Step 9.4's map scenarios are partly done here; what is left of it is the three-engine run with the final page and the real-GPU run.)

## Critical files
Modify: `frontend/src/{mapview,mapapp,mapcontrols,mapstate,reverse}.js`, `config/frontend.json`, `config/headers.conf`, `frontend/index.html` (one line), `tests/frontend/*`, `tests/hygiene/test_config_consistency.py`, `frontend/tools/browser_checks.mjs`. New: `frontend/src/live.js`, `frontend/src/livedata.js`, `tests/frontend/live.test.mjs`. Reuse: `tiles.js` (`locate`, `tileUrl`, `decodeTile`, size-limited gunzip), `data.js` (`bufferGetter`, `maxTileBytes`), `mapstate.js` (`chooseFrame`, `frameStep`), the colour scale and `fade_from_mm` idea from `backend/frames.py`, `scripts/make_js_fixtures.py` (Python answers for the tests), `frontend/tools/{browser_checks,screenshots,load_timing}.mjs`.

## Time (estimates, not measurements)
Now 18.8 h. 9.3c-0 about 0.75 h, 9.3c-1 about 1.5 h, 9.3c-2 about 1 h, 9.3c-3 about 2 h, 9.3c-4 about 1.5 h: about 7 h, so about hour 26. Then PLAN-007 steps 9.4 (about 1 h left) and 9.5 (about 4 h): the map and design work ends around hour 31. The **24 h warning (2026-11-07 18:19 UTC) falls during this plan**; steps 10-12 follow as planned; the last 8 hours stay reserved; no new features after hour 64.

## Records to write after approval (before 9.3c-0)
`docs/plans/PLAN-009.md` (this text with the approval time read from the clock), PROGRESS (current plan, rows 9.3c-0..4, PLAN-008 "A19 superseded, 9.3b-3 failed the user's look"), E031 and E030 stay open until their fixes are verified.

## Security note (this plan)
The tiles are the same untrusted files the plan already reads (header, length and size checks, size-limited gunzip). The live picture is made from them in memory and shown through a blob URL of our own, revoked after use. Two outside hosts remain (the geocoder and the reverse geocoder, whose host is replaced by its final one). No personal data is added. Zooming in fetches more small tiles: capped per render and cached.

## Verification (end to end)
Docker `tests`, `frontend-tests`, `frontend-check`, `frontend-build`; Node tests against Python-made fixtures; real browsers: Edge with the real GPU (render times, screenshots at zoom 5/7/8), Chromium in Docker, and the user's own Firefox; the real reverse-geocoder call once; the user's verdict on the look at city zoom.

## Not doing
WebGL shader layer, contour/vector tiles, more or bigger pre-made pictures, reverse geocoding for map clicks (D32), changing any number the plan computes.
