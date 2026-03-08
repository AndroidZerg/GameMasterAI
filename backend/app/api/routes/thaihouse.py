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
from app.models.orders import create_order, insert_print_queue
from app.services.turso import get_next_order_number
from app.models.drink_club import (
    get_subscriber_by_phone, get_week_redemption, _current_week_start,
    create_redemption,
)

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
    customizations: Optional[dict] = None
    notes: Optional[str] = None
    is_drink_club: bool = False


class PublicOrderRequest(BaseModel):
    customer_name: str
    customer_phone: Optional[str] = None
    items: List[PublicOrderItem]
    total: float
    table_number: Optional[int] = None
    drink_club_phone: Optional[str] = None


@router.get("/menu/{venue_slug}")
async def public_menu(venue_slug: str):
    """Serve public menu JSON — reads from Turso, falls back to JSON file."""
    venue_id = VENUE_SLUGS.get(venue_slug)
    if not venue_id:
        raise HTTPException(status_code=404, detail="Venue not found")

    try:
        from app.services.turso import get_menu_db
        db = get_menu_db()

        # Toggles
        toggle_rows = db.execute(
            "SELECT id, name, required, options FROM menu_toggles ORDER BY sort_order"
        ).fetchall()
        toggles = [
            {"id": r[0], "name": r[1], "required": bool(r[2]),
             "options": json.loads(r[3])}
            for r in toggle_rows
        ]

        # Categories with items
        cat_rows = db.execute(
            "SELECT id, name, icon FROM menu_categories ORDER BY sort_order"
        ).fetchall()
        sections = []
        for cat in cat_rows:
            item_rows = db.execute(
                """SELECT slug, name, description, price, image, toggles,
                          allows_modifications
                   FROM menu_items
                   WHERE category_id = ? AND active = 1
                   ORDER BY sort_order""",
                (cat[0],)
            ).fetchall()
            items = []
            for r in item_rows:
                item = {"name": r[1], "price": r[3]}
                if r[2]:
                    item["description"] = r[2]
                if r[4]:
                    item["image"] = r[4]
                item_toggles = json.loads(r[5]) if r[5] else []
                if item_toggles:
                    item["toggles"] = item_toggles
                if bool(r[6]):
                    item["allows_modifications"] = True
                items.append(item)
            sections.append({"name": cat[1], "icon": cat[2], "items": items})

        if sections:
            return {"toggles": toggles, "sections": sections}
    except Exception as e:
        logger.warning(f"Turso menu read failed, falling back to JSON: {e}")

    # Fallback to JSON file
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
    if req.total < 0:
        raise HTTPException(status_code=400, detail="Total must not be negative")

    # Validate drink club items
    has_drink_club_item = False
    for item in req.items:
        if item.is_drink_club:
            if has_drink_club_item:
                raise HTTPException(status_code=400, detail="Only one drink club item per order")
            has_drink_club_item = True
            if item.price != 0:
                raise HTTPException(status_code=400, detail="Drink club items must be free")
            if not req.drink_club_phone:
                raise HTTPException(status_code=400, detail="Phone number required for drink club redemption")
            subscriber = get_subscriber_by_phone(req.drink_club_phone)
            if not subscriber:
                raise HTTPException(status_code=400, detail="No active drink club subscription found for this phone")
            if subscriber["subscription_status"] != "active":
                raise HTTPException(status_code=400, detail="Drink club subscription is not active")
            ws = _current_week_start()
            existing = get_week_redemption(subscriber["id"], ws)
            if existing:
                raise HTTPException(status_code=400, detail="Drink already claimed this week")
            # Record the redemption
            try:
                create_redemption(subscriber["id"], staff_pin="app", drink_name=item.name)
            except Exception:
                raise HTTPException(status_code=400, detail="Drink already claimed this week")

    items_list = [it.model_dump() for it in req.items]

    order_number = get_next_order_number(venue_id)
    order_id = create_order(
        venue_id=venue_id,
        session_id="",
        items=items_list,
        total=req.total,
        customer_name=req.customer_name.strip(),
    )

    # Also save to Turso venue_orders for dashboard persistence
    loyalty_phone = req.customer_phone or req.drink_club_phone
    try:
        from app.services.turso import get_menu_db
        mdb = get_menu_db()
        mdb.execute(
            """INSERT INTO venue_orders
               (order_number, source, table_number, customer_name,
                customer_phone, items, total, drink_club_phone)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (order_number, "in_house", req.table_number,
             req.customer_name.strip(), req.customer_phone,
             json.dumps(items_list), req.total,
             req.drink_club_phone)
        )
        mdb.commit()

        # Update loyalty if any phone provided
        if loyalty_phone:
            _update_loyalty(mdb, req.customer_name.strip(),
                            loyalty_phone, req.total)
    except Exception as e:
        logger.error(f"Turso venue_orders insert failed: {e}")

    table_str = f" (Table {req.table_number})" if req.table_number else ""

    # Telegram: GMAI Leads bot
    _send_telegram(
        TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
        items_list, req.total, req.customer_name.strip(), order_number,
        req.table_number, req.customer_phone,
    )
    # Telegram: Thai House Orders bot
    _send_telegram(
        THAI_HOUSE_BOT_TOKEN, THAI_HOUSE_CHAT_ID,
        items_list, req.total, req.customer_name.strip(), order_number,
        req.table_number, req.customer_phone,
    )

    # Print queue
    try:
        order_data = json.dumps({
            "items": items_list,
            "total": req.total,
            "customer_name": req.customer_name.strip(),
            "customer_phone": req.customer_phone,
            "table_number": req.table_number,
            "session_id": "",
        })
        insert_print_queue(order_id, venue_id, order_data, order_number)
    except Exception as e:
        logger.error(f"Failed to insert print queue: {e}")

    return {"order_id": order_id, "order_number": order_number, "success": True}


def _update_loyalty(db, name: str, phone: str, order_total: float):
    """Create or update a loyalty member. Points are CUMULATIVE: floor(total_spent / 10)."""
    import math
    phone = ''.join(c for c in phone if c.isdigit())
    if len(phone) < 7:
        return
    existing = db.execute(
        "SELECT id, total_spent FROM loyalty_members WHERE phone = ?", (phone,)
    ).fetchone()
    if existing:
        new_spent = existing[1] + order_total
        new_points = math.floor(new_spent / 10)
        db.execute(
            """UPDATE loyalty_members
               SET points = ?, total_spent = ?,
                   visits = visits + 1, last_visit = CURRENT_TIMESTAMP,
                   name = ?
               WHERE id = ?""",
            (new_points, new_spent, name, existing[0])
        )
    else:
        initial_points = math.floor(order_total / 10)
        db.execute(
            """INSERT INTO loyalty_members (name, phone, points, total_spent, visits, last_visit)
               VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)""",
            (name, phone, initial_points, order_total)
        )
    db.commit()


def _send_telegram(bot_token: str, chat_id: str, items: list, total: float,
                   customer_name: str, order_number: int,
                   table_number: int = None, customer_phone: str = None):
    if not bot_token or not chat_id:
        return
    pt = timezone(timedelta(hours=-8))
    now_pt = datetime.now(pt).strftime("%I:%M %p PT")

    item_lines = []
    for it in items:
        line = f"  {it['quantity']}x {it['name']} -- ${it['price'] * it['quantity']:.2f}"
        extras = []
        # Toggle-based customizations
        custs = it.get("customizations") or {}
        for _tid, val in custs.items():
            if val:
                extras.append(str(val))
        if it.get("is_drink_club"):
            extras.append("DRINK CLUB")
        if extras:
            line += f"\n     > {', '.join(extras)}"
        if it.get("notes"):
            line += f"\n     > {it['notes']}"
        item_lines.append(line)

    phone_line = f"\nPhone: {customer_phone}" if customer_phone else ""
    table_line = f"\nTable: {table_number}" if table_number else ""
    text = (
        f"Thai House Menu Order #{order_number}\n"
        f"{now_pt}\n"
        f"Name: {customer_name}{phone_line}{table_line}\n\n"
        f"Order:\n" + "\n".join(item_lines) + f"\n\n"
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
