"""The public site folder (plan PLAN-013 step 13.2): the built page, the forecast data and the stored base map put together the way a static host
without custom response headers (GitHub Pages) needs it, with the security policy written into the page as <meta> tags.

Settings: config/pipeline.toml [pages]. Nothing here is executed on a visitor's computer; it runs in the `export` container (no network).
"""
import re
import shutil

from pipeline.paths import ROOT, remove_folder

CSP_LINE = re.compile(r'add_header\s+Content-Security-Policy\s+"([^"]+)"')
REFERRER_LINE = re.compile(r'add_header\s+Referrer-Policy\s+"([^"]+)"')
META_CHARSET = re.compile(r"<meta\s+charset=[^>]*>", re.IGNORECASE)
OLD_POLICY_TAGS = re.compile(r'\s*<meta\s+(?:http-equiv="Content-Security-Policy"|name="referrer")[^>]*>', re.IGNORECASE)


def policy_from_headers(text):
    """(Content-Security-Policy, Referrer-Policy) as written in config/headers.conf (the one place the security headers are defined)."""
    csp, referrer = CSP_LINE.search(text), REFERRER_LINE.search(text)
    if not csp or not referrer:
        raise ValueError("config/headers.conf has no Content-Security-Policy or no Referrer-Policy line")
    return csp.group(1), referrer.group(1)


def meta_policy(csp, ignored):
    """The policy for a <meta> tag: the same directives except those a meta tag cannot carry. Returns (policy, dropped directive names)."""
    directives = [d.strip() for d in csp.split(";") if d.strip()]
    kept = [d for d in directives if d.split()[0] not in ignored]
    dropped = [d.split()[0] for d in directives if d.split()[0] in ignored]
    return "; ".join(kept), dropped


def inject_meta(html, csp, referrer):
    """Put the policy as the first elements after <meta charset>, before any script (a meta policy only protects what comes after it). Safe to repeat."""
    html = OLD_POLICY_TAGS.sub("", html)
    match = META_CHARSET.search(html)
    if not match:
        raise ValueError("index.html has no <meta charset>: the policy cannot be placed before the scripts")
    attr = csp.replace("&", "&amp;").replace('"', "&quot;")
    tags = f'\n  <meta http-equiv="Content-Security-Policy" content="{attr}">\n  <meta name="referrer" content="{referrer}">'
    return html[:match.end()] + tags + html[match.end():]


def _need(path, what):
    if not path.exists():
        raise FileNotFoundError(f"{what} is missing: {path.relative_to(ROOT) if path.is_relative_to(ROOT) else path}")


def assemble(cfg, backend, frontend, headers_text):
    """Build data/pages/_site from the page build, data/site and the stored base map. Returns { out, bytes, files, dropped }."""
    pages = cfg["pages"]
    build = ROOT / pages["build_dir"]
    dist, out = build / pages["dist_subdir"], build / pages["site_subdir"]
    site = ROOT / cfg["paths"]["site_dir"]
    stored = ROOT / cfg["paths"]["basemap_dir"]
    base_file, assets = stored / cfg["paths"]["basemap_file"], stored / cfg["paths"]["basemap_assets_dir"]
    for path, what in ((dist / "index.html", "the page build (run frontend-build with --base)"), (site / backend["manifest"]["file"], "the forecast manifest"),
                       (site / backend["status"]["file"], "the status file"), (base_file, "the base-map file"), (assets, "the base-map fonts and sprites")):
        _need(path, what)
    if list(dist.rglob("*.mjs")):
        raise ValueError("the page build contains .mjs files: some hosts serve them with the wrong content type (vite.config.js renames the worker)")
    csp, dropped = meta_policy(policy_from_headers(headers_text)[0], pages["meta_ignored_directives"])
    referrer = policy_from_headers(headers_text)[1]
    remove_folder(out)
    shutil.copytree(dist, out)
    data = out / frontend["data_url_path"].strip("/")
    shutil.copytree(site, data)
    map_dir = data / frontend["map"]["basemap"]["url_prefix"].strip("/")
    map_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(base_file, map_dir / frontend["map"]["basemap"]["file"])
    shutil.copytree(assets, map_dir / frontend["map"]["basemap"]["assets_dir"])
    index = out / "index.html"
    index.write_text(inject_meta(index.read_text(encoding="utf-8"), csp, referrer), encoding="utf-8")
    (out / ".nojekyll").write_text("", encoding="utf-8")  # no Jekyll processing on the host; files whose names start with an underscore would be dropped otherwise
    files = [p for p in out.rglob("*") if p.is_file()]
    total = sum(p.stat().st_size for p in files)
    if total > pages["max_site_bytes"]:
        raise ValueError(f"the site is {total / 1e6:.0f} MB, above the host's limit of {pages['max_site_bytes'] / 1e6:.0f} MB")
    return {"out": out, "bytes": total, "files": len(files), "dropped": dropped}
