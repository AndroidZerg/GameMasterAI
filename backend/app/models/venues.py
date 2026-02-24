"""SQLite venue accounts model."""

import json
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
            address TEXT,
            phone TEXT,
            website TEXT,
            default_theme TEXT DEFAULT 'dark',
            created_at TIMESTAMP NOT NULL,
            last_login TIMESTAMP
        )
    """)
    # Add columns if upgrading from old schema
    for col in ("address TEXT", "phone TEXT", "website TEXT", "staff_picks TEXT DEFAULT '[]'"):
        try:
            conn.execute(f"ALTER TABLE venues ADD COLUMN {col}")
        except sqlite3.OperationalError:
            pass
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


def get_all_venues() -> list[dict]:
    conn = _get_conn()
    rows = conn.execute("SELECT * FROM venues ORDER BY venue_name").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def create_venue(venue_id: str, venue_name: str, email: str, password_hash: str,
                 tagline: str = "", accent_color: str = "#e94560",
                 address: str = "", phone: str = "", website: str = "") -> int:
    conn = _get_conn()
    cur = conn.execute(
        """INSERT INTO venues (venue_id, venue_name, email, password_hash, tagline, accent_color,
           address, phone, website, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (venue_id, venue_name, email, password_hash, tagline, accent_color,
         address, phone, website, datetime.now(timezone.utc).isoformat()),
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
    allowed = {"venue_name", "accent_color", "logo_url", "tagline", "default_theme",
               "address", "phone", "website", "staff_picks"}
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


def get_staff_picks(venue_id: str) -> list[str]:
    """Get venue's staff-picked game IDs."""
    conn = _get_conn()
    row = conn.execute("SELECT staff_picks FROM venues WHERE venue_id = ?", (venue_id,)).fetchone()
    conn.close()
    if row and row["staff_picks"]:
        try:
            return json.loads(row["staff_picks"])
        except Exception:
            return []
    return []


def set_staff_picks(venue_id: str, game_ids: list[str]):
    """Set venue's staff picks."""
    conn = _get_conn()
    conn.execute("UPDATE venues SET staff_picks = ? WHERE venue_id = ?",
                 (json.dumps(game_ids), venue_id))
    conn.commit()
    conn.close()


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


# ── Seed data ────────────────────────────────────────────────────

_DEMO_VENUES = [
    {
        "venue_id": "playgmai-demo",
        "venue_name": "GameMaster AI Demo",
        "email": "demo@playgmai.com",
        "tagline": "AI-Powered Board Game Teaching",
        "accent_color": "#e94560",
        "address": "",
        "phone": "",
        "website": "https://playgmai.com",
    },
    {
        "venue_id": "meepleville",
        "venue_name": "Meepleville Board Game Cafe",
        "email": "demo@meepleville.com",
        "tagline": "Las Vegas's First Board Game Cafe — 2,600+ Games",
        "accent_color": "#e94560",
        "address": "4704 W Sahara Ave, Las Vegas, NV 89102",
        "phone": "702-444-4540",
        "website": "https://meepleville.com",
    },
    {
        "venue_id": "knight-and-day",
        "venue_name": "Knight & Day Games",
        "email": "demo@knightanddaygames.com",
        "tagline": "Board Games, Card Games & Community in Town Square",
        "accent_color": "#4a90d9",
        "address": "6521 Las Vegas Blvd South Ste. C-105, Las Vegas, NV 89119",
        "phone": "",
        "website": "https://knightanddaygames.com",
    },
    {
        "venue_id": "little-shop-of-magic",
        "venue_name": "Little Shop of Magic",
        "email": "demo@littleshopofmagic.com",
        "tagline": "Vegas's Oldest Game Store Since 1994",
        "accent_color": "#7b2d8e",
        "address": "750 Dorrell Lane, Suite 150, North Las Vegas, NV",
        "phone": "",
        "website": "https://littleshopofmagic.com",
    },
    {
        "venue_id": "shall-we-play",
        "venue_name": "Shall We Play?",
        "email": "demo@shallweplay.com",
        "tagline": "Game Nights, Events & Community Gaming",
        "accent_color": "#2ecc71",
        "address": "Las Vegas, NV",
        "phone": "",
        "website": "",
    },
    {
        "venue_id": "grouchy-johns",
        "venue_name": "Grouchy John's Coffee",
        "email": "demo@grouchyjohns.com",
        "tagline": "Coffee & Board Games — Two Locations",
        "accent_color": "#d4a574",
        "address": "8520 S Maryland Pkwy, Las Vegas, NV",
        "phone": "",
        "website": "https://grouchyjohns.com",
    },
    {
        "venue_id": "natural-twenty",
        "venue_name": "Natural Twenty Games",
        "email": "demo@naturaltwentygames.com",
        "tagline": "Tabletop Gaming in Henderson",
        "accent_color": "#e67e22",
        "address": "4136 Sunset Rd, Henderson, NV",
        "phone": "",
        "website": "",
    },
]


def seed_all_venues(password_hash: str) -> list[str]:
    """Seed all demo venues with UPSERT — always ensures correct data.

    If a venue already exists, updates its password_hash and metadata.
    Returns list of venue_ids that were created or updated.
    """
    conn = _get_conn()
    seeded = []
    now = datetime.now(timezone.utc).isoformat()
    for v in _DEMO_VENUES:
        conn.execute(
            """INSERT INTO venues (venue_id, venue_name, email, password_hash, tagline,
               accent_color, address, phone, website, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(venue_id) DO UPDATE SET
                 venue_name = excluded.venue_name,
                 email = excluded.email,
                 password_hash = excluded.password_hash,
                 tagline = excluded.tagline,
                 accent_color = excluded.accent_color,
                 address = excluded.address,
                 phone = excluded.phone,
                 website = excluded.website""",
            (v["venue_id"], v["venue_name"], v["email"], password_hash, v["tagline"],
             v["accent_color"], v.get("address", ""), v.get("phone", ""),
             v.get("website", ""), now),
        )
        seeded.append(v["venue_id"])
    conn.commit()
    conn.close()
    return seeded
