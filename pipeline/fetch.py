"""Fetch ECMWF Open Data total precipitation for the models listed in config/pipeline.toml.

Rung of the "code ladder": the official ecmwf-opendata client does the downloading (it reads each file's
.index and fetches only the requested GRIB messages by byte range). This module only
  1. expands the configured step ranges,
  2. picks the latest run that is complete for ALL models,
  3. downloads one GRIB file of precipitation messages per model,
  4. reads the GRIB keys back with eccodes so the result can be checked.
Run:  python -m pipeline.fetch
"""
import datetime as dt
import os
import tomllib
from pathlib import Path

import eccodes
import requests
from ecmwf.opendata import Client

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config" / "pipeline.toml"
GRIB_KEYS = ("shortName", "units", "stepType", "startStep", "endStep", "dataDate", "dataTime", "gridType", "Ni", "Nj")


def load_config(path=CONFIG_PATH):
    with open(path, "rb") as f:
        return tomllib.load(f)


def expand_steps(step_ranges):
    """[{start, stop, every}, ...] -> sorted list of forecast hours, stop included."""
    steps = set()
    for r in step_ranges:
        if r["every"] <= 0 or r["start"] > r["stop"]:
            raise ValueError(f"bad step range: {r}")
        steps.update(range(r["start"], r["stop"] + 1, r["every"]))
    return sorted(steps)


def latest_common_run(latest_by_hour):
    """{run_hour: [latest complete run per model]} -> newest run complete for every model.

    For one run hour the newest run all models share is the oldest of their individual newest runs.
    Run hours with no run at all (empty list) are ignored.
    """
    candidates = [min(runs) for runs in latest_by_hour.values() if runs]
    if not candidates:
        raise ValueError("no run is complete for every model")
    return max(candidates)


class UnexpectedStatus(RuntimeError):
    """The server answered something other than 200 (published) or 404 (not published yet)."""


class _TimeoutSession(requests.Session):
    """Session that gives every request a (connect, read) timeout in seconds.

    The client and its download library pass `timeout=None` (wait forever), so a server that accepts a
    connection and then goes silent would hang the job for ever (finding S01 in docs/SECURITY.md).
    `timeout=None` here means "no limit" and is only used by tests; `_client` always passes the config values.
    """

    def __init__(self, timeout=None):
        super().__init__()
        self.timeout = timeout

    def request(self, method, url, **kwargs):
        if kwargs.get("timeout") is None:
            kwargs["timeout"] = self.timeout
        return super().request(method, url, **kwargs)


class _StrictSession(_TimeoutSession):
    """HEAD requests of the run search: any answer except 200/404 means the server is in trouble.

    The client would otherwise count e.g. a 503 as "run incomplete" and quietly use an older run (E009).
    """

    def head(self, *args, **kwargs):
        response = super().head(*args, **kwargs)
        if response.status_code not in (200, 404):
            raise UnexpectedStatus(f"HEAD {response.url} answered {response.status_code}")
        return response


def _client(cfg, model, search=False):
    """Client for downloads, or (search=True) a fail-fast client for finding the latest run."""
    s = cfg["source"]
    retries, wait = ((s["search_max_retries"], s["search_retry_after_seconds"]) if search
                     else (s["max_retries"], s["retry_after_seconds"]))
    client = Client(source=s["name"], model=model, resol=s["resolution"], maximum_retries=retries, retry_after=wait)
    timeout = (s["connect_timeout_seconds"], s["read_timeout_seconds"])
    client.session = _StrictSession(timeout) if search else _TimeoutSession(timeout)
    return client


def _request(cfg, model, hour):
    s = cfg["source"]
    return {"type": s["type"], "stream": s["stream"], "param": s["param"], "time": hour,
            "step": expand_steps(cfg["models"][model]["step_ranges"])}


