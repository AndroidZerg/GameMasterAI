"""Customer-facing game purchase and staff fulfillment endpoints."""

import os
import sqlite3
import uuid
from datetime import datetime, timezone

import httpx
import stripe
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_venue_admin
from app.core.config import DB_PATH, STRIPE_SECRET_KEY

router = APIRouter(prefix="/api/v1/venues", tags=["shop"])

stripe.api_key = STRIPE_SECRET_KEY

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

# 24 hours in minutes — auto-refund threshold
AUTO_REFUND_MINUTES = 1440


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


def _check_venue_access(user: dict, venue_id: str):
    """Ensure user can access this venue."""
    if user.get("role") != "super_admin" and user.get("venue_id") != venue_id:
        raise HTTPException(status_code=403, detail="Not authorized for this venue")


def _auto_refund_stale(conn, venue_id: str):
    """Auto-refund any purchase pending > 24 hours. Lazy cleanup on read."""
    now = datetime.now(timezone.utc)
    stale = conn.execute(
        """SELECT id, stripe_payment_intent_id, game_id, game_title
           FROM game_purchases
           WHERE venue_id = ? AND fulfillment_status = 'pending'""",
        (venue_id,),
    ).fetchall()

    for p in stale:
        created = conn.execute(
            "SELECT created_at FROM game_purchases WHERE id = ?", (p["id"],)
        ).fetchone()
        if not created or not created["created_at"]:
            continue
        try:
            created_dt = datetime.fromisoformat(created["created_at"])
            if created_dt.tzinfo is None:
                created_dt = created_dt.replace(tzinfo=timezone.utc)
            minutes_waiting = (now - created_dt).total_seconds() / 60
        except (ValueError, TypeError):
            continue

        if minutes_waiting > AUTO_REFUND_MINUTES:
            now_iso = now.isoformat()
            try:
                stripe.Refund.create(payment_intent=p["stripe_payment_intent_id"])
            except Exception:
                pass  # Refund may already exist or PI not capturable
            conn.execute(
                """UPDATE game_purchases
                   SET fulfillment_status = 'refunded', refunded_at = ?
                   WHERE id = ?""",
                (now_iso, p["id"]),
            )
            # Restore stock
            conn.execute(
                """UPDATE venue_game_inventory
                   SET stock_count = stock_count + 1, updated_at = ?
                   WHERE venue_id = ? AND game_id = ?""",
                (now_iso, venue_id, p["game_id"]),
            )
            conn.commit()
            _telegram_notify(
                f"Auto-refund: {p['game_title']} purchase at venue {venue_id} "
                f"was pending > 24h"
            )


# ---------------------------------------------------------------------------
# Public endpoints (no auth — customer tablets)
# ---------------------------------------------------------------------------

@router.get("/{venue_id}/shop")
async def get_shop_catalog(venue_id: str):
    """Return all games available for purchase at this venue."""
    conn = _get_conn()
    try:
        venue = conn.execute(
            "SELECT venue_id, venue_name, purchases_enabled, lgs_id FROM venues WHERE venue_id = ?",
            (venue_id,),
        ).fetchone()
        if not venue:
            raise HTTPException(status_code=404, detail="Venue not found")
        if not venue["purchases_enabled"]:
            raise HTTPException(status_code=403, detail="Purchases not enabled at this venue")

        lgs_id = venue["lgs_id"]
        if not lgs_id:
            return {"venue_name": venue["venue_name"], "purchases_enabled": True, "games": []}

        rows = conn.execute(
            """SELECT vg.game_id,
                      COALESCE(g.title, vg.game_id) as title,
                      COALESCE(g.complexity, '') as complexity,
                      g.player_count_min, g.player_count_max,
                      lgp.retail_price_cents as price_cents,
                      COALESCE(inv.stock_count, 0) as stock_count
               FROM venue_games vg
               JOIN lgs_game_pricing lgp ON lgp.game_id = vg.game_id AND lgp.lgs_id = ?
               LEFT JOIN games g ON g.game_id = vg.game_id
               LEFT JOIN venue_game_inventory inv ON inv.venue_id = vg.venue_id AND inv.game_id = vg.game_id
               WHERE vg.venue_id = ? AND vg.is_active = 1
                 AND lgp.is_available = 1 AND lgp.retail_price_cents > 0""",
            (lgs_id, venue_id),
        ).fetchall()

        games = []
        for r in rows:
            game = {
                "game_id": r["game_id"],
                "title": r["title"],
                "complexity": r["complexity"],
                "price_cents": r["price_cents"],
                "in_stock": r["stock_count"] > 0,
                "stock_count": r["stock_count"],
            }
            if r["player_count_min"] or r["player_count_max"]:
                game["player_count"] = {
                    "min": r["player_count_min"] or 0,
                    "max": r["player_count_max"] or 0,
                }
            games.append(game)

        return {
            "venue_name": venue["venue_name"],
            "purchases_enabled": True,
            "games": games,
        }
    finally:
        conn.close()


