"""Tests for pipeline/basemap.py (the stored base map, plan PLAN-010): no network is used; sessions are fakes. TEST FIXTURES ONLY (invented bytes)."""
import copy
import datetime as dt
import hashlib
import io
import json
import tarfile

import pytest
import requests

from pipeline import basemap
from pipeline.fetch import load_config


class Response:
    def __init__(self, status=200, content=b"", headers=None, payload=None):
        self.status_code, self.content, self.headers, self._payload = status, content, headers or {}, payload

    def json(self):
        return self._payload


class FakeSession:
    """Answers from a dict {url: Response}; any other address is a 404. Records every request."""

    def __init__(self, answers):
        self.answers, self.requests = answers, []

    def get(self, url, **kwargs):
        self.requests.append(("GET", url))
        return self.answers.get(url, Response(404))

    def head(self, url, **kwargs):
        self.requests.append(("HEAD", url))
        return self.answers.get(url, Response(404))


@pytest.fixture
def bm():
    return basemap.load_basemap(load_config())


def _archive(members):
    """A .tar.gz in memory with the given {name: bytes}."""
    out = io.BytesIO()
    with tarfile.open(fileobj=out, mode="w:gz") as tar:
        for name, data in members.items():
            info = tarfile.TarInfo(name)
            info.size = len(data)
            tar.addfile(info, io.BytesIO(data))
    return out.getvalue()


def _tool_session(bm, archive):
    url = bm["tool"]["url"].format(version=bm["tool"]["version"])
    return FakeSession({url: Response(200, archive)})


def test_git_blob_hash_matches_what_git_prints():
    assert basemap.git_blob_sha1(b"hello\n") == "ce013625030ba8dba906f756967f9e9ca394464a"  # `printf 'hello\n' | git hash-object --stdin`
    assert basemap.git_blob_sha1(b"") == "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"


def test_the_tool_is_used_only_if_the_download_matches_its_sha256(bm, tmp_path):
    archive = _archive({"pmtiles": b"#!fake tool", "README.md": b"x"})
    good = copy.deepcopy(bm)
    good["tool"]["sha256"] = hashlib.sha256(archive).hexdigest()
    path = basemap.fetch_tool(good, _tool_session(good, archive), tmp_path / "bin")
    assert path.read_bytes() == b"#!fake tool"
    assert path.stat().st_mode & 0o111 == 0o111  # executable (the tests run on Linux in Docker)
    with pytest.raises(ValueError, match="does not match the sha256"):
        basemap.fetch_tool(bm, _tool_session(bm, archive), tmp_path / "other")  # the config's real sha256 is not the fake archive's
    assert not (tmp_path / "other").exists()                                    # nothing was written


def test_only_the_one_named_member_is_taken_from_the_archive(bm, tmp_path):
    for members in ({"README.md": b"x"}, {"dir/pmtiles": b"deep"}, {"../pmtiles": b"escape"}):
        archive = _archive(members)
        good = copy.deepcopy(bm)
        good["tool"]["sha256"] = hashlib.sha256(archive).hexdigest()
        with pytest.raises(ValueError, match="no file named"):
            basemap.fetch_tool(good, _tool_session(good, archive), tmp_path / "bin")
    assert not list(tmp_path.rglob("*"))  # nothing was written for any of them


def test_a_failed_download_is_an_error(bm, tmp_path):
    with pytest.raises(RuntimeError, match="answered 404"):
        basemap.fetch_tool(bm, FakeSession({}), tmp_path / "bin")


def test_the_newest_existing_world_build_is_used(bm):
    today = dt.date(2026, 11, 7)
    url = lambda d: bm["source"]["planet_url"].format(date=d)  # noqa: E731
    session = FakeSession({url("20261106"): Response(200, headers={"Content-Length": "139353480483"})})
    assert basemap.newest_planet(bm, session, today) == (url("20261106"), 139353480483)  # today missing (404), yesterday found
    assert [r[1] for r in session.requests] == [url("20261107"), url("20261106")]
    with pytest.raises(RuntimeError, match="no world build"):
        basemap.newest_planet(bm, FakeSession({}), today)
    with pytest.raises(RuntimeError, match="unexpected answer 500"):
        basemap.newest_planet(bm, FakeSession({url("20261107"): Response(500)}), today)  # server trouble stops the run instead of falling back silently


