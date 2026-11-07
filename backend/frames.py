"""Colour map frames for the map view: one picture per model and 6 h block, plus the agreement (plan PLAN-006 step 9; sharpened by PLAN-008, D34).

Frames are Web Mercator pictures (MapLibre, decision D22). The stored values (0.1 mm steps) of the 0.25 degree grid are interpolated
bilinearly between grid cell centres, so the picture is smooth when the browser magnifies it; nothing is lost because every picture
pixel is finer than a grid cell (the max-pooling of E023 is not needed when up-sampling). The plan never reads these pictures: it reads
the exact cell values from the point tiles (backend/tiles.py).
  rain       a continuous colour gradient in log10(mm) between the stops of config/frontend.json, quantised to `levels` steps, with a soft edge
             (alpha rises from 0 at `fade_from_mm` to full at the first stop); written as an 8-bit palette PNG (colour type 3 + tRNS)
  agreement  both models' interpolated values are classified per pixel with the plan's rule (rint(value) >= wet limit, D28)
Mercator ends at about 85.05 degrees north and south; the polar caps are not drawn. Only the standard library and numpy are used.
"""
import struct
import zlib

import numpy as np

PNG_SIGNATURE = bytes([137, 80, 78, 71, 13, 10, 26, 10])


def write_png_indexed(path, indices, palette):
    """Write (rows, columns) uint8 palette indices as an 8-bit palette PNG; `palette` is (n, 4) uint8 RGBA, n <= 256.

    Per row the better of two PNG filters is used (Sub or Up, by the smaller sum of absolute residuals), which suits smooth pictures.
    """
    rows, cols = indices.shape
    if not 1 <= len(palette) <= 256 or int(indices.max(initial=0)) >= len(palette):
        raise ValueError("palette has too few or too many entries for these indices")
    wide = indices.astype(np.int16)
    sub = np.diff(wide, axis=1, prepend=0)
    up = wide - np.vstack([np.zeros((1, cols), dtype=np.int16), wide[:-1]])
    use_up = np.abs(up).sum(axis=1) < np.abs(sub).sum(axis=1)
    raw = b"".join((bytes([2]) + up[r].astype(np.uint8).tobytes()) if use_up[r] else (bytes([1]) + sub[r].astype(np.uint8).tobytes()) for r in range(rows))

    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    path.write_bytes(PNG_SIGNATURE + chunk(b"IHDR", struct.pack(">IIBBBBB", cols, rows, 8, 3, 0, 0, 0)) + chunk(b"PLTE", palette[:, :3].tobytes())
                     + chunk(b"tRNS", palette[:, 3].tobytes()) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def _rgb(hex_colour):
    return [int(hex_colour[k:k + 2], 16) for k in (1, 3, 5)]


def mercator_axes(grid, size, max_lat):
    """Fractional grid row and column of every picture row and column centre (a grid cell centre is a whole number)."""
    y = np.pi * (1 - 2 * (np.arange(size) + 0.5) / size)  # +pi at the top edge, -pi at the bottom edge
    lat = np.clip(np.degrees(2 * np.arctan(np.exp(y)) - np.pi / 2), -max_lat, max_lat)
    lon = -180 + 360 * (np.arange(size) + 0.5) / size
    return (grid["lat_first"] - lat) / grid["step_degrees"], ((lon - grid["lon_first"]) % 360) / grid["step_degrees"]


def interpolate(field, grid, size, max_lat):
    """Grid field (rows, columns) -> (size, size) float32 picture field: bilinear between grid cell centres, north at the top, wrapping at the date line.

    Values never leave the range of the four neighbouring cells, so nothing overshoots.
    """
    rowf, colf = mercator_axes(grid, size, max_lat)
    r0 = np.clip(np.floor(rowf).astype(int), 0, grid["nj"] - 1)
    r1 = np.clip(r0 + 1, 0, grid["nj"] - 1)
    wr = (rowf - np.floor(rowf)).astype(np.float32)[:, None]
    c0 = np.floor(colf).astype(int)
    wc = (colf - c0).astype(np.float32)[None, :]
    c0, c1 = c0 % grid["ni"], (c0 + 1) % grid["ni"]
    f = np.asarray(field, dtype=np.float32)
    by_rows = f[r0] * (1 - wr) + f[r1] * wr
    return by_rows[:, c0] * (1 - wc) + by_rows[:, c1] * wc


def _scale(scale):
    stops = np.array([s[0] for s in scale["stops"]], dtype=np.float64)
    return stops, np.log10(stops), np.array([_rgb(s[1]) for s in scale["stops"]], dtype=np.float64)


def rain_palette(scale, levels, fade_levels):
    """Palette (fade_levels + levels, 4): the soft-edge entries (first stop colour, alpha 0 up to full) then the gradient in log10(mm)."""
    _, logs, colours = _scale(scale)
    if fade_levels < 2 or levels < 2 or fade_levels + levels > 256:
        raise ValueError("fade_levels and levels must be at least 2 and fit a 256-entry palette")
    full = round(255 * scale["opacity"])
    ramp = np.linspace(logs[0], logs[-1], levels)
    gradient = np.stack([np.interp(ramp, logs, colours[:, ch]) for ch in range(3)] + [np.full(levels, float(full))], axis=1)
    fade = np.column_stack([np.tile(colours[0], (fade_levels, 1)), np.linspace(0, full, fade_levels)])
    return np.rint(np.vstack([fade, gradient])).astype(np.uint8)


def rain_indices(mm, scale, levels, fade_levels, fade_from_mm):
    """mm (2-D array) -> palette indices for rain_palette: nothing below `fade_from_mm`, a soft edge up to the first stop, then the gradient."""
    stops, logs, _ = _scale(scale)
    if not 0 <= fade_from_mm < stops[0]:
        raise ValueError("fade_from_mm must be below the first colour stop")
    level = (np.log10(np.clip(mm, stops[0], stops[-1])) - logs[0]) / (logs[-1] - logs[0])
    ramp = fade_levels + np.rint(level * (levels - 1))
    fade = np.rint(np.clip((mm - fade_from_mm) / (stops[0] - fade_from_mm), 0, 1) * (fade_levels - 1))
    return np.where(mm >= stops[0], ramp, fade).astype(np.uint8)


def agreement_palette(codes, colours, opacity):
    """Palette indexed by agreement code (codes = {'both_dry': 0, ...}); a class whose colour is an empty string stays fully transparent."""
    palette = np.zeros((max(codes.values()) + 1, 4), dtype=np.uint8)
    for name, code in codes.items():
        if colours.get(name):
            palette[code] = _rgb(colours[name]) + [round(255 * opacity)]
    return palette


def agreement_indices(value_a, value_b, wet_limit, codes):
    """Two interpolated stored-value fields -> agreement codes per pixel, with the plan's rule: wet when rint(value) >= wet_limit (D28)."""
    wet_a, wet_b = np.rint(value_a) >= wet_limit, np.rint(value_b) >= wet_limit
    out = np.full(wet_a.shape, codes["disagree"], dtype=np.uint8)
    out[wet_a & wet_b] = codes["both_wet"]
    out[~wet_a & ~wet_b] = codes["both_dry"]
    return out
