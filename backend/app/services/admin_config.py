"""
Admin config persistence — three-layer storage:
  1. In-memory cache (fastest, lost on restart)
  2. Local file (content/admin-config.json — survives restart)
  3. GitHub API (survives redeploy, the durable source of truth)
Every save writes to all three. On startup, load from GitHub → local file → hardcoded.
"""
import os
import json
import base64
import logging
from pathlib import Path
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GITHUB_REPO = "AndroidZerg/GameMasterAI"
CONFIG_PATH = "content/admin-config.json"
_LOCAL_CONFIG_PATH = Path(__file__).resolve().parents[3] / "content" / "admin-config.json"

# Hardcoded defaults — these are the FALLBACK if both GitHub and local file are unreachable
HARDCODED_DEFAULTS = {
    "_default": {
        "featured": {"mode": "manual", "game_id": "wingspan"},
        "staff_picks": [
            "wingspan", "azul", "codenames", "root",
            "pandemic", "catan", "ticket-to-ride",
        ],
    }
}

# In-memory cache — survives for the lifetime of the process
_cache: dict = {}
_cache_loaded: bool = False
_github_sha: str = ""


def _github_headers():
    """Return auth headers. Tries both token formats for compatibility."""
    return {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }


def _local_file_read():
    """Read admin-config.json from the local filesystem. Returns config dict or None."""
    try:
        if _LOCAL_CONFIG_PATH.exists():
            content = _LOCAL_CONFIG_PATH.read_text(encoding="utf-8")
            config = json.loads(content)
            return config
    except Exception as e:
        logger.error(f"Local config file read exception: {e}")
    return None


