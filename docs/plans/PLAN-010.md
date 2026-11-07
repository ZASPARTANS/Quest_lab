# PLAN-010 — A stored vector base map under the rain (steps 9.3d-1 to 9.3d-4)

- Drafted: 2026-11-07 13:39 UTC (`date -u` read while drafting)
- Session: `3e56a452-e5f8-4bb9-b353-63bad43748f4`; first prompt 2026-11-06T18:19:13Z; deadline 2026-11-09T18:19:13Z; about 19.3 h used, about 52.7 h left
- Approval: **approved by the user through plan mode, 2026-11-07 13:41 UTC** (written into this file at that time, clock read by the script).
- **Replaces:** D22's base map of "outlines only" (the user asked for a real stored base map). Adds steps 9.3d-1 to 9.3d-4 after PLAN-009 step 9.3c-3. PLAN-009 step 9.3c-4 and PLAN-007 steps 9.4 and 9.5 stay as written and follow this plan (the design pass 9.5 will style the map, not build it).

## Context (why this plan exists)
- **User, 2026-11-07 ~13:30 UTC:** "Is there no open world map that we can use, store and use? Because those don't change and the remaining data we have right?" After the options were researched and shown they chose **"Stored vector map, measure first"**, said "I don't want to spend money on this project so no credit based" (D37: nothing paid, no credit-metered services; the attribution line for OpenStreetMap is free and is kept) and confirmed that giving credit to the data owner is fine.
- **What is wrong now:** the map is a dark navy background with white coast and border lines (Natural Earth outlines, D22). It has no place names, roads or terrain, so a person cannot tell where they are looking; the user finds it unattractive.
- **Intended outcome:** a real world base map (land and water, roads, towns, labels, a dark style that suits the rain) **stored and served from our own site**: no outside request, no cost, no accounts. The rain layers stay on top, place labels stay above the rain.

