"""LGS Dashboard endpoints — venues, inventory, pricing, alerts, transactions."""

import sqlite3
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import get_current_lgs_admin
from app.core.config import DB_PATH

router = APIRouter(prefix="/api/v1/lgs", tags=["lgs-dashboard"])


def _get_venues_conn():
    """Turso-backed connection for the venues table."""
    from app.services.turso import get_venues_db
    return get_venues_db()


def _get_conn() -> sqlite3.Connection:
    """Local SQLite for non-venue tables."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _generate_id() -> str:
    try:
        import ulid
        return str(ulid.new())
    except ImportError:
        return str(uuid.uuid4())


def _check_lgs_access(user: dict, lgs_id: str):
    """Ensure user can access this LGS. super_admin can access any."""
    if user.get("role") == "super_admin":
        return
    if user.get("lgs_id") != lgs_id:
        raise HTTPException(status_code=403, detail="Not authorized for this LGS")


def _check_venue_belongs_to_lgs(conn_unused, venue_id: str, lgs_id: str):
    """Verify venue is paired with this LGS. Reads from Turso."""
    vconn = _get_venues_conn()
    venue = vconn.execute(
        "SELECT lgs_id FROM venues WHERE venue_id = ?", (venue_id,)
    ).fetchone()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    if venue["lgs_id"] != lgs_id:
        raise HTTPException(status_code=403, detail="Venue not paired with this LGS")


# ── Request models ──────────────────────────────────────────────

class InventoryUpdateRequest(BaseModel):
    venue_id: str
    game_id: str
    stock_count: int


class ThresholdUpdateRequest(BaseModel):
    venue_id: str
    game_id: str
    restock_threshold: int


class PricingUpdateRequest(BaseModel):
    game_id: str
    retail_price_cents: int
    is_available: bool = True


# ── Dashboard overview ──────────────────────────────────────────

@router.get("/{lgs_id}/dashboard")
async def lgs_dashboard(lgs_id: str, user: dict = Depends(get_current_lgs_admin)):
    """Combined overview for the LGS landing page."""
    _check_lgs_access(user, lgs_id)

    conn = _get_conn()
    try:
        # Current month period
        now = datetime.now(timezone.utc)
        period = now.strftime("%Y-%m")
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

        # Revenue from transfer log this month
        sub_revenue = conn.execute(
            "SELECT COALESCE(SUM(amount_cents), 0) as total FROM lgs_transfer_log "
            "WHERE lgs_id = ? AND transfer_type = 'subscription_split' AND created_at >= ?",
            (lgs_id, month_start),
        ).fetchone()["total"]

        game_revenue = conn.execute(
            "SELECT COALESCE(SUM(amount_cents), 0) as total FROM lgs_transfer_log "
            "WHERE lgs_id = ? AND transfer_type = 'game_sale_payout' AND created_at >= ?",
            (lgs_id, month_start),
        ).fetchone()["total"]

        # Paired venues (from Turso)
        vconn = _get_venues_conn()
        venues = vconn.execute(
            "SELECT venue_id, venue_name, subscription_tier, game_seat_limit, subscription_status "
            "FROM venues WHERE lgs_id = ?",
            (lgs_id,),
        ).fetchall()

        venue_list = []
        total_restock = 0
        for v in venues:
            active = conn.execute(
                "SELECT COUNT(*) as cnt FROM venue_games WHERE venue_id = ? AND is_active = 1",
                (v["venue_id"],),
            ).fetchone()["cnt"]

            low_stock = conn.execute(
                "SELECT COUNT(*) as cnt FROM venue_game_inventory "
                "WHERE venue_id = ? AND lgs_id = ? AND stock_count <= restock_threshold",
                (v["venue_id"], lgs_id),
            ).fetchone()["cnt"]
            total_restock += low_stock

            venue_list.append({
                "venue_id": v["venue_id"],
                "venue_name": v["venue_name"],
                "tier": v["subscription_tier"] or "starter",
                "seat_limit": v["game_seat_limit"] if v["game_seat_limit"] is not None else 10,
                "active_games": active,
                "subscription_status": v["subscription_status"] or "trialing",
                "low_stock_count": low_stock,
            })

        # New game activations (last 7 days, no inventory row yet)
        seven_days_ago = (now - timedelta(days=7)).isoformat()
        venue_ids = [v["venue_id"] for v in venues]
        new_activations = 0
        if venue_ids:
            placeholders = ",".join("?" * len(venue_ids))
            new_activations = conn.execute(
                f"""SELECT COUNT(*) as cnt FROM venue_games vg
                    WHERE vg.venue_id IN ({placeholders})
                    AND vg.is_active = 1 AND vg.activated_at >= ?
                    AND NOT EXISTS (
                        SELECT 1 FROM venue_game_inventory vi
                        WHERE vi.venue_id = vg.venue_id AND vi.game_id = vg.game_id AND vi.lgs_id = ?
                    )""",
                (*venue_ids, seven_days_ago, lgs_id),
            ).fetchone()["cnt"]

        # Pending fulfillments
        pending = conn.execute(
            "SELECT COUNT(*) as cnt FROM game_purchases WHERE lgs_id = ? AND fulfillment_status = 'pending'",
            (lgs_id,),
        ).fetchone()["cnt"]

        return {
            "revenue": {
                "subscription_revenue_cents": sub_revenue,
                "subscription_lgs_cut_cents": sub_revenue,
                "game_sale_revenue_cents": game_revenue,
                "game_sale_lgs_cut_cents": game_revenue,
                "combined_lgs_total_cents": sub_revenue + game_revenue,
                "period": period,
            },
            "venues": venue_list,
            "alerts": {
                "restock_needed": total_restock,
                "new_game_activations": new_activations,
                "pending_fulfillments": pending,
            },
        }
    finally:
        conn.close()


# ── Venue inventory ─────────────────────────────────────────────

@router.get("/{lgs_id}/venues/{venue_id}/inventory")
async def get_venue_inventory(lgs_id: str, venue_id: str,
                              user: dict = Depends(get_current_lgs_admin)):
    """Detailed inventory for one venue."""
    _check_lgs_access(user, lgs_id)

    conn = _get_conn()
    try:
        _check_venue_belongs_to_lgs(None, venue_id, lgs_id)

        vconn2 = _get_venues_conn()
        venue = vconn2.execute(
            "SELECT venue_name FROM venues WHERE venue_id = ?", (venue_id,)
        ).fetchone()

        # Get all games that are either active at venue OR have inventory
        rows = conn.execute(
            """SELECT
                COALESCE(vg.game_id, vi.game_id) as game_id,
                COALESCE(g.title, COALESCE(vg.game_id, vi.game_id)) as title,
                COALESCE(vi.stock_count, 0) as stock_count,
                COALESCE(vi.restock_threshold, 1) as restock_threshold,
                COALESCE(vi.total_sold, 0) as total_sold,
                lp.retail_price_cents,
                COALESCE(lp.is_available, 1) as is_available,
                CASE WHEN vg.is_active = 1 THEN 1 ELSE 0 END as is_active_at_venue
            FROM venue_games vg
            LEFT JOIN venue_game_inventory vi
                ON vi.venue_id = vg.venue_id AND vi.game_id = vg.game_id AND vi.lgs_id = ?
            LEFT JOIN lgs_game_pricing lp
                ON lp.lgs_id = ? AND lp.game_id = COALESCE(vg.game_id, vi.game_id)
            LEFT JOIN games g
                ON g.game_id = COALESCE(vg.game_id, vi.game_id)
            WHERE vg.venue_id = ? AND vg.is_active = 1

            UNION

            SELECT
                vi.game_id,
                COALESCE(g.title, vi.game_id) as title,
                vi.stock_count,
                vi.restock_threshold,
                vi.total_sold,
                lp.retail_price_cents,
                COALESCE(lp.is_available, 1) as is_available,
                CASE WHEN vg2.is_active = 1 THEN 1 ELSE 0 END as is_active_at_venue
            FROM venue_game_inventory vi
            LEFT JOIN lgs_game_pricing lp
                ON lp.lgs_id = vi.lgs_id AND lp.game_id = vi.game_id
            LEFT JOIN games g ON g.game_id = vi.game_id
            LEFT JOIN venue_games vg2
                ON vg2.venue_id = vi.venue_id AND vg2.game_id = vi.game_id
            WHERE vi.venue_id = ? AND vi.lgs_id = ?
                AND vi.game_id NOT IN (
                    SELECT game_id FROM venue_games WHERE venue_id = ? AND is_active = 1
                )

            ORDER BY title""",
            (lgs_id, lgs_id, venue_id, venue_id, lgs_id, venue_id),
        ).fetchall()

        inventory = []
        for r in rows:
            stock = r["stock_count"]
            threshold = r["restock_threshold"]
            inventory.append({
                "game_id": r["game_id"],
                "title": r["title"],
                "stock_count": stock,
                "restock_threshold": threshold,
                "retail_price_cents": r["retail_price_cents"],
                "is_available": bool(r["is_available"]),
                "total_sold": r["total_sold"],
                "needs_restock": stock <= threshold,
                "is_active_at_venue": bool(r["is_active_at_venue"]),
            })

        return {
            "venue_name": venue["venue_name"] if venue else venue_id,
            "inventory": inventory,
        }
    finally:
        conn.close()


@router.post("/{lgs_id}/inventory/update")
async def update_inventory(lgs_id: str, req: InventoryUpdateRequest,
                           user: dict = Depends(get_current_lgs_admin)):
    """Set stock count for a game at a venue."""
    _check_lgs_access(user, lgs_id)

    conn = _get_conn()
    try:
        _check_venue_belongs_to_lgs(None, req.venue_id, lgs_id)

        now = datetime.now(timezone.utc).isoformat()
        existing = conn.execute(
            "SELECT id FROM venue_game_inventory WHERE venue_id = ? AND game_id = ? AND lgs_id = ?",
            (req.venue_id, req.game_id, lgs_id),
        ).fetchone()

        if existing:
            conn.execute(
                "UPDATE venue_game_inventory SET stock_count = ?, updated_at = ? "
                "WHERE venue_id = ? AND game_id = ? AND lgs_id = ?",
                (req.stock_count, now, req.venue_id, req.game_id, lgs_id),
            )
        else:
            conn.execute(
                """INSERT INTO venue_game_inventory
                   (id, venue_id, lgs_id, game_id, stock_count, restock_threshold, total_sold, updated_at)
                   VALUES (?, ?, ?, ?, ?, 1, 0, ?)""",
                (_generate_id(), req.venue_id, lgs_id, req.game_id, req.stock_count, now),
            )
        conn.commit()

        return {
            "venue_id": req.venue_id,
            "game_id": req.game_id,
            "stock_count": req.stock_count,
            "updated_at": now,
        }
    finally:
        conn.close()


@router.post("/{lgs_id}/inventory/set-threshold")
async def set_threshold(lgs_id: str, req: ThresholdUpdateRequest,
                        user: dict = Depends(get_current_lgs_admin)):
    """Set restock alert threshold for a game at a venue."""
    _check_lgs_access(user, lgs_id)

    conn = _get_conn()
    try:
        _check_venue_belongs_to_lgs(None, req.venue_id, lgs_id)

        now = datetime.now(timezone.utc).isoformat()
        existing = conn.execute(
            "SELECT id FROM venue_game_inventory WHERE venue_id = ? AND game_id = ? AND lgs_id = ?",
            (req.venue_id, req.game_id, lgs_id),
        ).fetchone()

        if existing:
            conn.execute(
                "UPDATE venue_game_inventory SET restock_threshold = ?, updated_at = ? "
                "WHERE venue_id = ? AND game_id = ? AND lgs_id = ?",
                (req.restock_threshold, now, req.venue_id, req.game_id, lgs_id),
            )
        else:
            conn.execute(
                """INSERT INTO venue_game_inventory
                   (id, venue_id, lgs_id, game_id, stock_count, restock_threshold, total_sold, updated_at)
                   VALUES (?, ?, ?, ?, 0, ?, 0, ?)""",
                (_generate_id(), req.venue_id, lgs_id, req.game_id, req.restock_threshold, now),
            )
        conn.commit()

        return {
            "venue_id": req.venue_id,
            "game_id": req.game_id,
            "restock_threshold": req.restock_threshold,
            "updated_at": now,
        }
    finally:
        conn.close()


# ── Pricing ─────────────────────────────────────────────────────

@router.get("/{lgs_id}/pricing")
async def get_pricing(lgs_id: str, user: dict = Depends(get_current_lgs_admin)):
    """All games the LGS has priced."""
    _check_lgs_access(user, lgs_id)

    conn = _get_conn()
    try:
        rows = conn.execute(
            """SELECT lp.game_id, COALESCE(g.title, lp.game_id) as title,
                      COALESCE(g.complexity, '') as complexity,
                      lp.retail_price_cents, lp.is_available, lp.updated_at
               FROM lgs_game_pricing lp
               LEFT JOIN games g ON g.game_id = lp.game_id
               WHERE lp.lgs_id = ?
               ORDER BY COALESCE(g.title, lp.game_id)""",
            (lgs_id,),
        ).fetchall()

        return {
            "pricing": [
                {
                    "game_id": r["game_id"],
                    "title": r["title"],
                    "complexity": r["complexity"],
                    "retail_price_cents": r["retail_price_cents"],
                    "is_available": bool(r["is_available"]),
                    "updated_at": r["updated_at"],
                }
                for r in rows
            ]
        }
    finally:
        conn.close()


@router.post("/{lgs_id}/pricing/update")
async def update_pricing(lgs_id: str, req: PricingUpdateRequest,
                         user: dict = Depends(get_current_lgs_admin)):
    """Set retail price for a game (applies across all venues)."""
    _check_lgs_access(user, lgs_id)

    conn = _get_conn()
    try:
        now = datetime.now(timezone.utc).isoformat()
        existing = conn.execute(
            "SELECT id FROM lgs_game_pricing WHERE lgs_id = ? AND game_id = ?",
            (lgs_id, req.game_id),
        ).fetchone()

        if existing:
            conn.execute(
                "UPDATE lgs_game_pricing SET retail_price_cents = ?, is_available = ?, updated_at = ? "
                "WHERE lgs_id = ? AND game_id = ?",
                (req.retail_price_cents, 1 if req.is_available else 0, now, lgs_id, req.game_id),
            )
        else:
            conn.execute(
                """INSERT INTO lgs_game_pricing (id, lgs_id, game_id, retail_price_cents, is_available, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (_generate_id(), lgs_id, req.game_id, req.retail_price_cents,
                 1 if req.is_available else 0, now),
            )
        conn.commit()

        return {
            "game_id": req.game_id,
            "retail_price_cents": req.retail_price_cents,
            "is_available": req.is_available,
            "updated_at": now,
        }
    finally:
        conn.close()


