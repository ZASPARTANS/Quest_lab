"""PROTOTYPE (plan PLAN-008 step 9.3b-1, throwaway: removed when the sharper frames are built in step 9.3b-2).

Makes the IFS +24 h picture and the agreement of that block in the ways the plan compares, from the real processed run, and prints the PNG size
and the time each took. The pictures go to <site_dir>/proto/ (git-ignored) so the preview serves them to a throwaway viewer page.
  A  today's export: 720 px, the maximum of the covered cells (frames.resample)
  C  1440 px, bilinear interpolation of the stored values before colouring
  D  2048 px, bilinear
  E  1440 px, bilinear + a continuous colour gradient (soft edges) instead of hard colour bands
  F  2048 px, bilinear + gradient
  G/H  the gradient as an 8-bit palette PNG (1440 / 2048 px): far smaller than E/F
Run (the `process` container: no network, writes only data/):  docker compose -f docker/compose.yaml run --rm process python -m scripts.proto_frames
"""
import json
import struct
import time
import tomllib
import zlib

import numpy as np

from backend import frames
from pipeline import process, validate
from pipeline.fetch import load_config
from pipeline.paths import ROOT, run_folder

STEP = 24


def mercator_axes(grid, size, max_lat):
    """Fractional grid row and column of every picture row and column centre (a grid cell centre is a whole number)."""
    y = np.pi * (1 - 2 * (np.arange(size) + 0.5) / size)
    lat = np.clip(np.degrees(2 * np.arctan(np.exp(y)) - np.pi / 2), -max_lat, max_lat)
    lon = -180 + 360 * (np.arange(size) + 0.5) / size
    return (grid["lat_first"] - lat) / grid["step_degrees"], ((lon - grid["lon_first"]) % 360) / grid["step_degrees"]


def bilinear(field, grid, size, max_lat):
    """Grid field (rows, columns) -> (size, size) Web Mercator picture field, bilinear between grid cell centres, wrapping at the date line."""
    rowf, colf = mercator_axes(grid, size, max_lat)
    r0 = np.clip(np.floor(rowf).astype(int), 0, grid["nj"] - 1)
    r1 = np.clip(r0 + 1, 0, grid["nj"] - 1)
    wr = (rowf - np.floor(rowf)).astype(np.float32)[:, None]
    c0 = np.floor(colf).astype(int)
    wc = (colf - c0).astype(np.float32)[None, :]
    c0, c1 = c0 % grid["ni"], (c0 + 1) % grid["ni"]
    f = field.astype(np.float32)
    by_rows = f[r0] * (1 - wr) + f[r1] * wr
    return by_rows[:, c0] * (1 - wc) + by_rows[:, c1] * wc


def colourise_gradient(mm, scale, fade_from=0.05):
    """mm -> RGBA with a CONTINUOUS colour gradient between the scale stops (interpolated in log10 of mm) and a soft edge: alpha rises from 0 at
    `fade_from` mm to full at the first stop. The colour under the soft edge is the first stop's, never black (no dark fringe when the browser filters it)."""
    stops = np.array([s[0] for s in scale["stops"]])
    colours = np.array([[int(s[1][k:k + 2], 16) for k in (1, 3, 5)] for s in scale["stops"]], dtype=np.float32)
    x = np.log10(np.clip(mm, stops[0], stops[-1]))
    rgb = np.stack([np.interp(x, np.log10(stops), colours[:, ch]) for ch in range(3)], axis=-1)
    alpha = np.clip((mm - fade_from) / (stops[0] - fade_from), 0, 1) * scale["opacity"] * 255
    return np.concatenate([np.rint(rgb), np.rint(alpha)[..., None]], axis=-1).astype(np.uint8)


FADE_LEVELS, RAMP_LEVELS = 24, 160


def gradient_palette(scale, fade_from=0.05):
    """Palette (n, 4) uint8: FADE_LEVELS soft-edge entries (first stop colour, alpha rising from 0) then RAMP_LEVELS gradient entries in log10(mm)."""
    stops = np.array([s[0] for s in scale["stops"]])
    colours = np.array([[int(s[1][k:k + 2], 16) for k in (1, 3, 5)] for s in scale["stops"]], dtype=np.float32)
    full = round(255 * scale["opacity"])
    ramp = np.linspace(np.log10(stops[0]), np.log10(stops[-1]), RAMP_LEVELS)
    rgb = np.stack([np.interp(ramp, np.log10(stops), colours[:, ch]) for ch in range(3)], axis=-1)
    fade = np.concatenate([np.repeat(colours[:1], FADE_LEVELS, axis=0), np.linspace(0, full, FADE_LEVELS)[:, None]], axis=1)
    return np.rint(np.concatenate([fade, np.concatenate([rgb, np.full((RAMP_LEVELS, 1), full)], axis=1)])).astype(np.uint8), stops


def gradient_indices(mm, stops, fade_from=0.05):
    """mm -> palette index (uint8) for gradient_palette."""
    level = (np.log10(np.clip(mm, stops[0], stops[-1])) - np.log10(stops[0])) / (np.log10(stops[-1]) - np.log10(stops[0]))
    ramp = FADE_LEVELS + np.rint(level * (RAMP_LEVELS - 1))
    fade = np.rint(np.clip((mm - fade_from) / (stops[0] - fade_from), 0, 1) * (FADE_LEVELS - 1))
    return np.where(mm >= stops[0], ramp, fade).astype(np.uint8)


