"""Guards for settings that must agree across config files (D17): the same folder must not be spelled differently in two places."""
import json
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_the_front_end_reads_the_folder_the_exporter_writes():
    pipeline = tomllib.loads((ROOT / "config" / "pipeline.toml").read_text(encoding="utf-8"))
    frontend = json.loads((ROOT / pipeline["paths"]["frontend_config_file"]).read_text(encoding="utf-8"))
    assert frontend["dev_data_dir"] == pipeline["paths"]["site_dir"]


def test_the_config_files_named_in_the_paths_table_exist():
    paths = tomllib.loads((ROOT / "config" / "pipeline.toml").read_text(encoding="utf-8"))["paths"]
    for key in ("validation_points_file", "frontend_config_file", "backend_config_file"):
        assert (ROOT / paths[key]).is_file(), key
