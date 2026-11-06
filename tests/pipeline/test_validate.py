"""Tests for pipeline/validate.py. The validation is only worth something if it FAILS when the processing is wrong,
so besides the matching case each test breaks one thing on purpose: a stored value, the longitude start, the unit factor.

TEST FIXTURES ONLY (see conftest.py): invented rain amounts increasing with row and column on the 16 x 31 test grid.
"""
import datetime as dt

import numpy as np

from pipeline import paths, processed, validate

RUN = dt.datetime(2026, 11, 6, 12)
TOLERANCE = {"max_abs_diff_mm": 0.05, "float_slack_mm": 0.001}
POINTS = [{"name": "A", "lat": 40.1, "lon": 10.2}, {"name": "B", "lat": 8.0, "lon": 26.0}]


def _base_mm(cfg):
    """Rain per 6 h that differs in every grid cell and is not a multiple of the 0.1 mm storage step."""
    g = cfg["grid"]
    return np.add.outer(np.arange(g["nj"]) * 0.437, np.arange(g["ni"]) * 0.0313) + 0.011


def _build(cfg, write_grib, units_to_mm=None):
    """Write raw files for both models (IFS in metres, AIFS in mm) and process them with the given unit table."""
    base = _base_mm(cfg)
    for model, steps, unit, scale in (("ifs", (3, 6, 9, 12), "m", 1e-3), ("aifs-single", (6, 12, 18), "kg m**-2", 1.0)):
        path = paths.raw_file(cfg, RUN, model)
        path.parent.mkdir(parents=True, exist_ok=True)
        write_grib(path, {s: base * (s / 6) * scale for s in steps}, unit=unit)
    run_cfg = cfg | ({"units_to_mm": units_to_mm} if units_to_mm else {})
    results, field, steps = processed.build(run_cfg, RUN)
    return processed.save(run_cfg, RUN, results, field, steps)


def test_matching_data_passes_for_both_models_and_both_places(cfg, write_grib):
    _build(cfg, write_grib)
    rows = validate.compare_run(cfg, RUN, POINTS, TOLERANCE)
    assert {(r["model"], r["point"]) for r in rows} == {(m, p) for m in ("ifs", "aifs-single") for p in "AB"}
    assert all(r["ok"] and r["same_cell"] for r in rows), rows
    assert all(r["max_diff"] <= 0.05 + 1e-3 and r["max_raw"] > 1 for r in rows)  # real rain, compared to within storage rounding
    assert any(r["max_diff"] > 0.001 for r in rows)  # the comparison is not trivially exact


def test_a_wrong_stored_value_is_caught(cfg, write_grib):
    out = _build(cfg, write_grib)
    stored = np.load(out / cfg["paths"]["model_file"].format(model="ifs"))
    row, col = 10, 5  # the cell of place A
    stored[0, row, col] += 7  # 0.7 mm too much
    np.save(out / cfg["paths"]["model_file"].format(model="ifs"), stored)
    rows = {(r["model"], r["point"]): r for r in validate.compare_run(cfg, RUN, POINTS, TOLERANCE)}
    assert not rows[("ifs", "A")]["ok"] and rows[("ifs", "A")]["max_diff"] > 0.6
    assert rows[("ifs", "B")]["ok"] and rows[("aifs-single", "A")]["ok"]  # other places and the other model are untouched


def test_a_wrong_longitude_start_is_caught_as_a_different_cell(cfg, write_grib):
    _build(cfg, write_grib)  # the file starts at longitude 0 ...
    wrong = cfg | {"grid": cfg["grid"] | {"lon_first": 180.0}}  # ... but the index maths is told it starts at 180 (E012)
    rows = validate.compare_run(wrong, RUN, POINTS, TOLERANCE)
    assert not any(r["same_cell"] for r in rows if r["point"] == "A")
    assert not any(r["ok"] for r in rows if r["point"] == "A")


def test_a_wrong_unit_factor_in_the_processing_is_caught(cfg, write_grib):
    _build(cfg, write_grib, units_to_mm={"m": 1.0, "kg m**-2": 1.0})  # IFS metres treated as mm (E006)
    rows = validate.compare_run(cfg, RUN, POINTS, TOLERANCE)
    assert not any(r["ok"] for r in rows if r["model"] == "ifs")
    assert all(r["ok"] for r in rows if r["model"] == "aifs-single")


def test_processed_runs_lists_only_folders_with_a_description_file(cfg, write_grib):
    assert validate.processed_runs(cfg) == []
    out = _build(cfg, write_grib)
    paths.partial(cfg, paths.run_folder(cfg, "processed", dt.datetime(2026, 11, 7, 0))).mkdir()
    assert validate.processed_runs(cfg) == [RUN]
    (out / cfg["paths"]["meta_file"]).unlink()
    assert validate.processed_runs(cfg) == []
