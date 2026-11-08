"""The stored base map (plan PLAN-010, decision D38): a world extract of OpenStreetMap data (Protomaps) plus the fonts and sprites of its style,
kept in <basemap_dir> (git-ignored) and served by our own site. Nothing is downloaded when a visitor opens the page.

What is downloaded, and how it is checked (finding S02 style, docs/SECURITY.md):
  the `pmtiles` tool     one release archive, sha256 from config/basemap.toml, one named file taken out of it (no path from the archive is used)
  the world extract      `pmtiles extract <daily world build URL> --maxzoom=N`, which reads only the needed part of the remote file
  base-map file          the scheduled build downloads it from the GitHub Release in config/basemap.toml [release] (`fetch-release`, size and sha256 checked)
  fonts and sprites      pinned to one commit; every file is checked against config/basemap_assets.lock.json (sha256), and the lock itself was
                         made from files whose git blob hash equals the one in the commit's tree listing (`lock-assets`)
Every name, folder, URL and number comes from config/basemap.toml and config/pipeline.toml [paths] (decision D17).
Run (the `basemap` container has network access, runs as a normal user, and can write only under data/):
  python -m pipeline.basemap measure       tool + assets + the extracts of the gate zooms, prints sizes and times (step 9.3d-1)
  python -m pipeline.basemap lock-assets   write a DRAFT assets lock (reviewed and copied to config/ by hand: the project folder is read-only here)
  python -m pipeline.basemap fetch-assets  fonts and sprites only, downloaded (the maintainer's way to refresh the folder kept in the repository)
  python -m pipeline.basemap install-assets  fonts and sprites from the folder kept in the repository (offline, every file checked against the lock; what a build uses)
  python -m pipeline.basemap fetch-release  the stored base-map file from its release asset (checked)
  python -m pipeline.basemap build         the extract the site uses (extract.maxzoom)
"""
import datetime as dt
import hashlib
import io
import json
import subprocess
import sys
import tarfile
import time
import tomllib

from pipeline.fetch import _TimeoutSession, load_config
from pipeline.paths import ROOT
from pipeline.release import fetch_release


def load_basemap(cfg):
    return tomllib.loads((ROOT / cfg["paths"]["basemap_config_file"]).read_text(encoding="utf-8"))


def make_session(bm):
    s = bm["source"]
    return _TimeoutSession((s["connect_timeout_seconds"], s["read_timeout_seconds"]))


def folders(cfg):
    p = cfg["paths"]
    base = ROOT / p["basemap_dir"]
    return {"root": base, "tool_dir": base / p["basemap_tool_dir"], "assets_dir": base / p["basemap_assets_dir"]}


def sha256_of(data):
    return hashlib.sha256(data).hexdigest()


def git_blob_sha1(data):
    """The hash git gives a file ('blob <size>' + NUL + content), as listed in a commit's tree."""
    return hashlib.sha1(b"blob %d\0" % len(data) + data).hexdigest()  # noqa: S324 - git's own identifier, not used for security here


def newest_planet(bm, session, today):
    """(URL, size in bytes) of the newest daily world build that exists. A missing day (403/404) is skipped; any other answer stops the run."""
    s = bm["source"]
    for back in range(s["lookback_days"] + 1):
        url = s["planet_url"].format(date=(today - dt.timedelta(days=back)).strftime(s["date_format"]))
        response = session.head(url, allow_redirects=False)
        if response.status_code == 200:
            return url, int(response.headers["Content-Length"])
        if response.status_code not in (403, 404):
            raise RuntimeError(f"unexpected answer {response.status_code} for {url}")
    raise RuntimeError(f"no world build found for the last {s['lookback_days'] + 1} days")


def fetch_tool(bm, session, tool_dir):
    """Download the tool archive, check its sha256, write the one named member to tool_dir and return its path."""
    t = bm["tool"]
    url = t["url"].format(version=t["version"])
    response = session.get(url)
    if response.status_code != 200:
        raise RuntimeError(f"tool download answered {response.status_code}")
    if sha256_of(response.content) != t["sha256"]:
        raise ValueError("the downloaded tool does not match the sha256 in config/basemap.toml; it was not used")
    with tarfile.open(fileobj=io.BytesIO(response.content), mode="r:gz") as archive:
        member = next((m for m in archive.getmembers() if m.name == t["member"] and m.isfile()), None)
        if member is None:
            raise ValueError(f"the archive has no file named {t['member']!r}")
        data = archive.extractfile(member).read()
    tool_dir.mkdir(parents=True, exist_ok=True)
    target = tool_dir / t["member"]
    target.write_bytes(data)
    target.chmod(0o755)
    return target


