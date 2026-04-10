"""Wave 2 full smoke test — exercises every Turso-shim-backed read path."""
import os
import sys
import traceback

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.supabase_pg_shim import get_pg_db

db = get_pg_db()

RESULTS: list[tuple[str, str, str]] = []  # (area, name, status)


def check(area: str, name: str):
    def deco(fn):
        try:
            fn()
            RESULTS.append((area, name, "OK"))
        except Exception as exc:
            RESULTS.append((area, name, f"FAIL: {type(exc).__name__}: {exc}"))
            traceback.print_exc()
        return fn
    return deco


# ── Analytics dashboard ─────────────────────────────────────────
@check("analytics", "events table select")
def _():
    rows = db.execute(
        "SELECT COUNT(*) AS n FROM analytics_events WHERE timestamp >= (CURRENT_DATE - interval '30 days')"
    ).fetchall()
    assert rows and "n" in rows[0]

@check("analytics", "sessions aggregation")
def _():
    db.execute(
        """SELECT venue_id, COUNT(*) AS sessions
           FROM analytics_sessions
           WHERE started_at >= (CURRENT_DATE - interval '30 days')
           GROUP BY venue_id
           ORDER BY sessions DESC LIMIT 5"""
    ).fetchall()

@check("analytics", "device_sessions inserts table exists")
def _():
    db.execute("SELECT COUNT(*) AS n FROM device_sessions").fetchall()


# ── Drink club ──────────────────────────────────────────────────
@check("drink_club", "subscribers list")
def _():
    db.execute("SELECT * FROM drink_subscribers ORDER BY created_at DESC LIMIT 10").fetchall()

@check("drink_club", "redemptions join")
def _():
    db.execute(
        """SELECT r.*, s.name
           FROM drink_redemptions r
           LEFT JOIN drink_subscribers s ON r.subscriber_id = s.id
           ORDER BY r.redeemed_at DESC LIMIT 10"""
    ).fetchall()


# ── Thai House menu ─────────────────────────────────────────────
@check("thaihouse", "menu with categories + image count subquery")
def _():
    rows = db.execute(
        """SELECT mi.id, mi.name, mi.toggles, mc.name AS category_name,
              (SELECT COUNT(*) FROM menu_item_images mii
                WHERE mii.item_id = mi.id AND mii.status = ?) AS img_count
           FROM menu_items mi
           JOIN menu_categories mc ON mi.category_id = mc.id
           WHERE mi.active = ?
           ORDER BY mc.sort_order, mi.sort_order""",
        ("active", 1),
    ).fetchall()
    assert len(rows) > 0
    # Check JSONB roundtrip: toggles should be str (JSON), not dict
    import json
    first_toggles = rows[0]["toggles"]
    assert isinstance(first_toggles, str), f"toggles should be JSON string, got {type(first_toggles)}"
    json.loads(first_toggles)  # must be parseable

@check("thaihouse", "menu_toggles read")
def _():
    db.execute("SELECT * FROM menu_toggles").fetchall()

@check("thaihouse", "menu_categories ordered")
def _():
    db.execute("SELECT id, name, sort_order FROM menu_categories ORDER BY sort_order").fetchall()


# ── Thai House orders ───────────────────────────────────────────
@check("orders", "thai_house_orders recent")
def _():
    db.execute(
        "SELECT * FROM thai_house_orders ORDER BY created_at DESC LIMIT 10"
    ).fetchall()

@check("orders", "venue_orders alias rewrite")
def _():
    # This should get translated to thai_house_orders by the shim
    db.execute("SELECT COUNT(*) AS n FROM venue_orders").fetchall()

@check("orders", "order_counters exists")
def _():
    db.execute("SELECT * FROM order_counters").fetchall()


# ── Floor (tables/zones) ────────────────────────────────────────
@check("floor", "zones + tables")
def _():
    db.execute("SELECT * FROM floor_zones ORDER BY id").fetchall()
    db.execute("SELECT * FROM floor_tables ORDER BY zone, num").fetchall()


# ── Loyalty ─────────────────────────────────────────────────────
@check("loyalty", "members + rewards read")
def _():
    db.execute("SELECT * FROM loyalty_members LIMIT 10").fetchall()
    db.execute("SELECT * FROM loyalty_rewards").fetchall()
    db.execute("SELECT * FROM loyalty_transactions ORDER BY created_at DESC LIMIT 10").fetchall()