def write_png_indexed(path, indices, palette):
    """8-bit palette PNG (colour type 3) with a tRNS alpha table; rows use the Sub filter, which suits smooth pictures."""
    rows, cols = indices.shape
    wide = indices.astype(np.int16)
    sub = np.diff(wide, axis=1, prepend=0)                  # filter 1: minus the pixel to the left
    up = wide - np.vstack([np.zeros((1, cols), dtype=np.int16), wide[:-1]])  # filter 2: minus the pixel above
    use_up = np.abs(up).sum(axis=1) < np.abs(sub).sum(axis=1)  # per row, the one with the smaller residuals (the usual heuristic)
    raw = b"".join((bytes([2]) + up[r].astype(np.uint8).tobytes()) if use_up[r] else (bytes([1]) + sub[r].astype(np.uint8).tobytes()) for r in range(rows))

    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    signature = bytes([137, 80, 78, 71, 13, 10, 26, 10])
    path.write_bytes(signature + chunk(b"IHDR", struct.pack(">IIBBBBB", cols, rows, 8, 3, 0, 0, 0)) + chunk(b"PLTE", palette[:, :3].tobytes())
                     + chunk(b"tRNS", palette[:, 3].tobytes()) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def main():
    cfg = load_config()
    fe = json.loads((ROOT / cfg["paths"]["frontend_config_file"]).read_text(encoding="utf-8"))
    spec = tomllib.loads((ROOT / cfg["paths"]["backend_config_file"]).read_text(encoding="utf-8"))["frames"]
    run = validate.processed_runs(cfg)[-1]
    folder = run_folder(cfg, "processed", run)
    meta = json.loads((folder / cfg["paths"]["meta_file"]).read_text(encoding="utf-8"))
    quantum, grid, max_lat = cfg["process"]["quantise_mm"], cfg["grid"], spec["max_latitude"]
    ifs, aifs = (np.load(folder / meta["models"][m]["file"], mmap_mode="r") for m in cfg["process"]["agreement_models"])
    k = meta["models"]["ifs"]["steps"].index(STEP)
    block_ifs, block_aifs = np.asarray(ifs[k]), np.asarray(aifs[k])
    codes = meta["agreement"]["codes"]
    colours = {codes[name]: colour for name, colour in spec["agreement_colours"].items()}
    limit = process.wet_limit(cfg["process"]["wet_threshold_mm"], quantum)
    out = ROOT / cfg["paths"]["site_dir"] / "proto"
    out.mkdir(parents=True, exist_ok=True)
    print(f"run {run:%Y-%m-%d %H} UTC, block +{STEP} h; wet limit {limit} steps")
    print(f"{'variant':26s} {'size px':>8s} {'make s':>7s} {'png s':>6s} {'rain kB':>8s}   agreement kB")

    for name, size, smooth in (("A-720-maxpool", 720, False), ("C-1440-bilinear", 1440, True), ("D-2048-bilinear", 2048, True),
                               ("E-1440-gradient", 1440, "gradient"), ("F-2048-gradient", 2048, "gradient"),
                               ("L16-1440", 1440, "indexed16"), ("L24-1440", 1440, "indexed24"), ("L32-1440", 1440, "indexed32")):
        t0 = time.perf_counter()
        if smooth:
            mm = process.dequantise(bilinear(block_ifs, grid, size, max_lat), quantum)
            if str(smooth).startswith("indexed"):
                global RAMP_LEVELS
                RAMP_LEVELS = int(str(smooth)[7:])
                palette, stops = gradient_palette(fe["colour_scale"])
                rain = (gradient_indices(mm, stops), palette)
            else:
                rain = colourise_gradient(mm, fe["colour_scale"]) if smooth == "gradient" else frames.colourise(mm, fe["colour_scale"])
            wet_a = np.rint(bilinear(block_ifs, grid, size, max_lat)) >= limit
            wet_b = np.rint(bilinear(block_aifs, grid, size, max_lat)) >= limit
            agree = np.full(wet_a.shape, process.AGREE_DISAGREE, dtype=np.uint8)
            agree[wet_a & wet_b] = process.AGREE_BOTH_WET
            agree[~wet_a & ~wet_b] = process.AGREE_BOTH_DRY
        else:
            rain = frames.colourise(process.dequantise(frames.resample(block_ifs, grid, size, max_lat), quantum), fe["colour_scale"])
            field = np.load(folder / meta["agreement"]["file"], mmap_mode="r")
            agree = frames.resample(np.asarray(field[k]), grid, size, max_lat)
        shade = frames.colourise_agreement(agree, colours, spec["agreement_opacity"])
        made = time.perf_counter() - t0
        t1 = time.perf_counter()
        if isinstance(rain, tuple):
            write_png_indexed(out / f"{name}_rain.png", *rain)
        else:
            frames.write_png(out / f"{name}_rain.png", rain)
        frames.write_png(out / f"{name}_agreement.png", shade)
        written = time.perf_counter() - t1
        print(f"{name:26s} {size:8d} {made:7.2f} {written:6.2f} {(out / (name + '_rain.png')).stat().st_size / 1000:8.1f}   {(out / (name + '_agreement.png')).stat().st_size / 1000:.1f}")


if __name__ == "__main__":
    main()
