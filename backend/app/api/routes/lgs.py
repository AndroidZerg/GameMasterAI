"""LGS (Local Game Store) admin endpoints — create, pair, list, detail."""

import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_super_admin
from app.core.config import DB_PATH

router = APIRouter(tags=["lgs"])


def _get_venues_conn():
    """Turso-backed connection for the venues table."""
    from app.services.turso import get_venues_db
    return get_venues_db()


def _get_local_conn() -> sqlite3.Connection:
    """Local SQLite for lgs_partners and other non-venue tables."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _generate_id() -> str:
    """Generate a unique ID. Uses ulid if available, falls back to uuid4."""
    try:
        import ulid
        return str(ulid.new())
    except ImportError:
        return str(uuid.uuid4())


# ── Request models ──────────────────────────────────────────────

class CreateLGSRequest(BaseModel):
    name: str
    contact_name: str
    contact_email: str
    contact_phone: Optional[str] = None
    address: Optional[str] = None


class PairVenueRequest(BaseModel):
    venue_id: str


# ── Endpoints ───────────────────────────────────────────────────

@router.post("/lgs/create", status_code=201)
async def create_lgs(req: CreateLGSRequest, _user: dict = Depends(get_current_super_admin)):
    """Create a new LGS partner."""
    local = _get_local_conn()
    try:
        # Check for duplicate email
        existing = local.execute(
            "SELECT id FROM lgs_partners WHERE contact_email = ?",
            (req.contact_email.strip().lower(),),
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="LGS with this email already exists")

        now = datetime.now(timezone.utc).isoformat()
        lgs_id = _generate_id()

        local.execute(
            """INSERT INTO lgs_partners (id, name, contact_name, contact_email,
               contact_phone, address, stripe_account_id, stripe_onboarding_complete,
               status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'active', ?, ?)""",
            (lgs_id, req.name.strip(), req.contact_name.strip(),
             req.contact_email.strip().lower(), req.contact_phone, req.address,
             None, now, now),
        )
        local.commit()

        return {
            "lgs_id": lgs_id,
            "name": req.name.strip(),
            "contact_email": req.contact_email.strip().lower(),
            "status": "active",
            "stripe_onboarding_link": None,
            "message": "LGS created. Stripe Connect onboarding added in Phase 5.",
        }
    finally:
        local.close()


@router.post("/lgs/{lgs_id}/pair-venue")
async def pair_venue(lgs_id: str, req: PairVenueRequest,
                     _user: dict = Depends(get_current_super_admin)):
    """Pair an LGS with a venue. Sets venues.lgs_id = lgs_id."""
    # Verify LGS exists (local SQLite)
    local = _get_local_conn()
    lgs = local.execute("SELECT id FROM lgs_partners WHERE id = ?", (lgs_id,)).fetchone()
    local.close()
    if not lgs:
        raise HTTPException(status_code=404, detail="LGS not found")

    # Verify venue exists (Turso)
    vconn = _get_venues_conn()
    venue = vconn.execute(
        "SELECT venue_id, venue_name, lgs_id FROM venues WHERE venue_id = ?",
        (req.venue_id,),
    ).fetchone()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    # Check if venue already paired to a different LGS
    if venue["lgs_id"] and venue["lgs_id"] != lgs_id:
        raise HTTPException(
            status_code=409,
            detail=f"Venue already paired with a different LGS (lgs_id={venue['lgs_id']})",
        )

    vconn.execute(
        "UPDATE venues SET lgs_id = ? WHERE venue_id = ?",
        (lgs_id, req.venue_id),
    )
    vconn.commit()

    # Return updated venue
    updated = vconn.execute(
        "SELECT venue_id, venue_name, lgs_id, subscription_tier, status FROM venues WHERE venue_id = ?",
        (req.venue_id,),
    ).fetchone()

    return {
        "venue_id": updated["venue_id"],
        "venue_name": updated["venue_name"],
        "lgs_id": updated["lgs_id"],
        "subscription_tier": updated["subscription_tier"],
        "status": updated["status"],
        "message": "Venue paired with LGS successfully",
    }


@router.post("/lgs/{lgs_id}/unpair-venue")
async def unpair_venue(lgs_id: str, req: PairVenueRequest,
                       _user: dict = Depends(get_current_super_admin)):
    """Remove LGS pairing from a venue. Does NOT delete inventory or pricing data."""
    # Verify LGS exists (local SQLite)
    local = _get_local_conn()
    lgs = local.execute("SELECT id FROM lgs_partners WHERE id = ?", (lgs_id,)).fetchone()
    local.close()
    if not lgs:
        raise HTTPException(status_code=404, detail="LGS not found")

    # Verify venue exists and is paired with this LGS (Turso)
    vconn = _get_venues_conn()
    venue = vconn.execute(
        "SELECT venue_id, lgs_id FROM venues WHERE venue_id = ?",
        (req.venue_id,),
    ).fetchone()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    if venue["lgs_id"] != lgs_id:
        raise HTTPException(
            status_code=409,
            detail="Venue is not paired with this LGS",
        )

    vconn.execute(
        "UPDATE venues SET lgs_id = NULL WHERE venue_id = ?",
        (req.venue_id,),
    )
    vconn.commit()

    return {
        "venue_id": req.venue_id,
        "lgs_id": None,
        "message": "Venue unpaired from LGS. Inventory and pricing data preserved.",
    }


@router.get("/lgs")
async def list_lgs(_user: dict = Depends(get_current_super_admin)):
    """List all LGS partners with venue counts."""
    local = _get_local_conn()
    try:
        rows = local.execute(
            "SELECT * FROM lgs_partners ORDER BY created_at DESC"
        ).fetchall()

        vconn = _get_venues_conn()
        partners = []
        for row in rows:
            venue_count = vconn.execute(
                "SELECT COUNT(*) as cnt FROM venues WHERE lgs_id = ?",
                (row["id"],),
            ).fetchone()["cnt"]

            partners.append({
                "id": row["id"],
                "name": row["name"],
                "contact_name": row["contact_name"],
                "contact_email": row["contact_email"],
                "status": row["status"],
                "stripe_onboarding_complete": row["stripe_onboarding_complete"],
                "venue_count": venue_count,
                "created_at": row["created_at"],
            })

        return {"lgs_partners": partners}
    finally:
        local.close()


@router.get("/lgs/{lgs_id}")
async def get_lgs(lgs_id: str, _user: dict = Depends(get_current_super_admin)):
    """Get a single LGS partner with their paired venues."""
    local = _get_local_conn()
    try:
        row = local.execute(
            "SELECT * FROM lgs_partners WHERE id = ?", (lgs_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="LGS not found")

        # Get paired venues (Turso)
        vconn = _get_venues_conn()
        venues = vconn.execute(
            "SELECT venue_id, venue_name, subscription_tier, status FROM venues WHERE lgs_id = ?",
            (lgs_id,),
        ).fetchall()

        return {
            "id": row["id"],
            "name": row["name"],
            "contact_name": row["contact_name"],
            "contact_email": row["contact_email"],
            "contact_phone": row["contact_phone"],
            "address": row["address"],
            "stripe_account_id": row["stripe_account_id"],
            "stripe_onboarding_complete": row["stripe_onboarding_complete"],
            "status": row["status"],
            "telegram_chat_id": row["telegram_chat_id"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "venues": [
                {
                    "id": v["venue_id"],
                    "name": v["venue_name"],
                    "tier": v["subscription_tier"],
                    "status": v["status"],
                }
                for v in venues
            ],
        }
    finally:
        local.close()
