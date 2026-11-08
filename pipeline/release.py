"""The stored base-map file from its GitHub Release asset (plan PLAN-013 step 13.3; retry added by PLAN-015 step 15.1, decision D45).

The file (about 190 MB) is not in git. A build downloads it, and refuses it unless the size and the sha256 of config/basemap.toml [release] match.
A failure that may pass by itself (network error, timeout, HTTP 5xx or 429) is tried again, at most `attempts` times with `retry_wait_seconds` between the tries
(on 2026-11-08 a GitHub incident made the download time out twice in a row, error E039). A wrong size, a wrong hash, a bad address or any other
HTTP answer is final: it is never retried.
"""
import hashlib
import time

import requests


class _Transient(RuntimeError):
    """A failure that may pass by itself: the only kind that is retried."""


def _sha256_of_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _download_once(r, session, part):
    """One try: stream the file into `part`; returns (size, sha256 hex). The partial file is removed on any failure."""
    response = None
    try:
        response = session.get(r["url"], stream=True)
        if response.status_code == 429 or response.status_code >= 500:
            raise _Transient(f"{r['url']} answered {response.status_code}")
        if response.status_code != 200:
            raise RuntimeError(f"{r['url']} answered {response.status_code}")
        digest, size = hashlib.sha256(), 0
        with part.open("wb") as out:
            for chunk in response.iter_content(1 << 20):
                size += len(chunk)
                if size > r["bytes"]:
                    raise ValueError("the downloaded base-map file is larger than config/basemap.toml says; it was not used")
                digest.update(chunk)
                out.write(chunk)
        return size, digest.hexdigest()
    except requests.exceptions.RequestException as error:  # a timeout or a broken connection, also in the middle of the body
        part.unlink(missing_ok=True)
        raise _Transient(f"network problem: {error}") from error
    except BaseException:
        part.unlink(missing_ok=True)
        raise
    finally:
        if response is not None:
            response.close()


def fetch_release(bm, session, target, partial_suffix, sleep=time.sleep):
    """Download the stored base-map file and check size and sha256 before it is used.
    Returns True if it was downloaded, False if the file already there matches. A wrong size or hash deletes the partial file and raises.
    `sleep` is a parameter so that tests do not wait."""
    r = bm["release"]
    if not r["url"].startswith("https://"):
        raise ValueError("the base-map release address must be https")
    if target.is_file() and target.stat().st_size == r["bytes"] and _sha256_of_file(target) == r["sha256"]:
        return False
    target.parent.mkdir(parents=True, exist_ok=True)
    part = target.with_name(target.name + partial_suffix)
    for attempt in range(1, r["attempts"] + 1):
        try:
            size, digest = _download_once(r, session, part)
            break
        except _Transient as error:
            if attempt == r["attempts"]:
                raise RuntimeError(f"the base-map file could not be downloaded in {attempt} tries: {error}") from error
            print(f"download try {attempt} of {r['attempts']} failed ({error}); trying again in {r['retry_wait_seconds']} s", flush=True)
            sleep(r["retry_wait_seconds"])
    if size != r["bytes"] or digest != r["sha256"]:
        part.unlink(missing_ok=True)
        raise ValueError("the downloaded base-map file does not match the size and sha256 in config/basemap.toml; it was not used")
    part.replace(target)
    return True
