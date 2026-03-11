"""Home Config API — GOTD and Staff Picks, single source of truth in Turso."""

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_venue, get_optional_venue
from app.models.game import search_games
from app.services.home_config import (
    get_gotd,
    set_gotd,
    get_staff_picks,
    set_staff_picks,
    delete_venue_config,
    has_custom_config,
    get_configured_venue_keys,
)

router = APIRouter(prefix="/api/home-config", tags=["home-config"])

_CONTENT_ROOT = Path(__file__).resolve().parents[4] / "content"
_HIGHLIGHTS_PATH = _CONTENT_ROOT / "game-highlights.json"
_HIGHLIGHTS: dict[str, str] = {}


def _load_highlights():
    global _HIGHLIGHTS
    if _HIGHLIGHTS_PATH.exists():
        try:
            _HIGHLIGHTS = json.loads(_HIGHLIGHTS_PATH.read_text(encoding="utf-8"))
        except Exception:
            _HIGHLIGHTS = {}


def _resolve_venue_key(venue: dict | None) -> str:
    """Determine venue_key from the logged-in user's account."""
    if not venue:
        return "global"
    role = venue.get("role")
    if role == "super_admin":
        return "global"
    if role in ("convention", "stonemaier"):
        return "convention"
    if role == "meetup":
        return "meetup"
    venue_id = venue.get("venue_id")
    return venue_id if venue_id else "global"


# Roles that can write any venue
SUPER_WRITE_ROLES = {"super_admin"}
# Roles that can write their own venue only
OWN_WRITE_ROLES = {"venue_admin", "demo"}


def _check_write_access(venue: dict, target_key: str):
    """Check if the caller can write to the target venue_key."""
    role = venue.get("role", "venue_admin")
    if role in SUPER_WRITE_ROLES:
        return
    if role in OWN_WRITE_ROLES:
        own_id = venue.get("venue_id")
        if own_id and own_id == target_key:
            return
    raise HTTPException(status_code=403, detail="Not authorized to modify this venue's config")


# ── "me" endpoint — frontend calls this, backend resolves venue_key ──

@router.get("/me")
async def get_my_home_config(venue: Optional[dict] = Depends(get_optional_venue)):
    """Get home config for the current user's venue. No auth = global defaults."""
    venue_key = _resolve_venue_key(venue)
    gotd_data = get_gotd(venue_key)
    picks_data = get_staff_picks(venue_key)
    is_custom = has_custom_config(venue_key)

    # Enrich GOTD with full game data
    gotd_game = None
    if gotd_data:
        games = search_games()
        games_map = {g["game_id"]: g for g in games}

        if gotd_data["mode"] == "manual" and gotd_data["game_id"] in games_map:
            gotd_game = games_map[gotd_data["game_id"]]
        elif gotd_data["mode"] == "auto":
            # Auto mode — hash today's date
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            if games:
                idx = int(hashlib.md5(today.encode()).hexdigest(), 16) % len(games)
                gotd_game = games[idx]

    # Enrich staff picks with full game data
    pick_ids = [p["game_id"] for p in picks_data]
    staff_picks_games = []
    if pick_ids:
        games = search_games()
        games_map = {g["game_id"]: g for g in games}
        staff_picks_games = [games_map[gid] for gid in pick_ids if gid in games_map]

    return {
        "gotd": gotd_game,
        "staff_picks": staff_picks_games,
        "has_custom": is_custom,
        "venue_key": venue_key,
    }


# ── Admin config keys ────────────────────────────────────────────

@router.get("/keys")
async def get_config_keys(venue: dict = Depends(get_current_venue)):
    """Return venue_keys that have custom config. Super admin only."""
    if venue.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    keys = get_configured_venue_keys()
    return {"keys": keys}


# ── Per-venue config (admin CRUD) ────────────────────────────────

@router.get("/{venue_key}")
async def get_venue_config(venue_key: str, venue: dict = Depends(get_current_venue)):
    """Get full config for a specific venue_key. Admin use."""
    gotd_data = get_gotd(venue_key)
    picks_data = get_staff_picks(venue_key)
    is_custom = has_custom_config(venue_key)
    return {
        "venue_key": venue_key,
        "featured": gotd_data,
        "staff_picks": [p["game_id"] for p in picks_data],
        "is_custom": is_custom,
    }


class GotdRequest(BaseModel):
    game_id: str
    mode: str = "manual"


@router.put("/{venue_key}/gotd")
async def set_venue_gotd(venue_key: str, req: GotdRequest, venue: dict = Depends(get_current_venue)):
    """Set GOTD for a venue. Upsert."""
    _check_write_access(venue, venue_key)
    if req.mode not in ("manual", "auto"):
        raise HTTPException(status_code=400, detail="mode must be 'manual' or 'auto'")
    set_gotd(venue_key, req.game_id, req.mode)
    return {"status": "ok", "venue_key": venue_key, "game_id": req.game_id, "mode": req.mode}


class StaffPicksRequest(BaseModel):
    game_ids: list[str]


@router.put("/{venue_key}/staff-picks")
async def set_venue_staff_picks(venue_key: str, req: StaffPicksRequest, venue: dict = Depends(get_current_venue)):
    """Replace staff picks for a venue."""
    _check_write_access(venue, venue_key)
    if len(req.game_ids) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 staff picks allowed")
    set_staff_picks(venue_key, req.game_ids)
    return {"status": "ok", "venue_key": venue_key, "game_ids": req.game_ids}


class FullConfigRequest(BaseModel):
    featured: Optional[dict] = None
    staff_picks: Optional[list[str]] = None


@router.put("/{venue_key}/full")
async def save_full_config(venue_key: str, req: FullConfigRequest, venue: dict = Depends(get_current_venue)):
    """Save full config (GOTD + staff picks). Used by CustomizeHomePage."""
    _check_write_access(venue, venue_key)
    if req.featured is not None:
        game_id = req.featured.get("game_id", "")
        mode = req.featured.get("mode", "manual")
        if mode not in ("manual", "auto"):
            raise HTTPException(status_code=400, detail="mode must be 'manual' or 'auto'")
        if game_id or mode == "auto":
            set_gotd(venue_key, game_id, mode)
    if req.staff_picks is not None:
        if len(req.staff_picks) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 staff picks allowed")
        set_staff_picks(venue_key, req.staff_picks)
    return {"status": "ok", "venue_key": venue_key}


@router.delete("/{venue_key}")
async def reset_venue_config(venue_key: str, venue: dict = Depends(get_current_venue)):
    """Remove custom config for a venue, reverting to global defaults."""
    _check_write_access(venue, venue_key)
    if venue_key == "global":
        raise HTTPException(status_code=400, detail="Cannot delete global config")
    delete_venue_config(venue_key)
    return {"status": "ok", "deleted": True}
