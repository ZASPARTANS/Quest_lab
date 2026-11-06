"""Grid geometry of the ECMWF regular latitude/longitude fields.

Row 0 is the northern edge and rows run south; column 0 is `lon_first` and columns run east. The real
files start at longitude 180 (not 0): see docs/DOMAIN.md. The expected geometry is set in the [grid] table of
config/pipeline.toml and checked against every GRIB message, so a file with another layout stops the run
instead of silently putting places in the wrong spot.
"""
import math

import eccodes
import numpy as np


def check_geometry(handle, grid):
    """Raise ValueError unless the GRIB message has exactly the grid layout described in the config."""
    step = grid["step_degrees"]
    expected = {
        "Ni": grid["ni"], "Nj": grid["nj"],
        "iScansNegatively": 0, "jScansPositively": 0, "jPointsAreConsecutive": 0,
        "latitudeOfFirstGridPointInDegrees": grid["lat_first"],
        "latitudeOfLastGridPointInDegrees": grid["lat_first"] - (grid["nj"] - 1) * step,
        "longitudeOfFirstGridPointInDegrees": grid["lon_first"],
        "longitudeOfLastGridPointInDegrees": grid["lon_first"] + (grid["ni"] - 1) * step,
        "iDirectionIncrementInDegrees": step, "jDirectionIncrementInDegrees": step,
    }
    bad = []
    for key, want in expected.items():
        got = eccodes.codes_get(handle, key)
        diff = got - want
        if key.startswith("longitude"):  # compare modulo 360: the same meridian can be written as 359.75 or -0.25
            diff = (diff + 180) % 360 - 180
        if not math.isclose(diff, 0, abs_tol=1e-6):
            bad.append(f"{key}: file has {got}, config expects {want}")
    if bad:
        raise ValueError("unexpected grid layout: " + "; ".join(bad))


def latlon_to_index(lat, lon, grid):
    """(latitude, longitude) in degrees -> (row, column) of the nearest grid point.

    Longitude may be given as -180..180 or 0..360; it wraps around the globe. Latitude outside the grid
    is limited to the first or last row.
    """
    step = grid["step_degrees"]
    row = round((grid["lat_first"] - lat) / step)
    col = round(((lon - grid["lon_first"]) % 360) / step) % grid["ni"]
    return min(max(row, 0), grid["nj"] - 1), col


def latitudes(grid):
    """Latitude in degrees of every row, north to south."""
    return grid["lat_first"] - grid["step_degrees"] * np.arange(grid["nj"])


def area_weighted_mean(field, grid):
    """Mean of a (rows, columns) field with each row weighted by cos(latitude), as grid cells shrink to the poles."""
    weights = np.cos(np.radians(latitudes(grid)))
    return float((field.mean(axis=1) * weights).sum() / weights.sum())
