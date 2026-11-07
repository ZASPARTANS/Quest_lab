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


def test_the_two_geocoders_are_the_only_outside_hosts_the_policy_allows():
    frontend = json.loads((ROOT / "config" / "frontend.json").read_text(encoding="utf-8"))
    origins = ["https://" + frontend[key]["url"].split("/")[2] for key in ("geocoder", "reverse_geocoder")]
    policy = next(line for line in (ROOT / "config" / "headers.conf").read_text(encoding="utf-8").splitlines() if "Content-Security-Policy" in line and "add_header" in line)
    outside = re.findall(r"https?://[^\s;\"']+", policy)
    assert outside == origins  # no other host anywhere in the policy
    connect = next(part for part in policy.split(";") if part.strip().startswith("connect-src"))
    assert all(origin in connect for origin in origins)


def test_the_front_end_base_map_settings_equal_the_pipeline_settings():
    pipeline = tomllib.loads((ROOT / "config" / "pipeline.toml").read_text(encoding="utf-8"))
    basemap = tomllib.loads((ROOT / pipeline["paths"]["basemap_config_file"]).read_text(encoding="utf-8"))
    frontend = json.loads((ROOT / "config" / "frontend.json").read_text(encoding="utf-8"))
    paths, mine = pipeline["paths"], frontend["map"]["basemap"]
    assert mine["file"] == paths["basemap_file"] and mine["assets_dir"] == paths["basemap_assets_dir"]
    assert mine["sprite_set"] == basemap["style_assets"]["sprite_dir"] and mine["flavor"] == basemap["style_assets"]["sprite_flavor"]
    assert frontend["dev_basemap_dir"] == paths["basemap_dir"]
    assert mine["url_prefix"] == paths["basemap_dir"].split("/")[-1] + "/"  # served as <data url>/basemap/


def test_the_map_credit_is_plain_links_to_https_pages_only():
    mine = json.loads((ROOT / "config" / "frontend.json").read_text(encoding="utf-8"))["map"]["basemap"]["attribution_html"]
    without_links = re.sub(r'<a href="https://[A-Za-z0-9./_-]+" target="_blank" rel="noopener">[^<>]+</a>', "", mine)
    assert "<" not in without_links and ">" not in without_links  # nothing but those links and plain text
    assert "OpenStreetMap" in mine  # the licence asks for this credit


def test_the_config_files_named_in_the_paths_table_exist():
    paths = tomllib.loads((ROOT / "config" / "pipeline.toml").read_text(encoding="utf-8"))["paths"]
    for key in ("validation_points_file", "frontend_config_file", "backend_config_file", "basemap_config_file"):
        assert (ROOT / paths[key]).is_file(), key
