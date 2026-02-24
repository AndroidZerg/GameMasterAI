"""SQLite venue accounts model."""

import sqlite3
from datetime import datetime, timezone
from typing import Optional

from app.core.config import DB_PATH


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_venues_table():
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS venues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venue_id TEXT UNIQUE NOT NULL,
            venue_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            accent_color TEXT DEFAULT '#e94560',
            logo_url TEXT,
            tagline TEXT,
            default_theme TEXT DEFAULT 'dark',
            created_at TIMESTAMP NOT NULL,
            last_login TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


def init_venue_collections_table():
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS venue_collections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venue_id TEXT NOT NULL,
            game_id TEXT NOT NULL,
            added_at TIMESTAMP NOT NULL,
            UNIQUE(venue_id, game_id)
        )
    """)
    conn.commit()
    conn.close()


def get_venue_by_email(email: str) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM venues WHERE email = ?", (email,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_venue_by_id(venue_id: str) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM venues WHERE venue_id = ?", (venue_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def create_venue(venue_id: str, venue_name: str, email: str, password_hash: str,
                 tagline: str = "", accent_color: str = "#e94560") -> int:
    conn = _get_conn()
    cur = conn.execute(
        """INSERT INTO venues (venue_id, venue_name, email, password_hash, tagline, accent_color, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (venue_id, venue_name, email, password_hash, tagline, accent_color,
         datetime.now(timezone.utc).isoformat()),
    )
    vid = cur.lastrowid
    conn.commit()
    conn.close()
    return vid


def update_venue_login(venue_id: str):
    conn = _get_conn()
    conn.execute(
        "UPDATE venues SET last_login = ? WHERE venue_id = ?",
        (datetime.now(timezone.utc).isoformat(), venue_id),
    )
    conn.commit()
    conn.close()


def update_venue_config(venue_id: str, **kwargs) -> Optional[dict]:
    conn = _get_conn()
    allowed = {"venue_name", "accent_color", "logo_url", "tagline", "default_theme"}
    sets = []
    params = []
    for k, v in kwargs.items():
        if k in allowed and v is not None:
            sets.append(f"{k} = ?")
            params.append(v)
    if not sets:
        conn.close()
        return get_venue_by_id(venue_id)
    params.append(venue_id)
    conn.execute(f"UPDATE venues SET {', '.join(sets)} WHERE venue_id = ?", params)
    conn.commit()
    conn.close()
    return get_venue_by_id(venue_id)


def get_venue_collection(venue_id: str) -> list[str]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT game_id FROM venue_collections WHERE venue_id = ? ORDER BY game_id",
        (venue_id,),
    ).fetchall()
    conn.close()
    return [r["game_id"] for r in rows]


def set_venue_collection(venue_id: str, game_ids: list[str]):
    conn = _get_conn()
    conn.execute("DELETE FROM venue_collections WHERE venue_id = ?", (venue_id,))
    now = datetime.now(timezone.utc).isoformat()
    for gid in game_ids:
        conn.execute(
            "INSERT OR IGNORE INTO venue_collections (venue_id, game_id, added_at) VALUES (?, ?, ?)",
            (venue_id, gid, now),
        )
    conn.commit()
    conn.close()


def seed_demo_venue(password_hash: str):
    """Seed the demo venue if it doesn't exist. Returns True if seeded."""
    existing = get_venue_by_id("meepleville")
    if existing:
        return False
    create_venue(
        venue_id="meepleville",
        venue_name="Meepleville",
        email="demo@meepleville.com",
        password_hash=password_hash,
        tagline="Las Vegas Board Game Cafe",
        accent_color="#e94560",
    )
    return True
