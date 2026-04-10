"""Popular games endpoint."""

import sqlite3

from fastapi import APIRouter

from app.core.config import DB_PATH
from app.services import game_service

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
        SELECT s.game_id, COUNT(*) as session_count
        FROM sessions s
        GROUP BY s.game_id
        ORDER BY session_count DESC
        LIMIT 10
    """).fetchall()
    conn.close()

    if rows:
        result = []
        for r in rows:
            game = game_service.get_game(r["game_id"])
            title = game["title"] if game else r["game_id"]
            result.append({"game_id": r["game_id"], "title": title, "sessions": r["session_count"]})
        return result

    # Fall back to curated defaults
    result = []
    for gid in _DEFAULT_POPULAR:
        game = game_service.get_game(gid)
        if game:
            result.append({"game_id": gid, "title": game["title"], "sessions": 0})
    result.sort(key=lambda g: g["title"].lower())
    return result
