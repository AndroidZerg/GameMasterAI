"""Game knowledge base loader — reads JSON files from the content directory."""

import json
import logging
from pathlib import Path
from typing import Optional

from app.core.config import CONTENT_DIR

logger = logging.getLogger(__name__)


def get_games_dir() -> Path:
    return Path(CONTENT_DIR)


def scan_game_files() -> list[dict]:
    """Scan the games directory and return metadata for all game JSON files."""
    games_dir = get_games_dir()
    if not games_dir.exists():
        return []

    games = []
    for f in sorted(games_dir.glob("*.json")):
        if f.name == "_template.json":
            continue
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            _validate_game_format(data, f.name)
            games.append(data)
        except Exception:
            continue
    return games


_REQUIRED_TABS = {"setup", "rules", "strategy"}


def _validate_game_format(data: dict, filename: str):
    """Log warnings for games that don't match the tabs content format."""
    game_id = data.get("game_id", filename)
    has_sections = bool(data.get("sections"))
    has_tabs = bool(data.get("tabs"))

    if has_sections and not has_tabs:
        logger.warning(
            "Game %s is in old format — missing tabs. "
            "Will appear empty in Teaching Mode.",
            game_id,
        )
        return

    if has_tabs:
        tabs = data["tabs"]
        missing = _REQUIRED_TABS - set(tabs.keys())
        if missing:
            logger.warning(
                "Game %s has tabs but is missing required tab(s): %s. "
                "Will appear empty in Teaching Mode.",
                game_id,
                ", ".join(sorted(missing)),
            )
        # Check for empty walkthrough content
        for tab_key, tab in tabs.items():
            for subtopic in tab.get("subtopics", []):
                if not subtopic.get("content", "").strip():
                    logger.warning(
                        "Game %s tab '%s' subtopic '%s' has empty content.",
                        game_id,
                        tab_key,
                        subtopic.get("id", "unknown"),
                    )


def load_game(game_id: str) -> Optional[dict]:
    """Load a single game's full JSON by game_id."""
    games_dir = get_games_dir()
    filepath = games_dir / f"{game_id}.json"
    if not filepath.exists():
        return None
    try:
        return json.loads(filepath.read_text(encoding="utf-8"))
    except Exception:
        return None


def get_all_metadata() -> list[dict]:
    """Return lightweight metadata for all games (for listing/search)."""
    results = []
    for game in scan_game_files():
        results.append({
            "game_id": game.get("game_id", ""),
            "title": game.get("title", ""),
            "aliases": game.get("aliases", []),
            "complexity": game.get("complexity", ""),
            "player_count": game.get("player_count", {}),
            "play_time_minutes": game.get("play_time_minutes", {}),
            "categories": game.get("categories", []),
        })
    return results


TAB_DISPLAY_NAMES = {
    "setup": "Setup",
    "rules": "Rules",
    "strategy": "Strategy",
    "walkthrough": "First-Game Walkthrough",
    "advanced_strategy": "Advanced Strategy",
}

_TAB_ORDER = ["setup", "rules", "strategy", "walkthrough", "advanced_strategy"]


def build_knowledge_text(game: dict) -> str:
    """Flatten all tabs/subtopics into a Markdown string for the LLM system prompt.

    Schema v2.1: tabs.{setup,rules,strategy,walkthrough,advanced_strategy}.subtopics[].{title, content}
    """
    tabs = game.get("tabs", {})
    parts = []
    for tab_key in _TAB_ORDER:
        tab = tabs.get(tab_key)
        if not tab:
            continue
        display = TAB_DISPLAY_NAMES.get(tab_key, tab_key.title())
        parts.append(f"## {display}")
        for subtopic in tab.get("subtopics", []):
            title = subtopic.get("title", "")
            content = subtopic.get("content", "")
            if title and content:
                parts.append(f"### {title}\n{content}")
        parts.append("")  # blank line between tabs
    return "\n\n".join(parts)
