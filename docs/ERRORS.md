# ERRORS

Summary (update with every change). `fix worked / fix tried` counts only what actually happened.

| ID | Short error | seen | fix worked / tried |
|---|---|---|---|
| E001 | Python 3.10 `pip` crashes: `No module named 'pip._vendor.pyparsing.core'` | 1 | 1/1 (workaround: use Python 3.11) |
| E002 | PLAN-001 had no folder layout or config-file rule (planning gap) | 1 | 1/1 (PLAN-002 step 1b, root check passed) |
| E003 | `FileNotFoundError: '/tmp/problem_blob.txt'` (Windows Python cannot see Git Bash paths) | 1 | 1/1 (pipe data via stdin) |
| E004 | `FileNotFoundError: [WinError 2]` from `subprocess.run(['.venv/Scripts/python.exe', ...])` | 1 | 1/1 (use `sys.executable`) |
| E005 | AI expected 13 `##` headings in CLAUDE.md after the edit; it was 14 (AI miscounted) | 1 | 1/1 (recounted: original had 13) |
| E006 | Plan assumption A1 wrong: AIFS `tp` is in `kg m**-2` (mm), not metres like IFS | 1 | 0/0 (fix = PLAN-003 approved; applied in step 4) |
| E007 | Assumption A3 wrong: IFS has `tp` files up to 360 h, not 240 h (config stops at 240 h) | 1 | 0/0 (needs user decision) |
| E008 | `PrematureEndOfFileError` crash: `download_run` cannot recover from a truncated `tp.grib2` | 1 | 1/1 (atomic download + `is_complete`) |
| E009 | During HTTP 503 the client retries every file check (about 20 s each) and then silently treats the run as incomplete | 1 | 1/1 (strict fail-fast search session) |
| E010 | PLAN-003 had no local preview of the site and no containerised test run (planning gap; user added both) | 1 | 1/1 (step 3b Docker test run works; localhost comes in step 6) |
| E011 | `requirements.txt` was pinned from the Windows package set only; Linux installs 2 more unpinned packages (eccodeslib, eckitlib) | 1 | 1/1 (pinned with a `sys_platform == "linux"` marker) |

---

## E001 — Python 3.10 pip is broken
- First seen: 2026-11-06 ~18:22 UTC while checking the environment. seen: 1. fix worked / fix tried: 1/1.
- Exact error: `ModuleNotFoundError: No module named 'pip._vendor.pyparsing.core'`, raised from `C:\Program Files\Python310\lib\site-packages\pip\_vendor\pyparsing\__init__.py` when running `python -m pip --version`.
- Root cause: not investigated. The system Python 3.10 install has a damaged vendored pyparsing inside pip.
- Fix chosen: do not repair it. Use Python 3.11 (`py -3.11`) in a virtual environment. This avoids the broken install rather than fixing it, so Python 3.10 pip is still broken.
- Fix attempt 1 (2026-11-06 ~18:22 UTC): ran `py -3.11 -m pip --version`; it printed `pip 24.0 ... (python 3.11)`. The failure no longer occurs on 3.11. Worked.
- Changed lines: none (environment only).

## E002 — PLAN-001 had no folder layout or config-file rule (planning gap)
- First seen: 2026-11-06 ~18:46 UTC, after plan step 1 was done. seen: 1. fix worked / fix tried: 1/1.
- What happened: PLAN-001 was approved without an agreed folder structure. It used ad hoc paths (`pipeline/export.py`, `site-data/`), mixed publishing with processing, and did not say that settings live in config files. The user then asked for a clean professional structure. A professional plan should have proposed one without being asked, so this is an AI planning gap, not only a late user requirement.
- Consequence: the first commit `ccb24df` was made before the layout existed. It holds only `.gitignore` and `docs/`, which already match the layout, so nothing has to move. History is not rewritten.
- Fix: PLAN-002 (supersedes PLAN-001) adds step 1b (layout D5, `config/`, `data/`, root check) and moves export to `backend/`. PLAN-001 is marked superseded in PROGRESS only; the file is untouched.
- Fix attempt 1 (2026-11-06 ~18:51 UTC): after commit `7a83bb9`, the root check showed only `.gitignore`, `README.md`, `docs`; `data/` and `.claude/` paths are ignored; the tree is clean. The gap (no agreed layout, no ignored data folder) is closed. Worked.
- Changed lines: `.gitignore` (`/site-data/` line removed, `/data/` comment added); new `README.md`; `docs/DECISIONS.md` D5 and D6.

