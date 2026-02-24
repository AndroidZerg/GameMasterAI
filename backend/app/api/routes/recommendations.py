"""Game recommendations endpoint."""

import json
import sqlite3
from typing import Optional

from fastapi import APIRouter, Query

from app.core.config import DB_PATH

router = APIRouter(prefix="/api", tags=["games"])


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _row_to_dict(row: sqlite3.Row) -> dict:
    return {
        "game_id": row["game_id"],
        "title": row["title"],
        "aliases": json.loads(row["aliases"]),
        "player_count": {"min": row["player_count_min"], "max": row["player_count_max"]},
        "complexity": row["complexity"],
        "categories": json.loads(row["categories"]),
    }


@router.get("/recommendations")
async def get_recommendations(
    players: Optional[int] = Query(None, description="Number of players"),
    complexity: Optional[str] = Query(None, description="Complexity level (gateway, midweight, heavy, party)"),
    category: Optional[str] = Query(None, description="Game category to filter by"),
):
    """Return top 5 games matching filters, sorted by relevance. Falls back to closest matches."""
    conn = _get_conn()
    rows = conn.execute("SELECT * FROM games ORDER BY title").fetchall()
    conn.close()

    scored = []
    for row in rows:
        score = 0
        cats = json.loads(row["categories"])

        # Player count match
        if players is not None:
            if row["player_count_min"] <= players <= row["player_count_max"]:
                score += 10
            else:
                # Partial credit for close matches
                dist = min(abs(players - row["player_count_min"]), abs(players - row["player_count_max"]))
                score += max(0, 5 - dist)

        # Complexity match
        if complexity is not None:
            if row["complexity"].lower() == complexity.lower():
                score += 10
            else:
                score += 2  # small base for any game

        # Category match
        if category is not None:
            cats_lower = [c.lower() for c in cats]
            if category.lower() in cats_lower:
                score += 8

        # If no filters, all games get base score
        if players is None and complexity is None and category is None:
            score = 5

        scored.append((score, row))

    scored.sort(key=lambda x: (-x[0], x[1]["title"]))
    return [_row_to_dict(row) for _, row in scored[:5]]