def _local_file_write(config):
    """Write admin-config.json to the local filesystem. Returns True on success."""
    try:
        _LOCAL_CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        _LOCAL_CONFIG_PATH.write_text(
            json.dumps(config, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        logger.info("Local config file write SUCCESS")
        return True
    except Exception as e:
        logger.error(f"Local config file write FAILED: {e}")
        return False


def _github_read():
    """Read admin-config.json from GitHub. Returns (config_dict, sha) or (None, None)."""
    global _github_sha
    if not GITHUB_TOKEN:
        logger.warning("GITHUB_TOKEN not set — using hardcoded defaults")
        return None, None
    try:
        url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{CONFIG_PATH}"
        resp = httpx.get(url, headers=_github_headers(), timeout=15)
        logger.info(f"GitHub config read: status={resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            content = base64.b64decode(data["content"]).decode("utf-8")
            _github_sha = data.get("sha", "")
            config = json.loads(content)
            logger.info(f"GitHub config loaded OK: {len(config)} venue(s), sha={_github_sha[:8]}")
            return config, _github_sha
        elif resp.status_code == 404:
            logger.info("GitHub config file not found — will create on first save")
            return None, None
        else:
            logger.error(f"GitHub config read FAILED: {resp.status_code} {resp.text[:200]}")
            return None, None
    except Exception as e:
        logger.error(f"GitHub config read exception: {e}")
        return None, None


def _github_write(config):
    """Write admin-config.json to GitHub."""
    global _github_sha
    if not GITHUB_TOKEN:
        logger.warning("GITHUB_TOKEN not set — cannot persist config")
        return False
    try:
        url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{CONFIG_PATH}"
        hdrs = _github_headers()

        # Always get fresh SHA to avoid conflicts
        resp = httpx.get(url, headers=hdrs, timeout=10)
        sha = ""
        if resp.status_code == 200:
            sha = resp.json().get("sha", "")

        content_b64 = base64.b64encode(
            json.dumps(config, indent=2, ensure_ascii=False).encode("utf-8")
        ).decode("utf-8")

        body = {
            "message": f"Admin config update {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC",
            "content": content_b64,
        }
        if sha:
            body["sha"] = sha

        resp = httpx.put(url, json=body, headers=hdrs, timeout=20)

        if resp.status_code in (200, 201):
            _github_sha = resp.json().get("content", {}).get("sha", "")
            logger.info(f"GitHub config write SUCCESS — new sha={_github_sha[:8] if _github_sha else '?'}")
            return True
        else:
            logger.error(f"GitHub config write FAILED: {resp.status_code} {resp.text[:300]}")
            return False
    except Exception as e:
        logger.error(f"GitHub config write exception: {e}")
        return False


def load_all():
    """Load config into memory cache. Tries GitHub → local file → hardcoded defaults."""
    global _cache, _cache_loaded

    # 1. Try GitHub (the durable source of truth)
    config, _sha = _github_read()
    if config:
        venue_count = len([k for k in config if k not in ("_system",)])
        logger.info(f"Admin config loaded from GitHub API ({venue_count} venue(s) configured)")
        _cache = config
        _cache_loaded = True
        # Sync local file to match GitHub
        _local_file_write(config)
        return _cache

    # 2. Try local file (survives restart even if GitHub is down)
    config = _local_file_read()
    if config:
        venue_count = len([k for k in config if k not in ("_system",)])
        logger.warning(f"GitHub API unavailable, loaded admin config from local file ({venue_count} venue(s) configured)")
        _cache = config
        _cache_loaded = True
        return _cache

    # 3. Hardcoded fallback
    logger.warning("Both GitHub and local file unavailable, using hardcoded fallback")
    _cache = json.loads(json.dumps(HARDCODED_DEFAULTS))
    _cache_loaded = True
    return _cache


def get_venue_config(venue_id=None, role=None):
    """Get config for a venue. Falls back to role-based key, then _default."""
    if not _cache_loaded:
        load_all()

    # 1. Exact venue_id match
    if venue_id and venue_id in _cache:
        return _cache[venue_id]
    # 2. Role-based fallback (e.g. convention accounts with conv-xxx IDs)
    if role and role in _cache:
        return _cache[role]
    return _cache.get("_default", HARDCODED_DEFAULTS["_default"])


def has_custom_config(venue_id):
    """Check if a venue has its own custom config (not using defaults)."""
    if not _cache_loaded:
        load_all()
    return venue_id in _cache and venue_id not in ("_default", "_system")


def delete_venue_config(venue_id):
    """Remove custom config for a venue, reverting to defaults. Returns sync_status dict."""
    global _cache_loaded
    if not _cache_loaded:
        load_all()

    if venue_id in _cache and venue_id not in ("_default", "_system"):
        del _cache[venue_id]

        local_ok = _local_file_write(_cache)
        github_ok = _github_write(_cache)
        if not github_ok:
            logger.error(f"FAILED to persist config deletion for '{venue_id}' to GitHub")

        return {"deleted": True, "sync_status": {"memory": True, "local_file": local_ok, "github": github_ok}}
    return {"deleted": False, "sync_status": {"memory": True, "local_file": True, "github": True}}


def save_venue_config(venue_id, config):
    """Save config for a venue to all three storage layers. Returns sync_status dict."""
    global _cache_loaded
    if not _cache_loaded:
        load_all()

    # 1. In-memory cache (always succeeds)
    _cache[venue_id] = config
    memory_ok = True

    # 2. Local file — write the FULL config
    local_ok = _local_file_write(_cache)

    # 3. GitHub — write the FULL config
    github_ok = _github_write(_cache)
    if not github_ok:
        logger.error(f"FAILED to persist config for venue '{venue_id}' to GitHub!")

    return {"memory": memory_ok, "local_file": local_ok, "github": github_ok}


def get_featured(venue_id=None, role=None):
    cfg = get_venue_config(venue_id, role=role)
    return cfg.get("featured", {"mode": "manual", "game_id": "wingspan"})


def set_featured(venue_id, featured_config):
    cfg = get_venue_config(venue_id)
    if isinstance(cfg, dict):
        cfg = cfg.copy()
    else:
        cfg = {}
    cfg["featured"] = featured_config
    return save_venue_config(venue_id if venue_id else "_default", cfg)


def get_staff_picks(venue_id=None, role=None):
    cfg = get_venue_config(venue_id, role=role)
    return cfg.get("staff_picks", HARDCODED_DEFAULTS["_default"]["staff_picks"])


def set_staff_picks(venue_id, picks):
    cfg = get_venue_config(venue_id)
    if isinstance(cfg, dict):
        cfg = cfg.copy()
    else:
        cfg = {}
    cfg["staff_picks"] = picks
    return save_venue_config(venue_id if venue_id else "_default", cfg)


# ── Meetup Toggle ─────────────────────────────────────────────────

def get_meetup_enabled() -> bool:
    """Check if the meetup account is currently enabled. Defaults to False."""
    if not _cache_loaded:
        load_all()
    return _cache.get("_system", {}).get("meetup_enabled", False)


def set_meetup_enabled(enabled: bool) -> bool:
    """Set the meetup toggle. Persists to local file + GitHub."""
    global _cache_loaded
    if not _cache_loaded:
        load_all()

    system_cfg = _cache.get("_system", {})
    system_cfg["meetup_enabled"] = enabled
    _cache["_system"] = system_cfg

    _local_file_write(_cache)
    success = _github_write(_cache)
    if not success:
        logger.error("FAILED to persist meetup toggle to GitHub — in-memory + local file only")
    # Always return True — in-memory state is updated even if GitHub write fails
    return True


# ── Clear Recently Played ────────────────────────────────────────

def get_clear_recent_ts():
    """Get the timestamp when recently-played was last cleared. Returns str or None."""
    if not _cache_loaded:
        load_all()
    return _cache.get("_system", {}).get("clear_recent_ts")


def trigger_clear_recent() -> bool:
    """Set a timestamp to signal all clients to clear their recently-played list."""
    global _cache_loaded
    if not _cache_loaded:
        load_all()

    system_cfg = _cache.get("_system", {})
    system_cfg["clear_recent_ts"] = datetime.now(timezone.utc).isoformat()
    _cache["_system"] = system_cfg

    _local_file_write(_cache)
    success = _github_write(_cache)
    if not success:
        logger.error("FAILED to persist clear_recent_ts to GitHub — in-memory + local file only")
    return True
