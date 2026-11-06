"""Add the sha256 hash of every published file of each pinned package to requirements.txt (finding S02, docs/SECURITY.md).

With the hashes in place `pip install --require-hashes -r requirements.txt` refuses any file that is not one of the
files PyPI published for that exact version. Settings (file name, PyPI URL, timeout) are in config/security.toml [hashes].
Run from the project folder, with internet access, on the host (the Docker services mount the project read-only):
    python -m scripts.pin_hashes
Safe to run again: existing hashes are stripped and written afresh. Comments and blank lines are kept; a comment that
followed a package on the same line is moved to its own line above it (a comment inside a continued line would break pip).
"""
import json
import re
import tomllib
import urllib.request

from pipeline.paths import ROOT

CONFIG = tomllib.loads((ROOT / "config" / "security.toml").read_text(encoding="utf-8"))["hashes"]
HASH = re.compile(r"--hash=sha256:[0-9a-f]+")
REQUIREMENT = re.compile(r"^(?P<name>[A-Za-z0-9][A-Za-z0-9_.-]*)==(?P<version>[^\s;#\\]+)\s*"
                         r"(?:;\s*(?P<marker>[^#\\]*?))?\s*(?:#\s*(?P<comment>.*?))?\s*$")


def fetch_hashes(name, version):
    """sha256 of every file PyPI lists for name==version (wheels and source archive), sorted."""
    url = CONFIG["pypi_json_url"].format(name=name, version=version)
    with urllib.request.urlopen(url, timeout=CONFIG["timeout_seconds"]) as response:
        files = json.load(response)["urls"]
    hashes = sorted({f["digests"]["sha256"] for f in files})
    if not hashes:
        raise ValueError(f"{name}=={version}: PyPI lists no files")
    return hashes


def logical_lines(text):
    """Text -> list of lines where a line ending in a backslash is joined with the next one."""
    out, pending = [], ""
    for line in text.splitlines():
        if line.rstrip().endswith("\\"):
            pending += line.rstrip()[:-1] + " "
        else:
            out.append(pending + line)
            pending = ""
    return out + ([pending] if pending else [])


def format_entry(name, version, marker, comment, hashes):
    """Lines of one hashed requirement; the comment (if any) goes on its own line above."""
    parts = [f"{name}=={version}" + (f" ; {marker}" if marker else "")] + [f"    --hash=sha256:{h}" for h in hashes]
    lines = [f"{p} \\" for p in parts[:-1]] + [parts[-1]]
    return ([f"# {comment}"] if comment else []) + lines


def add_hashes(text, get_hashes=fetch_hashes):
    """requirements text -> the same text with hashes on every pinned package. `get_hashes(name, version)` gives the list."""
    out = []
    for line in logical_lines(text):
        match = REQUIREMENT.match(HASH.sub("", line).strip())
        if match is None:
            out.append(line)  # comment, blank line or anything else: unchanged
            continue
        name, version = match["name"], match["version"]
        out += format_entry(name, version, match["marker"], match["comment"], get_hashes(name, version))
    return "\n".join(out) + "\n"


def main():
    path = ROOT / CONFIG["requirements_file"]
    path.write_text(add_hashes(path.read_text(encoding="utf-8")), encoding="utf-8")
    print(f"hashes written to {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
