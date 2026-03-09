"""SWP Game Rental Subscription — catalog, reservations, admin, billing."""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import stripe
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import STRIPE_SECRET_KEY
from app.services.turso import get_swp_rental_db
from app.services.discord_notify import send_discord_notification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/rentals", tags=["swp-rentals"])

stripe.api_key = STRIPE_SECRET_KEY

# ── Column mappings for Turso rows (libsql returns tuples) ────────

_SUB_COLS = [
    "id", "stripe_customer_id", "stripe_subscription_id", "email", "name",
    "phone", "venue_id", "status", "credit_used", "created_at", "updated_at",
]
_INV_COLS = [
    "id", "venue_id", "game_title", "game_id", "image_url",
    "copies_total", "copies_available", "status", "current_renter_id", "created_at",
]
_RES_COLS = [
    "id", "subscriber_id", "inventory_id", "venue_id", "reservation_type",
    "pickup_deadline", "return_deadline", "status", "checked_out_at",
    "returned_at", "created_at",
]
_HIST_COLS = [
    "id", "subscriber_id", "inventory_id", "game_title",
    "checked_out_at", "returned_at", "created_at",
]


def _row(cols, row):
    """Convert a Turso/sqlite row to dict."""
    if row is None:
        return None
    if hasattr(row, "keys"):
        return dict(row)
    return dict(zip(cols, row))


def _rows(cols, rows):
    return [_row(cols, r) for r in rows]


def _db():
    return get_swp_rental_db()


# ── Auto-release expired reservations ─────────────────────────────

async def _auto_release_expired():
    """Release pending reservations past their pickup deadline + 24h."""
    db = _db()
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S")

    expired = _rows(_RES_COLS, db.execute(
        """SELECT * FROM rental_reservations_swp
           WHERE status = 'pending' AND pickup_deadline < ?""",
        (cutoff,),
    ).fetchall())

    for res in expired:
        db.execute(
            "UPDATE rental_reservations_swp SET status = 'auto_released' WHERE id = ?",
            (res["id"],),
        )
        db.execute(
            "UPDATE rental_inventory_swp SET status = 'available', copies_available = 1, current_renter_id = NULL WHERE id = ?",
            (res["inventory_id"],),
        )
        # Get subscriber name for notification
        sub = _row(_SUB_COLS, db.execute(
            "SELECT * FROM rental_subscribers_swp WHERE id = ?", (res["subscriber_id"],)
        ).fetchone())
        inv = _row(_INV_COLS, db.execute(
            "SELECT * FROM rental_inventory_swp WHERE id = ?", (res["inventory_id"],)
        ).fetchone())
        if sub and inv:
            await send_discord_notification(
                f"\u23f0 Auto-Released: {sub['name']}'s reservation for {inv['game_title']} expired"
            )

    if expired:
        db.commit()
        logger.info("Auto-released %d expired reservations", len(expired))


# ── Pydantic models ───────────────────────────────────────────────

class ReserveRequest(BaseModel):
    stripe_customer_id: str
    inventory_id: int
    pickup_deadline: str  # YYYY-MM-DD


class ReturnRequest(BaseModel):
    stripe_customer_id: str
    return_date: str  # YYYY-MM-DD


class ConfirmPickupRequest(BaseModel):
    reservation_id: int


class ConfirmReturnRequest(BaseModel):
    reservation_id: int


class ProfileUpdateRequest(BaseModel):
    stripe_customer_id: str
    name: str
    phone: Optional[str] = None


class CancelReservationRequest(BaseModel):
    stripe_customer_id: str
    reservation_id: int


# ── GET /catalog ──────────────────────────────────────────────────

@router.get("/catalog")
async def get_catalog(venue_id: str = "shallweplay"):
    """Return the full SWP rental catalog with availability."""
    await _auto_release_expired()

    db = _db()
    all_games = _rows(_INV_COLS, db.execute(
        "SELECT * FROM rental_inventory_swp WHERE venue_id = ? ORDER BY game_title",
        (venue_id,),
    ).fetchall())

    available_count = sum(1 for g in all_games if g["status"] == "available")

    return {
        "games": [
            {
                "id": g["id"],
                "title": g["game_title"],
                "image_url": g["image_url"],
                "game_id": g["game_id"],
                "status": g["status"],
                "copies_available": g["copies_available"],
            }
            for g in all_games
        ],
        "total": len(all_games),
        "available": available_count,
    }


