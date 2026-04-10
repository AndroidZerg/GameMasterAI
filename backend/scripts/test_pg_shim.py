"""Local sanity test for the Supabase PG compat shim — translation + param inlining only.

Run from backend/: python -m scripts.test_pg_shim
Does not hit the network — it only tests pure functions.
"""
from app.services.supabase_pg_shim import (
    _translate_sqlite_to_pg,
    _inline_params,
    _escape_literal,
    _is_ddl,
)


def expect(label, actual, expected):
    status = "OK " if actual == expected else "FAIL"
    print(f"[{status}] {label}")
    if actual != expected:
        print(f"        got:      {actual!r}")
        print(f"        expected: {expected!r}")


# ── Escape literals ───────────────────────────────────────────
expect("None → NULL", _escape_literal(None), "NULL")
expect("int", _escape_literal(42), "42")
expect("float", _escape_literal(3.14), "3.14")
expect("bool true", _escape_literal(True), "TRUE")
expect("bool false", _escape_literal(False), "FALSE")
expect("str with quote", _escape_literal("O'Brien"), "'O''Brien'")
expect("dict → jsonb", _escape_literal({"a": 1}), "'{\"a\": 1}'::jsonb")
expect("list → jsonb", _escape_literal([1, 2]), "'[1, 2]'::jsonb")

# ── DDL detection ─────────────────────────────────────────────
expect("ddl create", _is_ddl("CREATE TABLE x (id int)"), True)
expect("ddl alter", _is_ddl("  alter table x add column y int"), True)
expect("not ddl insert", _is_ddl("INSERT INTO x VALUES (1)"), False)

# ── Dialect translation ───────────────────────────────────────
expect(
    "json_extract",
    _translate_sqlite_to_pg("SELECT json_extract(payload, '$.total_cents') FROM events"),
    "SELECT (payload->>'total_cents') FROM events",
)
expect(
    "datetime('now')",
    _translate_sqlite_to_pg("UPDATE x SET updated_at = datetime('now')"),
    "UPDATE x SET updated_at = now()",
)
expect(
    "date('now')",
    _translate_sqlite_to_pg("SELECT date('now')"),
    "SELECT CURRENT_DATE",
)
expect(
    "date('now', '-14 days')",
    _translate_sqlite_to_pg("WHERE created_at >= date('now', '-14 days')"),
    "WHERE created_at >= (CURRENT_DATE - interval '14 days')",
)
expect(
    "date(col)",
    _translate_sqlite_to_pg("WHERE date(created_at) = CURRENT_DATE"),
    "WHERE (created_at)::date = CURRENT_DATE",
)
expect(
    "strftime %Y-%m-%d",
    _translate_sqlite_to_pg("SELECT strftime('%Y-%m-%d', timestamp) FROM events"),
    "SELECT to_char(timestamp::timestamptz, 'YYYY-MM-DD') FROM events",
)
expect(
    "strftime %H",
    _translate_sqlite_to_pg("SELECT CAST(strftime('%H', ts) AS INTEGER) FROM events"),
    "SELECT CAST(EXTRACT(hour FROM ts::timestamptz) AS INTEGER) FROM events",
)
expect(
    "INSERT OR IGNORE",
    _translate_sqlite_to_pg("INSERT OR IGNORE INTO rental_wishlist_swp (a, b) VALUES (1, 2)"),
    "INSERT INTO rental_wishlist_swp (a, b) VALUES (1, 2) ON CONFLICT DO NOTHING",
)
expect(
    "venue_orders → thai_house_orders",
    _translate_sqlite_to_pg("SELECT * FROM venue_orders WHERE id = 1"),
    "SELECT * FROM thai_house_orders WHERE id = 1",
)

# ── Param inlining ────────────────────────────────────────────
expect(
    "simple params",
    _inline_params("INSERT INTO x (a, b) VALUES (?, ?)", [1, "foo"]),
    "INSERT INTO x (a, b) VALUES (1, 'foo')",
)
expect(
    "? inside string stays",
    _inline_params("SELECT * FROM x WHERE y = '?' AND z = ?", [42]),
    "SELECT * FROM x WHERE y = '?' AND z = 42",
)
expect(
    "nested quote in string",
    _inline_params("SELECT * FROM x WHERE y = 'it''s' AND z = ?", ["a"]),
    "SELECT * FROM x WHERE y = 'it''s' AND z = 'a'",
)
expect(
    "None → NULL param",
    _inline_params("INSERT INTO x VALUES (?, ?)", [None, 1]),
    "INSERT INTO x VALUES (NULL, 1)",
)
expect(
    "dict param → jsonb",
    _inline_params("INSERT INTO events (payload) VALUES (?)", [{"k": "v"}]),
    "INSERT INTO events (payload) VALUES ('{\"k\": \"v\"}'::jsonb)",
)

# ── End-to-end realistic query ────────────────────────────────
sql = (
    "SELECT AVG(CAST(json_extract(payload, '$.total_cents') AS REAL)) "
    "FROM events WHERE event_type = 'order_placed' "
    "AND json_extract(payload, '$.total_cents') IS NOT NULL"
)
expected = (
    "SELECT AVG(CAST((payload->>'total_cents') AS REAL)) "
    "FROM events WHERE event_type = 'order_placed' "
    "AND (payload->>'total_cents') IS NOT NULL"
)
expect("realistic analytics query", _translate_sqlite_to_pg(sql), expected)

print("\nShim translation tests complete.")
