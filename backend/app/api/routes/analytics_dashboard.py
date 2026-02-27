"""Analytics dashboard API endpoints — device tracking, CRM, charts.

All endpoints require super_admin or venue_admin auth.
Venue admins are auto-scoped to their own venue_id.
"""

import csv
import io
import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.api.deps import get_current_venue_admin
from app.services.turso import get_analytics_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/analytics", tags=["analytics-dashboard"])


def _venue_scope(user: dict, venue_id: Optional[str] = None) -> Optional[str]:
    """Return the effective venue_id. Venue admins are locked to their own."""
    if user.get("role") == "super_admin":
        return venue_id  # None = all venues
    return user["venue_id"]


def _date_filter(col: str, start_date: Optional[str], end_date: Optional[str]):
    """Build SQL fragments + params for date range filtering."""
    clauses = []
    params = []
    if start_date:
        clauses.append(f"{col} >= ?")
        params.append(start_date)
    if end_date:
        clauses.append(f"{col} <= ?")
        params.append(end_date + "T23:59:59")
    return clauses, params


def _build_where(venue_col: str, date_col: str, venue_id, start_date, end_date):
    """Build WHERE clause parts for venue + date filtering."""
    clauses = []
    params = []
    if venue_id:
        clauses.append(f"{venue_col} = ?")
        params.append(venue_id)
    dc, dp = _date_filter(date_col, start_date, end_date)
    clauses.extend(dc)
    params.extend(dp)
    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    return where, params


# ─────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────

@router.get("/summary")
async def analytics_summary(
    venue_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_venue_admin),
):
    vid = _venue_scope(user, venue_id)
    db = get_analytics_db()

    dw, dp = _build_where("venue_id", "last_seen_at", vid, start_date, end_date)

    # Total devices
    row = db.execute(f"SELECT COUNT(*) FROM devices{dw}", dp).fetchone()
    total_devices = row[0] if row else 0

    # Returning devices (visit_count > 1)
    ret_where = f"{dw} AND visit_count > 1" if dw else " WHERE visit_count > 1"
    row = db.execute(f"SELECT COUNT(*) FROM devices{ret_where}", dp).fetchone()
    returning_count = row[0] if row else 0
    returning_pct = round((returning_count / total_devices * 100), 1) if total_devices > 0 else 0

    # Avg names per device
    if dw:
        names_sql = f"SELECT COUNT(*) FROM device_names dn JOIN devices d ON dn.device_id = d.device_id{dw.replace('venue_id', 'd.venue_id').replace('last_seen_at', 'd.last_seen_at')}"
        row = db.execute(names_sql, dp).fetchone()
    else:
        row = db.execute("SELECT COUNT(*) FROM device_names").fetchone()
    total_names = row[0] if row else 0
    avg_names = round(total_names / total_devices, 1) if total_devices > 0 else 0

    # Avg visits
    row = db.execute(f"SELECT AVG(visit_count) FROM devices{dw}", dp).fetchone()
    avg_visits = round(row[0], 1) if row and row[0] else 0

    # Avg session duration
    sw, sp = _build_where("venue_id", "started_at", vid, start_date, end_date)
    row = db.execute(f"SELECT AVG(duration_seconds) FROM sessions{sw} {'AND' if sw else 'WHERE'} duration_seconds > 0", sp).fetchone()
    avg_session = int(row[0]) if row and row[0] else 0

    # Avg order dollars (from events with order_placed)
    ew, ep = _build_where("venue_id", "timestamp", vid, start_date, end_date)
    row = db.execute(f"SELECT AVG(CAST(json_extract(payload, '$.total_cents') AS REAL)) FROM events{ew} {'AND' if ew else 'WHERE'} event_type = 'order_placed' AND json_extract(payload, '$.total_cents') IS NOT NULL", ep).fetchone()
    avg_order_cents = row[0] if row and row[0] else 0
    avg_order_dollars = round(avg_order_cents / 100, 2)

    # Total events
    row = db.execute(f"SELECT COUNT(*) FROM events{ew}", ep).fetchone()
    total_events = row[0] if row else 0

    # Top game
    row = db.execute(f"SELECT game_id, COUNT(*) as cnt FROM events{ew} {'AND' if ew else 'WHERE'} event_type = 'session_start' AND game_id IS NOT NULL GROUP BY game_id ORDER BY cnt DESC LIMIT 1", ep).fetchone()
    top_game = {"title": row[0], "count": row[1]} if row else {"title": "—", "count": 0}

    return {
        "total_devices": total_devices,
        "returning_count": returning_count,
        "returning_pct": returning_pct,
        "avg_names_per_device": avg_names,
        "avg_visits": avg_visits,
        "avg_session_seconds": avg_session,
        "avg_order_dollars": avg_order_dollars,
        "total_events": total_events,
        "top_game": top_game,
    }


