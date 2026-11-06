"""Tests for the pure logic in pipeline/fetch.py. All values below are made-up TEST FIXTURES, not forecast data."""
import datetime as dt

import pytest

from pipeline import fetch


def test_expand_steps_includes_stop_and_joins_ranges():
    ranges = [{"start": 3, "stop": 9, "every": 3}, {"start": 12, "stop": 24, "every": 6}]
    assert fetch.expand_steps(ranges) == [3, 6, 9, 12, 18, 24]


def test_expand_steps_removes_duplicates_and_sorts():
    ranges = [{"start": 6, "stop": 12, "every": 6}, {"start": 3, "stop": 6, "every": 3}]
    assert fetch.expand_steps(ranges) == [3, 6, 12]


@pytest.mark.parametrize("bad", [{"start": 6, "stop": 3, "every": 3}, {"start": 3, "stop": 9, "every": 0}])
def test_expand_steps_rejects_bad_ranges(bad):
    with pytest.raises(ValueError):
        fetch.expand_steps([bad])


def test_real_config_step_counts():
    """The shipped config must give the step lists documented in docs/DOMAIN.md (checked there on 2026-11-06)."""
    cfg = fetch.load_config()
    assert len(fetch.expand_steps(cfg["models"]["ifs"]["step_ranges"])) == 48 + 16  # 3h to 144h, then 6h to 240h
    assert len(fetch.expand_steps(cfg["models"]["aifs-single"]["step_ranges"])) == 60  # 6h to 360h


def test_latest_common_run_uses_oldest_model_per_hour_then_newest_hour():
    d = dt.datetime
    by_hour = {
        0: [d(2026, 11, 6, 0), d(2026, 11, 6, 0)],    # both models have today's 00z
        12: [d(2026, 11, 6, 12), d(2026, 11, 5, 12)],  # one model is still on yesterday's 12z
    }
    assert fetch.latest_common_run(by_hour) == d(2026, 11, 6, 0)


def test_latest_common_run_picks_12z_when_both_models_have_it():
    d = dt.datetime
    by_hour = {0: [d(2026, 11, 6, 0)] * 2, 12: [d(2026, 11, 6, 12)] * 2}
    assert fetch.latest_common_run(by_hour) == d(2026, 11, 6, 12)


def test_latest_common_run_ignores_hours_without_any_run_and_fails_if_none():
    d = dt.datetime
    assert fetch.latest_common_run({0: [d(2026, 11, 6, 0)], 12: []}) == d(2026, 11, 6, 0)
    with pytest.raises(ValueError):
        fetch.latest_common_run({0: [], 12: []})


def test_check_steps_reports_missing_and_extra():
    msgs = [{"endStep": 6}, {"endStep": 12}, {"endStep": 18}]
    assert fetch.check_steps(msgs, [6, 12, 24]) == ([24], [18])
    assert fetch.check_steps(msgs, [6, 12, 18]) == ([], [])
