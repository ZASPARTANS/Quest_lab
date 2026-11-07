"""manifest.json: the one file the browser reads first. It says which run the data is from, when it was retrieved, how the tiles and frames
are laid out and where the data came from. The browser treats it as untrusted; `validate` is the schema both sides are written against.
Times are UTC ISO strings ending in Z; a block's valid time is the END of the 6 h block (pipeline/process.py).
"""
import datetime as dt
import re

HEX = re.compile(r"#[0-9a-fA-F]{6}")
TOP_KEYS = {"format_version", "run", "retrieved_at", "processed_at", "exported_at", "interval_hours", "unit", "quantum_mm", "grid",
            "tiles", "models", "agreement", "frames", "source"}


def _iso(moment):
    return moment.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def build(cfg, backend, run, meta, retrieved_at, frame_files, tile_counts):
    """Assemble the manifest. `frame_files` is {kind: {step: relative path}} or None; `tile_counts` is (tile rows, tile columns)."""
    models, offset = {}, 0
    for name, info in meta["models"].items():
        models[name] = {"label": backend["source"]["models"][name], "layer_offset": offset, "layers": len(info["steps"]),
                        "steps": info["steps"], "valid_times": info["valid_times"]}
        offset += len(info["steps"])
    tiles = backend["tiles"]
    frames = backend["frames"]
    return {
        "format_version": backend["manifest"]["format_version"],
        "run": meta["run"],
        "retrieved_at": _iso(retrieved_at),
        "processed_at": meta["processed_at"],
        "exported_at": _iso(dt.datetime.now(dt.timezone.utc)),
        "interval_hours": meta["interval_hours"],
        "unit": meta["unit"],
        "quantum_mm": meta["quantise_mm"],
        "grid": meta["grid"],
        "tiles": {"size": tiles["size"], "rows": tile_counts[0], "cols": tile_counts[1], "layers": offset,
                  "path": f"{tiles['folder']}/{tiles['file']}", "byte_shuffle": tiles["byte_shuffle"], "encoding": "uint16-le"},
        "models": models,
        "agreement": meta["agreement"],
        "frames": None if frame_files is None else {"size": frames["size"], "max_latitude": frames["max_latitude"],
                                                    "projection": "web-mercator", "files": frame_files,
                                                    # colours the map legend needs; classes drawn transparent (an empty colour in the config) are left out
                                                    "agreement_colours": {k: v for k, v in frames["agreement_colours"].items() if v}},
        "source": {k: v for k, v in backend["source"].items() if k != "models"},
    }


def validate(manifest):
    """List of problems (empty = fine). Checks the keys, the layer bookkeeping and that the steps follow the 6 h axis."""
    problems = []
    missing = TOP_KEYS - manifest.keys()
    if missing:
        return [f"missing keys: {sorted(missing)}"]
    interval = manifest["interval_hours"]
    layers = 0
    for name, m in manifest["models"].items():
        steps = m["steps"]
        if m["layer_offset"] != layers or m["layers"] != len(steps) or len(m["valid_times"]) != len(steps):
            problems.append(f"{name}: layer bookkeeping does not add up")
        if steps != [interval * (k + 1) for k in range(len(steps))]:
            problems.append(f"{name}: steps are not {interval}, {2 * interval}, ... without gaps")
        layers += len(steps)
    if manifest["tiles"]["layers"] != layers:
        problems.append("tiles.layers is not the sum of the model layers")
    grid, tiles = manifest["grid"], manifest["tiles"]
    if tiles["rows"] != -(-grid["nj"] // tiles["size"]) or tiles["cols"] != -(-grid["ni"] // tiles["size"]):
        problems.append("tiles.rows/cols do not cover the grid")
    for name in manifest["agreement"]["models"]:
        if name not in manifest["models"]:
            problems.append(f"agreement model {name} is not among the models")
    if manifest["frames"] is not None:
        colours = manifest["frames"].get("agreement_colours")
        if not isinstance(colours, dict) or not colours or not all(isinstance(c, str) and HEX.fullmatch(c) for c in colours.values()):
            problems.append("frames.agreement_colours must map class names to #rrggbb colours")
        for kind, files in manifest["frames"]["files"].items():
            known = manifest["agreement"]["steps"] if kind == "agreement" else manifest["models"].get(kind, {}).get("steps")
            if known is None or sorted(int(s) for s in files) != known:
                problems.append(f"frames for {kind} do not match its steps")
    return problems
