"""Analytics event ingestion and query endpoints.

Dual-mode: new Turso-backed batch events + legacy SQLite analytics.
"""
from datetime import datetime, timezone
from typing import List, Optional
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.core.auth import get_current_venue, get_optional_venue
from app.models.analytics import log_event, get_analytics_summary
from app.services.turso import get_analytics_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["analytics"])


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
async def ingest_events(batch: EventBatch):
    """Batch-ingest analytics events into Turso/libsql."""
    db = get_analytics_db()
    count = 0
    for e in batch.events:
        db.execute(
            "INSERT INTO events (event_type, venue_id, device_id, session_id, game_id, timestamp, payload) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (e.event_type, batch.venue_id or "demo", e.device_id, e.session_id, e.game_id, e.timestamp, json.dumps(e.payload or {}))
        )
        count += 1
    db.commit()
    return {"ingested": count}


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
