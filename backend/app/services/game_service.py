"""
Game content service — Supabase-backed with in-memory cache.

Replaces the old `app.models.game` (SQLite scan of JSON files) and
`app.services.knowledge.load_game` (direct JSON file reads). Game data
lives in Supabase Postgres (`public.games` table) and is fetched once
into a process-local cache with a 5 minute TTL.

Public API:
    get_all_games()                       -> list[dict]   (full rows, reshaped)
    get_game(game_id)                     -> dict | None
    list_games(search, complexity)        -> list[dict]   (summary view)
    filter_games(...)                     -> list[dict]
    get_quick_games(max_time)             -> list[dict]
    get_all_categories()                  -> list[dict]
    search_by_publisher_tag(tag, ...)     -> list[dict]
    search_limited_library(...)           -> list[dict]
    search_games_fuzzy(query)             -> list[dict]
    get_game_for_llm(game_id)             -> str | None
    get_msrp(game_id)                     -> float | None
    create_or_update_game(data)           -> dict
    invalidate_cache()                    -> None

The "summary view" matches the legacy `_row_to_dict` shape from
`app.models.game` so the frontend keeps working without changes.
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Any, Optional

from app.services.supabase_client import get_admin_client

logger = logging.getLogger(__name__)

# ── In-memory cache ──────────────────────────────────────────────
_full_cache: list[dict] = []
_by_id_cache: dict[str, dict] = {}
_cache_ts: float = 0.0
CACHE_TTL_SECONDS = 60  # 1 minute — Wave 4: shorter TTL so writes propagate fast

# ── MSRP prices (loaded once from disk — small JSON) ─────────────
_MSRP_PRICES: dict[str, float] = {}
_MSRP_LOADED = False


def _load_msrp_once():
    global _MSRP_PRICES, _MSRP_LOADED
    if _MSRP_LOADED:
        return
    msrp_path = Path(__file__).resolve().parents[3] / "content" / "msrp-prices.json"
    if msrp_path.exists():
        try:
            _MSRP_PRICES = json.loads(msrp_path.read_text(encoding="utf-8"))
        except Exception as e:
            logger.warning(f"Failed to load msrp-prices.json: {e}")
            _MSRP_PRICES = {}
    _MSRP_LOADED = True


def get_msrp(game_id: str) -> Optional[float]:
    _load_msrp_once()
    return _MSRP_PRICES.get(game_id)


# ── Cache management ─────────────────────────────────────────────


def _is_cache_fresh() -> bool:
    return _full_cache and (time.time() - _cache_ts) < CACHE_TTL_SECONDS


def _refresh_cache():
    """Pull every game from Supabase. Called on cold start and on cache miss."""
    global _full_cache, _by_id_cache, _cache_ts
    admin = get_admin_client()
    # Supabase default page size is 1000 rows; we have ~311 games.
    result = admin.table("games").select("*").execute()
    rows = result.data or []
    reshaped = [_reshape_full(r) for r in rows]
    _full_cache = reshaped
    _by_id_cache = {g["game_id"]: g for g in reshaped}
    _cache_ts = time.time()
    logger.info(f"game_service cache refreshed: {len(reshaped)} games")


def invalidate_cache():
    """Force a refresh on the next read. Call after any direct write."""
    global _cache_ts
    _cache_ts = 0.0


def _ensure_cache():
    if not _is_cache_fresh():
        _refresh_cache()


# ── Reshape Supabase row -> JSON-file shape ──────────────────────


def _reshape_full(row: dict) -> dict:
    """Convert a Supabase `games` row into the legacy JSON-file shape.

    The frontend (GameTeacher.jsx) and the LLM query route both expect the
    nested `player_count`, `play_time_minutes`, and `metadata` objects from
    the original schema-v2 JSON files.
    """
    return {
        "game_id": row.get("game_id"),
        "title": row.get("title"),
        "aliases": row.get("aliases") or [],
        "publisher": row.get("publisher"),
        "publisher_tag": row.get("publisher_tag") or "",
        "publisher_approved": bool(row.get("publisher_approved")),
        "public_domain": bool(row.get("public_domain")),
        "image": row.get("image"),
        "player_count": {
            "min": row.get("player_count_min") or 0,
            "max": row.get("player_count_max") or 0,
            "recommended": row.get("player_count_recommended"),
            "expansion_max": row.get("expansion_max"),
        },
        "play_time_minutes": {
            "min": row.get("play_time_min") or 0,
            "max": row.get("play_time_max") or 0,
        },
        "complexity": row.get("complexity") or "",
        "categories": row.get("categories") or [],
        "source_url": row.get("source_url"),
        "source_verified": bool(row.get("source_verified")),
        "bgg_id": row.get("bgg_id"),
        "total_token_count": row.get("total_token_count") or 0,
        "tabs": row.get("tabs") or {},
        "rules_citations": row.get("rules_citations") or {},
        "extensions": row.get("extensions") or {},
        "teaching": row.get("teaching") or {},
        "score_config": row.get("score_config") or {},
        "metadata": {
            "schema_version": row.get("schema_version"),
            "created_by": row.get("created_by"),
            "created_at": row.get("created_at"),
            "validated_by": row.get("validated_by"),
            "validated_at": row.get("validated_at"),
            "validation_status": row.get("validation_status"),
            "revision": row.get("revision"),
            "notes": row.get("notes"),
        },
    }


# ── Tag generation (ported from app.models.game._generate_tags) ──


def _generate_tags(game: dict) -> list[str]:
    """Generate 'Best For' tags based on game metadata."""
    tags: list[str] = []
    pc = game.get("player_count") or {}
    pt = game.get("play_time_minutes") or {}
    pmin = pc.get("min") or 0
    pmax = pc.get("max") or 0
    complexity = game.get("complexity") or ""
    pt_max = pt.get("max") or 0
    cats_lower = [c.lower() for c in (game.get("categories") or [])]

    if pmin == 1:
        tags.append("Solo")
    if pmin == 2 and pmax == 2:
        tags.append("Great for 2")
    elif pmin <= 2 and pmax >= 2:
        tags.append("Great for 2")
    if complexity in ("party", "gateway"):
        tags.append("Family Friendly")
    if complexity == "party":
        tags.append("Party Game")
    if complexity == "heavy":
        tags.append("Brain Burner")
    if pt_max and pt_max > 0 and pt_max <= 30:
        tags.append("Quick Play")
    if "cooperative" in cats_lower or "co-operative" in cats_lower:
        tags.append("Cooperative")
    if "deduction" in cats_lower:
        tags.append("Mystery/Deduction")
    if pmax and pmax >= 6:
        tags.append("Large Group")

    return tags


def _to_summary(game: dict) -> dict:
    """Produce the legacy summary shape returned by `app.models.game._row_to_dict`."""
    pc = game.get("player_count") or {}
    pt = game.get("play_time_minutes") or {}
    game_id = game.get("game_id")
    result = {
        "game_id": game_id,
        "title": game.get("title"),
        "aliases": game.get("aliases") or [],
        "player_count": {"min": pc.get("min") or 0, "max": pc.get("max") or 0},
        "play_time_minutes": {"min": pt.get("min") or 0, "max": pt.get("max") or 0},
        "complexity": game.get("complexity") or "",
        "categories": game.get("categories") or [],
        "tags": _generate_tags(game),
        "public_domain": bool(game.get("public_domain")),
        "publisher_approved": bool(game.get("publisher_approved")),
    }
    msrp = get_msrp(game_id)
    if msrp is not None:
        result["msrp"] = msrp
    return result


# ── Public read API ──────────────────────────────────────────────


def get_all_games() -> list[dict]:
    """Return all games as full reshaped objects (for callers that need everything)."""
    _ensure_cache()
    return list(_full_cache)


def get_game(game_id: str) -> Optional[dict]:
    """Return a single full game by game_id slug, or None."""
    _ensure_cache()
    game = _by_id_cache.get(game_id)
    if game is None:
        return None
    # Return a shallow copy so callers can mutate without poisoning the cache.
    return dict(game)


def _matches_search(game: dict, search: str) -> bool:
    s = search.lower()
    if s in (game.get("title") or "").lower():
        return True
    for alias in game.get("aliases") or []:
        if s in alias.lower():
            return True
    return False


def list_games(search: Optional[str] = None, complexity: Optional[str] = None) -> list[dict]:
    """Search games. Drop-in replacement for `app.models.game.search_games`."""
    _ensure_cache()
    results = _full_cache
    if search:
        results = [g for g in results if _matches_search(g, search)]
    if complexity:
        results = [g for g in results if (g.get("complexity") or "") == complexity]
    summaries = [_to_summary(g) for g in results]
    summaries.sort(key=lambda g: (g.get("title") or "").lower())
    return summaries


def filter_games(
    complexity: Optional[str] = None,
    min_players: Optional[int] = None,
    max_players: Optional[int] = None,
    category: Optional[str] = None,
    max_play_time: Optional[int] = None,
    tag: Optional[str] = None,
) -> list[dict]:
    """Advanced filter. Drop-in replacement for `app.models.game.filter_games`."""
    _ensure_cache()
    results = _full_cache

    if complexity:
        results = [g for g in results if (g.get("complexity") or "") == complexity]
    if min_players is not None:
        # Legacy SQL was `player_count_max >= min_players`.
        results = [g for g in results if ((g.get("player_count") or {}).get("max") or 0) >= min_players]
    if max_players is not None:
        results = [g for g in results if ((g.get("player_count") or {}).get("min") or 0) <= max_players]
    if max_play_time is not None:
        def _ok(g):
            ptmax = (g.get("play_time_minutes") or {}).get("max") or 0
            return ptmax > 0 and ptmax <= max_play_time
        results = [g for g in results if _ok(g)]

    summaries = [_to_summary(g) for g in results]
    summaries.sort(key=lambda g: (g.get("title") or "").lower())

    if category:
        cat_lower = category.lower()
        summaries = [g for g in summaries if cat_lower in [c.lower() for c in g["categories"]]]

    if tag:
        tag_lower = tag.lower().replace("-", " ")
        summaries = [g for g in summaries if tag_lower in [t.lower() for t in g.get("tags", [])]]

    return summaries


def get_quick_games(max_time: int = 30) -> list[dict]:
    """Return games where max play time <= max_time minutes."""
    _ensure_cache()
    results = []
    for g in _full_cache:
        ptmax = (g.get("play_time_minutes") or {}).get("max") or 0
        if ptmax > 0 and ptmax <= max_time:
            results.append(g)
    summaries = [_to_summary(g) for g in results]
    summaries.sort(key=lambda g: (
        (g.get("play_time_minutes") or {}).get("max") or 0,
        (g.get("title") or "").lower(),
    ))
    return summaries


def get_all_categories() -> list[dict]:
    """Return all unique categories with counts, sorted alphabetically."""
    _ensure_cache()
    counts: dict[str, int] = {}
    for g in _full_cache:
        for cat in g.get("categories") or []:
            counts[cat] = counts.get(cat, 0) + 1
    return sorted(
        [{"category": k, "count": v} for k, v in counts.items()],
        key=lambda x: x["category"],
    )


def search_by_publisher_tag(
    tag: str,
    search: Optional[str] = None,
    complexity: Optional[str] = None,
) -> list[dict]:
    """Return only games with a specific publisher_tag (e.g. 'stonemaier')."""
    _ensure_cache()
    results = [g for g in _full_cache if (g.get("publisher_tag") or "") == tag]
    if search:
        results = [g for g in results if _matches_search(g, search)]
    if complexity:
        results = [g for g in results if (g.get("complexity") or "") == complexity]
    summaries = [_to_summary(g) for g in results]
    summaries.sort(key=lambda g: (g.get("title") or "").lower())
    return summaries


def search_limited_library(
    search: Optional[str] = None,
    complexity: Optional[str] = None,
) -> list[dict]:
    """Return only games tagged public_domain or publisher_approved (for demo roles)."""
    _ensure_cache()
    results = [
        g for g in _full_cache
        if g.get("public_domain") or g.get("publisher_approved")
    ]
    if search:
        results = [g for g in results if _matches_search(g, search)]
    if complexity:
        results = [g for g in results if (g.get("complexity") or "") == complexity]
    summaries = [_to_summary(g) for g in results]
    summaries.sort(key=lambda g: (g.get("title") or "").lower())
    return summaries


def search_games_fuzzy(query: str, limit: int = 20) -> list[dict]:
    """Fuzzy search across title, aliases, categories. Ranked by relevance.

    Drop-in replacement for the relevance scorer in `app/api/routes/search.py`.
    Returns lightweight dicts (game_id, title, aliases, player_count, complexity, categories).
    """
    _ensure_cache()
    q = query.lower()
    scored: list[tuple[int, dict]] = []
    for g in _full_cache:
        score = 0
        title = (g.get("title") or "").lower()
        gid = (g.get("game_id") or "").lower()
        aliases = g.get("aliases") or []
        categories = g.get("categories") or []

        if q == title:
            score += 100
        elif title.startswith(q):
            score += 50
        elif q in title:
            score += 30
        elif q in gid:
            score += 25

        for alias in aliases:
            al = alias.lower()
            if q == al:
                score += 80
            elif q in al:
                score += 20

        for cat in categories:
            if q in cat.lower():
                score += 10

        if score > 0:
            scored.append((score, g))

    scored.sort(key=lambda x: (-x[0], (x[1].get("title") or "").lower()))
    return [
        {
            "game_id": g.get("game_id"),
            "title": g.get("title"),
            "aliases": g.get("aliases") or [],
            "player_count": {
                "min": (g.get("player_count") or {}).get("min") or 0,
                "max": (g.get("player_count") or {}).get("max") or 0,
            },
            "complexity": g.get("complexity") or "",
            "categories": g.get("categories") or [],
        }
        for _, g in scored[:limit]
    ]


# ── LLM context builder ──────────────────────────────────────────


_TAB_DISPLAY_NAMES = {
    "setup": "Setup",
    "rules": "Rules",
    "strategy": "Strategy",
    "walkthrough": "First-Game Walkthrough",
    "advanced_strategy": "Advanced Strategy",
}
_TAB_ORDER = ["setup", "rules", "strategy", "walkthrough", "advanced_strategy"]


def _build_knowledge_text(game: dict) -> str:
    """Flatten all tabs/subtopics into a Markdown string for the LLM system prompt."""
    tabs = game.get("tabs") or {}
    parts: list[str] = []
    for tab_key in _TAB_ORDER:
        tab = tabs.get(tab_key)
        if not tab:
            continue
        display = _TAB_DISPLAY_NAMES.get(tab_key, tab_key.title())
        parts.append(f"## {display}")
        for subtopic in tab.get("subtopics", []):
            title = subtopic.get("title", "")
            content = subtopic.get("content", "")
            if title and content:
                parts.append(f"### {title}\n{content}")
        parts.append("")
    return "\n\n".join(parts)


def get_game_for_llm(game_id: str) -> Optional[str]:
    """Return the flattened knowledge-base text for the LLM system prompt."""
    game = get_game(game_id)
    if not game:
        return None
    return _build_knowledge_text(game)


# ── Write API ────────────────────────────────────────────────────


def create_or_update_game(game_data: dict) -> dict:
    """Upsert a game in Supabase. Used by the admin write endpoint and future
    Barbarian content pipelines.

    Accepts the same shape as the import script's `_build_row` output (flat
    columns matching the Supabase schema). Invalidates the cache so the next
    read picks up the change.
    """
    if "game_id" not in game_data:
        raise ValueError("game_data must include 'game_id'")
    admin = get_admin_client()
    result = admin.table("games").upsert(game_data, on_conflict="game_id").execute()
    invalidate_cache()
    sync_local_games_table()
    if result.data:
        return _reshape_full(result.data[0])
    return {}


# ── Legacy no-op: local SQLite mirror is gone ────────────────────


def sync_local_games_table() -> int:
    """No-op. Retained for backwards compatibility with callers.

    Wave 4 (2026-04-10): ``games`` is now a canonical Supabase table
    (not a local SQLite mirror). All LEFT JOIN games queries now flow
    through the Supabase PG shim to the real Supabase table, so the
    mirror-rebuild is no longer needed.
    """
    return 0
