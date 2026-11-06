"""Failure-mode tests for pipeline/fetch.py (errors E008 and E009 in docs/ERRORS.md).

TEST FIXTURES ONLY: the GRIB files are tiny sample messages made by eccodes (endStep 0), not forecast data,
and the HTTP server is a local throwaway server.
"""
import datetime as dt
import http.server
import socket
import threading
import time
from pathlib import Path

import eccodes
import multiurl
import pytest
import requests

from pipeline import fetch

RUN = dt.datetime(2026, 11, 6, 0)


def _write_sample_grib(path):
    handle = eccodes.codes_grib_new_from_samples("regular_ll_sfc_grib2")
    with open(path, "wb") as f:
        eccodes.codes_write(handle, f)
    eccodes.codes_release(handle)


def _truncated(path):
    data = path.read_bytes()
    path.write_bytes(data[: len(data) // 2])


def _cfg(tmp_path, stop=0):
    return {"source": {"type": "fc", "stream": "oper", "param": "tp"},
            "models": {"m": {"step_ranges": [{"start": 0, "stop": stop, "every": 6}]}},
            "paths": {"raw_dir": str(tmp_path / "raw")}}


class FakeClient:
    """Stands in for the ecmwf-opendata client: `writer(target)` plays the download."""

    def __init__(self, writer):
        self.writer = writer

    def retrieve(self, request, target):
        self.writer(target)


def _use_fake_client(monkeypatch, writer):
    monkeypatch.setattr(fetch, "_client", lambda cfg, model, search=False: FakeClient(writer))


def _target(tmp_path):
    return tmp_path / "raw" / "2026110600" / "m" / "tp.grib2"


# ---- E008: broken files must never be trusted or left at the final path

def test_is_complete_accepts_exact_steps_only(tmp_path):
    p = tmp_path / "ok.grib2"
    _write_sample_grib(p)
    assert fetch.is_complete(p, [0]) is True
    assert fetch.is_complete(p, [0, 6]) is False  # a step is missing


def test_is_complete_rejects_missing_truncated_and_garbage_files(tmp_path):
    p = tmp_path / "x.grib2"
    assert fetch.is_complete(p, [0]) is False  # does not exist
    _write_sample_grib(p)
    _truncated(p)
    assert fetch.is_complete(p, [0]) is False  # cut in the middle of a message: used to raise
    p.write_bytes(b"this is not a grib file at all")
    assert fetch.is_complete(p, [0]) is False


def test_download_run_renames_when_complete_and_reuses_next_time(tmp_path, monkeypatch):
    _use_fake_client(monkeypatch, lambda target: _write_sample_grib(target))
    target, reused = fetch.download_run(_cfg(tmp_path), RUN, "m")
    assert (target, reused) == (_target(tmp_path), False)
    assert not target.with_name("tp.grib2.part").exists()
    assert fetch.download_run(_cfg(tmp_path), RUN, "m")[1] is True


def test_interrupted_download_leaves_no_file_at_the_final_path(tmp_path, monkeypatch):
    def writer(target):
        _write_sample_grib(target)
        _truncated(Path(target))
        raise OSError("connection lost")

    _use_fake_client(monkeypatch, writer)
    with pytest.raises(OSError):
        fetch.download_run(_cfg(tmp_path), RUN, "m")
    assert not _target(tmp_path).exists()
    assert not _target(tmp_path).with_name("tp.grib2.part").exists()


def test_truncated_file_from_an_earlier_run_is_downloaded_again(tmp_path, monkeypatch):
    target = _target(tmp_path)
    target.parent.mkdir(parents=True)
    _write_sample_grib(target)
    _truncated(target)
    _use_fake_client(monkeypatch, lambda t: _write_sample_grib(t))
    _, reused = fetch.download_run(_cfg(tmp_path), RUN, "m")
    assert reused is False
    assert fetch.is_complete(target, [0])


def test_download_with_wrong_steps_is_rejected_and_not_kept(tmp_path, monkeypatch):
    _use_fake_client(monkeypatch, lambda t: _write_sample_grib(t))  # holds step 0 only
    with pytest.raises(ValueError):
        fetch.download_run(_cfg(tmp_path, stop=6), RUN, "m")  # expects steps 0 and 6
    assert not _target(tmp_path).exists()


# ---- E009: the run search must stop on a server in trouble, not guess

class _StatusFromPath(http.server.BaseHTTPRequestHandler):
    def do_HEAD(self):
        self.send_response(int(self.path.strip("/")))
        self.end_headers()

    def log_message(self, *args):
        pass


@pytest.fixture
def server_url():
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), _StatusFromPath)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_port}"
    server.shutdown()


@pytest.mark.parametrize("status", [200, 404])
def test_strict_session_passes_published_and_not_yet_published(server_url, status):
    assert fetch._StrictSession().head(f"{server_url}/{status}").status_code == status


@pytest.mark.parametrize("status", [429, 500, 503])
def test_strict_session_raises_on_server_trouble(server_url, status):
    with pytest.raises(fetch.UnexpectedStatus):
        fetch._StrictSession().head(f"{server_url}/{status}")


# ---- S01: no request may wait for ever (docs/SECURITY.md)

@pytest.fixture
def silent_url():
    """A local server that accepts connections and never answers."""
    server = socket.socket()
    server.bind(("127.0.0.1", 0))
    server.listen(5)
    yield f"http://127.0.0.1:{server.getsockname()[1]}/file"
    server.close()


def test_session_gives_up_on_a_server_that_never_answers(silent_url):
    start = time.monotonic()
    with pytest.raises(requests.exceptions.Timeout):
        fetch._TimeoutSession((1, 1)).head(silent_url)
    assert time.monotonic() - start < 5


def test_download_library_cannot_switch_the_timeout_off(silent_url, tmp_path):
    # multiurl, used by the ecmwf-opendata client, passes timeout=None on every call; the session must still apply its own limit
    start = time.monotonic()
    with pytest.raises(requests.exceptions.Timeout):
        multiurl.download(silent_url, target=str(tmp_path / "f"), session=fetch._TimeoutSession((1, 1)),
                          maximum_retries=1, retry_after=0.1)
    assert time.monotonic() - start < 15


def test_both_kinds_of_client_get_the_configured_timeout():
    cfg = fetch.load_config()
    want = (cfg["source"]["connect_timeout_seconds"], cfg["source"]["read_timeout_seconds"])
    download, search = fetch._client(cfg, "ifs").session, fetch._client(cfg, "ifs", search=True).session
    assert type(download) is fetch._TimeoutSession and download.timeout == want
    assert type(search) is fetch._StrictSession and search.timeout == want
