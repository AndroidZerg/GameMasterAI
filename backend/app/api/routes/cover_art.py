"""Admin endpoints for managing game cover art overrides (Turso-persisted)."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_venue_admin
from app.api.routes.images import invalidate_override_cache
from app.services.turso import (
    get_all_cover_art_overrides,
    upsert_cover_art_override,
    delete_cover_art_override,
    get_cover_art_status,
)

router = APIRouter(prefix="/api/v1/admin/cover-art", tags=["cover-art"])


def _require_super_admin(venue: dict):
    if venue.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin only")


class CoverArtBody(BaseModel):
    image_url: str


@router.get("")
async def list_overrides(venue: dict = Depends(get_current_venue_admin)):
    """Return all cover art overrides."""
    _require_super_admin(venue)
    return get_all_cover_art_overrides()


@router.put("/{game_id}")
async def upsert_override(game_id: str, body: CoverArtBody, venue: dict = Depends(get_current_venue_admin)):
    """Create or update a cover art override."""
    _require_super_admin(venue)
    if not body.image_url.startswith("http"):
        raise HTTPException(status_code=400, detail="image_url must be an HTTP(S) URL")
    upsert_cover_art_override(game_id, body.image_url)
    invalidate_override_cache(game_id)
    return {"ok": True, "game_id": game_id, "image_url": body.image_url}


@router.delete("/{game_id}")
async def remove_override(game_id: str, venue: dict = Depends(get_current_venue_admin)):
    """Remove a cover art override."""
    _require_super_admin(venue)
    delete_cover_art_override(game_id)
    invalidate_override_cache(game_id)
    return {"ok": True, "game_id": game_id}


@router.get("/status")
async def override_status(venue: dict = Depends(get_current_venue_admin)):
    """Return {game_id: true} for every game with an override."""
    _require_super_admin(venue)
    return get_cover_art_status()
