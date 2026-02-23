"""SQLite game metadata model — stores searchable game info."""

import json
import sqlite3
from typing import Optional

from app.core.config import DB_PATH
from app.services.knowledge import scan_game_files


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the games table if it doesn't exist."""
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS games (
            game_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            aliases TEXT DEFAULT '[]',
            player_count_min INTEGER DEFAULT 0,
            player_count_max INTEGER DEFAULT 0,
            complexity TEXT DEFAULT '',
            categories TEXT DEFAULT '[]'
        )
    """)
    conn.commit()
    conn.close()


def rebuild_db():
    """Re-scan all game JSON files and rebuild the SQLite database."""
    init_db()
    games = scan_game_files()
    conn = _get_conn()
    conn.execute("DELETE FROM games")
    for g in games:
        pc = g.get("player_count", {})
        conn.execute(
            "INSERT OR REPLACE INTO games (game_id, title, aliases, player_count_min, player_count_max, complexity, categories) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                g.get("game_id", ""),
                g.get("title", ""),
                json.dumps(g.get("aliases", [])),
                pc.get("min", 0),
                pc.get("max", 0),
                g.get("complexity", ""),
                json.dumps(g.get("categories", [])),
            ),
        )
    conn.commit()
    conn.close()
    return len(games)


def search_games(search: Optional[str] = None, complexity: Optional[str] = None) -> list[dict]:
    """Search games with optional title filter and complexity filter."""
    conn = _get_conn()
    query = "SELECT * FROM games WHERE 1=1"
    params = []

    if search:
        query += " AND (title LIKE ? OR aliases LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term])

    if complexity:
        query += " AND complexity = ?"
        params.append(complexity)

    query += " ORDER BY title"
    rows = conn.execute(query, params).fetchall()
    conn.close()

    results = []
    for row in rows:
        results.append({
            "game_id": row["game_id"],
            "title": row["title"],
            "aliases": json.loads(row["aliases"]),
            "player_count": {"min": row["player_count_min"], "max": row["player_count_max"]},
            "complexity": row["complexity"],
            "categories": json.loads(row["categories"]),
        })
    return results
