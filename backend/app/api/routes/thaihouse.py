"""Public Thai House endpoints — menu and orders without auth."""

import json
import logging
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional

from app.core.config import THAI_HOUSE_BOT_TOKEN, THAI_HOUSE_CHAT_ID
from app.core.limiter import limiter
from app.models.orders import create_order, next_order_number, insert_print_queue

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/public", tags=["thaihouse"])

VENUE_SLUGS = {"thaihouse": "meetup"}

_CONTENT_DIR = Path(__file__).resolve().parents[4] / "content" / "menus"

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")


class PublicOrderItem(BaseModel):
    name: str
    price: float
    quantity: int = 1


class PublicOrderRequest(BaseModel):
    customer_name: str
    items: List[PublicOrderItem]
    total: float


@router.get("/menu/{venue_slug}")
async def public_menu(venue_slug: str):
    """Serve public menu JSON for a venue slug."""
    venue_id = VENUE_SLUGS.get(venue_slug)
    if not venue_id:
        raise HTTPException(status_code=404, detail="Venue not found")
    menu_path = _CONTENT_DIR / f"{venue_id}.json"
    if not menu_path.exists():
        raise HTTPException(status_code=404, detail="Menu not found")
    with open(menu_path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.post("/order/{venue_slug}")
@limiter.limit("10/hour")
async def public_order(venue_slug: str, req: PublicOrderRequest, request: Request):
    """Place a public order — rate limited to 10/hour per IP."""
    venue_id = VENUE_SLUGS.get(venue_slug)
    if not venue_id:
        raise HTTPException(status_code=404, detail="Venue not found")
    if not req.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item")
    if not req.customer_name.strip():
        raise HTTPException(status_code=400, detail="Customer name is required")
    if req.total <= 0:
        raise HTTPException(status_code=400, detail="Total must be positive")

    items_list = [it.model_dump() for it in req.items]

    order_number = next_order_number(venue_id)
    order_id = create_order(
        venue_id=venue_id,
        session_id="",
        items=items_list,
        total=req.total,
        customer_name=req.customer_name.strip(),
    )

    # Telegram: GMAI Leads bot
    _send_telegram(
        TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
        items_list, req.total, req.customer_name.strip(), order_number,
    )
    # Telegram: Thai House Orders bot
    _send_telegram(
        THAI_HOUSE_BOT_TOKEN, THAI_HOUSE_CHAT_ID,
        items_list, req.total, req.customer_name.strip(), order_number,
    )

    # Print queue
    try:
        order_data = json.dumps({
            "items": items_list,
            "total": req.total,
            "customer_name": req.customer_name.strip(),
            "session_id": "",
        })
        insert_print_queue(order_id, venue_id, order_data, order_number)
    except Exception as e:
        logger.error(f"Failed to insert print queue: {e}")

    return {"order_id": order_id, "order_number": order_number, "success": True}


def _send_telegram(bot_token: str, chat_id: str, items: list, total: float,
                   customer_name: str, order_number: int):
    if not bot_token or not chat_id:
        return
    pt = timezone(timedelta(hours=-8))
    now_pt = datetime.now(pt).strftime("%I:%M %p PT")
    item_lines = "\n".join(
        f"  {it['quantity']}x {it['name']} -- ${it['price'] * it['quantity']:.2f}"
        for it in items
    )
    text = (
        f"Thai House Menu Order #{order_number}\n"
        f"{now_pt}\n"
        f"Name: {customer_name}\n\n"
        f"Order:\n{item_lines}\n\n"
        f"Total: ${total:.2f}"
    )
    try:
        httpx.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": text},
            timeout=10,
        )
    except Exception:
        pass
