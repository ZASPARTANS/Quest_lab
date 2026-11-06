"""Tests for pipeline/processed.py: the whole path from two GRIB files to the files written to disk.

TEST FIXTURES ONLY (see conftest.py): invented rain amounts on a 16 x 31 grid, run 2026-11-06 12 UTC.
"""
import datetime as dt
import json
import sys

import numpy as np
import pytest

from pipeline import process, processed

RUN = dt.datetime(2026, 11, 6, 12)


def _make_raw(cfg, write_grib, const_field):
    """Write a raw folder for run 2026-11-06 12 UTC: IFS in metres (steps 3 6 9 12), AIFS in kg m**-2 (steps 6 12 18)."""
    raw = processed.ROOT / cfg["paths"]["raw_dir"] / "2026110612"
    for model in cfg["models"]:
        (raw / model).mkdir(parents=True)
    # IFS cumulative mm: 3 h 9.0 (deliberately odd, must not be used), 6 h 1.0, 9 h 9.0, 12 h 4.0
    ifs = {3: 0.009, 6: 0.001, 9: 0.009, 12: 0.004}
    write_grib(raw / "ifs" / "tp.grib2", {s: const_field(v) for s, v in ifs.items()}, unit="m")
    # AIFS cumulative mm: 6 h 0.25 (dry), 12 h 3.25, 18 h 3.5
    aifs = {6: 0.25, 12: 3.25, 18: 3.5}
    write_grib(raw / "aifs-single" / "tp.grib2", {s: const_field(v) for s, v in aifs.items()}, unit="kg m**-2")


def test_build_gives_mm_per_interval_and_agreement_on_the_common_steps(cfg, write_grib, const_field):
    _make_raw(cfg, write_grib, const_field)
    results, field, steps = processed.build(cfg, RUN)
    assert results["ifs"]["steps"] == [6, 12] and results["aifs-single"]["steps"] == [6, 12, 18]
    np.testing.assert_allclose(results["ifs"]["mm"][:, 0, 0], [1.0, 3.0], atol=1e-3)           # 1-0, 4-1
    np.testing.assert_allclose(results["aifs-single"]["mm"][:, 0, 0], [0.25, 3.0, 0.25], atol=1e-3)
    assert results["ifs"]["source_units"] == ["m"] and results["aifs-single"]["source_units"] == ["kg m**-2"]
    assert steps == [6, 12]  # AIFS-only interval (18 h) is not in the agreement
    # 6 h interval: IFS 1.0 mm (wet) vs AIFS 0.25 mm (dry) -> disagree; 12 h interval: 3.0 vs 3.0 mm -> both wet
    assert (field[0] == process.AGREE_DISAGREE).all() and (field[1] == process.AGREE_BOTH_WET).all()


def test_save_writes_files_that_load_back_and_leaves_no_part_folder(cfg, write_grib, const_field):
    _make_raw(cfg, write_grib, const_field)
    assert processed.local_runs(cfg) == [RUN]
    results, field, steps = processed.build(cfg, RUN)
    out = processed.save(cfg, RUN, results, field, steps)
    assert out.name == "2026110612" and not out.with_name("2026110612.part").exists()
    assert sorted(p.name for p in out.iterdir()) == ["agreement.npy", "aifs-single.npy", "ifs.npy", "meta.json"]
    ifs = np.load(out / "ifs.npy")
    assert ifs.dtype == np.uint16 and ifs.shape == (2, 31, 16)
    assert ifs[:, 0, 0].tolist() == [10, 30]  # 1.0 mm and 3.0 mm in tenths of a millimetre
    meta = json.loads((out / "meta.json").read_text(encoding="utf-8"))
    assert meta["run"] == "2026-11-06T12:00:00Z" and meta["unit"] == "mm per interval"
    assert meta["models"]["aifs-single"]["valid_times"] == ["2026-11-06T18:00:00Z", "2026-11-07T00:00:00Z", "2026-11-07T06:00:00Z"]
    assert meta["agreement"]["steps"] == [6, 12] and meta["agreement"]["wet_threshold_mm"] == 0.5
    assert (np.load(out / "agreement.npy") == field).all()


def test_saving_again_replaces_the_old_output(cfg, write_grib, const_field):
    _make_raw(cfg, write_grib, const_field)
    results, field, steps = processed.build(cfg, RUN)
    out = processed.save(cfg, RUN, results, field, steps)
    (out / "stale.txt").write_text("left over from an earlier run")
    processed.save(cfg, RUN, results, field, steps)
    assert not (out / "stale.txt").exists()


@pytest.mark.skipif(sys.platform == "win32", reason="folder permissions work differently on Windows; the official run is Linux")
def test_an_old_folder_that_cannot_be_deleted_stops_the_run_with_the_real_error(cfg, write_grib, const_field):
    # E015: files left by another user used to end as a confusing "Directory not empty"
    _make_raw(cfg, write_grib, const_field)
    results, field, steps = processed.build(cfg, RUN)
    out = processed.save(cfg, RUN, results, field, steps)
    out.chmod(0o555)  # nobody may delete files inside any more
    try:
        with pytest.raises(PermissionError):
            processed.save(cfg, RUN, results, field, steps)
    finally:
        out.chmod(0o755)
