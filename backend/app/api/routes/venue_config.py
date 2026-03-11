"""Venue Config API — single source of truth for GOTD and Staff Picks."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_venue, get_optional_venue
from app.services.venue_config import (
    get_gotd,
    set_gotd,
    get_staff_picks,
    set_staff_picks,
    get_venue_keys_with_custom_config,
    has_custom_config,
    delete_venue_config,
)

router = APIRouter(prefix="/api/v1/venue-config", tags=["venue-config"])

# Roles that can write config
WRITE_ROLES = {"super_admin"}
# Roles that can write their own venue only
OWN_VENUE_WRITE_ROLES = {"venue_admin", "demo"}


def _check_write_access(venue: dict, target_key: str):
    """Check if the caller can write to the target venue_key."""
    role = venue.get("role", "venue_admin")
    if role in WRITE_ROLES:
        return  # super_admin can write anything
    if role in OWN_VENUE_WRITE_ROLES:
        own_id = venue.get("venue_id")
        if own_id and own_id == target_key:
            return  # venue_admin can write their own
    raise HTTPException(status_code=403, detail="Not authorized to modify this venue's config")


def _check_read_access(venue: Optional[dict], target_key: str):
    """Check if the caller can read the target venue_key config."""
    if not venue:
        raise HTTPException(status_code=401, detail="Authentication required")
    role = venue.get("role", "venue_admin")
    if role in WRITE_ROLES:
        return  # super_admin can read anything
    # venue_admin, demo, convention, meetup, stonemaier — can read their own
    own_id = venue.get("venue_id")
    own_role = venue.get("role")
    if own_id == target_key or own_role == target_key:
        return
    # Allow reading global
    if target_key == "global":
        return
    raise HTTPException(status_code=403, detail="Not authorized to read this venue's config")


# ── Keys (MUST be before /{venue_key} routes) ────────────────────


@router.get("/keys")
async def get_config_keys(venue: dict = Depends(get_current_venue)):
    """Return venue_keys that have custom config. Super admin only."""
    if venue.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    keys = get_venue_keys_with_custom_config()
    return {"keys": keys}


# ── GOTD ──────────────────────────────────────────────────────────


@router.get("/{venue_key}/gotd")
async def get_venue_gotd(venue_key: str, venue: Optional[dict] = Depends(get_optional_venue)):
    """Get GOTD for a venue. Falls back to global if no custom config."""
    if not venue:
        raise HTTPException(status_code=401, detail="Authentication required")
    _check_read_access(venue, venue_key)
    return get_gotd(venue_key)


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


# ── Staff Picks ───────────────────────────────────────────────────


@router.get("/{venue_key}/staff-picks")
async def get_venue_staff_picks(venue_key: str, venue: Optional[dict] = Depends(get_optional_venue)):
    """Get staff picks for a venue. Falls back to global if no custom config."""
    if not venue:
        raise HTTPException(status_code=401, detail="Authentication required")
    _check_read_access(venue, venue_key)
    picks = get_staff_picks(venue_key)
    return {"venue_key": venue_key, "staff_picks": picks}


class StaffPicksRequest(BaseModel):
    picks: list[str]


@router.put("/{venue_key}/staff-picks")
async def set_venue_staff_picks(venue_key: str, req: StaffPicksRequest, venue: dict = Depends(get_current_venue)):
    """Replace staff picks for a venue."""
    _check_write_access(venue, venue_key)
    if len(req.picks) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 staff picks allowed")
    set_staff_picks(venue_key, req.picks)
    return {"status": "ok", "venue_key": venue_key, "picks": req.picks}


# ── Full config (read + write for CustomizeHomePage) ──────────────


@router.get("/{venue_key}/full")
async def get_full_config(venue_key: str, venue: dict = Depends(get_current_venue)):
    """Get full config (GOTD + staff picks + is_custom) for CustomizeHomePage."""
    _check_read_access(venue, venue_key)
    gotd = get_gotd(venue_key)
    picks = get_staff_picks(venue_key)
    is_custom = has_custom_config(venue_key)
    return {
        "venue_key": venue_key,
        "featured": gotd,
        "staff_picks": [p["game_id"] for p in picks],
        "is_custom": is_custom,
    }


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