def test_the_extract_command_is_a_list_built_from_the_config(bm, tmp_path):
    args = basemap.extract_args(bm, tmp_path / "pmtiles", "https://example.com/world.pmtiles", tmp_path / "out.pmtiles", 6)
    assert args[1:4] == ["extract", "https://example.com/world.pmtiles", str(tmp_path / "out.pmtiles")]
    assert "--maxzoom=6" in args and f"--download-threads={bm['extract']['download_threads']}" in args and f"--overfetch={bm['extract']['overfetch']}" in args
    assert all(isinstance(a, str) for a in args)


def test_the_list_of_assets_follows_the_config(bm):
    paths = basemap.asset_paths(bm)
    a = bm["style_assets"]
    ranges = a["font_range_max"] // a["font_range_size"] + 1
    assert len(paths) == len(a["fonts"]) * ranges + 4 + 1 and len(set(paths)) == len(paths)
    assert "fonts/Noto Sans Regular/0-255.pbf" in paths and f"fonts/Noto Sans Regular/1280-1535.pbf" in paths
    assert f"{a['sprite_dir']}/{a['sprite_flavor']}.json" in paths and f"{a['sprite_dir']}/{a['sprite_flavor']}@2x.png" in paths and a["licence_file"] in paths
    assert "%20" in basemap.raw_url(bm, "fonts/Noto Sans Regular/0-255.pbf") and "028c18f" in basemap.raw_url(bm, paths[0])


def _assets(bm, content=lambda p: f"data of {p}".encode()):
    return {p: content(p) for p in basemap.asset_paths(bm)}


def test_the_lock_is_made_only_from_files_that_match_the_commits_own_hashes(bm, tmp_path):
    files = _assets(bm)
    tree = {"truncated": False, "tree": [{"type": "blob", "path": p, "sha": basemap.git_blob_sha1(d)} for p, d in files.items()]}
    answers = {bm["style_assets"]["tree_url"].format(repo=bm["style_assets"]["repo"], commit=bm["style_assets"]["commit"]): Response(200, payload=tree)}
    answers |= {basemap.raw_url(bm, p): Response(200, d) for p, d in files.items()}
    lock = tmp_path / "lock.json"
    made = basemap.lock_assets(bm, FakeSession(answers), lock)
    assert json.loads(lock.read_text())["files"].keys() == made.keys() and made[next(iter(made))]["sha256"] == hashlib.sha256(files[next(iter(made))]).hexdigest()
    bad = dict(answers)
    victim = basemap.asset_paths(bm)[3]
    bad[basemap.raw_url(bm, victim)] = Response(200, b"tampered")
    lock2 = tmp_path / "lock2.json"
    with pytest.raises(ValueError, match="does not match the commit's own hash"):
        basemap.lock_assets(bm, FakeSession(bad), lock2)
    assert not lock2.exists()  # no lock is written for a file that does not match


def test_assets_are_checked_against_the_lock_kept_when_right_and_replaced_when_wrong(bm, tmp_path):
    files = _assets(bm)
    lock = tmp_path / "lock.json"
    lock.write_text(json.dumps({"commit": bm["style_assets"]["commit"], "files": {p: {"sha256": hashlib.sha256(d).hexdigest(), "bytes": len(d)} for p, d in files.items()}}))
    session = FakeSession({basemap.raw_url(bm, p): Response(200, d) for p, d in files.items()})
    folder = tmp_path / "assets"
    downloaded, kept, total = basemap.fetch_assets(bm, session, lock, folder)
    assert (downloaded, kept) == (len(files), 0) and total == sum(map(len, files.values()))
    assert (folder / "fonts" / "Noto Sans Regular" / "0-255.pbf").read_bytes() == files["fonts/Noto Sans Regular/0-255.pbf"]
    before = len(session.requests)
    assert basemap.fetch_assets(bm, session, lock, folder)[:2] == (0, len(files)) and len(session.requests) == before  # right files are kept, no request
    (folder / "fonts" / "Noto Sans Regular" / "0-255.pbf").write_bytes(b"damaged on disk")
    assert basemap.fetch_assets(bm, session, lock, folder)[:2] == (1, len(files) - 1)                                   # a damaged file is fetched again
    poisoned = FakeSession({basemap.raw_url(bm, p): Response(200, b"not what the lock says") for p in files})
    with pytest.raises(ValueError, match="does not match the lock file"):
        basemap.fetch_assets(bm, poisoned, lock, tmp_path / "other")
    assert not list((tmp_path / "other").rglob("*.pbf")) if (tmp_path / "other").exists() else True  # nothing wrong was stored