def extract_args(bm, tool, source, out, maxzoom):
    """The command line of one extract (a list, never a shell string)."""
    e = bm["extract"]
    return [str(tool), "extract", str(source), str(out), f"--maxzoom={maxzoom}", f"--download-threads={e['download_threads']}", f"--overfetch={e['overfetch']}"]


def run_extract(bm, tool, source, out, maxzoom):
    """Run one extract; returns (seconds, size in bytes). Raises with the tool's own message on failure."""
    started = time.time()
    done = subprocess.run(extract_args(bm, tool, source, out, maxzoom), capture_output=True, text=True, timeout=bm["extract"]["timeout_minutes"] * 60)  # noqa: S603
    if done.returncode != 0:
        raise RuntimeError(f"extract failed ({done.returncode}): {(done.stderr or done.stdout)[-400:]}")
    return time.time() - started, out.stat().st_size


def asset_paths(bm):
    """Repository paths of every file kept: the glyph ranges of each font, the sprite files of the flavour, and the font licence."""
    a = bm["style_assets"]
    paths = []
    for font in a["fonts"]:
        for start in range(0, a["font_range_max"] + 1, a["font_range_size"]):
            paths.append(f"fonts/{font}/{start}-{start + a['font_range_size'] - 1}.pbf")
    for suffix in ("", "@2x"):
        for ext in ("json", "png"):
            paths.append(f"{a['sprite_dir']}/{a['sprite_flavor']}{suffix}.{ext}")
    paths.append(a["licence_file"])
    return paths


def raw_url(bm, path):
    a = bm["style_assets"]
    return a["raw_url"].format(repo=a["repo"], commit=a["commit"], path=path.replace(" ", "%20"))


def get_bytes(session, url):
    response = session.get(url)
    if response.status_code != 200:
        raise RuntimeError(f"{url} answered {response.status_code}")
    return response.content


def lock_assets(bm, session, lock_path):
    """Download every asset, check its git blob hash against the commit's tree listing, and write the sha256 lock file."""
    a = bm["style_assets"]
    tree = session.get(a["tree_url"].format(repo=a["repo"], commit=a["commit"])).json()
    if tree.get("truncated"):
        raise RuntimeError("the tree listing is truncated; the lock cannot be made")
    known = {t["path"]: t["sha"] for t in tree["tree"] if t["type"] == "blob"}
    files = {}
    for path in asset_paths(bm):
        data = get_bytes(session, raw_url(bm, path))
        if known.get(path) != git_blob_sha1(data):
            raise ValueError(f"{path} does not match the commit's own hash; no lock was written")
        files[path] = {"sha256": sha256_of(data), "bytes": len(data)}
    lock_path.write_text(json.dumps({"commit": a["commit"], "files": files}, indent=1), encoding="utf-8")
    return files


def _load_lock(bm, lock_path):
    """The assets lock file, refused if it belongs to another commit or lists other files than the config asks for."""
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    if lock["commit"] != bm["style_assets"]["commit"]:
        raise ValueError("the lock file belongs to another commit than config/basemap.toml")
    if set(lock["files"]) != set(asset_paths(bm)):
        raise ValueError("the lock file lists other files than the config asks for; run lock-assets")
    return lock


def install_assets(bm, lock_path, source_dir, assets_dir):
    """Copy the fonts and sprites from the folder kept in our own repository into assets_dir, offline (PLAN-015 step 15.2, decision D45).
    Every file is checked against the lock file first: a missing, an extra or a changed file raises and nothing is copied. Returns (files, total bytes)."""
    lock = _load_lock(bm, lock_path)
    present = {p.relative_to(source_dir).as_posix() for p in source_dir.rglob("*") if p.is_file()} if source_dir.is_dir() else set()
    if present != set(lock["files"]):
        raise ValueError(f"the assets folder {source_dir.name} and the lock file list different files: missing {sorted(set(lock['files']) - present)[:3]}, extra {sorted(present - set(lock['files']))[:3]}")
    contents = {}
    for path, entry in lock["files"].items():
        contents[path] = (source_dir / path).read_bytes()
        if sha256_of(contents[path]) != entry["sha256"]:
            raise ValueError(f"{path} does not match the lock file; nothing was copied")
    for path, data in contents.items():
        target = assets_dir / path
        target.parent.mkdir(parents=True, exist_ok=True)
        if not (target.is_file() and target.read_bytes() == data):
            target.write_bytes(data)
    return len(contents), sum(len(d) for d in contents.values())


