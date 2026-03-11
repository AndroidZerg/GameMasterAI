"""
Home screen configuration — GOTD and Staff Picks.
Single source of truth: Turso database.
No caching. No GitHub API. No in-memory state. No JSON files.
"""

import logging

from app.services.turso import get_analytics_db

logger = logging.getLogger(__name__)


# ── Table init ────────────────────────────────────────────────────

def init_home_config_tables():
    """Create home_gotd and home_staff_picks tables in Turso."""
    db = get_analytics_db()
    db.execute("""
        CREATE TABLE IF NOT EXISTS home_gotd (
            venue_key TEXT PRIMARY KEY,
            game_id TEXT NOT NULL,
            mode TEXT NOT NULL DEFAULT 'manual',
            updated_at TEXT DEFAULT (datetime('now'))
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS home_staff_picks (
            venue_key TEXT NOT NULL,
            game_id TEXT NOT NULL,
            position INTEGER NOT NULL,
            updated_at TEXT DEFAULT (datetime('now')),
            PRIMARY KEY (venue_key, game_id)
        )
    """)
    db.commit()
    logger.info("Home config tables (home_gotd, home_staff_picks) initialized")


# ── GOTD ──────────────────────────────────────────────────────────

def get_gotd(venue_key: str) -> dict | None:
    """
    Get Game of the Day for a venue.
    Lookup order: venue_key -> "global" -> None
    """
    db = get_analytics_db()
    try:
        # Try venue-specific first
        row = db.execute(
            "SELECT game_id, mode FROM home_gotd WHERE venue_key = ?",
            (venue_key,)
        ).fetchone()
        if row:
            return {"game_id": row[0], "mode": row[1]}

        # Fall back to global
        if venue_key != "global":
            row = db.execute(
                "SELECT game_id, mode FROM home_gotd WHERE venue_key = ?",
                ("global",)
            ).fetchone()
            if row:
                return {"game_id": row[0], "mode": row[1]}

        return None
    except Exception as e:
        logger.warning(f"Failed to get GOTD for {venue_key}: {e}")
        return None


def set_gotd(venue_key: str, game_id: str, mode: str = "manual"):
    """Set GOTD for a venue. Upsert."""
    db = get_analytics_db()
    db.execute(
        """INSERT INTO home_gotd (venue_key, game_id, mode, updated_at)
           VALUES (?, ?, ?, datetime('now'))
           ON CONFLICT(venue_key) DO UPDATE SET
             game_id = excluded.game_id,
             mode = excluded.mode,
             updated_at = datetime('now')""",
        (venue_key, game_id, mode)
    )
    db.commit()


# ── Staff Picks ───────────────────────────────────────────────────

def get_staff_picks(venue_key: str) -> list[dict]:
    """
    Get Staff Picks for a venue.
    Lookup order: venue_key -> "global" -> empty list
    Returns: [{"game_id": str, "position": int}, ...]
    """
    db = get_analytics_db()
    try:
        # Try venue-specific first
        rows = db.execute(
            "SELECT game_id, position FROM home_staff_picks WHERE venue_key = ? ORDER BY position",
            (venue_key,)
        ).fetchall()
        if rows:
            return [{"game_id": row[0], "position": row[1]} for row in rows]

        # Fall back to global
        if venue_key != "global":
            rows = db.execute(
                "SELECT game_id, position FROM home_staff_picks WHERE venue_key = ? ORDER BY position",
                ("global",)
            ).fetchall()
            if rows:
                return [{"game_id": row[0], "position": row[1]} for row in rows]

        return []
    except Exception as e:
        logger.warning(f"Failed to get staff picks for {venue_key}: {e}")
        return []


def set_staff_picks(venue_key: str, game_ids: list[str]):
    """Replace all Staff Picks for a venue. game_ids is an ordered list."""
    db = get_analytics_db()
    db.execute(
        "DELETE FROM home_staff_picks WHERE venue_key = ?",
        (venue_key,)
    )
    for i, game_id in enumerate(game_ids):
        db.execute(
            "INSERT INTO home_staff_picks (venue_key, game_id, position, updated_at) VALUES (?, ?, ?, datetime('now'))",
            (venue_key, game_id, i + 1)
        )
    db.commit()


# ── Venue config management ───────────────────────────────────────

def delete_venue_config(venue_key: str):
    """Delete all custom config for a venue (reset to global)."""
    db = get_analytics_db()
    db.execute("DELETE FROM home_gotd WHERE venue_key = ?", (venue_key,))
    db.execute("DELETE FROM home_staff_picks WHERE venue_key = ?", (venue_key,))
    db.commit()


def has_custom_config(venue_key: str) -> bool:
    """Check if a venue has custom GOTD or Staff Picks."""
    if venue_key in ("global", "_default"):
        return False
    db = get_analytics_db()
    try:
        row = db.execute(
            "SELECT COUNT(*) FROM home_gotd WHERE venue_key = ?",
            (venue_key,)
        ).fetchone()
        if row and row[0] > 0:
            return True
        row = db.execute(
            "SELECT COUNT(*) FROM home_staff_picks WHERE venue_key = ?",
            (venue_key,)
        ).fetchone()
        return bool(row and row[0] > 0)
    except Exception:
        return False


def get_configured_venue_keys() -> list[str]:
    """Get all venue_keys that have custom config (not 'global')."""
    db = get_analytics_db()
    try:
        keys = set()
        rows = db.execute(
            "SELECT DISTINCT venue_key FROM home_gotd WHERE venue_key != 'global'"
        ).fetchall()
        for row in rows:
            keys.add(row[0])
        rows = db.execute(
            "SELECT DISTINCT venue_key FROM home_staff_picks WHERE venue_key != 'global'"
        ).fetchall()
        for row in rows:
            keys.add(row[0])
        return sorted(keys)
    except Exception as e:
        logger.warning(f"Failed to get configured venue keys: {e}")
        return []


# ── Seeding ───────────────────────────────────────────────────────

def seed_if_empty():
    """Seed global and convention defaults if tables are empty."""
    db = get_analytics_db()

    # Check if global has any data
    row = db.execute("SELECT COUNT(*) FROM home_gotd WHERE venue_key = 'global'").fetchone()
    if not row or row[0] == 0:
        # Global defaults
        set_gotd("global", "wingspan", "manual")
        set_staff_picks("global", [
            "above-and-below", "carcassonne", "ark-nova", "dune-imperium",
            "blood-on-the-clocktower", "brass-birmingham", "gloomhaven",
            "twilight-imperium-4th-edition", "terraforming-mars", "castles-of-burgundy",
        ])
        logger.info("Seeded global home config")

    # Check if convention has any data
    row = db.execute("SELECT COUNT(*) FROM home_gotd WHERE venue_key = 'convention'").fetchone()
    if not row or row[0] == 0:
        # Convention config — Stonemaier 6
        set_gotd("convention", "wingspan", "manual")
        set_staff_picks("convention", [
            "wyrmspan", "scythe", "viticulture", "tapestry", "expeditions", "wingspan",
        ])
        logger.info("Seeded convention home config")
