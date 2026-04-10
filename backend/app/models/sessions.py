"""Game session tracking — Supabase (game_sessions table).

Wave 3 (2026-04-10): migrated off /tmp/games.db to Supabase Postgres so
session data persists across Render deploys.
"""

from datetime import datetime, timezone

from app.services.supabase_client import get_admin_client


def init_sessions_table():
    """No-op — game_sessions table lives in Supabase and is created out-of-band."""
    return None


def create_session(game_id: str, table_number: str | None = None, venue_id: str | None = None) -> int:
    admin = get_admin_client()
    vid = venue_id or "default"
    result = admin.table("game_sessions").insert({
        "game_id": game_id,
        "table_number": table_number,
        "venue_id": vid,
        "started_at": datetime.now(timezone.utc).isoformat(),
    }).execute()
    return result.data[0]["id"] if result.data else 0


def end_session(session_id: int) -> bool:
    admin = get_admin_client()
    row = admin.table("game_sessions").select("started_at").eq("id", session_id).limit(1).execute()
    if not row.data:
        return False
    started_raw = row.data[0].get("started_at")
    if not started_raw:
        return False
    started = datetime.fromisoformat(started_raw.replace("Z", "+00:00"))
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    duration = int((now - started).total_seconds())
    admin.table("game_sessions").update({
        "ended_at": now.isoformat(),
        "duration_seconds": duration,
    }).eq("id", session_id).execute()
    return True


def increment_questions(session_id: int) -> bool:
    """Read current count, increment, write back. Supabase has no atomic increment via PostgREST."""
    admin = get_admin_client()
    row = admin.table("game_sessions").select("questions_asked").eq("id", session_id).limit(1).execute()
    if not row.data:
        return False
    current = row.data[0].get("questions_asked") or 0
    admin.table("game_sessions").update({"questions_asked": current + 1}).eq("id", session_id).execute()
    return True


def set_score_tracked(session_id: int) -> bool:
    admin = get_admin_client()
    # Check existence first so the return value is meaningful
    row = admin.table("game_sessions").select("id").eq("id", session_id).limit(1).execute()
    if not row.data:
        return False
    admin.table("game_sessions").update({"score_tracked": True}).eq("id", session_id).execute()
    return True
