# Precipitation forecast app (ECMWF IFS + AIFS)

QUEST Lab application, Project 1: fetch precipitation forecasts from ECMWF Open Data (IFS and AIFS), process them, and deploy a public web app that presents the forecast through an innovative front end. The problem statement is in `docs/PROBLEM.md`; the plans in `docs/plans/`; the live status in `docs/PROGRESS.md`; decisions, errors, sources, domain facts, environment and security notes in the other files of `docs/`.

**Live site: https://zaspartans.github.io/Quest_lab/** (GitHub Pages; repository https://github.com/ZASPARTANS/Quest_lab). **Status 2026-11-08 ~00:50 UTC: deployed; work still in progress.** Not done yet: the design pass of the rest of the page, the final form of this README and `docs/SUBMISSION.md` (step 12), and the proof that the unattended refresh works (its first scheduled run is 2026-11-08 02:20 UTC).

## What it does
- **The page:** on the left (about a quarter of the width; below the map on a phone) **Plan-my-day**: choose a place (device location, search, saved place, map click) and an activity; it shows the best times, **day tiles with the rain level of each 6-hour block** (No rain, Light, Moderate, Heavy), and rain totals as a range between two models. On the right a **globe that flies to the chosen place and flattens into a flat map**, with an IFS / AIFS / both-models switch (in the both-models view bright blue means both models say rain, dim blue that only one does), a time bar, a stored **OpenStreetMap base map** under the rain, and a colour key. Above zoom 4.5 the browser draws the rain itself from the exact forecast values.
- **Rain levels are our own:** No rain under 0.5 mm, Light 0.5 to 3, Moderate 3 to 10, Heavy 10 mm or more, per 6-hour block (decision D41). There is no official standard for 6-hour blocks of a model grid; the page says so.
- **Honesty:** the top of the page says which ECMWF run it shows and how old it is, repeats ECMWF's required attribution, and warns in plain words when the run is more than 30 hours old. Runs exist at 00z and 12z and appear about 7.5 hours late, so the run shown is normally 8 to 21 hours old. It is not an official weather warning.
- **How it stays fresh:** the workflow `.github/workflows/build.yml` runs every 6 hours (02:20, 08:20, 14:20, 20:20 UTC), on every push and by hand: fetch the newest complete ECMWF IFS and AIFS run, process and validate it, export the site data, put it together with the page and the stored base map, deploy to Pages, then check the public site with `scripts/smoke_site.py` (page, forecast age, status file, a tile, the 190 MB map file by an HTTP range request). It ran green three times on 2026-11-07 (about 7 minutes each, started by push and by hand). The workflow uses no secrets; its safety rules are enforced by `scripts/check_workflow.py` and tests. The 190 MB map file is kept in the GitHub Actions cache between runs (the next step still checks its size and sha256, and downloads it again, with 3 tries, if it is missing or wrong); the fonts and sprites are kept in this repository (`frontend/basemap_assets`), so a build fetches nothing from the Protomaps repository. Checked on 2026-11-08: the second run restored the cache in 3 seconds. This did not make the build faster (the download takes about 3 seconds when GitHub is healthy); the point is that a GitHub timeout like that of 2026-11-08 (E039) no longer stops a build when the cache has the file.
- **Data pipeline (Docker, no GPU, plain Python):** the same commands run on this computer and on the GitHub runner.

## Folder layout (decision D5 in `docs/DECISIONS.md`)
```
README.md            this file
config/              all settings (TOML/JSON), no code; secrets are never stored here
pipeline/            fetch ECMWF data and process it; the base-map downloader (Python)
backend/             builds the static data the page reads (tiles, map pictures, manifest, status) and the public site folder
frontend/            the web app (Vite): plan page, map, live rain layer, base map style; tools/ = browser, phone and load checks
tests/               pipeline/ backend/ hygiene/ tooling/ (pytest), frontend/ (node --test)
scripts/             command-line entry points (validation, smoke test, load test, workflow rules, site assembly)
docker/              Dockerfiles, compose.yaml (all services), nginx configs of the two local test sites
docs/                plans, progress, decisions, errors, sources, domain notes, security, evidence (screenshots, recorded visits, test outputs)
.github/workflows/   the scheduled build and deploy
data/                IGNORED by git: raw/ processed/ site/ (forecast), basemap/ (map file, fonts, tool), pages/ (assembled site), check/
```

