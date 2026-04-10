"""Fuzzy game search endpoint."""

from fastapi import APIRouter, Query

from app.services import game_service

router = APIRouter(prefix="/api/games", tags=["games"])


@router.get("/search")
async def search_games(
    q: str = Query(..., min_length=1, description="Search query"),
):
    """Fuzzy search across title, aliases, and categories. Ranked by relevance."""
    return game_service.search_games_fuzzy(q, limit=20)