# ── GET /profile ──────────────────────────────────────────────────

@router.get("/profile")
async def get_profile(stripe_customer_id: str):
    """Return subscriber profile with current rental and history."""
    db = _db()

    sub = _row(_SUB_COLS, db.execute(
        "SELECT * FROM rental_subscribers_swp WHERE stripe_customer_id = ?",
        (stripe_customer_id,),
    ).fetchone())

    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    # Current active rental (picked_up)
    current_res = _row(_RES_COLS, db.execute(
        """SELECT * FROM rental_reservations_swp
           WHERE subscriber_id = ? AND status = 'picked_up'
           ORDER BY created_at DESC LIMIT 1""",
        (sub["id"],),
    ).fetchone())

    current_rental = None
    if current_res:
        inv = _row(_INV_COLS, db.execute(
            "SELECT * FROM rental_inventory_swp WHERE id = ?", (current_res["inventory_id"],)
        ).fetchone())
        if inv:
            current_rental = {
                "game_title": inv["game_title"],
                "game_id": inv["game_id"],
                "image_url": inv["image_url"],
                "checked_out_at": current_res["checked_out_at"],
                "return_deadline": current_res["return_deadline"],
            }

    # Pending reservation
    pending_res = _row(_RES_COLS, db.execute(
        """SELECT * FROM rental_reservations_swp
           WHERE subscriber_id = ? AND status = 'pending'
           ORDER BY created_at DESC LIMIT 1""",
        (sub["id"],),
    ).fetchone())

    next_reservation = None
    if pending_res:
        inv = _row(_INV_COLS, db.execute(
            "SELECT * FROM rental_inventory_swp WHERE id = ?", (pending_res["inventory_id"],)
        ).fetchone())
        if inv:
            next_reservation = {
                "reservation_id": pending_res["id"],
                "game_title": inv["game_title"],
                "game_id": inv["game_id"],
                "image_url": inv["image_url"],
                "pickup_deadline": pending_res["pickup_deadline"],
                "reservation_type": pending_res["reservation_type"],
            }

    # History
    history = _rows(_HIST_COLS, db.execute(
        """SELECT * FROM rental_history_swp
           WHERE subscriber_id = ? ORDER BY created_at DESC LIMIT 20""",
        (sub["id"],),
    ).fetchall())

    return {
        "subscriber": {
            "name": sub["name"],
            "email": sub["email"],
            "status": sub["status"],
            "credit_used": bool(sub["credit_used"]),
            "member_since": sub["created_at"][:10] if sub["created_at"] else None,
        },
        "current_rental": current_rental,
        "next_reservation": next_reservation,
        "history": [
            {
                "game_title": h["game_title"],
                "checked_out_at": h["checked_out_at"],
                "returned_at": h["returned_at"],
            }
            for h in history
        ],
    }


# ── POST /reserve ─────────────────────────────────────────────────

