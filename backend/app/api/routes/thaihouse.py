"""Public Thai House endpoints — menu and orders without auth."""

import json
import logging
import os
import time
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

# ── Menu response cache (TTL-based) ──
_menu_cache = {}  # venue_slug -> {"data": ..., "ts": time.time()}
_MENU_CACHE_TTL = 60  # seconds


def invalidate_menu_cache():
    """Clear the menu cache — call after any menu/image admin change."""
    _menu_cache.clear()


class PublicOrderItem(BaseModel):
    name: str
    price: float
    quantity: int = 1
    customizations: Optional[dict] = None
    notes: Optional[str] = None
    is_drink_club: bool = False
    originalPrice: Optional[float] = None


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

    # Check TTL cache first
    cached = _menu_cache.get(venue_slug)
    if cached and (time.time() - cached["ts"]) < _MENU_CACHE_TTL:
        return cached["data"]

    try:
        from app.services.turso import get_menu_db
        db = get_menu_db()

        # Toggles
        toggle_rows = db.execute(
            "SELECT id, name, required, options, multi_select FROM menu_toggles ORDER BY sort_order"
        ).fetchall()
        toggles = [
            {"id": r[0], "name": r[1], "required": bool(r[2]),
             "options": json.loads(r[3]),
             "multi_select": bool(r[4] if len(r) > 4 else 0)}
            for r in toggle_rows
        ]

        # Batch-fetch ALL active gallery images in one query (eliminates N+1)
        active_images = {}
        try:
            img_rows = db.execute(
                "SELECT item_id, id FROM menu_item_images WHERE status = 'active'"
            ).fetchall()
            for ir in img_rows:
                active_images[ir[0]] = ir[1]
        except Exception:
            pass  # table might not exist yet on first run

        # Categories with items
        cat_rows = db.execute(
            "SELECT id, name, icon FROM menu_categories ORDER BY sort_order"
        ).fetchall()
        sections = []
        for cat in cat_rows:
            item_rows = db.execute(
                """SELECT id, slug, name, description, price, image, toggles,
                          allows_modifications
                   FROM menu_items
                   WHERE category_id = ? AND active = 1
                   ORDER BY sort_order""",
                (cat[0],)
            ).fetchall()
            items = []
            for r in item_rows:
                item = {"name": r[2], "price": r[4]}
                if r[3]:
                    item["description"] = r[3]
                if r[5]:
                    item["image"] = r[5]
                item_toggles = json.loads(r[6]) if r[6] else []
                if item_toggles:
                    item["toggles"] = item_toggles
                if bool(r[7]):
                    item["allows_modifications"] = True
                # Gallery image from pre-fetched map (no extra query)
                gal_id = active_images.get(r[0])
                if gal_id:
                    item["gallery_image_id"] = gal_id
                items.append(item)
            sections.append({"name": cat[1], "icon": cat[2], "items": items})

        if sections:
            result = {"toggles": toggles, "sections": sections}
            _menu_cache[venue_slug] = {"data": result, "ts": time.time()}
            return result
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
        loyalty_info = None
        if loyalty_phone:
            loyalty_info = _update_loyalty(
                mdb, req.customer_name.strip(),
                loyalty_phone, req.total, order_number)
    except Exception as e:
        logger.error(f"Turso venue_orders insert failed: {e}")
        loyalty_info = None

    # Telegram: GMAI Leads bot
    _send_telegram(
        TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
        items_list, req.total, req.customer_name.strip(), order_number,
        req.table_number, req.customer_phone, loyalty_info,
    )
    # Telegram: Thai House Orders bot
    _send_telegram(
        THAI_HOUSE_BOT_TOKEN, THAI_HOUSE_CHAT_ID,
        items_list, req.total, req.customer_name.strip(), order_number,
        req.table_number, req.customer_phone, loyalty_info,
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


def _update_loyalty(db, name: str, phone: str, order_total: float, order_number: int = None):
    """Create or update a loyalty member. Points are CUMULATIVE: floor(total_spent / 10).

    Returns dict with loyalty info for Telegram, or None.
    """
    import math
    phone = ''.join(c for c in phone if c.isdigit())
    if len(phone) < 7:
        return None
    existing = db.execute(
        "SELECT id, total_spent, points FROM loyalty_members WHERE phone = ?", (phone,)
    ).fetchone()
    if existing:
        old_points = existing[2]
        new_spent = existing[1] + order_total
        new_points = math.floor(new_spent / 10)
        earned = new_points - old_points
        db.execute(
            """UPDATE loyalty_members
               SET points = ?, total_spent = ?,
                   visits = visits + 1, last_visit = CURRENT_TIMESTAMP,
                   name = ?
               WHERE id = ?""",
            (new_points, new_spent, name, existing[0])
        )
        if earned > 0:
            db.execute(
                "INSERT INTO loyalty_transactions (member_phone, type, points_change, order_number, note) "
                "VALUES (?, 'earn', ?, ?, ?)",
                (phone, earned, order_number, f"Order ${order_total:.2f}")
            )
    else:
        initial_points = math.floor(order_total / 10)
        earned = initial_points
        new_points = initial_points
        db.execute(
            """INSERT INTO loyalty_members (name, phone, points, total_spent, visits, last_visit)
               VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)""",
            (name, phone, initial_points, order_total)
        )
        if earned > 0:
            db.execute(
                "INSERT INTO loyalty_transactions (member_phone, type, points_change, order_number, note) "
                "VALUES (?, 'earn', ?, ?, ?)",
                (phone, earned, order_number, f"Order ${order_total:.2f}")
            )
    db.commit()
    return {"points": new_points, "earned": earned}


def _send_telegram(bot_token: str, chat_id: str, items: list, total: float,
                   customer_name: str, order_number: int,
                   table_number: int = None, customer_phone: str = None,
                   loyalty_info: dict = None):
    if not bot_token or not chat_id:
        return
    pt = timezone(timedelta(hours=-8))
    now_pt = datetime.now(pt).strftime("%I:%M %p PT")

    item_lines = []
    for it in items:
        line_total = it['price'] * it['quantity']
        if it.get("is_drink_club"):
            orig = it.get("originalPrice", it['price']) or 4.50
            line = f"{it['quantity']}x {it['name']} - ~${orig:.2f}~ FREE (Cha Club)"
        else:
            line = f"{it['quantity']}x {it['name']} - ${line_total:.2f}"

        # Customizations: handle both single-select (str) and multi-select (list)
        custs = it.get("customizations") or {}
        for tid, val in custs.items():
            if not val:
                continue
            if tid == "sweetness":
                line += f"\n   Sweetness: {val}"
            elif isinstance(val, list):
                # Multi-select (toppings) — show each on its own line
                for v in val:
                    line += f"\n   + {v} (+$0.35)"
            else:
                line += f"\n   {val}"

        if it.get("notes"):
            line += f"\n   Note: {it['notes']}"
        item_lines.append(line)

    # Header
    header = f"\U0001f9cb Thai House Order #{order_number}"
    lines = [header, ""]
    lines.append(f"\U0001f464 Name: {customer_name}")
    if customer_phone:
        lines.append(f"\U0001f4f1 Phone: {customer_phone}")
    if table_number:
        lines.append(f"\U0001f37d Table: {table_number}")
    if loyalty_info:
        earned_str = f" (earned {loyalty_info['earned']} this order)" if loyalty_info.get("earned") else ""
        lines.append(f"\u2b50 Loyalty: {loyalty_info['points']} points{earned_str}")
    lines.append("")
    lines.append("Order:")
    for il in item_lines:
        lines.append(il)
    lines.append("")
    lines.append(f"Subtotal: ${total:.2f}")
    lines.append(f"\n{now_pt}")

    text = "\n".join(lines)
    try:
        httpx.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": text},
            timeout=10,
        )
    except Exception:
        pass


