"""Print queue endpoints — poll/update print status, heartbeat, reprint."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

from app.core.auth import get_current_venue
from app.core.config import PRINT_AGENT_API_KEY
from app.models.orders import (
    get_pending_prints,
    update_print_status,
    reset_print_status,
    get_print_history,
    upsert_heartbeat,
    get_heartbeat,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["print-queue"])


def _verify_print_agent_key(request: Request):
    """Verify the print agent API key from Authorization header."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing API key")
    key = auth[7:]
    if not PRINT_AGENT_API_KEY or key != PRINT_AGENT_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


async def _get_print_agent_or_venue(request: Request):
    """Allow access via print agent API key OR venue admin JWT."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer ") and PRINT_AGENT_API_KEY and auth[7:] == PRINT_AGENT_API_KEY:
        return {"auth": "api_key"}
    # Fall through to JWT check
    from app.core.auth import decode_token
    if auth.startswith("Bearer "):
        payload = decode_token(auth[7:])
        if payload:
            return {"auth": "jwt", "venue_id": payload.get("venue_id")}
    raise HTTPException(status_code=401, detail="Not authenticated")


# ── Print Agent Endpoints (API key auth) ──────────────────────────


class PrintStatusUpdate(BaseModel):
    status: str  # "printed" or "failed"
    error: Optional[str] = None


class HeartbeatRequest(BaseModel):
    venue_id: str
    printer_ip: Optional[str] = ""
    printer_status: Optional[str] = "online"
    agent_uptime_seconds: Optional[int] = 0


@router.get("/print-queue")
async def get_print_queue(venue_id: str, status: str = "pending", request: Request = None):
    """Get pending print jobs for a venue. Used by the local print agent."""
    _verify_print_agent_key(request)

    if status != "pending":
        # For non-pending, return history
        items = get_print_history(venue_id, limit=50)
        items = [i for i in items if i["print_status"] == status]
    else:
        items = get_pending_prints(venue_id)

    orders = []
    for item in items:
        data = item.get("order_data", {})
        orders.append({
            "id": item["order_id"],
            "order_number": item.get("order_number"),
            "customer_name": data.get("customer_name", "Guest"),
            "table_number": data.get("table_number"),
            "items": data.get("items", []),
            "subtotal": data.get("total", 0),
            "created_at": item.get("created_at"),
        })

    return {"orders": orders}


@router.post("/print-queue/{order_id}/printed")
async def mark_printed(order_id: int, body: PrintStatusUpdate, request: Request = None):
    """Mark an order as printed or failed. Used by the local print agent."""
    _verify_print_agent_key(request)

    if body.status not in ("printed", "failed"):
        raise HTTPException(status_code=400, detail="Status must be 'printed' or 'failed'")

    update_print_status(order_id, body.status, body.error)
    return {"success": True}


@router.post("/print-queue/{order_id}/reprint")
async def reprint_order(order_id: int, request: Request = None):
    """Reset an order's print status to pending for reprint."""
    await _get_print_agent_or_venue(request)
    reset_print_status(order_id)
    return {"success": True}


@router.post("/print-queue/heartbeat")
async def heartbeat(body: HeartbeatRequest, request: Request = None):
    """Print agent heartbeat — reports health status."""
    _verify_print_agent_key(request)
    upsert_heartbeat(body.venue_id, body.printer_ip, body.printer_status, body.agent_uptime_seconds)
    return {"success": True}


@router.get("/print-queue/history")
async def print_history(venue_id: str, limit: int = 50, request: Request = None):
    """Get print history for debugging. Accepts API key or venue admin JWT."""
    await _get_print_agent_or_venue(request)
    items = get_print_history(venue_id, limit)
    return {"history": items}


# ── Admin Endpoints (JWT auth) ────────────────────────────────────


@router.get("/admin/print-status")
async def admin_print_status(venue: dict = Depends(get_current_venue)):
    """Get print queue status + agent heartbeat for the admin dashboard."""
    venue_id = venue["venue_id"]
    history = get_print_history(venue_id, limit=50)
    hb = get_heartbeat(venue_id)

    return {
        "print_queue": history,
        "heartbeat": hb,
    }
