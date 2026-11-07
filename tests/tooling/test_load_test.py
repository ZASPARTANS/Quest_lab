"""Tests for scripts/load_test.py (plan PLAN-014 step 14.1): the safety rules must really hold, and every kind of wrong answer must be reported.

TEST FIXTURES ONLY: invented visits and a local fake server on an ephemeral port (no outside network). The point of these tests is the SAFETY of the tool that will
send traffic to the live site: byte cap, stop at the first 429 or 5xx, no download of a whole big file when a Range header is ignored, rate cap, refusal of a site
that is not on this computer, and a dry run that sends nothing.
"""
import http.server
import json
import threading
import time

import pytest

from scripts import load_test

MAP_SIZE = 100_000
VISITS = {"visitors": [
    {"name": "A", "requests": [
        {"path": "/", "range": None, "status": 200, "bytes": 300, "kind": "page"},
        {"path": "/a.js", "range": None, "status": 200, "bytes": 500, "kind": "asset"},
        {"path": "/data/tiles/1", "range": None, "status": 200, "bytes": 200, "kind": "tile"},
        {"path": "/map.pmtiles", "range": "bytes=0-99", "status": 206, "bytes": 100, "kind": "basemap"},
        {"path": "/map.pmtiles", "range": "bytes=1000-1999", "status": 206, "bytes": 1000, "kind": "basemap"}]},
    {"name": "B", "requests": [
        {"path": "/", "range": None, "status": 200, "bytes": 300, "kind": "page"},
        {"path": "/a.js", "range": None, "status": 200, "bytes": 500, "kind": "asset"},
        {"path": "/data/tiles/2", "range": None, "status": 200, "bytes": 220, "kind": "tile"},
        {"path": "/map.pmtiles", "range": "bytes=5000-5499", "status": 206, "bytes": 500, "kind": "basemap"}]}]}
SIZES = {"/": 300, "/a.js": 500, "/data/tiles/1": 200, "/data/tiles/2": 220}


class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self):
        super().__init__(("127.0.0.1", 0), Handler)
        self.mode, self.hits, self.served, self.lock, self.times = "ok", 0, 0, threading.Lock(), []


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_HEAD(self):
        self.send_response(200 if self.path in SIZES or self.path == "/map.pmtiles" else 404)
        self.end_headers()

    def do_GET(self):
        server = self.server
        with server.lock:
            server.hits += 1
            n, mode = server.hits, server.mode
            server.times.append(time.monotonic())
        if (mode == "429" and n >= 6) or (mode == "500" and n >= 6):
            self.send_response(int(mode))
            self.end_headers()
            return
        if mode == "404-some" and n % 5 == 0:
            self.send_response(404)
            self.end_headers()
            return
        rng = self.headers.get("Range")
        if self.path == "/map.pmtiles":
            self.map_answer(rng, mode)
            return
        body = b"x" * SIZES.get(self.path, 10)
        if mode == "short-body":
            body = body[:5]
        self.reply(200, body)

    def map_answer(self, rng, mode):
        if mode == "ignores-range" or not rng:
            self.reply(200, b"M" * MAP_SIZE)      # the whole file: a host that ignores Range
            return
        first, last = (int(x) for x in rng.split("=")[1].split("-"))
        body = b"M" * (last - first + 1)
        if mode == "wrong-range":
            first += 1
        self.reply(206, body, {"Content-Range": f"bytes {first}-{first + len(body) - 1}/{MAP_SIZE}"})

    def reply(self, status, body, extra=None):
        self.send_response(status)
        for key, value in (extra or {}).items():
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        try:
            self.wfile.write(body)
            with self.server.lock:
                self.server.served += len(body)
        except OSError:
            pass


@pytest.fixture
def site(tmp_path):
    server = Server()
    threading.Thread(target=server.serve_forever, daemon=True).start()
    visits = tmp_path / "visits.json"
    visits.write_text(json.dumps(VISITS), encoding="utf-8")
    yield server, f"http://127.0.0.1:{server.server_address[1]}", str(visits)
    server.shutdown()


def run(base, visits, *extra):
    return load_test.main([base, "--visits", visits, "--gap", "0", *extra])


def test_a_healthy_site_is_answered_correctly_at_every_level(site, capsys):
    server, base, visits = site
    assert run(base, visits, "--levels", "1,3") == 0
    assert "every answer was correct" in capsys.readouterr().out
    assert server.hits == 5 + (5 + 4 + 5)  # level 1: visitor A (5 requests); level 3: visitors A, B, A (5 + 4 + 5)


