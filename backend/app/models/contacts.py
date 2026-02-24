"""SQLite contacts model."""

import sqlite3
from datetime import datetime, timezone

from app.core.config import DB_PATH


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_contacts_table():
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            venue_name TEXT,
            email TEXT,
            message TEXT,
            created_at TIMESTAMP NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def create_contact(name: str, venue_name: str, email: str, message: str) -> int:
    conn = _get_conn()
    cur = conn.execute(
        "INSERT INTO contacts (name, venue_name, email, message, created_at) VALUES (?, ?, ?, ?, ?)",
        (name, venue_name, email, message, datetime.now(timezone.utc).isoformat()),
    )
    contact_id = cur.lastrowid
    conn.commit()
    conn.close()
    return contact_id


def get_all_contacts() -> list[dict]:
    """Return all contacts, newest first."""
    conn = _get_conn()
    rows = conn.execute(
        "SELECT name, venue_name, email, message, created_at FROM contacts ORDER BY id DESC"
    ).fetchall()
    conn.close()
    return [
        {
            "name": r["name"],
            "venue": r["venue_name"] or "",
            "email": r["email"],
            "message": r["message"] or "",
            "submitted_at": r["created_at"],
        }
        for r in rows
    ]
