"""Order management for Thai House dashboard — confirm, complete, reject, reprint."""

import json
import logging
import os
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional

from app.services.turso import get_menu_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["order-management"])

STAFF_PIN = os.getenv("DRINK_CLUB_STAFF_PIN", "1234")


def _verify_pin(pin: Optional[str]):
    if not pin or pin != STAFF_PIN:
        raise HTTPException(status_code=403, detail="Invalid PIN")


@router.get("/venue-orders")
async def get_orders(status: Optional[str] = None,
                     x_staff_pin: Optional[str] = Header(None)):
    """List orders, optionally filtered by status (comma-separated)."""
    _verify_pin(x_staff_pin)
    db = get_menu_db()

    if status:
        statuses = [s.strip() for s in status.split(",")]
        placeholders = ",".join("?" * len(statuses))
        rows = db.execute(
            f"""SELECT id, order_number, source, table_number, customer_name,
                       customer_phone, items, total, order_status, print_status,
                       drink_club_phone, created_at, confirmed_at, completed_at,
                       rejected_reason
                FROM venue_orders
                WHERE order_status IN ({placeholders})
                ORDER BY created_at DESC LIMIT 100""",
            tuple(statuses)
        ).fetchall()
    else:
        rows = db.execute(
            """SELECT id, order_number, source, table_number, customer_name,
                      customer_phone, items, total, order_status, print_status,
                      drink_club_phone, created_at, confirmed_at, completed_at,
                      rejected_reason
               FROM venue_orders
               ORDER BY created_at DESC LIMIT 100"""
        ).fetchall()

    orders = []
    for r in rows:
        orders.append({
            "id": r[0], "order_number": r[1], "source": r[2],
            "table_number": r[3], "customer_name": r[4],
            "customer_phone": r[5],
            "items": json.loads(r[6]) if r[6] else [],
            "total": r[7], "order_status": r[8],
            "print_status": r[9], "drink_club_phone": r[10],
            "created_at": r[11], "confirmed_at": r[12],
            "completed_at": r[13], "rejected_reason": r[14],
        })
    return {"orders": orders}


@router.post("/venue-orders/{order_id}/confirm")
async def confirm_order(order_id: int,
                        x_staff_pin: Optional[str] = Header(None)):
    _verify_pin(x_staff_pin)
    db = get_menu_db()
    db.execute(
        "UPDATE venue_orders SET order_status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP WHERE id = ?",
        (order_id,)
    )
    db.commit()
    return {"success": True, "order_id": order_id, "status": "confirmed"}


@router.post("/venue-orders/{order_id}/complete")
async def complete_order(order_id: int,
                         x_staff_pin: Optional[str] = Header(None)):
    _verify_pin(x_staff_pin)
    db = get_menu_db()
    db.execute(
        "UPDATE venue_orders SET order_status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
        (order_id,)
    )
    db.commit()
    return {"success": True, "order_id": order_id, "status": "completed"}


class RejectRequest(BaseModel):
    reason: str = ""


@router.post("/venue-orders/{order_id}/reject")
async def reject_order(order_id: int, req: RejectRequest,
                       x_staff_pin: Optional[str] = Header(None)):
    _verify_pin(x_staff_pin)
    db = get_menu_db()
    db.execute(
        "UPDATE venue_orders SET order_status = 'rejected', rejected_reason = ? WHERE id = ?",
        (req.reason, order_id)
    )
    db.commit()
    return {"success": True, "order_id": order_id, "status": "rejected"}


@router.post("/venue-orders/{order_id}/reprint")
async def reprint_order(order_id: int,
                        x_staff_pin: Optional[str] = Header(None)):
    _verify_pin(x_staff_pin)
    db = get_menu_db()
    db.execute(
        "UPDATE venue_orders SET print_status = 'pending' WHERE id = ?",
        (order_id,)
    )
    db.commit()
    return {"success": True, "order_id": order_id}


@router.get("/venue-orders/stats")
async def order_stats(x_staff_pin: Optional[str] = Header(None)):
    """Quick stats for the orders tab header."""
    _verify_pin(x_staff_pin)
    db = get_menu_db()

    new = db.execute(
        "SELECT COUNT(*) FROM venue_orders WHERE order_status = 'new'"
    ).fetchone()[0]
    confirmed = db.execute(
        "SELECT COUNT(*) FROM venue_orders WHERE order_status = 'confirmed'"
    ).fetchone()[0]
    today_total = db.execute(
        "SELECT COALESCE(SUM(total), 0) FROM venue_orders WHERE date(created_at) = date('now') AND order_status != 'rejected'"
    ).fetchone()[0]
    today_count = db.execute(
        "SELECT COUNT(*) FROM venue_orders WHERE date(created_at) = date('now') AND order_status != 'rejected'"
    ).fetchone()[0]

    return {
        "new_orders": new, "confirmed_orders": confirmed,
        "today_revenue": today_total, "today_count": today_count,
    }
