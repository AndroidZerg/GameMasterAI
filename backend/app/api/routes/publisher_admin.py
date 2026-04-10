"""Publisher Portal — admin routes for CRM publisher management (super_admin only)."""

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.api.deps import get_current_super_admin
from app.services.supabase_client import get_admin_client

router = APIRouter(tags=["publisher-admin"])


# ── Request Models ──────────────────────────────────────────────

class CreateInviteRequest(BaseModel):
    email: Optional[str] = None
    company_name: Optional[str] = None
    notes: Optional[str] = None


class UpdateStatusRequest(BaseModel):
    status: str  # active, suspended, terminated


class UpdateGameStatusRequest(BaseModel):
    status: Optional[str] = None        # live, inactive, in_review, onboarding
    guide_status: Optional[str] = None  # ready_for_review, in_progress, approved, revision_requested


# ── Routes ──────────────────────────────────────────────────────

@router.get("/publishers")
async def list_publishers(venue: dict = Depends(get_current_super_admin)):
    admin = get_admin_client()

    publishers = admin.table("publishers").select("*").order("created_at", desc=True).execute()

    for p in publishers.data:
        try:
            games = admin.table("publisher_games").select("id, status").eq("publisher_id", p["id"]).execute()
            p["games_count"] = len(games.data)
            p["games_live"] = len([g for g in games.data if g.get("status") == "live"])
        except Exception:
            p["games_count"] = 0
            p["games_live"] = 0

    return publishers.data


@router.post("/publisher-invites")
async def create_invite(body: CreateInviteRequest, venue: dict = Depends(get_current_super_admin)):
    admin = get_admin_client()

    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc).isoformat()

    invite_data = {
        "token": token,
        "email": body.email or "",
        "company_name": body.company_name or "",
        "notes": body.notes or "",
        "created_at": now,
    }

    admin.table("publisher_invites").insert(invite_data).execute()

    invite_url = f"https://playgmg.com/publishers/signup?invite={token}"
    return {"invite_url": invite_url, "token": token}


@router.get("/publisher-invites")
async def list_invites(venue: dict = Depends(get_current_super_admin)):
    admin = get_admin_client()

    result = admin.table("publisher_invites").select("*").order("created_at", desc=True).execute()
    return result.data


@router.patch("/publishers/{publisher_id}/status")
async def update_publisher_status(
    publisher_id: str,
    body: UpdateStatusRequest,
    venue: dict = Depends(get_current_super_admin),
):
    if body.status not in ("active", "suspended", "terminated"):
        raise HTTPException(400, "Status must be: active, suspended, or terminated")

    admin = get_admin_client()
    result = admin.table("publishers").update({"status": body.status}).eq("id", publisher_id).execute()

    if not result.data:
        raise HTTPException(404, "Publisher not found")

    return result.data[0]


# ── Game Review Endpoints (admin) ───────────────────────────────

@router.get("/publishers/{publisher_id}/games")
async def list_publisher_games(
    publisher_id: str,
    venue: dict = Depends(get_current_super_admin),
):
    """List all games submitted by a specific publisher with asset counts."""
    admin = get_admin_client()

    games_res = (
        admin.table("publisher_games")
        .select("*")
        .eq("publisher_id", publisher_id)
        .order("created_at", desc=True)
        .execute()
    )
    games = games_res.data or []

    # Add asset counts to each game
    for g in games:
        try:
            asset_res = admin.table("publisher_assets").select("id, asset_type").eq("game_id", g["id"]).execute()
            assets = asset_res.data or []
            g["asset_count"] = len(assets)
            g["has_rulebook"] = any(a["asset_type"] == "rulebook_pdf" for a in assets)
            g["has_cover_art"] = any(a["asset_type"] == "cover_art" for a in assets)
        except Exception:
            g["asset_count"] = 0
            g["has_rulebook"] = False
            g["has_cover_art"] = False

    return games


@router.patch("/publishers/games/{game_id}/status")
async def admin_update_game_status(
    game_id: str,
    body: UpdateGameStatusRequest,
    venue: dict = Depends(get_current_super_admin),
):
    """Admin override for game status. Setting guide_status='ready_for_review' also
    sets guide_auto_approve_at to NOW() + 48h."""
    admin = get_admin_client()

    updates: dict = {}
    if body.status is not None:
        if body.status not in ("live", "inactive", "in_review", "onboarding"):
            raise HTTPException(400, "Invalid status")
        updates["status"] = body.status

    if body.guide_status is not None:
        if body.guide_status not in (
            "not_started", "in_progress", "ready_for_review", "approved", "revision_requested"
        ):
            raise HTTPException(400, "Invalid guide_status")
        updates["guide_status"] = body.guide_status

        if body.guide_status == "ready_for_review":
            auto_approve = datetime.now(timezone.utc) + timedelta(hours=48)
            updates["guide_auto_approve_at"] = auto_approve.isoformat()

    if not updates:
        raise HTTPException(400, "No updates provided")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = admin.table("publisher_games").update(updates).eq("id", game_id).execute()
    if not result.data:
        raise HTTPException(404, "Game not found")
    return result.data[0]


@router.get("/publishers/games/{game_id}/assets")
async def admin_list_game_assets(
    game_id: str,
    venue: dict = Depends(get_current_super_admin),
):
    """List all assets for a game with signed download URLs for private bucket items."""
    admin = get_admin_client()

    res = admin.table("publisher_assets").select("*").eq("game_id", game_id).execute()
    assets = res.data or []

    for a in assets:
        try:
            if a["asset_type"] == "rulebook_pdf":
                signed = admin.storage.from_("publisher-rulebooks").create_signed_url(
                    a["storage_path"], 3600
                )
                a["download_url"] = signed.get("signedURL") or signed.get("signedUrl") or signed.get("signed_url")
            else:
                public = admin.storage.from_("publisher-assets").get_public_url(a["storage_path"])
                a["download_url"] = public
        except Exception:
            a["download_url"] = None

    return assets
