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


def create_order(venue_id: str, session_id: str, items: list, total: float, customer_name: str = None) -> int:
    """Insert a new order, return its ID."""
    now = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(DB_PATH) as conn:
        # Add customer_name column if it doesn't exist (migration-safe)
        try:
            conn.execute("ALTER TABLE orders ADD COLUMN customer_name TEXT DEFAULT ''")
        except sqlite3.OperationalError:
            pass  # column already exists
        cur = conn.execute(
            "INSERT INTO orders (venue_id, session_id, items, total, customer_name, submitted_at) VALUES (?, ?, ?, ?, ?, ?)",
            (venue_id or "default", session_id or "", json.dumps(items), round(total, 2), customer_name or "", now),
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


# ── Print Queue ───────────────────────────────────────────────────


def init_print_queue_tables():
    """Create print_queue and venue_order_counters tables."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS print_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                venue_id TEXT NOT NULL,
                order_data TEXT NOT NULL,
                order_number INTEGER,
                print_status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                printed_at TIMESTAMP,
                print_attempts INTEGER DEFAULT 0,
                last_error TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS venue_order_counters (
                venue_id TEXT PRIMARY KEY,
                last_order_number INTEGER DEFAULT 0
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS print_agent_heartbeats (
                venue_id TEXT PRIMARY KEY,
                printer_ip TEXT,
                printer_status TEXT DEFAULT 'unknown',
                agent_uptime_seconds INTEGER DEFAULT 0,
                last_seen TIMESTAMP
            )
        """)
        conn.commit()


def next_order_number(venue_id: str) -> int:
    """Atomically increment and return the next order number for a venue."""
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute(
            "INSERT INTO venue_order_counters (venue_id, last_order_number) VALUES (?, 1) "
            "ON CONFLICT(venue_id) DO UPDATE SET last_order_number = last_order_number + 1",
            (venue_id,),
        )
        conn.commit()
        row = conn.execute(
            "SELECT last_order_number FROM venue_order_counters WHERE venue_id = ?",
            (venue_id,),
        ).fetchone()
        return row[0]


def insert_print_queue(order_id: int, venue_id: str, order_data: str, order_number: int):
    """Insert a new print queue record."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT INTO print_queue (order_id, venue_id, order_data, order_number) VALUES (?, ?, ?, ?)",
            (order_id, venue_id, order_data, order_number),
        )
        conn.commit()


def get_pending_prints(venue_id: str):
    """Get pending print queue items for a venue."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM print_queue WHERE venue_id = ? AND print_status = 'pending' ORDER BY created_at ASC",
            (venue_id,),
        ).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["order_data"] = json.loads(d["order_data"]) if d["order_data"] else {}
            result.append(d)
        return result


def update_print_status(order_id: int, status: str, error: str = None):
    """Update print status for an order."""
    now = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(DB_PATH) as conn:
        if status == "printed":
            conn.execute(
                "UPDATE print_queue SET print_status = 'printed', printed_at = ?, print_attempts = print_attempts + 1 WHERE order_id = ?",
                (now, order_id),
            )
        elif status == "failed":
            conn.execute(
                "UPDATE print_queue SET print_status = 'failed', print_attempts = print_attempts + 1, last_error = ? WHERE order_id = ?",
                (error or "", order_id),
            )
        conn.commit()


def reset_print_status(order_id: int):
    """Reset print status to pending for reprint."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "UPDATE print_queue SET print_status = 'pending', print_attempts = 0, printed_at = NULL, last_error = NULL WHERE order_id = ?",
            (order_id,),
        )
        conn.commit()


def get_print_history(venue_id: str, limit: int = 50):
    """Get recent print history for a venue."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM print_queue WHERE venue_id = ? ORDER BY created_at DESC LIMIT ?",
            (venue_id, limit),
        ).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["order_data"] = json.loads(d["order_data"]) if d["order_data"] else {}
            result.append(d)
        return result


def upsert_heartbeat(venue_id: str, printer_ip: str, printer_status: str, uptime: int):
    """Insert or update print agent heartbeat."""
    now = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT INTO print_agent_heartbeats (venue_id, printer_ip, printer_status, agent_uptime_seconds, last_seen) "
            "VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(venue_id) DO UPDATE SET printer_ip = ?, printer_status = ?, agent_uptime_seconds = ?, last_seen = ?",
            (venue_id, printer_ip, printer_status, uptime, now, printer_ip, printer_status, uptime, now),
        )
        conn.commit()


def get_heartbeat(venue_id: str):
    """Get latest heartbeat for a venue."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM print_agent_heartbeats WHERE venue_id = ?",
            (venue_id,),
        ).fetchone()
        return dict(row) if row else None
