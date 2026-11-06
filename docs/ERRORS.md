# ERRORS

Summary (update with every change). `fix worked / fix tried` counts only what actually happened.

| ID | Short error | seen | fix worked / tried |
|---|---|---|---|
| E001 | Python 3.10 `pip` crashes: `No module named 'pip._vendor.pyparsing.core'` | 1 | 1/1 (workaround: use Python 3.11) |
| E002 | PLAN-001 had no folder layout or config-file rule (planning gap) | 1 | 1/1 (PLAN-002 step 1b, root check passed) |
| E003 | `FileNotFoundError: '/tmp/problem_blob.txt'` (Windows Python cannot see Git Bash paths) | 1 | 1/1 (pipe data via stdin) |
| E004 | `FileNotFoundError: [WinError 2]` from `subprocess.run(['.venv/Scripts/python.exe', ...])` | 1 | 1/1 (use `sys.executable`) |
| E005 | AI expected 13 `##` headings in CLAUDE.md after the edit; it was 14 (AI miscounted) | 1 | 1/1 (recounted: original had 13) |
| E006 | Plan assumption A1 wrong: AIFS `tp` is in `kg m**-2` (mm), not metres like IFS | 1 | 1/1 (per-message unit conversion, step 4) |
| E007 | Assumption A3 wrong: IFS has `tp` files up to 360 h, not 240 h (config stops at 240 h) | 1 | 0/0 (needs user decision) |
| E008 | `PrematureEndOfFileError` crash: `download_run` cannot recover from a truncated `tp.grib2` | 1 | 1/1 (atomic download + `is_complete`) |
| E009 | During HTTP 503 the client retries every file check (about 20 s each) and then silently treats the run as incomplete | 1 | 1/1 (strict fail-fast search session) |
| E010 | PLAN-003 had no local preview of the site and no containerised test run (planning gap; user added both) | 1 | 1/1 (Docker test run in step 3b; localhost sites in step 6) |
| E011 | `requirements.txt` was pinned from the Windows package set only; Linux installs 2 more unpinned packages (eccodeslib, eckitlib) | 1 | 1/1 (pinned with a `sys_platform == "linux"` marker) |
| E012 | Longitude start assumed to be 0 in my first picture of the grid; both models start at 180 (caught by the planned A2 check, before any output) | 1 | 1/1 (layout in config, checked per message; index verified against eccodes) |
| E013 | PLAN-001 to PLAN-004 had no security work or security notes (planning gap; user raised it) | 1 | 1/1 (PLAN-005 steps S1-S5 done; security note in every plan, D15) |
| E014 | `requests` became a direct dependency (E008) without being vetted on PyPI/GitHub as the package rule requires | 1 | 1/1 (vetted in step S4; recorded in SOURCES.md) |
| E015 | `save()` ignored errors when deleting an old output folder; with files left by another user the run died as a misleading `OSError: Directory not empty` | 1 | 1/1 (errors now surface; regression test) |
| E016 | Folder/file names (`tp.grib2`, `meta.json`, `%Y%m%d%H`, `.part`, ...) and the compose data mount were hardcoded, against the config-file rule (user reminder) | 1 | 1/1 (names moved to config `[paths]`, `pipeline/paths.py`, guard test) |
| E017 | MapLibre `Worker failed to load`: the bundler did not emit `maplibre-gl-worker.mjs` (and v6 has no default export) | 1 | 1/1 (`?url` import + `setWorkerUrl`) |
| E018 | nginx served `.mjs` as `application/octet-stream`; with `nosniff` the browser refuses the worker module | 1 | 1/1 (`types { text/javascript mjs; }`) |
| E019 | CesiumJS `Viewer` fails under a strict CSP: `Evaluating a string as JavaScript violates ... 'unsafe-eval'` (Knockout) | 1 | 1/1 (use `CesiumWidget` from `@cesium/engine`) |
| E020 | Vite in the read-only container: `ENOENT: mkdir '/node_modules/.vite-temp'` | 1 | 1/1 (tmpfs at that path) |
| E021 | I reported the dev server as stopped after checking only 127.0.0.1; it listened on ::1 and kept running (and `TaskStop` ended only the wrapper shell) | 1 | 1/1 (found by command line, stopped by PID, verified on ::1, 127.0.0.1 and localhost) |
| E022 | A throwaway Firefox script edit failed silently (`python3 - ... \|\| python ...` fallback), so two reported "variant" runs were the original configuration; killed runs left containers behind | 1 | 1/1 (script rewritten, each variant run once, containers removed) |

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
- 2026-11-06 ~19:11 UTC (step 3, GRIB key dump). seen: 1. fix worked / fix tried: 1/1 (see the step 4 result at the end of this entry).
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

