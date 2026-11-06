# DOMAIN

Facts learned about the subject. No raw data here; point to the command or script instead.

## 2026-11-06 18:25 UTC — Open Data server layout
- Fact: the server lists dated folders (`/forecasts/YYYYMMDD/`), then run folders `00z`, `06z`, `12z` (and later 18z), then model folders `ifs`, `aifs-single`, `aifs-ens`. Under `aifs-single/0p25/` there is `oper/` and `wave/`; under `ifs/0p25/` there are `oper/` and `enfo/`.
- Where learned: `curl -s https://data.ecmwf.int/forecasts/20261106/00z/` and the sub-paths, hrefs read from the returned HTML. Checked by repeating down each level.
- Fact: files are named like `20261106000000-0h-oper-fc.grib2`, each with a sibling `.index` file (one JSON object per GRIB message with `param`, `step`, `levtype`, `_offset`, `_length`). The offsets allow downloading single messages by HTTP byte range (not yet tested).
- Where learned: listing of `.../aifs-single/0p25/oper/` and the first lines of `20261106000000-6h-oper-fc.index`.
- Fact: the AIFS 6 h step file is about 59 MB (`Content-Length: 58968251` from a `HEAD` request), and its index contains exactly one message with `"param": "tp"`.
- Open questions (NOT yet verified): what `tp` units are (expected metres, accumulated since step 0), whether AIFS `tp` accumulates the same way as IFS, the step list available per run, and the time lag between run time and file availability.

## 2026-11-06 ~19:00 UTC — Tooling facts (A4, A5 checked)
- Fact (A4): the official `ecmwf-opendata` client downloads a file's `.index`, keeps the lines whose keys match the request, and fetches only those `(_offset, _length)` byte ranges. So a request for `param=tp` avoids the full ~59 MB files. Where learned: installed source `.venv/Lib/site-packages/ecmwf/opendata/client.py`, method `Client.get_parts` (lines ~311-345). Checked by reading; NOT yet run against the server (that is plan step 3).
- Fact (A5): on Windows the `eccodes` 2.50.0 wheel ships its own `eccodes.dll` (plus aec, libpng16, openjp2, z) inside `site-packages/eccodes/`, so no separate C install is needed. Where learned: `find` over the venv; `eccodes.codes_get_api_version()` printed `2.50.0` while `findlibs.find('eccodes')` returned `None` (no system library). Linux behaviour for the CI runner is NOT yet checked.
- Fact: the `Client` constructor defaults are `model="ifs"`, `resol="0p25"`. AIFS must be requested with `model="aifs-single"`; the exact request keys are to be verified in step 3.

## 2026-11-06 ~19:12 UTC — Step 3 findings (00z run of 2026-11-06, downloaded and inspected)
- Fact (A1 CORRECTED, see E006): precipitation units differ by model. IFS `tp` has GRIB `units = m`; AIFS `tp` has `units = kg m**-2` (numerically mm of water). Where learned: eccodes key dump from `python -m pipeline.fetch`. Checked against values: area-weighted global mean of cumulative `tp` at steps 6/120/240 h gave IFS x1000 = 0.71/15.57/30.89 mm and AIFS = 0.71/15.94/31.49 mm (check script run once in the session, not kept in the repo).
- Fact (A1, accumulation): both models report `stepType = accum` with `startStep = 0` for every message, i.e. `tp` is accumulated from the start of the forecast, so the amount in an interval is the difference of two consecutive steps. Where learned: same key dump (`startStep values: [0]`, `endStep` = step).
- Fact (A2, partly checked): both models give `gridType = regular_ll`, `Ni = 1440`, `Nj = 721`. NOT yet checked: row order (north to south?), longitude start (0 or -180?), done in step 4.
- Fact (A3): the 00z run holds IFS steps 3..144 every 3 h and 150..240 every 6 h (64 messages) and AIFS 6..360 every 6 h (60 messages); all configured steps were present (`steps missing vs config: []`). The 06z IFS run stops at 144 h (HEAD: 144 h = 200, 150 h = 404, 240 h = 404), so 06z is shorter than 00z for IFS. The 12z IFS run was NOT published at all at 19:09-19:12 UTC (even the 3 h file returned 404) while the 12z AIFS files (up to 360 h) were present, so the fetch used the 00z run for both models. The 12z IFS step list is still an assumption (same as 00z).
- Fact: the `latest()` method of the client returns a run only if HEAD requests for every requested step file return 200, so "latest complete run" is decided by the client for the exact step list in the config.
- Fact: download volume per run for `tp` only: IFS 34.54 MB (64 messages), AIFS 29.51 MB (60 messages), total 64.05 MB; fetch took about 49 s including the search. Each message is a full global 1440 x 721 field.
- Caveat: the `Last-Modified` header of files is NOT a reliable publication time. One 12z AIFS file showed 19:34 GMT while the local clock (which agreed with PyPI's `Date` header within seconds) showed about 19:12. So the publication lag is not recorded from that header; the lag must be measured by when `latest()` first sees a run (to be observed over several runs).
- Fact: the client prints "By downloading data from the ECMWF open data dataset, you agree to the terms: Attribution 4.0 International (CC BY 4.0). Please attribute ECMWF when downloading this data." This agrees with the licence text read on the ECMWF open-data page on 2026-11-06 (see SOURCES).
