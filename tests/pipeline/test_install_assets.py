"""Tests for `install-assets` (plan PLAN-015 step 15.2, decision D45): the fonts and sprites are kept in our own repository (frontend/basemap_assets) and a build
copies them into the base-map folder after checking every file against config/basemap_assets.lock.json. No network is used. TEST FIXTURES ONLY (invented bytes)
except the last tests, which look at the real folder of the repository."""
import hashlib
import json

import pytest

from pipeline import basemap
from pipeline.fetch import load_config
from pipeline.paths import ROOT


@pytest.fixture
def bm():
    return basemap.load_basemap(load_config())


def _sha(data):
    return hashlib.sha256(data).hexdigest()


@pytest.fixture
def kept(bm, tmp_path, monkeypatch):
    """A small invented assets folder with a matching lock file; the config's list of assets is replaced by the same small list."""
    files = {"fonts/A/0-255.pbf": b"glyphs a", "fonts/B/0-255.pbf": b"glyphs b", "sprites/v4/dark.json": b'{"x": 1}'}
    source = tmp_path / "source"
    for path, data in files.items():
        (source / path).parent.mkdir(parents=True, exist_ok=True)
        (source / path).write_bytes(data)
    lock = tmp_path / "lock.json"
    lock.write_text(json.dumps({"commit": bm["style_assets"]["commit"], "files": {p: {"sha256": _sha(d), "bytes": len(d)} for p, d in files.items()}}), encoding="utf-8")
    monkeypatch.setattr(basemap, "asset_paths", lambda _bm: list(files))
    return {"bm": bm, "files": files, "source": source, "lock": lock, "target": tmp_path / "assets"}


def test_install_copies_every_file_when_all_match_the_lock(kept):
    count, total = basemap.install_assets(kept["bm"], kept["lock"], kept["source"], kept["target"])
    assert count == 3 and total == sum(len(d) for d in kept["files"].values())
    for path, data in kept["files"].items():
        assert (kept["target"] / path).read_bytes() == data
    assert basemap.install_assets(kept["bm"], kept["lock"], kept["source"], kept["target"])[0] == 3  # a second run changes nothing and does not fail


def test_install_refuses_a_changed_file_and_copies_nothing(kept):
    (kept["source"] / "fonts/B/0-255.pbf").write_bytes(b"glyphs b, edited")
    with pytest.raises(ValueError, match="does not match the lock file"):
        basemap.install_assets(kept["bm"], kept["lock"], kept["source"], kept["target"])
    assert not kept["target"].exists()


def test_install_refuses_a_missing_and_an_extra_file(kept):
    (kept["source"] / "fonts/A/0-255.pbf").unlink()
    with pytest.raises(ValueError, match="missing"):
        basemap.install_assets(kept["bm"], kept["lock"], kept["source"], kept["target"])
    (kept["source"] / "fonts/A/0-255.pbf").write_bytes(kept["files"]["fonts/A/0-255.pbf"])
    (kept["source"] / "fonts/A/stray.txt").write_bytes(b"not in the lock")
    with pytest.raises(ValueError, match="extra"):
        basemap.install_assets(kept["bm"], kept["lock"], kept["source"], kept["target"])
    assert not kept["target"].exists()


def test_install_refuses_a_lock_for_another_commit_and_a_missing_folder(kept, tmp_path):
    other = json.loads(kept["lock"].read_text(encoding="utf-8"))
    other["commit"] = "0" * 40
    kept["lock"].write_text(json.dumps(other), encoding="utf-8")
    with pytest.raises(ValueError, match="another commit"):
        basemap.install_assets(kept["bm"], kept["lock"], kept["source"], kept["target"])
    other["commit"] = kept["bm"]["style_assets"]["commit"]
    kept["lock"].write_text(json.dumps(other), encoding="utf-8")
    with pytest.raises(ValueError, match="different files"):
        basemap.install_assets(kept["bm"], kept["lock"], tmp_path / "no_such_folder", kept["target"])


def test_the_assets_kept_in_the_repository_are_exactly_the_files_of_the_lock(bm, tmp_path):
    """The real check: a damaged or edited commit of frontend/basemap_assets fails here (and in every build, which runs the same command)."""
    cfg = load_config()
    lock = ROOT / bm["style_assets"]["lock_file"]
    count, total = basemap.install_assets(bm, lock, ROOT / cfg["paths"]["basemap_assets_source"], tmp_path / "assets")
    expected = json.loads(lock.read_text(encoding="utf-8"))["files"]
    assert count == len(expected) >= 1000 and total == sum(e["bytes"] for e in expected.values())


def test_git_keeps_the_assets_byte_for_byte():
    """A rewritten line end would break a sha256: the folder is marked `-text` in .gitattributes (the sprite json files and the licence are text)."""
    rules = (ROOT / ".gitattributes").read_text(encoding="utf-8").splitlines()
    folder = load_config()["paths"]["basemap_assets_source"]
    assert f"{folder}/** -text" in rules
