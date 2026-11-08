"""Replay what real first visits request, with several visitors at the same moment (plan PLAN-014 step 14.1). Standard library only.
    python scripts/load_test.py http://127.0.0.1:8081/Quest_lab --levels 1,10,25 --visits docs/evidence/visits.json          (the local test site)
    python scripts/load_test.py https://zaspartans.github.io/Quest_lab --levels 1,2,4,8 --max-mb 60 --approved "user go 2026-11-07 HH:MM"   (the live site)
The visits file is made by frontend/tools/record_visit.mjs (path, Range header, status and size of every request of a real visit). Each visitor replays its
requests in the recorded order with at most 6 at a time (what a browser does); a level starts all its visitors together; levels run one after the other.
SAFETY (all of it tested offline, tests/tooling/test_load_test.py): the plan (visitors, requests, megabytes) is printed before anything is sent and `--dry-run`
sends nothing; a site that is not on this computer is refused unless `--approved "<who and when>"` is given; hard caps on total megabytes, seconds and requests
per second; the run STOPS at the first 403, 429 or 5xx answer, or when more than 5 % of the requests failed; no retries; every answer is read only up to the size
recorded (a host that ignores a Range header cannot make the tool download a whole 190 MB file); the User-Agent says what this is.
Exit code 0 only if every request of every level was answered correctly and nothing stopped the run.
"""
import argparse
import json
import re
import statistics
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

LOCAL = {"localhost", "127.0.0.1", "::1"}
WORKERS_PER_VISITOR = 6
STOP_STATUSES = (403, 429)
LOOSE_KINDS = {"page", "tile", "picture", "manifest", "status", "font", "sprite"}   # their size may differ a little between two builds or exports (the page by a blank line)
LOOSE_FRACTION = 0.25
MAX_FAILED_SHARE = 0.05


class Budget:
    """Shared by every thread: bytes, time, the stop flag and its reason. The first reason wins."""

    def __init__(self, max_bytes, max_seconds):
        self.max_bytes, self.deadline, self.used, self.sent, self.failed = max_bytes, time.monotonic() + max_seconds, 0, 0, 0
        self.lock, self.reason = threading.Lock(), None

    def stop(self, reason):
        with self.lock:
            self.reason = self.reason or reason

    def reserve(self, expected):
        """True if a request of about `expected` bytes may be sent; otherwise sets the reason and refuses. The bytes are counted when sent, so the cap holds."""
        with self.lock:
            if self.reason:
                return False
            if time.monotonic() > self.deadline:
                self.reason = "time cap reached"
            elif self.used + expected > self.max_bytes:
                self.reason = f"byte cap reached ({self.max_bytes / 1e6:.0f} MB)"
            else:
                self.used += expected
                self.sent += 1
                return True
            return False

    def settle(self, expected, actual):
        with self.lock:
            self.used += actual - expected

    def observe(self, result):
        """Stop at the first sign of trouble: a 403, 429 or 5xx answer, or too many failed requests."""
        status = result["status"]
        if status in STOP_STATUSES or status >= 500:
            self.stop(f"the host answered {status} to {result['path']}")
        with self.lock:
            self.failed += bool(result["problems"])
            share = self.failed / self.sent if self.sent else 0
            if self.sent >= 20 and share > MAX_FAILED_SHARE:
                self.reason = self.reason or f"{share * 100:.0f} % of the requests failed"


class Pace:
    """At most `rps` requests a second over all threads."""

    def __init__(self, rps):
        self.gap, self.next, self.lock = 1.0 / rps, 0.0, threading.Lock()

    def wait(self):
        with self.lock:
            now = time.monotonic()
            slot = max(now, self.next)
            self.next = slot + self.gap
        if slot > now:
            time.sleep(slot - now)


def expected_bytes(rec):
    """What the answer should weigh: for a Range request what the header asks for (the recorded size can be short when the browser cancelled that read), else the recorded size."""
    match = re.match(r"^bytes=(\d+)-(\d+)$", rec["range"] or "")
    return int(match.group(2)) - int(match.group(1)) + 1 if match else rec["bytes"]


