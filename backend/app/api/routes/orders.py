"""Orders endpoints — place orders, admin list, Telegram notification."""

import json
import logging
import os
from datetime import datetime, timezone, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from app.core.auth import get_current_venue
from app.core.config import THAI_HOUSE_BOT_TOKEN, THAI_HOUSE_CHAT_ID
from app.models.orders import (
    create_order, get_orders, update_order_status,
    next_order_number, insert_print_queue,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["orders"])

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

# Log Thai House bot status on module load
if THAI_HOUSE_BOT_TOKEN and THAI_HOUSE_CHAT_ID:
    logger.info("Thai House bot credentials configured — meetup orders will be forwarded")
else:
    logger.warning("Thai House bot credentials not configured — meetup orders will not be forwarded")


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
    customer_name: Optional[str] = None


def _send_telegram_order(session_id: str, items: list, total: float, customer_name: str = ""):
    """Fire-and-forget Telegram notification for new order (GMAI Leads bot)."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    item_lines = "\n".join(
        f"  \u2022 {it['quantity']}x {it['name']} (${it['price']:.2f})"
        for it in items
    )
    name_line = f"\n\U0001f464 Name: {customer_name}" if customer_name else ""
    text = (
        f"\U0001f6d2 New Order \u2014 Table Session {session_id or 'walk-in'}{name_line}\n"
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


def _send_thai_house_order(items: list, total: float, customer_name: str = ""):
    """Fire-and-forget notification to Thai House Orders Telegram bot."""
    if not THAI_HOUSE_BOT_TOKEN or not THAI_HOUSE_CHAT_ID:
        return
    # Pacific Time (Henderson, NV)
    pt = timezone(timedelta(hours=-8))
    now_pt = datetime.now(pt).strftime("%I:%M %p PT")

    item_lines = "\n".join(
        f"  {it['quantity']}x {it['name']} \u2014 ${it['price'] * it['quantity']:.2f}"
        for it in items
    )
    name_display = customer_name or "Guest"
    text = (
        f"\U0001f3ae GameMaster Guide \u2014 Table Order\n"
        f"Henderson Meetup | {now_pt}\n"
        f"\U0001f464 Name: {name_display}\n\n"
        f"\U0001f6d2 Order:\n{item_lines}\n\n"
        f"\U0001f4b0 Total: ${total:.2f}"
    )
    try:
        httpx.post(
            f"https://api.telegram.org/bot{THAI_HOUSE_BOT_TOKEN}/sendMessage",
            json={"chat_id": THAI_HOUSE_CHAT_ID, "text": text},
            timeout=10,
        )
    except Exception as e:
        logger.error(f"Thai House Telegram notification failed: {e}")


@router.post("/orders")
async def place_order(req: PlaceOrderRequest):
    """Place a new order from a game session."""
    if not req.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item")
    if req.total <= 0:
        raise HTTPException(status_code=400, detail="Total must be positive")

    items_list = [it.model_dump() for it in req.items]
    venue_id = req.venue_id or "default"

    # Generate per-venue order number
    order_number = next_order_number(venue_id)

    order_id = create_order(
        venue_id=venue_id,
        session_id=req.session_id,
        items=items_list,
        total=req.total,
        customer_name=req.customer_name,
    )

    # 1. GMAI Leads bot (all orders)
    _send_telegram_order(
        session_id=req.session_id or "",
        items=items_list,
        total=req.total,
        customer_name=req.customer_name or "",
    )

    # 2. Thai House bot (meetup orders only)
    if venue_id == "meetup":
        _send_thai_house_order(
            items=items_list,
            total=req.total,
            customer_name=req.customer_name or "",
        )

    # 3. Print queue — local thermal printer agent polls for these
    try:
        order_data = json.dumps({
            "items": items_list,
            "total": req.total,
            "customer_name": req.customer_name or "Guest",
            "session_id": req.session_id or "",
        })
        insert_print_queue(order_id, venue_id, order_data, order_number)
    except Exception as e:
        logger.error(f"Failed to insert print queue record: {e}")

    return {"order_id": order_id, "order_number": order_number, "success": True}


@router.get("/admin/orders")
async def admin_orders(venue: dict = Depends(get_current_venue)):
    """List orders for the venue (admin only)."""
    venue_id = venue.get("venue_id", "default")
    orders = get_orders(venue_id=venue_id)
    return {"orders": orders}
