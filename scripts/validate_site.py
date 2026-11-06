"""Check the exported site data (plan PLAN-006 step 7): what the browser will read from the tiles must equal the processed arrays exactly,
and match the raw GRIB files (read with eccodes' own nearest-point search) within the tolerance, at every place in the validation-points config.

Run (the `process` container has no network and reads the project read-only):
    docker compose -f docker/compose.yaml run --rm process python -m scripts.validate_site [run folder name]
Exit code 0 only if every row passes.
"""
import sys
import tomllib

import numpy as np

from backend import export, manifest, readback
from pipeline import grid as grid_mod
from pipeline import validate
from pipeline.fetch import load_config
from pipeline.paths import ROOT, parse_run, raw_file, run_folder


def main(argv):
    cfg = load_config()
    backend = export.load_backend(cfg)
    settings = tomllib.loads((ROOT / cfg["paths"]["validation_points_file"]).read_text(encoding="utf-8"))
    run = parse_run(cfg, argv[0]) if argv else validate.processed_runs(cfg)[-1]
    doc = readback.load_manifest(cfg, backend)
    folder = run_folder(cfg, "processed", run)
    limit = settings["tolerance"]["max_abs_diff_mm"] + settings["tolerance"]["float_slack_mm"]
    print(f"site run {doc['run']}; processed run {run:%Y-%m-%dT%H:%MZ}; tolerance versus raw {limit} mm")
    print(f"{'model':12s} {'place':12s} {'blocks':>6s} {'tile vs processed':>18s} {'tile vs raw max mm':>19s}  result")
    failed = 0
    for model, info in doc["models"].items():
        processed = np.load(folder / cfg["paths"]["model_file"].format(model=model), mmap_mode="r")
        raw = validate.raw_point_series(raw_file(cfg, run, model), settings["points"], info["steps"], cfg)
        for p in settings["points"]:
            tile = readback.stored_series(cfg, backend, doc, p["lat"], p["lon"])[model]
            row, col = grid_mod.latlon_to_index(p["lat"], p["lon"], doc["grid"])
            exact = bool((np.asarray(processed[:, row, col]) == tile).all())
            diff = float(np.abs(validate.intervals(raw[p["name"]]["cumulative_mm"], info["steps"]) - tile * doc["quantum_mm"]).max())
            ok = exact and diff <= limit
            failed += not ok
            print(f"{model:12s} {p['name']:12s} {len(tile):6d} {'identical' if exact else 'DIFFERENT':>18s} {diff:19.4f}  {'ok' if ok else 'FAIL'}")
    print(f"{'all rows passed' if not failed else str(failed) + ' rows FAILED'}; manifest problems: "
          f"{manifest.validate(doc) or 'none'}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
