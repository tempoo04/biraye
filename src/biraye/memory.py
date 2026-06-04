"""Memorization operations — ties the scheduler to the database.

Public functions used by the API layer:
    add_item(surah, ayah)            start tracking an ayah (enters sabaq)
    review_item(surah, ayah, rating) apply a recall rating, reschedule
    get_queue(as_of)                 ayahs due on/before a date, by tier
    get_progress()                   counts per tier + totals
"""

from __future__ import annotations

from datetime import date

from . import db, scheduler
from .scheduler import CardState


def _row_to_state(row) -> CardState:
    return CardState(
        ease=row["ease"],
        interval_days=row["interval_days"],
        reps=row["reps"],
        lapses=row["lapses"],
    )


def _row_to_dict(row) -> dict:
    return {
        "surah": row["surah"],
        "ayah": row["ayah"],
        "stage": row["stage"],
        "ease": round(row["ease"], 2),
        "interval_days": row["interval_days"],
        "reps": row["reps"],
        "lapses": row["lapses"],
        "last_review": row["last_review"],
        "due": row["due"],
    }


def add_item(surah: int, ayah: int, today: date | None = None) -> dict:
    """Begin tracking an ayah. No-op if already tracked."""
    today = today or date.today()
    with db.get_connection() as conn:
        existing = conn.execute(
            "SELECT * FROM items WHERE surah=? AND ayah=?", (surah, ayah)
        ).fetchone()
        if existing:
            return _row_to_dict(existing)
        conn.execute(
            """INSERT INTO items (surah, ayah, stage, ease, interval_days,
                                  reps, lapses, due, created)
               VALUES (?, ?, 'sabaq', ?, 0, 0, 0, ?, ?)""",
            (surah, ayah, scheduler.EASE_DEFAULT, today.isoformat(), today.isoformat()),
        )
        row = conn.execute("SELECT * FROM items WHERE surah=? AND ayah=?", (surah, ayah)).fetchone()
        return _row_to_dict(row)


def review_item(surah: int, ayah: int, rating: str, today: date | None = None) -> dict:
    """Apply a recall rating and reschedule the ayah."""
    today = today or date.today()
    with db.get_connection() as conn:
        row = conn.execute("SELECT * FROM items WHERE surah=? AND ayah=?", (surah, ayah)).fetchone()
        if row is None:
            # auto-track then review, so a first encounter still works
            conn.execute(
                """INSERT INTO items (surah, ayah, stage, ease, interval_days,
                                      reps, lapses, due, created)
                   VALUES (?, ?, 'sabaq', ?, 0, 0, 0, ?, ?)""",
                (surah, ayah, scheduler.EASE_DEFAULT, today.isoformat(), today.isoformat()),
            )
            row = conn.execute(
                "SELECT * FROM items WHERE surah=? AND ayah=?", (surah, ayah)
            ).fetchone()

        new_state = scheduler.review(_row_to_state(row), rating)
        new_stage = scheduler.stage_for(new_state.interval_days)
        new_due = scheduler.due_date(today, new_state.interval_days)

        conn.execute(
            """UPDATE items SET stage=?, ease=?, interval_days=?, reps=?,
                                lapses=?, last_review=?, due=?
               WHERE surah=? AND ayah=?""",
            (
                new_stage,
                new_state.ease,
                new_state.interval_days,
                new_state.reps,
                new_state.lapses,
                today.isoformat(),
                new_due.isoformat(),
                surah,
                ayah,
            ),
        )
        out = conn.execute("SELECT * FROM items WHERE surah=? AND ayah=?", (surah, ayah)).fetchone()
        return _row_to_dict(out)


def get_queue(as_of: date | None = None) -> dict:
    """Return ayahs due on/before `as_of`, grouped by tier and ordered."""
    as_of = as_of or date.today()
    with db.get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM items WHERE due <= ? ORDER BY due, surah, ayah",
            (as_of.isoformat(),),
        ).fetchall()
    grouped: dict[str, list[dict]] = {"sabaq": [], "sabqi": [], "manzil": []}
    for row in rows:
        grouped.setdefault(row["stage"], []).append(_row_to_dict(row))
    grouped["total_due"] = len(rows)  # type: ignore[assignment]
    return grouped


def get_log() -> list[dict]:
    """Return every tracked ayah (the teacher's logbook), ordered by reference."""
    with db.get_connection() as conn:
        rows = conn.execute("SELECT * FROM items ORDER BY surah, ayah").fetchall()
    return [_row_to_dict(r) for r in rows]


def get_progress() -> dict:
    with db.get_connection() as conn:
        rows = conn.execute("SELECT stage, COUNT(*) AS n FROM items GROUP BY stage").fetchall()
        total = conn.execute("SELECT COUNT(*) AS n FROM items").fetchone()["n"]
    by_stage = {"sabaq": 0, "sabqi": 0, "manzil": 0}
    for row in rows:
        by_stage[row["stage"]] = row["n"]
    return {"total": total, **by_stage}