def test_a_lock_for_another_commit_or_other_files_is_refused(bm, tmp_path):
    lock = tmp_path / "lock.json"
    lock.write_text(json.dumps({"commit": "0" * 40, "files": {}}))
    with pytest.raises(ValueError, match="another commit"):
        basemap.fetch_assets(bm, FakeSession({}), lock, tmp_path / "a")
    lock.write_text(json.dumps({"commit": bm["style_assets"]["commit"], "files": {"fonts/extra.pbf": {"sha256": "0", "bytes": 1}}}))
    with pytest.raises(ValueError, match="other files"):
        basemap.fetch_assets(bm, FakeSession({}), lock, tmp_path / "a")


PART = load_config()["paths"]["partial_suffix"]


class StreamResponse:
    """A streamed download: status, the bytes in chunks, and close()."""

    def __init__(self, status=200, content=b"", chunk=7):
        self.status_code, self._content, self._chunk, self.closed = status, content, chunk, False

    def iter_content(self, size):
        for i in range(0, len(self._content), self._chunk):
            yield self._content[i:i + self._chunk]

    def close(self):
        self.closed = True


def _release(bm, content, url="https://example.org/basemap-v1/world.pmtiles", attempts=1):
    release = copy.deepcopy(bm)
    release["release"] = {"url": url, "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest(), "attempts": attempts, "retry_wait_seconds": 30}
    return release


def test_fetch_release_downloads_checks_and_then_keeps_the_file(bm, tmp_path):
    content = b"invented base map bytes " * 10
    release = _release(bm, content)
    session = FakeSession({release["release"]["url"]: StreamResponse(200, content)})
    target = tmp_path / "world.pmtiles"
    assert basemap.fetch_release(release, session, target, PART) is True
    assert target.read_bytes() == content and not (tmp_path / ("world.pmtiles" + PART)).exists()
    assert basemap.fetch_release(release, session, target, PART) is False  # already there and matching: no second download
    assert len(session.requests) == 1


def test_fetch_release_refuses_a_wrong_hash_a_too_large_file_a_bad_status_and_a_non_https_address(bm, tmp_path):
    content = b"x" * 50
    release = _release(bm, content)
    url, target = release["release"]["url"], tmp_path / "world.pmtiles"
    with pytest.raises(ValueError, match="does not match"):
        basemap.fetch_release(release, FakeSession({url: StreamResponse(200, b"y" * 50)}), target, PART)  # same size, other bytes
    with pytest.raises(ValueError, match="larger"):
        basemap.fetch_release(release, FakeSession({url: StreamResponse(200, b"x" * 80)}), target, PART)
    with pytest.raises(ValueError, match="does not match"):
        basemap.fetch_release(release, FakeSession({url: StreamResponse(200, b"x" * 20)}), target, PART)  # too short
    with pytest.raises(RuntimeError, match="404"):
        basemap.fetch_release(release, FakeSession({url: StreamResponse(404)}), target, PART)
    assert not target.exists() and not (tmp_path / ("world.pmtiles" + PART)).exists()  # nothing half-written is left behind
    with pytest.raises(ValueError, match="https"):
        basemap.fetch_release(_release(bm, content, url="http://example.org/x"), FakeSession({}), target, PART)


def test_fetch_release_replaces_a_file_that_does_not_match(bm, tmp_path):
    content = b"right bytes" * 5
    release = _release(bm, content)
    target = tmp_path / "world.pmtiles"
    target.write_bytes(b"old and wrong")
    session = FakeSession({release["release"]["url"]: StreamResponse(200, content)})
    assert basemap.fetch_release(release, session, target, PART) is True
    assert target.read_bytes() == content


def test_the_real_release_settings_are_https_and_have_a_sha256_of_the_right_shape(bm):
    release = bm["release"]
    assert release["url"].startswith("https://github.com/") and release["url"].endswith("/" + load_config()["paths"]["basemap_file"])
    assert len(release["sha256"]) == 64 and set(release["sha256"]) <= set("0123456789abcdef")
    assert release["bytes"] > 100_000_000


class ScriptedSession:
    """Each GET does the next thing of the script: an exception object is raised, anything else is returned."""

    def __init__(self, script):
        self.script, self.requests = list(script), []

    def get(self, url, **kwargs):
        self.requests.append(url)
        step = self.script.pop(0)
        if isinstance(step, Exception):
            raise step
        return step


class BrokenBody(StreamResponse):
    """A download whose connection breaks after the first chunk (the error comes in the middle of the body)."""

    def iter_content(self, size):
        yield self._content[: self._chunk]
        raise requests.exceptions.ChunkedEncodingError("connection broken")


def _retry_case(bm, tmp_path, script, attempts=3):
    content = b"invented base map bytes " * 10
    release = _release(bm, content, attempts=attempts)
    session = ScriptedSession([step(content) if callable(step) else step for step in script])
    waits = []
    target = tmp_path / "world.pmtiles"
    return release, session, waits, target, content


def test_fetch_release_tries_again_after_a_timeout_and_after_5xx_and_429_and_a_break_in_the_body(bm, tmp_path):
    ok = lambda c: StreamResponse(200, c)  # noqa: E731
    script = [requests.exceptions.ReadTimeout("read timed out"), StreamResponse(503), StreamResponse(429), lambda c: BrokenBody(200, c), ok]
    release, session, waits, target, content = _retry_case(bm, tmp_path, script, attempts=5)
    assert basemap.fetch_release(release, session, target, PART, sleep=waits.append) is True
    assert target.read_bytes() == content and not (tmp_path / ("world.pmtiles" + PART)).exists()
    assert len(session.requests) == 5 and waits == [30, 30, 30, 30]  # a pause before every new try, none after the last


def test_fetch_release_gives_up_after_exactly_the_configured_tries_and_leaves_nothing_behind(bm, tmp_path):
    script = [requests.exceptions.ReadTimeout("read timed out")] * 3
    release, session, waits, target, _ = _retry_case(bm, tmp_path, script, attempts=3)
    with pytest.raises(RuntimeError, match="3 tries"):
        basemap.fetch_release(release, session, target, PART, sleep=waits.append)
    assert len(session.requests) == 3 and waits == [30, 30]
    assert not target.exists() and not (tmp_path / ("world.pmtiles" + PART)).exists()


def test_fetch_release_never_retries_a_final_answer_or_a_failed_check(bm, tmp_path):
    for first, error, match in ((StreamResponse(404), RuntimeError, "404"), (StreamResponse(200, b"y" * 240), ValueError, "does not match"),
                                (StreamResponse(200, b"z" * 500), ValueError, "larger")):
        release, session, waits, target, _ = _retry_case(bm, tmp_path, [first, lambda c: StreamResponse(200, c)])
        with pytest.raises(error, match=match):
            basemap.fetch_release(release, session, target, PART, sleep=waits.append)
        assert len(session.requests) == 1 and waits == [], f"{match}: it was tried again"


def test_the_real_retry_settings_are_small_whole_numbers(bm):
    release = bm["release"]
    assert isinstance(release["attempts"], int) and 1 <= release["attempts"] <= 5
    assert isinstance(release["retry_wait_seconds"], int) and 0 <= release["retry_wait_seconds"] <= 120
