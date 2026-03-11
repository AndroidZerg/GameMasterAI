"""
Admin config persistence — Turso-backed with in-memory TTL cache.

Storage layers:
  1. In-memory cache (fastest, 60-second TTL)
  2. Turso database (durable, survives redeploy)
  3. Local file seed (content/admin-config.json — one-time migration source)
"""
import json
import logging
import time
from pathlib import Path

logger = logging.getLogger(__name__)

_LOCAL_CONFIG_PATH = Path(__file__).resolve().parents[3] / "content" / "admin-config.json"

# Hardcoded defaults — fallback if Turso is empty and no local file
HARDCODED_DEFAULTS = {
    "_default": {
        "featured": {"mode": "manual", "game_id": "wingspan"},
        "staff_picks": [
            "wingspan", "azul", "codenames", "root",
            "pandemic", "catan", "ticket-to-ride",
        ],
    }
}

# ── In-memory cache with 60-second TTL ──────────────────────────
_cache: dict = {}  # venue_key -> {"featured": {...}, "staff_picks": [...]}
_cache_ts: dict = {}  # venue_key -> timestamp of last load
_CACHE_TTL = 60  # seconds
_system_cache: dict = {}  # system-level settings (meetup_enabled, clear_recent_ts)
_initial_load_done: bool = False


def _is_cache_valid(venue_key: str) -> bool:
    return venue_key in _cache and (time.time() - _cache_ts.get(venue_key, 0)) < _CACHE_TTL


def _cache_set(venue_key: str, config: dict):
    _cache[venue_key] = config
    _cache_ts[venue_key] = time.time()


def _cache_invalidate(venue_key: str):
    _cache.pop(venue_key, None)
    _cache_ts.pop(venue_key, None)


# ── Turso operations (lazy import to avoid circular deps) ────────

def _turso():
    from app.services.turso import (
        get_turso_staff_picks, set_turso_staff_picks,
        get_turso_gotd, set_turso_gotd,
        delete_turso_venue_config, has_turso_venue_config,
    )
    return {
        "get_picks": get_turso_staff_picks,
        "set_picks": set_turso_staff_picks,
        "get_gotd": get_turso_gotd,
        "set_gotd": set_turso_gotd,
        "delete": delete_turso_venue_config,
        "has_config": has_turso_venue_config,
    }


def _load_venue_from_turso(venue_key: str) -> dict | None:
    """Load a venue's config from Turso. Returns None if no config exists."""
    t = _turso()
    picks = t["get_picks"](venue_key)
    gotd = t["get_gotd"](venue_key)
    if not picks and not gotd:
        return None
    config = {}
    if picks:
        config["staff_picks"] = picks
    if gotd:
        config["featured"] = gotd
    else:
        config["featured"] = {"mode": "manual", "game_id": "wingspan"}
    return config


def _seed_from_local_file():
    """One-time migration: seed Turso from admin-config.json if Turso tables are empty."""
    t = _turso()
    # Check if Turso already has data for _default
    if t["has_config"]("_default"):
        logger.info("Turso admin config already seeded, skipping migration")
        return

    # Try reading local file
    config = None
    try:
        if _LOCAL_CONFIG_PATH.exists():
            content = _LOCAL_CONFIG_PATH.read_text(encoding="utf-8")
            config = json.loads(content)
            logger.info(f"Read admin-config.json for migration: {len(config)} key(s)")
    except Exception as e:
        logger.warning(f"Could not read admin-config.json for migration: {e}")

    if not config:
        config = HARDCODED_DEFAULTS

    # Seed each venue key into Turso
    for venue_key, venue_cfg in config.items():
        if venue_key.startswith("_system"):
            continue
        picks = venue_cfg.get("staff_picks", [])
        featured = venue_cfg.get("featured", {})
        if picks:
            t["set_picks"](venue_key, picks)
        if featured.get("game_id"):
            t["set_gotd"](venue_key, featured["game_id"], featured.get("mode", "manual"))
        elif featured.get("mode") == "auto":
            t["set_gotd"](venue_key, "", "auto")

    # Also migrate system settings to the system cache
    system_cfg = config.get("_system", {})
    if system_cfg:
        _system_cache.update(system_cfg)

    logger.info("Turso admin config seeded from local file / defaults")


# ── Public API (same contract as before) ─────────────────────────

def load_all():
    """Load config on startup. Seeds Turso from local file if needed. Returns cache dict."""
    global _initial_load_done

    # Initialize Turso tables
    from app.services.turso import init_admin_config_tables
    init_admin_config_tables()

    # One-time seed from local file
    _seed_from_local_file()

    # Load system settings from local file (meetup_enabled, clear_recent_ts)
    try:
        if _LOCAL_CONFIG_PATH.exists():
            content = _LOCAL_CONFIG_PATH.read_text(encoding="utf-8")
            config = json.loads(content)
            sys_cfg = config.get("_system", {})
            _system_cache.update(sys_cfg)
    except Exception:
        pass

    # Pre-load _default into cache
    default_cfg = _load_venue_from_turso("_default")
    if default_cfg:
        _cache_set("_default", default_cfg)
    else:
        _cache_set("_default", HARDCODED_DEFAULTS["_default"])

    _initial_load_done = True
    logger.info("Admin config loaded from Turso")
    return {"_default": _cache.get("_default", {})}


