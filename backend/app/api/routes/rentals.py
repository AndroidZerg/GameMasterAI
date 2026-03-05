"""Rental system — subscriber accounts, single-game rentals, MRR tracking, Telegram."""

import json
import logging
import os
import secrets
import string
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.core.config import DB_PATH
from app.core.auth import hash_password, create_token, get_current_venue

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["rentals"])

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")


# ── Pydantic models ──────────────────────────────────────────────

class RentalRequest(BaseModel):
    game_id: str
    name: str
    contact: str  # phone or email
    venue_id: Optional[str] = None
    table_number: Optional[int] = None
    device_id: Optional[str] = None


class ReturnRequest(BaseModel):
    subscriber_id: int


# ── DB helpers ────────────────────────────────────────────────────

def _get_db():
    import sqlite3
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = lambda c, r: dict(zip([col[0] for col in c.description], r))
    return conn


def _get_db_raw():
    """Connection without row_factory for inserts/updates."""
    import sqlite3
    return sqlite3.connect(DB_PATH)


def init_rental_tables():
    """Create all rental tables. Safe to call on every startup."""
    try:
        db = _get_db_raw()
        db.execute("""CREATE TABLE IF NOT EXISTS rental_subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venue_id TEXT NOT NULL,
            customer_name TEXT NOT NULL,
            customer_contact TEXT NOT NULL,
            email TEXT,
            password_hash TEXT,
            status TEXT DEFAULT 'active',
            mrr_cents INTEGER DEFAULT 1000,
            current_game_id TEXT,
            signup_source TEXT DEFAULT 'venue_qr',
            table_number INTEGER,
            device_id TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            cancelled_at TEXT
        )""")
        db.execute("""CREATE TABLE IF NOT EXISTS rental_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subscriber_id INTEGER REFERENCES rental_subscribers(id),
            game_id TEXT NOT NULL,
            game_title TEXT NOT NULL,
            venue_id TEXT NOT NULL,
            checked_out_at TEXT NOT NULL DEFAULT (datetime('now')),
            returned_at TEXT,
            status TEXT DEFAULT 'out'
        )""")
        # Keep the old rental_requests table for backwards compat
        db.execute("""CREATE TABLE IF NOT EXISTS rental_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venue_id TEXT NOT NULL,
            device_id TEXT,
            table_number INTEGER,
            customer_name TEXT NOT NULL,
            customer_contact TEXT NOT NULL,
            games TEXT NOT NULL,
            game_count INTEGER DEFAULT 1,
            status TEXT DEFAULT 'pending',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )""")
        db.commit()
        db.close()
    except Exception as e:
        logger.warning(f"Rental tables init failed: {e}")


# Keep old name as alias for backwards compat with main.py
init_rental_requests_table = init_rental_tables


def _lookup_game_title(game_id: str) -> str:
    """Look up game title from JSON file."""
    game_path = os.path.join("content", "games", f"{game_id}.json")
    try:
        if os.path.exists(game_path):
            with open(game_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data.get("title", game_id)
    except Exception:
        pass
    return game_id


def _generate_password(length: int = 8) -> str:
    """Generate a simple readable password."""
    chars = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


def _extract_email(contact: str) -> Optional[str]:
    """If the contact looks like an email, return it. Otherwise None."""
    contact = contact.strip()
    if "@" in contact and "." in contact:
        return contact.lower()
    return None


# ── Telegram ──────────────────────────────────────────────────────

def _send_telegram_new_subscriber(
    customer_name: str, customer_contact: str, venue_id: str,
    game_title: str, email: str, subscriber_number: int,
    mrr_total: int, table_number: Optional[int] = None,
):
    """Telegram notification for new rental subscriber."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    table_line = f"\nTable: {table_number}" if table_number else ""
    mrr_dollars = mrr_total / 100
    text = (
        f"\U0001f3b2 NEW RENTAL SUBSCRIBER\n\n"
        f"Customer: {customer_name}\n"
        f"Contact: {customer_contact}\n"
        f"Venue: {venue_id}"
        f"{table_line}\n\n"
        f"Game: {game_title}\n"
        f"Plan: $10/mo \u2014 1 game at a time\n\n"
        f"GMG account created: {email}\n"
        f"This is subscriber #{subscriber_number} \u2014 MRR now ${mrr_dollars:.0f}/mo\n\n"
        f"Status: Prepare game for pickup"
    )
    try:
        httpx.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": text},
            timeout=10,
        )
    except Exception:
        pass


def _send_telegram_return(customer_name: str, game_title: str, venue_id: str):
    """Telegram notification for game return."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    text = (
        f"\U0001f4e6 RENTAL RETURN\n\n"
        f"Customer: {customer_name}\n"
        f"Game: {game_title}\n"
        f"Venue: {venue_id}\n\n"
        f"Game returned \u2014 ready to be re-shelved."
    )
    try:
        httpx.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": text},
            timeout=10,
        )
    except Exception:
        pass


