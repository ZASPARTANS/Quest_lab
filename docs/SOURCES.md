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
