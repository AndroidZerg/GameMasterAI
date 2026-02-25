"""SQLite feedback model — supports star ratings, reactions, and post-game surveys."""

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
    for col_def in [
        "reaction TEXT",
        "comment TEXT",
        "lobby_id TEXT",
        "venue_id TEXT",
        "player_name TEXT",
        "played_before INTEGER",
        "helpful_setup INTEGER",
        "helpful_rules INTEGER",
        "helpful_strategy INTEGER",
        "helpful_scoring INTEGER",
        "would_use_again INTEGER",
        "feedback_text TEXT",
    ]:
        try:
            conn.execute(f"ALTER TABLE feedback ADD COLUMN {col_def}")
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


def create_survey_feedback(
    game_id: str,
    game_rating: int,
    lobby_id: Optional[str] = None,
    venue_id: Optional[str] = None,
    player_name: Optional[str] = None,
    played_before: Optional[bool] = None,
    helpful_setup: Optional[int] = None,
    helpful_rules: Optional[int] = None,
    helpful_strategy: Optional[int] = None,
    helpful_scoring: Optional[int] = None,
    would_use_again: Optional[bool] = None,
    feedback_text: Optional[str] = None,
) -> int:
    conn = _get_conn()
    now = datetime.now(timezone.utc).isoformat()
    cur = conn.execute(
        """INSERT INTO feedback (game_id, rating, lobby_id, venue_id, player_name,
           played_before, helpful_setup, helpful_rules, helpful_strategy,
           helpful_scoring, would_use_again, feedback_text, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (game_id, game_rating, lobby_id, venue_id, player_name,
         1 if played_before else 0 if played_before is not None else None,
         helpful_setup, helpful_rules, helpful_strategy, helpful_scoring,
         1 if would_use_again else 0 if would_use_again is not None else None,
         feedback_text or "", now),
    )
    fb_id = cur.lastrowid
    conn.commit()
    conn.close()
    return fb_id


def get_survey_stats() -> dict:
    """Aggregate stats for admin feedback dashboard."""
    conn = _get_conn()
    rows = conn.execute(
        """SELECT rating, helpful_setup, helpful_rules, helpful_strategy,
           helpful_scoring, would_use_again FROM feedback
           WHERE rating IS NOT NULL AND helpful_setup IS NOT NULL"""
    ).fetchall()
    conn.close()

    if not rows:
        return {
            "total": 0, "avg_game_rating": 0,
            "avg_setup": 0, "avg_rules": 0, "avg_strategy": 0, "avg_scoring": 0,
            "would_use_again_pct": 0,
        }

    total = len(rows)
    avg = lambda vals: round(sum(v for v in vals if v) / max(len([v for v in vals if v]), 1), 1)
    ratings = [r["rating"] for r in rows if r["rating"]]
    setups = [r["helpful_setup"] for r in rows if r["helpful_setup"]]
    rules = [r["helpful_rules"] for r in rows if r["helpful_rules"]]
    strats = [r["helpful_strategy"] for r in rows if r["helpful_strategy"]]
    scores = [r["helpful_scoring"] for r in rows if r["helpful_scoring"]]
    use_again = [r["would_use_again"] for r in rows if r["would_use_again"] is not None]

    return {
        "total": total,
        "avg_game_rating": avg(ratings),
        "avg_setup": avg(setups),
        "avg_rules": avg(rules),
        "avg_strategy": avg(strats),
        "avg_scoring": avg(scores),
        "would_use_again_pct": round(sum(1 for v in use_again if v) / max(len(use_again), 1) * 100),
    }


def get_all_survey_feedback() -> list[dict]:
    """Return all survey feedback entries for admin view."""
    conn = _get_conn()
    rows = conn.execute(
        """SELECT id, game_id, rating, lobby_id, venue_id, player_name,
           played_before, helpful_setup, helpful_rules, helpful_strategy,
           helpful_scoring, would_use_again, feedback_text, created_at
           FROM feedback WHERE helpful_setup IS NOT NULL
           ORDER BY created_at DESC"""
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


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