# ── SWP rentals ─────────────────────────────────────────────────
@check("swp_rentals", "inventory + subscribers + reservations")
def _():
    db.execute("SELECT * FROM rental_inventory_swp ORDER BY id LIMIT 10").fetchall()
    db.execute("SELECT * FROM rental_subscribers_swp ORDER BY created_at DESC LIMIT 10").fetchall()
    db.execute(
        "SELECT * FROM rental_reservations_swp ORDER BY created_at DESC LIMIT 10"
    ).fetchall()


# ── Cover art overrides ─────────────────────────────────────────
@check("cover_art", "list + lookup")
def _():
    from app.services.turso import (
        get_all_cover_art_overrides,
        get_cover_art_override,
        get_cover_art_status,
    )
    get_all_cover_art_overrides()
    get_cover_art_status()
    get_cover_art_override("wingspan")  # may or may not exist; should not error


# ── Thai House CRM ──────────────────────────────────────────────
@check("thaihouse_crm", "customers view")
def _():
    db.execute(
        """SELECT customer_phone, customer_name,
                  COUNT(*) AS orders, SUM(total) AS lifetime_value
           FROM thai_house_orders
           WHERE customer_phone IS NOT NULL
           GROUP BY customer_phone, customer_name
           ORDER BY lifetime_value DESC NULLS LAST
           LIMIT 10"""
    ).fetchall()


# ── SQLite dialect translation smoke tests ─────────────────────
@check("dialect", "datetime('now')")
def _():
    rows = db.execute("SELECT datetime('now') AS now_val").fetchall()
    assert rows and rows[0]["now_val"] is not None

@check("dialect", "date('now', '-7 days')")
def _():
    rows = db.execute("SELECT date('now', '-7 days') AS wk").fetchall()
    assert rows and rows[0]["wk"] is not None

@check("dialect", "strftime hour extract")
def _():
    db.execute(
        """SELECT strftime('%H', timestamp) AS hr, COUNT(*) AS n
           FROM analytics_events
           WHERE timestamp >= (CURRENT_DATE - interval '7 days')
           GROUP BY hr
           ORDER BY hr"""
    ).fetchall()

@check("dialect", "json_extract rewrite")
def _():
    # Use a column that's jsonb — analytics_events.payload is jsonb
    db.execute(
        """SELECT json_extract(payload, '$.path') AS path_val
           FROM analytics_events
           WHERE payload IS NOT NULL
           LIMIT 5"""
    ).fetchall()


# ── INSERT + lastrowid + RETURNING ──────────────────────────────
@check("insert", "round-trip INSERT with lastrowid")
def _():
    # Use drink_subscribers — safe, has autoincrement id
    import uuid
    test_email = f"smoke-{uuid.uuid4().hex[:8]}@test.local"
    cur = db.execute(
        "INSERT INTO drink_subscribers (email, name, subscription_status) VALUES (?, ?, ?)",
        (test_email, "SMOKE TEST", "test"),
    )
    new_id = cur.lastrowid
    assert new_id and new_id > 0
    # Verify last_insert_rowid() shim hook
    row = db.execute("SELECT last_insert_rowid() AS id").fetchone()
    assert row[0] == new_id
    # Verify the row exists
    row = db.execute(
        "SELECT id, email FROM drink_subscribers WHERE id = ?", (new_id,)
    ).fetchone()
    assert row and row["email"] == test_email
    # Clean up
    db.execute("DELETE FROM drink_subscribers WHERE id = ?", (new_id,))


# ── print results ───────────────────────────────────────────────
print("=" * 70)
print("WAVE 2 SMOKE TEST RESULTS")
print("=" * 70)
ok = sum(1 for _, _, s in RESULTS if s == "OK")
fail = len(RESULTS) - ok
for area, name, status in RESULTS:
    marker = "+" if status == "OK" else "X"
    print(f"  [{marker}] {area:15s} {name:45s} {status}")
print("=" * 70)
print(f"TOTAL: {ok}/{len(RESULTS)} passed, {fail} failed")
print("=" * 70)
sys.exit(0 if fail == 0 else 1)
