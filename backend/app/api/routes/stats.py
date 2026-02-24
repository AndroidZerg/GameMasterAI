"""Stats endpoint — aggregates session, feedback, and score data."""

import json
import sqlite3
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends

from app.core.auth import get_optional_venue
from app.core.config import DB_PATH

router = APIRouter(prefix="/api", tags=["stats"])


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _monday_of_this_week() -> str:
    now = datetime.now(timezone.utc)
    monday = now - timedelta(days=now.weekday())
    return monday.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()


def _midnight_today() -> str:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()


def _session_stats(conn: sqlite3.Connection, since: str | None = None,
                   venue_id: str | None = None) -> dict:
    conditions = []
    params = []
    if since:
        conditions.append("started_at >= ?")
        params.append(since)
    if venue_id:
        conditions.append("venue_id = ?")
        params.append(venue_id)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    row = conn.execute(f"""
        SELECT COUNT(*) as sessions,
               COALESCE(SUM(questions_asked), 0) as questions,
               COALESCE(AVG(duration_seconds), 0) as avg_duration_sec
        FROM sessions {where}
    """, params).fetchone()

    s_conditions = []
    s_params = []
    if since:
        s_conditions.append("s.started_at >= ?")
        s_params.append(since)
    if venue_id:
        s_conditions.append("s.venue_id = ?")
        s_params.append(venue_id)
    s_where = ("WHERE " + " AND ".join(s_conditions)) if s_conditions else ""

    top_games = conn.execute(f"""
        SELECT s.game_id, COUNT(*) as cnt, COALESCE(g.title, s.game_id) as title,
               COALESCE(AVG(s.duration_seconds), 0) as avg_dur
        FROM sessions s
        LEFT JOIN games g ON s.game_id = g.game_id
        {s_where}
        GROUP BY s.game_id
        ORDER BY cnt DESC
        LIMIT 10
    """, s_params).fetchall()

    return {
        "sessions": row["sessions"],
        "questions": row["questions"],
        "avg_duration_minutes": round(row["avg_duration_sec"] / 60, 1) if row["avg_duration_sec"] else 0,
        "top_games": [
            {"game_id": r["game_id"], "title": r["title"], "sessions": r["cnt"],
             "avg_duration": round(r["avg_dur"] / 60, 1) if r["avg_dur"] else 0}
            for r in top_games
        ],
    }


def _feedback_stats(conn: sqlite3.Connection, venue_id: str | None = None) -> dict:
    if venue_id:
        row = conn.execute("""
            SELECT COUNT(*) as total,
                   COALESCE(SUM(CASE WHEN f.rating = 1 THEN 1 ELSE 0 END), 0) as positive,
                   COALESCE(SUM(CASE WHEN f.rating = -1 THEN 1 ELSE 0 END), 0) as negative
            FROM feedback f
            LEFT JOIN sessions s ON f.session_id = s.id
            WHERE s.venue_id = ? OR f.session_id IS NULL
        """, (venue_id,)).fetchone()
    else:
        row = conn.execute("""
            SELECT COUNT(*) as total,
                   COALESCE(SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END), 0) as positive,
                   COALESCE(SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END), 0) as negative
            FROM feedback
        """).fetchone()
    total = row["total"]
    return {
        "total": total,
        "positive": row["positive"],
        "negative": row["negative"],
        "approval_rate": round(row["positive"] / total * 100, 1) if total > 0 else 0,
    }


def _enhanced_stats(conn: sqlite3.Connection, venue_id: str | None = None) -> dict:
    """Additional stats for authenticated venue owners."""
    vid_clause = "WHERE venue_id = ?" if venue_id else ""
    vid_params = [venue_id] if venue_id else []

    # Total counts
    totals = conn.execute(f"""
        SELECT COUNT(*) as total_sessions,
               COALESCE(SUM(questions_asked), 0) as total_questions,
               COALESCE(SUM(CASE WHEN score_tracked = 1 THEN 1 ELSE 0 END), 0) as total_scores,
               COALESCE(AVG(duration_seconds), 0) as avg_dur
        FROM sessions {vid_clause}
    """, vid_params).fetchone()

    # Busiest hour
    busiest_hour = conn.execute(f"""
        SELECT CAST(strftime('%H', started_at) AS INTEGER) as hour, COUNT(*) as cnt
        FROM sessions {vid_clause}
        GROUP BY hour ORDER BY cnt DESC LIMIT 1
    """, vid_params).fetchone()

    # Busiest day of week
    busiest_day = conn.execute(f"""
        SELECT CAST(strftime('%w', started_at) AS INTEGER) as dow, COUNT(*) as cnt
        FROM sessions {vid_clause}
        GROUP BY dow ORDER BY cnt DESC LIMIT 1
    """, vid_params).fetchone()

    day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    # Recent sessions
    recent = conn.execute(f"""
        SELECT s.id, s.game_id, COALESCE(g.title, s.game_id) as game_title,
               s.duration_seconds, s.started_at, s.table_number
        FROM sessions s
        LEFT JOIN games g ON s.game_id = g.game_id
        {"WHERE s.venue_id = ?" if venue_id else ""}
        ORDER BY s.started_at DESC LIMIT 10
    """, vid_params).fetchall()

    # Player leaderboard from score_history
    sh_clause = "WHERE venue_id = ?" if venue_id else ""
    leaderboard_rows = conn.execute(f"""
        SELECT players FROM score_history {sh_clause}
    """, vid_params).fetchall()

    player_scores: dict[str, int] = {}
    for r in leaderboard_rows:
        players = json.loads(r["players"])
        for p in players:
            name = p.get("name", "Unknown")
            player_scores[name] = player_scores.get(name, 0) + 1

    player_leaderboard = sorted(
        [{"name": k, "games_scored": v} for k, v in player_scores.items()],
        key=lambda x: -x["games_scored"],
    )[:10]

    return {
        "total_sessions": totals["total_sessions"],
        "total_questions_asked": totals["total_questions"],
        "total_scores_tracked": totals["total_scores"],
        "avg_session_duration_minutes": round(totals["avg_dur"] / 60, 1) if totals["avg_dur"] else 0,
        "busiest_hour": busiest_hour["hour"] if busiest_hour else None,
        "busiest_day": day_names[busiest_day["dow"]] if busiest_day else None,
        "recent_sessions": [
            {
                "id": r["id"], "game_id": r["game_id"], "game_title": r["game_title"],
                "duration_seconds": r["duration_seconds"], "started_at": r["started_at"],
                "table_number": r["table_number"],
            }
            for r in recent
        ],
        "player_leaderboard": player_leaderboard,
    }


@router.get("/stats")
async def get_stats(
    venue: Optional[dict] = Depends(get_optional_venue),
):
    """Get stats. If authenticated, returns enhanced stats for this venue only."""
    conn = _get_conn()
    vid = venue["venue_id"] if venue else None
    try:
        today = _midnight_today()
        week = _monday_of_this_week()

        total_games = conn.execute("SELECT COUNT(*) as cnt FROM games").fetchone()["cnt"]

        all_time = _session_stats(conn, venue_id=vid)
        all_time["total_games_available"] = total_games

        result = {
            "today": _session_stats(conn, today, venue_id=vid),
            "this_week": _session_stats(conn, week, venue_id=vid),
            "all_time": all_time,
            "feedback": _feedback_stats(conn, venue_id=vid),
        }

        # Enhanced stats for authenticated venues
        if vid:
            result["enhanced"] = _enhanced_stats(conn, venue_id=vid)

        return result
    finally:
        conn.close()
