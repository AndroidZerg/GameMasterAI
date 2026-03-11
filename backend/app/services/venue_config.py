"""
Venue config service — GOTD and Staff Picks stored in Turso.

Single source of truth. No cache, no JSON files, no GitHub API.
Turso is fast enough for our scale.
"""

import logging

from app.services.turso import (
    get_turso_staff_picks,
    set_turso_staff_picks,
    get_turso_gotd,
    set_turso_gotd,
    delete_turso_venue_config,
    get_analytics_db,
)

logger = logging.getLogger(__name__)


def get_gotd(venue_key: str) -> dict:
    """Get GOTD for a venue. Falls back to 'global' if venue has no custom GOTD."""
    if venue_key and venue_key != "global":
        result = get_turso_gotd(venue_key)
        if result:
            return result
    # Fallback to global
    result = get_turso_gotd("global")
    if result:
        return result
    # Ultimate fallback
    return {"game_id": "wingspan", "mode": "manual"}


def set_gotd(venue_key: str, game_id: str, mode: str = "manual") -> None:
    """Set GOTD for a venue. Upsert."""
    set_turso_gotd(venue_key, game_id, mode)


def get_staff_picks(venue_key: str) -> list[dict]:
    """Get ordered Staff Picks for a venue. Falls back to 'global'."""
    if venue_key and venue_key != "global":
        picks = get_turso_staff_picks(venue_key)
        if picks:
            return [{"game_id": gid, "position": i + 1} for i, gid in enumerate(picks)]
    # Fallback to global
    picks = get_turso_staff_picks("global")
    if picks:
        return [{"game_id": gid, "position": i + 1} for i, gid in enumerate(picks)]
    return []


def set_staff_picks(venue_key: str, picks: list[str]) -> None:
    """Replace all Staff Picks for a venue."""
    set_turso_staff_picks(venue_key, picks)


def delete_venue_config(venue_key: str) -> None:
    """Remove all custom config for a venue."""
    delete_turso_venue_config(venue_key)


def get_venue_keys_with_custom_config() -> list[str]:
    """Return list of venue_keys that have custom GOTD or Staff Picks (not 'global')."""
    db = get_analytics_db()
    try:
        keys = set()
        rows = db.execute(
            "SELECT DISTINCT venue_key FROM venue_staff_picks WHERE venue_key != 'global'"
        ).fetchall()
        for row in rows:
            keys.add(row[0])
        rows = db.execute(
            "SELECT venue_key FROM venue_gotd WHERE venue_key != 'global'"
        ).fetchall()
        for row in rows:
            keys.add(row[0])
        return sorted(keys)
    except Exception as e:
        logger.warning(f"Failed to get venue keys with custom config: {e}")
        return []


def has_custom_config(venue_key: str) -> bool:
    """Check if a venue has custom GOTD or Staff Picks."""
    if venue_key in ("global", "_default"):
        return False
    picks = get_turso_staff_picks(venue_key)
    gotd = get_turso_gotd(venue_key)
    return bool(picks or gotd)
