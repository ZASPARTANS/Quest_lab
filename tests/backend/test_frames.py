"""Tests for backend/frames.py: the palette PNG writer, the smooth Mercator up-sampling, the rain gradient and the per-pixel agreement.

All arrays are invented test values, not forecast data. The PNG is decoded here with its own small reader (filters undone by hand), so the
writer is checked against the PNG format and not against itself.
"""
import struct
import zlib

import numpy as np
import pytest

from backend import frames
from pipeline import grid as grid_mod
from pipeline.fetch import load_config

GRID = {"ni": 12, "nj": 7, "step_degrees": 30.0, "lat_first": 90.0, "lon_first": 180.0}
SCALE = {"stops": [[0.1, "#000010"], [1.0, "#00ff00"], [10.0, "#ff0000"]], "opacity": 0.5}
CODES = {"both_dry": 0, "both_wet": 1, "disagree": 2}
MAX_LAT = 85.0511287798


def _decode_indexed_png(data):
    """Palette PNG bytes -> (indices, palette RGBA). Checks the signature, every chunk checksum, colour type 3 and undoes filters 0, 1 and 2."""
    assert data[:8] == frames.PNG_SIGNATURE
    pos, chunks = 8, {}
    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos:pos + 4])
        kind, body = data[pos + 4:pos + 8], data[pos + 8:pos + 8 + length]
        assert struct.unpack(">I", data[pos + 8 + length:pos + 12 + length])[0] == zlib.crc32(kind + body)
        chunks[kind] = body
        pos += 12 + length
    cols, rows, depth, colour_type = struct.unpack(">IIBB", chunks[b"IHDR"][:10])
    assert (depth, colour_type) == (8, 3)
    raw = zlib.decompress(chunks[b"IDAT"])
    out = np.zeros((rows, cols), dtype=np.uint8)
    for r in range(rows):
        kind, line = raw[r * (cols + 1)], np.frombuffer(raw[r * (cols + 1) + 1:(r + 1) * (cols + 1)], dtype=np.uint8)
        if kind == 0:
            out[r] = line
        elif kind == 1:  # Sub: add the pixel to the left
            out[r] = np.cumsum(line.astype(np.uint64)) % 256
        elif kind == 2:  # Up: add the pixel above
            out[r] = (line.astype(np.uint16) + (out[r - 1] if r else 0)) % 256
        else:
            raise AssertionError(f"unexpected filter {kind}")
    rgb = np.frombuffer(chunks[b"PLTE"], dtype=np.uint8).reshape(-1, 3)
    alpha = np.frombuffer(chunks[b"tRNS"], dtype=np.uint8)
    return out, np.column_stack([rgb, alpha]), [raw[r * (cols + 1)] for r in range(rows)]


def test_palette_png_round_trip_and_both_row_filters_are_used(tmp_path):
    palette = np.random.default_rng(2).integers(0, 256, size=(40, 4), dtype=np.uint8)
    smooth = np.tile(np.arange(30, dtype=np.uint8), (4, 1)) + np.arange(4, dtype=np.uint8)[:, None]       # rows are ramps: Sub wins on the first row
    repeated = np.tile(np.random.default_rng(3).integers(0, 40, size=30, dtype=np.uint8), (4, 1))        # identical noisy rows: Up wins below the first
    image = np.vstack([smooth, repeated])
    frames.write_png_indexed(tmp_path / "x.png", image, palette)
    decoded, decoded_palette, filters = _decode_indexed_png((tmp_path / "x.png").read_bytes())
    assert (decoded == image).all() and (decoded_palette == palette).all()
    assert 1 in filters and 2 in filters


def test_palette_png_refuses_indices_outside_the_palette(tmp_path):
    with pytest.raises(ValueError):
        frames.write_png_indexed(tmp_path / "x.png", np.array([[0, 5]], dtype=np.uint8), np.zeros((3, 4), dtype=np.uint8))
    with pytest.raises(ValueError):
        frames.write_png_indexed(tmp_path / "x.png", np.zeros((1, 1), dtype=np.uint8), np.zeros((300, 4), dtype=np.uint8))


