"""Compare the processed data with the raw GRIB files at the places in the validation-points config (plan step 5).

Run (the `process` container has no network and reads the project read-only):
    docker compose -f docker/compose.yaml run --rm process python -m scripts.validate_points [run folder name]
The default run is the newest one in the processed folder. Exit code 0 only if every row is within the tolerance.
"""
import sys
import tomllib

from pipeline import validate
from pipeline.fetch import load_config
from pipeline.paths import ROOT, parse_run


def main(argv):
    cfg = load_config()
    settings = tomllib.loads((ROOT / cfg["paths"]["validation_points_file"]).read_text(encoding="utf-8"))
    runs = validate.processed_runs(cfg)
    if not runs:
        raise SystemExit("no processed run found; run the `process` service first")
    run = parse_run(cfg, argv[0]) if argv else runs[-1]
    rows = validate.compare_run(cfg, run, settings["points"], settings["tolerance"])
    print(f"run {run:%Y-%m-%d %H:%M} UTC; tolerance {settings['tolerance']['max_abs_diff_mm']} mm (+ {settings['tolerance']['float_slack_mm']} slack)")
    print(f"{'model':12s} {'place':12s} {'intervals':>9s} {'max diff mm':>11s} {'mean diff mm':>12s} {'max rain mm':>11s}  same cell  nearest grid point  result")
    for r in rows:
        lat, lon = r["nearest"]
        print(f"{r['model']:12s} {r['point']:12s} {r['n']:9d} {r['max_diff']:11.4f} {r['mean_diff']:12.4f} {r['max_raw']:11.1f}  "
              f"{'yes' if r['same_cell'] else 'NO':9s}  {lat:7.2f},{lon:8.2f}     {'ok' if r['ok'] else 'FAIL'}")
    failed = [r for r in rows if not r["ok"]]
    print(f"{len(rows) - len(failed)} of {len(rows)} rows within tolerance")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
