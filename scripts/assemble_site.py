"""Assemble the public site folder (plan PLAN-013 step 13.2): data/pages/_site = the page build + the forecast data + the stored base map, with the
security policy as <meta> tags. Run it after `frontend-build` (with the base path) and `export`:
    FRONTEND_DIST_DIR=../data/pages/dist docker compose -f docker/compose.yaml run --rm frontend-build /node_modules/.bin/vite build --base=/Quest_lab/
    docker compose -f docker/compose.yaml run --rm export python -m scripts.assemble_site
Writes only below data/pages (git-ignored). The settings are in config/pipeline.toml [pages].
"""
import json
import sys
import tomllib

from backend import pages
from pipeline.fetch import load_config
from pipeline.paths import ROOT


def main(argv):
    cfg = load_config()
    backend = tomllib.loads((ROOT / cfg["paths"]["backend_config_file"]).read_text(encoding="utf-8"))
    frontend = json.loads((ROOT / cfg["paths"]["frontend_config_file"]).read_text(encoding="utf-8"))
    headers = (ROOT / cfg["pages"]["headers_file"]).read_text(encoding="utf-8")
    result = pages.assemble(cfg, backend, frontend, headers)
    print(f"site folder {result['out'].relative_to(ROOT)}: {result['files']} files, {result['bytes'] / 1e6:.1f} MB "
          f"(host limit {cfg['pages']['max_site_bytes'] / 1e6:.0f} MB)")
    print("not carried by a <meta> policy (the host sends no headers): " + ", ".join(result["dropped"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
