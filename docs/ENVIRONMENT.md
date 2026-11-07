# ENVIRONMENT

Everything below was found by running commands in this session. Times are UTC.

## 2026-11-06 18:19 UTC — initial check
- OS: Windows 11 Home Single Language 10.0.26300, 64-bit (`Get-CimInstance Win32_OperatingSystem`). 
- Shells: PowerShell 5.1.26100.9818 (primary tool shell); Git Bash (GNU bash 5.3.15, MINGW64) for POSIX scripts.
- git 2.56.0.windows.1. `gh` 2.74.2 is installed but NOT logged in (`gh auth status`: "You are not logged into any GitHub hosts").
- Node v22.23.4, npm 10.9.9.
- Python: `python` = 3.10.11, `py -3.11` = 3.11.9.
- Free disk: C: 5.2 GB, D: 271.5 GB, E: 603.7 GB. Project is on E:, so space is not a constraint.
- Project folder `<project folder>`: not a git repo yet; contains only `.claude/settings.local.json`.
- Session log (`.jsonl`) is in `<Claude Code config folder>/projects/<project folder>/` (config folder is `<config folder>`, not `~/.claude`).

## Surprises / blockers found
- **Python 3.10 pip is broken**: `python -m pip --version` fails with `ModuleNotFoundError: No module named 'pip._vendor.pyparsing.core'`. Use Python 3.11 (`py -3.11`), whose pip 24.0 works.
- Python 3.11 has NO data/web packages installed: only ipykernel/ipython and their dependencies. numpy, xarray, cfgrib, eccodes, ecmwf-opendata, pandas, fastapi, pytest are all absent. Everything needed must be installed into a virtual environment, after verifying each package name (see CLAUDE.md package rules).
- Not yet checked: whether the eccodes C library is usable on Windows via pip wheels. This is a risk for reading GRIB2 and is a planned early check.
  - Correction 2026-11-06 ~19:00 UTC: checked in step 2. It works; the `eccodes` 2.50.0 wheel bundles `eccodes.dll` (see DOMAIN.md). Linux (CI) still unchecked.
- Network: `https://data.ecmwf.int/forecasts/` answered HTTP 200 from this machine.

## 2026-11-06 18:44 UTC — found during step 1
- git `core.autocrlf` is `true`. Git warns "LF will be replaced by CRLF" on commit, but the committed blob of `docs/PROBLEM.md` has no CR (checked with `git show HEAD:docs/PROBLEM.md`). Working-tree files on this machine may show CRLF after checkout.
- Windows Python cannot see Git Bash paths such as `/tmp/...` (a script opening `/tmp/problem_blob.txt` failed with `FileNotFoundError`). Pass data via stdin or use Windows paths. No fix needed in the code.
- git identity is already configured (name and email set), so commits work. `git init -b main` was used; the default branch is `main`.

## 2026-11-06 ~19:05 UTC — step 2 (virtual environment)
- Created `.venv/` inside the project with `py -3.11 -m venv .venv` (Python 3.11.9, pip 24.0). `.venv/` is git-ignored. pip says 26.3 is available; not upgraded (not needed).
- Installed 4 direct packages, 23 packages in total; `pip check`: "No broken requirements found". Versions are pinned in `requirements.txt`.
- Rebuilding a throwaway venv from `requirements.txt` gave an identical `pip freeze`. During that install pip printed two retries with `getaddrinfo failed` (transient DNS failure); pip recovered and the install completed. No action taken.
- `pytest -q` with no `tests/` folder exits with code 5 ("no tests collected") and a `PytestConfigWarning: No files were found in testpaths`. Expected until step 4 adds tests.
- Shell note: Git Bash `mktemp -d` returns a short-name temp path (`<short temp path>`); Windows warns that the venv location "may have moved due to redirects". Harmless.

## 2026-11-06 ~19:13 UTC — step 3
- Local clock vs servers: local `date -u` agreed with the PyPI `Date` header within about 8 seconds, so the clock used for the time budget is sound.
- Fetch of the `tp` messages of two models (about 64 MB) took about 49 s on this connection (about 5 MB/s). Free disk on E: is above 600 GB, so the data folder is not a space concern.
- The ecmwf-opendata client prints a long notice about the 500-connection limit and tqdm progress bars on stderr; harmless noise.

