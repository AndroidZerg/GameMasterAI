"""Orders model — SQLite persistence for venue orders."""

import json
import sqlite3
from datetime import datetime, timezone

from app.core.config import DB_PATH


def init_orders_table():
    """Create orders table if it doesn't exist."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                venue_id TEXT DEFAULT 'default',
                session_id TEXT,
                items TEXT NOT NULL,
                total REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                submitted_at TIMESTAMP NOT NULL,
                completed_at TIMESTAMP
            )
        """)
        conn.commit()


def create_order(venue_id: str, session_id: str, items: list, total: float) -> int:
    """Insert a new order, return its ID."""
    now = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute(
            "INSERT INTO orders (venue_id, session_id, items, total, submitted_at) VALUES (?, ?, ?, ?, ?)",
            (venue_id or "default", session_id or "", json.dumps(items), round(total, 2), now),
        )
        conn.commit()
        return cur.lastrowid


def get_orders(venue_id: str = None, limit: int = 50):
    """Get orders, optionally filtered by venue."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        if venue_id:
            rows = conn.execute(
                "SELECT * FROM orders WHERE venue_id = ? ORDER BY submitted_at DESC LIMIT ?",
                (venue_id, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM orders ORDER BY submitted_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["items"] = json.loads(d["items"]) if d["items"] else []
            result.append(d)
        return result


def update_order_status(order_id: int, status: str):
    """Update order status (pending, preparing, completed, cancelled)."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "UPDATE orders SET status = ?, completed_at = ? WHERE id = ?",
            (status, datetime.now(timezone.utc).isoformat() if status in ("completed", "cancelled") else None, order_id),
        )
        conn.commit()
