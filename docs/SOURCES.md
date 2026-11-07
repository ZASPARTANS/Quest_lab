# SOURCES

Only sources actually opened or used.

## 2026-11-06 18:25 UTC — ECMWF Open Data server directory listing
- URL: https://data.ecmwf.int/forecasts/ (and sub-paths `/forecasts/20261106/00z/...`)
- Used for: read-only listing of available dates, runs, models and file names, plus a header-only check (`HEAD`) of one AIFS GRIB2 file and a read of one `.index` file. No forecast data downloaded yet.
- Accessed: 2026-11-06 ~18:25 UTC.
- Licence / attribution: NOT yet read from the official ECMWF Open Data licence page. To be checked and recorded before any data is shown in the app (planned in PLAN-001).

## 2026-11-06 ~18:55 UTC — Python packages (verified on the official PyPI JSON API, then installed from PyPI)
Access date 2026-11-06. Versions are those pinned in `requirements.txt`. Licences below are the PyPI metadata of the direct packages; the licences of the 19 transitive packages were NOT individually checked.

| Package | Pinned | PyPI page | Used for | Licence (PyPI metadata) |
|---|---|---|---|---|
| ecmwf-opendata | 0.3.35 | https://pypi.org/project/ecmwf-opendata/ (source: https://github.com/ecmwf/ecmwf-opendata) | download IFS/AIFS open data; installed source read to confirm `.index` + byte-range logic (`client.py` `get_parts`) | Apache-2.0 |
| eccodes | 2.50.0 | https://pypi.org/project/eccodes/ (source: https://github.com/ecmwf/eccodes-python) | decode GRIB2; Windows wheel bundles `eccodes.dll` | Apache-2.0 |
| numpy | 2.4.6 | https://pypi.org/project/numpy/ | array processing (newest 2.5.4 needs Python >= 3.12) | BSD-3-Clause AND others (see PyPI) |
| pytest | 9.2.0 | https://pypi.org/project/pytest/ | automated tests | MIT |

Transitive (installed by pip, not chosen directly): attrs, certifi, cffi, charset-normalizer, colorama, findlibs, idna, iniconfig, multiurl, packaging, pluggy, pycparser, Pygments, python-dateutil, pytz, requests, tqdm, tzdata, urllib3.

## 2026-11-06 ~19:11 UTC — Forecast data actually downloaded (step 3)
- What: ECMWF Open Data, parameter `tp` (total precipitation), type `fc`, stream `oper`, 0.25 degree global grid, run 2026-11-06 00 UTC.
  - IFS (model `ifs`): 64 messages, steps 3..240 h, 34.54 MB. AIFS Single (model `aifs-single`): 60 messages, steps 6..360 h, 29.51 MB.
