# PROGRESS

## Time budget (72 h)
- First user prompt (from the session log): **2026-11-06T18:19:13.452Z**
- Session ID: `3e56a452-e5f8-4bb9-b353-63bad43748f4`
- Log file: `E:\Self_Code_AI\quest_Lab\Main_creden\projects\E--Self-Code-AI-quest-Lab-Project\3e56a452-e5f8-4bb9-b353-63bad43748f4.jsonl`
- Deadline (first prompt + 72 h): **2026-11-09T18:19:13Z**
- Warnings due at 24 h (2026-11-07 18:19Z), 48 h (2026-11-08 18:19Z), 60 h (2026-11-09 06:19Z). No new features after hour 64 (2026-11-09 10:19Z).

| Date/time (UTC) | Event | Elapsed | Remaining |
|---|---|---|---|
| 2026-11-06 18:19 | First prompt (from log) | 0.0 h | 72.0 h |
| 2026-11-06 18:19 | `date -u` at first turn, same session ID | ~0.0 h | ~72.0 h |
| 2026-11-06 18:43 | Commit `ccb24df` (step 1, first commit) | 0.41 h | 71.59 h |
| 2026-11-06 ~18:45 | Commit `591a24c` (step 1 record) | 0.43 h | 71.57 h |
| 2026-11-06 18:50 | Commit `7a83bb9` (step 1b: PLAN-002, D5, D6, E002, README) | 0.52 h | 71.48 h |
| 2026-11-06 ~18:53 | Commit `ba581ee` (step 1b done-check results) | 0.56 h | 71.44 h |
| 2026-11-06 19:06 | Commit `785e774` (step 2: Python 3.11 venv, pinned requirements) | 0.79 h | 71.21 h |
| 2026-11-06 19:16 | Commit `fc08c94` (step 3: fetch IFS and AIFS precipitation) | 0.96 h | 71.04 h |
| 2026-11-06 19:20 | Commit `1c495fc` (PLAN-003 adopted) | 1.03 h | 70.97 h |
| 2026-11-06 19:41 | Commit `ca6cd60` (step 3 follow-up verification records) | 1.37 h | 70.63 h |
| 2026-11-06 19:52 | Commit "Fix E008 and E009 in the fetch step..." (hash: see `git log`) | 1.56 h | 70.44 h |

## E008 and E009 fixes (asked for by the user; run 2026-11-06 ~19:45-19:53 UTC)
Files changed: `pipeline/fetch.py` (190 lines), `config/pipeline.toml`, `requirements.txt` (`requests` moved to the direct section: it is now imported directly), new `tests/pipeline/test_fetch_failures.py` (140 lines). Details and counters: ERRORS.md E008, E009; decision D8.
- Tests: `pytest -q` -> `20 passed in 3.42s` on Windows (9 old + 11 new); the same suite in the `python:3.11-slim` Docker image -> `20 passed in 5.03s`, `pip check` clean.
- E008 on real data: truncated the real 12z AIFS file to half (14,750,374 of 29,500,748 bytes) and ran `python -m pipeline.fetch`: IFS `(reused)`, AIFS `(downloaded)`, final file byte-identical (same size, same sha256 prefix), no `.part` left. **Fixed.**
- E009 end to end (local servers, real config values): always-503 -> `UnexpectedStatus` after 0.0 s; always-404 -> `ValueError: no run is complete for every model` after 0.8 s; dead port -> `ConnectionError` after 9.1 s. Real server: search found the 12z run (published about 19:34) at 19:49 UTC with 64 and 60 steps. **Fixed.**
- `requirements.txt` pins equal `pip freeze` (diff printed nothing). Root check: only the allowed entries. `data/` untracked and ignored.
- Not tested: a real network cut in the middle of a download; the original multi-hour 503 worst case (an extrapolation) was not reproduced.
- **Still open: E007 (IFS to 360 h).** The user wants it done only if the 240 h setup works perfectly after these fixes. Evidence now: two full real runs (00z and 12z) with all steps, 20 passing tests on Windows and Linux, recovery from a corrupted file, fail-fast on server trouble. It needs a plan revision (PLAN-004) and the user's approval before any change.