def fetch_assets(bm, session, lock_path, assets_dir):
    """Download the assets listed in the lock file into assets_dir (paths below it follow the repository); returns (downloaded, kept, total bytes).
    A build does not use this any more (it uses install-assets): it is the maintainer's way to refresh the folder kept in the repository."""
    lock = _load_lock(bm, lock_path)
    downloaded = kept = total = 0
    for path, entry in lock["files"].items():
        target = assets_dir / path
        if target.is_file() and sha256_of(target.read_bytes()) == entry["sha256"]:
            kept += 1
        else:
            data = get_bytes(session, raw_url(bm, path))
            if sha256_of(data) != entry["sha256"]:
                raise ValueError(f"{path} does not match the lock file; it was not stored")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            downloaded += 1
        total += entry["bytes"]
    return downloaded, kept, total


def measure(cfg, bm, session):
    """The gate (step 9.3d-1): tool, assets, then extracts of the gate zooms (ascending) with sizes and times; stops at gate_stop_mb."""
    f = folders(cfg)
    tool = fetch_tool(bm, session, f["tool_dir"])
    lock = ROOT / bm["style_assets"]["lock_file"]
    if not lock.is_file():
        raise SystemExit(f"{lock.relative_to(ROOT)} does not exist: run `lock-assets`, review the draft in the base-map folder and copy it to {lock.relative_to(ROOT)}")
    downloaded, kept, total = fetch_assets(bm, session, lock, f["assets_dir"])
    print(f"tool {bm['tool']['version']} ok; assets: {downloaded} downloaded, {kept} kept, {total / 1e6:.2f} MB (fonts, sprites, licence)")
    url, size = newest_planet(bm, session, dt.datetime.now(dt.UTC).date())
    print(f"world build {url} ({size / 1e9:.1f} GB)")
    for zoom in bm["extract"]["gate_zooms"]:
        out = f["root"] / cfg["paths"]["basemap_measure_file"].format(zoom=zoom)
        seconds, nbytes = run_extract(bm, tool, url, out, zoom)
        print(f"  zoom 0-{zoom}: {nbytes / 1e6:8.1f} MB in {seconds:6.1f} s")
        if nbytes / 1e6 > bm["extract"]["gate_stop_mb"]:
            print(f"  stopped: above gate_stop_mb ({bm['extract']['gate_stop_mb']} MB)")
            break


def main(argv):
    cfg = load_config()
    bm = load_basemap(cfg)
    session = make_session(bm)
    f = folders(cfg)
    command = argv[0] if argv else "measure"
    lock = ROOT / bm["style_assets"]["lock_file"]
    if command == "measure":
        measure(cfg, bm, session)
    elif command == "lock-assets":
        draft = f["root"] / cfg["paths"]["basemap_lock_draft"]
        f["root"].mkdir(parents=True, exist_ok=True)
        files = lock_assets(bm, session, draft)
        print(f"draft lock written to {draft.relative_to(ROOT)} for {len(files)} files, {sum(v['bytes'] for v in files.values()) / 1e6:.2f} MB; review it and copy it to {lock.relative_to(ROOT)}")
    elif command == "fetch-assets":
        downloaded, kept, total = fetch_assets(bm, session, lock, f["assets_dir"])
        print(f"assets: {downloaded} downloaded, {kept} kept, {total / 1e6:.2f} MB")
    elif command == "install-assets":
        files, total = install_assets(bm, lock, ROOT / cfg["paths"]["basemap_assets_source"], f["assets_dir"])
        print(f"assets: {files} files, {total / 1e6:.2f} MB installed from {cfg['paths']['basemap_assets_source']}, all matching the lock file")
    elif command == "fetch-release":
        target = f["root"] / cfg["paths"]["basemap_file"]
        done = fetch_release(bm, session, target, cfg["paths"]["partial_suffix"])
        print(f"{target.relative_to(ROOT)}: {'downloaded and checked' if done else 'already there and matches'} ({bm['release']['bytes'] / 1e6:.1f} MB)")
    elif command == "build":
        tool = fetch_tool(bm, session, f["tool_dir"])
        url, _ = newest_planet(bm, session, dt.datetime.now(dt.UTC).date())
        out = f["root"] / cfg["paths"]["basemap_file"]
        seconds, nbytes = run_extract(bm, tool, url, out, bm["extract"]["maxzoom"])
        print(f"built {out.relative_to(ROOT)}: zoom 0-{bm['extract']['maxzoom']}, {nbytes / 1e6:.1f} MB in {seconds:.0f} s from {url}")
    else:
        raise SystemExit(f"unknown command {command!r}; use measure, lock-assets, fetch-assets, install-assets, fetch-release or build")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
