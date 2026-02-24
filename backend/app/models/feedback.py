"""SQLite feedback model — supports star ratings and reactions."""

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
            reaction TEXT,
            comment TEXT,
            created_at TIMESTAMP NOT NULL
        )
    """)
    # Add columns if upgrading from old schema
    try:
        conn.execute("ALTER TABLE feedback ADD COLUMN reaction TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("ALTER TABLE feedback ADD COLUMN comment TEXT")
    except sqlite3.OperationalError:
        pass
    conn.commit()
    conn.close()


def create_feedback(game_id: str, rating: int, question: str = "",
                    response: str = "", reaction: str = "",
                    comment: str = "", session_id: Optional[int] = None) -> int:
    conn = _get_conn()
    cur = conn.execute(
        """INSERT INTO feedback (session_id, game_id, question, response, rating,
           reaction, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (session_id, game_id, question, response, rating, reaction, comment,
         datetime.now(timezone.utc).isoformat()),
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


def get_game_rating(game_id: str) -> dict:
    """Get aggregate rating for a game. Maps old thumbs (1/-1) to star scale."""
    conn = _get_conn()
    rows = conn.execute(
        "SELECT rating FROM feedback WHERE game_id = ? AND rating IS NOT NULL",
        (game_id,),
    ).fetchall()
    conn.close()

    if not rows:
        return {"average_rating": 0, "total_ratings": 0, "distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}}

    # Map old -1/1 thumbs to stars: -1 -> 1, 1 -> 5
    stars = []
    for r in rows:
        val = r["rating"]
        if val == -1:
            stars.append(1)
        elif val == 1 and val not in (2, 3, 4, 5):
            # Could be old thumbs-up (1) or new 1-star
            # If only 1 or -1 exists, treat 1 as thumbs-up = 5 stars
            stars.append(5)
        else:
            stars.append(max(1, min(5, val)))

    dist = {i: 0 for i in range(1, 6)}
    for s in stars:
        dist[s] = dist.get(s, 0) + 1

    avg = round(sum(stars) / len(stars), 1) if stars else 0
    return {"average_rating": avg, "total_ratings": len(stars), "distribution": dist}


def get_all_game_ratings() -> dict[str, float]:
    """Get average rating for all games that have ratings."""
    conn = _get_conn()
    rows = conn.execute(
        "SELECT game_id, rating FROM feedback WHERE rating IS NOT NULL"
    ).fetchall()
    conn.close()

    game_ratings: dict[str, list[int]] = {}
    for r in rows:
        gid = r["game_id"]
        val = r["rating"]
        if val == -1:
            star = 1
        elif val == 1:
            star = 5
        else:
            star = max(1, min(5, val))
        game_ratings.setdefault(gid, []).append(star)

    return {
        gid: round(sum(stars) / len(stars), 1)
        for gid, stars in game_ratings.items()
    }