def test_a_linear_ramp_is_reproduced_exactly_and_north_is_at_the_top():
    cols = np.tile(np.arange(GRID["ni"], dtype=float), (GRID["nj"], 1))                    # value = column number
    rows = np.repeat(np.arange(GRID["nj"], dtype=float)[:, None], GRID["ni"], axis=1)      # value = row number, 0 is the north edge
    size = 48
    rowf, colf = frames.mercator_axes(GRID, size, MAX_LAT)
    by_col = frames.interpolate(cols, GRID, size, MAX_LAT)
    by_row = frames.interpolate(rows, GRID, size, MAX_LAT)
    inside = (colf <= GRID["ni"] - 1)                                                       # beyond the last column the ramp wraps to column 0
    np.testing.assert_allclose(by_col[0][inside], colf[inside], atol=1e-4)                 # bilinear reproduces a linear ramp
    np.testing.assert_allclose(by_row[:, 0], np.clip(rowf, 0, GRID["nj"] - 1), atol=1e-4)
    assert (np.diff(by_row[:, 0]) >= 0).all() and by_row[0, 0] < by_row[-1, 0]            # north (row 0) at the top


def test_values_never_leave_the_range_of_the_grid_and_the_seam_at_the_date_line_is_smooth():
    field = np.random.default_rng(5).uniform(0, 40, size=(GRID["nj"], GRID["ni"])).astype(np.float32)
    image = frames.interpolate(field, GRID, 96, MAX_LAT)
    assert image.dtype == np.float32 and image.shape == (96, 96)
    assert image.min() >= field.min() - 1e-4 and image.max() <= field.max() + 1e-4
    step = np.abs(np.diff(image, axis=1)).max()
    seam = np.abs(image[:, 0] - image[:, -1]).max()                                         # the left and right edges of the picture are 1 pixel apart across the seam
    assert seam <= 3 * step + 1e-3


def test_the_longitude_of_a_column_lands_in_the_right_picture_column_for_both_conventions():
    for lon_first in (180.0, 0.0):
        grid = GRID | {"lon_first": lon_first}
        field = np.zeros((grid["nj"], grid["ni"]), dtype=np.float32)
        _, col = grid_mod.latlon_to_index(0.0, 0.0, grid)                                   # the column of the Greenwich meridian
        field[:, col] = 7.0
        image = frames.interpolate(field, grid, 24, MAX_LAT)
        wet = np.nonzero(image.max(axis=0) > 3.5)[0]
        assert wet.min() >= 10 and wet.max() <= 13                                          # around the middle of the picture, not at an edge


def test_a_single_wet_cell_stays_visible_and_lands_at_its_place():
    """Known limit, stated here on purpose: at 1440 px the picture's pixel centres fall between grid cell centres, so a LONE cell peak is drawn at
    about a quarter of its value (two neighbours in each direction share it). It must still be visible and in the right place; the plan reads the exact cell."""
    grid = load_config()["grid"]
    field = np.zeros((grid["nj"], grid["ni"]), dtype=np.float32)
    row, col = grid_mod.latlon_to_index(51.5, -0.1, grid)                                   # London
    field[row, col] = 50.0
    image = frames.interpolate(field, grid, 1440, MAX_LAT)
    ys, xs = np.nonzero(image > 5)
    assert len(ys) >= 4 and image.max() > 10                                                # still there, though lighter than the cell
    lon = -180 + 360 * (xs.mean() + 0.5) / 1440
    lat = np.degrees(2 * np.arctan(np.exp(np.pi * (1 - 2 * (ys.mean() + 0.5) / 1440))) - np.pi / 2)
    assert abs(lon - (-0.1)) < 0.5 and abs(lat - 51.5) < 0.5


