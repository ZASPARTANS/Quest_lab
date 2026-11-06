"""Guard for the rule "no hardcoded paths" (decision D17, error E016): pipeline/ and scripts/ must not contain the folder and file
names that belong in config/pipeline.toml, nor any absolute path of this or another machine."""
import re
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = tomllib.loads((ROOT / "config" / "pipeline.toml").read_text(encoding="utf-8"))
SECURITY = tomllib.loads((ROOT / "config" / "security.toml").read_text(encoding="utf-8"))
BACKEND = tomllib.loads((ROOT / "config" / "backend.toml").read_text(encoding="utf-8"))
SOURCES = sorted(sum((list((ROOT / d).glob("*.py")) for d in ("pipeline", "backend", "scripts")), []))
ABSOLUTE = re.compile(r"""["'](?:[A-Za-z]:[\/]|/(?:home|Users|work|tmp|usr|etc|var|mnt)/)""")


def test_pipeline_code_has_no_config_names_as_string_literals():
    names = [v for v in CONFIG["paths"].values() if isinstance(v, str)]
    names += [v for v in SECURITY["hashes"].values() if isinstance(v, str)]
    names += [BACKEND["tiles"]["file"], BACKEND["frames"]["file"], BACKEND["manifest"]["file"], BACKEND["source"]["data_url"], BACKEND["source"]["terms_url"]]
    assert len(names) >= 15  # the folder names, the formats, the file names and the hash settings
    for source in SOURCES:
        text = source.read_text(encoding="utf-8")
        for name in names:
            assert f'"{name}"' not in text and f"'{name}'" not in text, f"{source.name} hardcodes {name!r}; use config [paths]"


def test_pipeline_code_has_no_absolute_paths():
    for source in SOURCES:
        assert not ABSOLUTE.search(source.read_text(encoding="utf-8")), f"{source.name} contains an absolute path"
