"""Shared fixtures for the export tests.

TEST FIXTURES ONLY: a tiny invented GLOBAL grid (7 rows x 12 columns, 30 degree spacing, starting at longitude 180 like the real files) and invented rain, processed with the real
pipeline/processed.py save function, so the export is tested on the same files the real pipeline writes.
"""
import datetime as dt
import tomllib

import numpy as np
import pytest

from pipeline import paths, process, processed
from pipeline.fetch import load_config

RUN = dt.datetime(2026, 11, 6, 12)
GRID = {"ni": 12, "nj": 7, "step_degrees": 30.0, "lat_first": 90.0, "lon_first": 180.0}
IFS_STEPS, AIFS_STEPS = [6, 12, 18, 24], [6, 12, 18, 24, 30, 36]


@pytest.fixture
def cfg(tmp_path):
    c = load_config()
    c["grid"] = dict(GRID)
    c["models"] = {"ifs": {"step_ranges": []}, "aifs-single": {"step_ranges": []}}
    c["paths"] = c["paths"] | {"raw_dir": str(tmp_path / "raw"), "processed_dir": str(tmp_path / "processed"), "site_dir": str(tmp_path / "site")}
    return c


@pytest.fixture
def backend(cfg):
    b = tomllib.loads((paths.ROOT / cfg["paths"]["backend_config_file"]).read_text(encoding="utf-8"))
    b["tiles"] = b["tiles"] | {"size": 8}
    b["frames"] = b["frames"] | {"size": 32}
    return b


def _mm(steps, offset):
    """Rain per 6 h block that differs in every cell and block, with some dry cells."""
    base = np.add.outer(np.arange(GRID["nj"]) * 0.31, np.arange(GRID["ni"]) * 0.17)
    out = np.stack([np.maximum(base * ((k + offset) % 5 + 1) - 2.0, 0.0) for k in range(len(steps))])
    return out.astype(np.float32)


@pytest.fixture
def processed_run(cfg):
    """Write a processed run (both models + agreement) and fake raw files; returns the arrays that were saved."""
    results = {}
    for model, steps, offset in (("ifs", IFS_STEPS, 0), ("aifs-single", AIFS_STEPS, 3)):
        results[model] = {"steps": steps, "mm": _mm(steps, offset), "negative_cells": 0, "most_negative_mm": 0.0, "source_units": ["m"]}
        raw = paths.raw_file(cfg, RUN, model)
        raw.parent.mkdir(parents=True, exist_ok=True)
        raw.write_bytes(b"not a real grib file; only its modification time is used")
    n = len(IFS_STEPS)
    field = process.agreement(results["ifs"]["mm"], results["aifs-single"]["mm"][:n], cfg["process"]["wet_threshold_mm"])
    processed.save(cfg, RUN, results, field, IFS_STEPS)
    return results, field
