"""SQLite game metadata model — stores searchable game info."""

import json
import sqlite3
from pathlib import Path
from typing import Optional

from app.core.config import DB_PATH
from app.services.knowledge import scan_game_files

# MSRP prices loaded once
_MSRP_PRICES: dict[str, float] = {}
# Play time data loaded once
_PLAY_TIMES: dict[str, dict] = {}


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def load_msrp_prices():
    """Load MSRP prices from content/msrp-prices.json."""
    global _MSRP_PRICES
    prices_path = Path(__file__).resolve().parents[3] / "content" / "msrp-prices.json"
    if prices_path.exists():
        try:
            _MSRP_PRICES = json.loads(prices_path.read_text(encoding="utf-8"))
        except Exception:
            _MSRP_PRICES = {}


def get_msrp(game_id: str) -> Optional[float]:
    return _MSRP_PRICES.get(game_id)


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
            play_time_min INTEGER DEFAULT 0,
            play_time_max INTEGER DEFAULT 0,
            complexity TEXT DEFAULT '',
            categories TEXT DEFAULT '[]'
        )
    """)
    # Add columns if upgrading from old schema
    for col in (
        "play_time_min INTEGER DEFAULT 0",
        "play_time_max INTEGER DEFAULT 0",
        "public_domain INTEGER DEFAULT 0",
        "publisher_approved INTEGER DEFAULT 0",
        "publisher_tag TEXT DEFAULT ''",
    ):
        try:
            conn.execute(f"ALTER TABLE games ADD COLUMN {col}")
        except sqlite3.OperationalError:
            pass
    conn.commit()
    conn.close()


def rebuild_db():
    """Re-scan all game JSON files and rebuild the SQLite database."""
    init_db()
    load_msrp_prices()
    games = scan_game_files()
    conn = _get_conn()
    conn.execute("DELETE FROM games")
    # Fallback play times by complexity if missing from JSON
    _PLAY_TIME_DEFAULTS = {
        "party": {"min": 15, "max": 30},
        "gateway": {"min": 30, "max": 60},
        "midweight": {"min": 45, "max": 90},
        "heavy": {"min": 90, "max": 180},
    }
    for g in games:
        pc = g.get("player_count", {})
        pt = g.get("play_time_minutes", {})
        if not pt.get("min") and not pt.get("max"):
            complexity = g.get("complexity", "")
            pt = _PLAY_TIME_DEFAULTS.get(complexity, {"min": 30, "max": 60})
        conn.execute(
            """INSERT OR REPLACE INTO games
               (game_id, title, aliases, player_count_min, player_count_max,
                play_time_min, play_time_max, complexity, categories,
                public_domain, publisher_approved, publisher_tag)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                g.get("game_id", ""),
                g.get("title", ""),
                json.dumps(g.get("aliases", [])),
                pc.get("min", 0),
                pc.get("max", 0),
                pt.get("min", 0),
                pt.get("max", 0),
                g.get("complexity", ""),
                json.dumps(g.get("categories", [])),
                1 if g.get("public_domain") else 0,
                1 if g.get("publisher_approved") else 0,
                g.get("publisher_tag", ""),
            ),
        )
    conn.commit()
    conn.close()
    return len(games)


def _generate_tags(row: sqlite3.Row, categories: list[str]) -> list[str]:
    """Generate 'Best For' tags based on game metadata."""
    tags = []
    pmin = row["player_count_min"]
    pmax = row["player_count_max"]
    complexity = row["complexity"] or ""
    pt_max = row["play_time_max"]
    cats_lower = [c.lower() for c in categories]

    if pmin == 1:
        tags.append("Solo")
    if pmin == 2 and pmax == 2:
        tags.append("Great for 2")
    elif pmin <= 2 and pmax >= 2:
        tags.append("Great for 2")
    if complexity in ("party", "gateway"):
        tags.append("Family Friendly")
    if complexity == "party":
        tags.append("Party Game")
    if complexity == "heavy":
        tags.append("Brain Burner")
    if pt_max and pt_max > 0 and pt_max <= 30:
        tags.append("Quick Play")
    if "cooperative" in cats_lower or "co-operative" in cats_lower:
        tags.append("Cooperative")
    if "deduction" in cats_lower:
        tags.append("Mystery/Deduction")
    if pmax and pmax >= 6:
        tags.append("Large Group")

    return tags


