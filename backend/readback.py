"""Read a place back out of the exported site folder the way the browser does: manifest -> tile -> cell -> series in mm per 6 h.

Used by the tests and by scripts/validate_site.py to prove that what the web app will read equals what was processed.
"""
import json

from backend import tiles
from pipeline import process
from pipeline.paths import ROOT


def load_manifest(cfg, backend):
    path = ROOT / cfg["paths"]["site_dir"] / backend["manifest"]["file"]
    return json.loads(path.read_text(encoding="utf-8"))


def stored_series(cfg, backend, doc, lat, lon):
    """{model: uint16 series (tenths of mm per block)} of the grid cell nearest to (lat, lon)."""
    spec = doc["tiles"]
    tile_row, tile_col, row, col = tiles.locate(doc["grid"], spec["size"], lat, lon)
    name = backend["tiles"]["file"].format(row=tile_row, col=tile_col)
    data = (ROOT / cfg["paths"]["site_dir"] / backend["tiles"]["folder"] / name).read_bytes()
    series = tiles.read_cell(data, row, col)
    return {m: series[info["layer_offset"]:info["layer_offset"] + info["layers"]] for m, info in doc["models"].items()}


def series_mm(cfg, backend, doc, lat, lon):
    """{model: float32 array of mm per 6 h block} for a place."""
    return {m: process.dequantise(s, doc["quantum_mm"]) for m, s in stored_series(cfg, backend, doc, lat, lon).items()}