def test_the_rain_palette_has_a_soft_edge_then_the_gradient_between_the_stops():
    palette = frames.rain_palette(SCALE, levels=3, fade_levels=4)                           # 3 levels sit exactly on the three stops (log10 -1, 0, 1)
    assert palette.shape == (7, 4)
    assert palette[0].tolist() == [0, 0, 16, 0]                                             # first stop's colour, fully transparent: never black-with-colour
    assert (palette[:4, :3] == [0, 0, 16]).all() and palette[3, 3] == 128 and np.all(np.diff(palette[:4, 3].astype(int)) > 0)
    assert palette[4].tolist() == [0, 0, 16, 128] and palette[5].tolist() == [0, 255, 0, 128] and palette[6].tolist() == [255, 0, 0, 128]
    with pytest.raises(ValueError):
        frames.rain_palette(SCALE, levels=300, fade_levels=4)


def test_rain_indices_edges():
    mm = np.array([0.0, 0.049, 0.05, 0.075, 0.0999, 0.1, 0.99, 1.0, 10.0, 99.0])
    index = frames.rain_indices(mm, SCALE, levels=3, fade_levels=4, fade_from_mm=0.05)
    assert index[0] == 0 and index[1] == 0 and index[2] == 0                                # nothing at or below 0.05 mm
    assert 0 < index[3] < 4 and index[4] == 3                                               # a soft edge up to the first stop
    assert index[5] == 4 and index[7] == 5 and index[8] == 6 and index[9] == 6             # first stop, middle stop, last stop, above the last stop keeps it
    assert 4 < index[6] <= 5                                                                # just below 1 mm is between the first two stops (monotone)
    assert (np.diff(frames.rain_indices(np.linspace(0, 20, 500), SCALE, 16, 16, 0.05).astype(int)) >= 0).all()
    with pytest.raises(ValueError):
        frames.rain_indices(mm, SCALE, 3, 4, fade_from_mm=0.2)


def test_agreement_uses_the_plans_rule_on_the_stored_values():
    a = np.array([[5.0, 4.0, 5.0, 4.6, 4.4]])
    b = np.array([[5.0, 4.0, 4.0, 5.0, 4.4]])
    out = frames.agreement_indices(a, b, wet_limit=5, codes=CODES)
    # exactly at the limit counts as wet; 4.6 rounds to 5 (wet) and 4.4 to 4 (dry), as the stored values would
    assert out.tolist() == [[CODES["both_wet"], CODES["both_dry"], CODES["disagree"], CODES["both_wet"], CODES["both_dry"]]]
    assert out.dtype == np.uint8


def test_agreement_palette_leaves_empty_classes_transparent():
    palette = frames.agreement_palette(CODES, {"both_dry": "", "both_wet": "#0000ff", "disagree": "#ff8000"}, 0.8)
    assert palette.tolist() == [[0, 0, 0, 0], [0, 0, 255, 204], [255, 128, 0, 204]]


def _hls(hex_colour):
    import colorsys
    r, g, b = (int(hex_colour[i:i + 2], 16) / 255 for i in (1, 3, 5))
    h, lightness, _ = colorsys.rgb_to_hls(r, g, b)
    return h * 360, lightness


def test_the_agreement_view_uses_one_blue_family_with_a_clear_step_in_lightness(backend):
    """PLAN-012: orange for 'models disagree' read as heat, so both coloured classes are blue (same hue, within 10 degrees, blue range); the class where
    both models say rain is clearly brighter than the one where only one does; dry stays transparent."""
    colours = backend["frames"]["agreement_colours"]
    assert colours["both_dry"] == ""
    (hue_both, light_both), (hue_one, light_one) = _hls(colours["both_wet"]), _hls(colours["disagree"])
    assert 190 <= hue_both <= 250 and 190 <= hue_one <= 250, "both coloured classes are blue"
    assert abs(hue_both - hue_one) <= 10
    assert light_both - light_one >= 0.15, "bright = both models, dimmer = one model"
