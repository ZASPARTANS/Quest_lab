"""Tests for pipeline/paths.py: every folder and file name comes from the config, nothing is fixed in the code."""
import datetime as dt

import pytest

from pipeline import paths
from pipeline.fetch import load_config

RUN = dt.datetime(2026, 11, 6, 12)


def test_names_follow_the_config(tmp_path):
    cfg = load_config()
    cfg["paths"] = cfg["paths"] | {"raw_dir": "somewhere/raw", "run_folder_format": "%Y-%m-%d_%Hz", "raw_file": "precip.grb"}
    assert paths.raw_file(cfg, RUN, "m") == paths.ROOT / "somewhere" / "raw" / "2026-11-06_12z" / "m" / "precip.grb"
    assert paths.run_folder(cfg, "processed", RUN).parent == paths.ROOT / cfg["paths"]["processed_dir"]
    assert paths.partial(cfg, tmp_path / "x.npy").name == "x.npy" + cfg["paths"]["partial_suffix"]


def test_run_folder_names_round_trip_and_bad_names_are_rejected():
    cfg = load_config()
    assert paths.parse_run(cfg, RUN.strftime(cfg["paths"]["run_folder_format"])) == RUN
    with pytest.raises(ValueError):
        paths.parse_run(cfg, "not-a-run")
