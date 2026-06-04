"""Pure-logic tests for the scheduler — no network, no database."""

from biraye import scheduler
from biraye.scheduler import CardState


def test_first_good_sets_one_day():
    state = scheduler.review(CardState(), "good")
    assert state.interval_days == 1.0
    assert state.reps == 1
    assert state.lapses == 0


def test_again_resets_and_counts_lapse():
    matured = CardState(ease=2.5, interval_days=10, reps=4)
    state = scheduler.review(matured, "again")
    assert state.interval_days == 0.0
    assert state.lapses == 1
    assert state.ease < 2.5  # ease penalised


def test_good_progression_grows_interval():
    state = CardState()
    intervals = []
    for _ in range(4):
        state = scheduler.review(state, "good")
        intervals.append(state.interval_days)
    assert intervals == sorted(intervals)  # monotonically increasing
    assert intervals[0] == 1.0


def test_stage_thresholds():
    assert scheduler.stage_for(0) == "sabaq"
    assert scheduler.stage_for(5) == "sabqi"
    assert scheduler.stage_for(30) == "manzil"


def test_scaffold_ladder():
    assert scheduler.scaffold_for(0) == "full"
    assert scheduler.scaffold_for(1) == "text"
    assert scheduler.scaffold_for(3) == "first_word"
    assert scheduler.scaffold_for(21) == "hidden"


def test_invalid_rating_raises():
    import pytest

    with pytest.raises(ValueError):
        scheduler.review(CardState(), "nope")
