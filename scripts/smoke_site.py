"""Smoke test of the public site (plan PLAN-013 step 13.3): is the real site there, fresh, and readable the way the page reads it?
Plain Python (standard library only), so the workflow can run it on the bare runner right after the deploy and a person can run it from anywhere:
    python scripts/smoke_site.py https://zaspartans.github.io/Quest_lab/
It checks: the page (with its security policy in a meta tag) and its script; the forecast manifest and that its run is not older than the age limit
(config/frontend.json freshness.max_age_hours); status.json (only ok, run and built_at, and the same run); one forecast tile; the base-map file read by an
HTTP RANGE request (must answer 206 with a Content-Range: the map cannot work from a host that ignores ranges); a font and the sprite index.
Exit code 0 only if every check passed. A site that was only just deployed may need a minute to appear: `--retries` and `--wait` repeat the whole run.
All names (data folder, files) come from config/frontend.json and config/backend.toml (decision D17).
"""
import argparse
import datetime as dt
import json
import re
import sys
import time
import tomllib
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
USER_AGENT = "precip-forecast-smoke-test"
STATUS_KEYS = ["ok", "run", "built_at"]
MIN_MAP_BYTES = 100_000_000   # the base-map file is about 190 MB; anything much smaller is the wrong file


def get(url, headers=None, limit=2_000_000, timeout=60):
    """(status, headers, first `limit` bytes). HTTP errors come back as a status, not an exception."""
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, **(headers or {})})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.headers, response.read(limit)
    except urllib.error.HTTPError as error:
        return error.code, error.headers, b""


def settings(root=ROOT):
    """Everything the checks need, from the project's config files."""
    frontend = json.loads((root / "config" / "frontend.json").read_text(encoding="utf-8"))
    backend = tomllib.loads((root / "config" / "backend.toml").read_text(encoding="utf-8"))
    data = frontend["data_url_path"].strip("/") + "/"
    basemap = frontend["map"]["basemap"]
    return {"max_age_hours": frontend["freshness"]["max_age_hours"], "data": data, "manifest": backend["manifest"]["file"], "status": backend["status"]["file"],
            "map_file": data + basemap["url_prefix"] + basemap["file"], "map_assets": data + basemap["url_prefix"] + basemap["assets_dir"]}


def check_page(base):
    status, _, body = get(base)
    if status != 200:
        return [f"the page answered {status}"]
    html = body.decode("utf-8", "replace")
    problems = []
    if 'http-equiv="Content-Security-Policy"' not in html:
        problems.append("the page has no Content-Security-Policy meta tag")
    script = re.search(r'<script[^>]+src="([^"]+)"', html)
    if not script:
        return problems + ["the page has no script"]
    s_status, s_headers, _ = get(urllib.parse.urljoin(base, script.group(1)), limit=1000)
    if s_status != 200 or "javascript" not in (s_headers.get("Content-Type") or ""):
        problems.append(f"the page script answered {s_status} as {s_headers.get('Content-Type')}")
    return problems


def check_manifest(base, cfg, now):
    status, _, body = get(base + cfg["data"] + cfg["manifest"])
    if status != 200:
        return [f"{cfg['manifest']} answered {status}"], None
    manifest = json.loads(body)
    try:
        run = dt.datetime.strptime(manifest["run"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=dt.timezone.utc)
    except (KeyError, ValueError):
        return ["the manifest has no valid run time"], manifest
    age = (now - run).total_seconds() / 3600
    if age > cfg["max_age_hours"]:
        return [f"the forecast run {manifest['run']} is {age:.1f} hours old (limit {cfg['max_age_hours']})"], manifest
    return [], manifest


def check_status(base, cfg, manifest):
    status, _, body = get(base + cfg["data"] + cfg["status"])
    if status != 200:
        return [f"{cfg['status']} answered {status}"]
    doc = json.loads(body)
    if list(doc) != STATUS_KEYS:
        return [f"{cfg['status']} has the keys {list(doc)}, not {STATUS_KEYS}"]
    if doc["ok"] is not True:
        return [f"{cfg['status']} says the build did not work"]
    if doc["run"] != manifest.get("run"):
        return [f"{cfg['status']} and {cfg['manifest']} name different runs"]
    return []


def check_tile(base, cfg, manifest):
    tiles = manifest.get("tiles")
    if not isinstance(tiles, dict) or "path" not in tiles:
        return ["the manifest has no tiles entry"]
    status, _, body = get(base + cfg["data"] + tiles["path"].replace("{row}", "0").replace("{col}", "0"), limit=64)
    return [] if status == 200 and body else [f"the first forecast tile answered {status} with {len(body)} bytes"]


def check_range(base, cfg):
    status, headers, body = get(base + cfg["map_file"], headers={"Range": "bytes=0-99"}, limit=1000)
    if status != 206:
        return [f"the base-map file answered {status} to a range request, not 206 (the map needs HTTP range support)"]
    match = re.match(r"^bytes 0-99/(\d+)$", headers.get("Content-Range") or "")
    if not match:
        return [f"the base-map file's Content-Range is {headers.get('Content-Range')!r}, not 'bytes 0-99/<size>'"]
    problems = []
    if len(body) != 100:
        problems.append(f"the range answer has {len(body)} bytes, not 100")
    if int(match.group(1)) < MIN_MAP_BYTES:
        problems.append(f"the base-map file is {int(match.group(1))} bytes: too small, the wrong file")
    return problems


def check_assets(base, cfg):
    problems = []
    for path in (cfg["map_assets"] + "/sprites/v4/dark.json", cfg["map_assets"] + "/fonts/Noto%20Sans%20Regular/0-255.pbf"):
        status, _, body = get(base + path, limit=100)
        if status != 200 or not body:
            problems.append(f"{path} answered {status}")
    return problems


def run_all(base, cfg, now=None):
    """{check name: [problems]} for one pass over the site at `base` (which ends with a slash)."""
    now = now or dt.datetime.now(dt.timezone.utc)
    results = {"page": check_page(base)}
    manifest_problems, manifest = check_manifest(base, cfg, now)
    results["forecast manifest and age"] = manifest_problems
    if manifest:
        results["status file"] = check_status(base, cfg, manifest)
        results["a forecast tile"] = check_tile(base, cfg, manifest)
    results["base-map range request"] = check_range(base, cfg)
    results["fonts and sprites"] = check_assets(base, cfg)
    return results


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("url", help="the site address, e.g. https://zaspartans.github.io/Quest_lab/")
    parser.add_argument("--retries", type=int, default=1)
    parser.add_argument("--wait", type=int, default=20, help="seconds between tries")
    args = parser.parse_args(argv)
    base = args.url if args.url.endswith("/") else args.url + "/"
    cfg = settings()
    for attempt in range(1, args.retries + 1):
        results = run_all(base, cfg)
        for name, problems in results.items():
            print(f"{'FAIL' if problems else 'ok  '} {name}" + (": " + "; ".join(problems) if problems else ""))
        if not any(results.values()):
            print(f"smoke test passed for {base}")
            return 0
        if attempt < args.retries:
            print(f"try {attempt} of {args.retries} failed; waiting {args.wait} s")
            time.sleep(args.wait)
    print(f"smoke test FAILED for {base}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
