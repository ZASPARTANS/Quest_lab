"""Tests for backend/pages.py (plan PLAN-013 step 13.2): the security policy as meta tags, and the assembly of the public site folder.

TEST FIXTURES ONLY: tiny invented files in a temporary folder; the real headers.conf is read to prove the meta policy is not weaker than the nginx one.
"""
import json

import pytest

from backend import pages
from pipeline import paths

IGNORED = ["frame-ancestors", "report-uri", "sandbox"]


@pytest.fixture
def real_headers():
    return (paths.ROOT / "config" / "headers.conf").read_text(encoding="utf-8")


def test_the_policy_is_read_from_headers_conf(real_headers):
    csp, referrer = pages.policy_from_headers(real_headers)
    assert csp.startswith("default-src 'self'")
    assert "worker-src 'self' blob:" in csp
    assert referrer == "strict-origin-when-cross-origin"
    with pytest.raises(ValueError):
        pages.policy_from_headers("add_header X-Frame-Options DENY;")


def test_the_meta_policy_is_the_same_policy_without_only_the_directives_a_meta_tag_cannot_carry(real_headers):
    csp, _ = pages.policy_from_headers(real_headers)
    meta, dropped = pages.meta_policy(csp, IGNORED)
    original = [d.strip() for d in csp.split(";") if d.strip()]
    kept = [d.strip() for d in meta.split(";") if d.strip()]
    assert dropped == ["frame-ancestors"]
    assert sorted(kept + [d for d in original if d.split()[0] in IGNORED]) == sorted(original)  # nothing else changed: no directive weakened, none lost
    assert "script-src 'self'" in kept and "connect-src" in meta and "object-src 'none'" in kept


def test_the_meta_tags_go_right_after_the_charset_before_any_script_and_repeating_does_not_duplicate_them():
    html = '<!doctype html><html><head>\n  <meta charset="utf-8">\n  <script type="module" src="/a.js"></script>\n</head></html>'
    once = pages.inject_meta(html, "default-src 'self'", "no-referrer")
    assert once.index('http-equiv="Content-Security-Policy"') < once.index("<script")
    assert once.index('<meta charset="utf-8">') < once.index('http-equiv="Content-Security-Policy"')
    assert 'content="default-src \'self\'"' in once and '<meta name="referrer" content="no-referrer">' in once
    twice = pages.inject_meta(once, "default-src 'self'", "no-referrer")
    assert twice == once
    with pytest.raises(ValueError):
        pages.inject_meta("<html><head></head></html>", "x", "y")


def _fixture_site(cfg, backend, tmp_path, frontend):
    """A pretend page build, forecast data and base map, below tmp_path (absolute paths in cfg win over the project root)."""
    cfg["pages"] = {"build_dir": str(tmp_path / "pages"), "dist_subdir": "dist", "site_subdir": "_site", "max_site_bytes": 10_000_000,
                    "meta_ignored_directives": IGNORED, "headers_file": "config/headers.conf"}
    cfg["paths"] = cfg["paths"] | {"basemap_dir": str(tmp_path / "basemap")}
    dist = tmp_path / "pages" / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text('<html><head><meta charset="utf-8"></head><body></body></html>', encoding="utf-8")
    (dist / "assets" / "app-1.js").write_text("x", encoding="utf-8")
    site = paths.ROOT / cfg["paths"]["site_dir"]
    (site / "tiles").mkdir(parents=True)
    (site / backend["manifest"]["file"]).write_text("{}", encoding="utf-8")
    (site / backend["status"]["file"]).write_text(json.dumps({"ok": True}), encoding="utf-8")
    stored = tmp_path / "basemap"
    (stored / cfg["paths"]["basemap_assets_dir"] / "fonts").mkdir(parents=True)
    (stored / cfg["paths"]["basemap_assets_dir"] / "fonts" / "a.pbf").write_bytes(b"pbf")
    (stored / cfg["paths"]["basemap_file"]).write_bytes(b"P" * 1000)
    return dist


def test_assemble_builds_the_site_folder_with_data_base_map_status_policy_and_nojekyll(cfg, backend, tmp_path, real_headers):
    frontend = json.loads((paths.ROOT / "config" / "frontend.json").read_text(encoding="utf-8"))
    _fixture_site(cfg, backend, tmp_path, frontend)
    result = pages.assemble(cfg, backend, frontend, real_headers)
    out = result["out"]
    assert (out / "assets" / "app-1.js").is_file()
    assert (out / "data" / backend["manifest"]["file"]).is_file() and (out / "data" / backend["status"]["file"]).is_file()
    assert (out / "data" / "basemap" / frontend["map"]["basemap"]["file"]).read_bytes() == b"P" * 1000
    assert (out / "data" / "basemap" / "assets" / "fonts" / "a.pbf").is_file()
    assert (out / ".nojekyll").is_file()
    html = (out / "index.html").read_text(encoding="utf-8")
    assert 'http-equiv="Content-Security-Policy"' in html and "frame-ancestors" not in html
    assert result["dropped"] == ["frame-ancestors"] and result["files"] >= 7


def test_assemble_refuses_a_missing_piece_an_mjs_file_and_a_site_above_the_limit(cfg, backend, tmp_path, real_headers):
    frontend = json.loads((paths.ROOT / "config" / "frontend.json").read_text(encoding="utf-8"))
    dist = _fixture_site(cfg, backend, tmp_path, frontend)
    (tmp_path / "basemap" / cfg["paths"]["basemap_file"]).unlink()
    with pytest.raises(FileNotFoundError, match="base-map file"):
        pages.assemble(cfg, backend, frontend, real_headers)
    (tmp_path / "basemap" / cfg["paths"]["basemap_file"]).write_bytes(b"P" * 1000)
    (dist / "assets" / "worker.mjs").write_text("x", encoding="utf-8")
    with pytest.raises(ValueError, match=r"\.mjs"):
        pages.assemble(cfg, backend, frontend, real_headers)
    (dist / "assets" / "worker.mjs").unlink()
    cfg["pages"]["max_site_bytes"] = 500
    with pytest.raises(ValueError, match="above the host's limit"):
        pages.assemble(cfg, backend, frontend, real_headers)
