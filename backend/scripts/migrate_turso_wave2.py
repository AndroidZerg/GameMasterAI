"""Wave 2 Turso → Supabase data migration — Thai House POS / SWP rentals / cover art.

Migrates the remaining Turso tables (after Wave 1 which handled venues, signups,
analytics, and home config) into Supabase Postgres. All target tables already
exist in Supabase with matching schemas.

Idempotent: uses UPSERT with preserved IDs.

Required env vars:
    TURSO_DATABASE_URL     (libsql://...)
    TURSO_AUTH_TOKEN
    SUPABASE_SERVICE_KEY
    SUPABASE_URL           (optional; default project URL hardcoded)

Tables migrated (in FK order):
    menu_categories, menu_toggles, floor_tables, floor_zones, loyalty_members,
    loyalty_rewards, loyalty_transactions, order_counters, game_image_overrides,
    drink_subscribers, rental_subscribers_swp, rental_inventory_swp,
    menu_items, drink_redemptions, rental_reservations_swp,
    menu_item_images, venue_orders → thai_house_orders

Skipped (stale / already superseded by Wave 1 admin_config):
    venue_gotd, venue_staff_picks
"""
from __future__ import annotations

import json
import logging
import os
import sys
from base64 import b64decode
from typing import Any, Iterable

import httpx
from supabase import Client, create_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
log = logging.getLogger("turso2sb-w2")

# ── Connections ──────────────────────────────────────────────────

SUPABASE_URL = os.environ.get(
    "SUPABASE_URL", "https://uvfidazctqeazywlebkh.supabase.co"
)
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
TURSO_URL = os.environ["TURSO_DATABASE_URL"].replace("libsql://", "https://")
TURSO_TOKEN = os.environ["TURSO_AUTH_TOKEN"]
TURSO_ENDPOINT = f"{TURSO_URL}/v2/pipeline"

sb: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# ── Turso HTTP client ────────────────────────────────────────────

def _decode_cell(cell: Any) -> Any:
    if not isinstance(cell, dict):
        return cell
    t = cell.get("type")
    if t == "null":
        return None
    if t == "integer":
        v = cell.get("value")
        try:
            return int(v) if v is not None else None
        except (TypeError, ValueError):
            return v
    if t == "float":
        v = cell.get("value")
        try:
            return float(v) if v is not None else None
        except (TypeError, ValueError):
            return v
    if t == "blob":
        b64 = cell.get("base64")
        if not b64:
            return b""
        # Turso Hrana strips trailing '=' padding — re-add before decode.
        pad = (-len(b64)) % 4
        return b64decode(b64 + ("=" * pad))
    # text or other
    return cell.get("value")


def turso_rows(sql: str) -> list[dict]:
    body = {
        "requests": [
            {"type": "execute", "stmt": {"sql": sql}},
            {"type": "close"},
        ]
    }
    r = httpx.post(
        TURSO_ENDPOINT,
        headers={"Authorization": f"Bearer {TURSO_TOKEN}"},
        json=body,
        timeout=120,
    )
    r.raise_for_status()
    result = r.json()["results"][0]["response"]["result"]
    cols = [c.get("name") for c in result.get("cols", [])]
    out: list[dict] = []
    for row in result.get("rows", []):
        out.append({cols[i]: _decode_cell(cell) for i, cell in enumerate(row)})
    return out


# ── Helpers ──────────────────────────────────────────────────────

def _safe_json(value: Any, default: Any) -> Any:
    if value is None or value == "":
        return default
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return default


def _batched(iterable: Iterable, size: int):
    batch: list = []
    for item in iterable:
        batch.append(item)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


def _upsert(table: str, rows: list[dict], on_conflict: str | None = None, batch: int = 500):
    total = 0
    for chunk in _batched(rows, batch):
        if on_conflict:
            sb.table(table).upsert(chunk, on_conflict=on_conflict).execute()
        else:
            sb.table(table).upsert(chunk).execute()
        total += len(chunk)
        log.info("  ... upserted %d/%d into %s", total, len(rows), table)
    return total


def _exec_sql(query: str) -> Any:
    return sb.rpc("exec_sql", {"query": query}).execute()


