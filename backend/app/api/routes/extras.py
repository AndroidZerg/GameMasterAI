"""Expansions, menu, featured, staff picks, and house rules endpoints."""

import hashlib
import json
from datetime import date
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_optional_venue
from app.models.game import search_games

router = APIRouter(prefix="/api", tags=["extras"])

_CONTENT_DIR = Path(__file__).resolve().parents[4] / "content"
_EXPANSIONS_PATH = _CONTENT_DIR / "expansions.json"
_MENUS_DIR = _CONTENT_DIR / "menus"
_HOUSE_RULES_PATH = _CONTENT_DIR / "house-rules.json"

# --- Caches (loaded once at first request) ---
_expansions_cache: dict | None = None
_house_rules_cache: dict | None = None


def _load_expansions() -> dict:
    global _expansions_cache
    if _expansions_cache is None:
        if _EXPANSIONS_PATH.exists():
            data = json.loads(_EXPANSIONS_PATH.read_text(encoding="utf-8"))
            # Strip _meta key
            _expansions_cache = {k: v for k, v in data.items() if not k.startswith("_")}
        else:
            _expansions_cache = {}
    return _expansions_cache


def _load_house_rules() -> dict:
    global _house_rules_cache
    if _house_rules_cache is None:
        if _HOUSE_RULES_PATH.exists():
            data = json.loads(_HOUSE_RULES_PATH.read_text(encoding="utf-8"))
            _house_rules_cache = {k: v for k, v in data.items() if not k.startswith("_")}
        else:
            _house_rules_cache = {}
    return _house_rules_cache


# ── Expansions ──────────────────────────────────────────────

@router.get("/games/{game_id}/expansions")
async def get_game_expansions(game_id: str):
    """Return expansion list for a game. Empty list if none available."""
    expansions = _load_expansions()
    exps = expansions.get(game_id, [])
    return {"game_id": game_id, "expansions": exps, "count": len(exps)}


# ── Venue Menu ──────────────────────────────────────────────

@router.get("/venue/menu")
async def get_venue_menu(
    venue: Optional[dict] = Depends(get_optional_venue),
):
    """Return F&B menu. Auth'd venues get their own menu; otherwise returns default."""
    venue_id = venue["venue_id"] if venue else "meepleville"

    # Try venue-specific menu first
    menu_path = _MENUS_DIR / f"{venue_id}.json"
    if not menu_path.exists():
        # Fallback to meepleville (default)
        menu_path = _MENUS_DIR / "meepleville.json"

    if not menu_path.exists():
        raise HTTPException(status_code=404, detail="Menu not available")

    return json.loads(menu_path.read_text(encoding="utf-8"))


# ── Featured / Game of the Day ──────────────────────────────

@router.get("/games/featured")
async def get_featured_game():
    """Return a deterministic 'Game of the Day' based on today's date.

    Uses a hash of the date to pick consistently — same game all day,
    different game tomorrow.
    """
    all_games = search_games()
    if not all_games:
        raise HTTPException(status_code=404, detail="No games available")

    today = date.today().isoformat()
    h = int(hashlib.md5(today.encode()).hexdigest(), 16)
    idx = h % len(all_games)
    game = all_games[idx]

    return {
        "game_of_the_day": game,
        "date": today,
        "reason": _pick_reason(game),
    }


def _pick_reason(game: dict) -> str:
    """Generate a short reason string for featuring a game."""
    complexity = game.get("complexity", "")
    players = game.get("player_count", {})
    pmin = players.get("min", 2)
    pmax = players.get("max", 4)

    if complexity == "party":
        return "Perfect for a group — easy to learn, lots of laughs"
    elif complexity == "gateway":
        return "Great intro game — welcoming for new players"
    elif complexity == "heavy":
        return "For the strategists — deep decisions await"
    elif pmax >= 6:
        return f"Plays up to {pmax} — bring the whole crew"
    elif pmin == 1:
        return "Solo-friendly — great for a quiet session"
    else:
        return "Staff favorite — a must-play classic"


# ── Staff Picks ─────────────────────────────────────────────

# Curated list — can be updated via admin endpoint later
STAFF_PICKS_IDS = [
    "wingspan", "azul", "codenames", "root",
    "the-crew", "patchwork", "7-wonders", "quacks-of-quedlinburg",
]


@router.get("/games/staff-picks")
async def get_staff_picks():
    """Return curated staff picks list with full game data."""
    all_games = search_games()
    game_map = {g["game_id"]: g for g in all_games}

    picks = []
    for gid in STAFF_PICKS_IDS:
        if gid in game_map:
            picks.append(game_map[gid])

    return {"picks": picks, "count": len(picks)}


# ── House Rules ─────────────────────────────────────────────

@router.get("/venue/house-rules")
async def get_house_rules(
    venue: Optional[dict] = Depends(get_optional_venue),
):
    """Return house rules. Auth'd venues get their own; otherwise returns default."""
    rules_data = _load_house_rules()
    venue_id = venue["venue_id"] if venue else None

    # Try venue-specific rules
    if venue_id and venue_id in rules_data:
        return rules_data[venue_id]

    # Fallback to default
    if "default" in rules_data:
        return rules_data["default"]

    return {"venue_name": "Board Game Cafe", "rules": []}
