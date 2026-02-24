"""Fuzzy game search endpoint."""

import json
import sqlite3
from typing import Optional

from fastapi import APIRouter, Query, HTTPException

from app.core.config import DB_PATH

router = APIRouter(prefix="/api/games", tags=["games"])


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


def _relevance_score(query: str, row: sqlite3.Row) -> int:
    """Score a game's relevance to a search query. Higher = better match."""
    q = query.lower()
    title = row["title"].lower()
    game_id = row["game_id"].lower()
    aliases = json.loads(row["aliases"])
    categories = json.loads(row["categories"])

    score = 0

    # Exact title match
    if q == title:
        score += 100
    # Title starts with query
    elif title.startswith(q):
        score += 50
    # Query is in title
    elif q in title:
        score += 30
    # Game ID match
    elif q in game_id:
        score += 25

    # Alias matches
    for alias in aliases:
        alias_lower = alias.lower()
        if q == alias_lower:
            score += 80
        elif q in alias_lower:
            score += 20

    # Category matches
    for cat in categories:
        if q in cat.lower():
            score += 10

    return score


@router.get("/search")
async def search_games(
    q: str = Query(..., min_length=1, description="Search query"),
):
    """Fuzzy search across title, aliases, and categories. Ranked by relevance."""
    conn = _get_conn()
    rows = conn.execute("SELECT * FROM games").fetchall()
    conn.close()

    scored = []
    for row in rows:
        rel = _relevance_score(q, row)
        if rel > 0:
            scored.append((rel, row))

    scored.sort(key=lambda x: (-x[0], x[1]["title"]))
    return [_row_to_dict(row) for _, row in scored[:20]]