# ─────────────────────────────────────────────────────────────
# Devices list (paginated)
# ─────────────────────────────────────────────────────────────

@router.get("/devices")
async def list_devices(
    venue_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    sort_by: str = Query("last_seen_at"),
    sort_dir: str = Query("desc"),
    user: dict = Depends(get_current_venue_admin),
):
    vid = _venue_scope(user, venue_id)
    db = get_analytics_db()
    dw, dp = _build_where("d.venue_id", "d.last_seen_at", vid, start_date, end_date)

    # Validate sort
    allowed_sorts = {"last_seen_at", "visit_count", "total_events", "device_name", "platform", "first_seen_at"}
    if sort_by not in allowed_sorts:
        sort_by = "last_seen_at"
    if sort_dir not in ("asc", "desc"):
        sort_dir = "desc"

    # Count
    row = db.execute(f"SELECT COUNT(*) FROM devices d{dw}", dp).fetchone()
    total = row[0] if row else 0

    offset = (page - 1) * per_page
    rows = db.execute(f"""
        SELECT d.device_id, d.device_name, d.platform, d.visit_count,
               d.total_events, d.last_seen_at, d.first_seen_at,
               d.total_sessions
        FROM devices d{dw}
        ORDER BY d.{sort_by} {sort_dir}
        LIMIT ? OFFSET ?
    """, dp + [per_page, offset]).fetchall()

    devices = []
    for r in rows:
        did = r[0]

        # Stage names
        names_rows = db.execute("SELECT DISTINCT name FROM device_names WHERE device_id = ?", (did,)).fetchall()
        stage_names = [n[0] for n in names_rows] if names_rows else []

        # Session aggregates
        sess = db.execute("""
            SELECT COALESCE(SUM(questions_asked),0), COALESCE(SUM(tts_uses),0),
                   COALESCE(SUM(orders_placed),0), COALESCE(SUM(voice_inputs),0),
                   COALESCE(SUM(games_viewed),0),
                   COALESCE(AVG(CASE WHEN duration_seconds > 0 THEN duration_seconds END),0)
            FROM sessions WHERE device_id = ?
        """, (did,)).fetchone()

        # Total spent
        spent_row = db.execute("""
            SELECT COALESCE(SUM(CAST(json_extract(payload, '$.total_cents') AS INTEGER)),0)
            FROM events WHERE device_id = ? AND event_type = 'order_placed'
        """, (did,)).fetchone()

        devices.append({
            "device_id": did,
            "device_name": r[1] or "Unknown",
            "platform": r[2] or "Desktop",
            "visit_count": r[3] or 0,
            "is_returning": (r[3] or 0) > 1,
            "stage_names": stage_names,
            "games_played": sess[4] if sess else 0,
            "questions_asked": sess[0] if sess else 0,
            "tts_uses": sess[1] if sess else 0,
            "orders": sess[2] if sess else 0,
            "spent_cents": spent_row[0] if spent_row else 0,
            "avg_session_seconds": int(sess[5]) if sess and sess[5] else 0,
            "total_events": r[4] or 0,
            "last_active": r[5] or "",
        })

    return {"devices": devices, "total": total, "page": page, "per_page": per_page}


# ─────────────────────────────────────────────────────────────
# Device detail
# ─────────────────────────────────────────────────────────────

