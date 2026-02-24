"""Game listing, search, detail, price, and reload endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import get_optional_venue
from app.models.game import search_games, rebuild_db, get_msrp
from app.models.venues import get_venue_collection
from app.services.knowledge import load_game

router = APIRouter(prefix="/api", tags=["games"])


@router.get("/games")
async def list_games(
    search: Optional[str] = Query(None, description="Filter by title (case-insensitive)"),
    complexity: Optional[str] = Query(None, description="Filter by complexity value"),
    venue: Optional[bool] = Query(None, description="If true, filter to venue's collection"),
    current_venue: Optional[dict] = Depends(get_optional_venue),
):
    """List games. If venue=true and authenticated, filters to venue's collection."""
    results = search_games(search=search, complexity=complexity)

    if venue and current_venue:
        collection = get_venue_collection(current_venue["venue_id"])
        if collection:
            coll_set = set(collection)
            results = [g for g in results if g["game_id"] in coll_set]

    return results


@router.get("/games/{game_id}")
async def get_game(game_id: str):
    """Return the full game JSON including all tabs data and MSRP."""
    game = load_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail=f"Game '{game_id}' not found")
    msrp = get_msrp(game_id)
    if msrp is not None:
        game["msrp"] = msrp
    return game


@router.get("/games/{game_id}/price")
async def get_game_price(game_id: str):
    """Return MSRP price for a game."""
    msrp = get_msrp(game_id)
    if msrp is None:
        raise HTTPException(status_code=404, detail=f"Price not available for '{game_id}'")
    return {"game_id": game_id, "msrp": msrp, "currency": "USD"}


@router.post("/reload")
async def reload_games():
    """Re-scan the games directory and rebuild the SQLite database."""
    count = rebuild_db()
    return {"status": "ok", "games_loaded": count}
