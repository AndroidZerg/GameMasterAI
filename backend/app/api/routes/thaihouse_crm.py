"""CRM stats endpoint for Thai House dashboard."""

import json
import logging
import os

from fastapi import APIRouter, HTTPException, Header
from typing import Optional

from app.services.turso import get_menu_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["thaihouse-crm"])

STAFF_PIN = os.getenv("DRINK_CLUB_STAFF_PIN", "1234")


def _verify_pin(pin: Optional[str]):
    if not pin or pin != STAFF_PIN:
        raise HTTPException(status_code=403, detail="Invalid PIN")


@router.get("/crm/dashboard")
async def crm_stats(x_staff_pin: Optional[str] = Header(None)):
    """Full CRM stats computed from venue_orders."""
    _verify_pin(x_staff_pin)
    db = get_menu_db()

    # Daily revenue last 14 days
    daily_rows = db.execute(
        """SELECT date(created_at) as d, COUNT(*) as cnt,
                  COALESCE(SUM(total), 0) as rev
           FROM venue_orders
           WHERE order_status != 'rejected'
             AND created_at >= date('now', '-14 days')
           GROUP BY d ORDER BY d"""
    ).fetchall()
    daily_revenue = [{"date": r[0], "orders": r[1], "revenue": r[2]} for r in daily_rows]

    # Revenue by day of week (last 30 days)
    dow_rows = db.execute(
        """SELECT CAST(strftime('%w', created_at) AS INTEGER) as dow,
                  COUNT(*) as cnt, COALESCE(SUM(total), 0) as rev
           FROM venue_orders
           WHERE order_status != 'rejected'
             AND created_at >= date('now', '-30 days')
           GROUP BY dow ORDER BY dow"""
    ).fetchall()
    days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    by_day = [{"day": days[r[0]] if r[0] < 7 else "?", "orders": r[1], "revenue": r[2],
               "avg_ppa": round(r[2] / r[1], 2) if r[1] else 0} for r in dow_rows]

    # Revenue by source
    source_rows = db.execute(
        """SELECT source, COUNT(*), COALESCE(SUM(total), 0)
           FROM venue_orders
           WHERE order_status != 'rejected'
           GROUP BY source"""
    ).fetchall()
    by_source = [{"source": r[0], "orders": r[1], "revenue": r[2]} for r in source_rows]

    # Top items
    all_orders = db.execute(
        "SELECT items FROM venue_orders WHERE order_status != 'rejected'"
    ).fetchall()
    item_counts = {}
    for row in all_orders:
        items = json.loads(row[0]) if row[0] else []
        for it in items:
            name = it.get("name", "Unknown")
            qty = it.get("quantity", 1)
            item_counts[name] = item_counts.get(name, 0) + qty
    top_items = sorted(item_counts.items(), key=lambda x: x[1], reverse=True)[:15]
    top_items = [{"name": k, "count": v} for k, v in top_items]

    # Peak hours
    hour_rows = db.execute(
        """SELECT CAST(strftime('%H', created_at) AS INTEGER) as hr, COUNT(*)
           FROM venue_orders
           WHERE order_status != 'rejected'
             AND created_at >= date('now', '-30 days')
           GROUP BY hr ORDER BY hr"""
    ).fetchall()
    peak_hours = [{"hour": r[0], "orders": r[1]} for r in hour_rows]

    # Loyalty stats
    total_members = db.execute("SELECT COUNT(*) FROM loyalty_members").fetchone()[0]
    total_points = db.execute("SELECT COALESCE(SUM(points), 0) FROM loyalty_members").fetchone()[0]

    # Overall totals
    totals = db.execute(
        """SELECT COUNT(*), COALESCE(SUM(total), 0)
           FROM venue_orders WHERE order_status != 'rejected'"""
    ).fetchone()

    return {
        "daily_revenue": daily_revenue,
        "by_day_of_week": by_day,
        "by_source": by_source,
        "top_items": top_items,
        "peak_hours": peak_hours,
        "loyalty": {
            "total_members": total_members,
            "total_points": total_points,
        },
        "totals": {
            "total_orders": totals[0],
            "total_revenue": totals[1],
            "avg_order_value": round(totals[1] / totals[0], 2) if totals[0] else 0,
        },
    }