def judge(rec, status, headers, length, oversize):
    """Problems with one answer, compared with the recorded request. A recorded Range request must be answered 206 with the right Content-Range."""
    problems = []
    if status != rec["status"]:
        problems.append(f"status {status}, recorded {rec['status']}")
    if oversize:
        problems.append("the answer is larger than recorded (a host that ignores the Range header?)")
    if rec["range"] and status == 206:
        first, last = (int(x) if x else None for x in re.match(r"^bytes=(\d*)-(\d*)$", rec["range"]).groups())
        got = re.match(r"^bytes (\d+)-(\d+)/(\d+)$", headers.get("Content-Range") or "")
        if not got or int(got.group(1)) != first or int(got.group(2)) != min(last, int(got.group(3)) - 1) or length != int(got.group(2)) - first + 1:
            problems.append(f"Content-Range {headers.get('Content-Range')!r} or length {length} does not match {rec['range']}")
    elif status == rec["status"] and not rec["range"]:
        low, high = (rec["bytes"] * (1 - LOOSE_FRACTION), rec["bytes"] * (1 + LOOSE_FRACTION)) if rec["kind"] in LOOSE_KINDS else (rec["bytes"], rec["bytes"])
        if not low <= length <= high:
            problems.append(f"{length} bytes, recorded {rec['bytes']}")
    if length == 0 and status == rec["status"]:
        problems.append("empty answer")
    return problems


def fetch(base, rec, budget, pace, agent):
    """Send one recorded request; returns its result, or None if the budget or the stop flag forbids it."""
    expected = max(expected_bytes(rec), 1)
    limit = expected * 2 + 4096
    if not budget.reserve(expected):
        return None
    pace.wait()
    headers = {"User-Agent": agent, **({"Range": rec["range"]} if rec["range"] else {})}
    started = time.monotonic()
    try:
        with urllib.request.urlopen(urllib.request.Request(base + rec["path"], headers=headers), timeout=30) as response:
            first_byte = time.monotonic() - started
            status, answer = response.status, response.headers
            body = response.read(limit)
            oversize = bool(response.read(1))
    except urllib.error.HTTPError as error:
        status, answer, body, oversize, first_byte = error.code, error.headers, b"", False, time.monotonic() - started
    except (urllib.error.URLError, OSError) as error:
        status, answer, body, oversize, first_byte = 0, {}, b"", False, time.monotonic() - started
        result = {"kind": rec["kind"], "path": rec["path"], "status": 0, "bytes": 0, "ttfb": first_byte, "total": first_byte, "problems": [f"no answer: {error}"]}
        budget.settle(expected, 0)
        budget.observe(result)
        return result
    budget.settle(expected, len(body))
    result = {"kind": rec["kind"], "path": rec["path"], "status": status, "bytes": len(body), "ttfb": first_byte, "total": time.monotonic() - started,
              "problems": judge(rec, status, answer, len(body), oversize)}
    budget.observe(result)
    return result


def run_visitor(base, requests, budget, pace, agent):
    with ThreadPoolExecutor(max_workers=WORKERS_PER_VISITOR) as pool:
        return [r for r in pool.map(lambda rec: fetch(base, rec, budget, pace, agent), requests) if r]


def plan(visits, levels):
    """(visitors, requests, bytes) the levels would use: visitor i replays visit i modulo the number of recorded visits."""
    chosen = [visits[i % len(visits)] for level in levels for i in range(level)]
    return len(chosen), sum(len(v["requests"]) for v in chosen), sum(expected_bytes(r) for v in chosen for r in v["requests"])


def run_level(base, visits, level, budget, pace, agent):
    results, lock = [], threading.Lock()

    def one(i):
        time.sleep((i * 0.37) % 0.3)   # a small spread, not a perfect start line
        got = run_visitor(base, visits[i % len(visits)]["requests"], budget, pace, agent)
        with lock:
            results.extend(got)

    started = time.monotonic()
    threads = [threading.Thread(target=one, args=(i,)) for i in range(level)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    return results, time.monotonic() - started


def percentile(values, share):
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, int(share * len(ordered)))] if ordered else 0.0


def summarise(level, results, seconds):
    by_kind = {}
    for r in results:
        by_kind.setdefault(r["kind"], []).append(r["total"] * 1000)
    statuses = {}
    for r in results:
        statuses[r["status"]] = statuses.get(r["status"], 0) + 1
    problems = [f"{r['path']}: {p}" for r in results for p in r["problems"]]
    return {"visitors": level, "requests": len(results), "mb": sum(r["bytes"] for r in results) / 1e6, "seconds": seconds, "statuses": statuses, "problems": problems,
            "latency_ms": {k: {"median": statistics.median(v), "p95": percentile(v, 0.95), "max": max(v)} for k, v in sorted(by_kind.items())}}


