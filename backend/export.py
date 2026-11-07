"""Export a processed run as the static data the web app reads (plan PLAN-006 step 7): point tiles, map frames and manifest.json.

Reads data/processed/<run>/ (pipeline/processed.py) and writes <site_dir>/ (git-ignored). The folder is built as a partial folder and
replaces the old one only when everything, including the manifest check, is done. Settings: config/backend.toml.
Run:  python -m backend.export [run folder name]          (default: newest processed run)
"""
import datetime as dt
import json
import os
import sys
import tomllib

import numpy as np

from backend import frames, manifest, tiles
from pipeline import process, validate
from pipeline.fetch import load_config
from pipeline.paths import ROOT, parse_run, partial, raw_file, remove_folder, run_folder


def load_backend(cfg):
    return tomllib.loads((ROOT / cfg["paths"]["backend_config_file"]).read_text(encoding="utf-8"))


def retrieval_time(cfg, run):
    """Newest modification time of the raw files of this run (= when they were downloaded; a reused file keeps its time)."""
    stamps = [raw_file(cfg, run, model).stat().st_mtime for model in cfg["models"]]
    return dt.datetime.fromtimestamp(max(stamps), tz=dt.timezone.utc)


def write_frames(cfg, backend, folder, meta, arrays, out):
    """One palette PNG per model and block plus the agreement (backend/frames.py). Returns {kind: {step: relative path}}."""
    fe = json.loads((ROOT / cfg["paths"]["frontend_config_file"]).read_text(encoding="utf-8"))
    spec = backend["frames"]
    (out / spec["folder"]).mkdir(parents=True, exist_ok=True)
    grid, quantum = cfg["grid"], meta["quantise_mm"]
    listed = {}

    def save(kind, step, indices, palette):
        relative = f"{spec['folder']}/{spec['file'].format(kind=kind, step=step)}"
        frames.write_png_indexed(out / relative, indices, palette)
        listed.setdefault(kind, {})[str(step)] = relative

    def smooth(stored_block):
        return frames.interpolate(np.asarray(stored_block), grid, spec["size"], spec["max_latitude"])

    palette = frames.rain_palette(fe["colour_scale"], spec["gradient_levels"], spec["fade_levels"])
    for model, info in meta["models"].items():
        for k, step in enumerate(info["steps"]):
            indices = frames.rain_indices(smooth(arrays[model][k]) * quantum, fe["colour_scale"], spec["gradient_levels"], spec["fade_levels"], spec["fade_from_mm"])
            save(model, step, indices, palette)
    codes = meta["agreement"]["codes"]
    shades = frames.agreement_palette(codes, spec["agreement_colours"], spec["agreement_opacity"])
    a, b = meta["agreement"]["models"]
    limit = process.wet_limit(meta["agreement"]["wet_threshold_mm"], quantum)
    for k, step in enumerate(meta["agreement"]["steps"]):
        save("agreement", step, frames.agreement_indices(smooth(arrays[a][k]), smooth(arrays[b][k]), limit, codes), shades)
    return listed


def export(cfg, backend, run):
    """Write the site folder for one processed run. Returns a summary dict (counts and sizes)."""
    folder = run_folder(cfg, "processed", run)
    meta = json.loads((folder / cfg["paths"]["meta_file"]).read_text(encoding="utf-8"))
    arrays = {m: np.load(folder / info["file"], mmap_mode="r") for m, info in meta["models"].items()}
    layers = np.concatenate([np.asarray(arrays[m]) for m in meta["models"]], axis=0)
    out = ROOT / cfg["paths"]["site_dir"]
    part = partial(cfg, out)
    remove_folder(part)
    part.mkdir(parents=True)
    spec = backend["tiles"]
    count, tile_bytes, largest = tiles.write_tiles(part / spec["folder"], layers, cfg["grid"], spec["size"], spec["file"], spec["byte_shuffle"])
    listed = write_frames(cfg, backend, folder, meta, arrays, part) if backend["frames"]["enabled"] else None
    doc = manifest.build(cfg, backend, run, meta, retrieval_time(cfg, run), listed, tiles.tile_counts(cfg["grid"], spec["size"]))
    problems = manifest.validate(doc)
    if problems:
        raise ValueError("manifest check failed: " + "; ".join(problems))
    (part / backend["manifest"]["file"]).write_text(json.dumps(doc, indent=1), encoding="utf-8")
    remove_folder(out)
    os.replace(part, out)
    sizes = [p.stat().st_size for p in (out / backend["frames"]["folder"]).glob("*")] if listed else []
    frame_bytes, largest_frame = sum(sizes), max(sizes, default=0)
    return {"out": out, "tile_files": count, "tile_bytes": tile_bytes, "largest_tile": largest, "frame_files": sum(map(len, (listed or {}).values())),
            "frame_bytes": frame_bytes, "largest_frame": largest_frame, "manifest_bytes": (out / backend["manifest"]["file"]).stat().st_size}


def main(argv):
    cfg = load_config()
    runs = validate.processed_runs(cfg)
    if not runs:
        raise SystemExit("no processed run found; run the `process` service first")
    run = parse_run(cfg, argv[0]) if argv else runs[-1]
    s = export(cfg, load_backend(cfg), run)
    total = s["tile_bytes"] + s["frame_bytes"] + s["manifest_bytes"]
    print(f"exported run {run:%Y-%m-%d %H:%M} UTC -> {s['out'].relative_to(ROOT)}")
    print(f"  tiles : {s['tile_files']} files, {s['tile_bytes'] / 1e6:.1f} MB, largest {s['largest_tile'] / 1e3:.1f} kB")
    print(f"  frames: {s['frame_files']} files, {s['frame_bytes'] / 1e6:.1f} MB, largest {s['largest_frame'] / 1e3:.1f} kB")
    print(f"  manifest: {s['manifest_bytes'] / 1e3:.1f} kB; total {total / 1e6:.1f} MB in {s['tile_files'] + s['frame_files'] + 1} files")


if __name__ == "__main__":
    main(sys.argv[1:])
