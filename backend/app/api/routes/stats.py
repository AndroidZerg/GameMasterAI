"""Stats endpoint — aggregates session and feedback data."""

import sqlite3
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter

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


def _session_stats(conn: sqlite3.Connection, since: str | None = None) -> dict:
    where = f"WHERE started_at >= '{since}'" if since else ""
    row = conn.execute(f"""
        SELECT COUNT(*) as sessions,
               COALESCE(SUM(questions_asked), 0) as questions,
               COALESCE(AVG(duration_seconds), 0) as avg_duration_sec
        FROM sessions {where}
    """).fetchone()

    top_games = conn.execute(f"""
        SELECT s.game_id, COUNT(*) as cnt, COALESCE(g.title, s.game_id) as title
        FROM sessions s
        LEFT JOIN games g ON s.game_id = g.game_id
        {where}
        GROUP BY s.game_id
        ORDER BY cnt DESC
        LIMIT 10
    """).fetchall()

    return {
        "sessions": row["sessions"],
        "questions": row["questions"],
        "avg_duration_minutes": round(row["avg_duration_sec"] / 60, 1) if row["avg_duration_sec"] else 0,
        "top_games": [{"game_id": r["game_id"], "title": r["title"], "sessions": r["cnt"]} for r in top_games],
    }


def _feedback_stats(conn: sqlite3.Connection) -> dict:
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


@router.get("/stats")
async def get_stats():
    conn = _get_conn()
    try:
        today = _midnight_today()
        week = _monday_of_this_week()

        total_games = conn.execute("SELECT COUNT(*) as cnt FROM games").fetchone()["cnt"]

        all_time = _session_stats(conn)
        all_time["total_games_available"] = total_games

        return {
            "today": _session_stats(conn, today),
            "this_week": _session_stats(conn, week),
            "all_time": all_time,
            "feedback": _feedback_stats(conn),
        }
    finally:
        conn.close()
