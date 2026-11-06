# SECURITY

Audit of everything built up to commit `dc2535c` (steps 1-4 and 3b). Written 2026-11-06 ~20:41 UTC at the user's request, before step 5.
Severity is the AI's own judgement (Critical / High / Medium / Low / Info). **No Critical or High finding was found, but several areas could not be checked yet because they do not exist** (see "Could not check").

## What exists today (so you know what the audit could cover)
A Python pipeline (`pipeline/`) that downloads public ECMWF files and processes them, tests, Docker files, config and docs. **There is no web server, no API endpoint, no query parameter, no front end, no hosting and no GitHub repo yet.** So input validation on endpoints, CORS, rate limiting, HTTPS and security headers have nothing to attack today; they are listed as requirements for the later steps (section "Controls for what is not built yet") and are not claimed as verified.

## Findings

| ID | Severity | Where | Finding | Fix (in PLAN-005) | Status |
|---|---|---|---|---|---|
| S01 | Medium | `pipeline/fetch.py` -> ecmwf-opendata client -> multiurl | **No network timeouts.** The client calls `session.head(url, verify=...)` and `download(...)` without a timeout and multiurl's default is `timeout=None`. A server that accepts a connection and then stalls would hang the fetch forever; in the scheduled job the run would never finish and no data would refresh. | Session subclass that adds a connect/read timeout (values in `config/pipeline.toml`) to every request, plus a job-level time limit later; test with a local server that stalls. | **fixed in step S2** (`_TimeoutSession`, config `connect_timeout_seconds` / `read_timeout_seconds`) |
| S02 | Medium | `requirements.txt`, Docker build | **Supply chain.** Versions are pinned but there are no hashes (decision D7, a known shortcut), so a replaced package at the same version would not be noticed. 19 of 23 packages (25 on Linux) are transitive and were not vetted one by one. **No vulnerability scan has been run on the pins.** | Run a vulnerability scan (needs your approval: it sends package names and versions to a public service); offer hashes for the Linux/Docker set. You choose. | open |
| S03 | Medium | `docker/Dockerfile`, `docker/compose.yaml` | **Untrusted files parsed as root with network and a writable folder.** GRIB files from the internet are decoded by `eccodes` (a C library). The container user is root (uid 0, checked), and the `run` service has network access and a writable `data/` mount. A parser bug in a bad file would run with those rights. No `cap_drop`, `no-new-privileges` or read-only root filesystem is set. Processing needs no network at all. | Non-root user; drop all capabilities; `no-new-privileges`; read-only root filesystem with a temp dir; split `run` into `fetch` (network) and `process` (no network). | open |
| S04 | Medium (if built as proposed) | decision D9 addendum, step 7/10 | **Planned public status record could leak internals.** The proposal publishes "last error text" next to the data. Error text contains URLs, paths and library messages, and the site will be public. | Publish only an error category and time; full text stays in the job log. Needs your confirmation. | open (design) |
| S05 | Low | `.gitignore` | `.env` and `.env.*` are ignored, but `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa*`, `credentials*` are not (checked: `git check-ignore site.pem` printed nothing). There is also no automatic secret scan. | Add the patterns; add a test that scans the repo files for key formats (including Hugging Face and GitHub tokens) and runs with the Docker tests. | **fixed in step S1** (ignore patterns + secret-scan test, `tests/hygiene/`) |
| S06 | Low (privacy; your decision) | git history, `docs/` | **Personal data becomes public when the repo is pushed.** The author e-mail of all 14 commits is your Gmail address. Your full name is in the four plan files. Local paths and the machine name were in `docs/ENVIRONMENT.md` and `docs/PROGRESS.md`; the session id and log path are required by the submission checklist. | Options for you: keep as is; use a GitHub "noreply" address for new commits; or also rewrite the 14 local commits before the first push (changes every commit hash quoted in the docs). | needs your decision |
| S07 | Low | your shell environment | Three token-like environment variables exist in this shell (names and values not recorded here, values never printed). Verified their values do **not** appear in the session log, the project files or any commit. They would leak if a command printed the environment or a container was started with the host environment. | The compose files pass only named variables (checked: only `PYTHONDONTWRITEBYTECODE`); rule: never print `env`; the future workflow uses no secrets. | no code change; keep the rule |
| S08 | Low | `docker/Dockerfile` | The base image is pinned by digest (good for reproducibility) but then gets no Debian/Python security updates until someone changes the digest. It was built 2026-11-05. | Note in README; re-pull and re-test the digest before submission. | open |
| S09 | Info | `pipeline/` error messages | Error text (e.g. `UnexpectedStatus: HEAD <url> answered 503`, local paths in `ValueError`) goes to the console/job log only. Nothing is shown to visitors because there is no server. The logs of a public repo's workflow runs are public. | Keep logs free of environment dumps (`set -x`, `env`) in the workflow; D9 already keeps technical text out of the UI. | ok for now |

