"""
Admin config persistence via GitHub API.
This is the ONLY source of truth for admin config.
No SQLite. No JSON files. GitHub repo is the database.
"""
import os
import json
import base64
import logging
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GITHUB_REPO = os.environ.get("GITHUB_REPO", "AndroidZerg/GameMasterAI")
CONFIG_PATH = "content/admin-config.json"

# Hardcoded defaults — FALLBACK if GitHub is unreachable
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


def _github_read():
    """Read admin-config.json from GitHub. Returns (config_dict, sha) or (None, None)."""
    global _github_sha
    if not GITHUB_TOKEN:
        logger.warning("No GITHUB_TOKEN set — using hardcoded defaults")
        return None, None
    try:
        url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{CONFIG_PATH}"
        resp = httpx.get(url, headers={
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
        }, timeout=15)
        logger.info(f"GitHub read: status={resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            content = base64.b64decode(data["content"]).decode("utf-8")
            _github_sha = data.get("sha", "")
            config = json.loads(content)
            logger.info(f"GitHub config loaded: {len(config)} venue(s), sha={_github_sha[:8]}")
            return config, _github_sha
        elif resp.status_code == 404:
            logger.info("GitHub config file not found — will create on first save")
            return None, None
        else:
            logger.error(f"GitHub read failed: {resp.status_code} {resp.text[:200]}")
            return None, None
    except Exception as e:
        logger.error(f"GitHub read exception: {e}")
        return None, None


def _github_write(config):
    """Write admin-config.json to GitHub."""
    global _github_sha
    if not GITHUB_TOKEN:
        logger.warning("No GITHUB_TOKEN — cannot persist config")
        return False
    try:
        url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{CONFIG_PATH}"
        headers = {
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
        }

        # Always get fresh SHA to avoid conflicts
        resp = httpx.get(url, headers=headers, timeout=10)
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

        resp = httpx.put(url, json=body, headers=headers, timeout=20)

        if resp.status_code in (200, 201):
            _github_sha = resp.json().get("content", {}).get("sha", "")
            logger.info(f"GitHub write SUCCESS — new sha={_github_sha[:8] if _github_sha else 'unknown'}")
            return True
        else:
            logger.error(f"GitHub write FAILED: {resp.status_code} {resp.text[:300]}")
            return False
    except Exception as e:
        logger.error(f"GitHub write exception: {e}")
        return False


def load_all():
    """Load config from GitHub into memory cache. Call on startup."""
    global _cache, _cache_loaded

    config, sha = _github_read()
    if config:
        _cache = config
        _cache_loaded = True
        logger.info(f"Config loaded from GitHub: {list(_cache.keys())}")
    else:
        _cache = json.loads(json.dumps(HARDCODED_DEFAULTS))
        _cache_loaded = True
        logger.warning("Using hardcoded defaults — GitHub unavailable or empty")

    return _cache


def get_venue_config(venue_id=None):
    """Get config for a venue. Falls back to _default."""
    if not _cache_loaded:
        load_all()

    if venue_id and venue_id in _cache:
        return _cache[venue_id]
    return _cache.get("_default", HARDCODED_DEFAULTS["_default"])


def save_venue_config(venue_id, config):
    """Save config for a venue to cache + GitHub."""
    global _cache_loaded
    if not _cache_loaded:
        load_all()

    _cache[venue_id] = config

    # Write entire config to GitHub
    success = _github_write(_cache)
    if not success:
        logger.error(f"FAILED to persist config for {venue_id} to GitHub!")

    return success


def get_featured(venue_id=None):
    cfg = get_venue_config(venue_id)
    return cfg.get("featured", {"mode": "manual", "game_id": "wingspan"})


def set_featured(venue_id, featured_config):
    cfg = get_venue_config(venue_id)
    if isinstance(cfg, dict):
        cfg = cfg.copy()
    else:
        cfg = {}
    cfg["featured"] = featured_config
    save_venue_config(venue_id if venue_id else "_default", cfg)


def get_staff_picks(venue_id=None):
    cfg = get_venue_config(venue_id)
    return cfg.get("staff_picks", HARDCODED_DEFAULTS["_default"]["staff_picks"])


def set_staff_picks(venue_id, picks):
    cfg = get_venue_config(venue_id)
    if isinstance(cfg, dict):
        cfg = cfg.copy()
    else:
        cfg = {}
    cfg["staff_picks"] = picks
    save_venue_config(venue_id if venue_id else "_default", cfg)