## E003 — Windows Python cannot read Git Bash `/tmp` paths
- 2026-11-06 ~18:44 UTC (step 1 check). seen: 1. fix worked / fix tried: 1/1.
- Exact error: `FileNotFoundError: [Errno 2] No such file or directory: '/tmp/problem_blob.txt'`.
- Root cause (AI mistake): a bash command wrote to `/tmp/...` (a Git Bash path), then a Windows `python` tried to open the same string as a path. Windows Python does not know that mapping.
- Fix: pass the data through stdin (`git show ... | python -I -c "...sys.stdin.buffer.read()..."`). Re-ran: printed `committed blob identical: True`. Worked.
- Changed lines: none in the repo (one-off check command).

## E004 — `subprocess` could not start the venv interpreter by a relative forward-slash path
- 2026-11-06 ~18:57 UTC (step 2, generating requirements.txt). seen: 1. fix worked / fix tried: 1/1.
- Exact error: `FileNotFoundError: [WinError 2] The system cannot find the file specified` from `subprocess.run(['.venv/Scripts/python.exe','-m','pip','freeze'])`, run by the system Python 3.10 (`C:\Program Files\Python310\lib\subprocess.py`).
- Root cause (AI mistake): relative path with forward slashes handed to Windows `CreateProcess`, run from a different interpreter. Not investigated further.
- Fix: run the generator script with the venv's own interpreter and call `[sys.executable, '-m', 'pip', 'freeze']`. Re-ran: `requirements.txt` was written. Worked.
- Changed lines: none in the repo (one-off generator script; its output is `requirements.txt`).

## E005 — AI expected the wrong heading count after editing CLAUDE.md
- 2026-11-06 ~18:51 UTC (step 1b check). seen: 1. fix worked / fix tried: 1/1.
- What happened: the check was written as "expect 13 headings"; the real result was 14. The original file had 13 `##` headings (listed earlier at lines 5, 12, 26, 35, 41, 49, 52, 57, 62, 66, 72, 76, 86), so 14 is correct with the one new section. The edit was fine; the expectation was wrong.
- Fix: recounted from the earlier heading list and corrected the expectation in PROGRESS. Worked.
- Changed lines: none.

## E006 — Assumption A1 was half wrong: IFS and AIFS use different precipitation units
- 2026-11-06 ~19:11 UTC (step 3, GRIB key dump). seen: 1. fix worked / fix tried: 0/0 (the fix is a plan revision, PLAN-003, not yet approved or applied).
- What was assumed: PLAN-001/PLAN-002 assumption A1 said `tp` is in metres in both models, and step 4 said "m to mm".
- What was found (eccodes keys of the downloaded files): IFS `units = m`; AIFS `units = kg m**-2`. 1 kg m**-2 of water is 1 mm, so the AIFS values must NOT be multiplied by 1000. Converting both with the same factor would make AIFS 1000 times too large.
- Evidence the keys are right (values, not just labels): area-weighted global mean of the cumulative field at the same step: 6 h: IFS x1000 = 0.71 mm, AIFS = 0.71 mm; 120 h: 15.57 vs 15.94 mm; 240 h: 30.89 vs 31.49 mm.
- Root cause: an assumption made from general knowledge before looking at the files. The step-3 check did its job and caught it before any processing code existed, so no wrong output was produced.
- Planned fix (needs user approval as PLAN-003): step 4 reads each message's `units` key and converts to mm with a factor from `config/pipeline.toml` (`m` -> 1000, `kg m**-2` -> 1); an unknown unit stops the run; tests cover both units.
- Changed lines: none yet.
- Status 2026-11-06 ~19:21 UTC: PLAN-003 was approved by the user and written to `docs/plans/PLAN-003.md`. The code fix (per-message unit conversion from config, with tests) is done in step 4; the counters above change only after the failing case is re-run there.

