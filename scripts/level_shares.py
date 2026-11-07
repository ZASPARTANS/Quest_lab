"""Share of 6-hour blocks in each rain level (decision D41): how often "no rain", "light", "moderate" and "heavy" occur in the processed forecast.

Reads the newest processed run (data/processed) and the levels in config/activities.json, and prints, for each model, the area-weighted share of
grid cells x blocks in each level for the first N days (config: frontend.json `check.level_share_days`). The cut-offs are the user's choice
(D41); this script only shows what they mean on real data. It writes nothing.
Run (the `process` container: no network, project read-only):
    docker compose -f docker/compose.yaml run --rm process python -m scripts.level_shares
"""
import json
import sys

import numpy as np

from pipeline import validate
from pipeline.fetch import load_config
from pipeline.paths import ROOT, run_folder


def level_shares(mm, from_mm):
    """mm: (blocks, rows, cols) rain per block; from_mm: lower bound of every level. -> area-weighted share per level (sums to 1)."""
    level = np.zeros(mm.shape, dtype=np.int8)
    for i, bound in enumerate(from_mm):
        if i > 0:
            level += (mm >= bound).astype(np.int8)
    weight = np.cos(np.deg2rad(np.linspace(90, -90, mm.shape[1])))[None, :, None]  # cells near the poles are smaller
    total = weight.sum() * mm.shape[0] * mm.shape[2]
    return [float(((level == k) * weight).sum() / total) for k in range(len(from_mm))]


def main(argv):
    cfg = load_config()
    activities = json.loads((ROOT / cfg["paths"]["activities_file"]).read_text(encoding="utf-8"))
    frontend = json.loads((ROOT / cfg["paths"]["frontend_config_file"]).read_text(encoding="utf-8"))
    run = validate.processed_runs(cfg)[-1]
    meta = json.loads((run_folder(cfg, "processed", run) / cfg["paths"]["meta_file"]).read_text(encoding="utf-8"))
    blocks = frontend["check"]["level_share_days"] * 24 // meta["interval_hours"]
    levels = activities["levels"]
    print(f"run {run:%Y-%m-%d %H:%M} UTC, first {blocks} blocks, levels: " + ", ".join(f"{lv['label']} from {lv['from_mm']} mm" for lv in levels))
    for model in meta["models"]:
        stored = np.load(run_folder(cfg, "processed", run) / meta["models"][model]["file"], mmap_mode="r")[:blocks]
        mm = np.asarray(stored, dtype=np.float32) * meta["quantise_mm"]
        shares = level_shares(mm, [lv["from_mm"] for lv in levels])
        print(f"  {model:12s} " + "  ".join(f"{lv['short']}: {100 * s:5.1f} %" for lv, s in zip(levels, shares)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
