"""Admin endpoints — venue config update. Requires auth."""

import json
import re
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_venue
from app.models.venues import update_venue_config, get_venue_by_id, set_venue_collection, get_venue_collection

router = APIRouter(prefix="/api/admin", tags=["admin"])

_VENUE_CONFIG_PATH = Path(__file__).resolve().parents[4] / "content" / "venue-config.json"
_HEX_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


class VenueUpdateRequest(BaseModel):
    venue_name: Optional[str] = None
    accent_color: Optional[str] = None
    buy_button_text: Optional[str] = None
    logo_url: Optional[str] = None
    venue_tagline: Optional[str] = None
    show_buy_button: Optional[bool] = None
    contact_email: Optional[str] = None
    default_theme: Optional[str] = None


class CollectionUpdateRequest(BaseModel):
    game_ids: list[str]


@router.post("/venue")
async def update_venue_config_endpoint(
    req: VenueUpdateRequest,
    venue: dict = Depends(get_current_venue),
):
    """Update venue config for the authenticated venue."""
    # Validate inputs
    if req.venue_name is not None and not req.venue_name.strip():
        raise HTTPException(status_code=400, detail="venue_name cannot be empty")
    if req.accent_color is not None and not _HEX_COLOR_RE.match(req.accent_color):
        raise HTTPException(status_code=400, detail="accent_color must be a hex color (e.g. #e94560)")
    if req.default_theme is not None and req.default_theme not in ("dark", "light"):
        raise HTTPException(status_code=400, detail="default_theme must be 'dark' or 'light'")

    updated = update_venue_config(
        venue["venue_id"],
        venue_name=req.venue_name.strip() if req.venue_name else None,
        accent_color=req.accent_color,
        logo_url=req.logo_url.strip() if req.logo_url else None,
        tagline=req.venue_tagline.strip() if req.venue_tagline else None,
        default_theme=req.default_theme,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Venue not found")

    return {
        "venue_id": updated["venue_id"],
        "venue_name": updated["venue_name"],
        "accent_color": updated["accent_color"],
        "logo_url": updated["logo_url"],
        "tagline": updated["tagline"],
        "default_theme": updated["default_theme"],
    }


@router.post("/collection")
async def update_collection(
    req: CollectionUpdateRequest,
    venue: dict = Depends(get_current_venue),
):
    """Replace the entire game collection for this venue. Requires auth."""
    if not req.game_ids:
        raise HTTPException(status_code=400, detail="game_ids cannot be empty")
    set_venue_collection(venue["venue_id"], req.game_ids)
    return {"status": "ok", "game_count": len(req.game_ids)}


@router.get("/collection")
async def get_collection(
    venue: dict = Depends(get_current_venue),
):
    """Get this venue's game collection. Requires auth."""
    game_ids = get_venue_collection(venue["venue_id"])
    return {"venue_id": venue["venue_id"], "game_ids": game_ids, "game_count": len(game_ids)}
