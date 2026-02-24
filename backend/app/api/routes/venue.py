"""Venue configuration endpoint — public and authenticated."""

import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_venue, get_optional_venue
from app.models.house_rules import set_house_rules, get_all_house_rules
from app.models.venues import get_venue_by_id, get_venue_collection, get_all_venues, get_staff_picks, set_staff_picks
from app.models.game import search_games

router = APIRouter(prefix="/api", tags=["venue"])

_VENUE_CONFIG_PATH = Path(__file__).resolve().parents[4] / "content" / "venue-config.json"
_VENUE_LOGOS_DIR = Path(__file__).resolve().parents[4] / "content" / "venue-logos"


def _venue_logo_url(venue_id: str) -> Optional[str]:
    logo_path = _VENUE_LOGOS_DIR / f"{venue_id}.png"
    if logo_path.exists():
        return f"/api/images/venue-logos/{venue_id}.png"
    return None


@router.get("/venue")
async def get_venue_config(
    venue: Optional[dict] = Depends(get_optional_venue),
):
    """Get venue config. If authenticated, returns this venue's config. Otherwise returns default."""
    if venue:
        v = get_venue_by_id(venue["venue_id"])
        if v:
            coll = get_venue_collection(venue["venue_id"])
            picks = get_staff_picks(venue["venue_id"])
            return {
                "venue_id": v["venue_id"],
                "venue_name": v["venue_name"],
                "tagline": v["tagline"],
                "accent_color": v["accent_color"],
                "logo_url": v["logo_url"] or _venue_logo_url(v["venue_id"]),
                "default_theme": v["default_theme"],
                "address": v.get("address", ""),
                "phone": v.get("phone", ""),
                "website": v.get("website", ""),
                "game_count": len(coll) if coll else 0,
                "staff_picks": picks,
            }

    # Default: read from venue-config.json
    if not _VENUE_CONFIG_PATH.exists():
        raise HTTPException(status_code=404, detail="Venue config not found")
    try:
        return json.loads(_VENUE_CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/venue/collection")
async def get_venue_collection_public(
    venue: Optional[dict] = Depends(get_optional_venue),
):
    """Get venue's game collection. No auth = returns all games. Auth = venue's collection."""
    if venue:
        game_ids = get_venue_collection(venue["venue_id"])
        if game_ids:
            return {"game_ids": game_ids, "game_count": len(game_ids)}
    return {"game_ids": [], "game_count": 0, "default": True}


@router.post("/admin/house-rules")
async def create_house_rules(
    req: dict,
    venue: dict = Depends(get_current_venue),
):
    """Add/update house rules for a game at this venue. Body: {game_id, rule_text}"""
    game_id = req.get("game_id", "").strip()
    rule_text = req.get("rule_text", "").strip()
    if not game_id:
        raise HTTPException(status_code=400, detail="game_id is required")
    if not rule_text:
        raise HTTPException(status_code=400, detail="rule_text is required")
    rid = set_house_rules(venue["venue_id"], game_id, rule_text)
    return {"id": rid, "status": "ok", "game_id": game_id}


@router.get("/admin/house-rules")
async def list_venue_house_rules(
    venue: dict = Depends(get_current_venue),
):
    """List all house rules for this venue."""
    return get_all_house_rules(venue["venue_id"])


@router.post("/admin/staff-picks")
async def update_staff_picks(
    req: dict,
    venue: dict = Depends(get_current_venue),
):
    """Update staff picks for venue. Body: {game_ids: ["catan", "wingspan", ...]}"""
    game_ids = req.get("game_ids", [])
    if not isinstance(game_ids, list):
        raise HTTPException(status_code=400, detail="game_ids must be a list")
    set_staff_picks(venue["venue_id"], game_ids)
    return {"status": "ok", "staff_picks": game_ids}


@router.get("/venues")
async def list_venues():
    """List all venues (public info only — no passwords/emails)."""
    venues = get_all_venues()
    return [
        {
            "venue_id": v["venue_id"],
            "venue_name": v["venue_name"],
            "tagline": v["tagline"],
            "accent_color": v["accent_color"],
            "logo_url": v.get("logo_url") or _venue_logo_url(v["venue_id"]),
            "address": v.get("address", ""),
            "phone": v.get("phone", ""),
            "website": v.get("website", ""),
        }
        for v in venues
    ]
