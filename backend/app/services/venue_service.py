"""
Venue & auth service — Supabase-backed (canonical) with Turso dual-write.

Replaces the Turso-based reads/writes that previously lived in:
    - app.models.venues               (venues, venue_collections)
    - app.services.turso              (insert_signup, get_signup_by_email, get_all_signups)
    - app.services.home_config        (home_gotd / home_staff_picks)
    - app.services.admin_config       (meetup_enabled, clear_recent_ts)

Supabase tables used (canonical):
    venues          — venue accounts (custom JWT auth, NOT Supabase Auth)
    signups         — convention/stonemaier signups
    venue_games     — venue → game collections (replaces venue_collections)
    admin_config    — KV store for home config + system config (jsonb)

Turso dual-write (transitional):
    The auth path (login/register/signup/verify) reads exclusively from
    Supabase. However, several Wave-2 callers still issue raw SQL JOIN
    queries against Turso's ``venues`` and ``venue_collections`` tables
    (LGS marketplace, shop, Stripe webhooks/subscriptions, CRM, analytics
    dashboard, etc.). To keep them functional without a 30-file refactor,
    every write helper here mirrors its change into Turso best-effort.
    Failures to mirror are logged but never break the canonical Supabase
    write. A follow-up ticket (Wave 1.5) should migrate those callers to
    use venue_service / Supabase joins, after which the Turso mirror can
    be removed.

All venue rows returned by reads are plain dicts. The legacy Turso column
``last_login`` is exposed under both ``last_login`` and ``last_login_at``
so callers that expect either name keep working.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from app.services.supabase_client import get_admin_client

logger = logging.getLogger(__name__)


# ── Helpers ──────────────────────────────────────────────────────


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_venue(row: dict | None) -> dict | None:
    """Add legacy ``last_login`` alias so old call sites keep working."""
    if not row:
        return None
    if "last_login_at" in row and "last_login" not in row:
        row["last_login"] = row["last_login_at"]
    return row


# ── Turso mirror (best-effort) ───────────────────────────────────
#
# These helpers write the same change into the legacy Turso ``venues``
# and ``venue_collections`` tables so the LGS/shop/webhooks/CRM/analytics
# code paths that still issue raw SQL via ``get_venues_db()`` keep seeing
# fresh data. Any failure is logged and swallowed.


def _turso_db():
    try:
        from app.services.turso import get_venues_db
        return get_venues_db()
    except Exception as e:
        logger.debug(f"Turso mirror unavailable: {e}")
        return None


def _turso_mirror_venue_upsert(payload: dict) -> None:
    db = _turso_db()
    if db is None:
        return
    try:
        cols = [
            "venue_id", "venue_name", "email", "password_hash", "tagline",
            "accent_color", "logo_url", "address", "phone", "website",
            "default_theme", "role", "status", "source", "username",
            "expires_at", "trial_start_date", "created_at", "last_login",
            "stripe_customer_id", "stripe_subscription_id", "subscription_tier",
            "game_seat_limit", "subscription_status", "purchases_enabled",
            "lgs_id", "current_period_end", "logo_filename",
        ]
        # Map Supabase last_login_at -> Turso last_login
        row = {k: payload.get(k) for k in cols}
        if "last_login_at" in payload and not row.get("last_login"):
            row["last_login"] = payload["last_login_at"]
        # Booleans → ints for SQLite
        if isinstance(row.get("purchases_enabled"), bool):
            row["purchases_enabled"] = 1 if row["purchases_enabled"] else 0
        non_null = {k: v for k, v in row.items() if v is not None}
        if "venue_id" not in non_null:
            return
        col_list = ", ".join(non_null.keys())
        placeholders = ", ".join(["?"] * len(non_null))
        update_clause = ", ".join(f"{k} = excluded.{k}" for k in non_null if k != "venue_id")
        sql = (
            f"INSERT INTO venues ({col_list}) VALUES ({placeholders}) "
            f"ON CONFLICT(venue_id) DO UPDATE SET {update_clause}"
        )
        db.execute(sql, tuple(non_null.values()))
        db.commit()
    except Exception as e:
        logger.debug(f"Turso venue mirror failed for {payload.get('venue_id')}: {e}")


def _turso_mirror_venue_update(venue_id: str, fields: dict) -> None:
    db = _turso_db()
    if db is None or not fields:
        return
    try:
        # Map Supabase last_login_at → Turso last_login
        mapped = dict(fields)
        if "last_login_at" in mapped:
            mapped["last_login"] = mapped.pop("last_login_at")
        if isinstance(mapped.get("purchases_enabled"), bool):
            mapped["purchases_enabled"] = 1 if mapped["purchases_enabled"] else 0
        sets = ", ".join(f"{k} = ?" for k in mapped.keys())
        params = list(mapped.values()) + [venue_id]
        db.execute(f"UPDATE venues SET {sets} WHERE venue_id = ?", tuple(params))
        db.commit()
    except Exception as e:
        logger.debug(f"Turso venue update mirror failed for {venue_id}: {e}")


def _turso_mirror_venue_delete(venue_id: str) -> None:
    db = _turso_db()
    if db is None:
        return
    try:
        db.execute("DELETE FROM venues WHERE venue_id = ?", (venue_id,))
        db.execute("DELETE FROM venue_collections WHERE venue_id = ?", (venue_id,))
        db.commit()
    except Exception as e:
        logger.debug(f"Turso venue delete mirror failed for {venue_id}: {e}")


def _turso_mirror_collection(venue_id: str, game_ids: list[str]) -> None:
    db = _turso_db()
    if db is None:
        return
    try:
        db.execute("DELETE FROM venue_collections WHERE venue_id = ?", (venue_id,))
        if not game_ids:
            db.commit()
            return
        now = _now_iso()
        for gid in game_ids:
            db.execute(
                "INSERT OR IGNORE INTO venue_collections (venue_id, game_id, added_at) VALUES (?, ?, ?)",
                (venue_id, gid, now),
            )
        db.commit()
    except Exception as e:
        logger.debug(f"Turso collection mirror failed for {venue_id}: {e}")


# ══════════════════════════════════════════════════════════════════
# VENUES
# ══════════════════════════════════════════════════════════════════


def get_venue_by_email(email: str) -> Optional[dict]:
    if not email:
        return None
    admin = get_admin_client()
    res = admin.table("venues").select("*").ilike("email", email).limit(1).execute()
    rows = res.data or []
    return _normalize_venue(rows[0]) if rows else None


def get_venue_by_id(venue_id: str) -> Optional[dict]:
    if not venue_id:
        return None
    admin = get_admin_client()
    res = admin.table("venues").select("*").eq("venue_id", venue_id).limit(1).execute()
    rows = res.data or []
    return _normalize_venue(rows[0]) if rows else None


def get_venue_by_username(username: str) -> Optional[dict]:
    if not username:
        return None
    admin = get_admin_client()
    res = admin.table("venues").select("*").ilike("username", username).limit(1).execute()
    rows = res.data or []
    return _normalize_venue(rows[0]) if rows else None


def get_all_venues() -> list[dict]:
    admin = get_admin_client()
    res = admin.table("venues").select("*").order("venue_name").execute()
    return [_normalize_venue(r) for r in (res.data or [])]


def create_venue(
    venue_id: str,
    venue_name: str,
    email: str,
    password_hash: str,
    tagline: str = "",
    accent_color: str = "#e94560",
    address: str = "",
    phone: str = "",
    website: str = "",
    role: str = "venue_admin",
    source: str = "",
    expires_at: str = "",
    trial_start_date: str = "",
) -> str:
    """Insert a new venue. Returns venue_id."""
    admin = get_admin_client()
    payload = {
        "venue_id": venue_id,
        "venue_name": venue_name,
        "email": email,
        "password_hash": password_hash,
        "tagline": tagline,
        "accent_color": accent_color,
        "address": address,
        "phone": phone,
        "website": website,
        "role": role,
        "source": source,
        "expires_at": expires_at or None,
        "trial_start_date": trial_start_date or None,
        "status": "prospect",
        "created_at": _now_iso(),
    }
    admin.table("venues").insert(payload).execute()
    _turso_mirror_venue_upsert(payload)
    return venue_id


def update_venue_login(venue_id: str) -> None:
    """Stamp last_login_at = now."""
    now = _now_iso()
    admin = get_admin_client()
    admin.table("venues").update({"last_login_at": now}).eq(
        "venue_id", venue_id
    ).execute()
    _turso_mirror_venue_update(venue_id, {"last_login_at": now})


def update_venue_config(venue_id: str, **kwargs) -> Optional[dict]:
    """Update select venue config fields. Mirrors legacy allow-list."""
    allowed = {
        "venue_name",
        "accent_color",
        "logo_url",
        "tagline",
        "default_theme",
        "address",
        "phone",
        "website",
        "staff_picks",
    }
    payload = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
    if not payload:
        return get_venue_by_id(venue_id)
    payload["updated_at"] = _now_iso()
    admin = get_admin_client()
    admin.table("venues").update(payload).eq("venue_id", venue_id).execute()
    # staff_picks is jsonb in Supabase but TEXT in Turso — JSON-encode for mirror
    mirror_payload = dict(payload)
    if "staff_picks" in mirror_payload and not isinstance(mirror_payload["staff_picks"], str):
        import json as _json
        mirror_payload["staff_picks"] = _json.dumps(mirror_payload["staff_picks"])
    _turso_mirror_venue_update(venue_id, mirror_payload)
    return get_venue_by_id(venue_id)


# ══════════════════════════════════════════════════════════════════
# SIGNUPS
# ══════════════════════════════════════════════════════════════════


def insert_signup(
    signup_id: str,
    first_name: str,
    email: str,
    source: str,
    role: str,
    signed_up_at: str,
    ip_address: str,
    password_hash: str,
    raw_password: str,
) -> None:
    """Insert a signup record. No-ops if email already exists (matches Turso INSERT OR IGNORE)."""
    if not email:
        return
    admin = get_admin_client()
    # Idempotency: skip if email already present
    existing = get_signup_by_email(email)
    if existing:
        return
    try:
        admin.table("signups").insert(
            {
                "id": signup_id,
                "first_name": first_name,
                "email": email,
                "source": source,
                "role": role,
                "signed_up_at": signed_up_at,
                "ip_address": ip_address,
                "password_hash": password_hash,
                "raw_password": raw_password,
            }
        ).execute()
    except Exception as e:
        logger.warning(f"Failed to insert signup for {email}: {e}")


def get_signup_by_email(email: str) -> Optional[dict]:
    if not email:
        return None
    try:
        admin = get_admin_client()
        res = admin.table("signups").select("*").ilike("email", email).limit(1).execute()
        rows = res.data or []
        return rows[0] if rows else None
    except Exception as e:
        logger.warning(f"Failed to look up signup for {email}: {e}")
        return None


def get_all_signups() -> list[dict]:
    try:
        admin = get_admin_client()
        res = admin.table("signups").select("*").order("signed_up_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        logger.warning(f"Failed to list signups: {e}")
        return []


# ══════════════════════════════════════════════════════════════════
# VENUE COLLECTIONS  (venue_games)
# ══════════════════════════════════════════════════════════════════


def get_venue_collection(venue_id: str) -> list[str]:
    admin = get_admin_client()
    res = (
        admin.table("venue_games")
        .select("game_id")
        .eq("venue_id", venue_id)
        .order("game_id")
        .execute()
    )
    return [r["game_id"] for r in (res.data or [])]


def set_venue_collection(venue_id: str, game_ids: list[str]) -> None:
    """Replace the venue's collection. Idempotent.

    Strategy: delete-then-insert (matches legacy semantics). For very large
    collections we batch the inserts at 500 rows per request to stay within
    PostgREST limits.
    """
    admin = get_admin_client()
    admin.table("venue_games").delete().eq("venue_id", venue_id).execute()
    if game_ids:
        now = _now_iso()
        rows = [
            {
                "venue_id": venue_id,
                "game_id": gid,
                "added_at": now,
                "is_active": True,
                "is_priority": False,
                "is_featured": False,
            }
            for gid in game_ids
        ]
        BATCH = 500
        for i in range(0, len(rows), BATCH):
            admin.table("venue_games").insert(rows[i : i + BATCH]).execute()
    _turso_mirror_collection(venue_id, game_ids)


# ══════════════════════════════════════════════════════════════════
# HOME CONFIG  (admin_config rows: config_key in {gotd, staff_picks})
# ══════════════════════════════════════════════════════════════════


def _ac_get(venue_id: str, config_key: str) -> dict | None:
    admin = get_admin_client()
    res = (
        admin.table("admin_config")
        .select("config_value")
        .eq("venue_id", venue_id)
        .eq("config_key", config_key)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    return rows[0]["config_value"] if rows else None


def _ac_set(venue_id: str, config_key: str, value: Any) -> None:
    admin = get_admin_client()
    admin.table("admin_config").upsert(
        {
            "venue_id": venue_id,
            "config_key": config_key,
            "config_value": value,
            "updated_at": _now_iso(),
        },
        on_conflict="venue_id,config_key",
    ).execute()


def _ac_delete(venue_id: str, config_key: str) -> None:
    admin = get_admin_client()
    admin.table("admin_config").delete().eq("venue_id", venue_id).eq(
        "config_key", config_key
    ).execute()


# ── GOTD ──────────────────────────────────────────────────────────


def get_gotd(venue_key: str) -> dict | None:
    """Get Game of the Day. Falls back to 'global' if venue_key has none."""
    val = _ac_get(venue_key, "gotd")
    if not val and venue_key != "global":
        val = _ac_get("global", "gotd")
    if not val:
        return None
    # Return shape: {"game_id": str, "mode": str}
    return {
        "game_id": val.get("game_id"),
        "mode": val.get("mode", "manual"),
    }


def set_gotd(venue_key: str, game_id: str, mode: str = "manual") -> None:
    _ac_set(venue_key, "gotd", {"game_id": game_id, "mode": mode})


# ── Staff Picks ───────────────────────────────────────────────────


def get_staff_picks(venue_key: str) -> list[dict]:
    """Get staff picks. Returns [{"game_id": str, "position": int}, ...]. Falls back to global."""
    val = _ac_get(venue_key, "staff_picks")
    if (not val or not val.get("game_ids")) and venue_key != "global":
        val = _ac_get("global", "staff_picks")
    if not val:
        return []
    game_ids = val.get("game_ids") or []
    return [{"game_id": gid, "position": i + 1} for i, gid in enumerate(game_ids)]


def set_staff_picks(venue_key: str, game_ids: list[str]) -> None:
    _ac_set(venue_key, "staff_picks", {"game_ids": list(game_ids)})


# ── Venue config management ───────────────────────────────────────


def delete_venue_config(venue_key: str) -> None:
    """Reset a venue to inherit global home config."""
    _ac_delete(venue_key, "gotd")
    _ac_delete(venue_key, "staff_picks")


def has_custom_config(venue_key: str) -> bool:
    if venue_key in ("global", "_default"):
        return False
    admin = get_admin_client()
    res = (
        admin.table("admin_config")
        .select("config_key")
        .eq("venue_id", venue_key)
        .in_("config_key", ["gotd", "staff_picks"])
        .limit(1)
        .execute()
    )
    return bool(res.data)


def get_configured_venue_keys() -> list[str]:
    """Return venue_ids (other than 'global'/'system') that have custom home config."""
    admin = get_admin_client()
    res = (
        admin.table("admin_config")
        .select("venue_id")
        .in_("config_key", ["gotd", "staff_picks"])
        .execute()
    )
    keys = {
        r["venue_id"]
        for r in (res.data or [])
        if r["venue_id"] not in ("global", "system", "_default")
    }
    return sorted(keys)


def seed_home_config_if_empty() -> None:
    """Seed global + convention defaults if missing."""
    if not _ac_get("global", "gotd"):
        set_gotd("global", "wingspan", "manual")
        set_staff_picks(
            "global",
            [
                "above-and-below",
                "carcassonne",
                "ark-nova",
                "dune-imperium",
                "blood-on-the-clocktower",
                "brass-birmingham",
                "gloomhaven",
                "twilight-imperium-4th-edition",
                "terraforming-mars",
                "castles-of-burgundy",
            ],
        )
        logger.info("Seeded global home config (Supabase)")
    if not _ac_get("convention", "gotd"):
        set_gotd("convention", "wingspan", "manual")
        set_staff_picks(
            "convention",
            ["wyrmspan", "scythe", "viticulture", "tapestry", "expeditions", "wingspan"],
        )
        logger.info("Seeded convention home config (Supabase)")


# ══════════════════════════════════════════════════════════════════
# SYSTEM CONFIG  (meetup_enabled, clear_recent_ts) — admin_config rows
# under venue_id='system'.
# ══════════════════════════════════════════════════════════════════


def get_system_config(key: str, default: Any = None) -> Any:
    val = _ac_get("system", key)
    if val is None:
        return default
    # JSONB stores raw values; we wrap scalars in {"value": ...}
    if isinstance(val, dict) and "value" in val:
        return val["value"]
    return val


def set_system_config(key: str, value: Any) -> bool:
    """Persist a system config value. Returns True on success, False on failure."""
    try:
        _ac_set("system", key, {"value": value})
        return True
    except Exception as e:
        logger.warning(f"set_system_config({key}) failed: {e}")
        return False


def get_meetup_enabled() -> bool:
    return bool(get_system_config("meetup_enabled", False))


def set_meetup_enabled(enabled: bool) -> bool:
    return set_system_config("meetup_enabled", bool(enabled))


def get_clear_recent_ts() -> Optional[str]:
    return get_system_config("clear_recent_ts", None)


def trigger_clear_recent() -> bool:
    return set_system_config("clear_recent_ts", _now_iso())


# ══════════════════════════════════════════════════════════════════
# SEEDING — venue accounts (admin / dicetowerwest / meetup / thaihouse / swp)
# ══════════════════════════════════════════════════════════════════


_DEMO_VENUES = [
    {
        "venue_id": "shallweplay",
        "venue_name": "Shall We Play?",
        "email": "demo@shallweplay.com",
        "username": "swp",
        "tagline": "Game Nights, Events & Community Gaming",
        "accent_color": "#2ecc71",
        "address": "Las Vegas, NV",
        "phone": "",
        "website": "",
    },
]

_DICETOWER_ACCOUNTS = [
    {
        "venue_id": "admin",
        "venue_name": "GameMaster Guide Admin",
        "email": "admin@playgmg.com",
        "password": "watress2",
        "role": "super_admin",
        "tagline": "Admin Account",
    },
    {
        "venue_id": "dicetowerwest",
        "venue_name": "Dice Tower West",
        "email": "dicetowerwest@playgmg.com",
        "password": "watress2",
        "role": "convention",
        "tagline": "Dice Tower West 2026 — Convention Demo",
    },
    {
        "venue_id": "demo-dicetower",
        "venue_name": "Dice Tower West Demo",
        "email": "demo-dicetower@playgmg.com",
        "password": "watress2",
        "role": "demo",
        "tagline": "Dice Tower West 2026 Demo",
    },
    {
        "venue_id": "meetup",
        "venue_name": "Board Games in Henderson",
        "email": "meetup@playgmg.com",
        "password": "bgninhenderson",
        "role": "meetup",
        "tagline": "Game Nights & Community Gaming in Henderson",
    },
    {
        "venue_id": "meetup-admin",
        "venue_name": "Meetup Admin",
        "email": "meetup-admin@playgmg.com",
        "password": "watress2",
        "role": "super_admin",
        "tagline": "Meetup Admin Account",
    },
    {
        "venue_id": "thaihouse",
        "venue_name": "Thai House",
        "email": "demo@thaihouse.com",
        "password": "gmai2026",
        "role": "venue_admin",
        "tagline": "Authentic Thai Cuisine & Board Games",
    },
]


def seed_all_venues(password_hash: str) -> list[str]:
    """Upsert demo venues. Returns venue_ids touched."""
    admin = get_admin_client()
    seeded: list[str] = []
    now = _now_iso()
    for v in _DEMO_VENUES:
        payload = {
            "venue_id": v["venue_id"],
            "venue_name": v["venue_name"],
            "email": v["email"],
            "password_hash": password_hash,
            "tagline": v["tagline"],
            "accent_color": v["accent_color"],
            "address": v.get("address", ""),
            "phone": v.get("phone", ""),
            "website": v.get("website", ""),
            "username": v.get("username"),
            "role": "venue_admin",
            "status": "active",
            "created_at": now,
            "updated_at": now,
        }
        admin.table("venues").upsert(payload, on_conflict="venue_id").execute()
        _turso_mirror_venue_upsert(payload)
        seeded.append(v["venue_id"])
    return seeded


def seed_dicetower_accounts() -> list[str]:
    """Upsert admin + dicetower + meetup + thaihouse accounts."""
    from app.core.auth import hash_password

    admin = get_admin_client()
    seeded: list[str] = []
    now = _now_iso()
    for acct in _DICETOWER_ACCOUNTS:
        pw_hash = hash_password(acct["password"])
        payload = {
            "venue_id": acct["venue_id"],
            "venue_name": acct["venue_name"],
            "email": acct["email"],
            "password_hash": pw_hash,
            "tagline": acct.get("tagline", ""),
            "accent_color": "#e94560",
            "role": acct["role"],
            "source": "dicetower2026",
            "status": "active",
            "created_at": now,
            "updated_at": now,
        }
        admin.table("venues").upsert(payload, on_conflict="venue_id").execute()
        _turso_mirror_venue_upsert(payload)
        seeded.append(acct["venue_id"])
    return seeded
