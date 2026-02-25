"""Orders endpoints — place orders, admin list, Telegram notification."""

import os
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from app.core.auth import get_current_venue
from app.models.orders import create_order, get_orders, update_order_status

router = APIRouter(prefix="/api", tags=["orders"])

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")


class OrderItem(BaseModel):
    item_id: Optional[str] = None
    name: str
    price: float
    quantity: int = 1
    category: Optional[str] = None


class PlaceOrderRequest(BaseModel):
    venue_id: Optional[str] = None
    session_id: Optional[str] = None
    items: List[OrderItem]
    total: float
    submitted_at: Optional[str] = None


def _send_telegram_order(session_id: str, items: list, total: float):
    """Fire-and-forget Telegram notification for new order."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    item_lines = "\n".join(
        f"  \u2022 {it['quantity']}x {it['name']} (${it['price']:.2f})"
        for it in items
    )
    text = (
        f"\U0001f6d2 New Order \u2014 Table Session {session_id or 'walk-in'}\n"
        f"{item_lines}\n"
        f"Total: ${total:.2f}"
    )
    try:
        httpx.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": text},
            timeout=10,
        )
    except Exception:
        pass


@router.post("/orders")
async def place_order(req: PlaceOrderRequest):
    """Place a new order from a game session."""
    if not req.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item")
    if req.total <= 0:
        raise HTTPException(status_code=400, detail="Total must be positive")

    items_list = [it.model_dump() for it in req.items]
    order_id = create_order(
        venue_id=req.venue_id,
        session_id=req.session_id,
        items=items_list,
        total=req.total,
    )

    # Telegram notification (fire-and-forget)
    _send_telegram_order(
        session_id=req.session_id or "",
        items=items_list,
        total=req.total,
    )

    return {"order_id": order_id, "success": True}


@router.get("/admin/orders")
async def admin_orders(venue: dict = Depends(get_current_venue)):
    """List orders for the venue (admin only)."""
    venue_id = venue.get("venue_id", "default")
    orders = get_orders(venue_id=venue_id)
    return {"orders": orders}
