"""Print the cross-language test fixture for the browser code (tests/frontend/tiles.test.mjs) as JSON on stdout.

The fixture holds answers produced by the REAL Python code, so the JavaScript is checked against it and not against a second
reading of the format: tile files written by backend/tiles.py (plain and byte-shuffled) with their expected values, and the
grid cell pipeline/grid.py picks for a list of tricky places (halves, the date line, the poles, wrap-around).
Values are invented test values, not forecast data. Regenerate with:
  docker compose -f docker/compose.yaml run --rm -T tests python -m scripts.make_js_fixtures > tests/frontend/fixtures/python_reference.json
"""
import base64
import json
import math

import numpy as np

from backend import tiles
from pipeline import grid as grid_mod
from pipeline.fetch import load_config

# Tricky places: ties between two cells (odd multiples of 0.125), the date line, both poles, longitudes written 0..360, tiny negatives.
PLACES = [(13.0827, 80.2707), (0.125, -0.125), (0.375, 179.875), (-0.125, 0.125), (51.5, -0.1), (90.0, 0.0), (-90.0, 180.0),
          (89.9, -179.99), (-33.87, 151.21), (0.0, 359.9), (12.5, -180.0), (12.5, 180.0), (45.0625, 90.0625), (-0.0000001, -0.0000001),
          (60.0, 540.25), (-45.1, -720.4)]


def _tile_cases():
    rng = np.random.default_rng(7)
    block = rng.integers(0, 70, size=(3, 2, 4)).astype(np.uint16)
    block[0, 0, 0], block[1, 1, 3], block[2, 0, 1] = 65535, 256, 255  # values that touch both bytes
    cases = []
    for shuffle in (True, False):
        cases.append({"shuffled": shuffle, "layers": 3, "rows": 2, "cols": 4,
                      "file_base64": base64.b64encode(tiles.pack(block, shuffle)).decode(), "values": block.reshape(-1).tolist()})
    return cases


# ---- the browser-side drawing (frontend/src/live.js): independent Python versions of its maths -------------------------------------------

LIVE_GRID = {"ni": 12, "nj": 7, "step_degrees": 30.0, "lat_first": 90.0, "lon_first": 180.0}
LIVE_VIEWS = [{"west": -10.0, "east": 10.0, "south": 40.0, "north": 60.0, "width": 8, "height": 6},
              {"west": 170.0, "east": 179.0, "south": -10.0, "north": 5.0, "width": 5, "height": 4},
              {"west": -180.0, "east": 180.0, "south": -80.0, "north": 80.0, "width": 6, "height": 6}]


def _stored(r, c, grid):
    """The test field both languages build: a deterministic pattern with a clamped row and a wrapped column."""
    r, c = min(max(r, 0), grid["nj"] - 1), c % grid["ni"]
    return (r * 7 + c * 13) % 50 + ((r * c) % 5) * 3


def _catmull(t):
    return [-0.5 * t ** 3 + t ** 2 - 0.5 * t, 1.5 * t ** 3 - 2.5 * t ** 2 + 1, -1.5 * t ** 3 + 2 * t ** 2 + 0.5 * t, 0.5 * t ** 3 - 0.5 * t ** 2]


def _sample(rowf, colf, grid):
    """Catmull-Rom between the four nearest cells in each direction, clamped to the range of the four cells around the point."""
    r, c = math.floor(rowf), math.floor(colf)
    wr, wc = _catmull(rowf - r), _catmull(colf - c)
    total = sum(wr[i] * wc[j] * _stored(r - 1 + i, c - 1 + j, grid) for i in range(4) for j in range(4))
    centre = [_stored(r + i, c + j, grid) for i in (0, 1) for j in (0, 1)]
    return min(max(total, min(centre)), max(centre))


def _live_cases():
    grid = LIVE_GRID
    views = []
    for v in LIVE_VIEWS:
        merc = lambda lat: math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))  # noqa: E731
        yn, ys = merc(v["north"]), merc(v["south"])
        lats = [math.degrees(math.atan(math.sinh(yn + (ys - yn) * (i + 0.5) / v["height"]))) for i in range(v["height"])]
        base = ((v["west"] - grid["lon_first"]) % 360) / grid["step_degrees"]
        views.append(v | {"rowf": [(grid["lat_first"] - lat) / grid["step_degrees"] for lat in lats],
                          "colf": [base + (v["east"] - v["west"]) / v["width"] * (j + 0.5) / grid["step_degrees"] for j in range(v["width"])]})
    points = [(1.0, 1.0), (2.5, 3.25), (0.4, 0.4), (5.9, 10.9), (3.0, 11.5), (3.3, -0.4), (6.0, 6.0), (0.0, 0.0), (4.75, 9.1), (2.2, 11.99)]
    samples = [{"rowf": r, "colf": c, "value": _sample(r, c, grid)} for r, c in points]
    return {"grid": grid, "views": views, "samples": samples, "field": "(r*7 + c*13) % 50 + ((r*c) % 5) * 3, r clamped to 0..nj-1, c wrapped modulo ni"}


def main():
    cfg = load_config()
    grid = cfg["grid"]
    cells = []
    for lat, lon in PLACES:
        row, col = grid_mod.latlon_to_index(lat, lon, grid)
        cells.append({"lat": lat, "lon": lon, "row": row, "col": col, "tile": list(tiles.locate(grid, 16, lat, lon))})
    print(json.dumps({"_comment": "Made by scripts/make_js_fixtures.py from the real Python code; invented values.", "grid": grid,
                      "tile_size": 16, "tiles": _tile_cases(), "cells": cells, "live": _live_cases()}, indent=1))


if __name__ == "__main__":
    main()