class PurchaseRequest(BaseModel):
    game_id: str
    customer_email: str
    customer_name: str = ""


@router.post("/{venue_id}/shop/purchase")
async def create_purchase(venue_id: str, req: PurchaseRequest):
    """Create a Stripe PaymentIntent for a game purchase (guest checkout)."""
    conn = _get_conn()
    try:
        venue = conn.execute(
            "SELECT venue_id, venue_name, purchases_enabled, lgs_id FROM venues WHERE venue_id = ?",
            (venue_id,),
        ).fetchone()
        if not venue:
            raise HTTPException(status_code=404, detail="Venue not found")
        if not venue["purchases_enabled"]:
            raise HTTPException(status_code=403, detail="Purchases not enabled at this venue")

        lgs_id = venue["lgs_id"]
        if not lgs_id:
            raise HTTPException(status_code=503, detail="Purchases temporarily unavailable")

        # Check stock
        inv = conn.execute(
            "SELECT stock_count FROM venue_game_inventory WHERE venue_id = ? AND game_id = ?",
            (venue_id, req.game_id),
        ).fetchone()
        if not inv or inv["stock_count"] <= 0:
            raise HTTPException(status_code=409, detail="Out of stock")

        # Get LGS price
        pricing = conn.execute(
            "SELECT retail_price_cents FROM lgs_game_pricing WHERE lgs_id = ? AND game_id = ? AND is_available = 1",
            (lgs_id, req.game_id),
        ).fetchone()
        if not pricing or pricing["retail_price_cents"] <= 0:
            raise HTTPException(status_code=404, detail="Game not available for purchase")

        price_cents = pricing["retail_price_cents"]

        # Check LGS Stripe account
        lgs = conn.execute(
            "SELECT id, stripe_account_id, stripe_onboarding_complete FROM lgs_partners WHERE id = ?",
            (lgs_id,),
        ).fetchone()
        if not lgs or not lgs["stripe_account_id"] or not lgs["stripe_onboarding_complete"]:
            raise HTTPException(status_code=503, detail="Purchases temporarily unavailable")

        # Get game title
        game_row = conn.execute(
            "SELECT title FROM games WHERE game_id = ?", (req.game_id,)
        ).fetchone()
        game_title = game_row["title"] if game_row else req.game_id

        # Calculate fees: 10% GMG, 90% LGS
        gmg_fee_cents = round(price_cents * 0.10)
        lgs_payout_cents = price_cents - gmg_fee_cents

        # Create Stripe PaymentIntent with destination charge
        try:
            payment_intent = stripe.PaymentIntent.create(
                amount=price_cents,
                currency="usd",
                application_fee_amount=gmg_fee_cents,
                transfer_data={"destination": lgs["stripe_account_id"]},
                receipt_email=req.customer_email,
                metadata={
                    "gmg_venue_id": venue_id,
                    "gmg_game_id": req.game_id,
                    "gmg_lgs_id": lgs_id,
                },
            )
        except stripe.StripeError as e:
            raise HTTPException(status_code=502, detail=f"Payment setup failed: {e.user_message or str(e)}")

        now = datetime.now(timezone.utc).isoformat()
        purchase_id = _generate_id()

        # Create purchase record
        conn.execute(
            """INSERT INTO game_purchases
                (id, venue_id, lgs_id, game_id, game_title, customer_email, customer_name,
                 price_cents, gmg_fee_cents, lgs_payout_cents,
                 stripe_payment_intent_id, fulfillment_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)""",
            (purchase_id, venue_id, lgs_id, req.game_id, game_title,
             req.customer_email, req.customer_name or "",
             price_cents, gmg_fee_cents, lgs_payout_cents,
             payment_intent.id, now),
        )

        # Decrement stock
        conn.execute(
            """UPDATE venue_game_inventory
               SET stock_count = stock_count - 1, updated_at = ?
               WHERE venue_id = ? AND game_id = ?""",
            (now, venue_id, req.game_id),
        )
        conn.commit()

        # Check if low stock → Telegram alert
        new_inv = conn.execute(
            "SELECT stock_count, restock_threshold FROM venue_game_inventory WHERE venue_id = ? AND game_id = ?",
            (venue_id, req.game_id),
        ).fetchone()
        if new_inv and new_inv["stock_count"] <= new_inv["restock_threshold"]:
            _telegram_notify(
                f"Low stock alert: {game_title} at {venue['venue_name']} "
                f"— {new_inv['stock_count']} copies remaining"
            )

        return {
            "client_secret": payment_intent.client_secret,
            "purchase_id": purchase_id,
            "amount_cents": price_cents,
            "game_title": game_title,
        }
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Venue-admin endpoints (authenticated)
# ---------------------------------------------------------------------------

class FulfillmentRequest(BaseModel):
    purchase_id: str


