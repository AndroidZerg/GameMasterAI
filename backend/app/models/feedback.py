"""SQLite feedback model."""

import sqlite3
from datetime import datetime, timezone
from typing import Optional

from app.core.config import DB_PATH


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_feedback_table():
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER,
            game_id TEXT,
            question TEXT,
            response TEXT,
            rating INTEGER,
            created_at TIMESTAMP NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def create_feedback(game_id: str, question: str, response: str, rating: int,
                    session_id: Optional[int] = None) -> int:
    conn = _get_conn()
    cur = conn.execute(
        "INSERT INTO feedback (session_id, game_id, question, response, rating, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (session_id, game_id, question, response, rating, datetime.now(timezone.utc).isoformat()),
    )
    fb_id = cur.lastrowid
    conn.commit()
    conn.close()
    return fb_id


def get_feedback(game_id: Optional[str] = None) -> list[dict]:
    conn = _get_conn()
    if game_id:
        rows = conn.execute("SELECT * FROM feedback WHERE game_id = ? ORDER BY created_at DESC", (game_id,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM feedback ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]