def preflight(base, visits, pace, agent):
    """HEAD every distinct address once (no bodies): the visits must exist on this site, so a recorded address that is missing is found before any load."""
    missing = []
    for path in sorted({r["path"] for v in visits for r in v["requests"]}):
        pace.wait()
        request = urllib.request.Request(base + path, method="HEAD", headers={"User-Agent": agent})
        try:
            urllib.request.urlopen(request, timeout=30).close()
        except urllib.error.HTTPError as error:
            missing.append(f"{path} -> {error.code}")
        except (urllib.error.URLError, OSError) as error:
            missing.append(f"{path} -> {error}")
    return missing


def parse(argv):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("base")
    parser.add_argument("--visits", default="docs/evidence/visits.json")
    parser.add_argument("--levels", default="1,5,10", help="simultaneous visitors per level, comma separated")
    parser.add_argument("--gap", type=float, default=30, help="seconds between levels")
    parser.add_argument("--max-mb", type=float, default=60)
    parser.add_argument("--max-seconds", type=float, default=180)
    parser.add_argument("--max-rps", type=float, default=40)
    parser.add_argument("--approved", default="", help="who allowed traffic to a site that is not on this computer, and when")
    parser.add_argument("--user-agent", default="precip-forecast-load-test (a capped test by the site owner)")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--preflight", action="store_true")
    parser.add_argument("--out", default="")
    return parser.parse_args(argv)


def show_level(row):
    print(f"level {row['visitors']}: {row['requests']} requests, {row['mb']:.1f} MB, {row['seconds']:.1f} s, statuses {row['statuses']}, problems {len(row['problems'])}")
    for kind, stats in row["latency_ms"].items():
        print(f"    {kind:9s} median {stats['median']:7.0f} ms   p95 {stats['p95']:7.0f} ms   max {stats['max']:7.0f} ms")
    for problem in row["problems"][:5]:
        print(f"    PROBLEM {problem}")


def run_levels(base, visits, levels, args, pace, budget):
    report = []
    for n, level in enumerate(levels):
        results, seconds = run_level(base, visits, level, budget, pace, args.user_agent)
        report.append(summarise(level, results, seconds))
        show_level(report[-1])
        if budget.reason or n == len(levels) - 1:
            break
        time.sleep(args.gap)
    return report


def main(argv):
    args = parse(argv)
    base, levels = args.base.rstrip("/"), [int(x) for x in args.levels.split(",")]
    visits = json.loads(Path(args.visits).read_text(encoding="utf-8"))["visitors"]
    visitors, requests, nbytes = plan(visits, levels)
    print(f"PLAN: {visitors} visitors in levels {levels}, {requests} requests, about {nbytes / 1e6:.1f} MB; caps {args.max_mb:.0f} MB, {args.max_seconds:.0f} s, {args.max_rps:.0f} requests/s; site {base}")
    if nbytes > args.max_mb * 1e6:
        print(f"WARNING: the plan is larger than the byte cap; the run will stop at the cap ({args.max_mb:.0f} MB), before the last level is done")
    if urllib.parse.urlparse(base).hostname not in LOCAL and not args.approved:
        print('REFUSED: this site is not on this computer; give --approved "<who allowed it and when>"')
        return 2
    if args.dry_run:
        print("dry run: nothing was sent")
        return 0
    pace, budget = Pace(args.max_rps), Budget(int(args.max_mb * 1e6), args.max_seconds)
    if args.preflight:
        missing = preflight(base, visits, pace, args.user_agent)
        if missing:
            print(f"REFUSED: {len(missing)} recorded address(es) are not on this site, e.g. {missing[0]}")
            return 2
        print("preflight: every recorded address exists on this site")
    report = run_levels(base, visits, levels, args, pace, budget)
    ok = not budget.reason and not any(r["problems"] for r in report)
    print(f"{'STOPPED: ' + budget.reason if budget.reason else 'finished'}; sent {budget.sent} requests, {sum(r['mb'] for r in report):.1f} MB; {'every answer was correct' if ok else 'PROBLEMS found'}")
    if args.out:
        Path(args.out).write_text(json.dumps({"levels": report, "stopped": budget.reason}, indent=1), encoding="utf-8")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
