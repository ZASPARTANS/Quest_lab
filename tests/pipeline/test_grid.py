"""Tests for pipeline/grid.py: grid indexing (silent-error risk: a wrong longitude start moves every place)."""
import eccodes
import numpy as np
import pytest

from pipeline import grid
from pipeline.fetch import load_config


@pytest.fixture
def real_grid():
    return load_config()["grid"]


def test_real_grid_corners_and_origin(real_grid):
    # row 0 = 90 N, rows run south; column 0 = 180 E (= -180), columns run east, so column 720 is 0 E
    assert grid.latlon_to_index(90, -180, real_grid) == (0, 0)
    assert grid.latlon_to_index(0, 0, real_grid) == (360, 720)
    assert grid.latlon_to_index(-90, 179.75, real_grid) == (720, 1439)
    assert grid.latlon_to_index(13.0, 80.25, real_grid) == (308, 1041)  # checked against eccodes find_nearest


def test_longitude_wraps_and_accepts_both_conventions(real_grid):
    assert grid.latlon_to_index(10, 180, real_grid) == grid.latlon_to_index(10, -180, real_grid)
    assert grid.latlon_to_index(10, 360, real_grid) == grid.latlon_to_index(10, 0, real_grid)
    assert grid.latlon_to_index(10, -182, real_grid) == grid.latlon_to_index(10, 178, real_grid)
    assert grid.latlon_to_index(10, 359.75, real_grid) == grid.latlon_to_index(10, -0.25, real_grid)


def test_latitude_outside_the_grid_is_limited(real_grid):
    assert grid.latlon_to_index(95, 0, real_grid)[0] == 0
    assert grid.latlon_to_index(-95, 0, real_grid)[0] == real_grid["nj"] - 1


def _sample_handle():
    return eccodes.codes_grib_new_from_samples("regular_ll_sfc_grib2")


def test_check_geometry_accepts_matching_file_and_rejects_other_layouts(cfg):
    handle, test_grid = _sample_handle(), cfg["grid"]
    grid.check_geometry(handle, test_grid)  # no error
    with pytest.raises(ValueError, match="longitudeOfFirstGridPointInDegrees"):
        grid.check_geometry(handle, test_grid | {"lon_first": 180.0})  # the real files' start; this file starts at 0
    with pytest.raises(ValueError, match="Ni"):
        grid.check_geometry(handle, test_grid | {"ni": 1440})
    eccodes.codes_release(handle)


def test_area_weighted_mean():
    g = {"nj": 3, "step_degrees": 90.0, "lat_first": 90.0, "ni": 4}
    assert grid.area_weighted_mean(np.full((3, 4), 2.0), g) == pytest.approx(2.0)
    only_pole_row = np.zeros((3, 4))
    only_pole_row[0] = 5.0  # the 90 N row: cos(90 degrees) = 0, so it must not count
    assert grid.area_weighted_mean(only_pole_row, g) == pytest.approx(0.0, abs=1e-9)
