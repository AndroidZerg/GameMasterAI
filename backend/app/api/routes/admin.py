"""Admin endpoints — venue config update. Requires auth + role check."""

import json
import re
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_venue
from app.models.venues import update_venue_config, get_venue_by_id, set_venue_collection, get_venue_collection, get_all_venues
from app.services.admin_config import (
    get_meetup_enabled, set_meetup_enabled,
    get_featured, set_featured, get_staff_picks, set_staff_picks,
    has_custom_config, delete_venue_config,
    get_clear_recent_ts, trigger_clear_recent,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Roles allowed to access admin panel
ADMIN_ROLES = {"super_admin", "demo", "venue_admin"}


def _require_admin(venue: dict):
    """Raise 403 if the caller's role is not admin-level."""
    role = venue.get("role", "venue_admin")
    if role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Admin access required")


def _require_super_admin(venue: dict):
    """Raise 403 if the caller is not super_admin."""
    if venue.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")

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
    _require_admin(venue)
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
    _require_admin(venue)
    if not req.game_ids:
        raise HTTPException(status_code=400, detail="game_ids cannot be empty")
    set_venue_collection(venue["venue_id"], req.game_ids)
    return {"status": "ok", "game_count": len(req.game_ids)}


@router.get("/collection")
async def get_collection(
    venue: dict = Depends(get_current_venue),
):
    """Get this venue's game collection. Requires auth."""
    _require_admin(venue)
    game_ids = get_venue_collection(venue["venue_id"])
    return {"venue_id": venue["venue_id"], "game_ids": game_ids, "game_count": len(game_ids)}


# ── Meetup Toggle (super_admin only) ──────────────────────────────

class MeetupToggleRequest(BaseModel):
    enabled: bool


@router.get("/meetup-toggle")
async def get_meetup_toggle(venue: dict = Depends(get_current_venue)):
    """Get current meetup toggle state. Super admin only."""
    _require_super_admin(venue)
    return {"meetup_enabled": get_meetup_enabled()}


@router.post("/meetup-toggle")
async def set_meetup_toggle(req: MeetupToggleRequest, venue: dict = Depends(get_current_venue)):
    """Set meetup toggle on/off. Super admin only."""
    _require_super_admin(venue)
    success = set_meetup_enabled(req.enabled)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to persist meetup toggle")
    return {"meetup_enabled": req.enabled, "saved": True}


# ── Venues list (super_admin only) ──────────────────────────────

@router.get("/venues")
async def list_venues(venue: dict = Depends(get_current_venue)):
    """List all venue accounts for the venue selector dropdown. Super admin only."""
    _require_super_admin(venue)
    all_v = get_all_venues()
    return [
        {"venue_id": v["venue_id"], "venue_name": v["venue_name"], "role": v.get("role", "venue_admin")}
        for v in all_v
    ]


# ── Per-venue home config (super_admin only) ────────────────────

class HomeConfigRequest(BaseModel):
    featured: Optional[dict] = None
    staff_picks: Optional[list[str]] = None


@router.get("/home-config/{target_venue_id}")
async def get_home_config(target_venue_id: str, venue: dict = Depends(get_current_venue)):
    """Get featured + staff_picks config for a specific venue. Super admin only."""
    _require_super_admin(venue)
    # Use _default key for global defaults
    lookup_id = None if target_venue_id == "_default" else target_venue_id
    featured = get_featured(lookup_id)
    picks = get_staff_picks(lookup_id)
    is_custom = has_custom_config(target_venue_id)
    return {
        "venue_id": target_venue_id,
        "featured": featured,
        "staff_picks": picks,
        "is_custom": is_custom,
    }


@router.post("/home-config/{target_venue_id}")
async def save_home_config(target_venue_id: str, req: HomeConfigRequest, venue: dict = Depends(get_current_venue)):
    """Save featured + staff_picks for a specific venue. Super admin only."""
    _require_super_admin(venue)
    venue_key = target_venue_id if target_venue_id != "_default" else None
    if req.featured is not None:
        set_featured(venue_key, req.featured)
    if req.staff_picks is not None:
        if len(req.staff_picks) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 staff picks allowed")
        set_staff_picks(venue_key, req.staff_picks)
    return {"status": "ok", "venue_id": target_venue_id}


@router.delete("/home-config/{target_venue_id}")
async def reset_home_config(target_venue_id: str, venue: dict = Depends(get_current_venue)):
    """Remove custom config for a venue, reverting to global defaults. Super admin only."""
    _require_super_admin(venue)
    if target_venue_id == "_default":
        raise HTTPException(status_code=400, detail="Cannot reset global defaults")
    deleted = delete_venue_config(target_venue_id)
    return {"status": "ok", "deleted": deleted}


# ── Clear Recently Played (super_admin only) ─────────────────────

@router.get("/clear-recent-ts")
async def get_clear_recent_timestamp():
    """Get timestamp of last recently-played clear. Public (all clients check this)."""
    return {"clear_recent_ts": get_clear_recent_ts()}


@router.post("/clear-recent")
async def clear_recent_games(venue: dict = Depends(get_current_venue)):
    """Trigger a clear of recently-played games on all clients. Super admin only."""
    _require_super_admin(venue)
    success = trigger_clear_recent()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to persist clear timestamp")
    return {"status": "ok", "clear_recent_ts": get_clear_recent_ts()}