# ── Endpoints ─────────────────────────────────────────────────────

@router.post("/rentals/request")
async def submit_rental_request(req: RentalRequest):
    """Submit a rental request. Auto-creates a subscriber account."""
    if not req.game_id:
        raise HTTPException(status_code=400, detail="game_id is required")
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    if not req.contact.strip():
        raise HTTPException(status_code=400, detail="Contact info is required")

    game_title = _lookup_game_title(req.game_id)
    venue_id = req.venue_id or "shallweplay"
    contact = req.contact.strip()
    name = req.name.strip()

    # Determine email — use contact if it's an email, otherwise generate one
    email = _extract_email(contact)
    if not email:
        # Generate an email from their name for login purposes
        safe_name = "".join(c for c in name.lower() if c.isalnum())
        email = f"{safe_name}@rental.playgmg.com"

    # Generate password
    raw_password = _generate_password()
    pw_hash = hash_password(raw_password)

    db = _get_db_raw()
    subscriber_id = None
    is_returning = False

    try:
        # Check if subscriber already exists (by contact + venue)
        existing = db.execute(
            "SELECT id, status, current_game_id FROM rental_subscribers WHERE customer_contact = ? AND venue_id = ?",
            (contact, venue_id),
        ).fetchone()

        if existing:
            subscriber_id = existing[0]
            is_returning = True
            # Update their current game and reactivate if needed
            db.execute(
                """UPDATE rental_subscribers
                   SET current_game_id = ?, status = 'active',
                       customer_name = ?, cancelled_at = NULL
                   WHERE id = ?""",
                (req.game_id, name, subscriber_id),
            )
            # Don't regenerate password for returning subscribers
            raw_password = None
        else:
            # Create new subscriber
            cur = db.execute(
                """INSERT INTO rental_subscribers
                   (venue_id, customer_name, customer_contact, email, password_hash,
                    status, mrr_cents, current_game_id, signup_source, table_number, device_id)
                   VALUES (?, ?, ?, ?, ?, 'active', 1000, ?, 'venue_qr', ?, ?)""",
                (venue_id, name, contact, email, pw_hash,
                 req.game_id, req.table_number, req.device_id),
            )
            subscriber_id = cur.lastrowid

        # Record in rental_history
        db.execute(
            """INSERT INTO rental_history
               (subscriber_id, game_id, game_title, venue_id)
               VALUES (?, ?, ?, ?)""",
            (subscriber_id, req.game_id, game_title, venue_id),
        )

        # Also log to rental_requests for backwards compat
        db.execute(
            """INSERT INTO rental_requests
               (venue_id, device_id, table_number, customer_name, customer_contact, games, game_count)
               VALUES (?, ?, ?, ?, ?, ?, 1)""",
            (venue_id, req.device_id, req.table_number, name, contact,
             json.dumps([req.game_id])),
        )

        db.commit()

        # Get total active subscribers + MRR for Telegram
        row = db.execute(
            "SELECT COUNT(*) as cnt, SUM(mrr_cents) as total FROM rental_subscribers WHERE status = 'active'"
        ).fetchone()
        active_count = row[0] if row else 1
        mrr_total = row[1] if row and row[1] else 1000

        db.close()
    except Exception as e:
        logger.error(f"Failed to create rental subscriber: {e}")
        try:
            db.close()
        except Exception:
            pass
        # Still return success — the Telegram will go out
        active_count = 1
        mrr_total = 1000

    # Create a GMG venue account so subscriber can log in
    if not is_returning:
        try:
            from app.models.venues import get_venue_by_email, create_venue, set_venue_collection
            from app.models.game import search_games

            if not get_venue_by_email(email):
                sub_venue_id = f"rental-{subscriber_id}"
                create_venue(
                    venue_id=sub_venue_id,
                    venue_name=name,
                    email=email,
                    password_hash=pw_hash,
                    role="rental_subscriber",
                    source=f"rental-{venue_id}",
                )
                # Give them the full game library for browsing
                all_games = search_games()
                game_ids = [g["game_id"] for g in all_games]
                set_venue_collection(sub_venue_id, game_ids)
        except Exception as e:
            logger.error(f"Failed to create venue account for rental subscriber: {e}")

    # Telegram
    _send_telegram_new_subscriber(
        customer_name=name,
        customer_contact=contact,
        venue_id=venue_id,
        game_title=game_title,
        email=email,
        subscriber_number=active_count,
        mrr_total=mrr_total,
        table_number=req.table_number,
    )

    response = {
        "status": "submitted",
        "game": game_title,
        "subscriber_id": subscriber_id,
        "email": email,
        "is_returning": is_returning,
    }
    # Only include password for new subscribers
    if raw_password:
        response["password"] = raw_password

    return response


