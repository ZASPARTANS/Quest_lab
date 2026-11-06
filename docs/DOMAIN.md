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
