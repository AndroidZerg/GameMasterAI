"""Game listing, search, and filter endpoint."""

from typing import Optional

from fastapi import APIRouter, Query

from app.models.game import search_games

router = APIRouter(prefix="/api")


@router.get("/games")
async def list_games(
    search: Optional[str] = Query(None, description="Filter by title (case-insensitive)"),
    complexity: Optional[str] = Query(None, description="Filter by complexity value"),
):
    return search_games(search=search, complexity=complexity)
