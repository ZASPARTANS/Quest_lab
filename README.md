# Precipitation forecast app (ECMWF IFS + AIFS)

QUEST Lab application, Project 1: fetch precipitation forecasts from ECMWF Open Data (IFS and AIFS), process them, and deploy a public web app that presents the forecast through an innovative front end. The problem statement is in `docs/PROBLEM.md`; the plans in `docs/plans/`; the live status in `docs/PROGRESS.md`; decisions, errors, sources, domain facts, environment and security notes in the other files of `docs/`.

**Status (housekeeping 2026-11-07 ~14:15 UTC): work in progress, not deployed.** Nothing is pushed and no remote exists; hosting is plan step 11. What runs today on this computer:
- **Data pipeline (Docker, no GPU, plain Python):** download the newest complete IFS and AIFS run, process it to 6-hour millimetre blocks with the agreement of the two models, validate against the raw files, export static point tiles, map pictures and a manifest.
- **The page** (http://localhost:8080 once the preview is running): on the left (about a quarter of the width) **Plan-my-day**: choose a place (device location, search, saved place, map click) and an activity; it shows the best dry windows, day cards with both models' blocks, and rain totals as a range. On the right (about three quarters) a **globe that flies to the chosen place and flattens into a flat map**, with IFS / AIFS / both-models switch, a time bar (Now button), My place button, and a stored **OpenStreetMap base map** under the rain. Zoomed out the rain is a smooth pre-made picture; from zoom 4.5 the browser draws the rain itself at screen sharpness from the exact forecast values. The plan part works without WebGL.
- **Not done yet:** the design pass (step 9.5), the out-of-date warning and the attribution wording (step 10), hosting and the scheduled deploy (step 11), this README's final form and `docs/SUBMISSION.md` (step 12), the three-engine check of the final page (steps 9.3c-4 and 9.4). Safari and phones are untested (user decision: later). The README will be rewritten at the end to say what works, what does not, how to run it and what was verified.

## Folder layout (decision D5 in `docs/DECISIONS.md`)

```
README.md            this file
config/              all settings (TOML/JSON), no code; secrets are never stored here
pipeline/            fetch ECMWF data and process it; the base-map downloader (Python)
backend/             builds the static data the front end reads (tiles, map pictures, manifest)
frontend/            the web app (Vite): plan page, map, live rain layer, base map style; tools/ = browser checks and measurements
tests/               pipeline/ backend/ hygiene/ tooling/ (pytest), frontend/ (node --test)
scripts/             thin command-line entry points (validation, fixtures, hashes)
docker/              Dockerfiles, compose.yaml (all services), nginx.conf of the preview
docs/                plans, progress, decisions, errors, sources, domain notes, security, evidence (screenshots)
.github/workflows/   scheduled build and deploy: not created yet (step 11)
data/                IGNORED by git: raw/ processed/ site/ (forecast), basemap/ (map file, fonts, tool), check/
```

## Data, services and credits
- **Forecast:** ECMWF Open Data, IFS and AIFS Single, total precipitation. CC BY 4.0 and the ECMWF Terms of Use. The exact attribution wording will be verified on the official terms page and shown in the page (step 10).
- **Base map:** OpenStreetMap contributors (ODbL), as a Protomaps world extract to zoom 7 (190 MB), with Noto Sans fonts (SIL Open Font Licence) and the Protomaps sprites, all **stored with the site** (no outside request for the map). The credit "(c) OpenStreetMap contributors, Protomaps" is on the map.
- **Place search:** Open-Meteo geocoding (typed text and IP go there; credit requested, CC BY 4.0). **Naming the device position:** BigDataCloud client-side reverse geocoding (position and IP go there). The page says both in plain words. These are the only two outside hosts the page may contact (`config/headers.conf`); nothing else leaves the browser (location, saved places and settings stay in it).
- **Nothing in the project costs money** (decision D37): no paid service, no credit-metered hosting.
- Libraries and where each came from: `docs/SOURCES.md`; MapLibre GL JS 6.16.0, pmtiles 4.5.0, @protomaps/basemaps 5.7.2 (all BSD-3-Clause), Python packages pinned with hashes in `requirements.txt`.

## Run it (Docker, Linux containers; Windows host tested)
Pipeline (the `fetch` and `basemap` services have network access; the others have none):
```
docker compose -f docker/compose.yaml run --rm fetch      # newest complete IFS + AIFS run into data/raw (about 62 MB)
docker compose -f docker/compose.yaml run --rm process    # data/processed/<run>/ (6 h mm blocks + agreement)
docker compose -f docker/compose.yaml run --rm process python -m scripts.validate_points   # compare with the raw GRIB at 8 places
docker compose -f docker/compose.yaml run --rm export     # data/site: tiles, map pictures, manifest (about 70 MB, several minutes)
docker compose -f docker/compose.yaml run --rm export python -m scripts.validate_site       # tiles equal the processed data and the raw files
docker compose -f docker/compose.yaml run --rm basemap python -u -m pipeline.basemap build  # the stored base map (data/basemap/world.pmtiles, once)
docker compose -f docker/compose.yaml run --rm basemap python -u -m pipeline.basemap fetch-assets   # fonts and sprites, checked against config/basemap_assets.lock.json
```
The page (two local sites, decision D19):
```
docker compose -f docker/compose.yaml run --rm frontend-build                 # production build into frontend/dist
docker compose -f docker/compose.yaml up -d --force-recreate preview          # public-like site http://localhost:8080 (stop: ... down)
cd frontend && npm ci --ignore-scripts && npm run dev                          # testing site http://localhost:5173 with a DEV badge
```
Restart the preview after every export and after any change of `config/headers.conf` (the container reads them at start). Both sites listen on this computer only. Settings are in `config/` (`pipeline.toml`, `backend.toml`, `basemap.toml`, `frontend.json`, `activities.json`, `headers.conf`).

**Every service runs as a normal user** with all Linux capabilities dropped and a read-only file system; only `data/` is writable (finding S03). On Linux set `APP_UID`/`APP_GID` and create `data/` first (not tested: no Linux host here). The base images are pinned by digest, so re-check them before relying on the project for long.

## Tests and checks (the official way is Docker)
```
docker compose -f docker/compose.yaml run --rm tests            # Python: 117 passed (14:02 UTC); no network, project read-only
docker compose -f docker/compose.yaml run --rm frontend-tests   # Node: 70 passed
docker compose -f docker/compose.yaml run --rm process python -m scripts.plan_reference   # independent Python plan from the raw GRIB
docker compose -f docker/compose.yaml run --rm frontend-check   # the browser code on the real tiles equals it: 8 places x 8 activities
BROWSER_NAME=chromium docker compose -f docker/compose.yaml run --rm browser-checks   # 22 scenarios in a real engine (chromium | firefox | webkit)
docker compose -f docker/compose.yaml run --rm screenshots      # real browser: screenshots, console and policy errors, hosts contacted
```
Measurements in a real browser with the computer's own GPU (Edge): `frontend/tools/load_timing.mjs` and `frontend/tools/live_look.mjs` (usage in each file). The Windows `.venv` (`py -3.11`) is for quick trying only; its result is not the proof.

## What leaves the browser (privacy)
Typed place searches (to Open-Meteo), and the device position (to BigDataCloud) when "Use my location" is used, each with the visitor's IP address. No cookies, no analytics. Saved places and settings stay in the browser (`localStorage`).

## Browser support and what was tested
There is **no GPU on the server side** (free static hosting serves files only); the map is drawn by the **visitor's own browser with WebGL2**, which normal PCs, laptops and phones have through their built-in graphics. Without WebGL2 the map area shows a plain message and the plan still works.

| Browser | Where | Result |
|---|---|---|
| Firefox | the user's own PC | the base map, the rain (live layer too), the credit line and the device place name draw (user's screenshots, 2026-11-07); speed not measured |
| Microsoft Edge | the developer's Windows PC, real GPU | all checks and measurements run here (browser checks 15 of 15 at 15:46 UTC, live layer 21-65 ms per drawing, load times, real Open-Meteo and BigDataCloud calls) |
| Chromium 158 | Docker, software WebGL | browser checks 15 of 15 (15:42 UTC): the plan page, the base map from our own site (range requests), the map still working when its file is missing, the live rain layer (on at close zoom, off on the globe and zoomed out, falls back when a tile fails), north-up map, a place chosen before the forecast list has loaded |
| WebKit 27 (the engine of Safari, not Safari) | Docker | 15 of 15 (4 runs in a row at 15:38 UTC); WebGL2 works there, and the map, the base map (206 range requests) and the live layer were measured on a page that stays put. Two scenarios ignore the errors WebKit reports for requests that a second page load cancels (limit written in the tool) |
| Firefox 159 | Docker | 15 of 15 (15:42 UTC) but the container has no WebGL2 for Firefox (environment limit), so the map scenarios return early there and the map shows its plain message; the user's own Firefox draws the map (see above) |
| Safari, phones | | **not tested yet** (user decision: later) |

## Known limits (full list: `docs/PROGRESS.md` and the shortcut register in `docs/DECISIONS.md`)
IFS 3-hourly detail is not used (6-hour blocks, D14); tiny negative differences from GRIB packing are set to zero (D14, at most about 0.06 % of the rain mass); IFS stops at 240 h (D12); the plan uses a device time zone for a place found by the device or the map (D24, D30); a lone one-cell peak looks lighter on the smoothed map (D34); the first visit loads 1.5-4.3 MB; the security headers exist as one copy for the local preview (converter for the public host at step 11); no out-of-date warning yet (step 10).
