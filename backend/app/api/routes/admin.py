"""Admin endpoints — venue config update. Requires auth + role check."""

import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.auth import get_current_venue
from app.services.venue_service import (
    update_venue_config, get_venue_by_id, set_venue_collection,
    get_venue_collection, get_all_venues, get_all_signups,
    get_meetup_enabled, set_meetup_enabled,
    get_clear_recent_ts, trigger_clear_recent,
    delete_venue,
)
from app.services import game_service

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
    target_venue_id: Optional[str] = Query(None, alias="venue_id", description="Target venue (super_admin only)"),
    venue: dict = Depends(get_current_venue),
):
    """Replace the entire game collection for a venue. Super admins can target any venue."""
    _require_admin(venue)
    vid = venue["venue_id"]
    if target_venue_id:
        _require_super_admin(venue)
        vid = target_venue_id
    if not req.game_ids:
        raise HTTPException(status_code=400, detail="game_ids cannot be empty")
    set_venue_collection(vid, req.game_ids)
    return {"status": "ok", "venue_id": vid, "game_count": len(req.game_ids)}


@router.get("/collection")
async def get_collection(
    target_venue_id: Optional[str] = Query(None, alias="venue_id", description="Target venue (super_admin only)"),
    venue: dict = Depends(get_current_venue),
):
    """Get a venue's game collection. Super admins can query any venue."""
    _require_admin(venue)
    vid = venue["venue_id"]
    if target_venue_id:
        _require_super_admin(venue)
        vid = target_venue_id
    game_ids = get_venue_collection(vid)
    return {"venue_id": vid, "game_ids": game_ids, "game_count": len(game_ids)}


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


# ── Signups List (super_admin only) ───────────────────────────────

@router.get("/signups")
async def list_signups(venue: dict = Depends(get_current_venue)):
    """Return all signups from Turso. Super admin only."""
    _require_super_admin(venue)
    signups = get_all_signups()
    return {"signups": signups, "count": len(signups)}


# ── Game Content Write API (super_admin only) ────────────────────

_ALLOWED_COMPLEXITY = {"party", "gateway", "midweight", "heavy"}
_ALLOWED_VALIDATION_STATUS = {"pending", "approved", "rejected"}


class GameUpsertRequest(BaseModel):
    game_id: str
    title: Optional[str] = None
    aliases: Optional[list[str]] = None
    publisher: Optional[str] = None
    publisher_tag: Optional[str] = None
    publisher_approved: Optional[bool] = None
    public_domain: Optional[bool] = None
    image: Optional[str] = None
    player_count: Optional[dict] = None
    play_time_minutes: Optional[dict] = None
    complexity: Optional[str] = None
    categories: Optional[list[str]] = None
    source_url: Optional[str] = None
    source_verified: Optional[bool] = None
    bgg_id: Optional[int] = None
    tabs: Optional[dict] = None
    rules_citations: Optional[dict] = None
    extensions: Optional[dict] = None
    teaching: Optional[dict] = None
    score_config: Optional[dict] = None
    metadata: Optional[dict] = None


def _to_supabase_row(req: GameUpsertRequest) -> dict:
    """Convert the nested API shape into the flat Supabase column shape."""
    pc = req.player_count or {}
    pt = req.play_time_minutes or {}
    md = req.metadata or {}

    complexity = req.complexity if req.complexity in _ALLOWED_COMPLEXITY else None
    vs = md.get("validation_status")
    validation_status = vs if vs in _ALLOWED_VALIDATION_STATUS else None

    row = {
        "game_id": req.game_id,
        "title": req.title or req.game_id,
        "aliases": req.aliases or [],
        "publisher": req.publisher,
        "publisher_tag": req.publisher_tag,
        "publisher_approved": bool(req.publisher_approved) if req.publisher_approved is not None else False,
        "public_domain": bool(req.public_domain) if req.public_domain is not None else False,
        "image": req.image,
        "player_count_min": pc.get("min"),
        "player_count_max": pc.get("max"),
        "player_count_recommended": pc.get("recommended"),
        "expansion_max": pc.get("expansion_max"),
        "play_time_min": pt.get("min"),
        "play_time_max": pt.get("max"),
        "complexity": complexity,
        "categories": req.categories or [],
        "source_url": req.source_url,
        "source_verified": bool(req.source_verified) if req.source_verified is not None else False,
        "bgg_id": req.bgg_id,
        "tabs": req.tabs or {},
        "rules_citations": req.rules_citations or {},
        "extensions": req.extensions or {},
        "teaching": req.teaching or {},
        "score_config": req.score_config or {},
        "schema_version": md.get("schema_version") or "2.0",
        "created_by": md.get("created_by") or "admin-api",
        "validated_by": md.get("validated_by"),
        "validation_status": validation_status,
        "revision": md.get("revision") or 1,
        "notes": md.get("notes"),
    }
    return row


@router.post("/games")
async def upsert_game(req: GameUpsertRequest, venue: dict = Depends(get_current_venue)):
    """Create or update a game in Supabase. Super admin only.

    Accepts the nested JSON-file shape; reshapes into flat Supabase columns
    and upserts on game_id. Cache is invalidated and the local SQLite mirror
    is rebuilt so legacy LEFT JOIN queries see the new data immediately.
    """
    _require_super_admin(venue)
    if not req.game_id or not req.game_id.strip():
        raise HTTPException(status_code=400, detail="game_id is required")
    row = _to_supabase_row(req)
    try:
        result = game_service.create_or_update_game(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upsert failed: {e}")
    return {"status": "ok", "game_id": req.game_id, "game": result}


@router.post("/games/{game_id}/invalidate-cache")
async def invalidate_game_cache(game_id: str, venue: dict = Depends(get_current_venue)):
    """Force the next read to refresh from Supabase. Super admin only."""
    _require_super_admin(venue)
    game_service.invalidate_cache()
    game_service.sync_local_games_table()
    return {"status": "ok", "game_id": game_id, "cache": "invalidated"}


# ── Venue Cleanup (super_admin only) ────────────────────────────

KEEP_VENUE_IDS = {
    "thaihouse", "shallweplay", "dicetowerwest",
    "admin", "demo-dicetower", "meetup", "meetup-admin", "playgmai-demo",
}


@router.post("/cleanup-venues")
async def cleanup_stale_venues(venue: dict = Depends(get_current_venue)):
    """Delete all venues except the 3 real ones + system accounts. Super admin only."""
    _require_super_admin(venue)

    all_v = get_all_venues()
    before_count = len(all_v)

    deleted = []
    for v in all_v:
        vid = v.get("venue_id", "")
        if vid and vid not in KEEP_VENUE_IDS:
            delete_venue(vid)
            deleted.append({
                "venue_id": vid,
                "venue_name": v.get("venue_name", ""),
                "role": v.get("role", ""),
            })

    remaining = get_all_venues()
    after = [
        {"venue_id": v.get("venue_id", ""), "venue_name": v.get("venue_name", ""), "role": v.get("role", "")}
        for v in remaining
    ]

    return {
        "before_count": before_count,
        "deleted_count": len(deleted),
        "deleted": deleted,
        "after_count": len(after),
        "remaining": after,
    }
