"""Device session tracking — QR-based venue sessions, notes, Q&A history, CRM analytics.

Wave 4 (2026-04-10): fully migrated to Supabase Postgres via native supabase-py
client. Table name is ``device_sessions_v2`` to avoid naming confusion with
``analytics_sessions`` (event-ingestion sessions). Tables ``device_notes``,
``device_qa_history``, and ``crm_qa_analytics`` keep their existing names.
"""

import hashlib  # noqa: F401 — preserved for future CRM question-hash writes
import logging
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from postgrest.exceptions import APIError

from app.api.deps import get_current_venue_admin  # noqa: F401 — used on CRM endpoints
from app.services.supabase_client import get_admin_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/sessions", tags=["device-sessions"])


# ---------------------------------------------------------------------------
# Table initialisation (called from main.py lifespan)
# ---------------------------------------------------------------------------

def init_device_session_tables():
    """All device-session tables now live in Supabase. No-op.

    Tables (``device_sessions_v2``, ``device_notes``, ``device_qa_history``,
    ``crm_qa_analytics``) are created and migrated out-of-band. Retained so
    ``main.py``'s lifespan call site doesn't need to change.
    """
    logger.info("Device session tables: skipped (Supabase)")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _run_sql(sql: str) -> list[dict]:
    """Execute raw SQL via the Supabase ``exec_sql`` RPC and return rows.

    Used only for aggregation queries (GROUP BY, COUNT, MAX) that PostgREST
    cannot express cleanly. All CRUD goes through the native ``.table()`` API.
    """
    client = get_admin_client()
    resp = client.rpc("exec_sql", {"query": sql}).execute()
    rows = resp.data or []
    return rows if isinstance(rows, list) else []


def _sql_literal(value) -> str:
    """Safely escape a Python value for inline SQL. Only used with trusted
    inputs that have already been validated (e.g., venue_id from JWT)."""
    if value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


# ---------------------------------------------------------------------------
# POST /api/v1/sessions/start — create or resume a device session
# ---------------------------------------------------------------------------

@router.post("/start")
async def start_session(request: Request):
    body = await request.json()
    device_id = body.get("device_id")
    venue_id = body.get("venue_id")
    table_number = body.get("table_number")

    if not device_id:
        raise HTTPException(status_code=400, detail="device_id is required")

    user_agent = request.headers.get("user-agent", "")
    ip = request.client.host if request.client else ""

    admin = get_admin_client()

    # Check for existing session with this device (optionally scoped to venue)
    q = admin.table("device_sessions_v2").select("id, session_token")
    q = q.eq("device_id", device_id)
    if venue_id:
        q = q.eq("venue_id", venue_id)
    existing_resp = q.order("last_active_at", desc=True).limit(1).execute()
    existing = (existing_resp.data or [None])[0]

    now_iso = _now_iso()

    if existing:
        # Resume — update last_active and optionally update venue/table
        updates = {"last_active_at": now_iso}
        if venue_id is not None:
            updates["venue_id"] = venue_id
        if table_number is not None:
            updates["table_number"] = table_number
        admin.table("device_sessions_v2").update(updates).eq("id", existing["id"]).execute()
        return {
            "session_token": existing["session_token"],
            "is_returning": True,
            "device_id": device_id,
        }

    # New session
    session_token = secrets.token_hex(16)
    admin.table("device_sessions_v2").insert({
        "device_id": device_id,
        "venue_id": venue_id,
        "table_number": table_number,
        "session_token": session_token,
        "started_at": now_iso,
        "last_active_at": now_iso,
        "user_agent": user_agent,
        "ip_address": ip,
    }).execute()
    return {"session_token": session_token, "is_returning": False, "device_id": device_id}


# ---------------------------------------------------------------------------
# GET /api/v1/sessions/notes/{game_id} — get notes for device + game
# ---------------------------------------------------------------------------

