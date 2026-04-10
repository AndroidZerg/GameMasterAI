"""Game recommendations endpoint."""

from typing import Optional

from fastapi import APIRouter, Query

from app.services import game_service

router = APIRouter(prefix="/api", tags=["games"])


def _to_summary(game: dict) -> dict:
    pc = game.get("player_count") or {}
    return {
        "game_id": game.get("game_id"),
        "title": game.get("title"),
        "aliases": game.get("aliases") or [],
        "player_count": {"min": pc.get("min") or 0, "max": pc.get("max") or 0},
        "complexity": game.get("complexity") or "",
        "categories": game.get("categories") or [],
    }


@router.get("/recommendations")
async def get_recommendations(
    players: Optional[int] = Query(None, description="Number of players"),
    complexity: Optional[str] = Query(None, description="Complexity level (gateway, midweight, heavy, party)"),
    category: Optional[str] = Query(None, description="Game category to filter by"),
):
    """Return top 5 games matching filters, sorted by relevance. Falls back to closest matches."""
    games = game_service.get_all_games()

    scored = []
    for g in games:
        pc = g.get("player_count") or {}
        pmin = pc.get("min") or 0
        pmax = pc.get("max") or 0
        cats = g.get("categories") or []
        gcomplexity = (g.get("complexity") or "").lower()
        score = 0

        # Player count match
        if players is not None:
            if pmin <= players <= pmax:
                score += 10
            else:
                dist = min(abs(players - pmin), abs(players - pmax))
                score += max(0, 5 - dist)

        # Complexity match
        if complexity is not None:
            if gcomplexity == complexity.lower():
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

        scored.append((score, g))

    scored.sort(key=lambda x: (-x[0], (x[1].get("title") or "").lower()))
    return [_to_summary(g) for _, g in scored[:5]]
