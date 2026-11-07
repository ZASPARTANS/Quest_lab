"""Independent reference for the browser plan code (plan step 8, decision D28).

Reads the RAW GRIB files at the validation places (eccodes' own nearest-point search, as in plan step 5), turns them into 6 h blocks,
and works out windows, day states and rain totals with its own Python version of the rules. frontend/tools/plan_check.mjs then runs
the browser code on the real exported tiles and must give the same answers. Nothing here is shared with the JavaScript.
Run (the `process` container: no network, writes only data/):
    docker compose -f docker/compose.yaml run --rm process python -m scripts.plan_reference
"""
import datetime as dt
import json
import sys
import tomllib

import numpy as np

from pipeline import process, validate
from pipeline.fetch import expand_steps, load_config
from pipeline.paths import ROOT, parse_run, raw_file, run_folder

RANK = {"sure": 0, "uncertain": 1, "one-model": 2}
ISO = "%Y-%m-%dT%H:%M:%SZ"


def wet_limit(threshold, quantum):
    return int(np.ceil(threshold / quantum - 1e-9))


def place_blocks(cfg, run, point, meta, quantum):
    """{end time: {model: stored integer}} for one place, from the raw files."""
    out = {}
    for model, info in meta["models"].items():
        series = validate.raw_point_series(raw_file(cfg, run, model), [point], info["steps"], cfg)[point["name"]]
        stored = process.quantise(validate.intervals(series["cumulative_mm"], info["steps"]), quantum)[0]
        for end, value in zip(info["valid_times"], stored.tolist()):
            out.setdefault(end, {})[model] = value
    return dict(sorted(out.items()))


def classify(blocks, activity, now, offset, quantum, interval):
    """Rows with the state of every block that is not over, for one activity (offset in minutes east of UTC)."""
    limit = wet_limit(activity["wet_mm"], quantum)
    lo, hi = activity["hours"]
    rows = []
    for end_text, values in blocks.items():
        end = dt.datetime.strptime(end_text, ISO)
        start = end - dt.timedelta(hours=interval)
        mid = start + dt.timedelta(hours=interval / 2) + dt.timedelta(minutes=offset)
        wet = [v >= limit for v in values.values()]
        state = "wet" if all(wet) else "disagree" if any(wet) else "dry"
        remaining = (end - now) / (end - start)
        rows.append({"start": start, "end": end, "state": state, "single": len(wet) < 2, "day": mid.date().isoformat(),
                     "in_hours": lo <= mid.hour + mid.minute / 60 < hi, "past": end <= now, "current": start < now < end, "remaining": remaining})
    return rows


def windows_of(rows, activity, now, min_remaining):
    usable = [r["in_hours"] and not r["past"] and r["state"] != "wet" and r["remaining"] >= min_remaining for r in rows]
    runs, run = [], []
    for row, ok in zip(rows, usable):
        if ok and (not run or run[-1]["end"] == row["start"]):
            run.append(row)
            continue
        runs.extend([run] if run else [])
        run = [row] if ok else []
    runs.extend([run] if run else [])
    found = []
    for r in runs:
        if len(r) < activity["min_blocks"]:
            continue
        kind = "one-model" if any(b["single"] for b in r) else "uncertain" if any(b["state"] == "disagree" for b in r) else "sure"
        starts_now = bool(r[0]["current"])
        found.append({"start": now if starts_now else r[0]["start"], "end": r[-1]["end"], "blocks": len(r), "confidence": kind, "starts_now": starts_now})
    return sorted(found, key=lambda w: (RANK[w["confidence"]], -w["blocks"], w["start"]))


def days_of(rows, shown):
    """{local day: [state of every block of that day]} for the first `shown` days that still have a block not over (past blocks of those days are kept)."""
    keys = list(dict.fromkeys(r["day"] for r in rows if not r["past"]))[:shown]
    return {k: [r["state"] for r in rows if r["day"] == k] for k in keys}


def totals_of(blocks, now, days_list, quantum, interval, models):
    upcoming = [(e, v) for e, v in blocks.items() if dt.datetime.strptime(e, ISO) > now]
    out = []
    for days in days_list:
        part = upcoming[: days * 24 // interval]
        both = [v for _, v in part if all(m in v for m in models)]
        rest = [v for _, v in part if not all(m in v for m in models)]
        own = {m: round(sum(v[m] for v in both) * quantum, 6) for m in models}
        extra = None
        if rest:
            model = next(m for m in models if m in rest[0])
            extra = {"model": model, "blocks": len(rest), "mm": round(sum(v.get(model, 0) for v in rest) * quantum, 6)}
        out.append({"days": days, "blocks": len(part), "common": {"blocks": len(both), "perModel": own, "low": min(own.values()), "high": max(own.values())}, "extra": extra})
    return out


def main(argv):
    cfg = load_config()
    activities, frontend = (json.loads((ROOT / cfg["paths"][key]).read_text(encoding="utf-8")) for key in ("activities_file", "frontend_config_file"))
    settings = tomllib.loads((ROOT / cfg["paths"]["validation_points_file"]).read_text(encoding="utf-8"))
    runs = validate.processed_runs(cfg)
    run = parse_run(cfg, argv[0]) if argv else runs[-1]
    meta = json.loads((run_folder(cfg, "processed", run) / cfg["paths"]["meta_file"]).read_text(encoding="utf-8"))
    quantum, interval, models = cfg["process"]["quantise_mm"], cfg["process"]["interval_hours"], cfg["process"]["agreement_models"]
    now = run + dt.timedelta(hours=frontend["check"]["now_hours_after_run"])
    plans = [a for a in activities["activities"]] + [activities["custom"] | {"wet_mm": activities["custom"]["default_wet_mm"]}]
    result = {"run": run.strftime(ISO), "now": now.strftime(ISO), "quantum_mm": quantum, "places": []}
    for point in settings["points"]:
        blocks = place_blocks(cfg, run, point, meta, quantum)
        entry = {"name": point["name"], "lat": point["lat"], "lon": point["lon"], "zone": point["zone"], "offset_minutes": point["utc_offset_minutes"],
                 "stored": {m: [v[m] for v in blocks.values() if m in v] for m in meta["models"]},
                 "totals": totals_of(blocks, now, activities["totals_days"], quantum, interval, models), "plans": {}}
        for activity in plans:
            rows = classify(blocks, activity, now, point["utc_offset_minutes"], quantum, interval)
            wins = windows_of(rows, activity, now, activities["current_block_min_remaining_fraction"])
            entry["plans"][activity["id"]] = {
                "windows": [[w["start"].strftime(ISO), w["end"].strftime(ISO), w["blocks"], w["confidence"], w["starts_now"]] for w in wins],
                "days": days_of(rows, activities["days_shown"])}
        result["places"].append(entry)
    target = ROOT / cfg["paths"]["plan_reference_file"]
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, indent=1), encoding="utf-8")
    print(f"run {run:%Y-%m-%d %H:%M} UTC, check time {now:%Y-%m-%d %H:%M} UTC: {len(result['places'])} places x {len(plans)} activities -> {target.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
