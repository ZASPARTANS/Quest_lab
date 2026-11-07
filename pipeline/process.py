"""Turn the downloaded GRIB files into millimetres per 6-hour interval, and a model-agreement field.

Pure calculation; writing the files and the command line are in pipeline/store.py. Every setting comes from
config/pipeline.toml. Steps of one model:
  1. read the accumulated precipitation `tp` (since forecast start) of the 6-hourly steps, in millimetres,
     converting each message by its OWN `units` key (IFS: m, AIFS: kg m**-2; docs/ERRORS.md E006),
  2. subtract consecutive steps to get mm per interval (small negative differences are set to 0 and counted),
  3. quantise to whole multiples of `quantise_mm` in uint16.
The agreement field compares two models per interval and grid cell: both dry, both wet, or disagree.

shortcut: IFS has 3-hourly steps to 144 h, but only its 6-hourly steps are used, so the common axis is 6 h
and the 3 h detail is dropped (decision D14). shortcut: negative differences from packing rounding are set to
0, not redistributed to the neighbouring interval (their total is 0.06 % of the precipitation, docs/DOMAIN.md).
"""
import datetime as dt
import math

import eccodes
import numpy as np

from pipeline import grid as grid_mod

AGREE_BOTH_DRY, AGREE_BOTH_WET, AGREE_DISAGREE = 0, 1, 2
UINT16_MAX = 65535


def unit_factor(units, table):
    """Factor that turns a value in `units` into millimetres; an unknown unit stops the run."""
    if units not in table:
        raise ValueError(f"unknown precipitation unit {units!r}: not in [units_to_mm]; check what it means before adding it")
    return table[units]


def interval_steps(model_steps, interval):
    """Steps of one model on the common axis (multiples of `interval` hours), which must have no gap."""
    steps = [s for s in model_steps if s % interval == 0]
    if steps != [interval * (k + 1) for k in range(len(steps))]:
        raise ValueError(f"steps {steps} are not {interval}, {2 * interval}, ... without gaps")
    return steps


def valid_times(run, steps):
    """Valid time (UTC) of the END of each interval: run time plus the step."""
    return [run + dt.timedelta(hours=s) for s in steps]


def _message_mm(handle, run, cfg):
    """One GRIB message -> float32 array (rows, columns) of accumulated precipitation in mm."""
    grid = cfg["grid"]
    wrong = {k: v for k, v in (("shortName", "tp"), ("stepType", "accum"), ("startStep", 0))
             if eccodes.codes_get(handle, k) != v}
    started = dt.datetime.strptime(str(eccodes.codes_get(handle, "dataDate")), "%Y%m%d") \
        + dt.timedelta(hours=eccodes.codes_get(handle, "dataTime") // 100)  # dataTime is HHMM
    if wrong or started != run:
        raise ValueError(f"message is not tp accumulated from the start of run {run}: {wrong}, run time {started}")
    grid_mod.check_geometry(handle, grid)
    factor = unit_factor(eccodes.codes_get(handle, "units"), cfg["units_to_mm"])
    values = eccodes.codes_get_values(handle) * factor
    return values.reshape(grid["nj"], grid["ni"]).astype(np.float32)


def read_cumulative_mm(path, steps, run, cfg):
    """{end step: accumulated precipitation in mm} for the wanted steps of one GRIB file."""
    wanted, found = set(steps), {}
    with open(path, "rb") as f:
        while (handle := eccodes.codes_grib_new_from_file(f)) is not None:
            try:
                step = eccodes.codes_get(handle, "endStep")
                if step in wanted:
                    if step in found:
                        raise ValueError(f"{path}: step {step} appears twice")
                    found[step] = _message_mm(handle, run, cfg)
            finally:
                eccodes.codes_release(handle)
    if wanted - found.keys():
        raise ValueError(f"{path}: steps missing: {sorted(wanted - found.keys())}")
    return found


def deaccumulate(cumulative, steps):
    """Accumulated mm at each step -> (mm per interval, number of negative cells set to 0, most negative value).

    The first interval is the first step itself (accumulation starts at 0 at run time). A tiny negative
    difference can come from rounding when the fields were packed; it is set to 0 and counted, never hidden.
    """
    out = np.empty((len(steps),) + cumulative[steps[0]].shape, dtype=np.float32)
    previous, negative, worst = 0, 0, 0.0
    for k, step in enumerate(steps):
        diff = cumulative[step] - previous
        low = diff < 0
        if low.any():
            negative += int(low.sum())
            worst = min(worst, float(diff.min()))
            diff[low] = 0
        out[k] = diff
        previous = cumulative[step]
    return out, negative, worst


def quantise(mm, quantum):
    """mm -> (uint16 multiples of `quantum`, number of values that hit the uint16 maximum)."""
    scaled = np.rint(mm / quantum)
    return np.clip(scaled, 0, UINT16_MAX).astype(np.uint16), int((scaled > UINT16_MAX).sum())


def dequantise(stored, quantum):
    """uint16 multiples of `quantum` -> float32 mm."""
    return stored.astype(np.float32) * np.float32(quantum)


def wet_limit(threshold_mm, quantum):
    """Smallest stored value (a whole number of `quantum`) that counts as wet: stored * quantum >= threshold_mm.

    The browser applies the same rule to the stored values (frontend/src/plan.js), so the map and the plan never disagree
    at the edge (decision D28). The tiny allowance stops float noise (0.5 / 0.1) from rounding the wrong way.
    """
    return math.ceil(threshold_mm / quantum - 1e-9)


def agreement(mm_a, mm_b, wet_threshold):
    """uint8 field: AGREE_BOTH_WET, AGREE_BOTH_DRY or AGREE_DISAGREE. Wet means value >= the threshold (same unit for all three)."""
    wet_a, wet_b = mm_a >= wet_threshold, mm_b >= wet_threshold
    out = np.full(mm_a.shape, AGREE_DISAGREE, dtype=np.uint8)
    out[wet_a & wet_b] = AGREE_BOTH_WET
    out[~wet_a & ~wet_b] = AGREE_BOTH_DRY
    return out