- Where from: https://data.ecmwf.int/forecasts/20261106/00z/ (via the `ecmwf-opendata` client, source name `ecmwf`). Retrieved 2026-11-06 ~19:11 UTC. Stored in the git-ignored `data/raw/2026110600/<model>/tp.grib2`; re-created by `python -m pipeline.fetch`.
- Licence / attribution: CC BY 4.0 plus the ECMWF Terms of Use (stated on https://www.ecmwf.int/en/forecasts/datasets/open-data, read 2026-11-06, and printed by the client on download). The exact attribution wording still has to be taken from the official terms page before the app shows data (plan step 10).
- Units: IFS metres, AIFS kg m**-2 (see DOMAIN.md and E006). Time zone: UTC. Accumulation: since forecast start.

## 2026-11-06 ~19:30 UTC — Docker image used for the Linux check
- `python:3.11-slim` from Docker Hub (official `python` image), digest `sha256:65bd3d9f1d7fa268dd1909973ba7eb4bdf41f6dcf2cfbe76ba9528b170f3fd79`, pulled 2026-11-06. Used only to run `pip install -r requirements.txt`, the tests and the GRIB decode check on Linux. Not part of the deliverable; licences of the image contents were not reviewed.

## 2026-11-06 20:18 UTC — Step 3b additions
- Base image of `docker/Dockerfile`: `python:3.11-slim@sha256:65bd3d9f1d7fa268dd1909973ba7eb4bdf41f6dcf2cfbe76ba9528b170f3fd79` (same digest as pulled earlier, see above). Compared with `docker image inspect` before use.
- Two Linux-only Python packages, found by the Docker build and verified on the PyPI JSON API on 2026-11-06: `eccodeslib` 2.50.0.34 (https://pypi.org/project/eccodeslib/, requires `eckitlib==2.5.0.34`) and `eckitlib` 2.5.0.34 (https://pypi.org/project/eckitlib/). Used for: the C library behind `eccodes` on Linux. Licence: NOT shown in the PyPI metadata and NOT verified.

## 2026-11-06 ~21:12 UTC — Vetting of `requests` and the vulnerability scanner (step S4 of PLAN-005)
Access date 2026-11-06. Checked on the official PyPI JSON API with a short script (standard library `urllib`).
| Package | Version | PyPI JSON page | Source repository | Findings | Used for |
|---|---|---|---|---|---|
| requests | 2.34.2 (equals the installed version) | https://pypi.org/pypi/requests/2.34.2/json | https://github.com/psf/requests (from the page's `project_urls`) | name matches, Apache-2.0, not yanked, files uploaded 2026-05-14 (wheel + sdist), requires Python >= 3.10, author listed as Kenneth Reitz | imported directly by `pipeline/fetch.py` (session classes); closes E014. Only the PyPI page was opened; the GitHub repository was not read in this session. |
| pip-audit | 2.10.1 (pinned for the one-off scan, NOT added to `requirements.txt`) | https://pypi.org/pypi/pip-audit/json | https://github.com/pypa/pip-audit (Python Packaging Authority) | name matches, not yanked, upload 2026-06-10, authors Alex Cameron, Dustin Ingram, William Woodruff; its own dependencies (CacheControl, cyclonedx-python-lib, rich, tomli, ...) were installed by pip into a throwaway container and are NOT vetted one by one | vulnerability scan of `requirements.txt`; vulnerability data comes from PyPI's own service (default of the tool) |

## 2026-11-06 ~22:14 UTC — Front-end packages, images and pages used in step 6
Access date 2026-11-06. npm facts from the registry JSON API (registry.npmjs.org) and from the installed packages; images by `docker buildx imagetools inspect` (digests) and `docker pull` (nginx only).
| Package | Pinned | Licence (registry) | Used for | Notes |
|---|---|---|---|---|
| maplibre-gl | 6.16.0 (published 2026-10-25) | BSD-3-Clause | flat map and globe (spike) | no default export in v6 (named imports); worker file must be emitted and registered (`setWorkerUrl`), E017 |
| cesium | 1.147.0 (2026-11-02) | Apache-2.0 | its static folders (Workers, ThirdParty, Assets, Widgets) served next to the page | 80 MB unpacked |
| @cesium/engine | 26.5.0 | Apache-2.0 | `CesiumWidget` etc. (the page code imports it directly) | exact version `cesium` 1.147.0 requires; added as a direct pin because the page imports it |
| @cesium/core | 0.1.1 | Apache-2.0 | `Cartesian3`, `Color`, `Rectangle` (moved there in CesiumJS 1.146; the old location prints deprecation warnings and is removed in 1.150) | direct pin for the same reason |
| topojson-client | 3.1.0 (2019) | ISC | decode world outline data | |
| world-atlas | 2.0.2 (2019) | ISC (package); data is Natural Earth, public domain | coastlines and country borders (110m) | |
| vite | 8.3.6 (2026-11-05) | MIT | dev server and production build | uses Rolldown |
| playwright | 1.65.0 (2026-11-05) | Apache-2.0 | browser screenshots and checks (dev dependency) | same version as the browser image |
Whole npm tree from `frontend/package-lock.json`: 98 packages, all from registry.npmjs.org, all with sha512 integrity, **one install script (`fsevents`, macOS-only optional; never installed here)**; licences: MIT 49, ISC 12, Apache-2.0 13, MPL-2.0 12 (weak copyleft, used unmodified), BSD 8, others 4. Only the 8 direct packages were looked at on the registry; the other 90 were not vetted one by one. No `npm audit` was run (it sends the package list to the registry; asks the user first). All installs use `--ignore-scripts`.
| Image | Digest | Used for |
|---|---|---|
| node:22-slim | sha256:5ec23b7c622b00547753bc6ffd78085dd868a68aeb41c8e0a1418f033e13d96d | front-end build and Node tests (Node 22 = the host's line, 22.23.4) |
| nginx:stable-alpine (nginx 1.30.6) | sha256:583b7f2fce1cdb8da5ad5c39ebd3c33b98b87d493190e548bdee1fa8c619c311 | the "public-like" preview on localhost:8080 |
| mcr.microsoft.com/playwright:v1.65.0-noble | sha256:6e3fb709361521eb27161606e6da6d2674e5e89fa16516cb37d6fdd91372273d | headless browser for screenshots and browser tests |
Pages opened for the decision gate (research results are in docs/DECISIONS.md D20): https://www.naturalearthdata.com/about/terms-of-use/ (public domain), https://operations.osmfoundation.org/policies/tiles/ , https://operations.osmfoundation.org/policies/nominatim/ , https://open-meteo.com/en/docs/geocoding-api , https://open-meteo.com/en/terms , https://openfreemap.org/ ; a real request to geocoding-api.open-meteo.com for the CORS header. Not opened (blocked or empty): open-meteo.com/en/license, the PMC and MDPI copies of the GPCP paper. Node release lines from https://nodejs.org/dist/index.json.

## 2026-11-06 ~22:21 UTC — Update after the library decision (D22)
CesiumJS (`cesium` 1.147.0, `@cesium/engine` 26.5.0, `@cesium/core` 0.1.1) was evaluated and then **removed** from `frontend/package.json` and the lock file; the npm tree is now 70 packages (direct: maplibre-gl 6.16.0, topojson-client 3.1.0, world-atlas 2.0.2, vite 8.3.6, playwright 1.65.0). `npm audit` on that lock file, run 2026-11-06 under the user's standing approval in a throwaway container from the pinned node image (`--package-lock-only`, no install): 70 packages, 0 vulnerabilities (sent to the npm registry: package names and versions).

## 2026-11-06 ~23:02 UTC — Browser builds seen during the Firefox attempt (housekeeping)
Listing of `/ms-playwright` and `firefox` version inside the pinned Playwright image (`docker compose ... run`): `chromium-1254`, `chromium_headless_shell-1254`, `firefox-1572` (Firefox 159.0 as reported by Playwright), `webkit-2388`, `ffmpeg-1013`. Not downloaded separately. WebKit is the engine closest to Safari that can be tested in Docker; it has not been used yet (Safari is deferred by the user, D23).

## 2026-11-06 ~23:55 UTC — Free static-host limits read for the step 7 size check (official pages, access date 2026-11-06)
| Host | Page | Limits quoted |
|---|---|---|
| GitHub Pages | https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits | published site no larger than 1 GB; soft bandwidth limit 100 GB per month; soft 10 builds per hour (not applying to a custom GitHub Actions workflow); deployment times out after 10 minutes; no file-count or single-file limit stated |
| Cloudflare Pages (Free) | https://developers.cloudflare.com/pages/platform/limits/ | 20,000 files per site; 25 MiB per file; 500 builds per month; 100 header rules per `_headers` file; no bandwidth limit listed |
| Netlify (Free) | https://www.netlify.com/pricing/ | 300 credits; bandwidth costs 20 credits per GB and a production deploy 15 credits; no file-count or size limit stated. **My own arithmetic, not a stated limit:** 300 / 15 = about 20 production deploys a month, which cannot carry two scheduled deploys a day (about 60 a month). |
These are the limits of the day; the hosting choice and a re-check of the terms happen at step 11 (the user decides). Prototype measurements for the same step are in docs/DECISIONS.md D25.

## 2026-11-07 ~00:42 UTC — Step 8 additions (checkpoint)
- **Open-Meteo geocoding API** (place search; user's choice D27): endpoint `https://geocoding-api.open-meteo.com/v1/search`, terms https://open-meteo.com/en/terms (read in D20 on 2026-11-06: free tier non-commercial, under 10,000 calls a day, IP logs kept up to 90 days, CC BY 4.0 credit requested). Used by real requests on 2026-11-07 ("Chennai", "Zzzzqqq", "a") to see the reply shape, and once by the browser check. The credit line is still to be added to the page (step 10). Licence: data from GeoNames (CC BY 4.0 via Open-Meteo).
- **Browser built-ins used, not packages:** `Intl.DateTimeFormat` with `timeZone` (zone offsets and local days), `DecompressionStream('gzip')` (tile decoding), `fetch`, `localStorage`, `navigator.geolocation`, `navigator.permissions`. Their behaviour was tested in Chromium 158.0.8127.18, Firefox 159.0 and WebKit 27.2 (the Playwright 1.65.0 image, digest in compose.yaml) and in Node 22.23.4; the specification pages were not re-opened in this step, so no URL is claimed.
- **No new npm or PyPI package** was added in step 8 (the code ladder stopped at the platform).

## 2026-11-07 11:07 UTC — Reverse geocoder and cache headers (step 9.3)
- **BigDataCloud, free client-side reverse geocoding** (D32): https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api (read 2026-11-07); endpoint `https://api.bigdatacloud.net/data/reverse-geocode-client`; no API key; client-side use only, with the device's current location; fair use, a temporary IP ban returns HTTP 402; no attribution requirement stated on that page; returns city, locality, region, country. Used by the page for the device position only. Licence/terms of the data not stated on that page (to be read before the final README credits).
- **Nominatim usage policy** (read, not used): https://operations.osmfoundation.org/policies/nominatim/ (2026-11-07): 1 request per second for the whole website, Referer or User-Agent identification, attribution (ODbL), access may be withdrawn, policy may change without notice.

## 2026-11-07 12:39 UTC — Natural Earth 50 m outlines (D34)
- `world-atlas` 2.0.2 `countries-50m.json` (Natural Earth 1:50m, public domain, https://www.naturalearthdata.com/about/terms-of-use/, already installed and vetted in step 6); used for the coastlines and borders of the map from step 9.3b-2 (the user chose it); 756 kB raw, 236 kB gzipped; replaces the 110 m file (108 kB raw).

## 2026-11-07 13:41 UTC — Base map sources read for PLAN-010 (official pages, access date 2026-11-07; used for the decision, nothing installed yet)
- Protomaps basemap downloads: https://docs.protomaps.com/basemaps/downloads (ODbL Produced Work, "OpenStreetMap attribution required", planet about 120 GB zoom 0-15, `--maxzoom` extracts, URLs may change, copy to your own storage).
- PMTiles CLI: https://docs.protomaps.com/pmtiles/cli (`pmtiles extract`, remote source, `--maxzoom` efficient; single Go binary on https://github.com/protomaps/go-pmtiles/releases; Docker image `protomaps/go-pmtiles`).
- Protomaps with MapLibre: https://docs.protomaps.com/basemaps/maplibre (`pmtiles://` source prefix, `@protomaps/basemaps` `layers()` with flavors light/dark/white/black/grayscale and `lang`, glyphs and sprites from `basemaps-assets`, to be self-hosted).
- Daily builds: `https://build.protomaps.com/20261107.pmtiles` (headers only, 139,356,959,640 bytes, `Accept-Ranges: bytes`, last modified 2026-11-07 09:03 UTC).
- npm registry (JSON, `latest`): `pmtiles` 4.5.0 BSD-3-Clause (dependency `fflate`); `@protomaps/basemaps` 5.7.2 BSD-3-Clause (no dependencies, repository github.com/protomaps/basemaps). Not installed yet; vetting is part of step 9.3d-2.
- Also read: Natural Earth II 50m raster page (84.78 MB small download, licence not stated on that page) and OpenFreeMap (free public tiles, no key, "no limits on the number of map views", attribution required, self-hostable): options not chosen.

## 2026-11-07 14:02 UTC — Packages vetted and installed for the base map (step 9.3d-2); outline packages removed
- npm registry JSON, read 2026-11-07: `pmtiles` 4.5.0 (BSD-3-Clause, 12 files, 380 kB unpacked, no install scripts, one dependency `fflate` ^0.8.2, maintainer `bdon`, repo github.com/protomaps/pmtiles); `@protomaps/basemaps` 5.7.2 (BSD-3-Clause, 16 files, 443 kB unpacked, no dependencies, no install scripts, repo github.com/protomaps/basemaps); `fflate` 0.8.3 (MIT, no dependencies, no install scripts). Installed with exact versions and `--ignore-scripts`; npm's own audit during the install reported 0 vulnerabilities. Removed: `topojson-client` 3.1.0 and `world-atlas` 2.0.2 (the outlines, D22).
- Fonts (Noto Sans Regular, Medium, Italic glyph files) and the dark sprite v4 from github.com/protomaps/basemaps-assets at commit 028c18f713baecad011301ff7a69acc39bcc2ae7, kept under `data/basemap/assets` and checked against `config/basemap_assets.lock.json`; fonts are SIL Open Font Licence (the licence file `fonts/OFL.txt` is stored with them); map data: OpenStreetMap contributors (ODbL), Protomaps daily build 20261107 extracted to zoom 7.

## Summary of what the project uses now (housekeeping, 2026-11-07 14:17 UTC; pointers to the dated sections above, nothing new opened)
- **Forecast data:** ECMWF Open Data, IFS (`ifs`, 0.25 degree, oper) and AIFS Single, total precipitation; licence CC BY 4.0 and the ECMWF terms (first section and step 3 section); the run on the page is 2026-11-06 12:00 UTC. The exact attribution wording is verified on the official page at step 10 (not done yet).
- **Base map:** OpenStreetMap data through the Protomaps daily build 20261107 (ODbL, extract to zoom 7), `pmtiles` command-line tool 1.31.2 (sha256 checked), fonts and sprites from `protomaps/basemaps-assets` at commit `028c18f7...` (SIL Open Font Licence for the fonts), all listed in the 13:41, 13:48 and 14:02 sections. The 13:41 section says "nothing installed yet": the packages were installed at 14:02.
- **Services the visitor's browser may call:** Open-Meteo geocoding (place search) and BigDataCloud client-side reverse geocoding (name of the device position): see the sections of 2026-11-07 00:42 and 11:07.
- **npm (exact versions in `frontend/package.json` and the lock file):** `maplibre-gl` 6.16.0, `pmtiles` 4.5.0 (+ `fflate` 0.8.3), `@protomaps/basemaps` 5.7.2; dev only: `vite` 8.3.6, `playwright` 1.65.0. Removed: `cesium` packages (D22), `topojson-client` and `world-atlas` (D38).
- **Python:** 25 packages with hashes in `requirements.txt` (sections of 2026-11-06 18:55, 20:18 and 21:12).
- **Not yet verified:** the wording of the credit lines for ECMWF and Open-Meteo (step 10).

- 2026-11-07 15:48 UTC: font `Noto Sans Devanagari Regular v1` (256 glyph range files) added from the same repository and commit as the other fonts (github.com/protomaps/basemaps-assets at 028c18f713baecad011301ff7a69acc39bcc2ae7), SIL Open Font Licence (same `fonts/OFL.txt`), checked against `config/basemap_assets.lock.json` (hashes also compared with the commit's own tree listing by `lock-assets`). Reason: the style of `@protomaps/basemaps` 5.7.2 names it for Devanagari place names (found in step 9.3c-4).

- 2026-11-07 17:39 UTC, rain intensity classes (for D41, PLAN-011): **read** (a plain GET with curl; the fetch tool was refused with 403): American Meteorological Society, Glossary of Meteorology, entry "rain", https://glossary.ametsoc.org/wiki/Rain : for observing purposes "light" = a trace to 0.25 cm (0.10 in.) per hour, "moderate" = 0.26 to 0.76 cm (0.11 to 0.30 in.) per hour, "heavy" = over 0.76 cm (0.30 in.) per hour (copyright AMS; quoted as a fact, not copied). **Read**: yr.no help page https://hjelp.yr.no/hc/en-us/articles/115003696813-What-does-light-and-heavy-rain-mean (NRK, 2018): for one hour, light rain at least 0.1 mm/h, rain 0.5-1 mm/h, heavy rain 1 mm/h and up. **Search result only, NOT verified by me**: India Meteorological Department 24 h categories (light 2.5-15.5, moderate 15.6-64.4, heavy 64.5-115.5 mm; the IMD PDF https://rsmcnewdelhi.imd.gov.in/uploads/archive/8/8_051ce4_hrainfall.pdf was downloaded but its text could not be extracted, so the numbers come from search-result summaries and several news pages that differ by 0.1 mm at the edges); Australian Bureau of Meteorology (2.5 and 10 mm/h, from a search result about aviation observations; the page did not load). Use: to show the user that scales differ and that none is for 6-hour blocks; our own cut-offs are D41.

- 2026-11-07 19:33 UTC, hosting facts (for D42, PLAN-013), **read** with the fetch tool: GitHub Docs, "GitHub Pages limits" https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits (published sites no larger than 1 GB; recommended source repository limit 1 GB; soft bandwidth limit 100 GB per month; soft limit 10 builds per hour that does not apply to custom workflows; deployments time out after 10 minutes; no per-file limit stated; private repositories on free plans: not stated); GitHub Docs, "Using custom workflows with GitHub Pages" https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages (`actions/configure-pages@v5`, `actions/upload-pages-artifact@v4` with an artifact under 10 GB, `actions/deploy-pages@v4`; the deploy job needs `pages: write` and `id-token: write` and an `environment`); GitHub Docs, "Actions usage limits, billing and administration" https://docs.github.com/en/actions/administering-github-actions/usage-limits-billing-and-administration (standard GitHub-hosted runners are free for public repositories; the page gives no minute amounts for private ones). The repository `ZASPARTANS/Quest_lab` was checked with an unauthenticated read-only request to the GitHub API (public, empty, default branch main, no Pages). Facts only, nothing copied.

- 2026-11-07 19:45 UTC, credit wording (for step 13.1, PLAN-013), **read** with curl (plain GET): ECMWF, "ECMWF Terms of Use" https://apps.ecmwf.int/datasets/licences/general/ (the wording for a service created with ECMWF data, the CC BY 4.0 licence statement, the disclaimer, the "modified" indication; "Attribution must be displayed prominently"); ECMWF, "Open data" https://www.ecmwf.int/en/forecasts/datasets/open-data (CC-BY-4.0 and the Terms of Use apply, "subject to appropriate attribution"; the page links the Terms of Use above); Open-Meteo, licence page https://open-meteo.com/en/licence (CC BY 4.0; "You must include a link next to any location Open-Meteo data are displayed"; location database from GeoNames, CC-BY) and terms https://open-meteo.com/en/terms (free API for non-commercial use under 10,000 calls a day; "private or non-profit websites or apps that do not have subscriptions or advertising" qualify); BigDataCloud, free reverse geocoding page https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api (client-side, free, no key, fair use: calls from the visitor's browser with the device's own location). **Link only, not opened:** https://www.geonames.org/ and https://www.bigdatacloud.com/ (the credit links). The earlier line in this file ("Licence / attribution: NOT yet read from the official ECMWF page") is superseded by this entry.

- 2026-11-07 20:25 UTC, GitHub Actions for step 13.3 (PLAN-013), **read** with plain GET requests to the GitHub API and raw.githubusercontent.com: latest releases and commit SHAs of `actions/checkout` v7.0.1 (`3d3c42e5aac5ba805825da76410c181273ba90b1`), `actions/configure-pages` v6.0.0 (`45bfe0192ca1faeb007ade9deae92b16b8254a0d`), `actions/upload-pages-artifact` v5.0.0 (`fc324d3547104276b827a68afc52ff2a11cc49c9`), `actions/deploy-pages` v5.0.1 (`368f82528645a54fb793d4d04e342629a3f51346`), and the `action.yml` inputs of the last three at those commits (upload: `name`, `path` default `_site/`, `retention-days` default 1, `include-hidden-files` default false; deploy: `timeout` 600000 ms, `artifact_name`; configure: outputs `base_url`, `origin`, `host`, `base_path`). GitHub-owned actions only; each is used by commit SHA. The earlier docs page named older versions (`configure-pages@v5`, `upload-pages-artifact@v4`, `deploy-pages@v4`); the newer ones are used because the repositories' latest releases say so, and their inputs were read above.
- 2026-11-07 20:35 UTC, `pmtiles` 4.5.0 source (the installed `frontend/node_modules/pmtiles/dist/pmtiles.js`, read): a range request answered with HTTP 200 and no usable content-length throws "Server returned no content-length header or content-length exceeding request. Check that your storage backend supports HTTP Byte Serving"; used to know what failure to expect if the public host ignores ranges.
