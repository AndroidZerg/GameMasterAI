"""SQLite house rules model — venue-specific custom rules for games."""

import sqlite3
from datetime import datetime, timezone
from typing import Optional

from app.core.config import DB_PATH


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_house_rules_table():
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS house_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venue_id TEXT NOT NULL,
            game_id TEXT NOT NULL,
            rule_text TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP,
            UNIQUE(venue_id, game_id)
        )
    """)
    conn.commit()
    conn.close()


def get_house_rules(game_id: str, venue_id: Optional[str] = None) -> Optional[dict]:
    """Get house rules for a game at a venue."""
    conn = _get_conn()
    if venue_id:
        row = conn.execute(
            "SELECT * FROM house_rules WHERE game_id = ? AND venue_id = ?",
            (game_id, venue_id),
        ).fetchone()
    else:
        row = conn.execute(
            "SELECT * FROM house_rules WHERE game_id = ? ORDER BY created_at DESC LIMIT 1",
            (game_id,),
        ).fetchone()
    conn.close()
    if row:
        return {
            "id": row["id"],
            "venue_id": row["venue_id"],
            "game_id": row["game_id"],
            "rule_text": row["rule_text"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }
    return None


def set_house_rules(venue_id: str, game_id: str, rule_text: str) -> int:
    """Create or update house rules for a game at a venue."""
    conn = _get_conn()
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        """INSERT INTO house_rules (venue_id, game_id, rule_text, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(venue_id, game_id) DO UPDATE SET
             rule_text = excluded.rule_text,
             updated_at = excluded.updated_at""",
        (venue_id, game_id, rule_text, now, now),
    )
    conn.commit()
    row = conn.execute(
        "SELECT id FROM house_rules WHERE venue_id = ? AND game_id = ?",
        (venue_id, game_id),
    ).fetchone()
    conn.close()
    return row["id"] if row else 0


def get_all_house_rules(venue_id: str) -> list[dict]:
    """Get all house rules for a venue."""
    conn = _get_conn()
    rows = conn.execute(
        """SELECT hr.*, COALESCE(g.title, hr.game_id) as game_title
           FROM house_rules hr
           LEFT JOIN games g ON hr.game_id = g.game_id
           WHERE hr.venue_id = ?
           ORDER BY hr.game_id""",
        (venue_id,),
    ).fetchall()
    conn.close()
    return [
        {
            "id": r["id"],
            "game_id": r["game_id"],
            "game_title": r["game_title"],
            "rule_text": r["rule_text"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
        }
        for r in rows
    ]
