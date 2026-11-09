# Precipitation forecast app (ECMWF IFS + AIFS)

QUEST Lab application, Project 1: fetch precipitation forecasts from ECMWF Open Data (IFS and AIFS), process them, and deploy a public web app that presents the forecast through an innovative front end. The problem statement is in `docs/PROBLEM.md`.

**Live site: https://zaspartans.github.io/Quest_lab/** (GitHub Pages; repository https://github.com/ZASPARTANS/Quest_lab, public). Built in one 72-hour session with an AI coding assistant; everything it decided, got wrong and checked is recorded in `docs/` (see "Where to look" at the end), and `docs/SUBMISSION.md` is the checklist with the command and result of every check.

## What it is and how to use it
**What it is:** a rain forecast for the next 10 days at any place, turned into a plan: it picks the 6-hour times when the rain stays under the limit of what you want to do (laundry, a commute, a picnic, cricket, field work, a road trip, or your own limit). It uses two free forecasts from ECMWF, the European weather centre.
1. **Where:** press "Use my location", search for a town, or click the map.
2. **What:** choose what you want to do; each activity has its own rain limit ("Custom" lets you set it).
3. **Best times:** the page lists the blocks that stay under the limit; "Day by day" shows every block (tap one to see it on the map); the time bar on the map moves the rain map through the days.

**Which model to pick on the map:** IFS is ECMWF's main forecast (calculated from the physics of the atmosphere); AIFS is its machine-learning forecast (trained on past weather). "Both models (agreement)" shows where they agree (bright blue: both say rain; dim blue: only one does) and is the one to start with. The plan on the left always uses both and takes the wetter of the two. Where the page says "models differ", treat the forecast as less certain.

The same text opens as a guide on a first visit (a "What this page does" window with "Close" and "Don't show again"; the "How to use" button at the top opens it again). Added on 2026-11-09 after feedback that visitors did not know what the page was for (PLAN-017, D48).

