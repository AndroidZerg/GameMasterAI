"""Analytics event ingestion and query endpoints.

Dual-mode: new Turso-backed batch events + legacy SQLite analytics.
"""
from datetime import datetime, timezone
from typing import List, Optional
import json
import logging
import re

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.core.auth import get_current_venue, get_optional_venue
from app.models.analytics import log_event, get_analytics_summary
from app.services.turso import get_analytics_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["analytics"])


# ═══════════════════════════════════════════════════════════════
# Device UA parsing
# ═══════════════════════════════════════════════════════════════

def _parse_device_info(user_agent: str):
    """Parse User-Agent string into (device_name, platform)."""
    if not user_agent:
        return ("Unknown Device", "Desktop")

    ua = user_agent

    # iOS devices
    if "iPhone" in ua:
        model = "iPhone"
        m = re.search(r"iPhone OS (\d+[_\.]\d+)", ua)
        version = m.group(1).replace("_", ".") if m else ""
        platform = "iOS"
        return (f"{model} / iOS {version}".strip(" /"), platform)

    if "iPad" in ua:
        model = "iPad"
        m = re.search(r"OS (\d+[_\.]\d+)", ua)
        version = m.group(1).replace("_", ".") if m else ""
        return (f"{model} / iPadOS {version}".strip(" /"), "Tablet")

    # Android devices
    if "Android" in ua:
        platform = "Android"
        # Try to extract device model from "Build/" pattern or "; MODEL)"
        m = re.search(r";\s*([^;)]+?)\s*(?:Build|[)])", ua)
        model = m.group(1).strip() if m else "Android Device"
        m2 = re.search(r"Android (\d+[\.\d]*)", ua)
        version = m2.group(1) if m2 else ""
        # Detect tablets
        if "Tablet" in ua or ("Mobile" not in ua and "Android" in ua):
            platform = "Tablet"
        return (f"{model} / Android {version}".strip(" /"), platform)

    # Desktop browsers
    platform = "Desktop"
    os_name = "Unknown"
    browser = "Unknown"

    if "Windows" in ua:
        os_name = "Windows"
    elif "Macintosh" in ua or "Mac OS" in ua:
        os_name = "macOS"
    elif "Linux" in ua:
        os_name = "Linux"
    elif "CrOS" in ua:
        os_name = "ChromeOS"

    # Browser detection
    if "Edg/" in ua:
        m = re.search(r"Edg/(\d+)", ua)
        browser = f"Edge {m.group(1)}" if m else "Edge"
    elif "Chrome/" in ua:
        m = re.search(r"Chrome/(\d+)", ua)
        browser = f"Chrome {m.group(1)}" if m else "Chrome"
    elif "Firefox/" in ua:
        m = re.search(r"Firefox/(\d+)", ua)
        browser = f"Firefox {m.group(1)}" if m else "Firefox"
    elif "Safari/" in ua and "Chrome" not in ua:
        m = re.search(r"Version/(\d+[\.\d]*)", ua)
        browser = f"Safari {m.group(1)}" if m else "Safari"

    return (f"{os_name} — {browser}", platform)


# ═══════════════════════════════════════════════════════════════
# NEW: Turso-backed batch event ingestion
# ═══════════════════════════════════════════════════════════════

class EventIn(BaseModel):
    event_type: str
    device_id: str
    session_id: Optional[str] = None
    game_id: Optional[str] = None
    timestamp: str
    payload: Optional[dict] = {}


class EventBatch(BaseModel):
    venue_id: Optional[str] = "demo"
    events: List[EventIn]