## Facts found before planning (official pages and real requests, 2026-11-07)
- **Source:** Protomaps basemap, built from OpenStreetMap; "an Open Database License (ODbL) Produced Work"; "OpenStreetMap attribution required". Daily planet files at `https://build.protomaps.com/YYYYMMDD.pmtiles` (today's `20261107.pmtiles`: 139,356,959,640 bytes, about 139 GB, `Accept-Ranges: bytes`, checked with a headers-only request). The docs say "URLs may change" and advise copying the tileset to your own storage.
- **Extraction:** the `pmtiles extract` command (a single Go binary, or the Docker image `protomaps/go-pmtiles`) can read a REMOTE file and write a smaller one; "Extracting a full sub-pyramid from 0 to `maxzoom` is always an efficient operation" with minimal requests to the source. Each extra zoom level roughly doubles the size (page text). **The size of a z0-z6 or z0-z7 extract is NOT stated anywhere: my estimate (about 0.2-0.5 GB) is the doubling rule applied to 120 GB; it is measured in step 9.3d-1 before anything else.**
- **Browser side:** npm `pmtiles` 4.5.0 (BSD-3-Clause, one dependency `fflate`) registers a `pmtiles://` protocol with MapLibre; npm `@protomaps/basemaps` 5.7.2 (BSD-3-Clause, no dependencies) provides the style layers with named flavors including **dark** and a `lang` option. The style also needs **glyph (font) files and sprites**, which Protomaps publishes in the `basemaps-assets` repository (ZIP downloads); they must be stored too (no outside request). Counts and sizes of those files are not stated on the pages: measured in 9.3d-1.
- **Hosting consequence:** a single PMTiles file of hundreds of MB works with HTTP range requests on the local nginx and on GitHub Pages (1 GB site limit); **Cloudflare Pages (25 MiB per file) cannot host it**. This narrows the free host choice at step 11 to GitHub Pages (Netlify is already out by D37).

## Assumptions
- **A25:** a world extract to zoom 6 or 7 is a size we can store and serve (target: at most about 400 MB for the base map so that the whole site stays well under GitHub Pages' 1 GB). Decided by measurement in 9.3d-1; if it does not fit the plan stops and the user decides (lower zoom, a region, or the shaded-relief picture).
- **A26:** vector tiles past their last zoom level stay crisp when the map zooms further (MapLibre overzooms vector tiles), so a z6/z7 extract is usable up to the map's zoom limit; town and road detail is limited by the extract's zoom.
- **A27:** the base-map file is rebuilt rarely (OpenStreetMap changes slowly), by a separate command, not by the forecast job; the public build keeps a copy of the stored file (how is decided at step 11: the free GitHub Actions cache or a release asset; not in git, not downloaded from Protomaps at every deploy).
- **A28:** the existing outline lines (`outlines.js`, `world-atlas`, `topojson-client`) become unnecessary: the base map contains coastlines and borders. Removing them also removes about 200 kB gzipped from the map code.

## Steps (one at a time; Docker tests, line counts and root check before every commit; every step has a security note)

**9.3d-1 Gate: measure and show the user (decision gate).** A `basemap` Docker service (network allowed, like `fetch`; non-root, read-only, only `data/` writable) runs the pinned `pmtiles` release (version and sha256 recorded in `config/security.toml`, found on the official GitHub releases page) to extract from the newest `build.protomaps.com` daily file with `--maxzoom` 4, 5, 6 and 7 into git-ignored `data/basemap/`. Also fetch the `basemaps-assets` ZIP at a pinned tag (sha256 checked) and count and size the files for the dark sprite and the fonts the dark flavor uses (Latin ranges only, English labels). Everything about paths, zoom and URLs in `config/pipeline.toml` `[paths]` and a new `config/basemap.toml` (D17), never in code. A screenshot of the map with each extract.
DONE-CHECK: a table of real sizes and times for z4-z7 and for the assets; screenshots; the recommendation. **STOP and show the user the numbers before building the rest**; if the recommended extract is above about 400 MB or the download is unreasonable, ask the user (A25).
Security note: downloads go to a new, empty, git-ignored folder; the binary and the assets are checked by sha256 before use; nothing from the download is executed except the pinned `pmtiles` binary in the hardened container; the pages and file contents are data, never instructions.

**9.3d-2 Serve and style.** `docker/nginx.conf`: serve `/data/basemap/` from a read-only mount with range requests, long cache for the versioned file name, and the same security headers (include `headers.conf` in the location, E-lesson of D33). `frontend/package.json`: add `pmtiles` and `@protomaps/basemaps` at exact versions (vetted on the npm registry first, recorded in `docs/SOURCES.md`; `npm audit` run under the standing approval, lock file only). `frontend/src/mapview.js`: register the protocol, use the stored file as the style source, the dark flavor, English labels, self-hosted glyphs and sprite; the rain layers (pre-made picture and live picture) are inserted **below the first label layer**, so labels stay readable above the rain; the attribution control shows "© OpenStreetMap contributors, Protomaps" from config; remove `outlines.js`, `geo.js` use, `world-atlas` and `topojson-client`. `config/frontend.json` `map.basemap` (file name, assets path, flavor, language, attribution text). The map keeps working without the base map (a missing file shows the dark background as today, with a console note for developers).
DONE-CHECK: `frontend-build`; unit tests for the style-building helper (layer order: labels above rain; unknown file -> safe fallback); real browsers (Edge with the real GPU, Chromium in Docker): the page draws, labels and roads visible at zoom 4, 7, 8, no console or policy error, no outside host, the first visit weight printed; the `data/` mount check (E029 lesson).
Security note: same-origin only (no CSP change except nothing new: `connect-src 'self'` already covers the file; workers and `blob:` already allowed); two new packages vetted; the style and the tiles are data from our own folder.

**9.3d-3 Fit the rain to the map.** Look at the rain over the base map at several zooms and places (London, Chennai, a coast, a mountain area): adjust the rain opacity and the soft edge so labels and coasts stay legible; check that the legend colours still read on the lighter land; decide the first globe view's look. Settings in config only.
DONE-CHECK: screenshots in Edge and Chromium for IFS and the agreement at zoom 3, 5, 7; the user's look in their Firefox.
Security note: none new.

**9.3d-4 Records and checks.** Add browser-check scenarios (base map loads from our own site, labels above rain, the map still works when the base-map file is missing); README, SOURCES (Protomaps, OpenStreetMap, the two packages, the assets, licences and the attribution wording), SECURITY, DECISIONS (new D38 with the measured sizes), PROGRESS, ENVIRONMENT; the hosting requirement (GitHub Pages, range requests, the stored file kept outside git) written for step 11; commit.
DONE-CHECK: all browser scenarios pass; line counts; the user's verdict recorded.

(PLAN-009 step 9.3c-4 and PLAN-007 steps 9.4 and 9.5 follow unchanged.)

## Critical files
Modify: `frontend/src/mapview.js`, `frontend/src/mapapp.js` (attribution text from config), `frontend/package.json` + lock, `docker/compose.yaml` (service `basemap`; preview mount), `docker/nginx.conf`, `config/frontend.json`, `config/pipeline.toml` (`[paths]` basemap folder and file), `config/security.toml` (pinned binary and assets with sha256). New: `config/basemap.toml`, `pipeline/basemap.py` (fetch + verify + extract driver, standard library + `requests` already vetted), `tests/pipeline/test_basemap.py`, `tests/frontend/basemap.test.mjs`. Delete after 9.3d-2: `frontend/src/outlines.js`; `geo.js` and its test only if nothing else uses them. Reuse: the fetch conventions of `pipeline/fetch.py` (timeouts, strict sessions), `scripts/pin_hashes.py` ideas for sha256 checks, `docker/compose.yaml` hardening block, `pipeline/paths.py`.

## Time (estimates, not measurements)
Now 19.3 h. 9.3d-1 about 1.5 h (plus downloads), 9.3d-2 about 2.5 h, 9.3d-3 about 1 h, 9.3d-4 about 1 h: about 6 h, so about hour 25-26. Then PLAN-009 step 9.3c-4 (about 1 h), PLAN-007 steps 9.4 (about 1 h) and 9.5 (about 4 h): the map and design work ends around hour 32-33. The **24 h warning (2026-11-07 18:19 UTC) falls during this plan**; steps 10-12 follow; the last 8 hours stay reserved; no new features after hour 64.

## Records to write after approval (before 9.3d-1)
`docs/plans/PLAN-010.md` (this text with the approval time read from the clock), DECISIONS D38 started (the user's choice and D37), PROGRESS (current plan, rows 9.3d-1..4, D22 base map superseded), SOURCES (the pages read today).

## Security note (this plan)
Everything is stored and served from our own site: no new outside host and no visitor data to a third party. The download at build time comes from a public, read-only bucket and from the project's GitHub releases, each checked by sha256 and kept out of git. New code in the browser is the two vetted libraries (BSD-3-Clause), pinned and lock-filed. The hardened container runs the pinned binary without root, capabilities or write access outside `data/`.

## Verification (end to end)
Docker `tests`, `frontend-tests`, `frontend-build`, the new `basemap` service run; real browsers: Edge (real GPU) and Chromium; screenshots of the map at zoom 3, 5, 7 and 8 with rain and agreement; a request log showing only our own host; `npm audit` clean; the user's own look at http://localhost:8080.

## Not doing
Paid or credit-metered map services, OpenFreeMap or any online tiles, satellite imagery, a base map for a single region only (D4: global), 3D terrain, labels in other languages (English only for now), any change to the forecast numbers.