## What works, and what does not (short version)
**Works (each part was run and checked, see "How it was verified"):**
- A scheduled and push-triggered pipeline (Docker, plain Python) that fetches the newest complete ECMWF IFS and AIFS run, converts it to 6-hour rain amounts, checks it against the raw GRIB files, exports static data and deploys it to GitHub Pages.
- A web app with **Plan-my-day** (place + activity -> best times, day tiles with a rain level per 6-hour block, rain totals as a range between two models), a **globe that flies to the place and flattens into a flat map** with the stored OpenStreetMap base map, IFS / AIFS / both-models views and a colour key, and an honesty strip (which run, how old, ECMWF's attribution, a plain warning when the run is older than 30 hours).
- Checked in Edge, Chromium, Firefox and WebKit (Docker), phone emulation, and by the user on real Android phones (Firefox, Chrome, Samsung Internet).

**Does not / limits (the full list is at the end):** the rain is on a 0.25-degree grid (about 28 km), so it cannot show street-level detail; the stored base map ends at zoom 7; IFS stops at 240 h; GitHub's scheduler skipped scheduled runs on 2026-11-08, so the forecast can be older than every 6 hours (pushes also refresh it); GitHub Pages sends no security headers except HSTS; behaviour for many simultaneous visitors on GitHub is untested; Safari on an iPhone and on a Mac both work by the user's word (no versions or measurements).

## What it does
- **The page:** on the left (about a quarter of the width; below the map on a phone) **Plan-my-day**: choose a place (device location, search, saved place, map click) and an activity; it shows the best times, **day tiles with the rain level of each 6-hour block** (No rain, Light, Moderate, Heavy; a day with nothing to report is one quiet row) and rain totals as a range between two models. On the right a **globe that flies to the chosen place and flattens into a flat map** (zoom 0.8 to 8), with an IFS / AIFS / both-models switch (in the both-models view bright blue means both models say rain, dim blue that only one does), a time bar, the stored base map under the rain, and a colour key. Above zoom 4.5 the browser draws the rain itself from the exact forecast values.
- **Rain levels are our own:** No rain under 0.5 mm, Light 0.5 to 3, Moderate 3 to 10, Heavy 10 mm or more, per 6-hour block (decision D41). There is no official standard for 6-hour blocks of a model grid; the page says so.
- **Honesty:** runs exist at 00z and 12z and appear about 7.5 hours late, so the run shown is normally 8 to 21 hours old and the page says which run it is. It is not an official weather warning.
- **How it stays fresh:** `.github/workflows/build.yml` runs on every push, by hand and on a 6-hourly schedule (02:20, 08:20, 14:20, 20:20 UTC): fetch, process and validate the newest run, export the site data, put it together with the page and the stored base map, deploy to Pages, then check the public site with `scripts/smoke_site.py` (page, forecast age, status file, a tile, the 190 MB map file by an HTTP range request). Of its 16 runs so far (2026-11-07 to 2026-11-09) 14 were green (5 to 7 minutes each; 9 by push, 4 by schedule, 1 by hand) and 2 failed: the very first one (Pages was not yet enabled) and one push build during a GitHub incident (E039). The workflow uses no secrets; its safety rules (only GitHub-owned actions pinned to a commit, least privilege, no pull-request trigger) are enforced by `scripts/check_workflow.py` and tests. The 190 MB map file is kept in the Actions cache between runs and is checked by size and sha256 either way (the download has 3 tries); the fonts and sprites are kept in this repository (`frontend/basemap_assets`), so a build fetches nothing from the Protomaps repository.

## Folder layout (decision D5 in `docs/DECISIONS.md`)
```
README.md            this file
config/              all settings (TOML/JSON), no code; secrets are never stored here
pipeline/            fetch ECMWF data and process it; the base-map downloader (Python)
backend/             builds the static data the page reads (tiles, map pictures, manifest, status) and the public site folder
frontend/            the web app (Vite): plan page, map, live rain layer, base map style; basemap_assets/ = the map's fonts and sprites (13 MB, 1029 files, checked against a lock file); tools/ = browser, phone and load checks
tests/               pipeline/ backend/ hygiene/ tooling/ (pytest), frontend/ (node --test)
scripts/             command-line entry points (validation, smoke test, load test, workflow rules, site assembly)
docker/              Dockerfiles, compose.yaml (all services), nginx configs of the two local test sites
docs/                plans, progress, decisions, errors, sources, domain notes, security, submission checklist, evidence
.github/workflows/   the scheduled build and deploy
data/                IGNORED by git: raw/ processed/ site/ (forecast), basemap/ (map file, fonts, tool), pages/ (assembled site), check/
```

## Data, services and credits
- **Forecast:** ECMWF Open Data, IFS and AIFS Single, total precipitation, CC BY 4.0 and the ECMWF Terms of Use. The page shows ECMWF's own wording for a service and says that the data was changed (6-hour amounts, two models compared, levels and maps). The wording was read from ECMWF's Terms of Use page on 2026-11-07 (`docs/SOURCES.md`).
- **Base map:** OpenStreetMap contributors (ODbL), as a Protomaps world extract to zoom 7 (190 MB), with Noto Sans fonts (SIL Open Font Licence) and the Protomaps sprites, all **stored with the site** (no outside request for the map). The 190 MB file is a GitHub Release asset (`basemap-v1`) that the build downloads and checks by size and sha256; it is not in git (the file limit is 100 MB).
- **Place search:** Open-Meteo geocoding (typed text and IP go there; location data from GeoNames). **Naming the device position:** BigDataCloud client-side reverse geocoding (position and IP go there). These are the only two outside hosts the page may contact (`config/headers.conf`). The credits are in the page footer.
- **Nothing in the project costs money** (decision D37): GitHub Pages and the Actions minutes of a public repository are free.
- Libraries and where each came from: `docs/SOURCES.md`; MapLibre GL JS 6.16.0, pmtiles 4.5.0, @protomaps/basemaps 5.7.2 (all BSD-3-Clause), Python packages pinned with hashes in `requirements.txt`.

## Run it (Docker, Linux containers; Windows host tested)
Prerequisites: Docker with Linux containers and internet access. The first run of each service builds its image from the files in the repository (a few minutes: it downloads the pinned base images and packages); a clean clone was run through this section in order on 2026-11-08 (about 23 minutes, `docs/SUBMISSION.md`). **On Linux** run `mkdir -p data` and `export APP_UID=$(id -u) APP_GID=$(id -g)` first, so the containers (which run as a normal user) can write to `data/`; on Windows Git Bash set `MSYS_NO_PATHCONV=1`. In the order below, each command needs the one before it.
Pipeline (the `fetch` and `basemap` services have network access; the others have none):
```
docker compose -f docker/compose.yaml run --rm fetch      # newest complete IFS + AIFS run into data/raw (about 60 MB)
docker compose -f docker/compose.yaml run --rm process    # data/processed/<run>/ (6 h mm blocks + agreement)
docker compose -f docker/compose.yaml run --rm process python -m scripts.validate_points   # compare with the raw GRIB at 8 places
docker compose -f docker/compose.yaml run --rm export     # data/site: tiles, map pictures, manifest, status.json (several minutes)
docker compose -f docker/compose.yaml run --rm export python -m scripts.validate_site       # tiles equal the processed data and the raw files
docker compose -f docker/compose.yaml run --rm basemap python -u -m pipeline.basemap fetch-release   # the stored base-map file from its release asset (size and sha256 checked; 3 tries; skipped when the file is already there and matches)
docker compose -f docker/compose.yaml run --rm export python -u -m pipeline.basemap install-assets   # fonts and sprites from frontend/basemap_assets, offline, every file checked against config/basemap_assets.lock.json
# maintainer only, to refresh those files from the Protomaps repository: ... run --rm basemap python -u -m pipeline.basemap fetch-assets, then copy data/basemap/assets to frontend/basemap_assets and commit
```
The page (local sites; both listen on this computer only):
```
docker compose -f docker/compose.yaml run --rm frontend-build                 # production build into frontend/dist
docker compose -f docker/compose.yaml up -d --force-recreate preview          # public-like site http://localhost:8080
cd frontend && npm ci --ignore-scripts && npm run dev                          # testing site http://localhost:5173 with a DEV badge
```
The site as GitHub Pages serves it (from a sub-folder, with no security headers: the policy comes from `<meta>` tags): build with `vite build --base=/Quest_lab/` into `data/pages/dist`, run `python -m scripts.assemble_site` in the `export` service, then `up -d preview preview-subpath` and open http://localhost:8081/Quest_lab/ (exact commands in the comment of `preview-subpath` in `docker/compose.yaml`). Restart the preview after every export and after any change of `config/headers.conf`. Settings are in `config/` (`pipeline.toml`, `backend.toml`, `basemap.toml`, `frontend.json`, `activities.json`, `headers.conf`).

**Every service runs as a normal user** with all Linux capabilities dropped and a read-only file system; only `data/` is writable (finding S03). The same compose files ran on the GitHub runner (Ubuntu) without change. The base images are pinned by digest (pulled 2026-11-06), so re-check them before relying on the project for long.

**Your own copy:** fork the repository, enable Pages with the source "GitHub Actions", create a release `basemap-v1` that holds `world.pmtiles` (made by `docker compose run --rm basemap python -m pipeline.basemap build`), and put its address, size and sha256 into `config/basemap.toml` `[release]`; the workflow then builds and deploys by itself (this is how this repository was set up; it was not tried on a second account).

## Tests and checks (the official way is Docker)
```
docker compose -f docker/compose.yaml run --rm tests            # Python: 178 passed; no network, project read-only
docker compose -f docker/compose.yaml run --rm frontend-tests   # Node: 121 passed
docker compose -f docker/compose.yaml run --rm process python -m scripts.plan_reference   # independent Python plan from the raw GRIB
docker compose -f docker/compose.yaml run --rm frontend-check   # the browser code on the real tiles equals it: 8 places x 8 activities
BROWSER_NAME=chromium docker compose -f docker/compose.yaml run --rm browser-checks   # 42 scenarios in a real engine (chromium | firefox | webkit); SCREENSHOT_BASE_URL points it at another site
docker compose -f docker/compose.yaml run --rm browser-checks node tools/phone_checks.mjs   # Pixel 7 and iPhone 15 emulation: overflow, 44 px tap targets, map cover, location flow
python scripts/smoke_site.py https://zaspartans.github.io/Quest_lab/   # the live site: page, forecast age, status, tile, range request
python scripts/check_workflow.py                                  # the workflow's safety rules
python scripts/load_test.py <site> --levels 1,5 --dry-run         # concurrent visitors replay (caps, stop rules; a site off this computer needs --approved)
```
Measurements with the computer's own GPU (Edge): `frontend/tools/load_timing.mjs`, `live_look.mjs`, `concurrent_visitors.mjs`; `design_shots.mjs` takes screenshots at four window widths. The Windows `.venv` (`py -3.11`) is for quick trying only; its result is not the proof.

## How it was verified
| What | How | Result |
|---|---|---|
| Rain amounts | `validate_points` and `validate_site` compare the processed and exported data with the raw GRIB files at 8 places across time zones; units are handled per model (AIFS is in mm, IFS in metres) | all match; 6-hour amounts carry up to about 0.24 mm of GRIB packing rounding (D14) |
| Plan logic | the page's own code on the real tiles against an independent Python version written from the same rules (`plan_reference`, `frontend-check`), 8 places x 8 activities | all match |
| Python and Node code | Docker tests (178 and 121) incl. a repo secret scan, config consistency, workflow rules, deliberate-breakage tests ("negative controls") for the checks added late | pass |
| Page in browsers | 42 scenarios (address, search, saved places, hostile input, base map, live layer, map flights, colour key, honesty strip, credits, rain levels, location, the first-visit guide) in Edge (real GPU), Chromium, Firefox and WebKit | 42 of 42 on the local test site; the 28 scenarios before the level scenarios also passed on the sub-folder test site; 26 of 26 on the live site on 2026-11-07 |
| Phones | Pixel 7 and iPhone 15 emulation (no sideways scroll, 44 px tap targets, map visible on the first screen, location flow); the user's own Android phones | emulation passes; Firefox, Chrome and Samsung Internet on Android "work and look good" (the user's words) |
| Live site | `smoke_site.py` after every deploy; a fresh request for page, manifest, status and headers; the public map file against the local checked file by size and four sampled ranges | pass (`docs/SUBMISSION.md`) |
| Concurrency | replay of 1 to 100 visitors and 5 to 20 real browsers on this computer; 1 to 3 visitors on the live site (about 21 MB) | every answer correct; local numbers describe this machine, not GitHub |
| Security | an audit with fixes (`docs/SECURITY.md`), `pip-audit` and `npm audit` (no known vulnerabilities), secret scans of the tree, every commit and the session log | no real secret found |

