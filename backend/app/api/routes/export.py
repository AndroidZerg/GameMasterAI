"""Export endpoints — CSV export for sessions and feedback."""

import csv
import io
import sqlite3

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from app.core.config import DB_PATH

router = APIRouter(prefix="/api/admin/export", tags=["admin"])


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _rows_to_csv(rows: list[sqlite3.Row], columns: list[str]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(columns)
    for row in rows:
        writer.writerow([row[col] for col in columns])
    return output.getvalue()


@router.get("/sessions")
async def export_sessions(
    format: str = Query("csv", description="Export format (csv)"),
):
    """Export all sessions as CSV."""
    conn = _get_conn()
    rows = conn.execute("""
        SELECT s.id, s.game_id, COALESCE(g.title, s.game_id) as game_title,
               s.table_number, s.started_at, s.ended_at, s.duration_seconds,
               s.questions_asked, s.score_tracked, s.venue_id
        FROM sessions s
        LEFT JOIN games g ON s.game_id = g.game_id
        ORDER BY s.started_at DESC
    """).fetchall()
    conn.close()

    columns = ["id", "game_id", "game_title", "table_number", "started_at",
               "ended_at", "duration_seconds", "questions_asked", "score_tracked", "venue_id"]
    csv_data = _rows_to_csv(rows, columns)

    return StreamingResponse(
        io.BytesIO(csv_data.encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sessions.csv"},
    )


@router.get("/feedback")
async def export_feedback(
    format: str = Query("csv", description="Export format (csv)"),
):
    """Export all feedback as CSV."""
    conn = _get_conn()
    rows = conn.execute("""
        SELECT f.id, f.session_id, f.game_id, COALESCE(g.title, f.game_id) as game_title,
               f.question, f.response, f.rating, f.created_at
        FROM feedback f
        LEFT JOIN games g ON f.game_id = g.game_id
        ORDER BY f.created_at DESC
    """).fetchall()
    conn.close()

    columns = ["id", "session_id", "game_id", "game_title", "question", "response", "rating", "created_at"]
    csv_data = _rows_to_csv(rows, columns)

    return StreamingResponse(
        io.BytesIO(csv_data.encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=feedback.csv"},
    )