## E007 — Assumption A3 was wrong: IFS runs to 360 h, not 240 h
- 2026-11-06 ~19:30 UTC (follow-up check of the 12z step list). seen: 1. fix worked / fix tried: 0/0.
- What was assumed: PLAN-001 to PLAN-003 and `config/pipeline.toml` say IFS has 3 h steps to 144 h and 6 h steps to 240 h. That came from probing only the 240 h file and from general knowledge; the files after 240 h were never probed.
- What was found: yesterday's complete 12z and 00z runs (2026-11-05) each have 84 IFS files: 3..144 every 3 h plus 150..360 every 6 h. All 64 configured steps exist and 20 more exist beyond them (246, 252, ..., 360). The index of today's 00z IFS 246/300/360 h files contains a `tp` message (about 0.6 MB each).
- Impact if the user agrees to use them: IFS and AIFS would overlap over 6..360 h (6-hourly), so the model-agreement bar can cover the full 15 days and the planned "AIFS only past 240 h" case disappears. About 12 MB more per run. Needs a plan revision because step 4, step 8 and A3 mention 240 h.
- Decision status: waiting for the user (extend to 360 h, or keep 240 h). No change made.
- Changed lines: none yet.

## E008 — A truncated raw file makes the fetch crash instead of re-downloading
- 2026-11-06 ~19:38 UTC (failure-mode test). seen: 1. fix worked / fix tried: 0/0.
- Exact error: `gribapi.errors.PrematureEndOfFileError: End of resource reached when reading message`, raised by `fetch.describe_messages` inside `fetch.download_run` (the reuse check) when `data/raw/.../tp.grib2` is cut in the middle of a message (test copy: 14,754,224 of 29,508,202 bytes).
- Root cause (AI): `download_run` writes straight to the final path and then, on the next run, assumes an existing file can be read. An interrupted download leaves a truncated file at the final path and every later run crashes until someone deletes it by hand. (Whether the client leaves partial files on a mid-stream cut was NOT tested; only the truncated-file reaction was.)
- Proposed fix: download to `tp.grib2.part`, rename to `tp.grib2` only after success; and treat an unreadable existing file as incomplete so it is downloaded again; add a test.
- Changed lines: none yet.

## E009 — HTTP 503 makes the run check very slow and can silently pick an older run
- 2026-11-06 ~19:40 UTC (failure-mode test). seen: 1. fix worked / fix tried: 0/0.
- Observed (config: 3 retries x 10 s): one HEAD request against a local server that always answers 503 returned `503` after 20.1 s without raising ("Recovering from HTTP error [503 Service Unavailable], attempt 1 of 3 ... attempt 2 of 3"). Against a dead port the same request raised `requests.exceptions.ConnectionError` after 26.1 s.
- Why it matters: the client's `latest()` sends one HEAD per step file (64 for IFS, 60 for AIFS) and evaluates all of them before judging. With 503 on every request that is about 64 x 20 s = 21 min for one pass of one model (an extrapolation, NOT measured end to end), repeated for up to two days back, two run hours and two models. A first attempt at the full test was stopped by me after about 7 minutes without any output, which fits that behaviour but does not prove it. Also, a 503 is not a 200, so `latest()` treats the run as incomplete and falls back to an older run without saying so.
- Proposed fix: for the run search use a client with 1 retry (fail fast), and stop with an error if any answer is neither 200 nor 404 instead of falling back; the scheduled job should fail loudly so the previous deployment stays live.
- Real-server cases that behaved well: a request for a file that does not exist (AIFS step 7) raised `requests.exceptions.HTTPError: 404 ... .index` after 1.2 s and left no file behind; 404 for unpublished files is not retried (the full run search took about 49 s).
- Changed lines: none yet.

### Fix record E008 (2026-11-06 ~19:50 UTC)
- Fix attempt 1: `pipeline/fetch.py` got `is_complete()` (catches `eccodes.CodesInternalError`, so a truncated or non-GRIB file counts as incomplete) and `download_run()` now downloads to `tp.grib2.part`, checks it with `is_complete`, and only then `os.replace`s it to `tp.grib2` (a `finally` removes the `.part`). 6 new tests in `tests/pipeline/test_fetch_failures.py` (truncated, garbage, interrupted, wrong steps, rename, reuse).
- Re-ran the failing case on real data: the 12z AIFS file (29,500,748 bytes, sha256 starting `f0a91853c6c494a8`) was cut in place to 14,750,374 bytes; `python -m pipeline.fetch` then printed `[ifs] ... (reused)` and `[aifs-single] ... (downloaded)`, and the new file had the same size and the same sha256 prefix. No `.part` file was left. **Worked.** fix worked / tried: 1/1.
- Not tested: an interruption in the middle of a real network download (only simulated by a fake client that writes half a file and raises).

