"""Drink Club model — SQLite persistence for drink subscriptions and redemptions."""

import sqlite3
from datetime import datetime, timedelta, timezone

from app.core.config import DB_PATH

# Pacific timezone offset (PST = -8, PDT = -7). Using -8 as default.
_PT_OFFSET = timezone(timedelta(hours=-8))


def init_drink_club_tables():
    """Create drink_subscribers and drink_redemptions tables."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS drink_subscribers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                phone TEXT,
                stripe_customer_id TEXT,
                stripe_subscription_id TEXT,
                subscription_status TEXT DEFAULT 'inactive',
                qr_code TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS drink_redemptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subscriber_id INTEGER NOT NULL,
                redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                redeemed_by TEXT,
                drink_name TEXT,
                week_start TEXT NOT NULL,
                FOREIGN KEY (subscriber_id) REFERENCES drink_subscribers(id),
                UNIQUE(subscriber_id, week_start)
            )
        """)
        conn.commit()


def _current_week_start() -> str:
    """Monday 00:00 PT for the current week."""
    now = datetime.now(_PT_OFFSET)
    monday = now - timedelta(days=now.weekday())
    return monday.strftime("%Y-%m-%d")


def get_subscriber_by_email(email: str) -> dict | None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM drink_subscribers WHERE email = ?", (email,)
        ).fetchone()
        return dict(row) if row else None


def get_subscriber_by_qr(qr_code: str) -> dict | None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM drink_subscribers WHERE qr_code = ?", (qr_code,)
        ).fetchone()
        return dict(row) if row else None


def get_subscriber_by_id(sub_id: int) -> dict | None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM drink_subscribers WHERE id = ?", (sub_id,)
        ).fetchone()
        return dict(row) if row else None


def search_subscribers(query: str) -> list:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        like = f"%{query}%"
        rows = conn.execute(
            "SELECT * FROM drink_subscribers WHERE name LIKE ? OR phone LIKE ? LIMIT 20",
            (like, like),
        ).fetchall()
        return [dict(r) for r in rows]


def get_week_redemption(subscriber_id: int, week_start: str = None) -> dict | None:
    ws = week_start or _current_week_start()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM drink_redemptions WHERE subscriber_id = ? AND week_start = ?",
            (subscriber_id, ws),
        ).fetchone()
        return dict(row) if row else None


def get_redemption_history(subscriber_id: int, limit: int = 10) -> list:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM drink_redemptions WHERE subscriber_id = ? ORDER BY redeemed_at DESC LIMIT ?",
            (subscriber_id, limit),
        ).fetchall()
        return [dict(r) for r in rows]


def create_redemption(subscriber_id: int, staff_pin: str, drink_name: str = "") -> int:
    ws = _current_week_start()
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute(
            "INSERT INTO drink_redemptions (subscriber_id, redeemed_by, drink_name, week_start) VALUES (?, ?, ?, ?)",
            (subscriber_id, staff_pin, drink_name, ws),
        )
        conn.commit()
        return cur.lastrowid


def upsert_subscriber(name: str, email: str, phone: str = "",
                      stripe_customer_id: str = "", stripe_subscription_id: str = "",
                      qr_code: str = "", status: str = "active") -> int:
    now = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(DB_PATH) as conn:
        existing = conn.execute(
            "SELECT id FROM drink_subscribers WHERE email = ?", (email,)
        ).fetchone()
        if existing:
            conn.execute(
                """UPDATE drink_subscribers SET name=?, phone=?, stripe_customer_id=?,
                   stripe_subscription_id=?, subscription_status=?, qr_code=?, updated_at=?
                   WHERE email=?""",
                (name, phone, stripe_customer_id, stripe_subscription_id, status, qr_code, now, email),
            )
            conn.commit()
            return existing[0]
        else:
            cur = conn.execute(
                """INSERT INTO drink_subscribers
                   (name, email, phone, stripe_customer_id, stripe_subscription_id,
                    subscription_status, qr_code, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (name, email, phone, stripe_customer_id, stripe_subscription_id,
                 status, qr_code, now, now),
            )
            conn.commit()
            return cur.lastrowid


def update_subscriber_status(stripe_subscription_id: str, status: str):
    now = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "UPDATE drink_subscribers SET subscription_status=?, updated_at=? WHERE stripe_subscription_id=?",
            (status, now, stripe_subscription_id),
        )
        conn.commit()
