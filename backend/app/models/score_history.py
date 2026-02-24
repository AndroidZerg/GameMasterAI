"""SQLite score history model."""

import json
import sqlite3
from datetime import datetime, timezone
from typing import Optional

from app.core.config import DB_PATH


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_score_history_table():
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS score_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id TEXT NOT NULL,
            venue_id TEXT,
            table_number TEXT,
            players TEXT DEFAULT '[]',
            scoring_type TEXT,
            winner_name TEXT,
            duration_seconds INTEGER,
            created_at TIMESTAMP NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def save_score(game_id: str, players: list[dict], scoring_type: str = "calculator",
               winner_name: str = None, duration_seconds: int = None,
               venue_id: str = None, table_number: str = None) -> int:
    conn = _get_conn()
    cur = conn.execute(
        """INSERT INTO score_history (game_id, venue_id, table_number, players, scoring_type,
           winner_name, duration_seconds, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (game_id, venue_id, table_number, json.dumps(players), scoring_type,
         winner_name, duration_seconds, datetime.now(timezone.utc).isoformat()),
    )
    sid = cur.lastrowid
    conn.commit()
    conn.close()
    return sid


def get_score_history(game_id: str, venue_id: str = None, limit: int = 20) -> list[dict]:
    conn = _get_conn()
    conditions = ["sh.game_id = ?"]
    params = [game_id]
    if venue_id:
        conditions.append("sh.venue_id = ?")
        params.append(venue_id)
    where = "WHERE " + " AND ".join(conditions)
    params.append(limit)

    rows = conn.execute(f"""
        SELECT sh.*, COALESCE(g.title, sh.game_id) as game_title
        FROM score_history sh
        LEFT JOIN games g ON sh.game_id = g.game_id
        {where}
        ORDER BY sh.created_at DESC
        LIMIT ?
    """, params).fetchall()
    conn.close()

    return [
        {
            "id": r["id"],
            "game_id": r["game_id"],
            "game_title": r["game_title"],
            "players": json.loads(r["players"]),
            "scoring_type": r["scoring_type"],
            "winner_name": r["winner_name"],
            "duration_seconds": r["duration_seconds"],
            "created_at": r["created_at"],
        }
        for r in rows
    ]


def get_leaderboard(game_id: str, venue_id: str = None, limit: int = 10) -> list[dict]:
    """Get top scores for a game. Extracts max score per entry from players JSON."""
    conn = _get_conn()
    conditions = ["game_id = ?"]
    params = [game_id]
    if venue_id:
        conditions.append("venue_id = ?")
        params.append(venue_id)
    where = "WHERE " + " AND ".join(conditions)

    rows = conn.execute(f"""
        SELECT * FROM score_history {where} ORDER BY created_at DESC
    """, params).fetchall()
    conn.close()

    # Build leaderboard from players data
    entries = []
    for r in rows:
        players = json.loads(r["players"])
        for p in players:
            entries.append({
                "player_name": p.get("name", "Unknown"),
                "score": p.get("score", 0),
                "game_id": r["game_id"],
                "date": r["created_at"],
                "winner": p.get("name") == r["winner_name"],
            })

    # Sort by score descending and return top N
    entries.sort(key=lambda x: x["score"], reverse=True)
    return entries[:limit]
