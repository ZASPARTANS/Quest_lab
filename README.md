# Precipitation forecast app (ECMWF IFS + AIFS)

QUEST Lab application, Project 1: fetch precipitation forecasts from ECMWF Open Data (IFS and AIFS), process them, and deploy a public web app that presents the forecast through an innovative front end.

**Status: work in progress. Only the data part runs so far (download and processing; no web app yet).** This README will be rewritten at the end to say what works, what does not, how to run it and what was verified. The problem statement is in `docs/PROBLEM.md`; the plan in `docs/plans/`; the live status in `docs/PROGRESS.md`.

## Intended folder layout (decision D5 in `docs/DECISIONS.md`)

Folders appear when their first real file is added. Existing so far: `config/`, `pipeline/`, `tests/`, `docker/`, `docs/`.

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

Processing turns both models into millimetres per 6-hour interval, converts each model's own unit, and builds the IFS-vs-AIFS agreement field (details: `docs/DOMAIN.md`, decisions D13 and D14).

## Running the tests (the official way)
Tests run in Docker on Linux, with the project mounted read-only and no network:

```
docker compose -f docker/compose.yaml run --rm tests
```

The first run builds the image from `requirements.txt` (about 30 s). The Windows `.venv/` (`py -3.11 -m venv .venv`, then `pip install -r requirements.txt`) is only for quick trying; its result is not the proof. There is no front end or localhost preview yet (planned in plan step 6).