@router.get("/devices/{device_id}")
async def device_detail(
    device_id: str,
    user: dict = Depends(get_current_venue_admin),
):
    db = get_analytics_db()

    # Base device info
    row = db.execute("SELECT device_id, device_name, platform, visit_count, total_events, last_seen_at, first_seen_at, total_sessions, venue_id FROM devices WHERE device_id = ?", (device_id,)).fetchone()
    if not row:
        return {"device": None}

    did = row[0]
    names_rows = db.execute("SELECT DISTINCT name FROM device_names WHERE device_id = ?", (did,)).fetchall()
    stage_names = [n[0] for n in names_rows]

    sess_agg = db.execute("""
        SELECT COALESCE(SUM(questions_asked),0), COALESCE(SUM(tts_uses),0),
               COALESCE(SUM(orders_placed),0), COALESCE(SUM(voice_inputs),0),
               COALESCE(SUM(games_viewed),0),
               COALESCE(AVG(CASE WHEN duration_seconds > 0 THEN duration_seconds END),0)
        FROM sessions WHERE device_id = ?
    """, (did,)).fetchone()

    spent_row = db.execute("SELECT COALESCE(SUM(CAST(json_extract(payload, '$.total_cents') AS INTEGER)),0) FROM events WHERE device_id = ? AND event_type = 'order_placed'", (did,)).fetchone()

    device = {
        "device_id": did,
        "device_name": row[1] or "Unknown",
        "platform": row[2] or "Desktop",
        "visit_count": row[3] or 0,
        "is_returning": (row[3] or 0) > 1,
        "stage_names": stage_names,
        "games_played": sess_agg[4] if sess_agg else 0,
        "questions_asked": sess_agg[0] if sess_agg else 0,
        "tts_uses": sess_agg[1] if sess_agg else 0,
        "orders": sess_agg[2] if sess_agg else 0,
        "spent_cents": spent_row[0] if spent_row else 0,
        "avg_session_seconds": int(sess_agg[5]) if sess_agg and sess_agg[5] else 0,
        "total_events": row[4] or 0,
        "last_active": row[5] or "",
    }

    # Sessions
    sessions = []
    sess_rows = db.execute("SELECT session_id, started_at, duration_seconds, games_viewed, games_played, questions_asked, orders_placed FROM sessions WHERE device_id = ? ORDER BY started_at DESC", (did,)).fetchall()
    for s in sess_rows:
        # Get games viewed in this session
        game_rows = db.execute("SELECT DISTINCT game_id FROM events WHERE session_id = ? AND game_id IS NOT NULL", (s[0],)).fetchall()
        sessions.append({
            "session_id": s[0],
            "started_at": s[1] or "",
            "duration_seconds": s[2] or 0,
            "games_viewed": [g[0] for g in game_rows],
            "questions_asked": s[5] or 0,
            "orders_placed": s[6] or 0,
        })

    # Games browsed with dwell
    games_browsed = []
    gb_rows = db.execute("""
        SELECT game_id, COUNT(*) as q_count
        FROM events WHERE device_id = ? AND game_id IS NOT NULL
        GROUP BY game_id ORDER BY q_count DESC
    """, (did,)).fetchall()
    for g in gb_rows:
        dwell_row = db.execute("""
            SELECT COALESCE(SUM(CAST(json_extract(payload, '$.dwell_seconds') AS INTEGER)),0)
            FROM events WHERE device_id = ? AND game_id = ? AND event_type = 'page_dwell'
        """, (did, g[0])).fetchone()
        q_count = db.execute("SELECT COUNT(*) FROM events WHERE device_id = ? AND game_id = ? AND event_type = 'question_asked'", (did, g[0])).fetchone()
        games_browsed.append({
            "game_id": g[0],
            "title": g[0],
            "dwell_seconds": dwell_row[0] if dwell_row else 0,
            "questions": q_count[0] if q_count else 0,
        })

    # Questions
    questions = []
    q_rows = db.execute("SELECT game_id, payload, timestamp FROM events WHERE device_id = ? AND event_type = 'question_asked' ORDER BY timestamp DESC", (did,)).fetchall()
    for q in q_rows:
        payload = json.loads(q[1]) if q[1] else {}
        questions.append({
            "game_id": q[0] or "",
            "question": payload.get("question", payload.get("text", "")),
            "timestamp": q[2] or "",
        })

    # Orders
    orders = []
    o_rows = db.execute("SELECT payload, game_id, timestamp FROM events WHERE device_id = ? AND event_type = 'order_placed' ORDER BY timestamp DESC", (did,)).fetchall()
    for o in o_rows:
        payload = json.loads(o[0]) if o[0] else {}
        orders.append({
            "items": payload.get("items", []),
            "subtotal_cents": payload.get("total_cents", 0),
            "game_id": o[1] or "",
            "timestamp": o[2] or "",
        })

    # TTS usage
    tts_usage = []
    tts_rows = db.execute("SELECT game_id, payload FROM events WHERE device_id = ? AND event_type = 'tts_played'", (did,)).fetchall()
    for t in tts_rows:
        payload = json.loads(t[1]) if t[1] else {}
        tts_usage.append({
            "game_id": t[0] or "",
            "tab": payload.get("tab", ""),
            "seconds": payload.get("duration_seconds", 0),
        })

    # Voice vs text
    voice_count = db.execute("SELECT COUNT(*) FROM events WHERE device_id = ? AND event_type = 'voice_input_used'", (did,)).fetchone()
    text_count = db.execute("SELECT COUNT(*) FROM events WHERE device_id = ? AND event_type = 'question_asked'", (did,)).fetchone()

    return {
        "device": device,
        "sessions": sessions,
        "games_browsed": games_browsed,
        "questions": questions,
        "orders": orders,
        "tts_usage": tts_usage,
        "voice_vs_text": {
            "voice": voice_count[0] if voice_count else 0,
            "text": text_count[0] if text_count else 0,
        },
    }


