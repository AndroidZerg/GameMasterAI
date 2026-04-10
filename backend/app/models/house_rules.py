"""House rules model — Supabase (house_rules table).

Venue-specific custom rules overlays for games.

Wave 3 (2026-04-10): migrated off /tmp/games.db to Supabase Postgres so
venue rule customizations persist across Render deploys.

The Supabase schema has no `updated_at` column and no UNIQUE constraint on
(venue_id, game_id), so set_house_rules does a read-then-update/insert by
hand (one row per (venue_id, game_id) pair).
"""

from typing import Optional

from app.services.supabase_client import get_admin_client


def init_house_rules_table():
    """No-op — house_rules table lives in Supabase."""
    return None


def _resolve_game_title(game_id: str) -> str:
    try:
        from app.services import game_service
        game = game_service.get_game(game_id)
        if game:
            return game.get("title") or game_id
    except Exception:
        pass
    return game_id


def get_house_rules(game_id: str, venue_id: Optional[str] = None) -> Optional[dict]:
    """Get house rules for a game at a venue."""
    admin = get_admin_client()
    query = admin.table("house_rules").select("*").eq("game_id", game_id)
    if venue_id:
        query = query.eq("venue_id", venue_id)
    else:
        query = query.order("created_at", desc=True)
    result = query.limit(1).execute()
    if not result.data:
        return None
    row = result.data[0]
    return {
        "id": row.get("id"),
        "venue_id": row.get("venue_id"),
        "game_id": row.get("game_id"),
        "rule_text": row.get("rule_text"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("created_at"),  # no updated_at column; reuse created_at for compat
    }


def set_house_rules(venue_id: str, game_id: str, rule_text: str) -> int:
    """Create or update house rules for a game at a venue.

    Supabase table has no composite UNIQUE constraint, so do a manual upsert.
    """
    admin = get_admin_client()
    existing = (
        admin.table("house_rules")
        .select("id")
        .eq("venue_id", venue_id)
        .eq("game_id", game_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        rid = existing.data[0]["id"]
        admin.table("house_rules").update({"rule_text": rule_text}).eq("id", rid).execute()
        return rid
    result = admin.table("house_rules").insert({
        "venue_id": venue_id,
        "game_id": game_id,
        "rule_text": rule_text,
    }).execute()
    return result.data[0]["id"] if result.data else 0


def get_all_house_rules(venue_id: str) -> list[dict]:
    """Get all house rules for a venue."""
    admin = get_admin_client()
    result = (
        admin.table("house_rules")
        .select("*")
        .eq("venue_id", venue_id)
        .order("game_id")
        .execute()
    )
    rows = result.data or []
    return [
        {
            "id": r.get("id"),
            "game_id": r.get("game_id"),
            "game_title": _resolve_game_title(r.get("game_id") or ""),
            "rule_text": r.get("rule_text"),
            "created_at": r.get("created_at"),
            "updated_at": r.get("created_at"),
        }
        for r in rows
    ]
