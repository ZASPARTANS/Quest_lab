"""Guards for settings that must agree across config files (D17): the same folder must not be spelled differently in two places."""
import json
import re
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_the_front_end_reads_the_folder_the_exporter_writes():
    pipeline = tomllib.loads((ROOT / "config" / "pipeline.toml").read_text(encoding="utf-8"))
    frontend = json.loads((ROOT / pipeline["paths"]["frontend_config_file"]).read_text(encoding="utf-8"))
    assert frontend["dev_data_dir"] == pipeline["paths"]["site_dir"]


def test_the_front_end_check_tool_reads_the_files_the_python_side_writes():
    pipeline = tomllib.loads((ROOT / "config" / "pipeline.toml").read_text(encoding="utf-8"))
    frontend = json.loads((ROOT / pipeline["paths"]["frontend_config_file"]).read_text(encoding="utf-8"))
    assert frontend["check"]["site_dir"] == pipeline["paths"]["site_dir"]
    assert frontend["check"]["reference_file"] == pipeline["paths"]["plan_reference_file"]


def test_the_geocoder_is_the_only_outside_host_the_policy_allows():
    frontend = json.loads((ROOT / "config" / "frontend.json").read_text(encoding="utf-8"))
    origin = "https://" + frontend["geocoder"]["url"].split("/")[2]
    policy = next(line for line in (ROOT / "config" / "headers.conf").read_text(encoding="utf-8").splitlines() if "Content-Security-Policy" in line and "add_header" in line)
    outside = re.findall(r"https?://[^\s;\"']+", policy)
    assert outside == [origin]  # no other host anywhere in the policy
    connect = next(part for part in policy.split(";") if part.strip().startswith("connect-src"))
    assert origin in connect


def test_the_config_files_named_in_the_paths_table_exist():
    paths = tomllib.loads((ROOT / "config" / "pipeline.toml").read_text(encoding="utf-8"))["paths"]
    for key in ("validation_points_file", "frontend_config_file", "backend_config_file"):
        assert (ROOT / paths[key]).is_file(), key
