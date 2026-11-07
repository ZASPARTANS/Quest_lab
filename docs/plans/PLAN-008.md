# PLAN-008 — Sharper rain pictures (step 9.3b); the rest of PLAN-007 stays

- Drafted: 2026-11-07 11:07 UTC (`date -u` read while drafting)
- Session: `3e56a452-e5f8-4bb9-b353-63bad43748f4`; first prompt 2026-11-06T18:19:13Z; deadline 2026-11-09T18:19:13Z; about 16.8 h used, about 55.2 h left
- Approval: **approved by the user through plan mode, 2026-11-07 12:11 UTC** (written into this file at that time, clock read by the script).
- **Replaces:** PLAN-007 assumption A17 and adds a step 9.3b between 9.3 and 9.4. PLAN-007 steps 9.4 (browser checks, real GPU, records) and 9.5 (design pass) stay exactly as written. Steps 1-8, 9.1, 9.2 and 9.3 part 1 (commit `4f2c67e`) are done.

## Context (why this plan exists)
- **User feedback, 2026-11-07 ~11:05 UTC (with a screenshot of the globe in their real Edge):** "if you use the image it does not look good at all. we need to update the image quality as well." The screenshot shows hard, square blocks of colour all over the globe.
- **My planning mistake (ERRORS E027):** PLAN-007 assumed (A17) that the existing 720 x 720 frames were enough. They are not. Cause, measured from the files: 720 pixels over 360 degrees is 0.5 degree per pixel, but the forecast grid is 0.25 degree, and the browser magnifies the picture with `raster-resampling: nearest`, so each pixel becomes a visible square (at the fly-in zoom each is about 25 screen pixels wide). I had seen this in step 9.1 and filed it under "design pass" instead of questioning A17.
- **Intended outcome:** rain that looks like a proper weather map: smooth contours at every zoom, no blocks, from the same real data, without changing any number the plan uses (the plan reads the point tiles, not the pictures).

## Facts found before planning (read-only, this session)
- `backend/export.py` `write_frames`: for each model and block it calls `frames.resample` (the maximum of the covered grid cells, E023) at `frames.size` = 720 px, then `colourise` with the stepped colour scale; the agreement frames resample the stored agreement codes the same way. Current frames: 140 files, **8.2 MB** in total, e.g. IFS +24 h 78.6 kB, agreement +24 h 36.6 kB (the whole site is 36 MB, tiles 28 MB).
- MapLibre GL JS 6.16 has `raster-resampling` = `linear` or `nearest` only. It has **no** `raster-color` ramp (checked in the installed typings), so colours must stay in the picture. `nearest` is what we use now.
- The data grid is 1440 x 721 (0.25 degree). A Web Mercator picture of 2048 px width has 0.176 degree per pixel at the equator and finer degrees per pixel towards the poles, so every pixel is an up-sampling of the grid: no cell can vanish (the E023 danger only exists when shrinking).

## Assumptions
- **A19:** interpolating the stored values smoothly between grid cell centres (bilinear) before colouring is a fair way to draw a field that the model computes on a grid; it changes only the look between cell centres. The plan, the windows and the totals keep reading the exact cell values from the tiles. The page will say in one plain line that the map is smoothed between grid points.
- **A20 (to be measured, gate Q1):** a frame at 1440-2048 px stays within about 300 kB per file and the whole export stays far below the host limits (GitHub Pages 1 GB, Cloudflare Pages 20,000 files and 25 MiB per file; file count does not change).
- **A21:** the agreement can be drawn per pixel from the two interpolated stored values with the same rule as the plan (a pixel is wet when `rint(value) >= wet_limit`, D28); this keeps the map and the plan on one rule and gives smooth agreement edges.

## Steps (one at a time; Docker tests, line counts and root check before every commit; every step has a security note)

