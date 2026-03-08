"""Drink Club API — member lookup, staff search, redemption, phone verify."""

import os
import logging

import stripe
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from app.core.config import STRIPE_SECRET_KEY
from app.models.drink_club import (
    get_subscriber_by_email, get_subscriber_by_phone, get_subscriber_by_qr,
    get_subscriber_by_id, search_subscribers, get_all_subscribers,
    get_week_redemption,
    get_redemption_history, create_redemption, _current_week_start,
    update_subscriber_phone, upsert_subscriber,
)

stripe.api_key = STRIPE_SECRET_KEY

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
async def member_lookup(email: str = Query(None), phone: str = Query(None)):
    """Look up a drink club member by email or phone."""
    if phone:
        sub = get_subscriber_by_phone(phone.strip())
    elif email:
        sub = get_subscriber_by_email(email.strip().lower())
    else:
        raise HTTPException(status_code=400, detail="Email or phone required")

    if not sub:
        raise HTTPException(status_code=404, detail="Member not found")
    info = _subscriber_response(sub)
    info["history"] = get_redemption_history(sub["id"], 10)
    return info


class PhoneVerifyRequest(BaseModel):
    phone: str


@router.post("/drink-club/verify")
async def verify_drink_club(req: PhoneVerifyRequest):
    """Verify drink club membership by phone number. Returns status + weekly redemption."""
    if not req.phone.strip():
        raise HTTPException(status_code=400, detail="Phone number required")

    sub = get_subscriber_by_phone(req.phone.strip())
    if not sub:
        return {"found": False, "status": "not_found"}

    ws = _current_week_start()
    redemption = get_week_redemption(sub["id"], ws)

    return {
        "found": True,
        "id": sub["id"],
        "name": sub["name"],
        "status": sub["subscription_status"],
        "redeemed_this_week": redemption is not None,
        "redemption": redemption,
        "week_start": ws,
    }


class SavePhoneRequest(BaseModel):
    subscriber_id: Optional[int] = None
    session_id: Optional[str] = None
    phone: str


@router.post("/drink-club/save-phone")
async def save_phone(req: SavePhoneRequest):
    """Save phone number for a subscriber (post-checkout).

    Accepts either subscriber_id (direct DB lookup) or session_id
    (Stripe checkout session → email → subscriber lookup).
    """
    sub = None

    if req.subscriber_id:
        sub = get_subscriber_by_id(req.subscriber_id)
    elif req.session_id:
        try:
            session = stripe.checkout.Session.retrieve(req.session_id)
            email = (session.get("customer_details") or {}).get("email", "")
            if email:
                sub = get_subscriber_by_email(email.lower())
        except Exception as e:
            logger.warning("Stripe session lookup failed for %s: %s", req.session_id, e)
            raise HTTPException(status_code=400, detail="Could not verify checkout session")
    else:
        raise HTTPException(status_code=400, detail="subscriber_id or session_id required")

    if not sub:
        raise HTTPException(
            status_code=404,
            detail="Subscriber not found. Your subscription may still be processing — please wait a moment and try again.",
        )
    update_subscriber_phone(sub["id"], req.phone.strip())
    return {"success": True, "subscriber_id": sub["id"]}


@router.get("/staff/members")
async def staff_list_all(x_staff_pin: str = Query(None, alias="pin")):
    """List all drink club subscribers with redemption status."""
    if x_staff_pin != DRINK_CLUB_STAFF_PIN:
        raise HTTPException(status_code=403, detail="Invalid staff PIN")
    results = get_all_subscribers()
    return {"members": [_subscriber_response(s) for s in results]}


@router.get("/staff/search")
async def staff_search(q: str = Query(...), x_staff_pin: str = Query(None, alias="pin")):
    """Search subscribers by name or phone. Requires staff PIN."""
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
    except Exception as e:
        if "UNIQUE constraint" in str(e) or "IntegrityError" in type(e).__name__:
            raise HTTPException(status_code=400, detail="Already redeemed this week")
        raise

    return {"success": True, "redemption_id": rid, "week_start": ws}


@router.get("/staff/redeem")
async def staff_redeem_qr(code: str = Query(...)):
    """QR scan landing — look up subscriber by QR code."""
    sub = get_subscriber_by_qr(code)
    if not sub:
        raise HTTPException(status_code=404, detail="Member not found")
    return _subscriber_response(sub)


class AddMemberRequest(BaseModel):
    name: str
    phone: str
    email: Optional[str] = ""
    staff_pin: str


@router.post("/staff/add-member")
async def staff_add_member(req: AddMemberRequest):
    """Manually add a Cha Club member. Requires staff PIN."""
    if req.staff_pin != DRINK_CLUB_STAFF_PIN:
        raise HTTPException(status_code=403, detail="Invalid staff PIN")
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    if not req.phone.strip():
        raise HTTPException(status_code=400, detail="Phone is required")

    import secrets
    qr_code = secrets.token_urlsafe(16)
    sub_id = upsert_subscriber(
        name=req.name.strip(),
        email=(req.email or "").strip().lower(),
        phone=req.phone.strip(),
        stripe_customer_id="manual_entry",
        qr_code=qr_code,
        status="active",
    )
    logger.info("Manual Cha Club member added: name=%s phone=%s id=%s", req.name, req.phone, sub_id)
    sub = get_subscriber_by_id(sub_id)
    if sub:
        return _subscriber_response(sub)
    return {"success": True, "subscriber_id": sub_id}
