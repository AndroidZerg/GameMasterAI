"""
One-time import: JSON game files -> Supabase games table.

Reads all content/games/*.json plus matching content/teaching/*.json and
content/scores/*-score.json, merges them, and upserts to the Supabase
`games` table (on_conflict=game_id).

Usage (from repo root):

    set SUPABASE_SERVICE_KEY=<service_key>
    python backend/scripts/import_games_to_supabase.py

Idempotent: re-running will upsert and not duplicate. Skips _template.json.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

try:
    from supabase import create_client
except ImportError:
    sys.stderr.write("supabase package missing. Run: pip install supabase\n")
    raise SystemExit(1)


REPO_ROOT = Path(__file__).resolve().parents[2]
GAMES_DIR = REPO_ROOT / "content" / "games"
TEACHING_DIR = REPO_ROOT / "content" / "teaching"
SCORES_DIR = REPO_ROOT / "content" / "scores"

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://uvfidazctqeazywlebkh.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# CHECK constraints on the games table — values that don't match are coerced to None.
ALLOWED_COMPLEXITY = {"party", "gateway", "midweight", "heavy"}
ALLOWED_VALIDATION_STATUS = {"pending", "approved", "rejected"}


def _read_json(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"  WARN: failed to parse {path.name}: {e}")
        return None


def _load_teaching(game_id: str) -> dict:
    """Returns the teaching `sections` dict, or {} if no teaching file exists."""
    teaching_path = TEACHING_DIR / f"{game_id}.json"
    if not teaching_path.exists():
        return {}
    data = _read_json(teaching_path)
    if not data:
        return {}
    return data.get("sections", {}) or {}


def _load_score_config(game_id: str) -> dict:
    """Returns the score config dict, or {} if no score file exists."""
    # Existing convention is `{game_id}-score.json`. Fall back to `{game_id}.json`.
    for name in (f"{game_id}-score.json", f"{game_id}.json"):
        score_path = SCORES_DIR / name
        if score_path.exists():
            data = _read_json(score_path)
            if data:
                return data
    return {}


def _coerce_complexity(value):
    if value in ALLOWED_COMPLEXITY:
        return value
    return None


def _coerce_validation_status(value):
    if value in ALLOWED_VALIDATION_STATUS:
        return value
    return None


def _coerce_int(value):
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _build_row(game: dict, game_id: str) -> dict:
    pc = game.get("player_count") or {}
    pt = game.get("play_time_minutes") or {}
    metadata = game.get("metadata") or {}

    return {
        "game_id": game_id,
        "title": game.get("title") or game_id,
        "aliases": game.get("aliases") or [],
        "publisher": game.get("publisher"),
        "publisher_tag": game.get("publisher_tag"),
        "publisher_approved": bool(game.get("publisher_approved", False)),
        "public_domain": bool(game.get("public_domain", False)),
        "image": game.get("image"),
        "player_count_min": _coerce_int(pc.get("min")),
        "player_count_max": _coerce_int(pc.get("max")),
        "player_count_recommended": _coerce_int(pc.get("recommended")),
        "expansion_max": _coerce_int(pc.get("expansion_max")),
        "play_time_min": _coerce_int(pt.get("min")),
        "play_time_max": _coerce_int(pt.get("max")),
        "complexity": _coerce_complexity(game.get("complexity")),
        "categories": game.get("categories") or [],
        "source_url": game.get("source_url"),
        "source_verified": bool(game.get("source_verified", False)),
        "bgg_id": _coerce_int(game.get("bgg_id")),
        "tabs": game.get("tabs") or {},
        "rules_citations": game.get("rules_citations") or {},
        "extensions": game.get("extensions") or {},
        "teaching": _load_teaching(game_id),
        "score_config": _load_score_config(game_id),
        "total_token_count": _coerce_int(game.get("total_token_count")) or 0,
        "schema_version": metadata.get("schema_version") or "2.0",
        "created_by": metadata.get("created_by") or "import",
        "validated_by": metadata.get("validated_by"),
        "validation_status": _coerce_validation_status(metadata.get("validation_status")),
        "revision": _coerce_int(metadata.get("revision")) or 1,
        "notes": metadata.get("notes"),
    }


def main():
    if not SUPABASE_SERVICE_KEY:
        sys.stderr.write("ERROR: SUPABASE_SERVICE_KEY env var is required\n")
        raise SystemExit(1)

    if not GAMES_DIR.exists():
        sys.stderr.write(f"ERROR: games dir not found: {GAMES_DIR}\n")
        raise SystemExit(1)

    admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    game_files = sorted(GAMES_DIR.glob("*.json"))
    print(f"Found {len(game_files)} JSON files in {GAMES_DIR}")

    imported = 0
    skipped = 0
    errors: list[str] = []

    for path in game_files:
        if path.name.startswith("_"):
            skipped += 1
            continue

        game = _read_json(path)
        if not game:
            errors.append(f"{path.name}: failed to parse")
            continue

        game_id = game.get("game_id") or path.stem
        try:
            row = _build_row(game, game_id)
            admin.table("games").upsert(row, on_conflict="game_id").execute()
            imported += 1
            if imported % 25 == 0:
                print(f"  imported {imported}...")
        except Exception as e:
            errors.append(f"{game_id}: {e}")
            print(f"  ERROR {game_id}: {e}")

    print()
    print(f"Done. imported={imported} skipped={skipped} errors={len(errors)}")
    if errors:
        print("Errors:")
        for e in errors:
            print(f"  - {e}")

    # Sanity check final count from Supabase
    try:
        result = admin.table("games").select("game_id", count="exact").limit(1).execute()
        print(f"Supabase games table now has {result.count} row(s).")
    except Exception as e:
        print(f"Could not verify final count: {e}")


if __name__ == "__main__":
    main()
