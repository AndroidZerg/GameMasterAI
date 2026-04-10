"""Publisher Portal — admin routes for CRM publisher management (super_admin only)."""

import secrets
from datetime import datetime, timezone

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