def _reset_seq(table: str, pk: str = "id"):
    """Bump sequence to max(id)+1 so future inserts don't collide."""
    try:
        _exec_sql(
            f"SELECT setval(pg_get_serial_sequence('public.{table}', '{pk}'), "
            f"COALESCE((SELECT MAX({pk}) FROM public.{table}), 0) + 1, false)"
        )
        log.info("  ... reset sequence for %s.%s", table, pk)
    except Exception as e:
        log.warning("  ... could not reset sequence for %s: %s", table, e)


# ── Migrators ────────────────────────────────────────────────────

def migrate_menu_categories() -> int:
    rows = turso_rows("SELECT * FROM menu_categories ORDER BY id")
    log.info("menu_categories: %d rows", len(rows))
    payload = [
        {
            "id": r["id"],
            "name": r["name"],
            "icon": r.get("icon") or "",
            "sort_order": r.get("sort_order") or 0,
        }
        for r in rows
    ]
    if payload:
        _upsert("menu_categories", payload, on_conflict="id")
        _reset_seq("menu_categories")
    return len(payload)


def migrate_menu_toggles() -> int:
    rows = turso_rows("SELECT * FROM menu_toggles")
    log.info("menu_toggles: %d rows", len(rows))
    payload = [
        {
            "id": r["id"],
            "name": r["name"],
            "required": r.get("required") or 0,
            "options": _safe_json(r.get("options"), default=[]),
            "sort_order": r.get("sort_order") or 0,
            "multi_select": r.get("multi_select") or 0,
        }
        for r in rows
    ]
    if payload:
        _upsert("menu_toggles", payload, on_conflict="id")
    return len(payload)


def migrate_menu_items() -> int:
    rows = turso_rows("SELECT * FROM menu_items ORDER BY id")
    log.info("menu_items: %d rows", len(rows))
    payload = [
        {
            "id": r["id"],
            "slug": r["slug"],
            "category_id": r["category_id"],
            "name": r["name"],
            "description": r.get("description") or "",
            "price": r["price"],
            "image": r.get("image"),
            "toggles": _safe_json(r.get("toggles"), default=[]),
            "allows_modifications": r.get("allows_modifications") or 0,
            "active": r.get("active") or 0,
            "sort_order": r.get("sort_order") or 0,
            "created_at": r.get("created_at"),
            "updated_at": r.get("updated_at"),
        }
        for r in rows
    ]
    if payload:
        _upsert("menu_items", payload, on_conflict="id")
        _reset_seq("menu_items")
    return len(payload)


def migrate_menu_item_images() -> int:
    """Migrate BLOB images via raw SQL (exec_sql RPC) to avoid base64/bytea
    round-trip issues through PostgREST."""
    rows = turso_rows("SELECT * FROM menu_item_images ORDER BY id")
    log.info("menu_item_images: %d rows", len(rows))
    if not rows:
        return 0

    def _bytea_literal(b: bytes | None) -> str:
        if b is None or (isinstance(b, (bytes, bytearray)) and len(b) == 0):
            return "NULL"
        return f"'\\x{bytes(b).hex()}'::bytea"

    def _text_literal(s: str | None) -> str:
        if s is None:
            return "NULL"
        return "'" + str(s).replace("'", "''") + "'"

    def _int_literal(i) -> str:
        return str(int(i)) if i is not None else "NULL"

    # Insert row-by-row to keep statement size manageable.
    total = 0
    for r in rows:
        img = r.get("image_blob")
        thumb = r.get("image_thumb_blob")
        # Turso returns empty blobs as b'' — treat as NULL for bytea column nullability.
        img_lit = _bytea_literal(img if isinstance(img, (bytes, bytearray)) else None)
        thumb_lit = _bytea_literal(thumb if isinstance(thumb, (bytes, bytearray)) else None)
        sql = (
            "INSERT INTO public.menu_item_images "
            "(id, item_id, image_url, image_blob, image_thumb_blob, image_filename, "
            "alt_text, source, status, sort_order, clicks, orders, created_at, updated_at) "
            "VALUES ("
            f"{_int_literal(r['id'])}, {_int_literal(r['item_id'])}, "
            f"{_text_literal(r.get('image_url'))}, {img_lit}, {thumb_lit}, "
            f"{_text_literal(r.get('image_filename'))}, {_text_literal(r.get('alt_text') or '')}, "
            f"{_text_literal(r.get('source') or 'manual')}, {_text_literal(r.get('status') or 'candidate')}, "
            f"{_int_literal(r.get('sort_order') or 0)}, {_int_literal(r.get('clicks') or 0)}, "
            f"{_int_literal(r.get('orders') or 0)}, "
            f"{_text_literal(r.get('created_at'))}::timestamptz, "
            f"{_text_literal(r.get('updated_at'))}::timestamptz"
            ") ON CONFLICT (id) DO UPDATE SET "
            "item_id=EXCLUDED.item_id, image_url=EXCLUDED.image_url, "
            "image_blob=EXCLUDED.image_blob, image_thumb_blob=EXCLUDED.image_thumb_blob, "
            "image_filename=EXCLUDED.image_filename, alt_text=EXCLUDED.alt_text, "
            "source=EXCLUDED.source, status=EXCLUDED.status, sort_order=EXCLUDED.sort_order, "
            "clicks=EXCLUDED.clicks, orders=EXCLUDED.orders, updated_at=EXCLUDED.updated_at"
        )
        _exec_sql(sql)
        total += 1
        if total % 25 == 0:
            log.info("  ... migrated %d/%d menu_item_images", total, len(rows))
    _reset_seq("menu_item_images")
    log.info("  ... migrated %d/%d menu_item_images", total, len(rows))
    return total


