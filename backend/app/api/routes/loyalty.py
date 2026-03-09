"""Loyalty member management for Thai House dashboard."""

import json
import logging
import os

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional

from app.services.turso import get_menu_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["loyalty"])

STAFF_PIN = os.getenv("DRINK_CLUB_STAFF_PIN", "1234")


def _verify_pin(pin: Optional[str]):
    if not pin or pin != STAFF_PIN:
        raise HTTPException(status_code=403, detail="Invalid PIN")


@router.get("/loyalty/members")
async def list_members(x_staff_pin: Optional[str] = Header(None)):
    """All loyalty members with stats."""
    _verify_pin(x_staff_pin)
    db = get_menu_db()

    rows = db.execute(
        """SELECT id, name, phone, email, points, total_spent, visits,
                  last_visit, created_at
           FROM loyalty_members ORDER BY last_visit DESC LIMIT 200"""
    ).fetchall()

    members = []
    for r in rows:
        members.append({
            "id": r[0], "name": r[1], "phone": r[2], "email": r[3],
            "points": r[4], "total_spent": r[5], "visits": r[6],
            "last_visit": r[7], "created_at": r[8],
        })
    return {"members": members}


@router.get("/loyalty/members/{phone}")
async def get_member(phone: str, x_staff_pin: Optional[str] = Header(None)):
    """Single member detail + recent orders."""
    _verify_pin(x_staff_pin)
    db = get_menu_db()

    row = db.execute(
        """SELECT id, name, phone, email, points, total_spent, visits,
                  last_visit, created_at
           FROM loyalty_members WHERE phone = ?""",
        (phone,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Member not found")

    member = {
        "id": row[0], "name": row[1], "phone": row[2], "email": row[3],
        "points": row[4], "total_spent": row[5], "visits": row[6],
        "last_visit": row[7], "created_at": row[8],
    }

    # Recent orders by this phone
    orders = db.execute(
        """SELECT order_number, items, total, created_at, order_status
           FROM venue_orders WHERE customer_phone = ? OR drink_club_phone = ?
           ORDER BY created_at DESC LIMIT 20""",
        (phone, phone)
    ).fetchall()
    member["orders"] = [
        {"order_number": o[0], "items": json.loads(o[1]) if o[1] else [],
         "total": o[2], "created_at": o[3], "status": o[4]}
        for o in orders
    ]

    return member


class CreateMemberRequest(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None


@router.post("/loyalty/members")
async def create_member(req: CreateMemberRequest,
                        x_staff_pin: Optional[str] = Header(None)):
    _verify_pin(x_staff_pin)
    db = get_menu_db()

    existing = db.execute(
        "SELECT id FROM loyalty_members WHERE phone = ?", (req.phone,)
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="Member already exists with this phone")

    db.execute(
        "INSERT INTO loyalty_members (name, phone, email) VALUES (?, ?, ?)",
        (req.name, req.phone, req.email)
    )
    db.commit()
    return {"success": True}


class RedeemRequest(BaseModel):
    reward_type: str = "free_entree"


@router.post("/loyalty/redeem/{phone}")
async def redeem_reward(phone: str, req: RedeemRequest,
                        x_staff_pin: Optional[str] = Header(None)):
    _verify_pin(x_staff_pin)
    db = get_menu_db()

    row = db.execute(
        "SELECT id, points FROM loyalty_members WHERE phone = ?", (phone,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Member not found")

    cost = 10 if req.reward_type == "free_entree" else 5
    if row[1] < cost:
        raise HTTPException(status_code=400, detail=f"Not enough points ({row[1]} < {cost})")

    db.execute(
        "UPDATE loyalty_members SET points = points - ? WHERE phone = ?",
        (cost, phone)
    )
    db.commit()
    return {"success": True, "points_remaining": row[1] - cost}


# ── Loyalty Rewards CRUD (admin) ──────────────────────────────────

class CreateRewardRequest(BaseModel):
    points_required: int
    description: str
    venue_id: str = "meetup"


class UpdateRewardRequest(BaseModel):
    points_required: Optional[int] = None
    description: Optional[str] = None
    active: Optional[bool] = None


@router.get("/loyalty/rewards")
async def list_rewards(x_staff_pin: Optional[str] = Header(None)):
    _verify_pin(x_staff_pin)
    db = get_menu_db()
    rows = db.execute(
        "SELECT id, venue_id, points_required, description, active, created_at "
        "FROM loyalty_rewards ORDER BY points_required"
    ).fetchall()
    return {"rewards": [
        {"id": r[0], "venue_id": r[1], "points_required": r[2],
         "description": r[3], "active": bool(r[4]), "created_at": r[5]}
        for r in rows
    ]}


@router.post("/loyalty/rewards")
async def create_reward(req: CreateRewardRequest,
                        x_staff_pin: Optional[str] = Header(None)):
    _verify_pin(x_staff_pin)
    db = get_menu_db()
    db.execute(
        "INSERT INTO loyalty_rewards (venue_id, points_required, description) VALUES (?, ?, ?)",
        (req.venue_id, req.points_required, req.description)
    )
    db.commit()
    return {"success": True}


@router.put("/loyalty/rewards/{reward_id}")
async def update_reward(reward_id: int, req: UpdateRewardRequest,
                        x_staff_pin: Optional[str] = Header(None)):
    _verify_pin(x_staff_pin)
    db = get_menu_db()
    existing = db.execute("SELECT id FROM loyalty_rewards WHERE id = ?", (reward_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Reward not found")

    updates = []
    params = []
    if req.points_required is not None:
        updates.append("points_required = ?")
        params.append(req.points_required)
    if req.description is not None:
        updates.append("description = ?")
        params.append(req.description)
    if req.active is not None:
        updates.append("active = ?")
        params.append(1 if req.active else 0)
    if not updates:
        return {"success": True}

    params.append(reward_id)
    db.execute(f"UPDATE loyalty_rewards SET {', '.join(updates)} WHERE id = ?", tuple(params))
    db.commit()
    return {"success": True}


@router.delete("/loyalty/rewards/{reward_id}")
async def delete_reward(reward_id: int,
                        x_staff_pin: Optional[str] = Header(None)):
    _verify_pin(x_staff_pin)
    db = get_menu_db()
    db.execute("DELETE FROM loyalty_rewards WHERE id = ?", (reward_id,))
    db.commit()
    return {"success": True}
