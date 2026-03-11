"""CRM service — aggregates venue data for Tim's admin CRM view."""

import sqlite3
from datetime import datetime, timezone, timedelta

from app.core.config import DB_PATH


def _get_local_conn() -> sqlite3.Connection:
    """Local SQLite for analytics/game stats tables."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _get_venues_conn():
    """Turso-backed connection for the venues table."""
    from app.services.turso import get_venues_db
    return get_venues_db()


def _compute_trial_days_remaining(venue: dict) -> int | None:
    """Return days remaining on trial, or None if not on trial."""
    if venue.get("status") != "trial":
        return None
    trial_start = venue.get("trial_start_date")
    duration = venue.get("trial_duration_days") or 30
    if not trial_start:
        return None
    try:
        start_dt = datetime.fromisoformat(trial_start)
        end_dt = start_dt + timedelta(days=duration)
        now = datetime.now(timezone.utc)
        if end_dt.tzinfo is None:
            now = now.replace(tzinfo=None)
        remaining = (end_dt - now).days
        return max(remaining, 0)
    except Exception:
        return None


def _build_venue_row(venue: dict, local_conn: sqlite3.Connection) -> dict:
    """Build a single CRM venue row with computed fields.

    venue dict comes from Turso; local_conn is for analytics/game stats.
    """
    vid = venue.get("venue_id", "")

    # sessions this week (local SQLite)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
    row = local_conn.execute(
        "SELECT COALESCE(SUM(sessions_count), 0) FROM venue_analytics_daily WHERE venue_id = ? AND date >= ?",
        (vid, week_ago),
    ).fetchone()
    sessions_this_week = row[0] if row else 0

    # top game (local SQLite)
    row = local_conn.execute(
        "SELECT game_id FROM venue_game_stats WHERE venue_id = ? ORDER BY sessions_count DESC LIMIT 1",
        (vid,),
    ).fetchone()
    top_game = row[0] if row else None

    # games count (local SQLite)
    row = local_conn.execute(
        "SELECT COUNT(*) FROM venue_games WHERE venue_id = ?",
        (vid,),
    ).fetchone()
    games_count = row[0] if row else 0

    # onboarding step comes from the venue dict (Turso)
    onboarding_step = venue.get("onboarding_step") or 0

    return {
        "venue_id": vid,
        "venue_name": venue.get("venue_name", ""),
        "email": venue.get("email", ""),
        "status": venue.get("status", "prospect"),
        "role": venue.get("role", "venue_admin"),
        "source": venue.get("source", ""),
        "trial_days_remaining": _compute_trial_days_remaining(venue),
        "last_active": venue.get("last_login"),
        "sessions_this_week": sessions_this_week,
        "top_game": top_game,
        "games_count": games_count,
        "onboarding_step": onboarding_step,
        "created_at": venue.get("created_at"),
    }


def get_all_crm_venues() -> list[dict]:
    """Return all venues with CRM computed fields."""
    vconn = _get_venues_conn()
    rows = vconn.execute("SELECT * FROM venues ORDER BY venue_name").fetchall()
    venues = [dict(r) for r in rows]
    local_conn = _get_local_conn()
    result = [_build_venue_row(v, local_conn) for v in venues]
    local_conn.close()
    return result


def get_crm_venue_detail(venue_id: str) -> dict | None:
    """Return one venue with CRM fields + 30-day daily analytics."""
    vconn = _get_venues_conn()
    row = vconn.execute("SELECT * FROM venues WHERE venue_id = ?", (venue_id,)).fetchone()
    if not row:
        return None

    venue = dict(row)
    local_conn = _get_local_conn()
    result = _build_venue_row(venue, local_conn)

    # last 30 days daily analytics (local SQLite)
    thirty_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    daily_rows = local_conn.execute(
        "SELECT date, sessions_count, questions_count, orders_count FROM venue_analytics_daily "
        "WHERE venue_id = ? AND date >= ? ORDER BY date",
        (venue_id, thirty_ago),
    ).fetchall()
    result["daily_analytics"] = [dict(r) for r in daily_rows]

    # top 5 games (local SQLite)
    top_games = local_conn.execute(
        "SELECT game_id, sessions_count FROM venue_game_stats WHERE venue_id = ? ORDER BY sessions_count DESC LIMIT 5",
        (venue_id,),
    ).fetchall()
    result["top_games"] = [{"game_id": r[0], "sessions": r[1]} for r in top_games]

    # extra contact info (from Turso venue dict)
    result["address"] = venue.get("address", "")
    result["phone"] = venue.get("phone", "")
    result["website"] = venue.get("website", "")

    local_conn.close()
    return result


def export_venues_csv() -> str:
    """Return CSV string of all venues for download."""
    venues = get_all_crm_venues()
    lines = ["venue_id,venue_name,email,status,role,source,trial_days_remaining,last_active,sessions_this_week,top_game,games_count,created_at"]
    for v in venues:
        def esc(val):
            s = str(val) if val is not None else ""
            if "," in s or '"' in s:
                return '"' + s.replace('"', '""') + '"'
            return s
        lines.append(",".join([
            esc(v["venue_id"]),
            esc(v["venue_name"]),
            esc(v["email"]),
            esc(v["status"]),
            esc(v["role"]),
            esc(v["source"]),
            esc(v["trial_days_remaining"]),
            esc(v["last_active"]),
            esc(v["sessions_this_week"]),
            esc(v["top_game"]),
            esc(v["games_count"]),
            esc(v["created_at"]),
        ]))
    return "\n".join(lines) + "\n"
