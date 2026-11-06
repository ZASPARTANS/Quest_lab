# ENVIRONMENT

Everything below was found by running commands in this session. Times are UTC.

## 2026-11-06 18:19 UTC — initial check
- OS: Windows 11 Home Single Language 10.0.26300, 64-bit (`Get-CimInstance Win32_OperatingSystem`). Machine name NISHAANTH. RAM about 31.7 GB.
- Shells: PowerShell 5.1.26100.9818 (primary tool shell); Git Bash (GNU bash 5.3.15, MINGW64) for POSIX scripts.
- git 2.56.0.windows.1. `gh` 2.74.2 is installed but NOT logged in (`gh auth status`: "You are not logged into any GitHub hosts").
- Node v22.23.4, npm 10.9.9.
- Python: `python` = 3.10.11, `py -3.11` = 3.11.9.
- Free disk: C: 5.2 GB, D: 271.5 GB, E: 603.7 GB. Project is on E:, so space is not a constraint.
- Project folder `E:\Self_Code_AI\quest_Lab\Project`: not a git repo yet; contains only `.claude/settings.local.json`.
- Session log (`.jsonl`) is in `E:\Self_Code_AI\quest_Lab\Main_creden\projects\E--Self-Code-AI-quest-Lab-Project\` (config folder is `Main_creden`, not `~/.claude`).

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
- Shell note: Git Bash `mktemp -d` returns a short-name temp path (`NISHAA~1`); Windows warns that the venv location "may have moved due to redirects". Harmless.

## 2026-11-06 ~19:13 UTC — step 3
- Local clock vs servers: local `date -u` agreed with the PyPI `Date` header within about 8 seconds, so the clock used for the time budget is sound.
- Fetch of the `tp` messages of two models (about 64 MB) took about 49 s on this connection (about 5 MB/s). Free disk on E: is above 600 GB, so the data folder is not a space concern.
- The ecmwf-opendata client prints a long notice about the 500-connection limit and tqdm progress bars on stderr; harmless noise.