## Data, services and credits
- **Forecast:** ECMWF Open Data, IFS and AIFS Single, total precipitation, CC BY 4.0 and the ECMWF Terms of Use. The page shows ECMWF's own wording for a service ("This service is based on data and products of the European Centre for Medium-Range Weather Forecasts (ECMWF)", the licence line, the disclaimer) and says that the data was changed (6-hour amounts, two models compared, levels and maps). The wording was read from ECMWF's Terms of Use page on 2026-11-07 (`docs/SOURCES.md`).
- **Base map:** OpenStreetMap contributors (ODbL), as a Protomaps world extract to zoom 7 (190 MB), with Noto Sans fonts (SIL Open Font Licence) and the Protomaps sprites, all **stored with the site** (no outside request for the map). The 190 MB file is a GitHub Release asset (`basemap-v1`) that the build downloads and checks by size and sha256; it is not in git.
- **Place search:** Open-Meteo geocoding (typed text and IP go there; linked next to the search as its licence asks; location data from GeoNames). **Naming the device position:** BigDataCloud client-side reverse geocoding (position and IP go there). These are the only two outside hosts the page may contact (`config/headers.conf`). The credits are in the page footer.
- **Nothing in the project costs money** (decision D37): GitHub Pages and the Actions minutes of a public repository are free.
- Libraries and where each came from: `docs/SOURCES.md`; MapLibre GL JS 6.16.0, pmtiles 4.5.0, @protomaps/basemaps 5.7.2 (all BSD-3-Clause), Python packages pinned with hashes in `requirements.txt`.

## Run it (Docker, Linux containers; Windows host tested)
Pipeline (the `fetch` and `basemap` services have network access; the others have none):
```
docker compose -f docker/compose.yaml run --rm fetch      # newest complete IFS + AIFS run into data/raw (about 60 MB)
docker compose -f docker/compose.yaml run --rm process    # data/processed/<run>/ (6 h mm blocks + agreement)
docker compose -f docker/compose.yaml run --rm process python -m scripts.validate_points   # compare with the raw GRIB at 8 places
docker compose -f docker/compose.yaml run --rm export     # data/site: tiles, map pictures, manifest, status.json (several minutes)
docker compose -f docker/compose.yaml run --rm export python -m scripts.validate_site       # tiles equal the processed data and the raw files
docker compose -f docker/compose.yaml run --rm basemap python -u -m pipeline.basemap fetch-release   # the stored base-map file from its release asset (size and sha256 checked; 3 tries for a timeout or a server error; skipped when the file is already there and matches)
docker compose -f docker/compose.yaml run --rm export python -u -m pipeline.basemap install-assets   # fonts and sprites from frontend/basemap_assets (kept in this repository), offline, every file checked against config/basemap_assets.lock.json
# maintainer only, to refresh those files from the Protomaps repository: ... run --rm basemap python -u -m pipeline.basemap fetch-assets, then copy data/basemap/assets to frontend/basemap_assets and commit
```
The page (local sites; both listen on this computer only):
```
docker compose -f docker/compose.yaml run --rm frontend-build                 # production build into frontend/dist
docker compose -f docker/compose.yaml up -d --force-recreate preview          # public-like site http://localhost:8080
cd frontend && npm ci --ignore-scripts && npm run dev                          # testing site http://localhost:5173 with a DEV badge
```
The site as GitHub Pages serves it (from a sub-folder, with no security headers: the policy comes from `<meta>` tags): build with `vite build --base=/Quest_lab/` into `data/pages/dist`, run `python -m scripts.assemble_site` in the `export` service, then `up -d preview preview-subpath` and open http://localhost:8081/Quest_lab/ (exact commands in the comment of `preview-subpath` in `docker/compose.yaml`; on Windows Git Bash set `MSYS_NO_PATHCONV=1` first). Restart the preview after every export and after any change of `config/headers.conf`. Settings are in `config/` (`pipeline.toml`, `backend.toml`, `basemap.toml`, `frontend.json`, `activities.json`, `headers.conf`).

**Every service runs as a normal user** with all Linux capabilities dropped and a read-only file system; only `data/` is writable (finding S03). The same compose files ran on the GitHub runner (Ubuntu) without change. The base images are pinned by digest, so re-check them before relying on the project for long.