# ── Alerts ──────────────────────────────────────────────────────

@router.get("/{lgs_id}/alerts")
async def get_alerts(lgs_id: str, user: dict = Depends(get_current_lgs_admin)):
    """All active alerts across all paired venues."""
    _check_lgs_access(user, lgs_id)

    conn = _get_conn()
    try:
        alerts = []

        # Venues paired with this LGS (Turso)
        venues = _get_venues_conn().execute(
            "SELECT venue_id, venue_name FROM venues WHERE lgs_id = ?", (lgs_id,)
        ).fetchall()
        venue_map = {v["venue_id"]: v["venue_name"] for v in venues}
        venue_ids = list(venue_map.keys())

        if not venue_ids:
            return {"alerts": []}

        placeholders = ",".join("?" * len(venue_ids))

        # 1. Restock needed
        restock_rows = conn.execute(
            f"""SELECT vi.venue_id, vi.game_id, vi.stock_count, vi.restock_threshold,
                       COALESCE(g.title, vi.game_id) as title, vi.updated_at
                FROM venue_game_inventory vi
                LEFT JOIN games g ON g.game_id = vi.game_id
                WHERE vi.lgs_id = ? AND vi.venue_id IN ({placeholders})
                AND vi.stock_count <= vi.restock_threshold
                ORDER BY vi.stock_count ASC""",
            (lgs_id, *venue_ids),
        ).fetchall()

        for r in restock_rows:
            alerts.append({
                "type": "restock_needed",
                "venue_id": r["venue_id"],
                "venue_name": venue_map.get(r["venue_id"], r["venue_id"]),
                "game_id": r["game_id"],
                "title": r["title"],
                "stock_count": r["stock_count"],
                "restock_threshold": r["restock_threshold"],
                "created_at": r["updated_at"],
            })

        # 2. New activations (last 7 days, no inventory)
        seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        activation_rows = conn.execute(
            f"""SELECT vg.venue_id, vg.game_id, vg.activated_at,
                       COALESCE(g.title, vg.game_id) as title
                FROM venue_games vg
                LEFT JOIN games g ON g.game_id = vg.game_id
                WHERE vg.venue_id IN ({placeholders})
                AND vg.is_active = 1 AND vg.activated_at >= ?
                AND NOT EXISTS (
                    SELECT 1 FROM venue_game_inventory vi
                    WHERE vi.venue_id = vg.venue_id AND vi.game_id = vg.game_id AND vi.lgs_id = ?
                )
                ORDER BY vg.activated_at DESC""",
            (*venue_ids, seven_days_ago, lgs_id),
        ).fetchall()

        for r in activation_rows:
            alerts.append({
                "type": "new_activation",
                "venue_id": r["venue_id"],
                "venue_name": venue_map.get(r["venue_id"], r["venue_id"]),
                "game_id": r["game_id"],
                "title": r["title"],
                "activated_at": r["activated_at"],
                "has_inventory": False,
            })

        # 3. Pending fulfillments
        pending_rows = conn.execute(
            """SELECT gp.id, gp.venue_id, gp.game_id, gp.game_title,
                      gp.customer_name, gp.created_at
               FROM game_purchases gp
               WHERE gp.lgs_id = ? AND gp.fulfillment_status = 'pending'
               ORDER BY gp.created_at ASC""",
            (lgs_id,),
        ).fetchall()

        for r in pending_rows:
            alerts.append({
                "type": "pending_fulfillment",
                "venue_id": r["venue_id"],
                "venue_name": venue_map.get(r["venue_id"], r["venue_id"]),
                "game_id": r["game_id"],
                "title": r["game_title"],
                "purchase_id": r["id"],
                "customer_name": r["customer_name"],
                "purchased_at": r["created_at"],
            })

        return {"alerts": alerts}
    finally:
        conn.close()