## What leaves the browser (privacy)
Typed place searches (to Open-Meteo), and the device position (to BigDataCloud) when "Use my location" is used, each with the visitor's IP address. No cookies, no analytics. Saved places and settings stay in the browser (`localStorage`). GitHub itself sees the visitors' requests for the site's files, like any host.

## Browser support
There is **no GPU on the server side** (static hosting serves files only); the map is drawn by the **visitor's own browser with WebGL2**. Without WebGL2 the map area shows a plain message and the plan still works.

| Browser | Where | Result |
|---|---|---|
| Android phones: Firefox, Chrome, Samsung Internet | the user's own phones, the live site | work and look good (the user's words, 2026-11-08; no measurements) |
| Firefox | the user's own PC | the base map, the rain, the credit line and the device place name drew (user's screenshots, 2026-11-07) |
| Microsoft Edge | the developer's Windows PC, real GPU | 42 of 42 scenarios (local test site); 26 of 26 earlier on the live site; 20 real Edge browsers at once finished correctly on the local site (slowly) |
| Chromium 158, WebKit 27 (the engine of Safari, not Safari), Firefox 159 | Docker, software WebGL | 42 of 42 on the local test site; Firefox in Docker has no WebGL2, so its map scenarios return early there |
| Safari on an iPhone | the user's own iPhone, the live site | **works** (the user's words, 2026-11-08: "iphone works"; the model and iOS version were not given; no measurements) |
| Safari on a Mac | the user's own Mac, the live site | **works** (the user's words, 2026-11-09: "Mac works"; the Safari and macOS versions were not given; no measurements; it is not stated whether this was before or after the guide was added) |