## Tests and checks (the official way is Docker)
```
docker compose -f docker/compose.yaml run --rm tests            # Python: 160 passed (2026-11-08 00:11 UTC); no network, project read-only
docker compose -f docker/compose.yaml run --rm frontend-tests   # Node: 110 passed
docker compose -f docker/compose.yaml run --rm process python -m scripts.plan_reference   # independent Python plan from the raw GRIB
docker compose -f docker/compose.yaml run --rm frontend-check   # the browser code on the real tiles equals it: 8 places x 8 activities (all match, 2026-11-07 19:02 UTC)
BROWSER_NAME=chromium docker compose -f docker/compose.yaml run --rm browser-checks   # 32 scenarios in a real engine (chromium | firefox | webkit); SCREENSHOT_BASE_URL points it at another site
docker compose -f docker/compose.yaml run --rm browser-checks node tools/phone_checks.mjs   # Pixel 7 and iPhone 15 emulation: overflow, 44 px tap targets, map cover, location flow
python scripts/smoke_site.py https://zaspartans.github.io/Quest_lab/   # the live site: page, forecast age, status, tile, range request
python scripts/check_workflow.py                                  # the workflow's safety rules
python scripts/load_test.py <site> --levels 1,5 --dry-run         # concurrent visitors replay (caps, stop rules; a site off this computer needs --approved)
```
Measurements with the computer's own GPU (Edge): `frontend/tools/load_timing.mjs`, `live_look.mjs`, `concurrent_visitors.mjs`; `design_shots.mjs` takes screenshots of the page at four window widths for a design review. The Windows `.venv` (`py -3.11`) is for quick trying only; its result is not the proof.

## What leaves the browser (privacy)
Typed place searches (to Open-Meteo), and the device position (to BigDataCloud) when "Use my location" is used, each with the visitor's IP address. No cookies, no analytics. Saved places and settings stay in the browser (`localStorage`). GitHub itself sees the visitors' requests for the site's files, like any host.

## Browser support and what was tested
There is **no GPU on the server side** (static hosting serves files only); the map is drawn by the **visitor's own browser with WebGL2**. Without WebGL2 the map area shows a plain message and the plan still works.

| Browser | Where | Result |
|---|---|---|
| Android phone | the user's own phone, the live site | "androde looks good the the site works" (the user's words, 2026-11-07 22:57 UTC; no measurements or screenshots) |
| Firefox | the user's own PC | the base map, the rain, the credit line and the device place name drew (user's screenshots, 2026-11-07); speed not measured |
| Microsoft Edge | the developer's Windows PC, real GPU | 26 of 26 browser scenarios on the root site, the sub-folder test site and the live site; 20 real Edge browsers at once finished correctly on the local site (slowly) |
| Chromium 158 | Docker, software WebGL | 26 of 26 on the same three sites; Pixel 7 phone emulation passes |
| WebKit 27 (the engine of Safari, not Safari) | Docker | 26 of 26 (3 runs after a test fix); iPhone 15 emulation passes |
| Firefox 159 | Docker | 26 of 26, but the container has no WebGL2 for Firefox, so its map scenarios return early there |
| Safari on an iPhone | | **not tried by a person** (only the WebKit emulation above) |

The counts in the rows above (26 of 26) were measured on 2026-11-07 on three sites. On 2026-11-08, after the design pass, the location fix and the level scenarios, the scenario list grew to 32 and passed 32 of 32 in Edge (real GPU), Chromium, Firefox and WebKit on the root test site only (the sub-folder test site and the live site were not re-run after the level scenarios were added; the 28 scenarios before them passed on the sub-folder site too). The user's Android check of the new design (2026-11-08): Firefox, Chrome and Samsung Internet on Android all work and look good (their words, no measurements).

## Known limits (full list: `docs/PROGRESS.md` and the shortcut register in `docs/DECISIONS.md`)
IFS 3-hourly detail is not used (6-hour blocks, D14); tiny negative differences from GRIB packing are set to zero (D14, at most about 0.06 % of the rain mass); IFS stops at 240 h (D12); the plan uses a device time zone for a place found by the device or the map (D24, D30); a lone one-cell peak looks lighter on the smoothed pictures (D34); the rain levels use our own cut-offs (D41); **GitHub Pages sends no security headers except HSTS, so `nosniff`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` and `frame-ancestors` are lost and the rest of the policy is in `<meta>` tags (D42)**; Pages caches for 10 minutes, so a new forecast can take that long to reach a browser; the forecast on the page is normally 8 to 21 hours old; a first visit loads 2.7 to 4.7 MB; concurrency was tested up to 100 replayed visitors and 20 real browsers on this computer (numbers for this machine, not GitHub) and only 1 to 3 simultaneous visitors on the live site, about 21 MB in total, with no 403, 429 or 5xx (D43; the larger live steps were not run, so behaviour for many simultaneous visitors on GitHub is untested); **estimate, not a test:** at about 3.7 MB per first visit (the mean of three recorded visits) the soft Pages limit of 100 GB per month would allow roughly 27,000 first visits a month, and fewer new visitors if GitHub throttles earlier, which was not tested (repeat visits cost less because the browser keeps the files); the security headers file still carries a stale marker comment (see the register); **seven JavaScript functions are longer than the 50-line rule** (listed in `docs/DECISIONS.md`, open for decision). The scheduled workflow keeps running every 6 hours until the owner disables it.
