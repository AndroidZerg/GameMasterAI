"""SQLite session tracking model."""

import sqlite3
from datetime import datetime, timezone

from app.core.config import DB_PATH


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_sessions_table():
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id TEXT,
            table_number TEXT,
            started_at TIMESTAMP NOT NULL,
            ended_at TIMESTAMP,
            duration_seconds INTEGER,
            questions_asked INTEGER DEFAULT 0,
            score_tracked BOOLEAN DEFAULT 0,
            venue_id TEXT DEFAULT 'default'
        )
    """)
    conn.commit()
    conn.close()


def create_session(game_id: str, table_number: str | None = None, venue_id: str | None = None) -> int:
    conn = _get_conn()
    vid = venue_id or "default"
    cur = conn.execute(
        "INSERT INTO sessions (game_id, table_number, venue_id, started_at) VALUES (?, ?, ?, ?)",
        (game_id, table_number, vid, datetime.now(timezone.utc).isoformat()),
    )
    session_id = cur.lastrowid
    conn.commit()
    conn.close()
    return session_id


def end_session(session_id: int) -> bool:
    conn = _get_conn()
    row = conn.execute("SELECT started_at FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        conn.close()
        return False
    started = datetime.fromisoformat(row["started_at"])
    now = datetime.now(timezone.utc)
    # Handle naive datetimes from DB
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    duration = int((now - started).total_seconds())
    conn.execute(
        "UPDATE sessions SET ended_at = ?, duration_seconds = ? WHERE id = ?",
        (now.isoformat(), duration, session_id),
    )
    conn.commit()
    conn.close()
    return True


def increment_questions(session_id: int) -> bool:
    conn = _get_conn()
    cur = conn.execute(
        "UPDATE sessions SET questions_asked = questions_asked + 1 WHERE id = ?",
        (session_id,),
    )
    updated = cur.rowcount > 0
    conn.commit()
    conn.close()
    return updated


def set_score_tracked(session_id: int) -> bool:
    conn = _get_conn()
    cur = conn.execute(
        "UPDATE sessions SET score_tracked = 1 WHERE id = ?",
        (session_id,),
    )
    updated = cur.rowcount > 0
    conn.commit()
    conn.close()
    return updated
