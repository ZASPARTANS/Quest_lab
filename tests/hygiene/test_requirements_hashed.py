"""Guard for finding S02: every pinned package in requirements.txt carries sha256 hashes, so
`pip install --require-hashes` can refuse a file that PyPI did not publish for that exact version."""
import re
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NAME = tomllib.loads((ROOT / "config" / "security.toml").read_text(encoding="utf-8"))["hashes"]["requirements_file"]
BACKSLASH_NEWLINE = chr(92) + chr(10)  # a line continued with a backslash


def test_every_requirement_has_at_least_one_hash():
    text = (ROOT / NAME).read_text(encoding="utf-8").replace("\r\n", "\n").replace(BACKSLASH_NEWLINE, " ")
    entries = [line for line in text.splitlines() if line.strip() and not line.startswith("#")]
    assert len(entries) >= 23  # 23 packages on Windows, 25 with the two Linux-only ones
    for entry in entries:
        assert "==" in entry, f"unexpected line (only pinned packages are allowed): {entry[:60]}"
        assert re.search(r"--hash=sha256:[0-9a-f]{64}", entry), f"no hash for: {entry.split()[0]}"