def migrate_floor_tables() -> int:
    rows = turso_rows("SELECT * FROM floor_tables ORDER BY id")
    log.info("floor_tables: %d rows", len(rows))
    payload = [
        {
            "id": r["id"],
            "num": r["num"],
            "x": r["x"],
            "y": r["y"],
            "w": r.get("w") or 90,
            "h": r.get("h") or 50,
            "type": r.get("type") or "table",
            "seats": r.get("seats") or 4,
            "label": r.get("label") or "Table",
            "zone": r.get("zone") or "",
        }
        for r in rows
    ]
    if payload:
        _upsert("floor_tables", payload, on_conflict="id")
        _reset_seq("floor_tables")
    return len(payload)


def migrate_floor_zones() -> int:
    rows = turso_rows("SELECT * FROM floor_zones ORDER BY id")
    log.info("floor_zones: %d rows", len(rows))
    payload = [
        {
            "id": r["id"],
            "label": r["label"],
            "x": r["x"],
            "y": r["y"],
            "w": r["w"],
            "h": r["h"],
            "color": r.get("color") or "#2a3025",
            "is_entrance": r.get("is_entrance") or 0,
        }
        for r in rows
    ]
    if payload:
        _upsert("floor_zones", payload, on_conflict="id")
        _reset_seq("floor_zones")
    return len(payload)


def migrate_loyalty_members() -> int:
    rows = turso_rows("SELECT * FROM loyalty_members ORDER BY id")
    log.info("loyalty_members: %d rows", len(rows))
    payload = [
        {
            "id": r["id"],
            "name": r["name"],
            "phone": r.get("phone"),
            "email": r.get("email"),
            "points": r.get("points") or 0,
            "total_spent": r.get("total_spent") or 0,
            "visits": r.get("visits") or 0,
            "last_visit": r.get("last_visit"),
            "created_at": r.get("created_at"),
        }
        for r in rows
    ]
    if payload:
        _upsert("loyalty_members", payload, on_conflict="id")
        _reset_seq("loyalty_members")
    return len(payload)


def migrate_loyalty_rewards() -> int:
    rows = turso_rows("SELECT * FROM loyalty_rewards ORDER BY id")
    log.info("loyalty_rewards: %d rows", len(rows))
    payload = [
        {
            "id": r["id"],
            "venue_id": r.get("venue_id") or "meetup",
            "points_required": r["points_required"],
            "description": r["description"],
            "active": r.get("active") or 0,
            "created_at": r.get("created_at"),
        }
        for r in rows
    ]
    if payload:
        _upsert("loyalty_rewards", payload, on_conflict="id")
        _reset_seq("loyalty_rewards")
    return len(payload)