# ── Transactions ────────────────────────────────────────────────

@router.get("/{lgs_id}/transactions")
async def get_transactions(
    lgs_id: str,
    period: Optional[str] = Query(None, description="YYYY-MM, defaults to current month"),
    type: Optional[str] = Query("all", description="subscription_split | game_sale_payout | all"),
    user: dict = Depends(get_current_lgs_admin),
):
    """Transfer history from lgs_transfer_log."""
    _check_lgs_access(user, lgs_id)

    conn = _get_conn()
    try:
        # Default to current month
        if not period:
            period = datetime.now(timezone.utc).strftime("%Y-%m")

        # Build date range
        year, month = period.split("-")
        month_start = f"{year}-{month}-01T00:00:00"
        # Next month start
        m = int(month)
        y = int(year)
        if m == 12:
            next_start = f"{y + 1}-01-01T00:00:00"
        else:
            next_start = f"{y}-{m + 1:02d}-01T00:00:00"

        # Query
        params = [lgs_id, month_start, next_start]
        type_filter = ""
        if type and type != "all":
            type_filter = "AND transfer_type = ?"
            params.append(type)

        rows = conn.execute(
            f"""SELECT id, transfer_type, source_id, amount_cents, stripe_transfer_id,
                       stripe_invoice_id, status, created_at
                FROM lgs_transfer_log
                WHERE lgs_id = ? AND created_at >= ? AND created_at < ? {type_filter}
                ORDER BY created_at DESC""",
            params,
        ).fetchall()

        # Build descriptions
        transfers = []
        for r in rows:
            desc = r["source_id"]
            if r["transfer_type"] == "subscription_split":
                venue = _get_venues_conn().execute(
                    "SELECT venue_name FROM venues WHERE venue_id = ?",
                    (r["source_id"],),
                ).fetchone()
                if venue:
                    desc = f"{venue['venue_name']} subscription — {period}"
            elif r["transfer_type"] == "game_sale_payout":
                purchase = conn.execute(
                    "SELECT game_title, venue_id FROM game_purchases WHERE id = ?",
                    (r["source_id"],),
                ).fetchone()
                if purchase:
                    venue = _get_venues_conn().execute(
                        "SELECT venue_name FROM venues WHERE venue_id = ?",
                        (purchase["venue_id"],),
                    ).fetchone()
                    venue_name = venue["venue_name"] if venue else purchase["venue_id"]
                    desc = f"{purchase['game_title']} sale at {venue_name}"

            transfers.append({
                "id": r["id"],
                "type": r["transfer_type"],
                "amount_cents": r["amount_cents"],
                "source_description": desc,
                "status": r["status"],
                "created_at": r["created_at"],
            })

        total = sum(t["amount_cents"] for t in transfers)

        return {
            "transfers": transfers,
            "totals": {
                "total_cents": total,
                "count": len(transfers),
            },
        }
    finally:
        conn.close()
