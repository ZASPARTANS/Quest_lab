"""Rules for the GitHub Actions workflow file (plan PLAN-013 step 13.3, finding S09): a text check, no extra library.
    python scripts/check_workflow.py .github/workflows/build.yml
The rules are the project's safety rules for a public, unattended, scheduled job:
  1. every `uses:` is a GitHub-owned action (`actions/...`) pinned to a full 40-character commit, not to a tag or branch;
  2. the workflow-level `permissions:` gives only `contents: read`; `pages: write` and `id-token: write` appear only in the job called `deploy`;
  3. no `pull_request` or `pull_request_target` trigger (nobody else's code runs with our token), and no `secrets.` anywhere (the job needs none);
  4. nothing prints the environment (`printenv`, `env`, `set -x`, step debug, `toJSON(`);
  5. no `${{ ... }}` inside a shell `run:` block (a value goes in through `env:` and is used as "$NAME"): no script injection;
  6. every job has a `timeout-minutes`, and there is a `concurrency:` block and at least one `schedule` with a `cron:`.
Exit code 0 only if every rule holds.
"""
import re
import sys
from pathlib import Path

USES = re.compile(r"^\s*-?\s*uses:\s*(\S+)")
PINNED = re.compile(r"^actions/[A-Za-z0-9_.-]+@[0-9a-f]{40}$")
FORBIDDEN_LINE = [(re.compile(r"\bprintenv\b"), "prints the environment (printenv)"), (re.compile(r"(^|\s|;|\|)env(\s*$|\s*\|)"), "prints the environment (env)"),
                  (re.compile(r"\bset\s+-[a-z]*x"), "shell tracing (set -x) can print secrets"), (re.compile(r"ACTIONS_(STEP|RUNNER)_DEBUG"), "step debug logging"),
                  (re.compile(r"toJSON\("), "toJSON() can dump whole contexts")]


def _jobs(lines):
    """{job name: its lines} for the jobs under the top-level `jobs:` key (jobs are indented by two spaces)."""
    jobs, name, inside = {}, None, False
    for line in lines:
        if re.match(r"^jobs:\s*$", line):
            inside = True
            continue
        if inside and re.match(r"^\S", line):
            inside = False
        if inside:
            match = re.match(r"^  ([A-Za-z0-9_-]+):\s*$", line)
            if match:
                name = match.group(1)
                jobs[name] = []
            elif name:
                jobs[name].append(line)
    return jobs


def _run_blocks(lines):
    """The lines that are shell code: single-line `run: ...` values and the indented blocks after `run: |`."""
    code, block_indent = [], None
    for line in lines:
        stripped = line.strip()
        indent = len(line) - len(line.lstrip())
        if block_indent is not None:
            if stripped and indent <= block_indent:
                block_indent = None
            else:
                code.append(line)
                continue
        match = re.match(r"^(\s*)(?:-\s*)?run:\s*(.*)$", line)
        if match:
            rest = match.group(2).strip()
            if rest in ("|", ">", "|-", ">-"):
                block_indent = len(match.group(1)) + (2 if "- run:" in line else 0)
            else:
                code.append(rest)
    return code


def problems(text):
    lines = [l.rstrip("\n") for l in text.split("\n")]
    live = [l for l in lines if not l.lstrip().startswith("#")]
    found = []
    for line in live:
        match = USES.match(line)
        if match and not PINNED.match(match.group(1)):
            found.append(f"action {match.group(1)!r} is not a GitHub-owned action pinned to a 40-character commit")
    top = re.search(r"^permissions:\s*\n((?:[ ]{2}.*\n?)+)", text, re.MULTILINE)
    if not top:
        found.append("no workflow-level permissions block")
    elif [l.strip() for l in top.group(1).split("\n") if l.strip()] != ["contents: read"]:
        found.append("the workflow-level permissions must be exactly `contents: read`")
    for name, body in _jobs(live).items():
        wide = [l.strip() for l in body if re.match(r"^\s+(pages|id-token|contents|actions|packages|statuses|checks|deployments|issues|pull-requests):\s*write\s*$", l)]
        if wide and name != "deploy":
            found.append(f"job {name!r} has write permissions {wide}; only the deploy job may (pages and id-token)")
        if not any(re.match(r"^\s+timeout-minutes:\s*\d+\s*$", l) for l in body):
            found.append(f"job {name!r} has no timeout-minutes")
    if re.search(r"^\s*(pull_request|pull_request_target)\s*:", "\n".join(live), re.MULTILINE):
        found.append("a pull_request trigger would run other people's changes with our token")
    if any("secrets." in l for l in live):
        found.append("the workflow uses secrets; it needs none")
    if "write-all" in text:
        found.append("write-all permissions")
    for line in live:
        for pattern, why in FORBIDDEN_LINE:
            if pattern.search(line):
                found.append(f"{why}: {line.strip()!r}")
    for code in _run_blocks(live):
        if "${{" in code:
            found.append(f"a ${{{{ }}}} value inside shell code (use env: and \"$NAME\"): {code.strip()!r}")
    if not re.search(r"^concurrency:", text, re.MULTILINE):
        found.append("no concurrency block (two builds could overlap)")
    if not re.search(r"^\s*-\s*cron:\s*\"[^\"]+\"", text, re.MULTILINE):
        found.append("no schedule with a cron entry")
    return found


def main(argv):
    path = Path(argv[0]) if argv else Path(".github/workflows/build.yml")
    found = problems(path.read_text(encoding="utf-8"))
    for item in found:
        print("PROBLEM", item)
    print(f"{path}: {'rules broken: ' + str(len(found)) if found else 'all workflow rules hold'}")
    return 1 if found else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