# ─────────────────────────────────────────────────────────────
# Device timeline
# ─────────────────────────────────────────────────────────────

@router.get("/devices/{device_id}/timeline")
async def device_timeline(
    device_id: str,
    user: dict = Depends(get_current_venue_admin),
):
    db = get_analytics_db()
    rows = db.execute("""
        SELECT event_type, game_id, session_id, timestamp, payload
        FROM events WHERE device_id = ?
        ORDER BY timestamp ASC
    """, (device_id,)).fetchall()

    timeline = []
    for r in rows:
        payload = json.loads(r[4]) if r[4] else {}
        timeline.append({
            "event_type": r[0],
            "game_id": r[1],
            "session_id": r[2],
            "timestamp": r[3],
            "payload": payload,
        })
    return {"timeline": timeline}


# ─────────────────────────────────────────────────────────────
# Dwell time per page
# ─────────────────────────────────────────────────────────────

@router.get("/dwell/pages")
async def dwell_per_page(
    venue_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_venue_admin),
):
    vid = _venue_scope(user, venue_id)
    db = get_analytics_db()
    ew, ep = _build_where("venue_id", "timestamp", vid, start_date, end_date)

    rows = db.execute(f"""
        SELECT json_extract(payload, '$.page') as page,
               AVG(CAST(json_extract(payload, '$.dwell_seconds') AS REAL)) as avg_dwell
        FROM events{ew} {'AND' if ew else 'WHERE'} event_type = 'page_dwell'
            AND json_extract(payload, '$.page') IS NOT NULL
        GROUP BY page ORDER BY avg_dwell DESC
    """, ep).fetchall()

    return {"pages": [{"page": r[0], "avg_seconds": round(r[1], 1)} for r in rows]}


# ─────────────────────────────────────────────────────────────
# Dwell time per tab
# ─────────────────────────────────────────────────────────────

@router.get("/dwell/tabs")
async def dwell_per_tab(
    venue_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_venue_admin),
):
    vid = _venue_scope(user, venue_id)
    db = get_analytics_db()
    ew, ep = _build_where("venue_id", "timestamp", vid, start_date, end_date)

    rows = db.execute(f"""
        SELECT json_extract(payload, '$.tab') as tab,
               AVG(CAST(json_extract(payload, '$.dwell_seconds') AS REAL)) as avg_dwell
        FROM events{ew} {'AND' if ew else 'WHERE'} event_type = 'tab_dwell'
            AND json_extract(payload, '$.tab') IS NOT NULL
        GROUP BY tab ORDER BY avg_dwell DESC
    """, ep).fetchall()

    return {"tabs": [{"tab": r[0], "avg_seconds": round(r[1], 1)} for r in rows]}


# ─────────────────────────────────────────────────────────────
# Top questions
# ─────────────────────────────────────────────────────────────

@router.get("/top-questions")
async def top_questions(
    venue_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_venue_admin),
):
    vid = _venue_scope(user, venue_id)
    db = get_analytics_db()
    ew, ep = _build_where("venue_id", "timestamp", vid, start_date, end_date)

    rows = db.execute(f"""
        SELECT json_extract(payload, '$.question') as question,
               game_id,
               COUNT(*) as cnt
        FROM events{ew} {'AND' if ew else 'WHERE'} event_type = 'question_asked'
            AND json_extract(payload, '$.question') IS NOT NULL
        GROUP BY question, game_id
        ORDER BY cnt DESC LIMIT 20
    """, ep).fetchall()

    return {"questions": [{"question": r[0], "game_id": r[1] or "", "count": r[2]} for r in rows]}


# ─────────────────────────────────────────────────────────────
# Top games
# ─────────────────────────────────────────────────────────────

@router.get("/top-games")
async def top_games(
    venue_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_venue_admin),
):
    vid = _venue_scope(user, venue_id)
    db = get_analytics_db()
    ew, ep = _build_where("venue_id", "timestamp", vid, start_date, end_date)

    rows = db.execute(f"""
        SELECT game_id, COUNT(*) as cnt
        FROM events{ew} {'AND' if ew else 'WHERE'} event_type = 'session_start'
            AND game_id IS NOT NULL
        GROUP BY game_id ORDER BY cnt DESC LIMIT 15
    """, ep).fetchall()

    return {"games": [{"game_id": r[0], "title": r[0], "count": r[1]} for r in rows]}


