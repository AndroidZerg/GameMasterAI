"""Drink Club model — Turso (libsql) persistence for drink subscriptions and redemptions."""

import re
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.services.turso import get_drink_club_db

# Pacific timezone — handles DST automatically (PST/PDT)
_PACIFIC = ZoneInfo("America/Los_Angeles")

# Weekly reset: every Monday at 10:00 AM Pacific
_RESET_HOUR = 10


def _db():
    return get_drink_club_db()


def _current_week_start() -> str:
    """Return the Monday date for the current eligibility window.

    The week resets every Monday at 10:00 AM Pacific.
    - Before Monday 10 AM → still previous week (use last Monday's date)
    - After Monday 10 AM → new week (use this Monday's date)
    """
    now = datetime.now(_PACIFIC)
    monday = now - timedelta(days=now.weekday())
    # If it's Monday but before the reset hour, we're still in last week
    if now.weekday() == 0 and now.hour < _RESET_HOUR:
        monday = monday - timedelta(days=7)
    return monday.strftime("%Y-%m-%d")


def _normalize_phone(phone: str) -> str:
    """Normalize phone to digits-only, with leading 1 for US numbers."""
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 10:
        digits = "1" + digits
    return digits


def _row_to_dict(row) -> dict | None:
    """Convert a database row to a dict, handling both sqlite3.Row and libsql rows."""
    if row is None:
        return None
    if hasattr(row, "keys"):
        return dict(row)
    # libsql rows may not have .keys(); fall back to index-based mapping
    cols = [
        "id", "name", "email", "phone", "stripe_customer_id",
        "stripe_subscription_id", "subscription_status", "qr_code",
        "created_at", "updated_at",
    ]
    return dict(zip(cols, row))


def _redemption_to_dict(row) -> dict | None:
    if row is None:
        return None
    if hasattr(row, "keys"):
        return dict(row)
    cols = ["id", "subscriber_id", "redeemed_at", "redeemed_by", "drink_name", "week_start"]
    return dict(zip(cols, row))


def get_subscriber_by_email(email: str) -> dict | None:
    db = _db()
    row = db.execute(
        "SELECT * FROM drink_subscribers WHERE email = ?", (email,)
    ).fetchone()
    return _row_to_dict(row)


def get_subscriber_by_phone(phone: str) -> dict | None:
    """Look up subscriber by normalized phone number."""
    normalized = _normalize_phone(phone)
    db = _db()
    row = db.execute(
        "SELECT * FROM drink_subscribers WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, '-', ''), ' ', ''), '(', ''), ')', '') LIKE ?",
        (f"%{normalized[-10:]}%",)
    ).fetchone()
    return _row_to_dict(row)


def get_subscriber_by_qr(qr_code: str) -> dict | None:
    db = _db()
    row = db.execute(
        "SELECT * FROM drink_subscribers WHERE qr_code = ?", (qr_code,)
    ).fetchone()
    return _row_to_dict(row)


def get_subscriber_by_id(sub_id: int) -> dict | None:
    db = _db()
    row = db.execute(
        "SELECT * FROM drink_subscribers WHERE id = ?", (sub_id,)
    ).fetchone()
    return _row_to_dict(row)


def search_subscribers(query: str) -> list:
    db = _db()
    like = f"%{query}%"
    rows = db.execute(
        "SELECT * FROM drink_subscribers WHERE name LIKE ? OR phone LIKE ? LIMIT 20",
        (like, like),
    ).fetchall()
    return [_row_to_dict(r) for r in rows]


def get_all_subscribers() -> list:
    """Return all drink club subscribers."""
    db = _db()
    rows = db.execute(
        "SELECT * FROM drink_subscribers ORDER BY name LIMIT 200"
    ).fetchall()
    return [_row_to_dict(r) for r in rows]


def get_week_redemption(subscriber_id: int, week_start: str = None) -> dict | None:
    ws = week_start or _current_week_start()
    db = _db()
    row = db.execute(
        "SELECT * FROM drink_redemptions WHERE subscriber_id = ? AND week_start = ?",
        (subscriber_id, ws),
    ).fetchone()
    return _redemption_to_dict(row)


def get_redemption_history(subscriber_id: int, limit: int = 10) -> list:
    db = _db()
    rows = db.execute(
        "SELECT * FROM drink_redemptions WHERE subscriber_id = ? ORDER BY redeemed_at DESC LIMIT ?",
        (subscriber_id, limit),
    ).fetchall()
    return [_redemption_to_dict(r) for r in rows]


def create_redemption(subscriber_id: int, staff_pin: str, drink_name: str = "") -> int:
    ws = _current_week_start()
    db = _db()
    cur = db.execute(
        "INSERT INTO drink_redemptions (subscriber_id, redeemed_by, drink_name, week_start) VALUES (?, ?, ?, ?)",
        (subscriber_id, staff_pin, drink_name, ws),
    )
    db.commit()
    return cur.lastrowid


def upsert_subscriber(name: str, email: str, phone: str = "",
                      stripe_customer_id: str = "", stripe_subscription_id: str = "",
                      qr_code: str = "", status: str = "active") -> int:
    now = datetime.now(timezone.utc).isoformat()
    db = _db()
    existing = db.execute(
        "SELECT id FROM drink_subscribers WHERE email = ?", (email,)
    ).fetchone()
    if existing:
        existing_id = existing[0] if not hasattr(existing, "keys") else existing["id"]
        db.execute(
            """UPDATE drink_subscribers SET name=?, phone=?, stripe_customer_id=?,
               stripe_subscription_id=?, subscription_status=?, qr_code=?, updated_at=?
               WHERE email=?""",
            (name, phone, stripe_customer_id, stripe_subscription_id, status, qr_code, now, email),
        )
        db.commit()
        return existing_id
    else:
        cur = db.execute(
            """INSERT INTO drink_subscribers
               (name, email, phone, stripe_customer_id, stripe_subscription_id,
                subscription_status, qr_code, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (name, email, phone, stripe_customer_id, stripe_subscription_id,
             status, qr_code, now, now),
        )
        db.commit()
        return cur.lastrowid


def update_subscriber_status(stripe_subscription_id: str, status: str):
    now = datetime.now(timezone.utc).isoformat()
    db = _db()
    db.execute(
        "UPDATE drink_subscribers SET subscription_status=?, updated_at=? WHERE stripe_subscription_id=?",
        (status, now, stripe_subscription_id),
    )
    db.commit()


def update_subscriber_phone(subscriber_id: int, phone: str):
    """Update phone number for a subscriber."""
    now = datetime.now(timezone.utc).isoformat()
    db = _db()
    db.execute(
        "UPDATE drink_subscribers SET phone=?, updated_at=? WHERE id=?",
        (phone, now, subscriber_id),
    )
    db.commit()
