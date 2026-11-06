# DOMAIN

Facts learned about the subject. No raw data here; point to the command or script instead.

## 2026-11-06 18:25 UTC — Open Data server layout
- Fact: the server lists dated folders (`/forecasts/YYYYMMDD/`), then run folders `00z`, `06z`, `12z` (and later 18z), then model folders `ifs`, `aifs-single`, `aifs-ens`. Under `aifs-single/0p25/` there is `oper/` and `wave/`; under `ifs/0p25/` there are `oper/` and `enfo/`.
- Where learned: `curl -s https://data.ecmwf.int/forecasts/20261106/00z/` and the sub-paths, hrefs read from the returned HTML. Checked by repeating down each level.
- Fact: files are named like `20261106000000-0h-oper-fc.grib2`, each with a sibling `.index` file (one JSON object per GRIB message with `param`, `step`, `levtype`, `_offset`, `_length`). The offsets allow downloading single messages by HTTP byte range (not yet tested).
- Where learned: listing of `.../aifs-single/0p25/oper/` and the first lines of `20261106000000-6h-oper-fc.index`.
- Fact: the AIFS 6 h step file is about 59 MB (`Content-Length: 58968251` from a `HEAD` request), and its index contains exactly one message with `"param": "tp"`.
- Open questions (NOT yet verified): what `tp` units are (expected metres, accumulated since step 0), whether AIFS `tp` accumulates the same way as IFS, the step list available per run, and the time lag between run time and file availability.
