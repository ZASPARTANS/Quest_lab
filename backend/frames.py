"""Colour map frames for the supporting map view (plan PLAN-006 step 9): one PNG per model and 6 h block, plus the agreement.

Frames are Web Mercator images (MapLibre, decision D22), so the 0.25 degree latitude/longitude grid is resampled: each image
row gets the latitude span a Mercator row has, each column its longitude span, and a pixel shows the maximum of the grid cells it covers.
Mercator ends at about 85.05 degrees north and south; the polar caps are not drawn. Frames only show the overview; the numbers
the plan is made from come from the point tiles (backend/tiles.py). Colours come from config/frontend.json (rain) and
config/backend.toml (agreement); only the standard library and numpy are used.
"""
import struct
import zlib

import numpy as np


def write_png(path, rgba):
    """Write a (rows, columns, 4) uint8 array as an 8-bit RGBA PNG."""
    rows, cols, _ = rgba.shape
    raw = b"".join(b"\x00" + rgba[r].tobytes() for r in range(rows))  # filter type 0 on every row

    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", cols, rows, 8, 6, 0, 0, 0))
                     + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def _rgb(hex_colour):
    return [int(hex_colour[k:k + 2], 16) for k in (1, 3, 5)]


def colourise(mm, scale):
    """mm per interval (2-D array) -> RGBA uint8; transparent below the first stop of the colour scale."""
    limits = np.array([s[0] for s in scale["stops"]])
    colours = np.array([_rgb(s[1]) for s in scale["stops"]], dtype=np.uint8)
    index = np.searchsorted(limits, mm, side="right") - 1  # -1 = below the first stop
    out = np.zeros(mm.shape + (4,), dtype=np.uint8)
    wet = index >= 0
    out[wet, :3] = colours[index[wet]]
    out[wet, 3] = round(255 * scale["opacity"])
    return out


def colourise_agreement(codes, codes_to_colour, opacity):
    """Agreement field (uint8 codes) -> RGBA; a code mapped to an empty string stays transparent."""
    out = np.zeros(codes.shape + (4,), dtype=np.uint8)
    for code, colour in codes_to_colour.items():
        if colour:
            hit = codes == code
            out[hit, :3] = _rgb(colour)
            out[hit, 3] = round(255 * opacity)
    return out


def resample(field, grid, size, max_lat):
    """Grid field (rows, columns) -> square Web Mercator image field of `size` pixels, each pixel the MAXIMUM of the grid cells it covers.

    The maximum (not the nearest cell) is used so that a small shower, narrower than a pixel, never disappears from the overview;
    for the agreement codes it means "disagree" wins over "wet" over "dry". Pixels finer than the grid (high latitudes) repeat a cell.
    """
    y = np.pi * (1 - 2 * np.arange(size + 1) / size)  # pixel edges: +pi at the top edge, -pi at the bottom edge
    lat = np.clip(np.degrees(2 * np.arctan(np.exp(y)) - np.pi / 2), -max_lat, max_lat)
    row_edges = np.clip(np.rint((grid["lat_first"] - lat) / grid["step_degrees"]).astype(int), 0, grid["nj"])
    first_col = int(round(((-180 - grid["lon_first"]) % 360) / grid["step_degrees"]))  # grid column at longitude -180
    col_edges = np.rint((np.arange(size + 1) * 360 / size) / grid["step_degrees"]).astype(int)
    shifted = np.roll(field, -first_col, axis=1)[row_edges[0]:row_edges[-1]]
    by_rows = np.maximum.reduceat(shifted, np.minimum(row_edges[:-1] - row_edges[0], shifted.shape[0] - 1), axis=0)
    return np.maximum.reduceat(by_rows, np.minimum(col_edges[:-1], by_rows.shape[1] - 1), axis=1)
