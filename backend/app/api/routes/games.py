"""Game listing, search, detail, price, categories, filter, expansions, and reload endpoints."""

import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import get_optional_venue
from app.models.game import search_games, rebuild_db, get_msrp, filter_games, get_all_categories, get_quick_games
from app.models.feedback import get_all_game_ratings
from app.models.venues import get_venue_collection
from app.services.knowledge import load_game

_EXPANSIONS_PATH = Path(__file__).resolve().parents[4] / "content" / "expansions.json"
_EXPANSIONS: dict[str, list] = {}


def _load_expansions():
    global _EXPANSIONS
    if _EXPANSIONS_PATH.exists():
        try:
            _EXPANSIONS = json.loads(_EXPANSIONS_PATH.read_text(encoding="utf-8"))
        except Exception:
            _EXPANSIONS = {}

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

    # Attach average ratings
    ratings = get_all_game_ratings()
    for g in results:
        avg = ratings.get(g["game_id"])
        if avg is not None:
            g["average_rating"] = avg

    return results


@router.get("/games/categories")
async def list_categories():
    """Return all unique categories with game counts, sorted alphabetically."""
    return get_all_categories()


@router.get("/games/filter")
async def filter_games_endpoint(
    complexity: Optional[str] = Query(None),
    min_players: Optional[int] = Query(None),
    max_players: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    max_play_time: Optional[int] = Query(None, description="Max play time in minutes"),
    tag: Optional[str] = Query(None, description="Filter by tag: solo, great-for-2, family-friendly, party-game, brain-burner, quick-play, cooperative, mystery-deduction, large-group"),
):
    """Filter games by complexity, player count, category, play time, and tags. All params optional and combinable."""
    return filter_games(
        complexity=complexity,
        min_players=min_players,
        max_players=max_players,
        category=category,
        max_play_time=max_play_time,
        tag=tag,
    )


@router.get("/games/quick")
async def quick_games(
    max_time: int = Query(30, description="Max play time in minutes"),
):
    """Return games with max play time <= threshold. Default 30 minutes."""
    return get_quick_games(max_time=max_time)


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


@router.get("/games/{game_id}/expansions")
async def get_game_expansions(game_id: str):
    """Return expansion list for a game. Empty array if none listed."""
    if not _EXPANSIONS:
        _load_expansions()
    return _EXPANSIONS.get(game_id, [])


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
