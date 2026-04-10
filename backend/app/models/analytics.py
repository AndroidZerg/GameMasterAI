"""Legacy analytics model — Supabase (local_analytics table).

Wave 3 (2026-04-10): migrated off /tmp/games.db to Supabase Postgres so
the legacy analytics dashboard survives Render deploys.

The Supabase schema promotes game_id and session_id out of the JSON blob
into their own columns; everything else (including the legacy
table_number and ip_address fields) is stuffed into `data` (jsonb).

get_analytics_summary rewrites the old SQLite json_extract queries as
in-Python aggregation over fetched rows.
"""

from datetime import datetime, timezone
from typing import Any

from app.services.supabase_client import get_admin_client


def init_analytics_table():
    """No-op — local_analytics table lives in Supabase."""
    return None


def log_event(event_type: str, event_data: dict, venue_id: str = None,
              table_number: str = None, ip_address: str = None) -> int:
    admin = get_admin_client()
    data = dict(event_data or {})
    # Stuff legacy-only fields into the jsonb blob so nothing gets lost.
    if table_number is not None and "table_number" not in data:
        data["table_number"] = table_number
    if ip_address is not None and "ip_address" not in data:
        data["ip_address"] = ip_address

    # Promote game_id out of the blob where present so column-level
    # queries can hit it without JSON probes.
    game_id = data.get("game_id")

    result = admin.table("local_analytics").insert({
        "event_type": event_type,
        "game_id": game_id,
        "venue_id": venue_id,
        "data": data,
    }).execute()
    return result.data[0]["id"] if result.data else 0


def _resolve_game_title(game_id: str) -> str:
    try:
        from app.services import game_service
        game = game_service.get_game(game_id)
        if game:
            return game.get("title") or game_id
    except Exception:
        pass
    return game_id


def get_analytics_summary(venue_id: str = None) -> dict:
    """Aggregate summary for the legacy analytics dashboard.

    Fetches today's events from Supabase and aggregates in Python since
    the PostgREST client can't express the old SQLite group-bys.
    """
    admin = get_admin_client()

    # Today's midnight (UTC)
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    # Pull today's events
    query = (
        admin.table("local_analytics")
        .select("event_type,game_id,venue_id,data,created_at")
        .gte("created_at", today_start)
    )
    if venue_id:
        query = query.eq("venue_id", venue_id)
    today_rows = query.execute().data or []

    # Counts today
    views = sum(1 for r in today_rows if r.get("event_type") == "game_view")
    searches = sum(1 for r in today_rows if r.get("event_type") == "search")
    filters = sum(1 for r in today_rows if r.get("event_type") == "filter")
    scores = sum(1 for r in today_rows if r.get("event_type") == "score_complete")

    # Hourly activity (UTC hours)
    hourly_counts: dict[int, int] = {}
    for r in today_rows:
        ts = r.get("created_at")
        if not ts:
            continue
        try:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            hourly_counts[dt.hour] = hourly_counts.get(dt.hour, 0) + 1
        except Exception:
            continue
    hourly = [{"hour": h, "event_count": c} for h, c in sorted(hourly_counts.items())]

    # Top viewed games / searched terms / popular filters — all-time, not just today
    # (matches legacy behaviour: the old SQL had no time filter on these sections).
    all_query = admin.table("local_analytics").select("event_type,game_id,data").in_(
        "event_type", ["game_view", "search", "filter"]
    )
    if venue_id:
        all_query = all_query.eq("venue_id", venue_id)
    all_rows = all_query.execute().data or []

    view_counts: dict[str, int] = {}
    term_counts: dict[str, int] = {}
    filter_counts: dict[str, int] = {}

    for r in all_rows:
        et = r.get("event_type")
        data = r.get("data") or {}
        if et == "game_view":
            gid = r.get("game_id") or data.get("game_id")
            if gid:
                view_counts[gid] = view_counts.get(gid, 0) + 1
        elif et == "search":
            term = data.get("term")
            if term:
                term_counts[term] = term_counts.get(term, 0) + 1
        elif et == "filter":
            ft = data.get("filter_type")
            fv = data.get("filter_value")
            if ft is not None or fv is not None:
                key = f"{ft}:{fv}"
                filter_counts[key] = filter_counts.get(key, 0) + 1

    top_viewed_games = sorted(view_counts.items(), key=lambda kv: kv[1], reverse=True)[:10]
    top_searched_terms = sorted(term_counts.items(), key=lambda kv: kv[1], reverse=True)[:10]
    popular_filters = sorted(filter_counts.items(), key=lambda kv: kv[1], reverse=True)[:10]

    return {
        "today": {
            "views": views,
            "searches": searches,
            "filters": filters,
            "scores": scores,
        },
        "top_viewed_games": [
            {"game_id": gid, "title": _resolve_game_title(gid), "views": cnt}
            for gid, cnt in top_viewed_games
        ],
        "top_searched_terms": [
            {"term": term, "count": cnt} for term, cnt in top_searched_terms
        ],
        "popular_filters": [
            {"filter": key, "count": cnt} for key, cnt in popular_filters
        ],
        "hourly_activity": hourly,
    }