## E006 result — step 4 (2026-11-06 ~20:32 UTC)
- Fix tried 1, worked 1: `pipeline/process.py` converts every message by its own `units` key using `[units_to_mm]` in `config/pipeline.toml` (`m` -> 1000, `kg m**-2` -> 1); an unknown unit raises `ValueError`.
- Evidence: the test `test_ifs_and_aifs_files_give_the_same_millimetres` builds one IFS-style file (paramId 228, metres) and one AIFS-style file (paramId 228228, kg m**-2) holding the same rain and reads both through the real reading path: both give 2.5 mm. `test_unit_factor_...` shows `mm` raises. Real run: global mean over 0-240 h is 3.10 mm/day (IFS) vs 3.16 mm/day (AIFS), 1.7 % apart; had one unit been wrong the two would differ by a factor of 1000.
- Changed lines: `config/pipeline.toml` ([units_to_mm]), new `pipeline/process.py`, `tests/pipeline/test_process.py`.

## E012 — Grid longitude does not start at 0 (assumption caught by the planned check)
- 2026-11-06 ~20:25 UTC (step 4, GRIB key dump). seen: 1. fix worked / fix tried: 1/1.
- What was assumed: a global ECMWF 0.25 degree grid would start at longitude 0 and run to 359.75 (my own first picture; the plan only said "verify row order and longitude start (A2)").
- What was found: `longitudeOfFirstGridPointInDegrees = 180.0`, last 179.75, in both models. Column 0 is 180 E, column 720 is 0 E. Using 0-based longitude would have placed every location half a world away without any error message.
- Root cause: an assumption from general knowledge, caught by the check the plan had asked for before any output was written.
- Fix: `[grid]` table in `config/pipeline.toml` (`lon_first = 180.0`); `pipeline/grid.py` checks the layout of every message and `latlon_to_index` uses `lon_first`. Re-ran: index equals `eccodes.codes_grib_find_nearest` at 12 points (wrap and poles included); tests in `tests/pipeline/test_grid.py` pass in Docker. Worked.
- Changed lines: `config/pipeline.toml` ([grid]), new `pipeline/grid.py`, `tests/pipeline/test_grid.py`.

## E013 — No security work in PLAN-001 to PLAN-004 (planning gap)
- 2026-11-06 ~20:35 UTC (user message before step 5). seen: 1. fix worked / fix tried: 1/1 (see the fix record at the end of this entry).
- What happened: four plans were approved with a secrets rule (CLAUDE.md) but no security review, no threat list, no hardening step and no security note. The user said "which I forgot to mention" and asked for an audit. A professional plan for a public web app should have proposed one without being asked, as with E002 (folder layout) and E010 (Docker, localhost).
- Evidence: the audit in `docs/SECURITY.md` found no Critical/High issue but nine findings (S01-S09), e.g. no request timeouts (S01) and a root container parsing downloaded files (S03).
- Fix: `docs/plans/PLAN-005.md` (draft, awaiting approval) with the fixes and a security note; from now on every plan carries a short security note (decision D15). Counters stay 0/0 until the fixes are applied and verified.

