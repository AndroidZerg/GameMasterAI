"""Venue configuration endpoint."""

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api", tags=["venue"])

_VENUE_CONFIG_PATH = Path(__file__).resolve().parents[4] / "content" / "venue-config.json"


@router.get("/venue")
async def get_venue_config():
    if not _VENUE_CONFIG_PATH.exists():
        raise HTTPException(status_code=404, detail="Venue config not found")
    try:
        return json.loads(_VENUE_CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
