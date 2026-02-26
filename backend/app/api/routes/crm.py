"""CRM router — admin venue management endpoints."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/admin", tags=["crm"])


@router.get("/health")
def health():
    return {"status": "ok", "router": "crm"}
