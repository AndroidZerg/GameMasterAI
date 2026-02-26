"""Onboarding router — venue setup wizard endpoints."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/onboarding", tags=["onboarding"])


@router.get("/health")
def health():
    return {"status": "ok", "router": "onboarding"}
