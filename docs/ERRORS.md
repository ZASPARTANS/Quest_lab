# ERRORS

Summary (update with every change). `fix worked / fix tried` counts only what actually happened.

| ID | Short error | seen | fix worked / tried |
|---|---|---|---|
| E001 | Python 3.10 `pip` crashes: `No module named 'pip._vendor.pyparsing.core'` | 1 | 1/1 (workaround: use Python 3.11) |
| E002 | PLAN-001 had no folder layout or config-file rule (planning gap) | 1 | 1/1 (PLAN-002 step 1b, root check passed) |
| E003 | `FileNotFoundError: '/tmp/problem_blob.txt'` (Windows Python cannot see Git Bash paths) | 1 | 1/1 (pipe data via stdin) |
| E004 | `FileNotFoundError: [WinError 2]` from `subprocess.run(['.venv/Scripts/python.exe', ...])` | 1 | 1/1 (use `sys.executable`) |
| E005 | AI expected 13 `##` headings in CLAUDE.md after the edit; it was 14 (AI miscounted) | 1 | 1/1 (recounted: original had 13) |
| E006 | Plan assumption A1 wrong: AIFS `tp` is in `kg m**-2` (mm), not metres like IFS | 1 | 0/0 (fix = PLAN-003, awaiting approval) |

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