## Step 3 follow-up verification (asked for by the user; run 2026-11-06 ~19:25-19:41 UTC)
The four items listed as "NOT verified" in the step 3 results below were checked. Details: DOMAIN.md (follow-up section), ERRORS.md (E007-E009), ENVIRONMENT.md (Docker).
- **Linux: PASSED** in the `python:3.11-slim` Docker image (Python 3.11.18): install, `pip check`, `eccodes` 2.50.0 import, `9 passed`, real GRIB files decoded with identical counts, units and grid. Repo untouched (`git status` 0 lines).
- **12z IFS step list: PASSED, with a surprise.** Yesterday's 12z and 00z runs contain all 64 configured IFS steps and AIFS 60/60. IFS also has 20 more files (246..360 h) that contain `tp` (E007). **Needs your decision.**
- **Publication lag: MEASURED (one run).** 12z IFS appeared between 19:33 and 19:35 UTC (about 7 h 34 min after run time); 12z AIFS was already complete at the first poll (<= 7 h 09 min). Suggests starting checks about 07:45 and 19:45 UTC.
- **Error handling: 2 PROBLEMS FOUND, 2 cases fine.** Dead server: loud `ConnectionError` after 26 s (fine). Missing file: `HTTPError 404` after 1.2 s, no file left (fine). Truncated raw file: `download_run` crashes with `PrematureEndOfFileError` (E008, bug). HTTP 503: client retries each file check about 20 s and then silently falls back to an older run (E009; total hang time extrapolated, not measured). **No fix applied yet.**
- Steps 4+ have NOT started. Step 3 stays "done" for its own done-check; E007-E009 are open and listed in ERRORS.md.

## Step 1 done-check results (run 2026-11-06 ~18:44 UTC)
- `git status --short | wc -l` after commit: `0` (clean).
- `git check-ignore -v .claude/settings.local.json`: `.gitignore:2:.claude/` (matched); `git ls-files | grep -c '^.claude'`: `0` (nothing under `.claude/` is tracked).
- `git show --stat HEAD` lists `docs/PROBLEM.md` (1 line).
- Byte comparison: `git show HEAD:docs/PROBLEM.md` piped into Python equals the problem statement exactly (217 bytes, no CR). Note: the pasted statement was wrapped over two lines by the terminal; it is saved as one line.
- Tests: none exist yet (no source code), so none were run. Line counts: no source files yet.

## Step 1b done-check results (run 2026-11-06 ~18:51 UTC)
- Root check `git ls-files | cut -d/ -f1 | sort -u` printed only `.gitignore`, `README.md`, `docs`. `ls -A` shows also `.claude` and `.git`, both untracked/internal (`.claude/` is ignored).
- `git check-ignore -v data/site/x data/raw/x .claude/settings.local.json`: all three matched (`.gitignore:20:/data/` twice, `.gitignore:2:.claude/`). `docs/PROGRESS.md` is not ignored.
- `git status --short | wc -l` after commit `7a83bb9`: `0`.
- `git diff ccb24df HEAD -- docs/plans/PLAN-001.md`: empty, so the superseded plan file is untouched.
- Diff of the approved plan text against committed `docs/plans/PLAN-002.md`: only the header lines (Drafted, Written, Approval) differ; the body is identical.
- Global `CLAUDE.md`: the new "File structure — MANDATORY" section was the only change (8 added lines, 0 removed, diff run before deleting the backup). Heading count is now 14 (was 13).
- No git remote exists (`git remote -v` prints nothing). Nothing has been pushed. The GitHub repo link will be given by the user later; repo creation and push still need the user's approval (plan step 11).
- Tests: none exist yet. Line counts: no source files yet.

## Step 2 done-check results (run 2026-11-06 ~19:05 UTC)
- Venv: `py -3.11 -m venv .venv` inside the project (git-ignored: `.gitignore:9:.venv/`). Python 3.11.9, pip 24.0.
- `.venv/Scripts/python.exe -c "import eccodes; print(eccodes.codes_get_api_version())"` printed `2.50.0` (also numpy 2.4.6). `findlibs.find('eccodes')` returned `None` and `eccodes.dll` sits inside the wheel's folder, so the library is bundled (A5 holds on Windows; Linux not yet checked).
- `pip check`: "No broken requirements found".
- `requirements.txt` pins 23 packages (4 direct, 19 transitive). A throwaway venv built only from it gave a `pip freeze` identical to the real venv (`diff` printed nothing; 23 lines each). Two transient `getaddrinfo failed` retries during that install; pip recovered.
- A4 (client downloads only the requested messages): confirmed by reading `ecmwf/opendata/client.py` `get_parts`; not yet run against the server.
- `pytest -q`: no tests collected, exit code 5, `PytestConfigWarning: No files were found in testpaths` (expected: `tests/` is created in step 4).
- Surprise: numpy 2.5.4 (newest) needs Python >= 3.12; pip chose 2.4.6 (recorded in D7, SOURCES).
- Line counts: no source files yet (`pyproject.toml` is 11 lines, config only).

