"""Tests for backend/frames.py: PNG writing, colour scales, and Web Mercator resampling (silent-error risk: a wrongly placed image).

All arrays are invented test values, not forecast data.
"""
import struct
import zlib

import numpy as np
import pytest

from backend import frames
from pipeline import grid as grid_mod
from pipeline.fetch import load_config

SCALE = {"stops": [[0.1, "#000010"], [1.0, "#00ff00"], [10.0, "#ff0000"]], "opacity": 0.5}


def _decode_png(data):
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    pos, chunks = 8, {}
    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos:pos + 4])
        kind, body = data[pos + 4:pos + 8], data[pos + 8:pos + 8 + length]
        assert struct.unpack(">I", data[pos + 8 + length:pos + 12 + length])[0] == zlib.crc32(kind + body)  # checksum is right
        chunks[kind] = body
        pos += 12 + length
    cols, rows = struct.unpack(">II", chunks[b"IHDR"][:8])
    raw = zlib.decompress(chunks[b"IDAT"])
    stride = 1 + cols * 4
    return np.stack([np.frombuffer(raw[r * stride + 1:(r + 1) * stride], dtype=np.uint8).reshape(cols, 4) for r in range(rows)])


def test_png_round_trip(tmp_path):
    image = np.random.default_rng(1).integers(0, 256, size=(5, 7, 4), dtype=np.uint8)
    frames.write_png(tmp_path / "x.png", image)
    assert (_decode_png((tmp_path / "x.png").read_bytes()) == image).all()


def test_colour_scale_edges():
    out = frames.colourise(np.array([0.0, 0.0999, 0.1, 0.99, 1.0, 50.0]), SCALE)
    assert out[:2, 3].tolist() == [0, 0]  # below the first stop: transparent
    assert out[2].tolist() == [0, 0, 16, 128]  # exactly at a stop takes that stop's colour; alpha = 0.5 * 255 rounded
    assert out[3, :3].tolist() == [0, 0, 16] and out[4, :3].tolist() == [0, 255, 0]
    assert out[5, :3].tolist() == [255, 0, 0]  # above the last stop keeps the last colour


def test_agreement_colours_leave_empty_codes_transparent():
    out = frames.colourise_agreement(np.array([0, 1, 2], dtype=np.uint8), {0: "", 1: "#0000ff", 2: "#ff8000"}, 0.8)
    assert out[0].tolist() == [0, 0, 0, 0]
    assert out[1].tolist() == [0, 0, 255, 204] and out[2].tolist() == [255, 128, 0, 204]


def test_resample_shape_and_orientation():
    grid = load_config()["grid"]
    assert frames.resample(np.ones((grid["nj"], grid["ni"])), grid, 720, 85.0511287798).tolist() == np.ones((720, 720)).tolist()
    by_row = np.repeat(np.arange(grid["nj"], dtype=float)[:, None], grid["ni"], axis=1)  # value = row number, so 0 is the north edge
    image = frames.resample(by_row, grid, 720, 85.0511287798)
    assert image.shape == (720, 720) and (np.diff(image[:, 0]) >= 0).all()  # north at the top
    assert 15 <= image[0, 0] <= 25 and 695 <= image[-1, 0] <= 705  # +-85.05 degrees is about row 20 and row 700 of 721


def test_a_single_wet_cell_stays_visible_and_lands_at_its_place():
    grid = load_config()["grid"]
    field = np.zeros((grid["nj"], grid["ni"]), dtype=np.float32)
    row, col = grid_mod.latlon_to_index(51.5, -0.1, grid)  # London
    field[row, col] = 5.0
    image = frames.resample(field, grid, 720, 85.0511287798)
    ys, xs = np.nonzero(image)
    assert 1 <= len(ys) <= 4  # a nearest-cell picture would lose it; the maximum keeps it
    lon = -180 + 360 * (xs.mean() + 0.5) / 720
    lat = np.degrees(2 * np.arctan(np.exp(np.pi * (1 - 2 * (ys.mean() + 0.5) / 720))) - np.pi / 2)
    assert abs(lon - (-0.1)) < 1.0 and abs(lat - 51.5) < 1.0


@pytest.mark.parametrize("lon_first", [180.0, 0.0])  # the real files start at 180; the other convention must work as well
def test_the_longitude_of_a_column_lands_in_the_right_image_column(lon_first):
    grid = {"ni": 12, "nj": 7, "step_degrees": 30.0, "lat_first": 90.0, "lon_first": lon_first}
    field = np.zeros((7, 12))
    _, col = grid_mod.latlon_to_index(0.0, 0.0, grid)  # the column of the Greenwich meridian
    field[:, col] = 7.0
    image = frames.resample(field, grid, 24, 85.0511287798)  # 24 pixels: 15 degrees each, so the meridian is at pixels 12 (east side)
    wet_columns = np.nonzero(image.max(axis=0))[0]
    assert wet_columns.min() >= 10 and wet_columns.max() <= 13  # around the middle of the image, not at an edge