def find_latest_run(cfg):
    """Newest run (UTC datetime) for which every step file of every model exists on the server."""
    latest_by_hour = {}
    for hour in cfg["source"]["run_hours"]:
        runs = []
        for model in cfg["models"]:
            try:
                runs.append(_client(cfg, model, search=True).latest(_request(cfg, model, hour)))
            except ValueError:  # client found no complete run within its search window
                runs = []
                break
        latest_by_hour[hour] = runs
    return latest_common_run(latest_by_hour)


def describe_messages(path):
    """Read selected GRIB keys of every message in a file (decoding of values is not needed)."""
    out = []
    with open(path, "rb") as f:
        while (h := eccodes.codes_grib_new_from_file(f)) is not None:
            try:
                out.append({k: _key(h, k) for k in GRIB_KEYS})
            finally:
                eccodes.codes_release(h)
    return out


def _key(handle, name):
    try:
        return eccodes.codes_get(handle, name)
    except eccodes.CodesInternalError:  # key not defined for this grid type
        return None


def check_steps(messages, expected):
    """Return (missing, extra) end-steps by comparing GRIB messages with the configured step list."""
    got = {m["endStep"] for m in messages}
    return sorted(set(expected) - got), sorted(got - set(expected))


def is_complete(path, expected):
    """True if path is a readable GRIB file whose messages are exactly the expected end steps."""
    if not path.exists():
        return False
    try:
        return not any(check_steps(describe_messages(path), expected))
    except eccodes.CodesInternalError:  # truncated file or not a GRIB file (E008)
        return False


def download_run(cfg, run, model):
    """Download the precipitation messages of one model and run; reuse a complete earlier download.

    The download goes to tp.grib2.part and is renamed only after it has been checked, so a failed or
    interrupted download never leaves a broken file at the final path.
    """
    target = ROOT / cfg["paths"]["raw_dir"] / run.strftime("%Y%m%d%H") / model / "tp.grib2"
    expected = expand_steps(cfg["models"][model]["step_ranges"])
    if is_complete(target, expected):
        return target, True
    part = target.with_name(target.name + ".part")
    target.parent.mkdir(parents=True, exist_ok=True)
    part.unlink(missing_ok=True)
    request = _request(cfg, model, run.hour) | {"date": run.strftime("%Y%m%d")}
    try:
        _client(cfg, model).retrieve(request, target=str(part))
        if not is_complete(part, expected):
            raise ValueError(f"{model}: downloaded file does not hold exactly the expected steps")
        os.replace(part, target)
    finally:
        part.unlink(missing_ok=True)
    return target, False


def summarise(model, path, reused, expected):
    msgs = describe_messages(path)
    missing, extra = check_steps(msgs, expected)
    print(f"\n[{model}] {path.relative_to(ROOT)}  ({'reused' if reused else 'downloaded'})")
    print(f"  messages: {len(msgs)}   size: {path.stat().st_size / 1e6:.2f} MB")
    for k in GRIB_KEYS:
        if k not in ("endStep", "startStep"):
            print(f"  {k}: {sorted({str(m[k]) for m in msgs})}")
    ends = sorted({m["endStep"] for m in msgs})
    print(f"  startStep values: {sorted({m['startStep'] for m in msgs})}")
    print(f"  endStep: first={ends[0]} last={ends[-1]} gaps={sorted({b - a for a, b in zip(ends, ends[1:])})}")
    print(f"  steps missing vs config: {missing}   unexpected: {extra}")
    return not missing and not extra


def main():
    cfg = load_config()
    run = find_latest_run(cfg)
    print(f"latest run complete for all models: {run:%Y-%m-%d %H:%M} UTC  (checked at {dt.datetime.now(dt.UTC):%Y-%m-%d %H:%M} UTC)")
    ok, total = True, 0.0
    for model in cfg["models"]:
        path, reused = download_run(cfg, run, model)
        expected = expand_steps(cfg["models"][model]["step_ranges"])
        ok &= summarise(model, path, reused, expected)
        total += path.stat().st_size / 1e6
    print(f"\ntotal downloaded size: {total:.2f} MB   all steps present: {ok}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