**9.3b-1 Gate Q1: measure and look (decision gate, visual and size).** Prototype script on the real 2026-11-06 12z run (no change to the repo's code paths): IFS +24 h and the agreement of the same block in four ways: (a) today's 720 px nearest picture, (b) 720 px with `raster-resampling: linear`, (c) 1440 px bilinear + linear, (d) 2048 px bilinear + linear. For each: PNG size, time to make, and a screenshot of the globe and of the zoom-4.5 flat map (Chromium in Docker, and the developer's Edge with the real GPU). Also measure whether the 50 m Natural Earth coastlines from the already installed `world-atlas` package (`land-50m`, `countries-50m`) are worth their weight (JS chunk size) at zoom 4.5.
DONE-CHECK: a table of sizes and times and the screenshots in `docs/evidence/`; the choice and the reason in DECISIONS; if the chosen option would make any frame larger than about 400 kB or the export larger than about 100 MB, STOP and show the user the numbers before building. The 50 m outlines are shown to the user with their cost; they are adopted only if the user agrees.
Security note: the prototype reads local files only and writes into git-ignored `data/`.

**9.3b-2 Build the sharper frames.** `backend/frames.py`: a bilinear up-sampling of a field to the Mercator picture (wrap at the date line, no overshoot beyond the neighbouring values, poles beyond the Mercator limit not drawn); the old max-pool `resample` stays for sizes below the grid width. `backend/export.py` `write_frames`: models from the stored values (`stored -> interpolated -> mm -> colour`), agreement per pixel from the two interpolated models (A21, rule `wet_limit` from `pipeline/process.py`). `config/backend.toml` `frames.size` set to the chosen size (the frame `max_latitude`, colours and file names stay). Front end: `raster-resampling` set from config (`config/frontend.json` `map`), not hardcoded; the page gets one plain line "the map is smoothed between forecast grid points; the plan uses the exact values".
DONE-CHECK: Docker `tests` pass with new tests: the pixel at a grid cell centre equals that cell's value; the date-line seam is continuous; values never leave the range of their neighbours; orientation (north at the top, longitude of a column in the right pixel); a single wet cell is still visible; the agreement of two flat fields is exact; colour scale edges unchanged. Real export re-run (Docker, no network), `scripts/validate_site.py` still clean (tiles untouched), `frontend-check` still 8 x 8, size and time recorded, the preview restarted after the export (E029).
Security note: the manifest still validates frame paths and steps in the browser; larger images are limited by the existing path and step checks, and the browser refuses nothing new; no new host.

**9.3b-3 Look and confirm.** Screenshots of the globe and of the zoom-4.5 flat map for IFS, AIFS and the agreement, in Chromium (Docker) and in Edge (real GPU, load-time tool re-run to see the cost of larger images); the user looks at http://localhost:8080 and says whether it looks right now. Records: PROGRESS, DECISIONS (the Q1 choice), E027 closed with the result, DOMAIN (pixel size, interpolation), SOURCES if 50 m outlines are adopted; commit.
DONE-CHECK: the screenshots show no square blocks at zoom 4.5; load time of the first frame recorded; the user's verdict recorded (the real check).
Security note: none beyond the above.

(PLAN-007 steps 9.4 and 9.5 follow unchanged: browser checks in three engines and real GPU incl. the map scenarios; then the design pass.)

## Critical files
Modify: `backend/frames.py`, `backend/export.py`, `config/backend.toml`, `config/frontend.json`, `frontend/src/mapview.js`, `frontend/index.html` (one line), `tests/backend/test_frames.py`, `tests/backend/test_manifest_export.py`. New: a throwaway prototype script (removed after the gate), screenshots in `docs/evidence/`. Reuse: `frames.colourise`, `frames.colourise_agreement`, `frames.write_png`, `pipeline/process.py` `wet_limit` and `dequantise`, the Mercator row/column maths already in `frames.resample`, `frontend/tools/load_timing.mjs`, `frontend/tools/screenshots.mjs`, `scripts/validate_site.py`.

## Time (estimates, not measurements)
Now 16.8 h. 9.3b-1 about 1 h, 9.3b-2 about 1.5 h (plus about 10 minutes of export), 9.3b-3 about 0.5 h: about 3 h, so about hour 20. Then PLAN-007 steps 9.4 (about 1.5 h) and 9.5 (about 4 h): the map and design work ends around hour 26-27. The **24 h warning (2026-11-07 18:19 UTC) falls during 9.5**; the last 8 hours stay reserved; no new features after hour 64.

## Records to write after approval (before 9.3b-1)
`docs/plans/PLAN-008.md` (this text with date, time and approval), PROGRESS (current plan, step rows 9.3b-1..3, PLAN-007 "A17 superseded; 9.4 and 9.5 remain"), E027 stays open until the fix is verified.

## Security note (this plan)
Frames are still same-origin images checked by the manifest's path and step rules; the export has no network; nothing personal is involved. Larger images raise the bytes a visitor downloads (about one frame per view); the measured size is part of the gate.

## Verification (end to end)
Docker `tests` (pytest incl. the new frame tests), `frontend-tests`, `frontend-check`, `scripts/validate_site.py`, `frontend-build`; screenshots in Chromium and Edge compared before/after at the same view; load-time tool in Edge; the user's own look at the page.

## Not doing
Vector contours, a new colour scale, a shader/colour-ramp in the browser (not available in MapLibre 6.16), tiling the frames (only if the gate shows a size problem), changing any number the plan computes.