def test_a_dry_run_sends_nothing_and_a_site_off_this_computer_is_refused_without_approval(site, capsys):
    server, base, visits = site
    assert run(base, visits, "--levels", "5", "--dry-run") == 0
    assert server.hits == 0 and "nothing was sent" in capsys.readouterr().out
    assert run("http://example.invalid/x", visits, "--levels", "1") == 2   # refused before any name lookup or request
    assert "not on this computer" in capsys.readouterr().out


def test_the_byte_cap_is_hard_the_server_never_serves_more_than_the_cap(site, capsys):
    server, base, visits = site
    assert run(base, visits, "--levels", "3,3", "--max-mb", "0.004") == 1
    assert "byte cap reached" in capsys.readouterr().out
    assert server.served <= 4000


def test_the_run_stops_at_the_first_429_and_at_the_first_5xx(site, capsys):
    server, base, visits = site
    server.mode = "429"
    assert run(base, visits, "--levels", "3,3") == 1
    out = capsys.readouterr().out
    assert "STOPPED: the host answered 429" in out
    assert server.hits < 20, "it must stop at once, not finish the plan"
    server.mode, server.hits = "500", 0
    assert run(base, visits, "--levels", "3,3") == 1
    assert "answered 500" in capsys.readouterr().out and server.hits < 20


def test_a_host_that_ignores_the_range_header_cannot_make_the_tool_read_the_whole_file(site, capsys):
    server, base, visits = site
    server.mode = "ignores-range"
    assert run(base, visits, "--levels", "1", "--out", str(site[2]) + ".out.json") == 1
    report = json.loads(open(site[2] + ".out.json", encoding="utf-8").read())
    problems = " ".join(report["levels"][0]["problems"])
    assert "status 200, recorded 206" in problems and "larger than recorded" in problems
    assert report["levels"][0]["mb"] * 1e6 < 20_000, "three 100000-byte answers were read only up to twice the recorded size plus a little, not in full (300000 bytes)"


def test_a_wrong_content_range_a_short_body_and_a_missing_page_are_each_reported(site, capsys):
    server, base, visits = site
    server.mode = "wrong-range"
    assert run(base, visits, "--levels", "1") == 1
    assert "Content-Range" in capsys.readouterr().out
    server.mode = "short-body"
    assert run(base, visits, "--levels", "1") == 1
    assert "bytes, recorded" in capsys.readouterr().out
    server.mode = "404-some"
    assert run(base, visits, "--levels", "3") == 1
    assert "status 404, recorded" in capsys.readouterr().out


def test_too_many_failed_requests_stop_the_run(site, capsys):
    server, base, visits = site
    server.mode = "404-some"   # every fifth request fails: 20 %
    assert run(base, visits, "--levels", "6,6") == 1
    assert "of the requests failed" in capsys.readouterr().out


def test_the_request_rate_cap_is_kept(site):
    server, base, visits = site
    start = time.monotonic()
    assert run(base, visits, "--levels", "2", "--max-rps", "20") == 0
    assert time.monotonic() - start >= (server.hits - 1) / 20 * 0.9
    gaps = [b - a for a, b in zip(server.times, server.times[1:])]
    assert min(sum(gaps[i:i + 5]) for i in range(len(gaps) - 4)) >= 0.2, "five gaps are never shorter than about 0.25 s at 20 requests per second"


def test_preflight_refuses_a_recorded_address_that_is_not_on_the_site_before_any_load(site, capsys):
    server, base, visits = site
    bad = json.loads(open(visits, encoding="utf-8").read())
    bad["visitors"][0]["requests"].append({"path": "/gone.js", "range": None, "status": 200, "bytes": 10, "kind": "asset"})
    open(visits, "w", encoding="utf-8").write(json.dumps(bad))
    assert run(base, visits, "--levels", "1", "--preflight") == 2
    assert "not on this site" in capsys.readouterr().out and server.hits == 0   # only HEAD requests were sent


def test_the_plan_adds_up_and_warns_when_it_is_larger_than_the_cap(site, capsys):
    server, base, visits = site
    assert load_test.plan(VISITS["visitors"], [1, 3]) == (4, 5 + 4 + 5 + 5, 2100 + 1520 + 2100 + 2100 - 0 * 0)
    run(base, visits, "--levels", "40", "--max-mb", "0.001", "--dry-run")
    assert "WARNING: the plan is larger than the byte cap" in capsys.readouterr().out
