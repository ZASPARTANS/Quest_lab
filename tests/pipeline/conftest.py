"""Shared fixtures for the processing tests.

TEST FIXTURES ONLY: the GRIB files are small messages made by eccodes from its built-in sample (a 16 x 31
grid, 2 degree spacing), filled with invented numbers. They are not forecast data.
"""
import eccodes
import numpy as np
import pytest

from pipeline.fetch import load_config

GRID = {"ni": 16, "nj": 31, "step_degrees": 2.0, "lat_first": 60.0, "lon_first": 0.0}
PARAM_ID = {"m": 228, "kg m**-2": 228228}  # the real ids: IFS writes tp in metres, AIFS in kg m**-2


def _write_grib(path, field_by_step, unit="m", date=20261106, time=1200):
    """Write one accumulated-tp message per entry {end step: 2-D array} in the file's own unit."""
    with open(path, "wb") as f:
        for step, values in field_by_step.items():
            handle = eccodes.codes_grib_new_from_samples("regular_ll_sfc_grib2")
            eccodes.codes_set(handle, "paramId", PARAM_ID[unit])
            eccodes.codes_set(handle, "dataDate", date)
            eccodes.codes_set(handle, "dataTime", time)
            eccodes.codes_set(handle, "stepType", "accum")
            eccodes.codes_set(handle, "startStep", 0)
            eccodes.codes_set(handle, "endStep", step)
            eccodes.codes_set_values(handle, np.asarray(values, dtype=float).ravel())
            eccodes.codes_write(handle, f)
            eccodes.codes_release(handle)


@pytest.fixture
def write_grib():
    """write_grib(path, {step: array}, unit="m" or "kg m**-2", date=..., time=...)"""
    return _write_grib


@pytest.fixture
def const_field():
    """const_field(value) -> a (rows, columns) array of the test grid filled with one value."""
    return lambda value: np.full((GRID["nj"], GRID["ni"]), value, dtype=float)


@pytest.fixture
def cfg(tmp_path):
    """The real config with the small test grid and tiny step lists; data folders are inside tmp_path."""
    c = load_config()
    c["grid"] = dict(GRID)
    c["models"] = {"ifs": {"step_ranges": [{"start": 3, "stop": 12, "every": 3}]},
                   "aifs-single": {"step_ranges": [{"start": 6, "stop": 18, "every": 6}]}}
    c["paths"] = {"raw_dir": str(tmp_path / "raw"), "processed_dir": str(tmp_path / "processed")}
    return c
