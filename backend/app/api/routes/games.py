"""Game listing, search, detail, and reload endpoints."""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.models.game import search_games, rebuild_db
from app.services.knowledge import load_game

router = APIRouter(prefix="/api", tags=["games"])


@router.get("/games")
async def list_games(
    search: Optional[str] = Query(None, description="Filter by title (case-insensitive)"),
    complexity: Optional[str] = Query(None, description="Filter by complexity value"),
):
    return search_games(search=search, complexity=complexity)


@router.get("/games/{game_id}")
async def get_game(game_id: str):
    """Return the full game JSON including all tabs data."""
    game = load_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail=f"Game '{game_id}' not found")
    return game


@router.post("/reload")
async def reload_games():
    """Re-scan the games directory and rebuild the SQLite database."""
    count = rebuild_db()
    return {"status": "ok", "games_loaded": count}
