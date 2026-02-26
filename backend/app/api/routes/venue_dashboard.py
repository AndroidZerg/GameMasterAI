"""Venue Dashboard router — analytics and management endpoints."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/venue", tags=["venue"])


@router.get("/health")
def health():
    return {"status": "ok", "router": "venue_dashboard"}
