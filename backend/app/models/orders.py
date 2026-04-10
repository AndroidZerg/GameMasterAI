"""Orders model — Supabase persistence for venue orders and print queue.

Wave 3 (2026-04-10): migrated off /tmp/games.db to Supabase Postgres so
order history, print queue, per-venue order counters, and print agent
heartbeats all persist across Render deploys.

Schema notes (the Supabase tables differ from legacy SQLite):
  - gmg_orders: no session_id, no total (dollars) — total is stored as
    subtotal_cents (int). Legacy session_id is appended to the notes
    column as "session:<id>".
  - print_queue: order_data -> content (text JSON blob, includes
    order_number), print_status -> status. No print_attempts/last_error.
  - venue_order_counters: PK on venue_id; increment is read-then-write
    (not strictly atomic, but fine at single-venue volumes).
  - print_agent_heartbeats: PK on venue_id.

The public function signatures and return shapes mirror the legacy
SQLite model so route code and frontend contracts stay stable.
"""

import json
from datetime import datetime, timezone

from app.services.supabase_client import get_admin_client


# ── Helpers ────────────────────────────────────────────────────────


def _dollars_to_cents(total: float) -> int:
    try:
        return int(round(float(total) * 100))
    except Exception:
        return 0


def _cents_to_dollars(cents) -> float:
    try:
        return round((int(cents) or 0) / 100.0, 2)
    except Exception:
        return 0.0


def _session_id_from_notes(notes: str | None) -> str:
    if not notes:
        return ""
    for part in notes.split("\n"):
        part = part.strip()
        if part.startswith("session:"):
            return part[len("session:"):].strip()
    return ""


# ── Orders ─────────────────────────────────────────────────────────


def init_orders_table():
    """No-op — gmg_orders table lives in Supabase."""
    return None


def create_order(venue_id: str, session_id: str, items: list, total: float, customer_name: str = None) -> int:
    """Insert a new order, return its ID."""
    admin = get_admin_client()
    notes = f"session:{session_id}" if session_id else ""
    result = admin.table("gmg_orders").insert({
        "venue_id": venue_id or "default",
        "items": items or [],  # jsonb
        "subtotal_cents": _dollars_to_cents(total),
        "status": "pending",
        "notes": notes,
        "customer_name": customer_name or "",
    }).execute()
    return result.data[0]["id"] if result.data else 0


def get_orders(venue_id: str = None, limit: int = 50):
    """Get orders, optionally filtered by venue. Shape matches legacy model."""
    admin = get_admin_client()
    query = admin.table("gmg_orders").select("*")
    if venue_id:
        query = query.eq("venue_id", venue_id)
    result = query.order("created_at", desc=True).limit(limit).execute()
    rows = result.data or []
    out = []
    for r in rows:
        out.append({
            "id": r.get("id"),
            "venue_id": r.get("venue_id"),
            "session_id": _session_id_from_notes(r.get("notes")),
            "items": r.get("items") or [],
            "total": _cents_to_dollars(r.get("subtotal_cents")),
            "status": r.get("status"),
            "customer_name": r.get("customer_name") or "",
            "submitted_at": r.get("created_at"),
            "completed_at": r.get("updated_at") if r.get("status") in ("completed", "cancelled") else None,
        })
    return out


def update_order_status(order_id: int, status: str):
    """Update order status (pending, preparing, completed, cancelled)."""
    admin = get_admin_client()
    update = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    admin.table("gmg_orders").update(update).eq("id", order_id).execute()


# ── Venue Order Counters ───────────────────────────────────────────


def init_print_queue_tables():
    """No-op — print_queue/venue_order_counters/print_agent_heartbeats live in Supabase."""
    return None


