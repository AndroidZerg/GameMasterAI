"""Stripe webhook handler — subscription lifecycle events."""

import logging
import os
import sqlite3
import uuid
from datetime import datetime, timezone

import httpx
import stripe
from fastapi import APIRouter, Request, HTTPException

logger = logging.getLogger(__name__)

from app.core.config import DB_PATH, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
from app.models.drink_club import upsert_subscriber, update_subscriber_status
from app.services.turso import get_swp_rental_db
from app.services.discord_notify import send_discord_notification

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])

stripe.api_key = STRIPE_SECRET_KEY

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

TIER_SEATS = {"starter": 10, "standard": 25, "premium": -1}


def _get_venues_conn():
    """Turso-backed connection for the venues table."""
    from app.services.turso import get_venues_db
    return get_venues_db()


def _get_local_conn() -> sqlite3.Connection:
    """Local SQLite for non-venue tables (game_purchases, lgs_partners, etc.)."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _generate_id() -> str:
    try:
        import ulid
        return str(ulid.new())
    except ImportError:
        return str(uuid.uuid4())


def _telegram_notify(text: str):
    """Fire-and-forget Telegram notification."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    try:
        httpx.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": text},
            timeout=10,
        )
    except Exception:
        pass


def _handle_checkout_completed(session):
    """Handle checkout.session.completed — activate new subscription."""
    venue_id = (session.get("metadata") or {}).get("gmg_venue_id")
    if not venue_id:
        return

    tier = (session.get("metadata") or {}).get("tier", "starter")
    seat_limit = TIER_SEATS.get(tier, 10)
    subscription_id = session.get("subscription")
    now = datetime.now(timezone.utc).isoformat()

    vconn = _get_venues_conn()
    vconn.execute(
        """UPDATE venues SET
            subscription_tier = ?,
            game_seat_limit = ?,
            stripe_subscription_id = ?,
            subscription_status = 'trialing',
            updated_at = ?
        WHERE venue_id = ?""",
        (tier, seat_limit, subscription_id, now, venue_id),
    )
    vconn.commit()

    _telegram_notify(f"New venue subscription: {venue_id} on {tier} tier")


def _handle_invoice_succeeded(invoice):
    """Handle invoice.payment_succeeded — update status and transfer 80% to LGS."""
    subscription_id = invoice.get("subscription")
    if not subscription_id:
        return

    # Get venue_id from subscription metadata
    try:
        sub = stripe.Subscription.retrieve(subscription_id)
    except Exception:
        return

    meta = sub.get("metadata") or {}
    venue_id = meta.get("gmg_venue_id")
    lgs_id = meta.get("lgs_id")
    if not venue_id:
        return

    now = datetime.now(timezone.utc).isoformat()
    period_end = invoice.get("period_end")
    period_end_iso = None
    if period_end:
        period_end_iso = datetime.fromtimestamp(period_end, tz=timezone.utc).isoformat()

    # Update venue subscription status in Turso
    vconn = _get_venues_conn()
    vconn.execute(
        """UPDATE venues SET
            subscription_status = 'active',
            current_period_end = ?,
            updated_at = ?
        WHERE venue_id = ?""",
        (period_end_iso, now, venue_id),
    )
    vconn.commit()

    # Transfer 80% to LGS if paired (lgs_partners in local SQLite)
    if lgs_id:
        local = _get_local_conn()
        try:
            lgs = local.execute(
                "SELECT id, stripe_account_id, stripe_onboarding_complete FROM lgs_partners WHERE id = ?",
                (lgs_id,),
            ).fetchone()

            amount_paid = invoice.get("amount_paid", 0)
            invoice_id = invoice.get("id", "")

            if lgs and lgs["stripe_account_id"] and lgs["stripe_onboarding_complete"]:
                transfer_amount = round(amount_paid * 0.80)
                try:
                    transfer = stripe.Transfer.create(
                        amount=transfer_amount,
                        currency="usd",
                        destination=lgs["stripe_account_id"],
                        transfer_group=f"venue_sub_{venue_id}_{invoice_id}",
                        metadata={
                            "venue_id": venue_id,
                            "invoice_id": invoice_id,
                            "type": "subscription_split",
                        },
                    )
                    local.execute(
                        """INSERT INTO lgs_transfer_log
                            (id, lgs_id, transfer_type, source_id, amount_cents,
                             stripe_transfer_id, stripe_invoice_id, status, created_at)
                        VALUES (?, ?, 'subscription_split', ?, ?, ?, ?, 'completed', ?)""",
                        (_generate_id(), lgs_id, venue_id, transfer_amount,
                         transfer.id, invoice_id, now),
                    )
                    local.commit()
                except Exception as e:
                    _telegram_notify(f"Transfer failed for venue {venue_id}: {e}")
            elif lgs_id:
                _telegram_notify(
                    f"LGS transfer skipped — Stripe onboarding incomplete for {lgs_id}"
                )
        finally:
            local.close()


