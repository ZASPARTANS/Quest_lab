# Precipitation forecast app (ECMWF IFS + AIFS)

QUEST Lab application, Project 1: fetch precipitation forecasts from ECMWF Open Data (IFS and AIFS), process them, and deploy a public web app that presents the forecast through an innovative front end.

**Status: work in progress. The data part runs (download, processing, validation). The web app is a one-page spike that shows one real forecast frame on a flat map and a globe; the finished app (time scrubber, location panel, model agreement) is not built yet.** This README will be rewritten at the end to say what works, what does not, how to run it and what was verified. The problem statement is in `docs/PROBLEM.md`; the plan in `docs/plans/`; the live status in `docs/PROGRESS.md`.

## Intended folder layout (decision D5 in `docs/DECISIONS.md`)

Folders appear when their first real file is added. Existing so far: `config/`, `pipeline/`, `scripts/`, `frontend/`, `tests/`, `docker/`, `docs/`. Still to come: `backend/` (step 7) and `.github/workflows/` (step 11).

```
README.md            this file
config/              all settings (TOML/JSON), no code
pipeline/            fetch ECMWF data and process it (Python)
backend/             builds the static data API the frontend reads (tiles + manifest)
frontend/            web app (Vite): map, globe, location panel
tests/               pipeline/ and backend/ (pytest), frontend/ (node --test)
scripts/             thin command-line entry points
docs/                plans, progress, decisions, errors, sources, domain notes
.github/workflows/   scheduled build and deploy
data/                IGNORED by git: raw downloads, processed output, exported site data
```

## Data and licence
Forecast data: ECMWF Open Data (IFS and AIFS), CC-BY-4.0 and the ECMWF Terms of Use. The exact attribution text will be added once verified on the official terms page (plan step 10).

## Fetching and processing data (Docker, Linux)
```
docker compose -f docker/compose.yaml run --rm fetch     # download the newest complete IFS + AIFS run (about 62 MB); the only service with network
docker compose -f docker/compose.yaml run --rm process   # process it into data/processed/<run>/ and print a summary; no network
```

Every service runs as a normal user (not root) with all Linux capabilities dropped and a read-only file system; only the git-ignored `data/` folder is writable (security finding S03). On Docker Desktop (Windows) `data/` is created on the first run (checked). On Linux, create `data/` yourself and run `export APP_UID=$(id -u) APP_GID=$(id -g)` first, so the files belong to you (not tested: no Linux host here). The base image is pinned by digest, so it gets no operating-system updates until the digest in `docker/Dockerfile` is changed; re-check it before relying on the project for long.

To check the processed data against the raw files (eccodes' own nearest-point search at 8 named places, tolerance 0.05 mm):

```
docker compose -f docker/compose.yaml run --rm process python -m scripts.validate_points
```

Processing turns both models into millimetres per 6-hour interval, converts each model's own unit, and builds the IFS-vs-AIFS agreement field (details: `docs/DOMAIN.md`, decisions D13 and D14).

## Looking at the web app locally (two sites, decision D19)
Work in progress: only a page with one exported forecast frame (flat map and globe, MapLibre GL JS) exists so far; no finished app (the day plan is built in steps 8-9).

```
# once: turn the processed run into the static site data in data/site (tiles, map frames, manifest; about 36 MB; no network)
docker compose -f docker/compose.yaml run --rm export
# optional check: what a browser reads from the tiles equals the processed data and the raw files
docker compose -f docker/compose.yaml run --rm process python -m scripts.validate_site

# testing site, with live reload and a DEV badge: http://localhost:5173
cd frontend && npm ci --ignore-scripts && npm run dev

# public-like site, the production build as nginx serves it: http://localhost:8080
docker compose -f docker/compose.yaml run --rm frontend-build
docker compose -f docker/compose.yaml up -d preview        # stop with: docker compose -f docker/compose.yaml down

# automatic checks
docker compose -f docker/compose.yaml run --rm frontend-tests     # Node tests
docker compose -f docker/compose.yaml run --rm screenshots        # real browser: screenshots + errors + hosts contacted (starts the preview)
```

Both sites listen on this computer only. The settings (ports, folders, pages, colours) are in `config/frontend.json`, the security headers in `config/headers.conf`.

## Browser support and what was tested (updated 2026-11-06)
The map needs **WebGL2** (MapLibre GL JS 6). A browser without WebGL2 currently shows a blank dark page with no message (found with Firefox in a container, `docs/evidence/firefox-headless-maplibre-flat.png`); a plain message and a non-WebGL fallback are planned (decision D23). There is **no GPU anywhere on the server side** (free static hosting has none); the map is drawn in the visitor's own browser.

| Browser | Where | Result |
|---|---|---|
| Chromium | Docker (Playwright image), software WebGL, no GPU | pass: pages draw, no console or security-policy errors, no outside request |
| Microsoft Edge | the developer's Windows PC, real GPU | pass: both local sites, flat-to-globe switch keeps place and zoom |
| Firefox | the user's own PC | the user reports the site loads ("the site loads files"); that the map and rain layer draw correctly is **not yet confirmed** |
| Firefox | inside Docker | could not be tested: no WebGL context in the container in 3 configurations (an environment limit, not a result about the app) |
| Safari, phones | | **not tested yet** (user decision: later) |

## Running the tests (the official way)
Tests run in Docker on Linux, with the project mounted read-only and no network:

```
docker compose -f docker/compose.yaml run --rm tests
```

The first run builds the image from `requirements.txt` (about 30 s). The Windows `.venv/` (`py -3.11 -m venv .venv`, then `pip install --require-hashes -r requirements.txt`; after changing a version run `python -m scripts.pin_hashes`) is only for quick trying; its result is not the proof. Front-end tests: `docker compose -f docker/compose.yaml run --rm frontend-tests`.
