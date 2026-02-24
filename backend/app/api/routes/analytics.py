"""Analytics endpoints — event tracking and admin dashboard."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.core.auth import get_current_venue, get_optional_venue
from app.models.analytics import log_event, get_analytics_summary

router = APIRouter(prefix="/api", tags=["analytics"])


class EventRequest(BaseModel):
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


@router.post("/analytics/event")
async def track_event(req: EventRequest, request: Request):
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


@router.post("/analytics/filter")
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


@router.post("/analytics/game-view")
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


@router.get("/admin/analytics")
async def get_analytics_dashboard(
    venue: dict = Depends(get_current_venue),
):
    """Analytics dashboard data for venue owners. Requires auth."""
    return get_analytics_summary(venue_id=venue["venue_id"])