@router.get("/notes/{game_id}")
async def get_notes(game_id: str, device_id: str = Query(...)):
    admin = get_admin_client()
    resp = (
        admin.table("device_notes")
        .select("content, updated_at")
        .eq("device_id", device_id)
        .eq("game_id", game_id)
        .limit(1)
        .execute()
    )
    note = (resp.data or [None])[0]
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

    admin = get_admin_client()
    admin.table("device_notes").upsert(
        {
            "device_id": device_id,
            "game_id": game_id,
            "content": content,
            "updated_at": _now_iso(),
        },
        on_conflict="device_id,game_id",
    ).execute()
    return {"status": "saved"}


# ---------------------------------------------------------------------------
# GET /api/v1/sessions/qa/history/{game_id} — Q&A history for device + game
# ---------------------------------------------------------------------------

@router.get("/qa/history/{game_id}")
async def get_qa_history(game_id: str, device_id: str = Query(...)):
    admin = get_admin_client()
    resp = (
        admin.table("device_qa_history")
        .select("question, answer, asked_at")
        .eq("device_id", device_id)
        .eq("game_id", game_id)
        .order("asked_at", desc=False)
        .execute()
    )
    return {"history": resp.data or []}


# ---------------------------------------------------------------------------
# GET /api/v1/sessions/crm/qa-analytics — CRM Q&A intelligence
# ---------------------------------------------------------------------------

@router.get("/crm/qa-analytics")
async def get_qa_analytics(
    game_id: str = Query(None),
    venue_id: str = Query(None),
    user: dict = Depends(get_current_venue_admin),
):
    admin = get_admin_client()
    # Venue admins are scoped to their own venue
    effective_venue = venue_id
    if user.get("role") != "super_admin":
        effective_venue = user.get("venue_id")

    q = admin.table("crm_qa_analytics").select("*")
    if game_id:
        q = q.eq("game_id", game_id)
    if effective_venue:
        q = q.eq("venue_id", effective_venue)
    resp = q.order("times_asked", desc=True).limit(100).execute()
    return {"analytics": resp.data or []}


# ---------------------------------------------------------------------------
# GET /api/v1/sessions/crm/table-activity — table usage by venue
# ---------------------------------------------------------------------------

@router.get("/crm/table-activity")
async def get_table_activity(
    venue_id: str = Query(None),
    user: dict = Depends(get_current_venue_admin),
):
    effective_venue = venue_id
    if user.get("role") != "super_admin":
        effective_venue = user.get("venue_id")

    where = "table_number IS NOT NULL"
    if effective_venue:
        where += f" AND venue_id = {_sql_literal(effective_venue)}"

    sql = (
        "SELECT venue_id, table_number, COUNT(*) as total_sessions, "
        "COUNT(DISTINCT device_id) as unique_devices, "
        "MAX(last_active_at) as last_activity "
        "FROM device_sessions_v2 "
        f"WHERE {where} "
        "GROUP BY venue_id, table_number "
        "ORDER BY venue_id, table_number"
    )
    try:
        results = _run_sql(sql)
    except APIError as e:
        logger.warning("crm/table-activity SQL failed: %s", e)
        results = []
    return {"tables": results}


# ---------------------------------------------------------------------------
# GET /api/v1/sessions/crm/question-trends — games generating most questions
# ---------------------------------------------------------------------------

@router.get("/crm/question-trends")
async def get_question_trends(
    venue_id: str = Query(None),
    user: dict = Depends(get_current_venue_admin),
):
    effective_venue = venue_id
    if user.get("role") != "super_admin":
        effective_venue = user.get("venue_id")

    if effective_venue:
        where = f"WHERE venue_id = {_sql_literal(effective_venue)}"
        group_by = "GROUP BY game_id"
    else:
        where = ""
        group_by = "GROUP BY game_id, venue_id"

    sql = (
        "SELECT game_id, venue_id, COUNT(*) as total_questions, "
        "COUNT(DISTINCT device_id) as unique_askers, "
        "MIN(asked_at) as first_asked, MAX(asked_at) as last_asked "
        f"FROM device_qa_history {where} {group_by} "
        "ORDER BY total_questions DESC LIMIT 50"
    )
    try:
        results = _run_sql(sql)
    except APIError as e:
        logger.warning("crm/question-trends SQL failed: %s", e)
        results = []
    return {"trends": results}