@router.post("/api/events")
async def ingest_events(request: Request):
    """Batch-ingest analytics events into Turso/libsql.

    Accepts either:
      - EventBatch: {"venue_id": "...", "events": [...]}
      - Raw array:  [{"event_type": "...", ...}, ...]
    """
    body = await request.json()
    db = get_analytics_db()
    count = 0
    now = datetime.now(timezone.utc).isoformat()

    # Normalise: accept raw array or batch object
    if isinstance(body, list):
        events = body
        venue_id = "demo"
    else:
        events = body.get("events", [])
        venue_id = body.get("venue_id", "demo")

    # Track unique devices and sessions in this batch for upserts
    batch_devices = {}   # device_id -> {event_count, first_event}
    batch_sessions = {}  # session_id -> {device_id, event_counts}
    device_metadata = body.get("device_metadata") if isinstance(body, dict) else None

    for e in events:
        et = e.get("event_type", "unknown")
        did = e.get("device_id", "")
        sid = e.get("session_id")
        payload = e.get("payload") or e.get("properties") or {}

        db.execute(
            "INSERT INTO events (event_type, venue_id, device_id, session_id, game_id, timestamp, payload) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (et, venue_id, did, sid, e.get("game_id"),
             e.get("timestamp", now), json.dumps(payload))
        )
        count += 1

        # Accumulate device stats
        if did:
            if did not in batch_devices:
                batch_devices[did] = {"event_count": 0, "first_event": e}
            batch_devices[did]["event_count"] += 1

        # Accumulate session stats
        if sid:
            if sid not in batch_sessions:
                batch_sessions[sid] = {
                    "device_id": did,
                    "questions_asked": 0, "orders_placed": 0,
                    "tts_uses": 0, "voice_inputs": 0,
                    "games_viewed": 0, "games_played": 0,
                }
            s = batch_sessions[sid]
            if et == "question_asked":
                s["questions_asked"] += 1
            elif et == "order_placed":
                s["orders_placed"] += 1
            elif et in ("tts_played",):
                s["tts_uses"] += 1
            elif et == "voice_input_used":
                s["voice_inputs"] += 1
            elif et == "game_selected":
                s["games_viewed"] += 1
            elif et == "session_start":
                s["games_played"] += 1

        # Extract player names for device_names
        if et == "score_player_added" and did:
            player_name = payload.get("player_name", "")
            if player_name:
                db.execute(
                    "INSERT INTO device_names (device_id, name, session_id, seen_at) VALUES (?, ?, ?, ?)",
                    (did, player_name, sid, e.get("timestamp", now))
                )

    # ── Upsert devices ──
    for did, info in batch_devices.items():
        ua = ""
        if device_metadata:
            ua = device_metadata.get("user_agent", "")
        if not ua:
            p = info["first_event"].get("payload") or {}
            ua = p.get("user_agent", "")

        device_name_val = None
        platform_val = None
        screen_res = None

        if device_metadata:
            device_name_val = device_metadata.get("device_name")
            platform_val = device_metadata.get("platform")
            screen_res = device_metadata.get("screen_resolution")
        elif ua:
            device_name_val, platform_val = _parse_device_info(ua)

        # Try INSERT first, then UPDATE on conflict
        db.execute("""
            INSERT INTO devices (device_id, device_name, platform, screen_resolution, user_agent, venue_id, first_seen_at, last_seen_at, visit_count, total_sessions, total_events)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)
            ON CONFLICT(device_id) DO UPDATE SET
                last_seen_at = ?,
                total_events = total_events + ?,
                venue_id = COALESCE(?, venue_id),
                device_name = COALESCE(?, device_name),
                platform = COALESCE(?, platform),
                screen_resolution = COALESCE(?, screen_resolution),
                user_agent = COALESCE(?, user_agent)
        """, (
            did, device_name_val, platform_val, screen_res, ua, venue_id,
            now, now, info["event_count"],
            now, info["event_count"],
            venue_id, device_name_val, platform_val, screen_res, ua
        ))

    # ── Upsert sessions ──
    for sid, stats in batch_sessions.items():
        db.execute("""
            INSERT INTO sessions (session_id, device_id, venue_id, started_at, games_viewed, games_played, questions_asked, orders_placed, tts_uses, voice_inputs)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET
                games_viewed = games_viewed + ?,
                games_played = games_played + ?,
                questions_asked = questions_asked + ?,
                orders_placed = orders_placed + ?,
                tts_uses = tts_uses + ?,
                voice_inputs = voice_inputs + ?
        """, (
            sid, stats["device_id"], venue_id, now,
            stats["games_viewed"], stats["games_played"],
            stats["questions_asked"], stats["orders_placed"],
            stats["tts_uses"], stats["voice_inputs"],
            stats["games_viewed"], stats["games_played"],
            stats["questions_asked"], stats["orders_placed"],
            stats["tts_uses"], stats["voice_inputs"],
        ))

    # ── Handle session_ended: update session with final stats ──
    for e in events:
        if e.get("event_type") == "session_ended":
            payload = e.get("payload") or {}
            sid = e.get("session_id")
            if sid:
                db.execute("""
                    UPDATE sessions SET
                        ended_at = ?,
                        duration_seconds = ?,
                        pages_visited = ?
                    WHERE session_id = ?
                """, (
                    e.get("timestamp", now),
                    payload.get("total_duration_seconds"),
                    json.dumps(payload.get("pages_visited", [])),
                    sid
                ))
            # Increment visit_count on the device
            did = e.get("device_id", "")
            if did:
                db.execute("""
                    UPDATE devices SET
                        visit_count = visit_count + 1,
                        total_sessions = total_sessions + 1
                    WHERE device_id = ?
                """, (did,))

    db.commit()
    return {"received": count, "status": "ok"}


