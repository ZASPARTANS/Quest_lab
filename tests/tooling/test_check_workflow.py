"""Tests for scripts/check_workflow.py and the real workflow file (plan PLAN-013 step 13.3, finding S09): the rules must hold for .github/workflows/build.yml
and each rule must really catch what it is meant to catch (a check that has only ever passed is no proof)."""
import tomllib
from pathlib import Path

import pytest

from scripts import check_workflow

ROOT = Path(__file__).resolve().parents[2]
REAL = (ROOT / ".github" / "workflows" / "build.yml").read_text(encoding="utf-8")


def test_the_real_workflow_keeps_every_rule():
    assert check_workflow.problems(REAL) == []


def test_the_real_workflow_does_what_the_plan_says():
    """The deployed content, the schedule and the pins are the ones decided (D42): 4 runs a day, GitHub-owned pinned actions, the release file and the smoke test."""
    assert 'cron: "20 2,8,14,20 * * *"' in REAL
    assert "pipeline.basemap fetch-release" in REAL and "scripts.assemble_site" in REAL and "scripts/smoke_site.py" in REAL
    assert REAL.count("uses: actions/") == 7  # checkout x2, configure-pages, upload-pages-artifact, deploy-pages, and cache restore and save (PLAN-015)
    assert "environment:\n      name: github-pages" in REAL


@pytest.mark.parametrize("change, expected", [
    (lambda t: t.replace("actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1", "actions/checkout@v7", 1), "not a GitHub-owned action pinned"),
    (lambda t: t.replace("actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1", "somebody/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1", 1), "not a GitHub-owned action pinned"),
    (lambda t: t.replace("actions/cache/restore@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0", "actions/cache/restore@v6", 1), "not a GitHub-owned action pinned"),
    (lambda t: t.replace("actions/cache/restore@55cc8345863c7cc4c66a329aec7e433d2d1c52a9", "somebody/cache/restore@55cc8345863c7cc4c66a329aec7e433d2d1c52a9", 1), "not a GitHub-owned action pinned"),
    (lambda t: t.replace("actions/cache/save@55cc8345863c7cc4c66a329aec7e433d2d1c52a9", "actions/cache/../../somebody/x@55cc8345863c7cc4c66a329aec7e433d2d1c52a9", 1), "not a GitHub-owned action pinned"),
    (lambda t: t.replace("permissions:\n  contents: read\n\nconcurrency", "permissions: write-all\n\nconcurrency", 1), "write-all"),
    (lambda t: t.replace("    permissions:\n      contents: read\n      pages: read", "    permissions:\n      contents: read\n      pages: write", 1), "only the deploy job may"),
    (lambda t: t.replace("on:\n", "on:\n  pull_request_target:\n", 1), "pull_request"),
    (lambda t: t.replace('run: python3 scripts/smoke_site.py "$SITE_URL" --retries 8 --wait 20', 'run: python3 scripts/smoke_site.py "${{ needs.deploy.outputs.page_url }}"', 1), "inside shell code"),
    (lambda t: t.replace("          mkdir -p data/pages/dist\n", "          mkdir -p data/pages/dist\n          printenv\n", 1), "prints the environment"),
    (lambda t: t.replace("          mkdir -p data/pages/dist\n", "          mkdir -p data/pages/dist\n          set -x\n", 1), "shell tracing"),
    (lambda t: t.replace("        with:\n          persist-credentials: false\n", "        with:\n          token: ${{ secrets.MY_TOKEN }}\n", 1), "secrets"),
    (lambda t: t.replace("    timeout-minutes: 60\n", "", 1), "no timeout-minutes"),
    (lambda t: t.replace("concurrency:\n  group: pages\n  cancel-in-progress: false\n", "", 1), "no concurrency"),
    (lambda t: t.replace('  schedule:\n    # ECMWF', '  workflow_run:\n    # ECMWF', 1).replace('    - cron: "20 2,8,14,20 * * *"\n', "", 1), "no schedule"),
])
def test_each_rule_catches_its_own_breakage(change, expected):
    broken = change(REAL)
    assert broken != REAL, "the test change did not change the file"
    assert any(expected in p for p in check_workflow.problems(broken)), check_workflow.problems(broken)


def _steps(text):
    """The workflow's steps in the build job, in order, as {name, text}: a step starts at a line `      - name:` or `      - uses:`."""
    build = text.split("  build:", 1)[1].split("  deploy:", 1)[0]
    parts = build.split("\n      - ")[1:]
    return [{"name": part.split("\n", 1)[0], "text": part} for part in parts]


def test_the_cache_holds_exactly_the_base_map_file_and_is_checked_after_it_comes_back():
    """PLAN-015: the cache path is the file the pipeline writes (from config/pipeline.toml, D17), the key follows config/basemap.toml (where the release size and sha256 are),
    the save step runs only after a miss, and the cache is restored BEFORE the checked download and saved AFTER it (so a later failure cannot lose the file)."""
    paths = tomllib.loads((ROOT / "config" / "pipeline.toml").read_text(encoding="utf-8"))["paths"]
    expected = f"{paths['basemap_dir']}/{paths['basemap_file']}"
    steps = _steps(REAL)
    texts = [step["text"] for step in steps]
    restore = next(i for i, t in enumerate(texts) if "actions/cache/restore@" in t)
    fetch = next(i for i, t in enumerate(texts) if "pipeline.basemap fetch-release" in t)
    save = next(i for i, t in enumerate(texts) if "actions/cache/save@" in t)
    assert restore < fetch < save
    for i in (restore, save):
        assert f"path: {expected}" in texts[i]
    assert "hashFiles('config/basemap.toml')" in texts[restore]
    assert "id: basemap_cache" in texts[restore]
    assert "if: steps.basemap_cache.outputs.cache-hit != 'true'" in texts[save]
    assert "key: ${{ steps.basemap_cache.outputs.cache-primary-key }}" in texts[save]


def test_the_build_installs_the_fonts_and_sprites_from_the_repository_and_downloads_nothing_else_for_the_map():
    assert "pipeline.basemap install-assets" in REAL
    assert all("fetch-assets" not in line for line in REAL.splitlines() if not line.lstrip().startswith("#")), "a build must not download the fonts and sprites any more"
    install = next(step for step in _steps(REAL) if "install-assets" in step["text"])
    assert "run --rm export " in install["text"], "it runs in the service that has no network"