### Fix record E009 (2026-11-06 ~19:52 UTC)
- Fix attempt 1: `config/pipeline.toml` got `search_max_retries = 2` and `search_retry_after_seconds = 5`. `pipeline/fetch.py` got `_StrictSession` (a `requests.Session` whose `head()` raises `UnexpectedStatus` for any status other than 200 or 404) and `_client(..., search=True)`, used only by `find_latest_run`. Downloads keep their own retry settings (3 x 10 s). 5 new tests (200/404 pass, 429/500/503 raise) with a local HTTP server.
- Re-ran the failing case end to end with the real `find_latest_run` and real config values against local servers: always-503 -> `pipeline.fetch.UnexpectedStatus` after 0.0 s (was: `503` returned after 20.1 s per request); always-404 -> `ValueError: no run is complete for every model` after 0.8 s; dead port -> `requests.exceptions.ConnectionError` after 9.1 s. Against the real server the search still works (run 1 and run 2 on 2026-11-06 ~19:49-19:50 UTC found the 12z run). **Worked.** fix worked / tried: 1/1.
- Trade-off accepted (decision D8): a single transient 503 now aborts the run instead of being retried for minutes; the scheduled job (step 11) simply runs again later.
- Not re-measured: the original multi-hour worst case was an extrapolation and was not reproduced end to end.

## E010 — PLAN-003 had no localhost preview and no Docker test run (planning gap)
- First seen: 2026-11-06 ~20:05 UTC, after the E008/E009 fixes. seen: 1. fix worked / fix tried: 0/0.
- What happened: the plan said to check the site with screenshots and to run tests from the Windows `.venv`. The user then asked for a localhost to check the site locally and for Docker to be used for all testing. The localhost need is something a web-app plan should have contained without being asked; the Docker request is a new user preference, and the earlier hand-typed Linux check should have become a repeatable command instead of a one-off.
- Fix: PLAN-004 (supersedes PLAN-003) adds step 3b (Docker test environment), the localhost design (decision D11) and Docker wording in later done-checks. PLAN-003 is marked superseded in PROGRESS only; the file is untouched.
- Changed lines: none yet; the fix is verified when step 3b's done-check passes.

### Fix record E010 (2026-11-06 20:18 UTC)
- Fix attempt 1: PLAN-004 step 3b created `docker/Dockerfile`, `docker/Dockerfile.dockerignore`, `docker/compose.yaml`. `docker compose -f docker/compose.yaml run --rm tests` printed `20 passed in 5.88s` (exit code 0). Partly closed: the Docker test run now exists; the localhost half of E010 is delivered in plan step 6, so the original gap is verified fixed only for testing. fix worked / tried: 1/1 counts the Docker half; the localhost half is still open and is tracked in PROGRESS.

## E011 — `requirements.txt` was pinned for Windows only; Linux installs two more packages
- 2026-11-06 20:18 UTC (step 3b, Docker build). seen: 1. fix worked / fix tried: 1/1.
- What happened: the Docker build log listed `eccodeslib-2.50.0.34` and `eckitlib-2.5.0.34` among the installed packages. They are not in `requirements.txt`, which was generated by `pip freeze` on Windows. `pip show` in the container: `eccodes` requires `eccodeslib`, which requires `eckitlib`; together they supply the C library that the Windows wheel bundles. So the claim "all 23 packages are pinned and a fresh venv is identical" (D7, step 2) was true for Windows only; on Linux those two were installed unpinned. The earlier hand-typed Docker checks also used them without my noticing, because I had hidden the install log.
- Root cause (AI): I generated the pin list on one platform and tested reproducibility on the same platform.
- Fix: added `eccodeslib==2.50.0.34; sys_platform == "linux"` and `eckitlib==2.5.0.34; sys_platform == "linux"` to `requirements.txt`, plus a header note.
- Re-ran: (1) rebuilt the image; `pip check` clean; (2) the Linux container's `pip freeze` equals the pins in `requirements.txt` (25 packages, `diff` printed nothing); (3) Windows `pip install --dry-run -r requirements.txt` installs nothing new (23 packages). **Worked.**
- Changed lines: `requirements.txt` (header note + 2 pin lines).
