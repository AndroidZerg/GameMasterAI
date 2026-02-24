"""Game listing, search, detail, price, categories, filter, expansions, featured, and reload endpoints."""

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core.auth import get_optional_venue, get_current_venue
from app.models.game import search_games, rebuild_db, get_msrp, filter_games, get_all_categories, get_quick_games
from app.models.feedback import get_all_game_ratings
from app.models.house_rules import get_house_rules
from app.models.venues import get_venue_collection, get_staff_picks
from app.services.knowledge import load_game

_CONTENT_ROOT = Path(__file__).resolve().parents[4] / "content"
_EXPANSIONS_PATH = _CONTENT_ROOT / "expansions.json"
_EXPANSIONS: dict[str, list] = {}
_HIGHLIGHTS_PATH = _CONTENT_ROOT / "game-highlights.json"
_HIGHLIGHTS: dict[str, str] = {}
_ADMIN_CONFIG_PATH = _CONTENT_ROOT / "admin-config.json"


def _load_admin_config() -> dict:
    """Load full admin config (keyed by venue_id) from JSON file."""
    try:
        if _ADMIN_CONFIG_PATH.exists():
            return json.loads(_ADMIN_CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {"_default": {"featured": {"mode": "auto"}, "staff_picks": []}}


def _save_admin_config(config: dict):
    """Save full admin config to JSON file."""
    _ADMIN_CONFIG_PATH.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")


def _get_venue_admin_config(venue_id: Optional[str] = None) -> dict:
    """Get admin config for a specific venue, falling back to _default."""
    config = _load_admin_config()
    if venue_id and venue_id in config:
        return config[venue_id]
    return config.get("_default", {"featured": {"mode": "auto"}, "staff_picks": []})


def _load_expansions():
    global _EXPANSIONS
    if _EXPANSIONS_PATH.exists():
        try:
            _EXPANSIONS = json.loads(_EXPANSIONS_PATH.read_text(encoding="utf-8"))
        except Exception:
            _EXPANSIONS = {}


def _load_highlights():
    global _HIGHLIGHTS
    if _HIGHLIGHTS_PATH.exists():
        try:
            _HIGHLIGHTS = json.loads(_HIGHLIGHTS_PATH.read_text(encoding="utf-8"))
        except Exception:
            _HIGHLIGHTS = {}

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


@router.get("/games/staff-picks")
async def staff_picks_games(
    venue: Optional[dict] = Depends(get_optional_venue),
):
    """Return full game data for staff-picked games. Per-venue admin config -> venue DB -> default."""
    picks = []
    venue_id = venue["venue_id"] if venue else None

    # 1. Check admin-config.json for this venue (or _default)
    vcfg = _get_venue_admin_config(venue_id)
    if vcfg.get("staff_picks"):
        picks = vcfg["staff_picks"]

    # 2. Fall back to venue-specific DB picks
    if not picks and venue_id:
        picks = get_staff_picks(venue_id)

    # 3. Fall back to top games
    if not picks:
        all_games = search_games()
        return all_games[:8]

    all_games = search_games()
    games_map = {g["game_id"]: g for g in all_games}
    return [games_map[gid] for gid in picks if gid in games_map]


@router.get("/games/featured")
async def featured_game(
    venue: Optional[dict] = Depends(get_optional_venue),
):
    """Game of the Day — per-venue admin manual pick or deterministic auto-rotation."""
    if not _HIGHLIGHTS:
        _load_highlights()

    games = search_games()
    if not games:
        return {"error": "No games available"}

    games_map = {g["game_id"]: g for g in games}
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    venue_id = venue["venue_id"] if venue else None

    # Check per-venue admin config for manual override
    vcfg = _get_venue_admin_config(venue_id)
    featured_cfg = vcfg.get("featured", {})
    if featured_cfg.get("mode") == "manual" and featured_cfg.get("game_id"):
        manual_id = featured_cfg["game_id"]
        if manual_id in games_map:
            game = games_map[manual_id]
            why_play = _HIGHLIGHTS.get(manual_id, f"{game['title']} is a great game to try today.")
            return {**game, "why_play": why_play, "featured_date": today, "featured_mode": "manual"}

    # Auto mode — hash today's date to pick a consistent game
    idx = int(hashlib.md5(today.encode()).hexdigest(), 16) % len(games)
    game = games[idx]
    game_id = game["game_id"]

    why_play = _HIGHLIGHTS.get(game_id, f"{game['title']} is a great game to try today.")

    return {
        **game,
        "why_play": why_play,
        "featured_date": today,
        "featured_mode": "auto",
    }


@router.get("/games/{game_id}")
async def get_game(game_id: str):
    """Return the full game JSON including all tabs data, MSRP, and scoring text."""
    game = load_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail=f"Game '{game_id}' not found")
    msrp = get_msrp(game_id)
    if msrp is not None:
        game["msrp"] = msrp
    # Extract scoring/endgame text from rules subtopics
    scoring_text = None
    tabs = game.get("tabs", {})
    rules = tabs.get("rules", {})
    for subtopic in rules.get("subtopics", []):
        if subtopic.get("id") == "endgame":
            scoring_text = subtopic.get("content")
            break
    if scoring_text:
        game["scoring_text"] = scoring_text
    return game