@router.post("/{venue_id}/shop/fulfill")
async def fulfill_purchase(venue_id: str, req: FulfillmentRequest,
                           user: dict = Depends(get_current_venue_admin)):
    """Venue staff confirms game was handed to customer."""
    _check_venue_access(user, venue_id)

    conn = _get_conn()
    try:
        purchase = conn.execute(
            "SELECT * FROM game_purchases WHERE id = ? AND venue_id = ?",
            (req.purchase_id, venue_id),
        ).fetchone()
        if not purchase:
            raise HTTPException(status_code=404, detail="Purchase not found")
        if purchase["fulfillment_status"] != "pending":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot fulfill — status is '{purchase['fulfillment_status']}'",
            )

        now = datetime.now(timezone.utc).isoformat()

        conn.execute(
            """UPDATE game_purchases
               SET fulfillment_status = 'fulfilled', fulfilled_at = ?
               WHERE id = ?""",
            (now, req.purchase_id),
        )

        # Log to transfer log (actual Stripe transfer already happened via destination charge)
        conn.execute(
            """INSERT INTO lgs_transfer_log
                (id, lgs_id, transfer_type, source_id, amount_cents,
                 stripe_transfer_id, status, created_at)
            VALUES (?, ?, 'game_sale_payout', ?, ?, ?, 'completed', ?)""",
            (_generate_id(), purchase["lgs_id"], req.purchase_id,
             purchase["lgs_payout_cents"],
             purchase["stripe_payment_intent_id"], now),
        )
        conn.commit()

        return {
            "purchase_id": req.purchase_id,
            "fulfillment_status": "fulfilled",
            "fulfilled_at": now,
            "game_title": purchase["game_title"],
        }
    finally:
        conn.close()


@router.post("/{venue_id}/shop/fulfillment-failed")
async def fulfillment_failed(venue_id: str, req: FulfillmentRequest,
                             user: dict = Depends(get_current_venue_admin)):
    """Staff reports game missing — issue refund and restore stock."""
    _check_venue_access(user, venue_id)

    conn = _get_conn()
    try:
        purchase = conn.execute(
            "SELECT * FROM game_purchases WHERE id = ? AND venue_id = ?",
            (req.purchase_id, venue_id),
        ).fetchone()
        if not purchase:
            raise HTTPException(status_code=404, detail="Purchase not found")
        if purchase["fulfillment_status"] != "pending":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot refund — status is '{purchase['fulfillment_status']}'",
            )

        now = datetime.now(timezone.utc).isoformat()

        # Issue Stripe refund
        try:
            stripe.Refund.create(payment_intent=purchase["stripe_payment_intent_id"])
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Stripe refund failed: {e}")

        conn.execute(
            """UPDATE game_purchases
               SET fulfillment_status = 'refunded', refunded_at = ?
               WHERE id = ?""",
            (now, req.purchase_id),
        )

        # Restore stock
        conn.execute(
            """UPDATE venue_game_inventory
               SET stock_count = stock_count + 1, updated_at = ?
               WHERE venue_id = ? AND game_id = ?""",
            (now, venue_id, purchase["game_id"]),
        )
        conn.commit()

        # Get venue name for notification
        venue = conn.execute(
            "SELECT venue_name FROM venues WHERE venue_id = ?", (venue_id,)
        ).fetchone()
        venue_name = venue["venue_name"] if venue else venue_id

        _telegram_notify(
            f"Fulfillment failed at {venue_name} for {purchase['game_title']} "
            f"— inventory discrepancy"
        )

        return {
            "purchase_id": req.purchase_id,
            "fulfillment_status": "refunded",
            "refunded_at": now,
            "game_title": purchase["game_title"],
        }
    finally:
        conn.close()


@router.get("/{venue_id}/shop/pending-fulfillments")
async def get_pending_fulfillments(venue_id: str,
                                   user: dict = Depends(get_current_venue_admin)):
    """Return purchases awaiting staff fulfillment. Auto-refunds stale ones."""
    _check_venue_access(user, venue_id)

    conn = _get_conn()
    try:
        # Lazy cleanup: auto-refund anything pending > 24 hours
        _auto_refund_stale(conn, venue_id)

        rows = conn.execute(
            """SELECT id as purchase_id, game_title, customer_name, customer_email,
                      price_cents, created_at
               FROM game_purchases
               WHERE venue_id = ? AND fulfillment_status = 'pending'
               ORDER BY created_at ASC""",
            (venue_id,),
        ).fetchall()

        now = datetime.now(timezone.utc)
        pending = []
        for r in rows:
            minutes_waiting = 0
            if r["created_at"]:
                try:
                    created_dt = datetime.fromisoformat(r["created_at"])
                    if created_dt.tzinfo is None:
                        created_dt = created_dt.replace(tzinfo=timezone.utc)
                    minutes_waiting = round((now - created_dt).total_seconds() / 60)
                except (ValueError, TypeError):
                    pass
            pending.append({
                "purchase_id": r["purchase_id"],
                "game_title": r["game_title"],
                "customer_name": r["customer_name"],
                "customer_email": r["customer_email"],
                "price_cents": r["price_cents"],
                "purchased_at": r["created_at"],
                "minutes_waiting": minutes_waiting,
            })

        return {"pending": pending}
    finally:
        conn.close()