@router.post("/reserve")
async def reserve_game(req: ReserveRequest):
    """Create a new reservation or swap."""
    db = _db()

    # 1. Verify subscriber
    sub = _row(_SUB_COLS, db.execute(
        "SELECT * FROM rental_subscribers_swp WHERE stripe_customer_id = ?",
        (req.stripe_customer_id,),
    ).fetchone())
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    if sub["status"] != "active":
        raise HTTPException(status_code=400, detail="Subscription is not active")

    # 2. Check for existing pending reservation
    existing_pending = _row(_RES_COLS, db.execute(
        """SELECT * FROM rental_reservations_swp
           WHERE subscriber_id = ? AND status = 'pending'""",
        (sub["id"],),
    ).fetchone())
    if existing_pending:
        raise HTTPException(status_code=400, detail="You already have a pending reservation")

    # 3. Verify game is available
    inv = _row(_INV_COLS, db.execute(
        "SELECT * FROM rental_inventory_swp WHERE id = ?", (req.inventory_id,)
    ).fetchone())
    if not inv:
        raise HTTPException(status_code=404, detail="Game not found")
    if inv["status"] != "available":
        raise HTTPException(status_code=400, detail="Game is not available")

    # 4. Determine if this is a swap (has current rental) or new
    current_rental = _row(_RES_COLS, db.execute(
        """SELECT * FROM rental_reservations_swp
           WHERE subscriber_id = ? AND status = 'picked_up'
           ORDER BY created_at DESC LIMIT 1""",
        (sub["id"],),
    ).fetchone())

    if current_rental:
        # SWAP — set return deadline on current rental
        reservation_type = "swap"
        db.execute(
            "UPDATE rental_reservations_swp SET return_deadline = ? WHERE id = ?",
            (req.pickup_deadline, current_rental["id"]),
        )
        current_inv = _row(_INV_COLS, db.execute(
            "SELECT * FROM rental_inventory_swp WHERE id = ?", (current_rental["inventory_id"],)
        ).fetchone())
        current_game = current_inv["game_title"] if current_inv else "unknown"
        discord_msg = (
            f"\U0001f504 Swap: {sub['name']} returning {current_game}, "
            f"picking up {inv['game_title']} by {req.pickup_deadline}"
        )
    else:
        reservation_type = "new"
        discord_msg = (
            f"\U0001f3b2 New Reservation: {sub['name']} reserved "
            f"{inv['game_title']}, pickup by {req.pickup_deadline}"
        )

    # 5. Create reservation
    db.execute(
        """INSERT INTO rental_reservations_swp
           (subscriber_id, inventory_id, venue_id, reservation_type, pickup_deadline, status)
           VALUES (?, ?, ?, ?, ?, 'pending')""",
        (sub["id"], req.inventory_id, inv["venue_id"], reservation_type, req.pickup_deadline),
    )

    # 6. Mark inventory as reserved
    db.execute(
        "UPDATE rental_inventory_swp SET status = 'reserved', copies_available = 0 WHERE id = ?",
        (req.inventory_id,),
    )

    db.commit()

    # Get reservation ID
    res_row = db.execute(
        """SELECT id FROM rental_reservations_swp
           WHERE subscriber_id = ? AND inventory_id = ? AND status = 'pending'
           ORDER BY created_at DESC LIMIT 1""",
        (sub["id"], req.inventory_id),
    ).fetchone()
    reservation_id = res_row[0] if res_row else None

    await send_discord_notification(discord_msg)

    return {
        "reservation_id": reservation_id,
        "game_title": inv["game_title"],
        "pickup_deadline": req.pickup_deadline,
        "reservation_type": reservation_type,
        "message": f"Reserved! Pick up at Shall We Play? by {req.pickup_deadline}.",
    }


# ── POST /return ──────────────────────────────────────────────────

@router.post("/return")
async def initiate_return(req: ReturnRequest):
    """Subscriber initiates a return (no swap)."""
    db = _db()

    sub = _row(_SUB_COLS, db.execute(
        "SELECT * FROM rental_subscribers_swp WHERE stripe_customer_id = ?",
        (req.stripe_customer_id,),
    ).fetchone())
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    # Find active rental (picked_up)
    active = _row(_RES_COLS, db.execute(
        """SELECT * FROM rental_reservations_swp
           WHERE subscriber_id = ? AND status = 'picked_up'
           ORDER BY created_at DESC LIMIT 1""",
        (sub["id"],),
    ).fetchone())
    if not active:
        raise HTTPException(status_code=400, detail="No active rental to return")

    db.execute(
        "UPDATE rental_reservations_swp SET return_deadline = ? WHERE id = ?",
        (req.return_date, active["id"]),
    )
    db.commit()

    inv = _row(_INV_COLS, db.execute(
        "SELECT * FROM rental_inventory_swp WHERE id = ?", (active["inventory_id"],)
    ).fetchone())
    game_title = inv["game_title"] if inv else "unknown"

    await send_discord_notification(
        f"\U0001f4e6 Return: {sub['name']} returning {game_title} by {req.return_date}"
    )

    return {"status": "return_scheduled", "game_title": game_title, "return_date": req.return_date}


