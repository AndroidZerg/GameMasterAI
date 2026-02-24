"""Persistent admin config via GitHub API — survives Render ephemeral deploys.

Reads/writes content/admin-config.json in the GitHub repo.
Uses an in-memory cache so reads are instant; writes push to GitHub.
"""

import base64
import json
import os
from pathlib import Path

import httpx

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GITHUB_REPO = os.environ.get("GITHUB_REPO", "AndroidZerg/GameMasterAI")
CONFIG_PATH = "content/admin-config.json"

_DEFAULT_CONFIG = {
    "_default": {
        "featured": {"mode": "auto"},
        "staff_picks": [
            "wingspan", "azul", "codenames", "root",
            "the-crew", "patchwork", "quacks-of-quedlinburg", "7-wonders-duel",
        ],
    }
}

# In-memory cache (populated on first read, updated on writes)
_cache: dict = {}
_sha: str = ""

# Local file fallback (works in dev and as initial seed on deploy)
_LOCAL_PATH = Path(__file__).resolve().parents[3] / "content" / "admin-config.json"


def _read_local() -> dict:
    """Read config from local file (dev mode or initial deploy seed)."""
    try:
        if _LOCAL_PATH.exists():
            return json.loads(_LOCAL_PATH.read_text(encoding="utf-8"))
    except Exception:
        pass
    return dict(_DEFAULT_CONFIG)


def _read_github() -> tuple[dict, str]:
    """Fetch admin-config.json from GitHub. Returns (config_dict, file_sha)."""
    if not GITHUB_TOKEN:
        return {}, ""
    try:
        resp = httpx.get(
            f"https://api.github.com/repos/{GITHUB_REPO}/contents/{CONFIG_PATH}",
            headers={
                "Authorization": f"Bearer {GITHUB_TOKEN}",
                "Accept": "application/vnd.github.v3+json",
            },
            timeout=15,
        )
        if resp.status_code == 200:
            data = resp.json()
            content = base64.b64decode(data["content"]).decode("utf-8")
            return json.loads(content), data["sha"]
    except Exception:
        pass
    return {}, ""


def _write_github(config: dict) -> bool:
    """Commit updated admin-config.json to GitHub. Returns True on success."""
    global _sha
    if not GITHUB_TOKEN:
        return False
    try:
        # Get current SHA if we don't have it
        if not _sha:
            _, _sha = _read_github()

        url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{CONFIG_PATH}"
        payload = {
            "message": "Auto: Update admin config",
            "content": base64.b64encode(
                (json.dumps(config, indent=2) + "\n").encode("utf-8")
            ).decode("utf-8"),
        }
        if _sha:
            payload["sha"] = _sha

        resp = httpx.put(
            url,
            json=payload,
            headers={
                "Authorization": f"Bearer {GITHUB_TOKEN}",
                "Accept": "application/vnd.github.v3+json",
            },
            timeout=15,
        )
        if resp.status_code in (200, 201):
            _sha = resp.json().get("content", {}).get("sha", _sha)
            return True
    except Exception:
        pass
    return False


def load_admin_config() -> dict:
    """Load admin config. Uses cache → GitHub → local file → defaults."""
    global _cache, _sha

    if _cache:
        return _cache

    # Try GitHub first (production)
    if GITHUB_TOKEN:
        gh_config, gh_sha = _read_github()
        if gh_config:
            _cache = gh_config
            _sha = gh_sha
            return _cache

    # Fall back to local file (dev or initial deploy)
    _cache = _read_local()
    return _cache


def save_admin_config(config: dict):
    """Save admin config to cache + GitHub (async-safe). Also writes local file."""
    global _cache
    _cache = config

    # Write local file (always, for dev and as backup)
    try:
        _LOCAL_PATH.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
    except Exception:
        pass

    # Push to GitHub (production — persists across deploys)
    _write_github(config)


def get_venue_config(venue_id: str | None = None) -> dict:
    """Get admin config for a specific venue, falling back to _default."""
    config = load_admin_config()
    if venue_id and venue_id in config:
        return config[venue_id]
    return config.get("_default", _DEFAULT_CONFIG["_default"])
