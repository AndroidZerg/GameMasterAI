"""Venue configuration endpoint — public and authenticated."""

import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_optional_venue
from app.models.venues import get_venue_by_id, get_venue_collection

router = APIRouter(prefix="/api", tags=["venue"])

_VENUE_CONFIG_PATH = Path(__file__).resolve().parents[4] / "content" / "venue-config.json"


@router.get("/venue")
async def get_venue_config(
    venue: Optional[dict] = Depends(get_optional_venue),
):
    """Get venue config. If authenticated, returns this venue's config. Otherwise returns default."""
    if venue:
        v = get_venue_by_id(venue["venue_id"])
        if v:
            coll = get_venue_collection(venue["venue_id"])
            return {
                "venue_id": v["venue_id"],
                "venue_name": v["venue_name"],
                "tagline": v["tagline"],
                "accent_color": v["accent_color"],
                "logo_url": v["logo_url"],
                "default_theme": v["default_theme"],
                "game_count": len(coll) if coll else 0,
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
    # No auth or no collection — return empty (frontend will show all)
    return {"game_ids": [], "game_count": 0, "default": True}
