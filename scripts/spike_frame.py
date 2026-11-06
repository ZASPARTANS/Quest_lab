"""SPIKE ONLY (plan step 6): draw ONE real rainfall interval as colour images for the library comparison.

shortcut: throwaway code. The real export (tiles, manifest, final frame format) is plan step 7 (backend/export.py) and
replaces this script; the frame format is decided after the library gate. Reads the newest processed run, takes the model
and forecast hour from config/frontend.json ("spike"), and writes two PNG files into the front end's data folder:
  the latitude/longitude image (for CesiumJS) and the Web Mercator image (for MapLibre GL JS; Mercator stops at 85.05 N/S).
Run:  docker compose -f docker/compose.yaml run --rm process python -m scripts.spike_frame
"""
import json
import struct
import sys
import zlib

import numpy as np

from pipeline import process, validate
from pipeline.fetch import load_config
from pipeline.paths import ROOT, parse_run, run_folder


def write_png(path, rgba):
    """Write a (rows, columns, 4) uint8 array as an 8-bit RGBA PNG (standard library only)."""
    rows, cols, _ = rgba.shape
    raw = b"".join(b"\x00" + rgba[r].tobytes() for r in range(rows))  # filter type 0 on every row

    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", cols, rows, 8, 6, 0, 0, 0))
                     + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def colourise(mm, scale):
    """mm per interval (2-D float array) -> RGBA uint8 using the stops of the colour scale (transparent below the first)."""
    limits = np.array([s[0] for s in scale["stops"]])
    colours = np.array([[int(s[1][k:k + 2], 16) for k in (1, 3, 5)] for s in scale["stops"]], dtype=np.uint8)
    index = np.searchsorted(limits, mm, side="right") - 1  # -1 = below the first stop
    out = np.zeros(mm.shape + (4,), dtype=np.uint8)
    wet = index >= 0
    out[wet, :3] = colours[index[wet]]
    out[wet, 3] = round(255 * scale["opacity"])
    return out


def mercator_rows(size, max_lat):
    """Latitude (degrees) of each row of a square Web Mercator image that spans +-max_lat."""
    y = np.pi * (1 - 2 * (np.arange(size) + 0.5) / size)  # +pi at the top row, -pi at the bottom row
    return np.degrees(2 * np.arctan(np.exp(y)) - np.pi / 2)


def main(argv):
    cfg = load_config()
    fe = json.loads((ROOT / cfg["paths"]["frontend_config_file"]).read_text(encoding="utf-8"))
    spike, grid = fe["spike"], cfg["grid"]
    runs = validate.processed_runs(cfg)
    run = parse_run(cfg, argv[0]) if argv else runs[-1]
    folder = run_folder(cfg, "processed", run)
    meta = json.loads((folder / cfg["paths"]["meta_file"]).read_text(encoding="utf-8"))
    info = meta["models"][spike["model"]]
    k = info["steps"].index(spike["step_hours"])
    mm = process.dequantise(np.load(folder / info["file"], mmap_mode="r")[k], cfg["process"]["quantise_mm"])
    out_dir = ROOT / fe["dev_data_dir"] / spike["folder"]
    out_dir.mkdir(parents=True, exist_ok=True)

    # columns run from lon_first (180 E = -180) eastwards, rows from the north: that already is the usual image layout
    write_png(out_dir / spike["equirectangular_file"], colourise(mm, fe["colour_scale"]))
    size, lat = spike["mercator_size"], mercator_rows(spike["mercator_size"], spike["mercator_max_latitude"])
    rows = np.clip(np.rint((grid["lat_first"] - lat) / grid["step_degrees"]).astype(int), 0, grid["nj"] - 1)
    cols = np.rint(((np.arange(size) + 0.5) / size * 360) / grid["step_degrees"]).astype(int) % grid["ni"]
    write_png(out_dir / spike["mercator_file"], colourise(mm[np.ix_(rows, cols)], fe["colour_scale"]))
    print(f"run {run:%Y-%m-%d %H:%M} UTC, {spike['model']}, interval ending +{spike['step_hours']} h "
          f"(valid {info['valid_times'][k]}): max {float(mm.max()):.1f} mm, wet cells {100 * float((mm >= 0.1).mean()):.1f} %")
    for name in (spike["equirectangular_file"], spike["mercator_file"]):
        print(f"  {out_dir.relative_to(ROOT) / name}  {(out_dir / name).stat().st_size / 1e3:.0f} kB")


if __name__ == "__main__":
    main(sys.argv[1:])