## Verified (command and result)
- **Secrets in git history and files:** 14 commits scanned (`git grep` over every commit) for AWS, GitHub, OpenAI-style, Slack, Google, private-key and JWT formats: **0 matches**. Keyword search (password, secret, token, api key, bearer, authorization): only prose (a `.gitignore` comment, plan text about "secret search"). No `.env`, `.pem` or `.key` file exists in the project outside `.venv`/`.git`. No tracked file is named like a credential.
- **Session log (6.3 MB):** 0 matches for the key formats above; the e-mail address appears on 9 lines; the values of the three token-like environment variables appear **0 times** in the log, the project tree (excluding `.venv`, `.git`, `data`) and all commits. Not covered: secret formats I did not list.
- **`.gitignore` works** for `.env`, `.env.local`, `config/.env`, `data/raw/*`, `.claude/*` (`git check-ignore -v`). `.claude/settings.local.json` is not tracked.
- **TLS:** the client passes `verify=True` on every call (read in `ecmwf/opendata/client.py` and `multiurl/http.py`); all source URLs in `urls.py` are `https://` (the default is `https://data.ecmwf.int/forecasts`). My own code never sets `verify=False`.
- **Dangerous calls:** no `eval`, `exec`, `pickle`, `subprocess`, `shell=True`, `os.system`, `yaml.load`, `input()` or `urlopen` in `pipeline/` or `tests/` (grep). `np.load` defaults to `allow_pickle=False` in the installed numpy 2.4.6 (checked), and no code loads with pickle on.
- **Input handling today:** the only command-line input is the optional run id of `python -m pipeline.processed`, parsed with a strict `strptime("%Y%m%d%H")` before it is used in a path; model names, URLs and paths come from `config/pipeline.toml`. A GRIB file is checked before its values are read: shortName, stepType, startStep, run time, grid layout and units must match, otherwise the run stops (tests in `tests/pipeline/`).
- **Downloaded data handling:** downloads go to a `.part` file, are checked for the exact expected steps, and only then renamed (E008); they land in the git-ignored `data/`. The tests container has **no network** and a **read-only** project mount (checked in step 3b).
- **Package vetting:** the 4 packages chosen first (ecmwf-opendata, eccodes, numpy, pytest) and the 2 Linux-only packages (eccodeslib, eckitlib) were checked on the official PyPI JSON API and against their GitHub source before installation (`docs/SOURCES.md`). The other 19 packages were installed by pip as dependencies and **not** vetted one by one. This includes `requests`, which `pipeline/fetch.py` now imports directly (since E008), so it is a gap in the vetting rule: it should have been vetted when it became a direct dependency.
- **Container user:** `docker compose run --rm tests python -c "import os; print(os.getuid())"` printed `0` (root).

## Could not check (and why)
- **Known vulnerabilities in the pinned packages:** no scanner was run. The usual tool (`pip-audit`) is not installed and running it sends data to an outside service, which needs your approval.
- **Whether ECMWF publishes checksums for the files:** the client does not use any and I did not look on the site. Integrity today rests on TLS plus the structural checks above.
- **HTTPS, security headers, CORS, rate limiting, error pages of a live site:** no host exists. These depend on the hosting choice in step 11.
- **Front-end issues** (XSS, CSP, third-party requests, geolocation privacy): no front end exists yet.
- **GitHub account and repo settings** (private e-mail setting, branch protection, Actions permissions): I am not logged in (`gh auth status`) and no repo exists.
- **npm packages:** none installed yet.
- **Your machine:** Docker Desktop and Windows security settings are outside this audit.
- **Secrets of unknown format** in the session log or files: only the listed formats and the three known environment values were searched.

## Public versus private
| Item | Will be public? | Note |
|---|---|---|
| Source code, `config/`, `docs/`, `tests/`, `docker/`, plan files | Yes, in the public repo | Contains your name, machine name and local paths (S06) |
| Git commit history | Yes | Author e-mail on every commit (S06) |
| Processed forecast data / manifest (`data/site/`) | Yes, on the host | ECMWF open data, CC BY 4.0; no personal data |
| Raw downloads and processed arrays (`data/raw`, `data/processed`) | No | Git-ignored |
| `.claude/` (local Claude settings), `.venv/` | No | Git-ignored |
| Session log (`.jsonl`) | Not in the repo; shared with reviewers on submission | Contains the whole conversation, your e-mail on 9 lines (S06) |
| Visitor location | Never leaves the browser by design (D2/D3), unless a search or tile service is used (see below) | |

## Controls for what is not built yet (requirements for the next plans)
- **Static site, no server:** no endpoint, query parameter or server-side validation exists. The browser code must still treat the manifest and tile files as untrusted: check array bounds and sizes, clamp latitude/longitude, and write place names with `textContent`, never `innerHTML`.
- **Hosting (step 11 gate):** must serve HTTPS only. Prefer a host that can set response headers (`Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`); a host that cannot (some static hosts) needs a CSP `<meta>` tag instead. CORS: the data is public, so `Access-Control-Allow-Origin: *` on data files is acceptable if another origin must read them; none is needed if the site and data share an origin. Rate limiting is the host's/CDN's job; the app has nothing to rate-limit.
- **Third-party requests (step 6 gate):** map tiles and geocoding services learn the visitor's IP and viewport or typed place. Prefer a self-hosted basemap and a bundled city list; if a service is used, say so on the page.
- **npm (step 6):** exact versions, lockfile, `npm ci`, install scripts off where possible, each package checked on the registry before use. Keep the Vite dev server bound to localhost (dev servers have been reported to expose files when exposed to a network; this is general knowledge, not checked in this session).
- **GitHub Actions (step 11):** least-privilege `permissions:`, third-party actions pinned to a commit and vetted, no `pull_request_target`, a time limit on every job, no secrets needed, no environment dumps in logs.
