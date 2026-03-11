"""
Admin config — system-level settings (meetup toggle, clear-recent).

GOTD and Staff Picks have moved to venue_config.py (Turso-backed).
This file only handles system-level settings persisted to local JSON.
"""

import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

_LOCAL_CONFIG_PATH = Path(__file__).resolve().parents[3] / "content" / "admin-config.json"

_system_cache: dict = {}  # meetup_enabled, clear_recent_ts


def load_all():
    """Load system settings from local file on startup."""
    try:
        if _LOCAL_CONFIG_PATH.exists():
            content = _LOCAL_CONFIG_PATH.read_text(encoding="utf-8")
            config = json.loads(content)
            sys_cfg = config.get("_system", {})
            _system_cache.update(sys_cfg)
    except Exception:
        pass
    logger.info("System config loaded")
    return _system_cache


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