## E014 — `requests` used directly without being vetted
- 2026-11-06 ~20:36 UTC (found during the security audit). seen: 1. fix worked / fix tried: 1/1.
- What happened: `requests` was installed by pip as a dependency of ecmwf-opendata and listed under "transitive" in `docs/SOURCES.md`. In the E008/E009 fix I imported it directly in `pipeline/fetch.py` (the `_StrictSession` class) and moved it to the direct section of `requirements.txt`, but did not do the PyPI/GitHub check the package rule asks for.
- Root cause (AI): I treated "already installed" as "already vetted".
- Fix (step S4, ~21:12 UTC): `requests` 2.34.2 checked on the PyPI JSON API (name, version equals the installed one, licence, not yanked, source link psf/requests) and recorded in SOURCES.md. The GitHub repository itself was not read. The `pip-audit` scan found no known vulnerabilities in it. Worked.

## E015 — Output folder could not be replaced: error hidden, then "Directory not empty"
- 2026-11-06 ~21:01 UTC (step S3, first real `process` run as a non-root user). seen: 1. fix worked / fix tried: 1/1.
- Exact error: `OSError: [Errno 39] Directory not empty: '/work/data/processed/2026110612.part' -> '/work/data/processed/2026110612'` from `os.replace` in `pipeline/processed.py` `save()`.
- Root cause (two parts): (1) the old output folder and its files had been written earlier by the root container, so the new non-root user could not delete them (`PermissionError: [Errno 13] ... 'agreement.npy'`, found by trying `shutil.rmtree` as that user); (2) my step 4 code called `shutil.rmtree(..., ignore_errors=True)`, which swallowed that `PermissionError`, so the failure showed up one line later as the misleading "Directory not empty". Part (2) is an AI coding mistake: errors must not be hidden.
- Also: my first "hashes identical" check passed only because the old files were still there; I noticed, discarded it and repeated the check after the fix (the `processed_at` stamp in `meta.json` changed from 20:29:34Z to 21:04:12Z, hashes identical to step 4).
- Fix: `_remove_folder()` deletes without `ignore_errors`, so the real error stops the run; new test `test_an_old_folder_that_cannot_be_deleted_stops_the_run_with_the_real_error` (skipped on Windows). One-time repair of this machine's `data/` ownership with a root one-off container (`--user 0 --cap-add CHOWN ... chown -R 10001:10001 /work/data`). A clean clone has no root-owned leftovers.
- Re-ran: Docker tests 47 passed; with `ignore_errors=True` put back temporarily the new test fails with the very same "Directory not empty" error; real `process` run regenerated all four files.
- Changed lines: `pipeline/processed.py` (`_remove_folder`, 2 call sites), `tests/pipeline/test_processed.py` (+1 test).

