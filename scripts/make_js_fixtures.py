"""Print the cross-language test fixture for the browser code (tests/frontend/tiles.test.mjs) as JSON on stdout.

The fixture holds answers produced by the REAL Python code, so the JavaScript is checked against it and not against a second
reading of the format: tile files written by backend/tiles.py (plain and byte-shuffled) with their expected values, and the
grid cell pipeline/grid.py picks for a list of tricky places (halves, the date line, the poles, wrap-around).
Values are invented test values, not forecast data. Regenerate with:
  docker compose -f docker/compose.yaml run --rm -T tests python -m scripts.make_js_fixtures > tests/frontend/fixtures/python_reference.json
"""
import base64
import json

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


def main():
    cfg = load_config()
    grid = cfg["grid"]
    cells = []
    for lat, lon in PLACES:
        row, col = grid_mod.latlon_to_index(lat, lon, grid)
        cells.append({"lat": lat, "lon": lon, "row": row, "col": col, "tile": list(tiles.locate(grid, 16, lat, lon))})
    print(json.dumps({"_comment": "Made by scripts/make_js_fixtures.py from the real Python code; invented values.", "grid": grid,
                      "tile_size": 16, "tiles": _tile_cases(), "cells": cells}, indent=1))


if __name__ == "__main__":
    main()