# ── POST /admin/confirm-pickup ────────────────────────────────────

@router.post("/admin/confirm-pickup")
async def confirm_pickup(req: ConfirmPickupRequest):
    """Staff confirms customer picked up their game."""
    db = _db()

    res = _row(_RES_COLS, db.execute(
        "SELECT * FROM rental_reservations_swp WHERE id = ?", (req.reservation_id,)
    ).fetchone())
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if res["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Reservation status is '{res['status']}', expected 'pending'")

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    db.execute(
        "UPDATE rental_reservations_swp SET status = 'picked_up', checked_out_at = ? WHERE id = ?",
        (now, req.reservation_id),
    )
    db.execute(
        "UPDATE rental_inventory_swp SET status = 'rented', current_renter_id = ? WHERE id = ?",
        (res["subscriber_id"], res["inventory_id"]),
    )
    db.commit()

    sub = _row(_SUB_COLS, db.execute(
        "SELECT * FROM rental_subscribers_swp WHERE id = ?", (res["subscriber_id"],)
    ).fetchone())
    inv = _row(_INV_COLS, db.execute(
        "SELECT * FROM rental_inventory_swp WHERE id = ?", (res["inventory_id"],)
    ).fetchone())

    name = sub["name"] if sub else "Unknown"
    game = inv["game_title"] if inv else "Unknown"

    await send_discord_notification(f"\u2705 Picked Up: {name} picked up {game}")

    return {"status": "picked_up", "subscriber": name, "game": game, "checked_out_at": now}


# ── POST /admin/confirm-return ────────────────────────────────────

@router.post("/admin/confirm-return")
async def confirm_return(req: ConfirmReturnRequest):
    """Staff confirms a game was returned."""
    db = _db()

    res = _row(_RES_COLS, db.execute(
        "SELECT * FROM rental_reservations_swp WHERE id = ?", (req.reservation_id,)
    ).fetchone())
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if res["status"] != "picked_up":
        raise HTTPException(status_code=400, detail=f"Reservation status is '{res['status']}', expected 'picked_up'")

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    # 1. Mark reservation as returned
    db.execute(
        "UPDATE rental_reservations_swp SET status = 'returned', returned_at = ? WHERE id = ?",
        (now, req.reservation_id),
    )

    # 2. Get game info for history
    inv = _row(_INV_COLS, db.execute(
        "SELECT * FROM rental_inventory_swp WHERE id = ?", (res["inventory_id"],)
    ).fetchone())
    game_title = inv["game_title"] if inv else "Unknown"

    # 3. Insert into rental history
    db.execute(
        """INSERT INTO rental_history_swp
           (subscriber_id, inventory_id, game_title, checked_out_at, returned_at)
           VALUES (?, ?, ?, ?, ?)""",
        (res["subscriber_id"], res["inventory_id"], game_title, res["checked_out_at"], now),
    )

    # 4. Free inventory
    db.execute(
        """UPDATE rental_inventory_swp
           SET status = 'available', copies_available = 1, current_renter_id = NULL
           WHERE id = ?""",
        (res["inventory_id"],),
    )

    db.commit()

    sub = _row(_SUB_COLS, db.execute(
        "SELECT * FROM rental_subscribers_swp WHERE id = ?", (res["subscriber_id"],)
    ).fetchone())
    name = sub["name"] if sub else "Unknown"

    await send_discord_notification(f"\u2705 Returned: {name} returned {game_title}")

    # 5. Check if subscriber has a pending swap reservation — it's now active
    pending_swap = _row(_RES_COLS, db.execute(
        """SELECT * FROM rental_reservations_swp
           WHERE subscriber_id = ? AND status = 'pending' AND reservation_type = 'swap'
           ORDER BY created_at DESC LIMIT 1""",
        (res["subscriber_id"],),
    ).fetchone())

    return {
        "status": "returned",
        "subscriber": name,
        "game": game_title,
        "returned_at": now,
        "pending_swap": pending_swap["id"] if pending_swap else None,
    }