## E016 — Hardcoded folder and file names (breaks the "settings in config files" rule)
- 2026-11-06 ~21:03 UTC (user message: "dont forget no HARDCODING THE PATH"; audit by grep). seen: 1. fix worked / fix tried: 1/1.
- What was found: no absolute path anywhere in `pipeline/`, but layout names were written in the code: `"tp.grib2"` (fetch.py, processed.py), the run-folder format `"%Y%m%d%H"` (3 places), the glob `"??????????"`, `".part"`, `"meta.json"`, `"agreement.npy"`, `f"{model}.npy"`; and `docker/compose.yaml` hardcoded the `../data` mount. The existing rule (CLAUDE.md, "File structure") already said paths and settings live in config files, so this is my violation, not a new requirement.
- Root cause (AI): I put only the two top-level folders in the config and treated the names inside them as code.
- Fix: `[paths]` in `config/pipeline.toml` now holds `run_folder_format`, `raw_file`, `partial_suffix`, `model_file`, `agreement_file`, `meta_file`; new `pipeline/paths.py` builds every path from them (`ROOT` is found from the file's own location); `fetch.py` and `processed.py` use it; the glob is replaced by parsing folder names; compose uses `${DATA_DIR:-../data}`. New tests `tests/pipeline/test_paths.py` (names follow a changed config) and `tests/hygiene/test_no_hardcoded_paths.py` (fails if a config name appears as a string literal in `pipeline/*.py` or if an absolute path appears). The old tests no longer spell out the layout.
- Re-ran: Docker tests 51 passed; the guard test fails when `"tp.grib2"` or `"/work/data/raw"` / a Windows user-folder path is planted in `grid.py` (restored with `git checkout`); real `process` regenerated the run (`processed_at` 21:04:12Z -> 21:08:10Z) with sha256 identical to step 4; real `fetch` reused the run; `process 2026110600` works; `process not-a-run` stops with `ValueError: time data 'not-a-run' does not match format '%Y%m%d%H'`.
- Deliberate exception, stated plainly: the location of the config file itself (`ROOT / "config" / "pipeline.toml"` in `pipeline/fetch.py`, and the same pattern for `security.toml` and the guard tests) is fixed relative to the project folder, found from the code file's location. Also the container-side mount `/work/data` must match the first folder of the config paths (the compose file says so; a mismatch fails loudly because the project mount is read-only).
- Changed lines: `config/pipeline.toml` ([paths]), new `pipeline/paths.py`, `pipeline/fetch.py`, `pipeline/processed.py`, `docker/compose.yaml`, tests as above.

## E017 — MapLibre worker not loaded (and a wrong default import)
- 2026-11-06 ~21:57 UTC (step 6, first browser run). seen: 1. fix worked / fix tried: 1/1.
- Exact errors: build `[MISSING_EXPORT] "default" is not exported by "node_modules/maplibre-gl/dist/maplibre-gl.mjs"` (my wrong import: v6 has only named exports); then in the browser `Error: Worker failed to load. Check that the worker URL is correct.` with `request failed: .../assets/maplibre-gl-worker.mjs?v=6.16.0 net::ERR_FAILED`.
- Root cause: (AI) I assumed the v5-style default export from memory. MapLibre 6 locates its worker file at run time; Vite did not emit that file, so the request 404ed (the `.mjs` MIME problem of E018 was a second, separate blocker found by `curl`).
- Fix: `import { Map, setWorkerUrl } from 'maplibre-gl'` and `import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'; setWorkerUrl(workerUrl)`. Re-ran: the worker file appears in `dist/assets` and both MapLibre pages finish drawing in the browser with no errors. Worked.
- Changed lines: `frontend/spikes/maplibre.js`.

## E018 — nginx serves .mjs files as octet-stream
- 2026-11-06 ~21:58 UTC. seen: 1. fix worked / fix tried: 1/1.
- Evidence: `curl -I .../assets/maplibre-gl-worker-*.mjs` -> `Content-Type: application/octet-stream`; `grep mjs /etc/nginx/mime.types` -> no entry. With `X-Content-Type-Options: nosniff` a module worker with that type is refused.
- Fix: `types { text/javascript mjs; }` in `docker/nginx.conf`; re-checked: `.mjs` -> `text/javascript`, `.js`, `.css`, `.png` still correct. The public host (step 11) must serve `.mjs` as JavaScript too: added as a hosting criterion.
- Changed lines: `docker/nginx.conf`.

## E019 — CesiumJS Viewer needs 'unsafe-eval'
- 2026-11-06 ~21:59 UTC (browser run with the real security headers). seen: 1. fix worked / fix tried: 1/1.
- Exact error: `page error: Evaluating a string as JavaScript violates the following Content Security Policy directive because 'unsafe-eval' is not an allowed source of script`; the Cesium pages never became ready (92 s timeout).
- Root cause: found by searching the built bundle: Knockout (used by Cesium's `Viewer` widgets) runs `(0,eval)('this')` at load. The only other dynamic-code hits (`Function(...)`) are in the KTX2/Emscripten texture decoders, not used here.
- Fix: use `CesiumWidget` from `@cesium/engine` (no Knockout) and draw the outlines as polylines; no `'unsafe-eval'` in the policy. Re-ran: both Cesium pages finish drawing with the strict policy and no console errors. Worked. Consequence recorded in D21: Cesium's ready-made widgets (Viewer, timeline, geocoder) are not usable with a strict policy.
- Changed lines: `frontend/spikes/cesium.js`, `frontend/package.json` (+ `@cesium/engine`, `@cesium/core`).

## E020 — Vite cannot write its temporary config in the read-only container
- 2026-11-06 ~21:54 UTC. seen: 1. fix worked / fix tried: 1/1.
- Exact error: `Error: ENOENT: no such file or directory, mkdir '/node_modules/.vite-temp'` (Vite bundles `vite.config.js` into a temp folder beside the nearest `node_modules`, which is `/node_modules` in the image, read-only).
- Fix: an in-memory tmpfs mounted at `/node_modules/.vite-temp` in the `frontend-build` service; the rest of the file system stays read-only. Re-ran: build succeeds, no network. Worked.
- Changed lines: `docker/compose.yaml`.
- Also corrected on the way (small AI slips, same step): `node --test <directory>` is run as a file by Node 22 (use a glob); a large bash command with many heredocs failed to parse (files written with the editor instead); the first screenshot report counted the COOP warning against the site although it only came from the test browser reaching the site as `http://preview:8080` (the test browser now treats that origin as secure).

## E021 — Dev server reported stopped but still running
- 2026-11-06 ~22:18 UTC (step 6 clean-up). seen: 1. fix worked / fix tried: 1/1.
- What happened: after the first browser run I stopped the background task and later checked `http://127.0.0.1:5173/`, which did not answer, so I wrote "5173 not answering (stopped)". `curl http://localhost:5173/` had returned 200 right after the stop. The server listens on `[::1]` (the config says `localhost`), and `TaskStop` only ended the wrapper shell, not the `node` process. A later start failed with `Error: Port 5173 is already in use`, which exposed it.
- Root cause (AI): I verified on one address instead of the one the service uses, and trusted the task tool's "Successfully stopped".
- Fix: listed the node processes with their command lines (the user's own MCP-tool processes were left alone), stopped only `node node_modules\.bin/../vite/bin/vite.js` (PID 32912), verified no answer on `[::1]`, `127.0.0.1` and `localhost`; later starts record the PID and stop by PID.
- Also: I deleted two tracked evidence screenshots from the working tree during clean-up and restored them with `git checkout`.
- Changed lines: none (process handling).

### Fix record E010, localhost half (23:03 UTC, housekeeping)
- The localhost part of E010 was delivered in step 6 (decisions D19, D20, D22): the testing site on http://localhost:5173 (Vite, DEV badge) and the public-like site on http://localhost:8080 (Docker nginx) both answered 200 and were checked with real browsers. The Docker test run was delivered in step 3b. Both halves are now done: 1/1.

### Fix record E013 (23:03 UTC, housekeeping)
- PLAN-005 was approved (~20:51 UTC) and its steps S1-S5 were done and verified (`docs/PROGRESS.md`, `docs/SECURITY.md` statuses S01, S02, S03, S05 fixed, S06 accepted, S08 documented). Every plan since D15 carries a "Security note" (PLAN-005 does; no later plan file exists yet). Open security items that are not part of this error: S04 (design, to be confirmed at step 7/10) and S14 (hosting requirements, step 11).

## E022 — Throwaway Firefox script edit failed silently; stray containers
- 23:03 UTC (housekeeping, Firefox attempt). seen: 1. fix worked / fix tried: 1/1.
- What happened: I edited the one-off Firefox test script with a shell command of the form `python3 - ... || .venv/.../python.exe -I - ...`; the edit did not apply and nothing said so. The "variant" runs that followed were the original configuration, and I almost reported them as extra attempts. Separately, `timeout` killed the `docker compose run` client but not the containers, so two test containers kept running (one hung for minutes) until removed with `docker rm -f`.
- Root cause (AI): I did not check that the edit had applied (`grep variant` on the file) before running it, and I assumed that killing the client stops the container.
- Fix: rewrote the script file completely with the editor tool, then ran each of two software-GL variants once with a time limit and removed the leftover containers. Both variants failed to create WebGL (so Firefox stays untested in Docker), and the evidence of the earlier run is not counted.
- Changed lines: none in the repository (the script lives outside it in `C:\Users\NISHAANTH\AppData\Local\Temp` and was removed).