@router.post("/rentals/return")
async def return_rental(req: ReturnRequest):
    """Mark a rental as returned. Clears subscriber's current game."""
    db = _get_db()
    try:
        sub = db.execute(
            "SELECT * FROM rental_subscribers WHERE id = ?",
            (req.subscriber_id,),
        ).fetchone()
        if not sub:
            raise HTTPException(status_code=404, detail="Subscriber not found")
        if not sub["current_game_id"]:
            raise HTTPException(status_code=400, detail="No game currently checked out")

        game_title = _lookup_game_title(sub["current_game_id"])

        db_raw = _get_db_raw()
        # Update rental_history — mark as returned
        db_raw.execute(
            """UPDATE rental_history SET status = 'returned', returned_at = datetime('now')
               WHERE subscriber_id = ? AND game_id = ? AND status = 'out'""",
            (req.subscriber_id, sub["current_game_id"]),
        )
        # Clear current game
        db_raw.execute(
            "UPDATE rental_subscribers SET current_game_id = NULL WHERE id = ?",
            (req.subscriber_id,),
        )
        db_raw.commit()
        db_raw.close()
        db.close()

        _send_telegram_return(sub["customer_name"], game_title, sub["venue_id"])

        return {"status": "returned", "game": game_title}
    except HTTPException:
        db.close()
        raise
    except Exception as e:
        db.close()
        logger.error(f"Return rental failed: {e}")
        raise HTTPException(status_code=500, detail="Return failed")


@router.get("/rentals/me")
async def get_my_rental(user: dict = Depends(get_current_venue)):
    """Get current rental status for a rental_subscriber user."""
    if user.get("role") != "rental_subscriber":
        return {"subscriber": None, "current_game": None}

    venue_id = user["venue_id"]  # e.g. "rental-5"
    db = _get_db()
    try:
        # Find subscriber by venue account ID (rental-{id})
        sub_id_str = venue_id.replace("rental-", "")
        try:
            sub_id = int(sub_id_str)
        except ValueError:
            db.close()
            return {"subscriber": None, "current_game": None}

        sub = db.execute(
            "SELECT * FROM rental_subscribers WHERE id = ?", (sub_id,)
        ).fetchone()
        db.close()

        if not sub:
            return {"subscriber": None, "current_game": None}

        current_game = None
        if sub["current_game_id"]:
            current_game = {
                "game_id": sub["current_game_id"],
                "title": _lookup_game_title(sub["current_game_id"]),
            }

        return {
            "subscriber": {
                "id": sub["id"],
                "name": sub["customer_name"],
                "status": sub["status"],
                "venue_id": sub["venue_id"],
                "created_at": sub["created_at"],
            },
            "current_game": current_game,
        }
    except Exception as e:
        db.close()
        logger.error(f"Get my rental failed: {e}")
        return {"subscriber": None, "current_game": None}


