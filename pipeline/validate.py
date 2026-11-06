"""Independent check of the processed data against the raw GRIB files (plan step 5).

pipeline/process.py finds a grid cell with its own index maths and reads whole fields with codes_get_values. This
module reads the same places another way: eccodes' own nearest-point search (codes_grib_find_nearest) on every raw
message. An error in the index maths, the row or column order, the unit factor or the de-accumulation shows up as a
difference. Shared on purpose: the unit table in the config, the step list and the quantising step (read from the config).
"""
import json

import eccodes
import numpy as np

from pipeline import grid as grid_mod
from pipeline import process
from pipeline.paths import ROOT, parse_run, raw_file, run_folder


def processed_runs(cfg):
    """Runs (UTC datetimes) in the processed folder that have a description file, oldest first."""
    base = ROOT / cfg["paths"]["processed_dir"]
    runs = []
    for folder in sorted(base.iterdir()) if base.is_dir() else []:
        try:
            run = parse_run(cfg, folder.name)
        except ValueError:  # not a run folder (e.g. a partial folder)
            continue
        if (folder / cfg["paths"]["meta_file"]).exists():
            runs.append(run)
    return runs


def raw_point_series(path, points, steps, cfg):
    """{point name: {"cumulative_mm": {step: mm}, "index": flat grid index, "nearest": (lat, lon)}} from one raw file.

    Uses eccodes' nearest-point search, not pipeline/grid.py.
    """
    wanted = set(steps)
    out = {p["name"]: {"cumulative_mm": {}, "index": None, "nearest": None} for p in points}
    with open(path, "rb") as f:
        while (handle := eccodes.codes_grib_new_from_file(f)) is not None:
            try:
                step = eccodes.codes_get(handle, "endStep")
                if step not in wanted:
                    continue
                factor = process.unit_factor(eccodes.codes_get(handle, "units"), cfg["units_to_mm"])
                for p in points:
                    near = eccodes.codes_grib_find_nearest(handle, p["lat"], p["lon"], is_lsm=False, npoints=1)[0]
                    record = out[p["name"]]
                    record["cumulative_mm"][step] = near.value * factor
                    record["index"], record["nearest"] = near.index, (near.lat, near.lon)
            finally:
                eccodes.codes_release(handle)
    return out


def intervals(cumulative, steps):
    """{step: accumulated mm} -> numpy array of mm per interval (negative rounding noise set to 0, as in the processing)."""
    values = np.array([cumulative[s] for s in steps], dtype=float)
    return np.clip(np.diff(values, prepend=0.0), 0.0, None)


def compare_run(cfg, run, points, tolerance):
    """One row per model and point: largest and mean absolute difference (mm) between the raw and the processed value."""
    folder = run_folder(cfg, "processed", run)
    meta = json.loads((folder / cfg["paths"]["meta_file"]).read_text(encoding="utf-8"))
    quantum, grid = cfg["process"]["quantise_mm"], cfg["grid"]
    limit = tolerance["max_abs_diff_mm"] + tolerance["float_slack_mm"]
    rows = []
    for model, info in meta["models"].items():
        stored = np.load(folder / info["file"], mmap_mode="r")
        series = raw_point_series(raw_file(cfg, run, model), points, info["steps"], cfg)
        for p in points:
            row, col = grid_mod.latlon_to_index(p["lat"], p["lon"], grid)
            raw = intervals(series[p["name"]]["cumulative_mm"], info["steps"])
            diff = np.abs(raw - process.dequantise(np.asarray(stored[:, row, col]), quantum))
            same_cell = series[p["name"]]["index"] == row * grid["ni"] + col
            rows.append({"model": model, "point": p["name"], "n": len(diff), "max_diff": float(diff.max()),
                         "mean_diff": float(diff.mean()), "max_raw": float(raw.max()), "same_cell": same_cell,
                         "nearest": series[p["name"]]["nearest"], "ok": bool(same_cell and diff.max() <= limit)})
    return rows
