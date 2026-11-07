"""Tests for pipeline/process.py: units, de-accumulation, time axis, quantising, agreement.

These are the places where errors are silent (docs/ERRORS.md E006: the two models use different units).
All arrays are invented test values, not forecast data.
"""
import datetime as dt

import numpy as np
import pytest

from pipeline import process
from pipeline.fetch import expand_steps, load_config

RUN = dt.datetime(2026, 11, 6, 12)


# ---- units (E006)

def test_unit_factor_converts_both_models_units_and_rejects_others():
    table = load_config()["units_to_mm"]
    assert process.unit_factor("m", table) == 1000.0       # IFS
    assert process.unit_factor("kg m**-2", table) == 1.0   # AIFS: 1 kg per m2 of water = 1 mm
    with pytest.raises(ValueError, match="unknown precipitation unit"):
        process.unit_factor("mm", table)


def test_ifs_and_aifs_files_give_the_same_millimetres(tmp_path, cfg, write_grib, const_field):
    # the same 2.5 mm of rain, written the way each model writes it
    write_grib(tmp_path / "ifs.grib2", {6: const_field(0.0025)}, unit="m")
    write_grib(tmp_path / "aifs.grib2", {6: const_field(2.5)}, unit="kg m**-2")
    ifs = process.read_cumulative_mm(tmp_path / "ifs.grib2", [6], RUN, cfg)[6]
    aifs = process.read_cumulative_mm(tmp_path / "aifs.grib2", [6], RUN, cfg)[6]
    np.testing.assert_allclose(ifs, 2.5, atol=1e-3)
    np.testing.assert_allclose(aifs, 2.5, atol=1e-3)
    np.testing.assert_allclose(ifs, aifs, atol=1e-3)


# ---- reading checks

def test_read_rejects_wrong_run_missing_and_repeated_steps(tmp_path, cfg, write_grib, const_field):
    path = tmp_path / "a.grib2"
    write_grib(path, {6: const_field(0.001), 12: const_field(0.002)})
    assert sorted(process.read_cumulative_mm(path, [6, 12], RUN, cfg)) == [6, 12]
    with pytest.raises(ValueError, match="not tp accumulated from the start of run"):
        process.read_cumulative_mm(path, [6], dt.datetime(2026, 11, 6, 0), cfg)  # file is the 12z run
    with pytest.raises(ValueError, match="steps missing"):
        process.read_cumulative_mm(path, [6, 18], RUN, cfg)
    write_grib(path, {6: const_field(0.001)})
    path.write_bytes(path.read_bytes() * 2)  # the same message twice
    with pytest.raises(ValueError, match="appears twice"):
        process.read_cumulative_mm(path, [6], RUN, cfg)


def test_read_stops_on_a_file_with_another_grid(tmp_path, cfg, write_grib, const_field):
    write_grib(tmp_path / "a.grib2", {6: const_field(0.001)})
    with pytest.raises(ValueError, match="unexpected grid layout"):
        process.read_cumulative_mm(tmp_path / "a.grib2", [6], RUN, cfg | {"grid": cfg["grid"] | {"lon_first": 180.0}})


# ---- time axis

def test_interval_steps_use_the_six_hourly_steps_of_each_model():
    cfg = load_config()
    ifs = process.interval_steps(expand_steps(cfg["models"]["ifs"]["step_ranges"]), 6)
    aifs = process.interval_steps(expand_steps(cfg["models"]["aifs-single"]["step_ranges"]), 6)
    assert (ifs[0], ifs[-1], len(ifs)) == (6, 240, 40)  # the 3 hourly steps are not used
    assert (aifs[0], aifs[-1], len(aifs)) == (6, 360, 60)


def test_interval_steps_reject_a_gap():
    with pytest.raises(ValueError, match="without gaps"):
        process.interval_steps([6, 12, 24], 6)


def test_valid_times_are_run_time_plus_step():
    assert process.valid_times(RUN, [6, 18]) == [dt.datetime(2026, 11, 6, 18), dt.datetime(2026, 11, 7, 6)]


# ---- de-accumulation

def test_deaccumulate_takes_differences_and_starts_from_zero():
    cumulative = {s: np.full((2, 3), v, dtype=np.float32) for s, v in {6: 1.0, 12: 3.0, 18: 3.0, 24: 6.0}.items()}
    mm, negative, worst = process.deaccumulate(cumulative, [6, 12, 18, 24])
    assert mm[:, 0, 0].tolist() == [1.0, 2.0, 0.0, 3.0]  # first interval = the first step itself
    assert (negative, worst) == (0, 0.0)


def test_deaccumulate_clips_small_negatives_and_counts_them():
    cumulative = {6: np.array([[2.0, 1.0]], dtype=np.float32), 12: np.array([[1.75, 3.0]], dtype=np.float32)}
    mm, negative, worst = process.deaccumulate(cumulative, [6, 12])
    assert mm[1].tolist() == [[0.0, 2.0]]
    assert (negative, worst) == (1, -0.25)
    assert mm.dtype == np.float32


# ---- quantising

def test_quantise_round_trip_is_within_half_a_step():
    mm = np.array([0.0, 0.26, 12.34, 654.0], dtype=np.float32)
    stored, saturated = process.quantise(mm, 0.1)
    assert stored.dtype == np.uint16 and saturated == 0
    assert stored.tolist() == [0, 3, 123, 6540]
    assert np.abs(process.dequantise(stored, 0.1) - mm).max() <= 0.05 + 1e-4


def test_quantise_limits_and_counts_saturated_values():
    stored, saturated = process.quantise(np.array([7000.0, -0.3, 6553.5], dtype=np.float32), 0.1)
    assert stored.tolist() == [65535, 0, 65535]
    assert saturated == 1  # 6553.5 mm is exactly the maximum and is not counted as lost


# ---- agreement

def test_wet_limit_is_the_smallest_stored_value_that_reaches_the_threshold():
    assert process.wet_limit(0.5, 0.1) == 5      # 0.5 / 0.1 is 5.000000000000000 or 4.999999999999999 depending on rounding
    assert process.wet_limit(0.3, 0.1) == 3      # 0.3 / 0.1 = 2.9999999999999996 in floating point
    assert process.wet_limit(0.55, 0.1) == 6     # between two stored values: the next one up (0.5 mm is below 0.55)
    assert process.wet_limit(1.0, 0.1) == 10 and process.wet_limit(0.1, 0.1) == 1


def test_agreement_classes_and_the_threshold_edge():
    a = np.array([0.5, 0.49, 0.5, 0.1, 9.0])
    b = np.array([0.5, 0.50, 0.1, 0.2, 0.0])
    out = process.agreement(a, b, 0.5)
    assert out.dtype == np.uint8
    assert out.tolist() == [process.AGREE_BOTH_WET,    # exactly at the threshold counts as wet
                            process.AGREE_DISAGREE,
                            process.AGREE_DISAGREE,
                            process.AGREE_BOTH_DRY,
                            process.AGREE_DISAGREE]