## Known limits and shortcuts (full list: `docs/PROGRESS.md` and the shortcut register in `docs/DECISIONS.md`)
**Every `shortcut:` marker in the code (3, in 2 files):** (1) `pipeline/process.py`: IFS has 3-hourly steps to 144 h but only 6-hourly blocks are used (D14); (2) `pipeline/process.py`: tiny negative differences from GRIB packing are set to zero, at most about 0.06 % of the rain mass (D14); (3) `frontend/src/app.js`: a place found by the device or by a map click has no known time zone, so the device's zone is used and labelled (D24, D30). A fourth marker, in `config/headers.conf`, was stale and was removed on 2026-11-08 (the converter it announced exists).
**Code size rule:** no function is longer than 50 lines and no file longer than 300; this is enforced by tests (`tests/frontend/function_sizes.test.mjs` with a real parser, `tests/hygiene/test_function_sizes.py`). Six JavaScript functions were over the limit until 2026-11-08 and were split in PLAN-016 (D47); `tests/pipeline/test_basemap.py` is exactly 300 lines and `frontend/src/app.js` 300.
**Data and map:** IFS stops at 240 h although it has files to 360 h (D12, E007); a lone one-cell peak looks lighter on the smoothed pictures (D34); the rain levels use our own cut-offs (D41); the stored base map ends at zoom 7 and the map may be zoomed one level further (maximum 8), after that only enlarged shapes would show (D38, D46).
**Hosting:** GitHub Pages sends no security headers except HSTS, so `nosniff`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` and `frame-ancestors` are lost and the rest of the policy is in `<meta>` tags (D42); Pages caches for 10 minutes; GitHub's scheduler ran the 6-hourly job only twice in the first 19 hours of 2026-11-08 (at 09:10 and 18:53 UTC instead of 02:20, 08:20 and 14:20), and I did not look up why; a first visit loads 2.7 to 4.7 MB.
**Not tested:** many simultaneous visitors on GitHub (only 1 to 3 were sent, about 21 MB in total, with no 403, 429 or 5xx; D43); a visitor on a Mac with Safari (the iPhone check was done by the user, without measurements); a Linux desktop. **Estimate, not a test:** at about 3.7 MB per first visit the soft Pages limit of 100 GB per month would allow roughly 27,000 first visits a month (repeat visits cost less), fewer if GitHub throttles earlier.
**Owner tasks after the submission:** the scheduled workflow keeps running every 6 hours until the owner disables it (Actions tab).

## Where to look
`docs/PROGRESS.md` (status, steps, results of every step), `docs/DECISIONS.md` (D1 to D46: what was chosen, by whom, alternatives, bets and their results, the shortcut register), `docs/ERRORS.md` (E001 to E040: every error and wrong assumption with counters), `docs/SECURITY.md` (findings S01 to S16), `docs/SOURCES.md` (every source opened, with dates and licences), `docs/DOMAIN.md` (facts about the data), `docs/ENVIRONMENT.md`, `docs/plans/` (PLAN-001 to PLAN-015, approved plans are never edited), `docs/SUBMISSION.md` (the checklist with commands and results), `docs/evidence/` (screenshots, recorded visits, test outputs).