# ─────────────────────────────────────────────────────────────
# Time to order
# ─────────────────────────────────────────────────────────────

@router.get("/time-to-order")
async def time_to_order(
    venue_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_venue_admin),
):
    vid = _venue_scope(user, venue_id)
    db = get_analytics_db()
    ew, ep = _build_where("venue_id", "timestamp", vid, start_date, end_date)

    # Get time-to-order from order_placed events payload
    rows = db.execute(f"""
        SELECT CAST(json_extract(payload, '$.minutes_since_game_start') AS REAL) as mins
        FROM events{ew} {'AND' if ew else 'WHERE'} event_type = 'order_placed'
            AND json_extract(payload, '$.minutes_since_game_start') IS NOT NULL
    """, ep).fetchall()

    buckets = [
        {"label": "0-5 min", "min": 0, "max": 5, "count": 0},
        {"label": "5-10 min", "min": 5, "max": 10, "count": 0},
        {"label": "10-15 min", "min": 10, "max": 15, "count": 0},
        {"label": "15-20 min", "min": 15, "max": 20, "count": 0},
        {"label": "20-30 min", "min": 20, "max": 30, "count": 0},
        {"label": "30+ min", "min": 30, "max": 9999, "count": 0},
    ]

    total_mins = 0
    count = 0
    for r in rows:
        if r[0] is not None:
            m = r[0]
            total_mins += m
            count += 1
            for b in buckets:
                if b["min"] <= m < b["max"]:
                    b["count"] += 1
                    break

    avg_minutes = round(total_mins / count, 1) if count > 0 else 0

    return {
        "buckets": [{"label": b["label"], "count": b["count"]} for b in buckets],
        "avg_minutes": avg_minutes,
    }


# ─────────────────────────────────────────────────────────────
# Input methods (voice vs text)
# ─────────────────────────────────────────────────────────────

@router.get("/input-methods")
async def input_methods(
    venue_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_venue_admin),
):
    vid = _venue_scope(user, venue_id)
    db = get_analytics_db()
    ew, ep = _build_where("venue_id", "timestamp", vid, start_date, end_date)

    voice = db.execute(f"SELECT COUNT(*) FROM events{ew} {'AND' if ew else 'WHERE'} event_type = 'voice_input_used'", ep).fetchone()
    text = db.execute(f"SELECT COUNT(*) FROM events{ew} {'AND' if ew else 'WHERE'} event_type = 'question_asked'", ep).fetchone()

    return {
        "voice": voice[0] if voice else 0,
        "text": text[0] if text else 0,
    }


# ─────────────────────────────────────────────────────────────
# Peak hours heatmap
# ─────────────────────────────────────────────────────────────

@router.get("/peak-hours")
async def peak_hours(
    venue_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_venue_admin),
):
    vid = _venue_scope(user, venue_id)
    db = get_analytics_db()
    ew, ep = _build_where("venue_id", "timestamp", vid, start_date, end_date)

    rows = db.execute(f"""
        SELECT CAST(strftime('%w', timestamp) AS INTEGER) as dow,
               CAST(strftime('%H', timestamp) AS INTEGER) as hour,
               COUNT(DISTINCT session_id) as cnt
        FROM events{ew} {'AND' if ew else 'WHERE'} event_type = 'session_start'
        GROUP BY dow, hour
    """, ep).fetchall()

    # Convert strftime %w (0=Sunday) to spec (0=Monday)
    heatmap = []
    for r in rows:
        dow = r[0]
        # Convert: 0=Sun->6, 1=Mon->0, 2=Tue->1, ...
        day = (dow - 1) % 7
        heatmap.append({"day": day, "hour": r[1], "count": r[2]})

    return {"heatmap": heatmap}


# ─────────────────────────────────────────────────────────────
# CSV Export
# ─────────────────────────────────────────────────────────────

@router.get("/export")
async def export_csv(
    venue_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_venue_admin),
):
    vid = _venue_scope(user, venue_id)
    db = get_analytics_db()
    dw, dp = _build_where("venue_id", "last_seen_at", vid, start_date, end_date)

    rows = db.execute(f"""
        SELECT device_id, device_name, platform, visit_count,
               total_events, last_seen_at, first_seen_at, venue_id
        FROM devices{dw}
        ORDER BY last_seen_at DESC
    """, dp).fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["device_id", "device_name", "platform", "visits", "total_events", "last_active", "first_seen", "venue_id"])
    for r in rows:
        writer.writerow(r)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=gmai_devices_export.csv"},
    )