def next_order_number(venue_id: str) -> int:
    """Read-increment-write the per-venue order counter.

    Not strictly atomic (no Postgres RPC yet), but sufficient for
    single-venue throughput. If we ever see races, promote this to a
    SQL function via apply_migration.
    """
    admin = get_admin_client()
    existing = (
        admin.table("venue_order_counters")
        .select("last_order_number")
        .eq("venue_id", venue_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        current = existing.data[0].get("last_order_number") or 0
        next_num = int(current) + 1
        admin.table("venue_order_counters").update(
            {"last_order_number": next_num}
        ).eq("venue_id", venue_id).execute()
        return next_num
    # First order for this venue
    admin.table("venue_order_counters").insert({
        "venue_id": venue_id,
        "last_order_number": 1,
    }).execute()
    return 1


# ── Print Queue ────────────────────────────────────────────────────


def insert_print_queue(order_id: int, venue_id: str, order_data: str, order_number: int):
    """Insert a new print queue record.

    `order_data` is a JSON string from the route layer. We merge
    `order_number` into the blob so we can surface it later (Supabase
    schema has no dedicated order_number column).
    """
    admin = get_admin_client()
    try:
        parsed = json.loads(order_data) if order_data else {}
    except Exception:
        parsed = {}
    parsed["order_number"] = order_number
    content = json.dumps(parsed)
    admin.table("print_queue").insert({
        "order_id": order_id,
        "venue_id": venue_id,
        "content": content,
        "print_type": "receipt",
        "status": "pending",
    }).execute()


def _translate_print_row(row: dict) -> dict:
    """Shape a Supabase print_queue row into the legacy dict format."""
    content_raw = row.get("content")
    try:
        order_data = json.loads(content_raw) if content_raw else {}
    except Exception:
        order_data = {}
    return {
        "id": row.get("id"),
        "order_id": row.get("order_id"),
        "venue_id": row.get("venue_id"),
        "order_data": order_data,
        "order_number": order_data.get("order_number"),
        "print_status": row.get("status"),
        "created_at": row.get("created_at"),
        "printed_at": row.get("printed_at"),
        "print_attempts": 0,
        "last_error": None,
    }


def get_pending_prints(venue_id: str):
    """Get pending print queue items for a venue."""
    admin = get_admin_client()
    result = (
        admin.table("print_queue")
        .select("*")
        .eq("venue_id", venue_id)
        .eq("status", "pending")
        .order("created_at", desc=False)
        .execute()
    )
    return [_translate_print_row(r) for r in (result.data or [])]


def update_print_status(order_id: int, status: str, error: str = None):
    """Update print status for an order."""
    admin = get_admin_client()
    if status == "printed":
        admin.table("print_queue").update({
            "status": "printed",
            "printed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("order_id", order_id).execute()
    elif status == "failed":
        admin.table("print_queue").update({"status": "failed"}).eq("order_id", order_id).execute()


def reset_print_status(order_id: int):
    """Reset print status to pending for reprint."""
    admin = get_admin_client()
    admin.table("print_queue").update({
        "status": "pending",
        "printed_at": None,
    }).eq("order_id", order_id).execute()


def get_print_history(venue_id: str, limit: int = 50):
    """Get recent print history for a venue."""
    admin = get_admin_client()
    result = (
        admin.table("print_queue")
        .select("*")
        .eq("venue_id", venue_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return [_translate_print_row(r) for r in (result.data or [])]


# ── Print Agent Heartbeats ─────────────────────────────────────────


def upsert_heartbeat(venue_id: str, printer_ip: str, printer_status: str, uptime: int):
    """Insert or update print agent heartbeat. PK is venue_id so upsert is straightforward."""
    admin = get_admin_client()
    now = datetime.now(timezone.utc).isoformat()
    admin.table("print_agent_heartbeats").upsert({
        "venue_id": venue_id,
        "printer_ip": printer_ip,
        "printer_status": printer_status,
        "agent_uptime_seconds": uptime,
        "last_seen": now,
    }).execute()


def get_heartbeat(venue_id: str):
    """Get latest heartbeat for a venue."""
    admin = get_admin_client()
    result = (
        admin.table("print_agent_heartbeats")
        .select("*")
        .eq("venue_id", venue_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]
