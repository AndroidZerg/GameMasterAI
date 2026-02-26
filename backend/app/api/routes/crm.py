"""CRM router — admin venue management endpoints (super_admin only)."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from app.core.auth import get_current_venue
from app.services.crm_service import get_all_crm_venues, get_crm_venue_detail, export_venues_csv

router = APIRouter(prefix="/api/v1/admin/crm", tags=["crm"])


@router.get("/health")
def health():
    return {"status": "ok", "router": "crm"}


def _require_super_admin(venue: dict):
    if venue.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")


@router.get("/venues")
async def crm_venues(venue: dict = Depends(get_current_venue)):
    """List all venues with CRM computed fields."""
    _require_super_admin(venue)
    return get_all_crm_venues()


@router.get("/venues/{venue_id}")
async def crm_venue_detail(venue_id: str, venue: dict = Depends(get_current_venue)):
    """Drill-down for one venue with 30-day analytics."""
    _require_super_admin(venue)
    detail = get_crm_venue_detail(venue_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Venue not found")
    return detail


@router.get("/export")
async def crm_export(venue: dict = Depends(get_current_venue)):
    """Download CSV of all venues."""
    _require_super_admin(venue)
    csv_data = export_venues_csv()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="gmai-venues-{today}.csv"'},
    )
