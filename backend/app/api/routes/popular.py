"""Popular games endpoint."""

import json
import sqlite3

from fastapi import APIRouter

from app.core.config import DB_PATH

router = APIRouter(prefix="/api/games", tags=["games"])

# Curated default list when no session data exists
_DEFAULT_POPULAR = [
    "catan", "ticket-to-ride", "azul", "wingspan", "codenames",
    "splendor", "carcassonne", "king-of-tokyo", "sushi-go-party", "kingdomino",
]


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@router.get("/popular")
async def get_popular_games():
    """Return top 10 most-played games based on session data, or curated defaults."""
    conn = _get_conn()

    # Try session-based popularity
    rows = conn.execute("""
        SELECT s.game_id, COUNT(*) as session_count, COALESCE(g.title, s.game_id) as title
        FROM sessions s
        LEFT JOIN games g ON s.game_id = g.game_id
        GROUP BY s.game_id
        ORDER BY session_count DESC
        LIMIT 10
    """).fetchall()

    if rows:
        result = [{"game_id": r["game_id"], "title": r["title"], "sessions": r["session_count"]} for r in rows]
        conn.close()
        return result

    # Fall back to curated defaults
    placeholders = ",".join("?" for _ in _DEFAULT_POPULAR)
    defaults = conn.execute(
        f"SELECT * FROM games WHERE game_id IN ({placeholders}) ORDER BY title",
        _DEFAULT_POPULAR,
    ).fetchall()
    conn.close()

    return [
        {
            "game_id": r["game_id"],
            "title": r["title"],
            "sessions": 0,
        }
        for r in defaults
    ]
