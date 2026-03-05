"""Device session tracking — QR-based venue sessions, notes, Q&A history, CRM analytics."""

import hashlib
import logging
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.api.deps import get_current_super_admin
from app.services.turso import get_analytics_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/sessions", tags=["device-sessions"])


# ---------------------------------------------------------------------------
# Table initialisation (called from main.py lifespan)
# ---------------------------------------------------------------------------

def init_device_session_tables():
    """Create device session, notes, Q&A history, and CRM analytics tables."""
    db = get_analytics_db()

    db.execute("""
        CREATE TABLE IF NOT EXISTS device_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            station_id INTEGER,
            session_token TEXT NOT NULL UNIQUE,
            started_at TEXT NOT NULL DEFAULT (datetime('now')),
            last_active_at TEXT NOT NULL DEFAULT (datetime('now')),
            user_agent TEXT,
            ip_address TEXT
        )
    """)
    db.execute("CREATE INDEX IF NOT EXISTS idx_device_sessions_device ON device_sessions(device_id)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_device_sessions_station ON device_sessions(station_id)")

    db.execute("""
        CREATE TABLE IF NOT EXISTS device_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            game_id TEXT NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_device_notes_unique ON device_notes(device_id, game_id)")

    db.execute("""
        CREATE TABLE IF NOT EXISTS device_qa_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            session_id INTEGER REFERENCES device_sessions(id),
            game_id TEXT NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            answer_quality TEXT DEFAULT NULL,
            asked_at TEXT NOT NULL DEFAULT (datetime('now')),
            station_id INTEGER
        )
    """)
    db.execute("CREATE INDEX IF NOT EXISTS idx_qa_device ON device_qa_history(device_id)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_qa_game ON device_qa_history(game_id)")

    db.execute("""
        CREATE TABLE IF NOT EXISTS crm_qa_analytics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id TEXT NOT NULL,
            question_text TEXT NOT NULL,
            question_hash TEXT NOT NULL,
            answer_text TEXT NOT NULL,
            times_asked INTEGER DEFAULT 1,
            first_asked_at TEXT NOT NULL DEFAULT (datetime('now')),
            last_asked_at TEXT NOT NULL DEFAULT (datetime('now')),
            has_good_answer BOOLEAN DEFAULT 1
        )
    """)
    db.execute("CREATE INDEX IF NOT EXISTS idx_crm_qa_game ON crm_qa_analytics(game_id)")
    db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_qa_hash ON crm_qa_analytics(question_hash)")

    db.commit()
    logger.info("Device session tables initialized")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _rows_to_dicts(cursor):
    """Convert cursor results to list of dicts (works for both sqlite3 and libsql)."""
    if cursor is None:
        return []
    cols = [d[0] for d in cursor.description] if cursor.description else []
    rows = cursor.fetchall()
    return [dict(zip(cols, row)) for row in rows]


def _row_to_dict(cursor):
    """Convert single row result to dict or None."""
    rows = _rows_to_dicts(cursor)
    return rows[0] if rows else None


# ---------------------------------------------------------------------------
# POST /api/v1/sessions/start — create or resume a device session
# ---------------------------------------------------------------------------

@router.post("/start")
async def start_session(request: Request):
    body = await request.json()
    device_id = body.get("device_id")
    station_id = body.get("station_id")

    if not device_id:
        raise HTTPException(status_code=400, detail="device_id is required")

    user_agent = request.headers.get("user-agent", "")
    ip = request.client.host if request.client else ""

    db = get_analytics_db()

    # Check for existing session with this device
    existing = _row_to_dict(
        db.execute(
            "SELECT id, session_token FROM device_sessions WHERE device_id = ? ORDER BY last_active_at DESC LIMIT 1",
            (device_id,),
        )
    )

    if existing:
        # Resume — update last active and optionally update station
        db.execute(
            "UPDATE device_sessions SET last_active_at = datetime('now'), station_id = COALESCE(?, station_id) WHERE id = ?",
            (station_id, existing["id"]),
        )
        db.commit()
        session_token = existing["session_token"]
        is_returning = True
    else:
        # New session
        session_token = secrets.token_hex(16)
        db.execute(
            "INSERT INTO device_sessions (device_id, station_id, session_token, user_agent, ip_address) VALUES (?, ?, ?, ?, ?)",
            (device_id, station_id, session_token, user_agent, ip),
        )
        db.commit()
        is_returning = False

    return {"session_token": session_token, "is_returning": is_returning, "device_id": device_id}


# ---------------------------------------------------------------------------
# GET /api/v1/sessions/notes/{game_id} — get notes for device + game
# ---------------------------------------------------------------------------

@router.get("/notes/{game_id}")
async def get_notes(game_id: str, device_id: str = Query(...)):
    db = get_analytics_db()
    note = _row_to_dict(
        db.execute(
            "SELECT content, updated_at FROM device_notes WHERE device_id = ? AND game_id = ?",
            (device_id, game_id),
        )
    )
    return {
        "content": note["content"] if note else "",
        "updated_at": note["updated_at"] if note else None,
    }


# ---------------------------------------------------------------------------
# PUT /api/v1/sessions/notes/{game_id} — save/update notes
# ---------------------------------------------------------------------------

@router.put("/notes/{game_id}")
async def save_notes(game_id: str, request: Request):
    body = await request.json()
    device_id = body.get("device_id")
    content = body.get("content", "")

    if not device_id:
        raise HTTPException(status_code=400, detail="device_id is required")

    db = get_analytics_db()
    db.execute(
        """INSERT INTO device_notes (device_id, game_id, content, updated_at)
           VALUES (?, ?, ?, datetime('now'))
           ON CONFLICT(device_id, game_id) DO UPDATE SET content = ?, updated_at = datetime('now')""",
        (device_id, game_id, content, content),
    )
    db.commit()
    return {"status": "saved"}


# ---------------------------------------------------------------------------
# GET /api/v1/sessions/qa/history/{game_id} — Q&A history for device + game
# ---------------------------------------------------------------------------

@router.get("/qa/history/{game_id}")
async def get_qa_history(game_id: str, device_id: str = Query(...)):
    db = get_analytics_db()
    history = _rows_to_dicts(
        db.execute(
            "SELECT question, answer, asked_at FROM device_qa_history WHERE device_id = ? AND game_id = ? ORDER BY asked_at ASC",
            (device_id, game_id),
        )
    )
    return {"history": history}


# ---------------------------------------------------------------------------
# GET /api/v1/sessions/crm/qa-analytics — CRM Q&A intelligence (super_admin)
# ---------------------------------------------------------------------------

@router.get("/crm/qa-analytics")
async def get_qa_analytics(
    game_id: str = Query(None),
    user: dict = Depends(get_current_super_admin),
):
    db = get_analytics_db()
    if game_id:
        results = _rows_to_dicts(
            db.execute(
                "SELECT * FROM crm_qa_analytics WHERE game_id = ? ORDER BY times_asked DESC LIMIT 50",
                (game_id,),
            )
        )
    else:
        results = _rows_to_dicts(
            db.execute(
                "SELECT * FROM crm_qa_analytics ORDER BY times_asked DESC LIMIT 100"
            )
        )
    return {"analytics": results}


# ---------------------------------------------------------------------------
# GET /api/v1/sessions/crm/station-activity — station usage stats (super_admin)
# ---------------------------------------------------------------------------

@router.get("/crm/station-activity")
async def get_station_activity(user: dict = Depends(get_current_super_admin)):
    db = get_analytics_db()
    results = _rows_to_dicts(
        db.execute(
            """SELECT station_id, COUNT(*) as total_sessions,
                      COUNT(DISTINCT device_id) as unique_devices,
                      MAX(last_active_at) as last_activity
               FROM device_sessions
               WHERE station_id IS NOT NULL
               GROUP BY station_id
               ORDER BY station_id"""
        )
    )
    return {"stations": results}


# ---------------------------------------------------------------------------
# GET /api/v1/sessions/crm/question-trends — games generating most questions (super_admin)
# ---------------------------------------------------------------------------

@router.get("/crm/question-trends")
async def get_question_trends(user: dict = Depends(get_current_super_admin)):
    db = get_analytics_db()
    results = _rows_to_dicts(
        db.execute(
            """SELECT game_id, COUNT(*) as total_questions,
                      COUNT(DISTINCT device_id) as unique_askers,
                      MIN(asked_at) as first_asked, MAX(asked_at) as last_asked
               FROM device_qa_history
               GROUP BY game_id
               ORDER BY total_questions DESC
               LIMIT 50"""
        )
    )
    return {"trends": results}
