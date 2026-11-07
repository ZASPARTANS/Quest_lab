"""Tests for scripts/smoke_site.py (plan PLAN-013 step 13.3): the smoke test must PASS on a healthy site and FAIL for each way the public site can be wrong.

TEST FIXTURES ONLY: a tiny site in a temporary folder served by a local HTTP server on an ephemeral port (no outside network); the base-map file is a sparse
file of the right size, so no 190 MB is written.
"""
import datetime as dt
import http.server
import json
import re
import threading
from pathlib import Path

import pytest

from scripts import smoke_site

NOW = dt.datetime(2026, 11, 7, 12, 0, tzinfo=dt.timezone.utc)


class Handler(http.server.BaseHTTPRequestHandler):
    root: Path = Path(".")
    ranges = True

    def log_message(self, *args):
        pass

    def do_GET(self):
        path = self.root / self.path.split("?")[0].lstrip("/").replace("%20", " ")
        if path.is_dir():
            path = path / "index.html"
        if not path.is_file():
            self.send_error(404)
            return
        size = path.stat().st_size
        kind = "text/html" if path.suffix == ".html" else "application/javascript" if path.suffix == ".js" else "application/octet-stream"
        match = re.match(r"^bytes=(\d+)-(\d+)$", self.headers.get("Range") or "")
        with path.open("rb") as handle:
            if match and self.ranges:
                start, end = int(match.group(1)), min(int(match.group(2)), size - 1)
                handle.seek(start)
                body = handle.read(end - start + 1)
                self.send_response(206)
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            else:
                body = handle.read(2_000_000)
                self.send_response(200)
            self.send_header("Content-Type", kind)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)


@pytest.fixture
def site(tmp_path):
    cfg = smoke_site.settings()
    data = tmp_path / cfg["data"]
    (data / "tiles").mkdir(parents=True)
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text('<html><head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'"><script type="module" src="/assets/app.js"></script></head></html>')
    (tmp_path / "assets" / "app.js").write_text("x")
    run = (NOW - dt.timedelta(hours=9)).strftime("%Y-%m-%dT%H:%M:%SZ")
    (data / cfg["manifest"]).write_text(json.dumps({"run": run, "tiles": {"path": "tiles/{row}_{col}.bin.gz"}}))
    (data / cfg["status"]).write_text(json.dumps({"ok": True, "run": run, "built_at": run}))
    (data / "tiles" / "0_0.bin.gz").write_bytes(b"\x1f\x8bx")
    map_file = tmp_path / cfg["map_file"]
    map_file.parent.mkdir(parents=True, exist_ok=True)
    with map_file.open("wb") as handle:
        handle.truncate(190_000_000)  # sparse: no disk used
    assets = tmp_path / cfg["map_assets"]
    (assets / "sprites" / "v4").mkdir(parents=True)
    (assets / "fonts" / "Noto Sans Regular").mkdir(parents=True)
    (assets / "sprites" / "v4" / "dark.json").write_text("{}")
    (assets / "fonts" / "Noto Sans Regular" / "0-255.pbf").write_bytes(b"pbf")
    Handler.root, Handler.ranges = tmp_path, True
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield {"base": f"http://127.0.0.1:{server.server_address[1]}/", "root": tmp_path, "cfg": cfg}
    server.shutdown()


def _problems(site, now=NOW):
    return {name: p for name, p in smoke_site.run_all(site["base"], site["cfg"], now).items() if p}


def test_a_healthy_site_passes_every_check(site):
    assert _problems(site) == {}


def test_a_host_that_ignores_range_requests_fails_the_base_map_check(site):
    Handler.ranges = False
    found = _problems(site)
    assert list(found) == ["base-map range request"] and "not 206" in found["base-map range request"][0]


def test_an_old_forecast_fails_and_the_age_limit_comes_from_the_config(site):
    found = _problems(site, now=NOW + dt.timedelta(hours=40))
    assert "forecast manifest and age" in found and "hours old" in found["forecast manifest and age"][0]
    assert _problems(site, now=NOW + dt.timedelta(hours=site["cfg"]["max_age_hours"] - 9 - 1)) == {}


def test_a_status_file_with_extra_keys_or_another_run_or_ok_false_fails(site):
    cfg, data = site["cfg"], site["root"] / site["cfg"]["data"]
    status = json.loads((data / cfg["status"]).read_text())
    (data / cfg["status"]).write_text(json.dumps({**status, "log": "secret text"}))
    assert "status file" in _problems(site)
    (data / cfg["status"]).write_text(json.dumps({**status, "ok": False}))
    assert "did not work" in _problems(site)["status file"][0]
    (data / cfg["status"]).write_text(json.dumps({**status, "run": "2026-01-01T00:00:00Z"}))
    assert "different runs" in _problems(site)["status file"][0]


def test_a_page_without_the_policy_a_missing_tile_and_a_wrong_sized_map_file_each_fail(site):
    (site["root"] / "index.html").write_text('<html><script type="module" src="/assets/app.js"></script></html>')
    assert "no Content-Security-Policy" in _problems(site)["page"][0]
    (site["root"] / "index.html").write_text('<html><head><meta http-equiv="Content-Security-Policy" content="x"><script type="module" src="/assets/app.js"></script></head></html>')
    (site["root"] / site["cfg"]["data"] / "tiles" / "0_0.bin.gz").unlink()
    assert "a forecast tile" in _problems(site)
    map_file = site["root"] / site["cfg"]["map_file"]
    map_file.write_bytes(b"x" * 5000)
    assert "too small" in " ".join(_problems(site)["base-map range request"])