def _row_to_dict(row: sqlite3.Row) -> dict:
    game_id = row["game_id"]
    categories = json.loads(row["categories"])
    result = {
        "game_id": game_id,
        "title": row["title"],
        "aliases": json.loads(row["aliases"]),
        "player_count": {"min": row["player_count_min"], "max": row["player_count_max"]},
        "play_time_minutes": {"min": row["play_time_min"], "max": row["play_time_max"]},
        "complexity": row["complexity"],
        "categories": categories,
        "tags": _generate_tags(row, categories),
        "public_domain": bool(row["public_domain"]),
        "publisher_approved": bool(row["publisher_approved"]),
    }
    msrp = get_msrp(game_id)
    if msrp is not None:
        result["msrp"] = msrp
    return result


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

    return [_row_to_dict(row) for row in rows]


def filter_games(complexity: Optional[str] = None, min_players: Optional[int] = None,
                 max_players: Optional[int] = None, category: Optional[str] = None,
                 max_play_time: Optional[int] = None, tag: Optional[str] = None) -> list[dict]:
    """Advanced game filtering with multiple combinable params."""
    conn = _get_conn()
    query = "SELECT * FROM games WHERE 1=1"
    params = []

    if complexity:
        query += " AND complexity = ?"
        params.append(complexity)
    if min_players is not None:
        query += " AND player_count_max >= ?"
        params.append(min_players)
    if max_players is not None:
        query += " AND player_count_min <= ?"
        params.append(max_players)
    if max_play_time is not None:
        query += " AND play_time_max > 0 AND play_time_max <= ?"
        params.append(max_play_time)

    query += " ORDER BY title"
    rows = conn.execute(query, params).fetchall()
    conn.close()

    results = [_row_to_dict(row) for row in rows]

    # Category filter done in Python since categories is JSON
    if category:
        cat_lower = category.lower()
        results = [g for g in results if cat_lower in [c.lower() for c in g["categories"]]]

    # Tag filter done in Python
    if tag:
        tag_lower = tag.lower().replace("-", " ")
        results = [g for g in results if tag_lower in [t.lower() for t in g.get("tags", [])]]

    return results


def get_all_categories() -> list[dict]:
    """Return all unique categories with game counts."""
    conn = _get_conn()
    rows = conn.execute("SELECT categories FROM games").fetchall()
    conn.close()

    counts: dict[str, int] = {}
    for row in rows:
        cats = json.loads(row["categories"])
        for c in cats:
            counts[c] = counts.get(c, 0) + 1

    return sorted(
        [{"category": k, "count": v} for k, v in counts.items()],
        key=lambda x: x["category"],
    )


def get_quick_games(max_time: int = 30) -> list[dict]:
    """Return games where max play time <= max_time minutes."""
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM games WHERE play_time_max > 0 AND play_time_max <= ? ORDER BY play_time_max, title",
        (max_time,),
    ).fetchall()
    conn.close()
    return [_row_to_dict(row) for row in rows]


def search_by_publisher_tag(tag: str, search: Optional[str] = None, complexity: Optional[str] = None) -> list[dict]:
    """Return only games with a specific publisher_tag (e.g. 'stonemaier')."""
    conn = _get_conn()
    query = "SELECT * FROM games WHERE publisher_tag = ?"
    params: list = [tag]

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

    return [_row_to_dict(row) for row in rows]


def search_limited_library(search: Optional[str] = None, complexity: Optional[str] = None) -> list[dict]:
    """Return only games tagged public_domain or publisher_approved (for demo roles)."""
    conn = _get_conn()
    query = "SELECT * FROM games WHERE (public_domain = 1 OR publisher_approved = 1)"
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

    return [_row_to_dict(row) for row in rows]


def search_convention_library(search: Optional[str] = None, complexity: Optional[str] = None) -> list[dict]:
    """Return only publisher_approved games (for convention/signup roles). No public_domain games."""
    conn = _get_conn()
    query = "SELECT * FROM games WHERE publisher_approved = 1"
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

    return [_row_to_dict(row) for row in rows]