def _handle_invoice_failed(invoice):
    """Handle invoice.payment_failed — mark venue as past_due."""
    subscription_id = invoice.get("subscription")
    if not subscription_id:
        return

    now = datetime.now(timezone.utc).isoformat()
    vconn = _get_venues_conn()
    venue = vconn.execute(
        "SELECT venue_id FROM venues WHERE stripe_subscription_id = ?",
        (subscription_id,),
    ).fetchone()

    vconn.execute(
        "UPDATE venues SET subscription_status = 'past_due', updated_at = ? "
        "WHERE stripe_subscription_id = ?",
        (now, subscription_id),
    )
    vconn.commit()

    venue_id = venue["venue_id"] if venue else "unknown"
    _telegram_notify(f"Venue payment failed: {venue_id}")


def _handle_payment_intent_succeeded(payment_intent):
    """Handle payment_intent.succeeded — notify venue staff of game purchase."""
    pi_id = payment_intent.get("id")
    if not pi_id:
        return

    local = _get_local_conn()
    try:
        purchase = local.execute(
            """SELECT id, venue_id, game_title, customer_name, customer_email,
                      fulfillment_status
               FROM game_purchases WHERE stripe_payment_intent_id = ?""",
            (pi_id,),
        ).fetchone()
        if not purchase or purchase["fulfillment_status"] != "pending":
            return

        customer = purchase["customer_name"] or purchase["customer_email"]
        # Venue name from Turso
        vconn = _get_venues_conn()
        venue = vconn.execute(
            "SELECT venue_name FROM venues WHERE venue_id = ?",
            (purchase["venue_id"],),
        ).fetchone()
        venue_name = venue["venue_name"] if venue else purchase["venue_id"]

        _telegram_notify(
            f"New purchase: {purchase['game_title']} at {venue_name} "
            f"— please hand to customer ({customer})"
        )
    finally:
        local.close()


def _handle_charge_refunded(charge):
    """Handle charge.refunded — mark purchase refunded and restore stock."""
    pi_id = charge.get("payment_intent")
    if not pi_id:
        return

    local = _get_local_conn()
    try:
        purchase = local.execute(
            """SELECT id, venue_id, game_id, fulfillment_status
               FROM game_purchases WHERE stripe_payment_intent_id = ?""",
            (pi_id,),
        ).fetchone()
        if not purchase:
            return
        # Only update if still pending (fulfilled purchases shouldn't revert)
        if purchase["fulfillment_status"] != "pending":
            return

        now = datetime.now(timezone.utc).isoformat()
        local.execute(
            """UPDATE game_purchases
               SET fulfillment_status = 'refunded', refunded_at = ?
               WHERE id = ?""",
            (now, purchase["id"]),
        )
        local.execute(
            """UPDATE venue_game_inventory
               SET stock_count = stock_count + 1, updated_at = ?
               WHERE venue_id = ? AND game_id = ?""",
            (now, purchase["venue_id"], purchase["game_id"]),
        )
        local.commit()
    finally:
        local.close()


def _handle_subscription_deleted(subscription):
    """Handle customer.subscription.deleted — mark canceled but don't deactivate games."""
    sub_id = subscription.get("id")
    if not sub_id:
        return

    now = datetime.now(timezone.utc).isoformat()
    vconn = _get_venues_conn()
    venue = vconn.execute(
        "SELECT venue_id FROM venues WHERE stripe_subscription_id = ?",
        (sub_id,),
    ).fetchone()

    vconn.execute(
        "UPDATE venues SET subscription_status = 'canceled', updated_at = ? "
        "WHERE stripe_subscription_id = ?",
        (now, sub_id),
    )
    vconn.commit()

    venue_id = venue["venue_id"] if venue else "unknown"
    _telegram_notify(f"Venue subscription canceled: {venue_id}")


def _is_rental_checkout(metadata: dict) -> bool:
    """Check if checkout session metadata indicates a rental subscription."""
    return bool(
        metadata.get("rental") or metadata.get("rental_subscription")
        or metadata.get("product") == "game_rental"
        or metadata.get("type") == "game_rental"
    )


