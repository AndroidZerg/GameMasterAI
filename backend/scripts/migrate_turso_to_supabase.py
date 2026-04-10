"""One-time migration: Turso (libsql) -> Supabase Postgres.

WAVE 1 scope: auth-critical data only.
    - venues
    - signups
    - venue_collections -> venue_games
    - home_gotd / home_staff_picks -> admin_config (config_key='gotd' / 'staff_picks')
    - admin-config local JSON (meetup_enabled, clear_recent_ts) -> admin_config
        (venue_id='system')
    - analytics_events / analytics_sessions / analytics_devices /
      analytics_device_names / analytics_daily_rollups

WAVE 2 (deferred — Thai House live POS): menu_*, floor_*, loyalty_*,
drink_*, rental_*, venue_orders, order_counters, game_image_overrides,
venue_gotd / venue_staff_picks (LGS dashboard), device_sessions/notes/etc.

This script is idempotent (UPSERT). Re-running it is safe.

Required env vars:
    TURSO_DATABASE_URL  (libsql://...)
    TURSO_AUTH_TOKEN
    SUPABASE_SERVICE_KEY
"""
from __future__ import annotations

import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Iterable

import httpx
from supabase import Client, create_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
log = logging.getLogger("turso2sb")

# ── Connections ──────────────────────────────────────────────────

SUPABASE_URL = os.environ.get(
    "SUPABASE_URL", "https://uvfidazctqeazywlebkh.supabase.co"
)
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
TURSO_URL = os.environ["TURSO_DATABASE_URL"].replace("libsql://", "https://")
TURSO_TOKEN = os.environ["TURSO_AUTH_TOKEN"]
TURSO_ENDPOINT = f"{TURSO_URL}/v2/pipeline"

