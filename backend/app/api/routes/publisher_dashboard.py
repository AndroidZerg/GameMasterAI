"""Publisher Portal — dashboard data endpoints (summary, analytics, inventory, payments)."""

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

from app.api.routes.publisher_auth import get_current_publisher
from app.services.supabase_client import get_admin_client

router = APIRouter(tags=["publisher-dashboard"])


# ── Helpers ─────────────────────────────────────────────────────

def _safe_query(fn, default):
    """Run a Supabase query and return default if the table is missing or errors."""
    try:
        return fn()
    except Exception:
        return default


def _period_to_days(period: str) -> int:
    return {"7d": 7, "30d": 30, "90d": 90, "ytd": 365, "all": 3650}.get(period, 30)


def _iso_days_ago(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


def _money(cents: Optional[int]) -> float:
    return round((cents or 0) / 100, 2)


# ── Request Models ──────────────────────────────────────────────

class BankInfoRequest(BaseModel):
    bank_name: Optional[str] = None
    account_holder: Optional[str] = None
    account_number_last4: Optional[str] = None
    routing_number_last4: Optional[str] = None
    payment_method: Optional[str] = None  # "ach", "check", "paypal", etc.
    paypal_email: Optional[str] = None
    notes: Optional[str] = None


# ── Routes: Summary ─────────────────────────────────────────────

@router.get("/dashboard/summary")
async def dashboard_summary(request: Request):
    """Top-level dashboard stats for the Home tab."""
    publisher = await get_current_publisher(request)
    admin = get_admin_client()
    pub_id = publisher["id"]

    # All games for this publisher
    games_res = _safe_query(
        lambda: admin.table("publisher_games").select("*").eq("publisher_id", pub_id).execute(),
        None,
    )
    games = (games_res.data if games_res else []) or []
    games_total = len(games)
    games_live = len([g for g in games if g.get("status") == "live"])
    games_in_review = len([g for g in games if g.get("status") == "in_review"])
    games_onboarding = len([g for g in games if g.get("status") == "onboarding"])

    # Analytics — last 30 days of play sessions (best-effort)
    since = _iso_days_ago(30)
    analytics_res = _safe_query(
        lambda: admin.table("publisher_analytics")
            .select("*")
            .eq("publisher_id", pub_id)
            .gte("event_at", since)
            .execute(),
        None,
    )
    analytics_rows = (analytics_res.data if analytics_res else []) or []
    play_sessions_30d = len([r for r in analytics_rows if r.get("event_type") == "play_session"])

    # Inventory — total units sold last 30 days (best-effort)
    inventory_res = _safe_query(
        lambda: admin.table("publisher_inventory")
            .select("*")
            .eq("publisher_id", pub_id)
            .execute(),
        None,
    )
    inventory_rows = (inventory_res.data if inventory_res else []) or []
    units_sold_30d = sum(int(r.get("units_sold_30d") or 0) for r in inventory_rows)
    units_in_stock = sum(int(r.get("units_in_stock") or 0) for r in inventory_rows)

    # Payments — next scheduled payment (best-effort)
    payments_res = _safe_query(
        lambda: admin.table("publisher_payments")
            .select("*")
            .eq("publisher_id", pub_id)
            .order("scheduled_at", desc=False)
            .execute(),
        None,
    )
    payments_rows = (payments_res.data if payments_res else []) or []
    next_payment = None
    for p in payments_rows:
        if p.get("status") in ("scheduled", "pending"):
            next_payment = {
                "amount": _money(p.get("amount_cents")),
                "scheduled_at": p.get("scheduled_at"),
                "status": p.get("status"),
            }
            break

    # Recent activity feed — combine recent game updates, plays, sales
    recent_activity = []
    for g in sorted(games, key=lambda x: x.get("updated_at") or x.get("created_at") or "", reverse=True)[:5]:
        if g.get("guide_submitted_at"):
            recent_activity.append({
                "type": "game_submitted",
                "title": g.get("title"),
                "at": g.get("guide_submitted_at"),
                "icon": "rocket",
            })
        elif g.get("status") == "live":
            recent_activity.append({
                "type": "game_live",
                "title": g.get("title"),
                "at": g.get("updated_at"),
                "icon": "check",
            })
        else:
            recent_activity.append({
                "type": "game_updated",
                "title": g.get("title"),
                "at": g.get("updated_at") or g.get("created_at"),
                "icon": "edit",
            })

    return {
        "games_on_platform": games_total,
        "games_live": games_live,
        "games_in_review": games_in_review,
        "games_onboarding": games_onboarding,
        "total_play_sessions_30d": play_sessions_30d,
        "total_units_sold_30d": units_sold_30d,
        "total_units_in_stock": units_in_stock,
        "next_payment": next_payment,
        "recent_activity": recent_activity,
        "has_inventory_data": bool(inventory_rows),
        "has_analytics_data": bool(analytics_rows),
    }


# ── Routes: Analytics ───────────────────────────────────────────

@router.get("/dashboard/analytics")
async def dashboard_analytics(
    request: Request,
    period: str = Query("30d", description="7d, 30d, 90d, ytd, all"),
):
    """Analytics tab data — plays over time, top games, top venues, conversion."""
    publisher = await get_current_publisher(request)
    admin = get_admin_client()
    pub_id = publisher["id"]

    days = _period_to_days(period)
    since = _iso_days_ago(days)

    # Pull analytics events for the period
    analytics_res = _safe_query(
        lambda: admin.table("publisher_analytics")
            .select("*")
            .eq("publisher_id", pub_id)
            .gte("event_at", since)
            .execute(),
        None,
    )
    rows = (analytics_res.data if analytics_res else []) or []

    # Plays over time — bucket by day
    by_day = defaultdict(lambda: {"plays": 0, "qr_scans": 0, "sales": 0})
    for r in rows:
        evt_at = r.get("event_at") or ""
        day = evt_at[:10] if len(evt_at) >= 10 else "unknown"
        et = r.get("event_type") or ""
        if et == "play_session":
            by_day[day]["plays"] += 1
        elif et == "qr_scan":
            by_day[day]["qr_scans"] += 1
        elif et == "unit_sold":
            by_day[day]["sales"] += int(r.get("quantity") or 1)

    plays_over_time = sorted(
        [{"date": d, **counts} for d, counts in by_day.items() if d != "unknown"],
        key=lambda x: x["date"],
    )

    # Top games — by play count
    by_game = defaultdict(lambda: {"plays": 0, "qr_scans": 0, "sales": 0})
    for r in rows:
        gid = r.get("game_id") or "unknown"
        et = r.get("event_type") or ""
        if et == "play_session":
            by_game[gid]["plays"] += 1
        elif et == "qr_scan":
            by_game[gid]["qr_scans"] += 1
        elif et == "unit_sold":
            by_game[gid]["sales"] += int(r.get("quantity") or 1)

    # Lookup game titles
    game_titles = {}
    games_res = _safe_query(
        lambda: admin.table("publisher_games").select("id, game_id, title").eq("publisher_id", pub_id).execute(),
        None,
    )
    for g in (games_res.data if games_res else []) or []:
        game_titles[g.get("game_id")] = g.get("title")
        game_titles[g.get("id")] = g.get("title")

    top_games = sorted(
        [
            {"game_id": gid, "title": game_titles.get(gid, gid), **counts}
            for gid, counts in by_game.items()
        ],
        key=lambda x: x["plays"],
        reverse=True,
    )[:10]

    # Top venues
    by_venue = defaultdict(lambda: {"plays": 0, "sales": 0})
    for r in rows:
        vid = r.get("venue_id") or "unknown"
        et = r.get("event_type") or ""
        if et == "play_session":
            by_venue[vid]["plays"] += 1
        elif et == "unit_sold":
            by_venue[vid]["sales"] += int(r.get("quantity") or 1)

    top_venues = sorted(
        [{"venue_id": vid, **counts} for vid, counts in by_venue.items() if vid != "unknown"],
        key=lambda x: x["plays"],
        reverse=True,
    )[:10]

    # Conversion rate: sales / plays
    total_plays = sum(c["plays"] for c in by_day.values())
    total_qr_scans = sum(c["qr_scans"] for c in by_day.values())
    total_sales = sum(c["sales"] for c in by_day.values())
    conversion_rate = round((total_sales / total_plays * 100), 2) if total_plays > 0 else 0.0

    # Sell-through rate
    inventory_res = _safe_query(
        lambda: admin.table("publisher_inventory").select("*").eq("publisher_id", pub_id).execute(),
        None,
    )
    inv_rows = (inventory_res.data if inventory_res else []) or []
    total_received = sum(int(r.get("units_received_total") or 0) for r in inv_rows)
    total_sold = sum(int(r.get("units_sold_total") or 0) for r in inv_rows)
    sell_through_rate = round((total_sold / total_received * 100), 2) if total_received > 0 else 0.0

    return {
        "period": period,
        "plays_over_time": plays_over_time,
        "top_games": top_games,
        "top_venues": top_venues,
        "totals": {
            "plays": total_plays,
            "qr_scans": total_qr_scans,
            "sales": total_sales,
        },
        "conversion_rate": conversion_rate,
        "sell_through_rate": sell_through_rate,
        "has_data": bool(rows or inv_rows),
    }


# ── Routes: Inventory ───────────────────────────────────────────

@router.get("/dashboard/inventory")
async def dashboard_inventory(request: Request):
    """Inventory tab — restock alerts, per-venue breakdown, donor units."""
    publisher = await get_current_publisher(request)
    admin = get_admin_client()
    pub_id = publisher["id"]

    inventory_res = _safe_query(
        lambda: admin.table("publisher_inventory")
            .select("*")
            .eq("publisher_id", pub_id)
            .execute(),
        None,
    )
    rows = (inventory_res.data if inventory_res else []) or []

    # Lookup game titles
    games_res = _safe_query(
        lambda: admin.table("publisher_games").select("id, game_id, title, demo_units, sale_units").eq("publisher_id", pub_id).execute(),
        None,
    )
    games = (games_res.data if games_res else []) or []
    game_lookup = {}
    for g in games:
        game_lookup[g.get("game_id")] = g
        game_lookup[g.get("id")] = g

    # Aggregate by game
    by_game = defaultdict(lambda: {
        "venues": [], "in_stock": 0, "sold": 0, "demo": 0,
    })
    for r in rows:
        gid = r.get("game_id") or "unknown"
        bucket = by_game[gid]
        bucket["in_stock"] += int(r.get("units_in_stock") or 0)
        bucket["sold"] += int(r.get("units_sold_total") or 0)
        bucket["demo"] += int(r.get("demo_units") or 0)
        bucket["venues"].append({
            "venue_id": r.get("venue_id"),
            "venue_name": r.get("venue_name") or r.get("venue_id"),
            "in_stock": int(r.get("units_in_stock") or 0),
            "sold": int(r.get("units_sold_total") or 0),
            "demo": int(r.get("demo_units") or 0),
            "last_restocked_at": r.get("last_restocked_at"),
        })

    # Restock alerts: any game/venue with stock < 2
    restock_alerts = []
    for r in rows:
        in_stock = int(r.get("units_in_stock") or 0)
        if in_stock < 2:
            gid = r.get("game_id") or "unknown"
            g = game_lookup.get(gid, {})
            restock_alerts.append({
                "game_id": gid,
                "title": g.get("title", gid),
                "venue_id": r.get("venue_id"),
                "venue_name": r.get("venue_name") or r.get("venue_id"),
                "in_stock": in_stock,
                "severity": "critical" if in_stock == 0 else "low",
            })

    # Donor unit log — units publisher contributed (demo / consignment)
    donor_log = []
    for g in games:
        if (g.get("demo_units") or 0) > 0 or (g.get("sale_units") or 0) > 0:
            donor_log.append({
                "game_id": g.get("game_id"),
                "title": g.get("title"),
                "demo_units": int(g.get("demo_units") or 0),
                "sale_units": int(g.get("sale_units") or 0),
                "total": int(g.get("demo_units") or 0) + int(g.get("sale_units") or 0),
            })

    # Build games-with-inventory list
    inventory_by_game = []
    for gid, agg in by_game.items():
        g = game_lookup.get(gid, {})
        inventory_by_game.append({
            "game_id": gid,
            "title": g.get("title", gid),
            "in_stock": agg["in_stock"],
            "sold": agg["sold"],
            "demo": agg["demo"],
            "venues": agg["venues"],
        })

    return {
        "inventory_by_game": inventory_by_game,
        "restock_alerts": restock_alerts,
        "donor_unit_log": donor_log,
        "totals": {
            "total_in_stock": sum(a["in_stock"] for a in by_game.values()),
            "total_sold": sum(a["sold"] for a in by_game.values()),
            "total_demo": sum(a["demo"] for a in by_game.values()),
            "venues_count": len(set(r.get("venue_id") for r in rows if r.get("venue_id"))),
        },
        "has_data": bool(rows),
    }


# ── Routes: Payments ────────────────────────────────────────────

@router.get("/dashboard/payments")
async def dashboard_payments(request: Request):
    """Payments tab — earnings summary, payment history, bank info."""
    publisher = await get_current_publisher(request)
    admin = get_admin_client()
    pub_id = publisher["id"]

    payments_res = _safe_query(
        lambda: admin.table("publisher_payments")
            .select("*")
            .eq("publisher_id", pub_id)
            .order("created_at", desc=True)
            .execute(),
        None,
    )
    payments = (payments_res.data if payments_res else []) or []

    # Earnings summary
    now = datetime.now(timezone.utc)
    ytd_start = datetime(now.year, 1, 1, tzinfo=timezone.utc).isoformat()
    last_30 = _iso_days_ago(30)

    paid_total_cents = sum(int(p.get("amount_cents") or 0) for p in payments if p.get("status") == "paid")
    pending_total_cents = sum(
        int(p.get("amount_cents") or 0) for p in payments
        if p.get("status") in ("pending", "scheduled")
    )
    ytd_paid_cents = sum(
        int(p.get("amount_cents") or 0) for p in payments
        if p.get("status") == "paid" and (p.get("paid_at") or "") >= ytd_start
    )
    last_30_paid_cents = sum(
        int(p.get("amount_cents") or 0) for p in payments
        if p.get("status") == "paid" and (p.get("paid_at") or "") >= last_30
    )

    # Next scheduled payment
    next_payment = None
    upcoming = sorted(
        [p for p in payments if p.get("status") in ("scheduled", "pending") and p.get("scheduled_at")],
        key=lambda p: p.get("scheduled_at") or "",
    )
    if upcoming:
        p = upcoming[0]
        next_payment = {
            "amount": _money(p.get("amount_cents")),
            "scheduled_at": p.get("scheduled_at"),
            "status": p.get("status"),
            "id": p.get("id"),
        }

    # Payment history (formatted for table)
    history = [
        {
            "id": p.get("id"),
            "amount": _money(p.get("amount_cents")),
            "status": p.get("status"),
            "method": p.get("method") or "ach",
            "scheduled_at": p.get("scheduled_at"),
            "paid_at": p.get("paid_at"),
            "period_start": p.get("period_start"),
            "period_end": p.get("period_end"),
            "invoice_number": p.get("invoice_number"),
            "notes": p.get("notes"),
        }
        for p in payments
    ]

    return {
        "summary": {
            "paid_total": _money(paid_total_cents),
            "pending_total": _money(pending_total_cents),
            "ytd_paid": _money(ytd_paid_cents),
            "last_30_days_paid": _money(last_30_paid_cents),
            "balance_owed": _money(pending_total_cents),
        },
        "next_payment": next_payment,
        "history": history,
        "bank_info": {
            "bank_name": publisher.get("bank_name") or "",
            "account_holder": publisher.get("account_holder") or "",
            "account_number_last4": publisher.get("account_number_last4") or "",
            "routing_number_last4": publisher.get("routing_number_last4") or "",
            "payment_method": publisher.get("payment_method") or "",
            "paypal_email": publisher.get("paypal_email") or "",
        },
        "has_data": bool(payments),
    }


@router.get("/dashboard/payments/{payment_id}/invoice")
async def get_invoice(payment_id: str, request: Request):
    """Get full invoice details for a single payment."""
    publisher = await get_current_publisher(request)
    admin = get_admin_client()
    pub_id = publisher["id"]

    res = _safe_query(
        lambda: admin.table("publisher_payments").select("*").eq("id", payment_id).execute(),
        None,
    )
    if not res or not res.data:
        raise HTTPException(404, "Payment not found")

    payment = res.data[0]
    if payment.get("publisher_id") != pub_id:
        raise HTTPException(403, "Not your payment")

    # Pull line items if a separate table exists
    items_res = _safe_query(
        lambda: admin.table("publisher_payment_items")
            .select("*")
            .eq("payment_id", payment_id)
            .execute(),
        None,
    )
    line_items = (items_res.data if items_res else []) or []

    return {
        "payment": {
            "id": payment.get("id"),
            "amount": _money(payment.get("amount_cents")),
            "status": payment.get("status"),
            "method": payment.get("method"),
            "scheduled_at": payment.get("scheduled_at"),
            "paid_at": payment.get("paid_at"),
            "period_start": payment.get("period_start"),
            "period_end": payment.get("period_end"),
            "invoice_number": payment.get("invoice_number"),
            "notes": payment.get("notes"),
        },
        "publisher": {
            "company_name": publisher.get("company_name"),
            "contact_name": publisher.get("contact_name"),
            "email": publisher.get("email"),
            "mailing_address": publisher.get("mailing_address"),
            "city": publisher.get("city"),
            "state": publisher.get("state"),
            "zip_code": publisher.get("zip_code"),
        },
        "line_items": [
            {
                "description": li.get("description"),
                "game_id": li.get("game_id"),
                "venue_id": li.get("venue_id"),
                "quantity": li.get("quantity"),
                "unit_amount": _money(li.get("unit_amount_cents")),
                "subtotal": _money(li.get("subtotal_cents")),
            }
            for li in line_items
        ],
    }


# ── Routes: Bank Info ───────────────────────────────────────────

@router.patch("/me/bank-info")
async def update_bank_info(body: BankInfoRequest, request: Request):
    """Update the publisher's payout / bank info."""
    publisher = await get_current_publisher(request)
    admin = get_admin_client()

    updates = {}
    for field in (
        "bank_name", "account_holder", "account_number_last4",
        "routing_number_last4", "payment_method", "paypal_email", "notes",
    ):
        val = getattr(body, field, None)
        if val is not None:
            updates[field] = val

    if not updates:
        return {"ok": True, "updated": {}}

    try:
        result = admin.table("publishers").update(updates).eq("id", publisher["id"]).execute()
    except Exception as e:
        # Some columns may not exist yet — fall back to writing into a JSON column or no-op
        raise HTTPException(500, f"Failed to update bank info: {e}")

    return {"ok": True, "updated": updates, "publisher": result.data[0] if result.data else None}