## 2026-11-06 ~19:30 UTC — Docker (offered by the user for Linux testing)
- Docker 29.9.2 was already running (`docker info`: server 29.9.2, OS type linux, WSL2 kernel `5.15.167.4-microsoft-standard-WSL2`).
- Pulled the official image `python:3.11-slim` (digest `sha256:65bd3d9f1d7fa268dd1909973ba7eb4bdf41f6dcf2cfbe76ba9528b170f3fd79`, Python 3.11.18). It stays in the local Docker image cache. Containers were run with `--rm`, the project mounted read-only (`-v <project>:/work:ro`) and `PYTHONDONTWRITEBYTECODE=1`; `git status` showed no change afterwards.
- Git Bash needs `MSYS_NO_PATHCONV=1` and a Windows-style path for `-v` to avoid path mangling.
- Background processes started from the tool shell keep their own output buffered when piped (`| grep`); use `python -u` to see progress.

## 2026-11-06 20:18 UTC — step 3b (Docker test environment)
- Docker Compose 5.6.1 and buildx 0.38.1 are installed; Docker server 29.9.2 (Linux, WSL2, 16 CPUs, about 16.6 GB). Ports 5173 and 8080 were free (`netstat`).
- The test image `precip-forecast-tests:local` is built from `docker/Dockerfile`; the build context is about 1.9 kB because `docker/Dockerfile.dockerignore` lets only `requirements.txt` through (the Dockerfile-specific ignore file works, so the repo root needs no `.dockerignore`).
- Official test command (run from the repo root, any shell): `docker compose -f docker/compose.yaml run --rm tests`. In Git Bash set `MSYS_NO_PATHCONV=1` when calling `docker run -v` by hand; `docker compose` itself needed no workaround.

## 2026-11-06 ~23:02 UTC — facts found in steps 4-6 and the housekeeping (all by running commands)
- **Docker images in use** (digests in `docs/SOURCES.md`): `python:3.11-slim` (Python 3.11.18; built as `precip-forecast:local`, renamed from `precip-forecast-tests:local` in step S3), `node:22-slim` (`precip-frontend:local`), `nginx:stable-alpine` (nginx 1.30.6, user `nginx` uid 101), `mcr.microsoft.com/playwright:v1.65.0-noble` (`precip-playwright:local`). The Playwright image holds browser builds `chromium-1254`, `firefox-1572` (Firefox 159.0), `webkit-2388`, plus Xvfb and the Mesa libraries.
- **No GPU** on the server side is a project constraint (user, D23). All Docker browser runs use software rendering. The only real-GPU run was Microsoft Edge on the host (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, used through Playwright `channel: msedge`).
- **Firefox inside the Playwright container cannot create a WebGL context** (`FEATURE_FAILURE_WEBGL_EXHAUSTED_DRIVERS`) with default settings or with software-GL settings; a headed run under `xvfb-run` hung until killed. Chromium works there through its own software renderer (SwiftShader). Firefox must therefore be tested on a real machine.
- **Ports:** the Vite dev server (5173) listens on the IPv6 loopback `[::1]` on this machine because the config says `localhost`; `127.0.0.1:5173` does not answer. The nginx preview (8080) is published on `127.0.0.1` only. PowerShell 5.1 `Invoke-WebRequest http://localhost:8080` timed out (it tries IPv6 first); `curl` and browsers work. Both sites refuse connections through the PC's LAN address.
- **netstat in this tool shell does not list LISTENING sockets**, even for ports known to be open; use a connection test instead.
- **Stopping processes:** `TaskStop` on a background `vite` ended only its wrapper shell, not the `node` process (E021); a `timeout` that kills `docker compose run` leaves its container running (`docker rm -f` it). Find processes by command line (`Get-CimInstance Win32_Process`), and leave the user's own MCP-tool `node` processes alone.
- **Windows `node_modules` versus Linux:** the host's `frontend/node_modules` holds Windows binaries, so the Docker front-end images install their own copy at `/node_modules` and mount only specific project folders; mounting the whole project would shadow it.
- **Docker `--tmpfs` is `noexec` by default**; a throwaway container that runs compiled Python extensions (pip-audit) needed `--tmpfs /tmp:rw,exec`.
- **Node 22:** `node --test <directory>` runs the directory as a file and fails; use a glob (`tests/frontend/*.test.mjs`). Importing `maplibre-gl` needs named imports (no default export in v6).
- **Tool-shell limits:** a very large bash command with many heredocs fails to parse (use the editor tool or a script file in `<temp folder>`); `python3 - ... || python ...` fallbacks can fail silently (E022); `git` prints LF-to-CRLF warnings (autocrlf) that are harmless.
- **Clock:** `date -u` is used at every commit and for every record time; the commit times in `docs/PROGRESS.md` come from `git log`.

