"""Tests for backend/tiles.py: tile geometry and the file format. The browser decodes the same bytes, so the format is the contract.

Silent-error risks covered: the wrong tile or cell for a place (longitude starts at 180), byte order, shuffled bytes, edge tiles that are
smaller than the rest, and malformed files (tiles are untrusted input). All arrays are invented test values.
"""
import gzip
import struct

import numpy as np
import pytest

from backend import tiles
from pipeline import grid as grid_mod
from pipeline.fetch import load_config


def test_counts_and_edge_shapes():
    grid = {"nj": 13, "ni": 20}
    assert tiles.tile_counts(grid, 8) == (2, 3)
    assert [tiles.tile_shape(grid, 8, r, c) for r, c in ((0, 0), (1, 0), (0, 2), (1, 2))] == [(8, 8), (5, 8), (8, 4), (5, 4)]


def test_locate_agrees_with_the_grid_index_maths_on_the_real_grid():
    grid = load_config()["grid"]
    assert tiles.locate(grid, 16, 90.0, -180.0) == (0, 0, 0, 0)  # north-west corner: column 0 is 180 E
    assert tiles.locate(grid, 16, -90.0, 179.75) == (45, 89, 0, 15)  # south-east corner: the last tile row only has 1 row
    for lat, lon in ((13.08, 80.27), (51.51, -0.13), (-33.87, 151.21), (21.31, -157.86), (-18.14, 178.44), (0.0, 0.0)):
        row, col = grid_mod.latlon_to_index(lat, lon, grid)
        tr, tc, r, c = tiles.locate(grid, 16, lat, lon)
        assert (tr * 16 + r, tc * 16 + c) == (row, col) and 0 <= r < 16 and 0 <= c < 16


@pytest.mark.parametrize("shuffle", [False, True])
def test_pack_and_unpack_round_trip_the_full_value_range(shuffle):
    block = np.random.default_rng(3).integers(0, 65536, size=(7, 5, 6), dtype=np.uint16)
    block[0, 0, 0], block[0, 0, 1], block[0, 0, 2] = 0, 65535, 256  # the extremes and a value whose two bytes differ
    data = tiles.pack(block, shuffle)
    assert (tiles.unpack(data) == block).all()
    raw = gzip.decompress(data)
    assert struct.unpack_from("<5H", raw) == (1, 5, 6, 7, 1 if shuffle else 0)  # version, rows, columns, layers, flags
    assert len(raw) == 10 + 2 * 7 * 5 * 6


def test_the_two_byte_layouts_are_what_the_browser_expects():
    block = np.array([[[0x0102, 0x0304]]], dtype=np.uint16)  # 1 layer, 1 row, 2 columns
    assert gzip.decompress(tiles.pack(block, False))[10:] == bytes([0x02, 0x01, 0x04, 0x03])  # little-endian pairs
    assert gzip.decompress(tiles.pack(block, True))[10:] == bytes([0x01, 0x03, 0x02, 0x04])  # all high bytes, then all low bytes


@pytest.mark.parametrize("damage", ["not gzip", "cut short", "too short", "version", "flag", "length"])
def test_malformed_tiles_are_rejected(damage):
    good = gzip.decompress(tiles.pack(np.ones((2, 3, 3), dtype=np.uint16), False))
    bad = {"not gzip": b"hello", "cut short": gzip.compress(good)[:-5], "too short": gzip.compress(b"abc"),
           "version": gzip.compress(struct.pack("<5H", 9, 3, 3, 2, 0) + good[10:]),
           "flag": gzip.compress(struct.pack("<5H", 1, 3, 3, 2, 4) + good[10:]),
           "length": gzip.compress(good[:-2])}[damage]
    with pytest.raises(ValueError):
        tiles.unpack(bad)


def test_write_tiles_and_read_every_cell_back_including_edge_tiles(tmp_path):
    grid = {"nj": 13, "ni": 20}
    layers = np.random.default_rng(5).integers(0, 3000, size=(9, 13, 20), dtype=np.uint16)
    count, total, largest = tiles.write_tiles(tmp_path, layers, grid, 8, "{row}_{col}.bin.gz", True)
    assert count == 6 and len(list(tmp_path.iterdir())) == 6 and total > 0 and 0 < largest <= total
    for row in range(13):
        for col in range(20):
            data = (tmp_path / f"{row // 8}_{col // 8}.bin.gz").read_bytes()
            assert (tiles.read_cell(data, row % 8, col % 8) == layers[:, row, col]).all()
