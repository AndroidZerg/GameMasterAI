"""Drink Club API — member lookup, staff search, redemption."""

import os
import sqlite3
import logging

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from app.models.drink_club import (
    get_subscriber_by_email, get_subscriber_by_qr, get_subscriber_by_id,
    search_subscribers, get_week_redemption, get_redemption_history,
    create_redemption, _current_week_start,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/thaihouse", tags=["drink-club"])

DRINK_CLUB_STAFF_PIN = os.getenv("DRINK_CLUB_STAFF_PIN", "1234")


def _subscriber_response(sub: dict) -> dict:
    """Format subscriber with weekly redemption status."""
    ws = _current_week_start()
    redemption = get_week_redemption(sub["id"], ws)
    return {
        "id": sub["id"],
        "name": sub["name"],
        "email": sub["email"],
        "phone": sub.get("phone", ""),
        "status": sub["subscription_status"],
        "qr_code": sub.get("qr_code", ""),
        "redeemed_this_week": redemption is not None,
        "redemption": redemption,
        "week_start": ws,
    }


@router.get("/member")
async def member_lookup(email: str = Query(...)):
    """Look up a drink club member by email."""
    sub = get_subscriber_by_email(email.strip().lower())
    if not sub:
        raise HTTPException(status_code=404, detail="Member not found")
    info = _subscriber_response(sub)
    info["history"] = get_redemption_history(sub["id"], 10)
    return info


@router.get("/staff/search")
async def staff_search(q: str = Query(...), x_staff_pin: str = Query(None, alias="pin")):
    """Search subscribers by name or phone. Requires staff PIN."""
    # Accept PIN from header or query param
    from fastapi import Request
    # PIN validated below
    if not q.strip():
        raise HTTPException(status_code=400, detail="Search query required")
    results = search_subscribers(q.strip())
    return {"results": [_subscriber_response(s) for s in results]}


class RedeemRequest(BaseModel):
    subscriber_id: int
    staff_pin: str
    drink_name: Optional[str] = ""


@router.post("/staff/redeem")
async def staff_redeem(req: RedeemRequest):
    """Redeem a drink for a subscriber. Requires staff PIN."""
    if req.staff_pin != DRINK_CLUB_STAFF_PIN:
        raise HTTPException(status_code=403, detail="Invalid staff PIN")

    sub = get_subscriber_by_id(req.subscriber_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    if sub["subscription_status"] != "active":
        raise HTTPException(status_code=400, detail="Subscription is not active")

    ws = _current_week_start()
    existing = get_week_redemption(sub["id"], ws)
    if existing:
        raise HTTPException(status_code=400, detail="Already redeemed this week")

    try:
        rid = create_redemption(sub["id"], req.staff_pin, req.drink_name or "")
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Already redeemed this week")

    return {"success": True, "redemption_id": rid, "week_start": ws}


@router.get("/staff/redeem")
async def staff_redeem_qr(code: str = Query(...)):
    """QR scan landing — look up subscriber by QR code."""
    sub = get_subscriber_by_qr(code)
    if not sub:
        raise HTTPException(status_code=404, detail="Member not found")
    return _subscriber_response(sub)
