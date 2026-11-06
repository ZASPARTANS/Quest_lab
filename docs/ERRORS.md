# ERRORS

Summary (update with every change). `fix worked / fix tried` counts only what actually happened.

| ID | Short error | seen | fix worked / tried |
|---|---|---|---|
| E001 | Python 3.10 `pip` crashes: `No module named 'pip._vendor.pyparsing.core'` | 1 | 1/1 (workaround: use Python 3.11) |
| E002 | PLAN-001 had no folder layout or config-file rule (planning gap) | 1 | 0/0 (fix = PLAN-002 step 1b, not yet verified) |

---

## E001 — Python 3.10 pip is broken
- First seen: 2026-11-06 ~18:22 UTC while checking the environment. seen: 1. fix worked / fix tried: 1/1.
- Exact error: `ModuleNotFoundError: No module named 'pip._vendor.pyparsing.core'`, raised from `C:\Program Files\Python310\lib\site-packages\pip\_vendor\pyparsing\__init__.py` when running `python -m pip --version`.
- Root cause: not investigated. The system Python 3.10 install has a damaged vendored pyparsing inside pip.
- Fix chosen: do not repair it. Use Python 3.11 (`py -3.11`) in a virtual environment. This avoids the broken install rather than fixing it, so Python 3.10 pip is still broken.
- Fix attempt 1 (2026-11-06 ~18:22 UTC): ran `py -3.11 -m pip --version`; it printed `pip 24.0 ... (python 3.11)`. The failure no longer occurs on 3.11. Worked.
- Changed lines: none (environment only).

## E002 — PLAN-001 had no folder layout or config-file rule (planning gap)
- First seen: 2026-11-06 ~18:46 UTC, after plan step 1 was done. seen: 1. fix worked / fix tried: 0/0 (fix is plan step 1b of PLAN-002, not yet verified).
- What happened: PLAN-001 was approved without an agreed folder structure. It used ad hoc paths (`pipeline/export.py`, `site-data/`), mixed publishing with processing, and did not say that settings live in config files. The user then asked for a clean professional structure. A professional plan should have proposed one without being asked, so this is an AI planning gap, not only a late user requirement.
- Consequence: the first commit `ccb24df` was made before the layout existed. It holds only `.gitignore` and `docs/`, which already match the layout, so nothing has to move. History is not rewritten.
- Fix: PLAN-002 (supersedes PLAN-001) adds step 1b (layout D5, `config/`, `data/`, root check) and moves export to `backend/`. PLAN-001 is marked superseded in PROGRESS only; the file is untouched.
- Changed lines: `.gitignore` (`/site-data/` line removed, `/data/` comment added); new `README.md`; `docs/DECISIONS.md` D5.