# ── Public Loyalty Endpoints ─────────────────────────────────────

@router.get("/loyalty/lookup")
async def public_loyalty_lookup(phone: str):
    """Public loyalty lookup — returns points + available rewards."""
    from app.services.turso import get_menu_db
    db = get_menu_db()
    clean_phone = ''.join(c for c in phone if c.isdigit())
    if len(clean_phone) < 7:
        return {"found": False}

    row = db.execute(
        "SELECT name, points, visits FROM loyalty_members WHERE phone = ?",
        (clean_phone,)
    ).fetchone()
    if not row:
        return {"found": False}

    rewards = db.execute(
        "SELECT id, points_required, description FROM loyalty_rewards WHERE active = 1 ORDER BY points_required"
    ).fetchall()

    return {
        "found": True,
        "name": row[0],
        "points": row[1],
        "visits": row[2],
        "available_rewards": [
            {"id": r[0], "points_required": r[1], "description": r[2]}
            for r in rewards if r[1] <= row[1]
        ],
        "all_rewards": [
            {"id": r[0], "points_required": r[1], "description": r[2]}
            for r in rewards
        ],
    }


class PublicRedeemRequest(BaseModel):
    phone: str
    reward_id: int


@router.post("/loyalty/redeem")
async def public_loyalty_redeem(req: PublicRedeemRequest):
    """Public loyalty redemption — deducts points, logs transaction."""
    from app.services.turso import get_menu_db
    db = get_menu_db()
    clean_phone = ''.join(c for c in req.phone if c.isdigit())

    member = db.execute(
        "SELECT id, points FROM loyalty_members WHERE phone = ?", (clean_phone,)
    ).fetchone()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    reward = db.execute(
        "SELECT id, points_required, description FROM loyalty_rewards WHERE id = ? AND active = 1",
        (req.reward_id,)
    ).fetchone()
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    if member[1] < reward[1]:
        raise HTTPException(status_code=400, detail="Not enough points")

    db.execute("UPDATE loyalty_members SET points = points - ? WHERE id = ?", (reward[1], member[0]))
    db.execute(
        "INSERT INTO loyalty_transactions (member_phone, type, points_change, reward_id, note) "
        "VALUES (?, 'redeem', ?, ?, ?)",
        (clean_phone, -reward[1], reward[0], reward[2])
    )
    db.commit()
    return {"success": True, "points_remaining": member[1] - reward[1]}
