"""Pure scheduling logic for BirAye — no database, no IO.

A simplified, well-understood SM-2 variant tuned for verbatim Hifz review.
Ratings map the four-button recall self-assessment used at review time:

    again  — could not recall / stumbled        -> reset, count a lapse
    hard   — recalled with difficulty
    good   — recalled correctly
    easy   — recalled effortlessly

Each review returns the new scheduling state. The traditional three-tier
labels (sabaq / sabqi / manzil) are derived from interval maturity so the
UI can present the classic Hifz queues:

    sabaq  — new / just-lapsed material (interval < 1 day)
    sabqi  — recent material consolidating (1 .. <21 days)
    manzil — matured long-term material (>= 21 days)
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

RATINGS = ("again", "hard", "good", "easy")

EASE_MIN = 1.3
EASE_DEFAULT = 2.5
SABQI_MIN_DAYS = 1
MANZIL_MIN_DAYS = 21


@dataclass
class CardState:
    ease: float = EASE_DEFAULT
    interval_days: float = 0.0
    reps: int = 0
    lapses: int = 0


def stage_for(interval_days: float) -> str:
    if interval_days < SABQI_MIN_DAYS:
        return "sabaq"
    if interval_days < MANZIL_MIN_DAYS:
        return "sabqi"
    return "manzil"


# Scaffold-withdrawal ladder (M3): the stronger the memory, the less support
# shown at review. Driven by interval maturity so a lapse (interval -> 0)
# automatically restores full scaffolding.
SCAFFOLD_LEVELS = ("full", "text", "first_word", "hidden")
FIRST_WORD_MIN_DAYS = 3


def scaffold_for(interval_days: float) -> str:
    if interval_days < SABQI_MIN_DAYS:        # new or just lapsed
        return "full"                          # text + audio
    if interval_days < FIRST_WORD_MIN_DAYS:
        return "text"                          # text only, audio withdrawn
    if interval_days < MANZIL_MIN_DAYS:
        return "first_word"                    # first word visible, rest masked
    return "hidden"                            # recite blind, reveal to self-check


def review(state: CardState, rating: str) -> CardState:
    """Apply a rating and return the new card state."""
    if rating not in RATINGS:
        raise ValueError(f"invalid rating: {rating!r}")

    ease = state.ease
    interval = state.interval_days
    reps = state.reps
    lapses = state.lapses

    if rating == "again":
        ease = max(EASE_MIN, ease - 0.20)
        interval = 0.0
        lapses += 1
        # reps not advanced: the card returns to learning (sabaq)
        return CardState(ease=ease, interval_days=interval, reps=reps, lapses=lapses)

    if rating == "hard":
        ease = max(EASE_MIN, ease - 0.15)
        interval = max(1.0, interval * 1.2) if reps else 1.0
    elif rating == "good":
        if reps == 0:
            interval = 1.0
        elif reps == 1:
            interval = 3.0
        else:
            interval = round(interval * ease, 1)
    else:  # easy
        ease = ease + 0.15
        if reps == 0:
            interval = 2.0
        else:
            interval = round(interval * ease * 1.3, 1)

    reps += 1
    return CardState(ease=ease, interval_days=interval, reps=reps, lapses=lapses)


def due_date(from_day: date, interval_days: float) -> date:
    """Next due date. interval 0 (just lapsed/new) is due same day."""
    return from_day + timedelta(days=int(round(interval_days)))
