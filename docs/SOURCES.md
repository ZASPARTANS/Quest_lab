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

## 2026-11-06 ~19:11 UTC — Forecast data actually downloaded (step 3)
- What: ECMWF Open Data, parameter `tp` (total precipitation), type `fc`, stream `oper`, 0.25 degree global grid, run 2026-11-06 00 UTC.
  - IFS (model `ifs`): 64 messages, steps 3..240 h, 34.54 MB. AIFS Single (model `aifs-single`): 60 messages, steps 6..360 h, 29.51 MB.
- Where from: https://data.ecmwf.int/forecasts/20261106/00z/ (via the `ecmwf-opendata` client, source name `ecmwf`). Retrieved 2026-11-06 ~19:11 UTC. Stored in the git-ignored `data/raw/2026110600/<model>/tp.grib2`; re-created by `python -m pipeline.fetch`.
- Licence / attribution: CC BY 4.0 plus the ECMWF Terms of Use (stated on https://www.ecmwf.int/en/forecasts/datasets/open-data, read 2026-11-06, and printed by the client on download). The exact attribution wording still has to be taken from the official terms page before the app shows data (plan step 10).
- Units: IFS metres, AIFS kg m**-2 (see DOMAIN.md and E006). Time zone: UTC. Accumulation: since forecast start.

## 2026-11-06 ~19:30 UTC — Docker image used for the Linux check
- `python:3.11-slim` from Docker Hub (official `python` image), digest `sha256:65bd3d9f1d7fa268dd1909973ba7eb4bdf41f6dcf2cfbe76ba9528b170f3fd79`, pulled 2026-11-06. Used only to run `pip install -r requirements.txt`, the tests and the GRIB decode check on Linux. Not part of the deliverable; licences of the image contents were not reviewed.
