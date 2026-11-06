# SOURCES

Only sources actually opened or used.

## 2026-11-06 18:25 UTC — ECMWF Open Data server directory listing
- URL: https://data.ecmwf.int/forecasts/ (and sub-paths `/forecasts/20261106/00z/...`)
- Used for: read-only listing of available dates, runs, models and file names, plus a header-only check (`HEAD`) of one AIFS GRIB2 file and a read of one `.index` file. No forecast data downloaded yet.
- Accessed: 2026-11-06 ~18:25 UTC.
- Licence / attribution: NOT yet read from the official ECMWF Open Data licence page. To be checked and recorded before any data is shown in the app (planned in PLAN-001).

## 2026-11-06 ~18:55 UTC — Python packages (verified on the official PyPI JSON API, then installed from PyPI)
Access date 2026-11-06. Versions are those pinned in `requirements.txt`. Licences below are the PyPI metadata of the direct packages; the licences of the 19 transitive packages were NOT individually checked.

| Package | Pinned | PyPI page | Used for | Licence (PyPI metadata) |
|---|---|---|---|---|
| ecmwf-opendata | 0.3.35 | https://pypi.org/project/ecmwf-opendata/ (source: https://github.com/ecmwf/ecmwf-opendata) | download IFS/AIFS open data; installed source read to confirm `.index` + byte-range logic (`client.py` `get_parts`) | Apache-2.0 |
| eccodes | 2.50.0 | https://pypi.org/project/eccodes/ (source: https://github.com/ecmwf/eccodes-python) | decode GRIB2; Windows wheel bundles `eccodes.dll` | Apache-2.0 |
| numpy | 2.4.6 | https://pypi.org/project/numpy/ | array processing (newest 2.5.4 needs Python >= 3.12) | BSD-3-Clause AND others (see PyPI) |
| pytest | 9.2.0 | https://pypi.org/project/pytest/ | automated tests | MIT |

Transitive (installed by pip, not chosen directly): attrs, certifi, cffi, charset-normalizer, colorama, findlibs, idna, iniconfig, multiurl, packaging, pluggy, pycparser, Pygments, python-dateutil, pytz, requests, tqdm, tzdata, urllib3.
