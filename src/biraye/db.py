"""SQLite storage for BirAye memorization state.

One row per tracked ayah. The database lives at <repo>/data/biraye.db.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[2] / "data" / "biraye.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS items (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    surah         INTEGER NOT NULL,
    ayah          INTEGER NOT NULL,
    stage         TEXT    NOT NULL DEFAULT 'sabaq',   -- sabaq | sabqi | manzil
    ease          REAL    NOT NULL DEFAULT 2.5,
    interval_days REAL    NOT NULL DEFAULT 0,
    reps          INTEGER NOT NULL DEFAULT 0,
    lapses        INTEGER NOT NULL DEFAULT 0,
    last_review   TEXT,
    due           TEXT    NOT NULL,
    created       TEXT    NOT NULL,
    UNIQUE(surah, ayah)
);
"""


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.executescript(_SCHEMA)