## Step 3 done-check results (run 2026-11-06 ~19:11 UTC)
- Command: `.venv/Scripts/python.exe -m pipeline.fetch` (about 49 s). It printed: latest run complete for all models = **2026-11-06 00:00 UTC** (checked at 19:11 UTC).
- IFS: 64 messages, 34.54 MB. AIFS: 60 messages, 29.51 MB. Total 64.05 MB. "steps missing vs config: []" and "unexpected: []" for both models.
- eccodes key dump, both models: `shortName=tp`, `stepType=accum`, `startStep=0`, `gridType=regular_ll`, `Ni=1440`, `Nj=721`, `dataDate=20261106`, `dataTime=0`. **units: IFS `m`, AIFS `kg m**-2`** (differs from assumption A1: see E006). IFS endStep 3..240 with gaps {3, 6}; AIFS 6..360 with gaps {6}.
- Units cross-checked against values (area-weighted global mean of cumulative tp, IFS x1000 vs AIFS): 6 h 0.71 vs 0.71 mm; 120 h 15.57 vs 15.94 mm; 240 h 30.89 vs 31.49 mm. The keys are right.
- Hard-coded check: `grep -n -wiE "https?|ifs|aifs-single|aifs|data\.ecmwf" pipeline/*.py` printed nothing; URLs and model names come from `config/pipeline.toml` and the client.
- Tests: `pytest -q` -> `9 passed in 0.72s` (step expansion, bad ranges, real-config step counts 64 and 60, run selection incl. the "12z not published by one model" case, step check).
- Line counts: `pipeline/fetch.py` 144, `tests/pipeline/test_fetch.py` 57, `config/pipeline.toml` 30 (limits 300/50-line functions respected; longest function `summarise` is about 17 lines).
- Root check: only `.gitignore`, `README.md`, `config`, `docs`, `pipeline`, `pyproject.toml`, `requirements.txt`, `tests`. `data/` is untracked and ignored (not in `git status`).
- NOT verified: behaviour when the server is slow or a file is missing mid-download (retries set to 3 x 10 s; not exercised); the 12z IFS step list; Linux.
- **Open problem (resolved in the plan, not yet in code):** assumption A1 was wrong for AIFS (E006). PLAN-003 was approved 2026-11-06 ~19:20 UTC; the fix is applied and tested in step 4.

## Current plan
**`docs/plans/PLAN-003.md`** — approved by the user 2026-11-06 ~19:20 UTC (replaces PLAN-002: assumption A1, units per model, see E006). Status: in progress; steps 1, 1b, 2, 3 done.

`docs/plans/PLAN-002.md` — approved 2026-11-06 ~18:49 UTC. **Status: superseded by PLAN-003** (reason: A1 wrong for AIFS units; see E006). Steps 1b, 2, 3 were completed under it and carried over.

`docs/plans/PLAN-001.md` — approved 2026-11-06 ~18:42 UTC. **Status: superseded by PLAN-002** (reason: no folder layout; see E002). Step 1 of PLAN-001 was completed and is carried over.

| Step | What | Status |
|---|---|---|
| 1 | Repo + records (git init, .gitignore, PROBLEM.md, DECISIONS, ERRORS, first commit) | **done** 2026-11-06 18:43 UTC, commit `ccb24df` |
| 1b | Apply folder layout (PLAN-002: D5, E002, README, .gitignore) | **done** 2026-11-06 18:50 UTC, commit `7a83bb9` |
| 2 | Python environment + pinned packages | **done** 2026-11-06 19:06 UTC (commit "Step 2: Python 3.11 virtual environment...") |
| 3 | Fetch (IFS + AIFS `tp`) | **done** 2026-11-06 19:16 UTC (commit `fc08c94`) |
| 4 | Processing core + tests (units per model, PLAN-003) | not started |
| 5 | Independent validation | not started |
| 6 | Front-end spike + decision gate | not started |
| 7 | Static data export | not started |
| 8 | Location panel | not started |
| 9 | Map / globe views | not started |
| 10 | Provenance + honesty UI | not started |
| 11 | Hosting gate + deploy | not started |
| 12 | README + submission | not started |

Note: the built-in todo/task-list tool is not available in this session's tool set, so this table is the only live step list.

## Status
- Environment check done and recorded in `docs/ENVIRONMENT.md`.
- Read-only probe of the ECMWF Open Data server done; findings in `docs/DOMAIN.md`, source in `docs/SOURCES.md`.
- Git repo initialised (branch `main`), first commit `ccb24df`. No remote yet (GitHub login and repo creation are plan step 11, needing the user's approval).

## Decisions waiting / recorded since last commit
- D9 (user): out-of-date forecast shows a short plain-language warning only, no technical detail (see DECISIONS.md). Applies to plan step 10.
- D9 addendum (user): technical error detail must remain available to developers (job log now; a status record next to the data is proposed for step 7/10, to be confirmed).
- Waiting for the user: whether to write PLAN-004 to extend IFS to 360 h (E007), or go straight to step 4.

## Known issues
- Python 3.10 pip is broken; use `py -3.11` (see ENVIRONMENT.md).