# ── GET /admin/dashboard ──────────────────────────────────────────

@router.get("/admin/dashboard")
async def admin_dashboard(venue_id: str = "shallweplay"):
    """Admin dashboard data for Game Rentals tab."""
    await _auto_release_expired()

    db = _db()

    # Stats
    total_subs = db.execute(
        "SELECT COUNT(*) FROM rental_subscribers_swp WHERE venue_id = ?", (venue_id,)
    ).fetchone()[0]

    active_rentals_count = db.execute(
        """SELECT COUNT(*) FROM rental_reservations_swp
           WHERE venue_id = ? AND status = 'picked_up'""",
        (venue_id,),
    ).fetchone()[0]

    pending_count = db.execute(
        """SELECT COUNT(*) FROM rental_reservations_swp
           WHERE venue_id = ? AND status = 'pending'""",
        (venue_id,),
    ).fetchone()[0]

    available_count = db.execute(
        "SELECT COUNT(*) FROM rental_inventory_swp WHERE venue_id = ? AND status = 'available'",
        (venue_id,),
    ).fetchone()[0]

    total_inv = db.execute(
        "SELECT COUNT(*) FROM rental_inventory_swp WHERE venue_id = ?", (venue_id,)
    ).fetchone()[0]

    reserved_count = db.execute(
        "SELECT COUNT(*) FROM rental_inventory_swp WHERE venue_id = ? AND status = 'reserved'",
        (venue_id,),
    ).fetchone()[0]

    rented_count = db.execute(
        "SELECT COUNT(*) FROM rental_inventory_swp WHERE venue_id = ? AND status = 'rented'",
        (venue_id,),
    ).fetchone()[0]

    # Pending pickups (join reservations + subscribers + inventory)
    pending_rows = db.execute(
        """SELECT r.id, r.pickup_deadline, r.reservation_type,
                  s.name, i.game_title
           FROM rental_reservations_swp r
           JOIN rental_subscribers_swp s ON r.subscriber_id = s.id
           JOIN rental_inventory_swp i ON r.inventory_id = i.id
           WHERE r.venue_id = ? AND r.status = 'pending'
           ORDER BY r.pickup_deadline""",
        (venue_id,),
    ).fetchall()

    pending_pickups = []
    for row in pending_rows:
        if hasattr(row, "keys"):
            row = dict(row)
            pending_pickups.append({
                "reservation_id": row["id"],
                "subscriber_name": row["name"],
                "game_title": row["game_title"],
                "pickup_deadline": row["pickup_deadline"],
                "reservation_type": row["reservation_type"],
            })
        else:
            pending_pickups.append({
                "reservation_id": row[0],
                "subscriber_name": row[3],
                "game_title": row[4],
                "pickup_deadline": row[1],
                "reservation_type": row[2],
            })

    # Active rentals
    active_rows = db.execute(
        """SELECT r.id, r.checked_out_at, r.return_deadline,
                  s.name, i.game_title
           FROM rental_reservations_swp r
           JOIN rental_subscribers_swp s ON r.subscriber_id = s.id
           JOIN rental_inventory_swp i ON r.inventory_id = i.id
           WHERE r.venue_id = ? AND r.status = 'picked_up'
           ORDER BY r.checked_out_at DESC""",
        (venue_id,),
    ).fetchall()

    active_rentals = []
    for row in active_rows:
        if hasattr(row, "keys"):
            row = dict(row)
            active_rentals.append({
                "reservation_id": row["id"],
                "subscriber_name": row["name"],
                "game_title": row["game_title"],
                "checked_out_at": row["checked_out_at"],
                "return_deadline": row["return_deadline"],
            })
        else:
            active_rentals.append({
                "reservation_id": row[0],
                "subscriber_name": row[3],
                "game_title": row[4],
                "checked_out_at": row[1],
                "return_deadline": row[2],
            })

    return {
        "stats": {
            "total_subscribers": total_subs,
            "active_rentals": active_rentals_count,
            "pending_pickups": pending_count,
            "games_available": available_count,
        },
        "pending_pickups": pending_pickups,
        "active_rentals": active_rentals,
        "inventory_summary": {
            "total": total_inv,
            "available": available_count,
            "reserved": reserved_count,
            "rented": rented_count,
        },
    }


