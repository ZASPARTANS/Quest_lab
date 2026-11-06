"""Guard for the rule "no hardcoded paths" (decision D17, error E016): the code must not contain the folder and file
names that belong in config/pipeline.toml, nor any absolute path of this or another machine."""
import re
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = tomllib.loads((ROOT / "config" / "pipeline.toml").read_text(encoding="utf-8"))
SOURCES = sorted((ROOT / "pipeline").glob("*.py"))
ABSOLUTE = re.compile(r"""["'](?:[A-Za-z]:[\/]|/(?:home|Users|work|tmp|usr|etc|var|mnt)/)""")


def test_pipeline_code_has_no_config_names_as_string_literals():
    names = [v for k, v in CONFIG["paths"].items() if isinstance(v, str)]
    assert len(names) >= 8  # the folder names, the formats and the file names
    for source in SOURCES:
        text = source.read_text(encoding="utf-8")
        for name in names:
            assert f'"{name}"' not in text and f"'{name}'" not in text, f"{source.name} hardcodes {name!r}; use config [paths]"


def test_pipeline_code_has_no_absolute_paths():
    for source in SOURCES:
        assert not ABSOLUTE.search(source.read_text(encoding="utf-8")), f"{source.name} contains an absolute path"
