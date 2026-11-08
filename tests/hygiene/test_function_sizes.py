"""The code size rule of the project (CLAUDE.md, "Code size"; PLAN-016, decision D47): a Python function is at most 50 lines, a source file at most 300.
The JavaScript counterpart is tests/frontend/function_sizes.test.mjs. Functions are measured with the ast module (first to last line, comments inside included)."""
import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAX_FUNCTION_LINES = 50
MAX_FILE_LINES = 300
SKIP = {".git", ".venv", "node_modules", "data", "__pycache__", ".pytest_cache", "dist", "basemap_assets"}


def python_files():
    return sorted(p for p in ROOT.rglob("*.py") if not SKIP & set(p.relative_to(ROOT).parts))


def long_functions(source, limit=MAX_FUNCTION_LINES):
    """[(line, name, lines)] of every function or method in `source` longer than `limit` lines."""
    found = []
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            lines = node.end_lineno - node.lineno + 1
            if lines > limit:
                found.append((node.lineno, node.name, lines))
    return found


def test_the_measuring_finds_a_function_of_51_lines_but_not_one_of_50():
    body = lambda n: "".join(f"    v{i} = {i}\n" for i in range(n - 1))  # noqa: E731 - n lines in all with the def line
    assert long_functions("def big():\n" + body(51))[0][1:] == ("big", 51)
    assert long_functions("def ok():\n" + body(50)) == []
    assert long_functions("class C:\n    def m(self):\n" + "".join(f"        v{i} = {i}\n" for i in range(60)))[0][1] == "m"


def test_no_python_function_is_longer_than_50_lines():
    files = python_files()
    assert len(files) >= 30, f"only {len(files)} Python files were found"
    problems = [f"{p.relative_to(ROOT)}:{line} {name} {n} lines" for p in files for line, name, n in long_functions(p.read_text(encoding="utf-8"))]
    assert problems == [], "functions over 50 lines:\n  " + "\n  ".join(problems)


def test_no_python_file_is_longer_than_300_lines():
    problems = [f"{p.relative_to(ROOT)} {n} lines" for p in python_files() if (n := len(p.read_text(encoding="utf-8").splitlines())) > MAX_FILE_LINES]
    assert problems == [], "files over 300 lines:\n  " + "\n  ".join(problems)