@router.get("/crm/mrr")
async def get_mrr_dashboard(
    venue_id: Optional[str] = None,
    user: dict = Depends(get_current_venue),
):
    """MRR dashboard — active subscribers, revenue, most rented games."""
    db = _get_db()
    try:
        # Scope to venue for non-super-admins
        venue_filter = ""
        params = ()
        if venue_id:
            venue_filter = " WHERE venue_id = ?"
            params = (venue_id,)
        elif user.get("role") not in ("super_admin", "demo"):
            venue_filter = " WHERE venue_id = ?"
            params = (user["venue_id"],)

        # Active subscribers
        subscribers = db.execute(
            f"SELECT * FROM rental_subscribers{venue_filter} ORDER BY created_at DESC",
            params,
        ).fetchall()

        active = [s for s in subscribers if s["status"] == "active"]
        total_mrr = sum(s["mrr_cents"] for s in active)
        games_out = sum(1 for s in active if s["current_game_id"])

        # Most rented games (from history)
        history_filter = venue_filter.replace("venue_id", "h.venue_id") if venue_filter else ""
        most_rented = db.execute(
            f"""SELECT h.game_id, h.game_title, COUNT(*) as rental_count
                FROM rental_history h{history_filter}
                GROUP BY h.game_id ORDER BY rental_count DESC LIMIT 20""",
            params,
        ).fetchall()

        # Rental history (recent)
        recent_history = db.execute(
            f"""SELECT h.*, s.customer_name, s.customer_contact
                FROM rental_history h
                JOIN rental_subscribers s ON h.subscriber_id = s.id
                {venue_filter.replace('venue_id', 'h.venue_id') if venue_filter else ''}
                ORDER BY h.checked_out_at DESC LIMIT 50""",
            params,
        ).fetchall()

        db.close()

        return {
            "subscribers": subscribers,
            "active_count": len(active),
            "total_mrr_cents": total_mrr,
            "total_mrr_dollars": total_mrr / 100,
            "games_out": games_out,
            "most_rented": most_rented,
            "recent_history": recent_history,
            "by_venue": {},
        }
    except Exception as e:
        db.close()
        logger.error(f"MRR dashboard query failed: {e}")
        return {
            "subscribers": [], "active_count": 0,
            "total_mrr_cents": 0, "total_mrr_dollars": 0,
            "games_out": 0, "most_rented": [], "recent_history": [],
            "by_venue": {},
        }


@router.get("/crm/rentals")
async def get_rental_analytics():
    """Legacy CRM analytics for rental requests."""
    db = _get_db()
    try:
        rows = db.execute(
            "SELECT * FROM rental_requests ORDER BY created_at DESC LIMIT 100"
        ).fetchall()

        game_counts = db.execute(
            """SELECT games, COUNT(*) as cnt
               FROM rental_requests GROUP BY games ORDER BY cnt DESC LIMIT 20"""
        ).fetchall()

        most_requested = []
        for row in game_counts:
            try:
                game_ids = json.loads(row["games"])
                gid = game_ids[0] if game_ids else "unknown"
            except Exception:
                gid = row["games"]
            most_requested.append({
                "game_id": gid,
                "title": _lookup_game_title(gid),
                "request_count": row["cnt"],
            })

        statuses = db.execute(
            "SELECT status, COUNT(*) as cnt FROM rental_requests GROUP BY status"
        ).fetchall()

        venues = db.execute(
            "SELECT venue_id, COUNT(*) as cnt FROM rental_requests GROUP BY venue_id ORDER BY cnt DESC"
        ).fetchall()

        db.close()

        return {
            "requests": rows,
            "most_requested": most_requested,
            "status_breakdown": {s["status"]: s["cnt"] for s in statuses},
            "by_venue": {v["venue_id"]: v["cnt"] for v in venues},
            "total": len(rows),
        }
    except Exception as e:
        db.close()
        logger.error(f"Rental analytics query failed: {e}")
        return {"requests": [], "most_requested": [], "status_breakdown": {}, "by_venue": {}, "total": 0}