async def _handle_rental_checkout(session):
    """Rental checkout.session.completed — create subscriber record."""
    email = (session.get("customer_details") or {}).get("email", "")
    name = (session.get("customer_details") or {}).get("name", "")
    phone = (session.get("customer_details") or {}).get("phone", "")
    customer_id = session.get("customer", "")
    subscription_id = session.get("subscription", "")
    meta = session.get("metadata") or {}

    if not email:
        email = meta.get("email", "")
    if not name:
        name = meta.get("name", email)
    if not phone:
        phone = meta.get("phone", "")

    if not customer_id:
        logger.warning("[RENTAL WEBHOOK] No customer_id in checkout session")
        return

    db = get_swp_rental_db()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    # Check if subscriber already exists
    existing = db.execute(
        "SELECT id FROM rental_subscribers_swp WHERE stripe_customer_id = ?",
        (customer_id,),
    ).fetchone()

    if existing:
        db.execute(
            """UPDATE rental_subscribers_swp
               SET stripe_subscription_id = ?, email = ?, name = ?, phone = ?,
                   status = 'active', updated_at = ?
               WHERE stripe_customer_id = ?""",
            (subscription_id, email.lower(), name, phone, now, customer_id),
        )
    else:
        db.execute(
            """INSERT INTO rental_subscribers_swp
               (stripe_customer_id, stripe_subscription_id, email, name, phone,
                venue_id, status, credit_used, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, 'shallweplay', 'active', 0, ?, ?)""",
            (customer_id, subscription_id, email.lower(), name, phone, now, now),
        )
    db.commit()

    logger.info("[RENTAL WEBHOOK] Subscriber created/updated: %s (%s)", name, email)
    await send_discord_notification(f"\U0001f389 New Subscriber: {name} ({email})")


async def _handle_rental_subscription_deleted(subscription):
    """Handle rental subscription cancellation."""
    sub_id = subscription.get("id", "")
    if not sub_id:
        return

    db = get_swp_rental_db()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    sub = db.execute(
        "SELECT * FROM rental_subscribers_swp WHERE stripe_subscription_id = ?",
        (sub_id,),
    ).fetchone()

    if not sub:
        return

    # Get name — handle tuple or dict
    name = sub["name"] if hasattr(sub, "keys") else sub[4]

    db.execute(
        "UPDATE rental_subscribers_swp SET status = 'cancelled', updated_at = ? WHERE stripe_subscription_id = ?",
        (now, sub_id),
    )
    db.commit()

    logger.info("[RENTAL WEBHOOK] Subscription cancelled: %s", name)
    await send_discord_notification(f"\U0001f44b Subscription Cancelled: {name}")


async def _handle_rental_payment_failed(invoice):
    """Handle rental subscription payment failure."""
    sub_id = invoice.get("subscription", "")
    if not sub_id:
        return

    db = get_swp_rental_db()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    sub = db.execute(
        "SELECT * FROM rental_subscribers_swp WHERE stripe_subscription_id = ?",
        (sub_id,),
    ).fetchone()

    if not sub:
        return

    name = sub["name"] if hasattr(sub, "keys") else sub[4]

    db.execute(
        "UPDATE rental_subscribers_swp SET status = 'past_due', updated_at = ? WHERE stripe_subscription_id = ?",
        (now, sub_id),
    )
    db.commit()

    logger.info("[RENTAL WEBHOOK] Payment failed: %s", name)
    await send_discord_notification(f"\u26a0\ufe0f Payment Failed: {name}")


def _is_drink_club_checkout(metadata: dict) -> bool:
    """Check if checkout session metadata indicates a Drink Club subscription.

    Accepts multiple metadata formats to handle different Stripe configurations:
    - {"drink_club": "true"} or {"drink_club": true}
    - {"product": "drink_club"}
    - {"type": "drink_club"}
    """
    return bool(
        metadata.get("drink_club")
        or metadata.get("product") == "drink_club"
        or metadata.get("type") == "drink_club"
    )


