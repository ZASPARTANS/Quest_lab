"""Tests for scripts/pin_hashes.py with a fake PyPI lookup (no network): the text transformation must keep comments,
markers and blank lines, add one continued block per package, and give the same result when run twice."""
import pytest

from scripts import pin_hashes

H = {"a": ["a" * 64, "b" * 64], "b": ["c" * 64], "c": ["d" * 64]}


def fake(name, version):
    return H[name]


SOURCE = """# header comment
# second header line

# --- Direct ---
a==1.0  # what a is for
b==2.0; sys_platform == "linux"  # only on Linux

# --- Transitive ---
c==3.0
"""


def test_every_package_gets_its_hashes_and_other_lines_are_kept():
    out = pin_hashes.add_hashes(SOURCE, fake).splitlines()
    assert out[:4] == ["# header comment", "# second header line", "", "# --- Direct ---"]
    assert out[4:8] == ["# what a is for", "a==1.0 \\", f"    --hash=sha256:{'a' * 64} \\", f"    --hash=sha256:{'b' * 64}"]
    assert out[8:11] == ["# only on Linux", 'b==2.0 ; sys_platform == "linux" \\', f"    --hash=sha256:{'c' * 64}"]
    assert out[11:] == ["", "# --- Transitive ---", "c==3.0 \\", f"    --hash=sha256:{'d' * 64}"]


def test_running_twice_gives_the_same_text_and_new_hashes_replace_old_ones():
    once = pin_hashes.add_hashes(SOURCE, fake)
    assert pin_hashes.add_hashes(once, fake) == once
    changed = pin_hashes.add_hashes(once, lambda n, v: ["e" * 64])
    assert "a" * 64 not in changed and changed.count(f"--hash=sha256:{'e' * 64}") == 3


def test_a_version_without_files_stops_the_run():
    def nothing(name, version):
        raise ValueError(f"{name}=={version}: PyPI lists no files")

    with pytest.raises(ValueError, match="no files"):
        pin_hashes.add_hashes("a==1.0\n", nothing)


def test_hashes_come_from_the_configured_url_and_are_sorted_and_unique(monkeypatch):
    import io
    import json

    seen = []

    def fake_urlopen(url, timeout):
        seen.append((url, timeout))
        files = [{"digests": {"sha256": "f" * 64}}, {"digests": {"sha256": "1" * 64}}, {"digests": {"sha256": "f" * 64}}]
        return io.StringIO(json.dumps({"urls": files}))

    monkeypatch.setattr(pin_hashes.urllib.request, "urlopen", fake_urlopen)
    assert pin_hashes.fetch_hashes("pkg", "1.2") == ["1" * 64, "f" * 64]
    assert seen == [(pin_hashes.CONFIG["pypi_json_url"].format(name="pkg", version="1.2"), pin_hashes.CONFIG["timeout_seconds"])]