def migrate_loyalty_transactions() -> int:
    rows = turso_rows("SELECT * FROM loyalty_transactions ORDER BY id")
    log.info("loyalty_transactions: %d rows", len(rows))
    payload = [
        {
            "id": r["id"],
            "member_phone": r["member_phone"],
            "type": r["type"],
            "points_change": r["points_change"],
            "reward_id": r.get("reward_id"),
            "order_number": r.get("order_number"),
            "note": r.get("note"),
            "created_at": r.get("created_at"),
        }
        for r in rows
    ]
    if payload:
        _upsert("loyalty_transactions", payload, on_conflict="id")
        _reset_seq("loyalty_transactions")
    return len(payload)


def migrate_order_counters() -> int:
    rows = turso_rows("SELECT * FROM order_counters")
    log.info("order_counters: %d rows", len(rows))
    payload = [
        {"venue_id": r["venue_id"], "last_number": r.get("last_number") or 0}
        for r in rows
    ]
    if payload:
        _upsert("order_counters", payload, on_conflict="venue_id")
    return len(payload)


def migrate_game_image_overrides() -> int:
    rows = turso_rows("SELECT * FROM game_image_overrides")
    log.info("game_image_overrides: %d rows", len(rows))
    payload = [
        {
            "game_id": r["game_id"],
            "image_url": r["image_url"],
            "updated_at": r.get("updated_at"),
        }
        for r in rows
    ]
    if payload:
        _upsert("game_image_overrides", payload, on_conflict="game_id")
    return len(payload)


def migrate_drink_subscribers() -> int:
    rows = turso_rows("SELECT * FROM drink_subscribers ORDER BY id")
    log.info("drink_subscribers: %d rows", len(rows))
    payload = [
        {
            "id": r["id"],
            "name": r["name"],
            "email": r["email"],
            "phone": r.get("phone"),
            "stripe_customer_id": r.get("stripe_customer_id"),
            "stripe_subscription_id": r.get("stripe_subscription_id"),
            "subscription_status": r.get("subscription_status") or "inactive",
            "qr_code": r.get("qr_code"),
            "created_at": r.get("created_at"),
            "updated_at": r.get("updated_at"),
        }
        for r in rows
    ]
    if payload:
        _upsert("drink_subscribers", payload, on_conflict="id")
        _reset_seq("drink_subscribers")
    return len(payload)


def migrate_drink_redemptions() -> int:
    rows = turso_rows("SELECT * FROM drink_redemptions ORDER BY id")
    log.info("drink_redemptions: %d rows", len(rows))
    payload = [
        {
            "id": r["id"],
            "subscriber_id": r["subscriber_id"],
            "redeemed_at": r.get("redeemed_at"),
            "redeemed_by": r.get("redeemed_by"),
            "drink_name": r.get("drink_name"),
            "week_start": r["week_start"],
        }
        for r in rows
    ]
    if payload:
        _upsert("drink_redemptions", payload, on_conflict="id")
        _reset_seq("drink_redemptions")
    return len(payload)


def migrate_rental_subscribers_swp() -> int:
    rows = turso_rows("SELECT * FROM rental_subscribers_swp ORDER BY id")
    log.info("rental_subscribers_swp: %d rows", len(rows))
    payload = [
        {
            "id": r["id"],
            "stripe_customer_id": r["stripe_customer_id"],
            "stripe_subscription_id": r.get("stripe_subscription_id"),
            "email": r["email"],
            "name": r["name"],
            "phone": r.get("phone"),
            "venue_id": r.get("venue_id") or "shallweplay",
            "status": r.get("status") or "active",
            "credit_used": r.get("credit_used") or 0,
            "created_at": r.get("created_at"),
            "updated_at": r.get("updated_at"),
        }
        for r in rows
    ]
    if payload:
        _upsert("rental_subscribers_swp", payload, on_conflict="id")
        _reset_seq("rental_subscribers_swp")
    return len(payload)