## 2026-11-06 ~23:55 UTC — step 7 export runs
- `docker compose -f docker/compose.yaml run --rm export` (no network, project read-only, `data/` writable) wrote 4281 files (36.0 MB) in 4 min 37 s through the Windows bind mount; the size probe (gzip level 9 over 8 layouts, about 1.6 GB) took 11 min and had to run in the background. A tool call that outlives its time limit is moved to the background; do not poll it, wait for its completion notice.
- The preview mounts `data/site` read-only; the export replaces that folder, so restart the preview (`down`, then `up -d preview`) after an export or it may keep showing the old inode.

## 2026-11-07 ~00:42 UTC — step 8 runs (facts found by running commands)
- **Clock:** `date -u` is the only clock to trust; my own sense of elapsed time was wrong twice (E024: a guessed 00:50 when it was 00:20; "6.7 h used" when it was 5.7 h).
- **Re-processing and re-exporting the real run** through the Windows bind mounts took about 7 minutes together (process about 3, export about 4); the export wrote 36.1 MB in 4281 files.
- **New compose services:** `frontend-check` (no network; `data/site` and `data/check` read-only) and `browser-checks`, which uses `network_mode: service:preview` so the browser sees the site as `http://localhost:8080`, a secure context for every engine (geolocation and clipboard-type APIs need that). Engines in the Playwright image: Chromium 158.0.8127.18, Firefox 159.0, WebKit 27.2.
- **Shell limits seen again:** a long heredoc passed to the Bash tool failed with "unexpected EOF"; the same text written with the file tool and run as a script worked. `docker compose run` and `git` print "LF will be replaced by CRLF" warnings on this Windows checkout (autocrlf); harmless, nothing was changed by them.
- **Local sites now:** http://localhost:8080 (Docker preview, left running for the user) serves the plan page; the Vite testing site on :5173 was not started in this step.

## 2026-11-07 13:18 UTC — preview server facts (step 9.3c-0, found by running)
- The nginx preview reads `config/headers.conf` (Content-Security-Policy and the other headers) only when the container starts: after changing the file run `docker compose -f docker/compose.yaml up -d --force-recreate preview`, or a real browser keeps enforcing the old policy (seen: the new reverse-geocoder host was blocked until the restart). The same restart is needed after every export (E029).
- Two real services were reached from the Docker browser container and from the host's Edge in the same checks (Open-Meteo geocoding, BigDataCloud reverse geocoding); both answered with CORS `*`.

## 2026-11-07 13:48 UTC — base map downloads (step 9.3d-1, found by running)
- The `basemap` service reaches `build.protomaps.com`, `github.com` (release asset, redirected to its CDN), `raw.githubusercontent.com` and `api.github.com` from the Docker container; the three downloads need about 20 MB plus the extract (15-190 MB) and took under a minute here.
- The project folder is mounted read-only inside the service (as in every Python service), so a tool that needs to write a file into `config/` fails: results go under `data/` and are copied by hand. The host's default Python is 3.10 (no `tomllib`): use `.venv/Scripts/python.exe` or Docker to read the TOML files. A Python script run in a container with a pipe buffers its output until it ends: use `python -u`.
- Disk: `data/basemap/` holds the three measuring extracts (250 MB together) plus the assets and the tool (17 MB).
