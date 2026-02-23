"""Game knowledge base loader — reads JSON files from the content directory."""

import json
from pathlib import Path
from typing import Optional

from app.core.config import CONTENT_DIR


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
            games.append(data)
        except Exception:
            continue
    return games


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


def build_knowledge_text(game: dict) -> str:
    """Concatenate all sections into a single text block for the LLM prompt."""
    sections = game.get("sections", {})
    parts = []
    for key in ["component_identification", "core_game_loop", "detailed_rules",
                 "scoring_and_endgame", "beginner_strategy"]:
        section = sections.get(key, {})
        content = section.get("content", "")
        if content:
            label = key.replace("_", " ").upper()
            parts.append(f"## {label}\n{content}")
    return "\n\n".join(parts)
