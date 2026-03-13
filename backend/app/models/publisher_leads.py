"""SQLite publisher_leads model."""

import sqlite3
from datetime import datetime, timezone

from app.core.config import DB_PATH


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_publisher_leads_table():
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS publisher_leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            company TEXT NOT NULL,
            games TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT,
            created_at TIMESTAMP NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def create_publisher_lead(
    first_name: str, last_name: str, company: str,
    games: str, email: str, message: str,
) -> int:
    conn = _get_conn()
    cur = conn.execute(
        "INSERT INTO publisher_leads (first_name, last_name, company, games, email, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (first_name, last_name, company, games, email, message, datetime.now(timezone.utc).isoformat()),
    )
    lead_id = cur.lastrowid
    conn.commit()
    conn.close()
    return lead_id


def get_all_publisher_leads() -> list[dict]:
    """Return all publisher leads, newest first."""
    conn = _get_conn()
    rows = conn.execute(
        "SELECT first_name, last_name, company, games, email, message, created_at FROM publisher_leads ORDER BY id DESC"
    ).fetchall()
    conn.close()
    return [
        {
            "first_name": r["first_name"],
            "last_name": r["last_name"],
            "company": r["company"],
            "games": r["games"],
            "email": r["email"],
            "message": r["message"] or "",
            "submitted_at": r["created_at"],
        }
        for r in rows
    ]