@router.get("/api/admin/analytics/snapshot")
async def analytics_snapshot(venue_id: str = None, venue: dict = Depends(get_current_venue)):
    """Real-time analytics snapshot from Turso events table. Super admin only."""
    if venue.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    db = get_analytics_db()
    today = datetime.utcnow().strftime("%Y-%m-%d")
    today_start = f"{today}T00:00:00"

    venue_filter = ""
    params_base = [today_start]
    if venue_id:
        venue_filter = " AND venue_id = ?"
        params_base.append(venue_id)

    # Sessions today
    row = db.execute(f"SELECT COUNT(DISTINCT session_id) FROM events WHERE timestamp >= ?{venue_filter} AND event_type = 'session_start'", params_base).fetchone()
    sessions_today = row[0] if row else 0

    # Unique devices today
    row = db.execute(f"SELECT COUNT(DISTINCT device_id) FROM events WHERE timestamp >= ?{venue_filter}", params_base).fetchone()
    unique_devices = row[0] if row else 0

    # Questions today
    row = db.execute(f"SELECT COUNT(*) FROM events WHERE timestamp >= ?{venue_filter} AND event_type = 'question_asked'", params_base).fetchone()
    questions_today = row[0] if row else 0

    # Top game today
    row = db.execute(f"SELECT game_id, COUNT(*) as cnt FROM events WHERE timestamp >= ?{venue_filter} AND event_type = 'session_start' AND game_id IS NOT NULL GROUP BY game_id ORDER BY cnt DESC LIMIT 1", params_base).fetchone()
    top_game = row[0] if row else None

    return {
        "date": today,
        "sessions_today": sessions_today,
        "unique_devices_today": unique_devices,
        "questions_today": questions_today,
        "top_game_today": top_game,
    }


@router.get("/api/leaderboard/{game_id}")
async def get_leaderboard(game_id: str):
    """Placeholder — returns empty array to prevent 404 errors."""
    return []


# ═══════════════════════════════════════════════════════════════
# LEGACY: Original SQLite-backed analytics (kept for compat)
# ═══════════════════════════════════════════════════════════════

class LegacyEventRequest(BaseModel):
    event_type: str
    event_data: Optional[dict] = {}
    venue_id: Optional[str] = None
    table_number: Optional[str] = None


class FilterEventRequest(BaseModel):
    filter_type: str
    filter_value: str
    results_count: Optional[int] = None
    venue_id: Optional[str] = None


class GameViewRequest(BaseModel):
    game_id: str
    source: Optional[str] = "direct"
    venue_id: Optional[str] = None


@router.post("/api/analytics/event")
async def track_event(req: LegacyEventRequest, request: Request):
    """Log a generic analytics event. Public — called from customer tablets."""
    if not req.event_type or not req.event_type.strip():
        raise HTTPException(status_code=400, detail="event_type is required")
    ip = request.client.host if request.client else None
    eid = log_event(
        event_type=req.event_type.strip(),
        event_data=req.event_data or {},
        venue_id=req.venue_id,
        table_number=req.table_number,
        ip_address=ip,
    )
    return {"id": eid, "status": "ok"}


@router.post("/api/analytics/filter")
async def track_filter(req: FilterEventRequest, request: Request):
    """Log a filter event. Public."""
    ip = request.client.host if request.client else None
    eid = log_event(
        event_type="filter",
        event_data={
            "filter_type": req.filter_type,
            "filter_value": req.filter_value,
            "results_count": req.results_count,
        },
        venue_id=req.venue_id,
        ip_address=ip,
    )
    return {"id": eid, "status": "ok"}


@router.post("/api/analytics/game-view")
async def track_game_view(req: GameViewRequest, request: Request):
    """Log a game view event. Public."""
    if not req.game_id or not req.game_id.strip():
        raise HTTPException(status_code=400, detail="game_id is required")
    ip = request.client.host if request.client else None
    eid = log_event(
        event_type="game_view",
        event_data={"game_id": req.game_id, "source": req.source},
        venue_id=req.venue_id,
        ip_address=ip,
    )
    return {"id": eid, "status": "ok"}


@router.get("/api/admin/analytics")
async def get_analytics_dashboard(
    venue: dict = Depends(get_current_venue),
):
    """Analytics dashboard data for venue owners. Super admin only."""
    if venue.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return get_analytics_summary(venue_id=venue["venue_id"])