sb: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def turso_query(sql: str, args: list | None = None) -> tuple[list[str], list[list]]:
    """Run a SQL query against Turso via HTTP and return (cols, rows)."""
    body = {
        "requests": [
            {
                "type": "execute",
                "stmt": {
                    "sql": sql,
                    "args": [
                        {"type": "text", "value": str(a)} if not isinstance(a, dict) else a
                        for a in (args or [])
                    ],
                },
            },
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
    rows = []
    for row in result.get("rows", []):
        out = []
        for cell in row:
            if isinstance(cell, dict):
                v = cell.get("value")
                t = cell.get("type")
                if t == "null":
                    v = None
                elif t == "integer" and v is not None:
                    try:
                        v = int(v)
                    except (ValueError, TypeError):
                        pass
                elif t == "float" and v is not None:
                    try:
                        v = float(v)
                    except (ValueError, TypeError):
                        pass
                out.append(v)
            else:
                out.append(cell)
        rows.append(out)
    return cols, rows


def turso_dicts(sql: str, args: list | None = None) -> list[dict]:
    cols, rows = turso_query(sql, args)
    return [dict(zip(cols, r)) for r in rows]


# ── Helpers ──────────────────────────────────────────────────────

def _to_iso(value: Any) -> str | None:
    """Best-effort: pass through ISO strings, leave None as None."""
    if value in (None, "", 0):
        return None if value in (None, "") else value
    return value


def _bool(value: Any) -> bool:
    if value in (None, 0, "0", "", "false", "False"):
        return False
    return True


def _batched(iterable: Iterable, size: int):
    batch: list = []
    for item in iterable:
        batch.append(item)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


# ── Migrators ────────────────────────────────────────────────────

def migrate_venues() -> int:
    rows = turso_dicts("SELECT * FROM venues ORDER BY id")
    log.info("Read %d venues from Turso", len(rows))

    payload = []
    for r in rows:
        # Map Turso columns -> Supabase columns. Skip Turso `id` (Supabase uses
        # uuid id and TEXT venue_id as the natural key).
        item = {
            "venue_id": r.get("venue_id"),
            "venue_name": r.get("venue_name"),
            "email": (r.get("email") or "").lower() or None,
            "password_hash": r.get("password_hash"),
            "accent_color": r.get("accent_color") or "#e94560",
            "logo_url": r.get("logo_url"),
            "tagline": r.get("tagline") or "",
            "address": r.get("address") or "",
            "phone": r.get("phone") or "",
            "website": r.get("website") or "",
            "default_theme": r.get("default_theme") or "dark",
            "created_at": _to_iso(r.get("created_at")),
            "last_login_at": _to_iso(r.get("last_login")),
            "staff_picks": _safe_jsonb(r.get("staff_picks"), default=[]),
            "role": r.get("role") or "venue_admin",
            "status": r.get("status") or "prospect",
            "trial_start_date": _to_iso(r.get("trial_start_date")),
            "trial_duration_days": r.get("trial_duration_days") or 30,
            "source": r.get("source") or "",
            "expires_at": _to_iso(r.get("expires_at")),
            "username": r.get("username"),
            "city": r.get("city") or "",
            "state": r.get("state") or "",
            "zip_code": r.get("zip_code") or "",
            "hours_json": _safe_jsonb(r.get("hours_json"), default={}),
            "contact_name": r.get("contact_name") or "",
            "logo_filename": r.get("logo_filename") or "",
            "onboarding_step": r.get("onboarding_step") or 0,
            "onboarding_completed_at": _to_iso(r.get("onboarding_completed_at")),
            "stripe_customer_id": r.get("stripe_customer_id"),
            "stripe_subscription_id": r.get("stripe_subscription_id"),
            "subscription_tier": r.get("subscription_tier"),
            "game_seat_limit": r.get("game_seat_limit"),
            "subscription_status": r.get("subscription_status"),
            "updated_at": _to_iso(r.get("updated_at")),
            "purchases_enabled": _bool(r.get("purchases_enabled")),
            "lgs_id": r.get("lgs_id"),
            "current_period_end": _to_iso(r.get("current_period_end")),
        }
        payload.append(item)

    # Upsert on venue_id (the application's natural key)
    if payload:
        sb.table("venues").upsert(payload, on_conflict="venue_id").execute()
    log.info("Upserted %d venues into Supabase", len(payload))
    return len(payload)


def _safe_jsonb(value: Any, default: Any) -> Any:
    """Turso stores JSON as TEXT; Supabase column is JSONB. Parse safely."""
    if value is None or value == "":
        return default
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return default


def migrate_signups() -> int:
    rows = turso_dicts("SELECT * FROM signups ORDER BY signed_up_at")
    log.info("Read %d signups from Turso", len(rows))
    payload = []
    for r in rows:
        payload.append(
            {
                "id": r.get("id"),
                "first_name": r.get("first_name") or "",
                "email": (r.get("email") or "").lower(),
                "source": r.get("source") or "organic",
                "role": r.get("role") or "convention",
                "signed_up_at": _to_iso(r.get("signed_up_at")),
                "ip_address": r.get("ip_address"),
                "password_hash": r.get("password_hash") or "",
                "raw_password": r.get("raw_password") or "",
            }
        )
    if payload:
        sb.table("signups").upsert(payload, on_conflict="id").execute()
    log.info("Upserted %d signups", len(payload))
    return len(payload)


def migrate_venue_collections() -> int:
    rows = turso_dicts("SELECT venue_id, game_id, added_at FROM venue_collections")
    log.info("Read %d venue_collections rows from Turso", len(rows))
    payload = []
    for r in rows:
        payload.append(
            {
                "venue_id": r.get("venue_id"),
                "game_id": r.get("game_id"),
                "added_at": _to_iso(r.get("added_at")),
                "is_active": True,
                "is_featured": False,
                "is_priority": False,
            }
        )
    total = 0
    for batch in _batched(payload, 500):
        sb.table("venue_games").upsert(
            batch, on_conflict="venue_id,game_id"
        ).execute()
        total += len(batch)
        log.info("  ... upserted %d/%d venue_games", total, len(payload))
    return total


def migrate_home_config() -> int:
    """home_gotd + home_staff_picks -> admin_config rows."""
    gotd = turso_dicts("SELECT venue_key, game_id, mode, updated_at FROM home_gotd")
    log.info("Read %d home_gotd rows", len(gotd))
    payload = []
    for r in gotd:
        payload.append(
            {
                "venue_id": r.get("venue_key") or "global",
                "config_key": "gotd",
                "config_value": {
                    "game_id": r.get("game_id"),
                    "mode": r.get("mode") or "manual",
                },
                "updated_at": _to_iso(r.get("updated_at")),
            }
        )
    if payload:
        sb.table("admin_config").upsert(
            payload, on_conflict="venue_id,config_key"
        ).execute()

    picks = turso_dicts(
        "SELECT venue_key, game_id, position FROM home_staff_picks ORDER BY venue_key, position"
    )
    log.info("Read %d home_staff_picks rows", len(picks))
    grouped: dict[str, list[str]] = {}
    for r in picks:
        grouped.setdefault(r["venue_key"], []).append(r["game_id"])

    payload2 = []
    for venue_key, ids in grouped.items():
        payload2.append(
            {
                "venue_id": venue_key,
                "config_key": "staff_picks",
                "config_value": {"game_ids": ids},
                "updated_at": "now()",
            }
        )
    if payload2:
        sb.table("admin_config").upsert(
            payload2, on_conflict="venue_id,config_key"
        ).execute()

    log.info(
        "Upserted %d gotd + %d staff_picks (admin_config)",
        len(payload),
        len(payload2),
    )
    return len(payload) + len(payload2)


def migrate_system_config() -> int:
    """Local content/admin-config.json -> admin_config (venue_id='system')."""
    repo_root = Path(__file__).resolve().parents[2]
    cfg_path = repo_root / "content" / "admin-config.json"
    if not cfg_path.exists():
        log.info("No content/admin-config.json on disk; skipping system config migration")
        return 0
    try:
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    except Exception as e:
        log.warning("Could not parse %s: %s", cfg_path, e)
        return 0

    sys_cfg = cfg.get("_system", {})
    payload = []
    for key, value in sys_cfg.items():
        payload.append(
            {
                "venue_id": "system",
                "config_key": key,
                "config_value": {"value": value},
                "updated_at": "now()",
            }
        )
    if payload:
        sb.table("admin_config").upsert(
            payload, on_conflict="venue_id,config_key"
        ).execute()
    log.info("Upserted %d system config entries", len(payload))
    return len(payload)


def migrate_analytics_events(batch_size: int = 1000) -> int:
    cols, _ = turso_query("SELECT * FROM events LIMIT 0")
    log.info("Migrating analytics events (cols=%s)", cols)
    offset = 0
    total = 0
    while True:
        rows = turso_dicts(
            f"SELECT * FROM events ORDER BY id LIMIT {batch_size} OFFSET {offset}"
        )
        if not rows:
            break
        payload = []
        for r in rows:
            payload.append(
                {
                    "event_type": r.get("event_type"),
                    "venue_id": r.get("venue_id") or "demo",
                    "device_id": r.get("device_id") or "",
                    "session_id": r.get("session_id"),
                    "game_id": r.get("game_id"),
                    "timestamp": _to_iso(r.get("timestamp")),
                    "payload": _safe_jsonb(r.get("payload"), default={}),
                }
            )
        if payload:
            sb.table("analytics_events").insert(payload).execute()
        total += len(rows)
        offset += batch_size
        log.info("  ... migrated %d events", total)
        if len(rows) < batch_size:
            break
    return total


def migrate_analytics_sessions() -> int:
    rows = turso_dicts("SELECT * FROM sessions")
    log.info("Read %d sessions from Turso", len(rows))
    payload = []
    for r in rows:
        payload.append(
            {
                "session_id": r.get("session_id"),
                "device_id": r.get("device_id") or "",
                "venue_id": r.get("venue_id"),
                "started_at": _to_iso(r.get("started_at")),
                "ended_at": _to_iso(r.get("ended_at")),
                "duration_seconds": r.get("duration_seconds"),
                "games_viewed": r.get("games_viewed") or 0,
                "games_played": r.get("games_played") or 0,
                "questions_asked": r.get("questions_asked") or 0,
                "orders_placed": r.get("orders_placed") or 0,
                "tts_uses": r.get("tts_uses") or 0,
                "voice_inputs": r.get("voice_inputs") or 0,
                "pages_visited": r.get("pages_visited"),
            }
        )
    total = 0
    for batch in _batched(payload, 500):
        sb.table("analytics_sessions").upsert(
            batch, on_conflict="session_id"
        ).execute()
        total += len(batch)
    log.info("Upserted %d sessions", total)
    return total


def migrate_analytics_devices() -> int:
    rows = turso_dicts("SELECT * FROM devices")
    log.info("Read %d devices from Turso", len(rows))
    payload = []
    for r in rows:
        payload.append(
            {
                "device_id": r.get("device_id"),
                "device_name": r.get("device_name"),
                "platform": r.get("platform"),
                "screen_resolution": r.get("screen_resolution"),
                "user_agent": r.get("user_agent"),
                "venue_id": r.get("venue_id"),
                "first_seen_at": _to_iso(r.get("first_seen_at")),
                "last_seen_at": _to_iso(r.get("last_seen_at")),
                "visit_count": r.get("visit_count") or 1,
                "total_sessions": r.get("total_sessions") or 0,
                "total_events": r.get("total_events") or 0,
            }
        )
    total = 0
    for batch in _batched(payload, 500):
        sb.table("analytics_devices").upsert(
            batch, on_conflict="device_id"
        ).execute()
        total += len(batch)
    log.info("Upserted %d devices", total)
    return total


def migrate_analytics_device_names() -> int:
    rows = turso_dicts("SELECT * FROM device_names")
    log.info("Read %d device_names from Turso", len(rows))
    payload = []
    for r in rows:
        payload.append(
            {
                "device_id": r.get("device_id"),
                "name": r.get("name"),
                "session_id": r.get("session_id"),
                "seen_at": _to_iso(r.get("seen_at")),
            }
        )
    total = 0
    for batch in _batched(payload, 500):
        sb.table("analytics_device_names").insert(batch).execute()
        total += len(batch)
    log.info("Inserted %d device_names", total)
    return total


def migrate_analytics_daily_rollups() -> int:
    rows = turso_dicts("SELECT * FROM daily_rollups")
    log.info("Read %d daily_rollups from Turso", len(rows))
    payload = []
    for r in rows:
        payload.append(
            {
                "venue_id": r.get("venue_id"),
                "date": r.get("date"),
                "total_sessions": r.get("total_sessions") or 0,
                "unique_devices": r.get("unique_devices") or 0,
                "total_questions": r.get("total_questions") or 0,
                "avg_game_rating": r.get("avg_game_rating"),
                "avg_ai_rating": r.get("avg_ai_rating"),
                "top_game_id": r.get("top_game_id"),
                "top_game_sessions": r.get("top_game_sessions") or 0,
                "completion_rate": r.get("completion_rate"),
                "error_count": r.get("error_count") or 0,
            }
        )
    if payload:
        sb.table("analytics_daily_rollups").upsert(
            payload, on_conflict="venue_id,date"
        ).execute()
    log.info("Upserted %d daily_rollups", len(payload))
    return len(payload)


# ── Main ─────────────────────────────────────────────────────────

def main() -> int:
    log.info("=== Turso → Supabase migration (Wave 1) ===")
    counts: dict[str, int] = {}

    counts["venues"] = migrate_venues()
    counts["signups"] = migrate_signups()
    counts["venue_collections→venue_games"] = migrate_venue_collections()
    counts["home_config→admin_config"] = migrate_home_config()
    counts["system_config→admin_config"] = migrate_system_config()
    counts["analytics_devices"] = migrate_analytics_devices()
    counts["analytics_sessions"] = migrate_analytics_sessions()
    counts["analytics_device_names"] = migrate_analytics_device_names()
    counts["analytics_daily_rollups"] = migrate_analytics_daily_rollups()
    counts["analytics_events"] = migrate_analytics_events()

    log.info("=== DONE ===")
    for k, v in counts.items():
        log.info("  %-40s %d", k, v)
    return 0


if __name__ == "__main__":
    sys.exit(main())