# ── POST /auto-release ────────────────────────────────────────────

@router.post("/auto-release")
async def trigger_auto_release():
    """Manually trigger auto-release of expired reservations."""
    await _auto_release_expired()
    return {"status": "ok"}


# ── GET /billing-portal ───────────────────────────────────────────

@router.get("/billing-portal")
async def billing_portal(stripe_customer_id: str):
    """Create a Stripe Customer Portal session and return the URL."""
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    try:
        session = stripe.billing_portal.Session.create(
            customer=stripe_customer_id,
            return_url="https://playgmg.com/swp/rentals/profile",
        )
        return {"url": session.url}
    except stripe.StripeError as e:
        logger.error("Stripe billing portal error: %s", e)
        raise HTTPException(status_code=400, detail=str(e))


# ── GET /checkout-session ────────────────────────────────────────

@router.get("/checkout-session")
async def get_checkout_session(session_id: str):
    """Retrieve Stripe Checkout Session to get customer info after payment."""
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        customer_details = session.get("customer_details") or {}
        return {
            "stripe_customer_id": session.get("customer"),
            "email": customer_details.get("email", ""),
            "name": customer_details.get("name", ""),
        }
    except stripe.StripeError as e:
        logger.error("Stripe checkout session error: %s", e)
        raise HTTPException(status_code=400, detail=str(e))


# ── POST /profile/update ────────────────────────────────────────

@router.post("/profile/update")
async def update_profile(req: ProfileUpdateRequest):
    """Update subscriber name/phone after onboarding."""
    db = _db()

    sub = _row(_SUB_COLS, db.execute(
        "SELECT * FROM rental_subscribers_swp WHERE stripe_customer_id = ?",
        (req.stripe_customer_id,),
    ).fetchone())

    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    db.execute(
        "UPDATE rental_subscribers_swp SET name = ?, phone = ?, updated_at = datetime('now') WHERE id = ?",
        (req.name, req.phone, sub["id"]),
    )
    db.commit()

    return {"status": "updated", "name": req.name}


# ── POST /cancel-reservation ────────────────────────────────────

@router.post("/cancel-reservation")
async def cancel_reservation(req: CancelReservationRequest):
    """Cancel a pending reservation and free inventory."""
    db = _db()

    sub = _row(_SUB_COLS, db.execute(
        "SELECT * FROM rental_subscribers_swp WHERE stripe_customer_id = ?",
        (req.stripe_customer_id,),
    ).fetchone())
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    res = _row(_RES_COLS, db.execute(
        "SELECT * FROM rental_reservations_swp WHERE id = ? AND subscriber_id = ?",
        (req.reservation_id, sub["id"]),
    ).fetchone())
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if res["status"] != "pending":
        raise HTTPException(status_code=400, detail="Only pending reservations can be cancelled")

    # Cancel reservation
    db.execute(
        "UPDATE rental_reservations_swp SET status = 'cancelled' WHERE id = ?",
        (req.reservation_id,),
    )
    # Free inventory
    db.execute(
        "UPDATE rental_inventory_swp SET status = 'available', copies_available = 1, current_renter_id = NULL WHERE id = ?",
        (res["inventory_id"],),
    )

    # If this was a swap, remove the return deadline from current rental
    if res["reservation_type"] == "swap":
        db.execute(
            """UPDATE rental_reservations_swp SET return_deadline = NULL
               WHERE subscriber_id = ? AND status = 'picked_up'""",
            (sub["id"],),
        )

    db.commit()

    inv = _row(_INV_COLS, db.execute(
        "SELECT * FROM rental_inventory_swp WHERE id = ?", (res["inventory_id"],)
    ).fetchone())
    game_title = inv["game_title"] if inv else "Unknown"

    await send_discord_notification(
        f"\u274c Cancelled: {sub['name']} cancelled reservation for {game_title}"
    )

    return {"status": "cancelled", "game_title": game_title}