@router.post("/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events with signature verification."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    logger.info("[STRIPE WEBHOOK] Received event, sig present: %s", bool(sig_header))

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
        logger.info("[STRIPE WEBHOOK] Signature verified OK, event type: %s", event.get("type"))
    except stripe.SignatureVerificationError as e:
        logger.error("[STRIPE WEBHOOK] Signature verification FAILED: %s", e)
        raise HTTPException(status_code=400, detail="Invalid signature")
    except ValueError as e:
        logger.error("[STRIPE WEBHOOK] Invalid payload: %s", e)
        raise HTTPException(status_code=400, detail="Invalid payload")

    event_type = event.get("type", "")
    data_object = event.get("data", {}).get("object", {})

    if event_type == "checkout.session.completed":
        meta = (data_object.get("metadata") or {})
        customer_details = data_object.get("customer_details") or {}
        logger.info("[STRIPE WEBHOOK] checkout.session.completed — metadata=%s", meta)
        logger.info("[STRIPE WEBHOOK] customer_email=%s customer_name=%s",
                     customer_details.get("email"), customer_details.get("name"))

        if _is_rental_checkout(meta):
            logger.info("[STRIPE WEBHOOK] Routing to rental handler")
            await _handle_rental_checkout(data_object)
        elif _is_drink_club_checkout(meta):
            logger.info("[STRIPE WEBHOOK] Routing to drink club handler")
            _handle_drink_club_checkout(data_object)
        else:
            logger.warning("[STRIPE WEBHOOK] No drink_club/rental metadata (keys: %s) — routing to venue handler",
                           list(meta.keys()))
            _handle_checkout_completed(data_object)
    elif event_type == "invoice.payment_succeeded":
        _handle_invoice_succeeded(data_object)
    elif event_type == "invoice.payment_failed":
        _handle_invoice_failed(data_object)
        _handle_drink_club_sub_event(data_object, "past_due")
        await _handle_rental_payment_failed(data_object)
    elif event_type == "customer.subscription.updated":
        _handle_drink_club_sub_update(data_object)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(data_object)
        _handle_drink_club_sub_event(data_object, "canceled")
        await _handle_rental_subscription_deleted(data_object)
    elif event_type == "payment_intent.succeeded":
        _handle_payment_intent_succeeded(data_object)
    elif event_type == "charge.refunded":
        _handle_charge_refunded(data_object)
    else:
        logger.info("[STRIPE WEBHOOK] Unhandled event type: %s", event_type)

    return {"received": True}


# ── Drink Club webhook handlers ──────────────────────────────────

def _handle_drink_club_checkout(session):
    """Drink club checkout.session.completed — create subscriber record."""
    import secrets
    meta = session.get("metadata") or {}
    email = (session.get("customer_details") or {}).get("email", "")
    name = (session.get("customer_details") or {}).get("name", "")
    phone_from_checkout = (session.get("customer_details") or {}).get("phone", "")
    if not email:
        email = meta.get("email", "")
    if not name:
        name = meta.get("name", email)

    customer_id = session.get("customer", "")
    subscription_id = session.get("subscription", "")
    qr_code = secrets.token_urlsafe(16)

    phone = meta.get("phone", "") or phone_from_checkout
    logger.info("[STRIPE WEBHOOK] Creating drink club subscriber: name=%s email=%s phone=%s customer=%s sub=%s",
                name, email, phone, customer_id, subscription_id)
    try:
        sub_id = upsert_subscriber(
            name=name,
            email=email.lower() if email else "",
            phone=phone,
            stripe_customer_id=customer_id,
            stripe_subscription_id=subscription_id,
            qr_code=qr_code,
            status="active",
        )
        logger.info("[STRIPE WEBHOOK] Drink club subscriber created/updated, id=%s", sub_id)
    except Exception as e:
        logger.error("[STRIPE WEBHOOK] FAILED to create subscriber: %s", e, exc_info=True)
        _telegram_notify(f"FAILED to create Cha Club member: {name} ({email}) — {e}")
        return
    _telegram_notify(f"New Cha Club member: {name} ({email})")


def _handle_drink_club_sub_update(subscription):
    """customer.subscription.updated — update drink club subscriber status."""
    meta = (subscription.get("metadata") or {})
    if not meta.get("drink_club"):
        return
    sub_id = subscription.get("id", "")
    status = subscription.get("status", "active")
    status_map = {"active": "active", "past_due": "past_due",
                  "canceled": "canceled", "unpaid": "past_due",
                  "trialing": "active"}
    update_subscriber_status(sub_id, status_map.get(status, status))


def _handle_drink_club_sub_event(data_object, new_status: str):
    """Generic handler for drink club subscription lifecycle events."""
    sub_id = data_object.get("subscription") or data_object.get("id", "")
    if not sub_id:
        return
    try:
        sub = stripe.Subscription.retrieve(sub_id)
    except Exception:
        return
    meta = (sub.get("metadata") or {})
    if not meta.get("drink_club"):
        return
    update_subscriber_status(sub_id, new_status)
