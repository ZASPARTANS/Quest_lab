"""Tests for backend/manifest.py and backend/export.py: the whole path from a processed run to the site folder the browser reads.

TEST FIXTURES ONLY (see conftest.py). The export is tested on files written by the real pipeline/processed.py save function.
"""
import copy
import datetime as dt
import json
import os
import struct

import numpy as np
import pytest

from backend import export, manifest, readback, tiles
from pipeline import paths, process

RUN = dt.datetime(2026, 11, 6, 12)


def _site(cfg):
    return paths.ROOT / cfg["paths"]["site_dir"]


def test_export_writes_tiles_frames_and_a_valid_manifest(cfg, backend, processed_run):
    summary = export.export(cfg, backend, RUN)
    site = _site(cfg)
    doc = json.loads((site / backend["manifest"]["file"]).read_text(encoding="utf-8"))
    assert manifest.validate(doc) == []
    tile_rows, tile_cols = tiles.tile_counts(cfg["grid"], backend["tiles"]["size"])
    assert summary["tile_files"] == tile_rows * tile_cols == len(list((site / "tiles").glob("*.bin.gz")))
    assert summary["frame_files"] == 4 + 6 + 4 == len(list((site / "frames").glob("*.png")))  # 4 IFS blocks, 6 AIFS blocks, 4 agreement
    assert doc["run"] == "2026-11-06T12:00:00Z" and doc["tiles"]["layers"] == 10 and doc["interval_hours"] == 6
    assert doc["models"]["ifs"]["layer_offset"] == 0 and doc["models"]["aifs-single"]["layer_offset"] == 4
    assert doc["models"]["ifs"]["valid_times"][0] == "2026-11-06T18:00:00Z"  # the END of the first 6 h block
    assert doc["source"]["licence"] == "CC BY 4.0" and "models" not in doc["source"]
    assert not paths.partial(cfg, site).exists()


def test_every_cell_read_back_from_the_tiles_equals_the_processed_data(cfg, backend, processed_run):
    results, _ = processed_run
    export.export(cfg, backend, RUN)
    doc = readback.load_manifest(cfg, backend)
    grid, quantum = cfg["grid"], cfg["process"]["quantise_mm"]
    expected = {m: process.quantise(r["mm"], quantum)[0] for m, r in results.items()}
    for row in range(grid["nj"]):
        for col in range(grid["ni"]):
            lat, lon = grid["lat_first"] - row * grid["step_degrees"], grid["lon_first"] + col * grid["step_degrees"]
            got = readback.stored_series(cfg, backend, doc, lat, lon)
            for model, series in got.items():
                assert (series == expected[model][:, row, col]).all(), (model, row, col)
    mm = readback.series_mm(cfg, backend, doc, 12.0, 0.0)  # north-west corner cell, in mm
    assert mm["ifs"].dtype == np.float32 and mm["aifs-single"].shape == (6,)


def test_frames_have_the_configured_size_and_are_png(cfg, backend, processed_run):
    export.export(cfg, backend, RUN)
    doc = readback.load_manifest(cfg, backend)
    path = _site(cfg) / doc["frames"]["files"]["aifs-single"]["36"]
    data = path.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    assert struct.unpack(">II", data[16:24]) == (32, 32)
    assert sorted(doc["frames"]["files"]) == ["agreement", "aifs-single", "ifs"]


def test_retrieval_time_is_the_newest_raw_file_time(cfg, backend, processed_run):
    older, newer = 1_700_000_000, 1_700_003_600
    os.utime(paths.raw_file(cfg, RUN, "ifs"), (older, older))
    os.utime(paths.raw_file(cfg, RUN, "aifs-single"), (newer, newer))
    export.export(cfg, backend, RUN)
    assert readback.load_manifest(cfg, backend)["retrieved_at"] == dt.datetime.fromtimestamp(newer, tz=dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def test_a_second_export_replaces_the_first_completely(cfg, backend, processed_run):
    export.export(cfg, backend, RUN)
    (_site(cfg) / "stale.txt").write_text("left over from an earlier export")
    export.export(cfg, backend, RUN)
    assert not (_site(cfg) / "stale.txt").exists() and (_site(cfg) / backend["manifest"]["file"]).exists()


def test_the_manifest_carries_the_agreement_colours_for_the_map_legend(cfg, backend, processed_run):
    export.export(cfg, backend, RUN)
    colours = readback.load_manifest(cfg, backend)["frames"]["agreement_colours"]
    assert colours == {name: c for name, c in backend["frames"]["agreement_colours"].items() if c}  # the transparent class is not listed
    assert set(colours) == {"both_wet", "disagree"}


def test_frames_can_be_switched_off(cfg, backend, processed_run):
    export.export(cfg, backend | {"frames": backend["frames"] | {"enabled": False}}, RUN)
    assert readback.load_manifest(cfg, backend)["frames"] is None and not (_site(cfg) / "frames").exists()


@pytest.mark.parametrize("damage, text", [
    (lambda d: d.pop("run"), "missing keys"),
    (lambda d: d["models"]["ifs"].__setitem__("layer_offset", 3), "layer bookkeeping"),
    (lambda d: d["models"]["ifs"]["steps"].__setitem__(1, 18), "without gaps"),
    (lambda d: d["tiles"].__setitem__("layers", 99), "sum of the model layers"),
    (lambda d: d["tiles"].__setitem__("rows", 5), "cover the grid"),
    (lambda d: d["agreement"]["models"].append("nope"), "not among the models"),
    (lambda d: d["frames"]["files"]["ifs"].pop("6"), "do not match its steps"),
    (lambda d: d["frames"]["agreement_colours"].__setitem__("both_wet", "blue"), "agreement_colours"),
    (lambda d: d["frames"].pop("agreement_colours"), "agreement_colours"),
])
def test_the_manifest_check_catches_each_kind_of_damage(cfg, backend, processed_run, damage, text):
    export.export(cfg, backend, RUN)
    doc = copy.deepcopy(readback.load_manifest(cfg, backend))
    assert manifest.validate(doc) == []
    damage(doc)
    assert text in " ".join(manifest.validate(doc))