@router.get("/games/{game_id}/expansions")
async def get_game_expansions(game_id: str):
    """Return expansion list for a game. Empty array if none listed."""
    if not _EXPANSIONS:
        _load_expansions()
    return _EXPANSIONS.get(game_id, [])


@router.get("/games/{game_id}/house-rules")
async def get_game_house_rules(
    game_id: str,
    venue: Optional[dict] = Depends(get_optional_venue),
):
    """Get venue's house rules for a game. Returns null if none set."""
    vid = venue["venue_id"] if venue else None
    rules = get_house_rules(game_id, venue_id=vid)
    if rules:
        return rules
    return {"game_id": game_id, "rule_text": None, "message": "No house rules set"}


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


# ── Admin: Featured Game ──────────────────────────────────────────

@router.get("/admin/featured")
async def get_admin_featured(venue: dict = Depends(get_current_venue)):
    """Get current featured game config for this venue."""
    vcfg = _get_venue_admin_config(venue["venue_id"])
    return vcfg.get("featured", {"mode": "auto"})


@router.post("/admin/featured")
async def set_admin_featured(request: Request, venue: dict = Depends(get_current_venue)):
    """Set featured game for this venue. Body: {game_id: "pandemic"} or {auto: true}"""
    body = await request.json()
    config = _load_admin_config()
    venue_id = venue["venue_id"]

    # Ensure venue key exists
    if venue_id not in config:
        config[venue_id] = {"featured": {"mode": "auto"}, "staff_picks": []}

    if body.get("auto"):
        config[venue_id]["featured"] = {"mode": "auto"}
    elif body.get("game_id"):
        config[venue_id]["featured"] = {"mode": "manual", "game_id": body["game_id"]}
    else:
        raise HTTPException(status_code=400, detail="Provide game_id or auto: true")

    _save_admin_config(config)
    return {"status": "ok", "featured": config[venue_id]["featured"]}


# ── Admin: Staff Picks ────────────────────────────────────────────

@router.get("/admin/staff-picks")
async def get_admin_staff_picks(venue: dict = Depends(get_current_venue)):
    """Get current staff picks list for this venue."""
    vcfg = _get_venue_admin_config(venue["venue_id"])
    return {"staff_picks": vcfg.get("staff_picks", [])}


@router.post("/admin/staff-picks")
async def set_admin_staff_picks(request: Request, venue: dict = Depends(get_current_venue)):
    """Set staff picks for this venue. Body: {game_ids: ["wingspan", "azul", ...]}"""
    body = await request.json()
    game_ids = body.get("game_ids", [])
    venue_id = venue["venue_id"]

    if not isinstance(game_ids, list):
        raise HTTPException(status_code=400, detail="game_ids must be an array")
    if len(game_ids) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 staff picks allowed")

    config = _load_admin_config()
    if venue_id not in config:
        config[venue_id] = {"featured": {"mode": "auto"}, "staff_picks": []}
    config[venue_id]["staff_picks"] = game_ids
    _save_admin_config(config)
    return {"status": "ok", "staff_picks": game_ids}
