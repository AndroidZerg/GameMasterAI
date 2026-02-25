"""Persistent admin config — SQLite primary + GitHub API backup.

On startup: SQLite → GitHub → defaults (first non-empty wins).
On save: write to SQLite (fast) + GitHub API (survives Render deploys).
In-memory cache for instant reads.
"""

import base64
import json
import logging
import os
import sqlite3
from datetime import datetime, timezone

import httpx

from app.core.config import DB_PATH

logger = logging.getLogger(__name__)

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GITHUB_REPO = os.environ.get("GITHUB_REPO", "AndroidZerg/GameMasterAI")
CONFIG_PATH = "content/admin-config.json"

DEFAULT_CONFIG = {
    "_default": {
        "featured": {"mode": "auto"},
        "staff_picks": [
            "wingspan", "azul", "codenames", "root",
            "the-crew", "patchwork", "quacks-of-quedlinburg", "7-wonders-duel",
        ],
    }
}

# In-memory cache
_cache: dict = {}
_github_sha: str = ""


def _get_db():
    db = sqlite3.connect(DB_PATH)
    db.execute("""
        CREATE TABLE IF NOT EXISTS admin_config (
            venue_id TEXT PRIMARY KEY,
            config_json TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    db.commit()
    return db


def _github_read() -> tuple[dict, str]:
    """Read config from GitHub repo. Returns (config_dict, sha)."""
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
    except Exception as e:
        logger.warning(f"GitHub config read failed: {e}")
    return {}, ""


def _github_write(config: dict):
    """Commit config to GitHub for cross-deploy persistence."""
    global _github_sha
    if not GITHUB_TOKEN:
        return
    try:
        url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{CONFIG_PATH}"
        headers = {
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
        }

        # Get current SHA if we don't have it
        if not _github_sha:
            resp = httpx.get(url, headers=headers, timeout=10)
            if resp.status_code == 200:
                _github_sha = resp.json().get("sha", "")

        payload = {
            "message": f"Auto: admin config update {datetime.now(timezone.utc).isoformat()[:19]}",
            "content": base64.b64encode(
                (json.dumps(config, indent=2) + "\n").encode("utf-8")
            ).decode("utf-8"),
        }
        if _github_sha:
            payload["sha"] = _github_sha

        resp = httpx.put(url, json=payload, headers=headers, timeout=15)
        if resp.status_code in (200, 201):
            _github_sha = resp.json().get("content", {}).get("sha", _github_sha)
            logger.info("GitHub config write successful")
        else:
            logger.warning(f"GitHub config write failed: {resp.status_code}")
    except Exception as e:
        logger.warning(f"GitHub config write error: {e}")


def _load_all():
    """Load config on startup: SQLite → GitHub → defaults."""
    global _cache, _github_sha

    # 1. Try SQLite
    try:
        db = _get_db()
        rows = db.execute("SELECT venue_id, config_json FROM admin_config").fetchall()
        db.close()
        if rows:
            for venue_id, config_json in rows:
                _cache[venue_id] = json.loads(config_json)
            logger.info(f"Admin config loaded from SQLite ({len(rows)} venue(s))")
            return
    except Exception as e:
        logger.warning(f"SQLite config read failed: {e}")

    # 2. SQLite empty → try GitHub
    gh_config, gh_sha = _github_read()
    if gh_config:
        _cache = gh_config
        _github_sha = gh_sha
        # Seed SQLite from GitHub
        try:
            db = _get_db()
            now = datetime.now(timezone.utc).isoformat()
            for venue_id, cfg in gh_config.items():
                db.execute(
                    "INSERT OR REPLACE INTO admin_config (venue_id, config_json, updated_at) VALUES (?, ?, ?)",
                    (venue_id, json.dumps(cfg), now),
                )
            db.commit()
            db.close()
        except Exception as e:
            logger.warning(f"SQLite seed from GitHub failed: {e}")
        logger.info(f"Admin config loaded from GitHub ({len(gh_config)} venue(s))")
        return

    # 3. Nothing → use defaults
    _cache = dict(DEFAULT_CONFIG)
    logger.info("Admin config using defaults")


# ── Public API ──────────────────────────────────────────────────

def get_venue_config(venue_id: str | None = None) -> dict:
    """Get config for a specific venue, with fallback to _default."""
    if not _cache:
        _load_all()
    if venue_id and venue_id in _cache:
        return _cache[venue_id]
    return _cache.get("_default", DEFAULT_CONFIG["_default"])


def save_venue_config(venue_id: str, config: dict):
    """Save config to cache + SQLite + GitHub."""
    global _cache

    if not _cache:
        _load_all()

    _cache[venue_id] = config

    # Write to SQLite (primary)
    try:
        db = _get_db()
        db.execute(
            "INSERT OR REPLACE INTO admin_config (venue_id, config_json, updated_at) VALUES (?, ?, ?)",
            (venue_id, json.dumps(config), datetime.now(timezone.utc).isoformat()),
        )
        db.commit()
        db.close()
    except Exception as e:
        logger.warning(f"SQLite config write failed: {e}")

    # Write to GitHub (backup — don't block on failure)
    try:
        _github_write(_cache)
    except Exception:
        pass


def load_admin_config() -> dict:
    """Load full config dict (all venues). For admin write endpoints."""
    if not _cache:
        _load_all()
    return _cache


def save_admin_config(config: dict):
    """Save full config dict. Writes all venues to SQLite + GitHub."""
    global _cache
    _cache = config

    try:
        db = _get_db()
        now = datetime.now(timezone.utc).isoformat()
        for venue_id, cfg in config.items():
            db.execute(
                "INSERT OR REPLACE INTO admin_config (venue_id, config_json, updated_at) VALUES (?, ?, ?)",
                (venue_id, json.dumps(cfg), now),
            )
        db.commit()
        db.close()
    except Exception as e:
        logger.warning(f"SQLite full config write failed: {e}")

    try:
        _github_write(config)
    except Exception:
        pass


def get_featured(venue_id: str | None = None) -> dict:
    cfg = get_venue_config(venue_id)
    return cfg.get("featured", {"mode": "auto"})


def set_featured(venue_id: str, featured: dict):
    cfg = get_venue_config(venue_id).copy()
    cfg["featured"] = featured
    save_venue_config(venue_id, cfg)


def get_staff_picks(venue_id: str | None = None) -> list:
    cfg = get_venue_config(venue_id)
    return cfg.get("staff_picks", DEFAULT_CONFIG["_default"]["staff_picks"])


def set_staff_picks(venue_id: str, picks: list):
    cfg = get_venue_config(venue_id).copy()
    cfg["staff_picks"] = picks
    save_venue_config(venue_id, cfg)
