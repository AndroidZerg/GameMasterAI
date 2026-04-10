"""Legacy Turso module — now a thin delegator over the Supabase PG shim.

Wave 2 of the Turso→Supabase consolidation (2026-04-10) removed libsql from
the backend entirely. Every helper in this module now routes through
``app.services.supabase_pg_shim``, which speaks sqlite3's cursor API on top
of a single Supabase ``exec_sql`` RPC.

Callers that still import ``get_analytics_db`` / ``get_drink_club_db`` /
``get_menu_db`` / ``get_swp_rental_db`` keep working unchanged — they just
get a Postgres-backed connection instead of a libsql one.

The ``init_*`` and ``seed_*`` functions are kept as no-ops so existing
``main.py`` lifespan calls don't need to be removed in lockstep.
"""

from __future__ import annotations

import logging
from typing import Any

from app.services.supabase_pg_shim import (
    SupabasePGShim,
    get_pg_db,
    get_next_order_number_rpc,
)

logger = logging.getLogger(__name__)


# ── Connection getters (all share the same singleton shim) ──────

def get_analytics_db() -> SupabasePGShim:
    return get_pg_db()


def get_drink_club_db() -> SupabasePGShim:
    return get_pg_db()


def get_menu_db() -> SupabasePGShim:
    return get_pg_db()


def get_swp_rental_db() -> SupabasePGShim:
    return get_pg_db()


# ── Order counter (atomic via dedicated RPC) ────────────────────

def get_next_order_number(venue_id: str = "meetup") -> int:
    """Atomically increment and return the next order number for a venue.

    Backed by the ``increment_order_number(text)`` RPC on Supabase — safe
    across concurrent web workers because the increment happens inside the
    database, not in application code.
    """
    return get_next_order_number_rpc(venue_id)


# ── Cover art override helpers ──────────────────────────────────

def get_all_cover_art_overrides() -> list[dict]:
    db = get_pg_db()
    try:
        rows = db.execute(
            "SELECT game_id, image_url, updated_at FROM game_image_overrides ORDER BY updated_at DESC"
        ).fetchall()
        return [
            {"game_id": r["game_id"], "image_url": r["image_url"], "updated_at": r["updated_at"]}
            for r in rows
        ]
    except Exception as exc:
        logger.warning("Failed to get cover art overrides: %s", exc)
        return []


def get_cover_art_override(game_id: str) -> str | None:
    db = get_pg_db()
    try:
        row = db.execute(
            "SELECT image_url FROM game_image_overrides WHERE game_id = ?",
            (game_id,),
        ).fetchone()
        return row["image_url"] if row else None
    except Exception as exc:
        logger.warning("Failed to get cover art override for %s: %s", game_id, exc)
        return None


def upsert_cover_art_override(game_id: str, image_url: str) -> None:
    db = get_pg_db()
    db.execute(
        """INSERT INTO game_image_overrides (game_id, image_url, updated_at)
           VALUES (?, ?, now())
           ON CONFLICT(game_id) DO UPDATE SET
             image_url = excluded.image_url,
             updated_at = now()""",
        (game_id, image_url),
    )


def delete_cover_art_override(game_id: str) -> None:
    db = get_pg_db()
    db.execute("DELETE FROM game_image_overrides WHERE game_id = ?", (game_id,))


def get_cover_art_status() -> dict[str, bool]:
    db = get_pg_db()
    try:
        rows = db.execute("SELECT game_id FROM game_image_overrides").fetchall()
        return {r["game_id"]: True for r in rows}
    except Exception as exc:
        logger.warning("Failed to get cover art status: %s", exc)
        return {}
