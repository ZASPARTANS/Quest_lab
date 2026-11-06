# ERRORS

Summary (update with every change). `fix worked / fix tried` counts only what actually happened.

| ID | Short error | seen | fix worked / tried |
|---|---|---|---|
| E001 | Python 3.10 `pip` crashes: `No module named 'pip._vendor.pyparsing.core'` | 1 | 1/1 (workaround: use Python 3.11) |

---

## E001 — Python 3.10 pip is broken
- First seen: 2026-11-06 ~18:22 UTC while checking the environment. seen: 1. fix worked / fix tried: 1/1.
- Exact error: `ModuleNotFoundError: No module named 'pip._vendor.pyparsing.core'`, raised from `C:\Program Files\Python310\lib\site-packages\pip\_vendor\pyparsing\__init__.py` when running `python -m pip --version`.
- Root cause: not investigated. The system Python 3.10 install has a damaged vendored pyparsing inside pip.
- Fix chosen: do not repair it. Use Python 3.11 (`py -3.11`) in a virtual environment. This avoids the broken install rather than fixing it, so Python 3.10 pip is still broken.
- Fix attempt 1 (2026-11-06 ~18:22 UTC): ran `py -3.11 -m pip --version`; it printed `pip 24.0 ... (python 3.11)`. The failure no longer occurs on 3.11. Worked.
- Changed lines: none (environment only).
