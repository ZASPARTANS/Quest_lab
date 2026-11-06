"""Where data lives: every folder and file name comes from the [paths] table of config/pipeline.toml.

The only place derived from code is ROOT, the project folder, found from the location of this file (no absolute
path is written anywhere). It is also where the config folder is looked for, see CONFIG_PATH in pipeline/fetch.py.
"""
import datetime as dt
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run_folder(cfg, kind, run):
    """Folder of one run under the raw or processed data folder (kind is "raw" or "processed")."""
    p = cfg["paths"]
    return ROOT / p[f"{kind}_dir"] / run.strftime(p["run_folder_format"])


def raw_file(cfg, run, model):
    """Downloaded GRIB file of one model and run."""
    return run_folder(cfg, "raw", run) / model / cfg["paths"]["raw_file"]


def partial(cfg, path):
    """Name under which a file or folder is built before it is complete and renamed to `path`."""
    return path.with_name(path.name + cfg["paths"]["partial_suffix"])


def parse_run(cfg, text):
    """Folder name or command-line text -> run time (UTC datetime); ValueError if it does not fit the format."""
    return dt.datetime.strptime(text, cfg["paths"]["run_folder_format"])


def remove_folder(path):
    """Delete an old output folder if it exists. A failure (e.g. files owned by another user) must stop the run with its real
    error: ignoring it ended in a misleading "Directory not empty" later (docs/ERRORS.md E015)."""
    if path.exists():
        shutil.rmtree(path)
