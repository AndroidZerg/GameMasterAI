"""Venue subscription endpoints — Stripe checkout, upgrade, status."""

import os
import sqlite3
import uuid
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_venue_admin
from app.core.config import (
    DB_PATH,
    STRIPE_SECRET_KEY,
    STRIPE_PRICE_STARTER,
    STRIPE_PRICE_STANDARD,
    STRIPE_PRICE_PREMIUM,
)

router = APIRouter(prefix="/api/v1/venues", tags=["venue-subscriptions"])

stripe.api_key = STRIPE_SECRET_KEY

TIER_CONFIG = {
    "starter": {"price_id": STRIPE_PRICE_STARTER, "seat_limit": 10, "price_display": "$149/mo"},
    "standard": {"price_id": STRIPE_PRICE_STANDARD, "seat_limit": 25, "price_display": "$299/mo"},
    "premium": {"price_id": STRIPE_PRICE_PREMIUM, "seat_limit": -1, "price_display": "$499/mo"},
}


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _generate_id() -> str:
    try:
        import ulid
        return str(ulid.new())
    except ImportError:
        return str(uuid.uuid4())


class SubscribeRequest(BaseModel):
    tier: str


@router.post("/{venue_id}/subscribe")
async def subscribe_venue(venue_id: str, req: SubscribeRequest,
                          user: dict = Depends(get_current_venue_admin)):
    """Create or upgrade a venue's Stripe subscription."""
    # Auth: venue_admin can only modify their own venue
    if user.get("role") != "super_admin" and user.get("venue_id") != venue_id:
        raise HTTPException(status_code=403, detail="Not authorized for this venue")

    tier = req.tier.lower()
    if tier not in TIER_CONFIG:
        raise HTTPException(status_code=400, detail=f"Invalid tier: {tier}. Must be starter, standard, or premium")

    tier_info = TIER_CONFIG[tier]
    new_seat_limit = tier_info["seat_limit"]

    conn = _get_conn()
    try:
        venue = conn.execute(
            "SELECT venue_id, venue_name, email, lgs_id, stripe_customer_id, "
            "stripe_subscription_id, subscription_tier, game_seat_limit FROM venues WHERE venue_id = ?",
            (venue_id,),
        ).fetchone()
        if not venue:
            raise HTTPException(status_code=404, detail="Venue not found")

        # --- Downgrade check ---
        current_limit = venue["game_seat_limit"] or 10
        if new_seat_limit != -1 and new_seat_limit < current_limit:
            active_count = conn.execute(
                "SELECT COUNT(*) as cnt FROM venue_games WHERE venue_id = ? AND is_active = 1",
                (venue_id,),
            ).fetchone()["cnt"]
            if active_count > new_seat_limit:
                raise HTTPException(status_code=409, detail={
                    "error": "Cannot downgrade. Deactivate games first.",
                    "seats_used": active_count,
                    "new_limit": new_seat_limit,
                    "must_deactivate": active_count - new_seat_limit,
                })

        # --- Find or create Stripe Customer ---
        stripe_customer_id = venue["stripe_customer_id"]
        if not stripe_customer_id:
            customer = stripe.Customer.create(
                email=venue["email"],
                name=venue["venue_name"],
                metadata={"gmg_venue_id": venue_id},
            )
            stripe_customer_id = customer.id
            conn.execute(
                "UPDATE venues SET stripe_customer_id = ? WHERE venue_id = ?",
                (stripe_customer_id, venue_id),
            )
            conn.commit()

        # --- New subscription (Stripe Checkout) ---
        if not venue["stripe_subscription_id"]:
            session = stripe.checkout.Session.create(
                customer=stripe_customer_id,
                line_items=[{"price": tier_info["price_id"], "quantity": 1}],
                mode="subscription",
                subscription_data={
                    "trial_period_days": 14,
                    "metadata": {
                        "gmg_venue_id": venue_id,
                        "tier": tier,
                        "lgs_id": venue["lgs_id"] or "",
                    },
                },
                success_url="https://playgmg.com/admin/dashboard?subscribed=true",
                cancel_url="https://playgmg.com/admin/dashboard?cancelled=true",
                metadata={"gmg_venue_id": venue_id, "tier": tier},
            )
            return {"checkout_url": session.url, "session_id": session.id}

        # --- Upgrade existing subscription ---
        sub = stripe.Subscription.retrieve(venue["stripe_subscription_id"])
        stripe.Subscription.modify(
            sub.id,
            items=[{
                "id": sub["items"]["data"][0].id,
                "price": tier_info["price_id"],
            }],
            proration_behavior="create_prorations",
            metadata={
                "gmg_venue_id": venue_id,
                "tier": tier,
                "lgs_id": venue["lgs_id"] or "",
            },
        )

        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "UPDATE venues SET subscription_tier = ?, game_seat_limit = ?, updated_at = ? WHERE venue_id = ?",
            (tier, new_seat_limit, now, venue_id),
        )
        conn.commit()

        return {"upgraded": True, "new_tier": tier, "new_seat_limit": new_seat_limit}

    finally:
        conn.close()


@router.get("/{venue_id}/subscription-status")
async def subscription_status(venue_id: str, user: dict = Depends(get_current_venue_admin)):
    """Get current subscription state for venue settings UI."""
    if user.get("role") != "super_admin" and user.get("venue_id") != venue_id:
        raise HTTPException(status_code=403, detail="Not authorized for this venue")

    conn = _get_conn()
    try:
        venue = conn.execute(
            "SELECT subscription_tier, game_seat_limit, subscription_status, "
            "current_period_end, stripe_subscription_id FROM venues WHERE venue_id = ?",
            (venue_id,),
        ).fetchone()
        if not venue:
            raise HTTPException(status_code=404, detail="Venue not found")

        seats_used = conn.execute(
            "SELECT COUNT(*) as cnt FROM venue_games WHERE venue_id = ? AND is_active = 1",
            (venue_id,),
        ).fetchone()["cnt"]

        tier = venue["subscription_tier"] or "starter"
        seat_limit = venue["game_seat_limit"] if venue["game_seat_limit"] is not None else 10
        seats_remaining = -1 if seat_limit == -1 else max(0, seat_limit - seats_used)

        # Try to get trial info from Stripe if we have a subscription
        trial_ends_at = None
        if venue["stripe_subscription_id"] and STRIPE_SECRET_KEY:
            try:
                sub = stripe.Subscription.retrieve(venue["stripe_subscription_id"])
                if sub.trial_end:
                    trial_ends_at = datetime.fromtimestamp(
                        sub.trial_end, tz=timezone.utc
                    ).isoformat()
            except Exception:
                pass

        return {
            "tier": tier,
            "seat_limit": seat_limit,
            "seats_used": seats_used,
            "seats_remaining": seats_remaining,
            "subscription_status": venue["subscription_status"] or "trialing",
            "current_period_end": venue["current_period_end"],
            "trial_ends_at": trial_ends_at,
            "tier_config": TIER_CONFIG,
        }
    finally:
        conn.close()