def migrate_rental_inventory_swp() -> int:
    rows = turso_rows("SELECT * FROM rental_inventory_swp ORDER BY id")
    log.info("rental_inventory_swp: %d rows", len(rows))
    payload = [
        {
            "id": r["id"],
            "venue_id": r.get("venue_id") or "shallweplay",
            "game_title": r["game_title"],
            "game_id": r.get("game_id"),
            "image_url": r.get("image_url"),
            "copies_total": r.get("copies_total") or 1,
            "copies_available": r.get("copies_available") or 1,
            "status": r.get("status") or "available",
            "current_renter_id": r.get("current_renter_id"),
            "rentable_instore": r.get("rentable_instore") or 0,
            "rentable_takehome": r.get("rentable_takehome") or 0,
            "for_sale": r.get("for_sale") or 0,
            "shopify_title": r.get("shopify_title"),
            "shopify_price_cents": r.get("shopify_price_cents") or 0,
            "shopify_available": r.get("shopify_available") or 0,
            "created_at": r.get("created_at"),
        }
        for r in rows
    ]
    if payload:
        _upsert("rental_inventory_swp", payload, on_conflict="id")
        _reset_seq("rental_inventory_swp")
    return len(payload)


def migrate_rental_reservations_swp() -> int:
    rows = turso_rows("SELECT * FROM rental_reservations_swp ORDER BY id")
    log.info("rental_reservations_swp: %d rows", len(rows))
    payload = [
        {
            "id": r["id"],
            "subscriber_id": r["subscriber_id"],
            "inventory_id": r["inventory_id"],
            "venue_id": r.get("venue_id") or "shallweplay",
            "reservation_type": r.get("reservation_type") or "new",
            "pickup_deadline": r["pickup_deadline"],
            "return_deadline": r.get("return_deadline"),
            "status": r.get("status") or "pending",
            "checked_out_at": r.get("checked_out_at"),
            "returned_at": r.get("returned_at"),
            "created_at": r.get("created_at"),
        }
        for r in rows
    ]
    if payload:
        _upsert("rental_reservations_swp", payload, on_conflict="id")
        _reset_seq("rental_reservations_swp")
    return len(payload)


def migrate_venue_orders() -> int:
    """Turso ``venue_orders`` → Supabase ``thai_house_orders``."""
    rows = turso_rows("SELECT * FROM venue_orders ORDER BY id")
    log.info("venue_orders → thai_house_orders: %d rows", len(rows))
    payload = [
        {
            "id": r["id"],
            "order_number": r["order_number"],
            "source": r.get("source") or "in_house",
            "table_number": r.get("table_number"),
            "customer_name": r["customer_name"],
            "customer_phone": r.get("customer_phone"),
            "items": _safe_json(r.get("items"), default=[]),
            "total": r["total"],
            "order_status": r.get("order_status") or "new",
            "print_status": r.get("print_status") or "pending",
            "drink_club_phone": r.get("drink_club_phone"),
            "created_at": r.get("created_at"),
            "confirmed_at": r.get("confirmed_at"),
            "completed_at": r.get("completed_at"),
            "rejected_reason": r.get("rejected_reason"),
        }
        for r in rows
    ]
    if payload:
        _upsert("thai_house_orders", payload, on_conflict="id")
        _reset_seq("thai_house_orders")
    return len(payload)


# ── Main ─────────────────────────────────────────────────────────

def main() -> int:
    log.info("=== Turso → Supabase Wave 2 migration ===")
    counts: dict[str, int] = {}

    # Phase A: parent/independent tables
    counts["menu_categories"] = migrate_menu_categories()
    counts["menu_toggles"] = migrate_menu_toggles()
    counts["floor_tables"] = migrate_floor_tables()
    counts["floor_zones"] = migrate_floor_zones()
    counts["loyalty_members"] = migrate_loyalty_members()
    counts["loyalty_rewards"] = migrate_loyalty_rewards()
    counts["loyalty_transactions"] = migrate_loyalty_transactions()
    counts["order_counters"] = migrate_order_counters()
    counts["game_image_overrides"] = migrate_game_image_overrides()
    counts["drink_subscribers"] = migrate_drink_subscribers()
    counts["rental_subscribers_swp"] = migrate_rental_subscribers_swp()
    counts["rental_inventory_swp"] = migrate_rental_inventory_swp()

    # Phase B: children
    counts["menu_items"] = migrate_menu_items()
    counts["drink_redemptions"] = migrate_drink_redemptions()
    counts["rental_reservations_swp"] = migrate_rental_reservations_swp()
    counts["menu_item_images"] = migrate_menu_item_images()
    counts["venue_orders→thai_house_orders"] = migrate_venue_orders()

    log.info("=== DONE ===")
    for k, v in counts.items():
        log.info("  %-40s %d", k, v)
    return 0


if __name__ == "__main__":
    sys.exit(main())
