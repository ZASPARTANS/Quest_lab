"""Point tiles: the 6-hour rain series of every grid cell for both models, in small gzip files the browser can fetch one at a time.

The grid (721 x 1440) is cut into square tiles of `tile_size` cells (edge tiles are smaller). One tile file holds, for every "layer"
(a model's 6 h block; layers of the first model come first), every cell of the tile, as little-endian uint16 in multiples of the
storage step (0.1 mm). File = gzip( header + payload ); the header is 5 little-endian uint16:
    version (1), rows, columns, layers, flags (bit 0 = the payload is byte-shuffled: all high bytes first, then all low bytes)
Payload order is layer, row, column. The browser decodes the same way (DecompressionStream) and treats the file as untrusted:
it checks the header against the manifest and the length against rows x columns x layers.
"""
import gzip
import math
import struct
import zlib

import numpy as np

from pipeline import grid as grid_mod

HEADER = struct.Struct("<5H")
VERSION = 1
FLAG_SHUFFLED = 1


def tile_counts(grid, size):
    """(tile rows, tile columns) needed to cover the grid."""
    return math.ceil(grid["nj"] / size), math.ceil(grid["ni"] / size)


def tile_shape(grid, size, tile_row, tile_col):
    """(rows, columns) of one tile; tiles at the south and east edge may be smaller than `size`."""
    return min(size, grid["nj"] - tile_row * size), min(size, grid["ni"] - tile_col * size)


def locate(grid, size, lat, lon):
    """Place -> (tile row, tile column, row inside the tile, column inside the tile), using the same cell as pipeline/grid.py."""
    row, col = grid_mod.latlon_to_index(lat, lon, grid)
    return row // size, col // size, row % size, col % size


def pack(block, shuffle):
    """(layers, rows, cols) uint16 -> gzip bytes of header + payload."""
    layers, rows, cols = block.shape
    values = np.ascontiguousarray(block, dtype="<u2")
    if shuffle:
        payload = (values >> 8).astype(np.uint8).tobytes() + (values & 255).astype(np.uint8).tobytes()
    else:
        payload = values.tobytes()
    flags = FLAG_SHUFFLED if shuffle else 0
    return gzip.compress(HEADER.pack(VERSION, rows, cols, layers, flags) + payload, compresslevel=9, mtime=0)


def unpack(data):
    """gzip bytes -> (layers, rows, cols) uint16; raises ValueError for anything that is not a well-formed tile."""
    try:
        raw = gzip.decompress(data)
    except (OSError, EOFError, zlib.error) as error:  # not gzip, or cut short
        raise ValueError(f"tile is not valid gzip: {error}") from error
    if len(raw) < HEADER.size:
        raise ValueError("tile too short")
    version, rows, cols, layers, flags = HEADER.unpack_from(raw)
    payload = raw[HEADER.size:]
    if version != VERSION or flags & ~FLAG_SHUFFLED or len(payload) != 2 * rows * cols * layers:
        raise ValueError(f"bad tile header or length: version {version}, flags {flags}, {rows}x{cols}x{layers}, {len(payload)} bytes")
    count = rows * cols * layers
    if flags & FLAG_SHUFFLED:
        high = np.frombuffer(payload, dtype=np.uint8, count=count).astype("<u2")
        low = np.frombuffer(payload, dtype=np.uint8, count=count, offset=count).astype("<u2")
        values = (high << 8) | low
    else:
        values = np.frombuffer(payload, dtype="<u2")
    return values.reshape(layers, rows, cols).astype(np.uint16)


def read_cell(data, row_in_tile, col_in_tile):
    """The series (one uint16 per layer) of one cell of a tile file."""
    block = unpack(data)
    return block[:, row_in_tile, col_in_tile]


def write_tiles(folder, layers, grid, size, name_template, shuffle):
    """Cut `layers` (layers, rows, cols) uint16 into tiles and write them to `folder`. Returns (file count, total bytes, largest file)."""
    folder.mkdir(parents=True, exist_ok=True)
    tile_rows, tile_cols = tile_counts(grid, size)
    total, largest = 0, 0
    for tr in range(tile_rows):
        for tc in range(tile_cols):
            block = layers[:, tr * size:(tr + 1) * size, tc * size:(tc + 1) * size]
            data = pack(block, shuffle)
            (folder / name_template.format(row=tr, col=tc)).write_bytes(data)
            total, largest = total + len(data), max(largest, len(data))
    return tile_rows * tile_cols, total, largest
