"""Repository secret scan (finding S05 in docs/SECURITY.md).

Looks in every text file of the project for well-known key formats listed in config/security.toml and fails if one
is found. The message names the file, the line and the pattern, never the value. The fake keys in the scanner tests
are built at run time so that this file does not contain a match itself.
"""
import os
import re
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = tomllib.loads((ROOT / "config" / "security.toml").read_text(encoding="utf-8"))


def find_secrets(root, patterns, skip_dirs, max_bytes):
    """[(relative path, line number, pattern name)] for every line of every scanned file that matches a pattern."""
    compiled = {name: re.compile(p) for name, p in patterns.items()}
    found = []
    for folder, dirs, files in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in skip_dirs)  # never enter skipped folders (.venv is slow to walk)
        for filename in sorted(files):
            path = Path(folder) / filename
            if path.stat().st_size > max_bytes:
                continue
            data = path.read_bytes()
            if b"\0" in data[:8000]:  # binary file
                continue
            relative = path.relative_to(root).as_posix()
            for number, line in enumerate(data.decode("utf-8", errors="replace").splitlines(), start=1):
                found += [(relative, number, name) for name, rx in compiled.items() if rx.search(line)]
    return found


def _scan(root):
    s = CONFIG["scan"]
    return find_secrets(root, CONFIG["patterns"], set(s["skip_dirs"]), s["max_file_bytes"])


def test_the_repository_contains_no_key_formats():
    assert _scan(ROOT) == []


def test_scanner_finds_every_configured_format_without_printing_values(tmp_path):
    fakes = {"aws_access_key": "AKIA" + "A" * 16, "github_token": "ghp_" + "a" * 36, "huggingface_token": "hf_" + "b" * 34,
             "openai_style_key": "sk-" + "c" * 24, "slack_token": "xoxb-" + "1" * 12,
             "private_key_block": "-----BEGIN " + "RSA PRIVATE KEY", "jwt": "eyJ" + "a" * 20 + "." + "b" * 20 + "."}
    for k, (name, value) in enumerate(fakes.items()):
        (tmp_path / f"f{k}.txt").write_text(f"x = {value}\n", encoding="utf-8")
    found = {name for _, _, name in _scan(tmp_path)}
    assert set(fakes) <= found
    assert all(isinstance(item[0], str) and isinstance(item[1], int) for item in _scan(tmp_path))  # path, line, name only


def test_scanner_skips_ignored_folders_and_binary_files(tmp_path):
    fake = "ghp_" + "a" * 36
    (tmp_path / ".venv").mkdir()
    (tmp_path / ".venv" / "lib.py").write_text(fake, encoding="utf-8")
    (tmp_path / "blob.bin").write_bytes(b"\0\0" + fake.encode())
    (tmp_path / "ok.txt").write_text("nothing to see\n", encoding="utf-8")
    assert _scan(tmp_path) == []
    (tmp_path / "leak.txt").write_text(f"line one\ntoken={fake}\n", encoding="utf-8")
    assert _scan(tmp_path) == [("leak.txt", 2, "github_token")]
