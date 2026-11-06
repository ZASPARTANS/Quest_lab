"""Process a downloaded run and write it to <processed_dir>/<run folder>/ (git-ignored).

All folder and file names come from the [paths] table of config/pipeline.toml (names in brackets are the config keys).
Files written (shapes are (intervals, rows, columns); row 0 = north, column 0 = lon_first, see pipeline/grid.py):
  one file per model (model_file)   uint16, precipitation per 6 h interval in multiples of `quantise_mm`
  agreement_file                    uint8, 0 both dry / 1 both wet / 2 disagree, for the intervals both models have
  meta_file                         run time, valid times, units, thresholds, counts
Run:  python -m pipeline.processed [run folder name]      (default: newest run found in the raw folder)
"""
import datetime as dt
import json
import os
import shutil
import sys

import numpy as np

from pipeline import grid as grid_mod
from pipeline import process
from pipeline.fetch import describe_messages, expand_steps, load_config
from pipeline.paths import ROOT, parse_run, partial, raw_file, run_folder


def local_runs(cfg):
    """Runs (UTC datetimes) in the raw folder that hold the downloaded file of every configured model, oldest first."""
    raw = ROOT / cfg["paths"]["raw_dir"]
    runs = []
    for folder in sorted(raw.iterdir()) if raw.is_dir() else []:
        try:
            runs.append(parse_run(cfg, folder.name))
        except ValueError:  # not a run folder (e.g. a partial or foreign folder)
            continue
    return [r for r in runs if all(raw_file(cfg, r, m).exists() for m in cfg["models"])]


def process_model(cfg, run, model):
    """Read one model's GRIB file and return its 6 h intervals in mm plus what was seen on the way."""
    interval = cfg["process"]["interval_hours"]
    path = raw_file(cfg, run, model)
    steps = process.interval_steps(expand_steps(cfg["models"][model]["step_ranges"]), interval)
    cumulative = process.read_cumulative_mm(path, steps, run, cfg)
    mm, negative, worst = process.deaccumulate(cumulative, steps)
    return {"steps": steps, "mm": mm, "negative_cells": negative, "most_negative_mm": worst,
            "source_units": sorted({m["units"] for m in describe_messages(path)})}


def build(cfg, run):
    """Process every model and the agreement of the configured pair. Returns (results, agreement array, steps)."""
    results = {m: process_model(cfg, run, m) for m in cfg["models"]}
    a, b = cfg["process"]["agreement_models"]
    n = min(len(results[a]["steps"]), len(results[b]["steps"]))
    field = process.agreement(results[a]["mm"][:n], results[b]["mm"][:n], cfg["process"]["wet_threshold_mm"])
    return results, field, results[a]["steps"][:n]


def _meta(cfg, run, results, agree_steps, stored):
    p = cfg["process"]
    names = cfg["paths"]
    models = {m: {"file": names["model_file"].format(model=m), "steps": r["steps"],
                  "valid_times": [t.strftime("%Y-%m-%dT%H:%M:%SZ") for t in process.valid_times(run, r["steps"])],
                  "source_units": r["source_units"], "negative_cells_set_to_zero": r["negative_cells"],
                  "most_negative_mm": r["most_negative_mm"], "values_at_uint16_maximum": stored[m]}
              for m, r in results.items()}
    return {"run": run.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "processed_at": dt.datetime.now(dt.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "interval_hours": p["interval_hours"], "unit": "mm per interval", "quantise_mm": p["quantise_mm"],
            "grid": cfg["grid"], "models": models,
            "agreement": {"file": names["agreement_file"], "models": p["agreement_models"], "steps": agree_steps,
                          "wet_threshold_mm": p["wet_threshold_mm"],
                          "codes": {"both_dry": process.AGREE_BOTH_DRY, "both_wet": process.AGREE_BOTH_WET,
                                    "disagree": process.AGREE_DISAGREE}}}


def _remove_folder(path):
    """Delete an old output folder. A failure (e.g. files owned by another user) must stop the run with its real
    error: ignoring it ended in a misleading "Directory not empty" later (docs/ERRORS.md E015)."""
    if path.exists():
        shutil.rmtree(path)


def save(cfg, run, results, field, agree_steps):
    """Write the processed files. They are built in a partial folder that replaces the final folder at the end."""
    names = cfg["paths"]
    out = run_folder(cfg, "processed", run)
    part = partial(cfg, out)
    _remove_folder(part)
    part.mkdir(parents=True)
    saturated = {}
    for model, r in results.items():
        stored, saturated[model] = process.quantise(r["mm"], cfg["process"]["quantise_mm"])
        np.save(part / names["model_file"].format(model=model), stored)
    np.save(part / names["agreement_file"], field)
    meta = _meta(cfg, run, results, agree_steps, saturated)
    (part / names["meta_file"]).write_text(json.dumps(meta, indent=1), encoding="utf-8")
    _remove_folder(out)
    os.replace(part, out)
    return out


def summarise(cfg, results, field, agree_steps):
    """Print the numbers that show whether the result is sensible (compared with climatology in the step record)."""
    grid, interval = cfg["grid"], cfg["process"]["interval_hours"]
    n, days = len(agree_steps), len(agree_steps) * interval / 24
    for model, r in results.items():
        means = [grid_mod.area_weighted_mean(r["mm"][k], grid) for k in range(n)]
        print(f"[{model}] intervals {len(r['steps'])} ({r['steps'][0]}..{r['steps'][-1]} h)  source units {r['source_units']}")
        print(f"  area-weighted global mean over the first {n} intervals (0-{agree_steps[-1]} h): {sum(means) / days:.3f} mm/day")
        print(f"  negative cells set to 0: {r['negative_cells']}  (most negative {r['most_negative_mm']:.2e} mm)")
    total = field.size
    for name, code in (("both dry", process.AGREE_BOTH_DRY), ("both wet", process.AGREE_BOTH_WET), ("disagree", process.AGREE_DISAGREE)):
        print(f"agreement {name}: {100 * (field == code).sum() / total:.1f} % of cells x intervals")


def main(argv):
    cfg = load_config()
    runs = local_runs(cfg)
    if not runs:
        raise SystemExit("no complete downloaded run found; run `python -m pipeline.fetch` first")
    run = parse_run(cfg, argv[0]) if argv else runs[-1]
    results, field, agree_steps = build(cfg, run)
    out = save(cfg, run, results, field, agree_steps)
    print(f"processed run {run:%Y-%m-%d %H:%M} UTC -> {out.relative_to(ROOT)}")
    summarise(cfg, results, field, agree_steps)


if __name__ == "__main__":
    main(sys.argv[1:])