def get_venue_config(venue_id=None, role=None):
    """Get config for a venue. Falls back to role-based key, then _default."""
    if not _initial_load_done:
        load_all()

    # 1. Exact venue_id match
    if venue_id:
        key = venue_id
        if _is_cache_valid(key):
            return _cache[key]
        cfg = _load_venue_from_turso(key)
        if cfg:
            _cache_set(key, cfg)
            return cfg

    # 2. Role-based fallback
    if role:
        key = role
        if _is_cache_valid(key):
            return _cache[key]
        cfg = _load_venue_from_turso(key)
        if cfg:
            _cache_set(key, cfg)
            return cfg

    # 3. _default fallback
    if _is_cache_valid("_default"):
        return _cache["_default"]
    cfg = _load_venue_from_turso("_default")
    if cfg:
        _cache_set("_default", cfg)
        return cfg
    return HARDCODED_DEFAULTS["_default"]


def has_custom_config(venue_id):
    """Check if a venue has its own custom config (not using defaults)."""
    if not _initial_load_done:
        load_all()
    if venue_id in ("_default", "_system"):
        return False
    t = _turso()
    return t["has_config"](venue_id)


def delete_venue_config(venue_id):
    """Remove custom config for a venue, reverting to defaults."""
    if not _initial_load_done:
        load_all()

    t = _turso()
    t["delete"](venue_id)
    _cache_invalidate(venue_id)
    return {"deleted": True, "sync_status": {"memory": True, "turso": True}}


def save_venue_config(venue_id, config):
    """Save config for a venue to Turso + cache."""
    if not _initial_load_done:
        load_all()

    key = venue_id if venue_id else "_default"
    t = _turso()

    picks = config.get("staff_picks")
    featured = config.get("featured")

    if picks is not None:
        t["set_picks"](key, picks)
    if featured is not None:
        game_id = featured.get("game_id", "")
        mode = featured.get("mode", "manual")
        if game_id or mode == "auto":
            t["set_gotd"](key, game_id, mode)

    _cache_invalidate(key)
    return {"memory": True, "turso": True}


def get_featured(venue_id=None, role=None):
    cfg = get_venue_config(venue_id, role=role)
    return cfg.get("featured", {"mode": "manual", "game_id": "wingspan"})


def set_featured(venue_id, featured_config):
    key = venue_id if venue_id else "_default"
    # Get existing config to preserve staff_picks
    cfg = get_venue_config(venue_id)
    if isinstance(cfg, dict):
        cfg = cfg.copy()
    else:
        cfg = {}
    cfg["featured"] = featured_config
    return save_venue_config(key, cfg)


def get_staff_picks(venue_id=None, role=None):
    cfg = get_venue_config(venue_id, role=role)
    return cfg.get("staff_picks", HARDCODED_DEFAULTS["_default"]["staff_picks"])


def set_staff_picks(venue_id, picks):
    key = venue_id if venue_id else "_default"
    # Get existing config to preserve featured
    cfg = get_venue_config(venue_id)
    if isinstance(cfg, dict):
        cfg = cfg.copy()
    else:
        cfg = {}
    cfg["staff_picks"] = picks
    return save_venue_config(key, cfg)


# ── Meetup Toggle ─────────────────────────────────────────────────

def get_meetup_enabled() -> bool:
    """Check if the meetup account is currently enabled. Defaults to False."""
    return _system_cache.get("meetup_enabled", False)


def set_meetup_enabled(enabled: bool) -> bool:
    """Set the meetup toggle. Persists to local file."""
    _system_cache["meetup_enabled"] = enabled
    _persist_system_cache()
    return True


# ── Clear Recently Played ────────────────────────────────────────

def get_clear_recent_ts():
    """Get the timestamp when recently-played was last cleared. Returns str or None."""
    return _system_cache.get("clear_recent_ts")


def trigger_clear_recent() -> bool:
    """Set a timestamp to signal all clients to clear their recently-played list."""
    from datetime import datetime, timezone
    _system_cache["clear_recent_ts"] = datetime.now(timezone.utc).isoformat()
    _persist_system_cache()
    return True


def _persist_system_cache():
    """Write system cache to local file for persistence across restarts."""
    try:
        config = {}
        if _LOCAL_CONFIG_PATH.exists():
            content = _LOCAL_CONFIG_PATH.read_text(encoding="utf-8")
            config = json.loads(content)
        config["_system"] = _system_cache
        _LOCAL_CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        _LOCAL_CONFIG_PATH.write_text(
            json.dumps(config, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    except Exception as e:
        logger.error(f"Failed to persist system cache: {e}")
