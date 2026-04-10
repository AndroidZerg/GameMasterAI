"""Rename sourced images to canonical step-image names and generate SQL updates
that attach them to each game's teaching walkthrough + summary steps.

For each game directory under content/images/{game_id}/ that contains *-src-NN.jpg files:
  1. Rename `*-src-NN.jpg` -> `{game_id}-setup-NN-{label}.jpg` (label inferred from position)
  2. Emit a Supabase SQL UPDATE that sets walkthrough[i].image and walkthrough[i].image_caption,
     and summary[i].image for the corresponding steps.

Strategy for mapping N images to M steps (M usually > N):
  - Always bind image 1 to step 1 ("Components overview")
  - Always bind image N to the LAST step ("Final setup")
  - Distribute remaining images evenly across the middle steps

Output:
  - SQL statements printed to stdout (pipe into psql or paste into Supabase MCP)
  - Rename operations done in-place
  - A summary JSON at content/images/_thaihouse_manifest.json
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
IMAGES_ROOT = ROOT / "content" / "images"

# Thai House game list (from the ticket). These are the games we process.
THAIHOUSE_GAMES = [
    # Tier 1
    "catan", "wingspan", "azul", "splendor", "ticket-to-ride",
    "exploding-kittens", "codenames", "king-of-tokyo", "pandemic", "everdell",
    # Tier 2
    "carcassonne", "dixit", "sushi-go", "seven-wonders", "flamecraft",
    "cant-stop", "cant-stop-korean", "century-golem-edition", "machi-koro",
    "one-night-ultimate-werewolf",
    # Tier 3
    "codenames-duet", "codenames-pictures-heirloom-edition", "wavelength",
    "secret-hitler", "scattergories", "love-letter", "spot-it", "six-nimmt",
    "the-crew", "deception-murder-in-hong-kong", "uno", "clue",
    # Tier 4
    "rummikub", "tokaido", "century-golem-edition-endless-world",
    "risk-game-of-thrones", "welcome-to", "above-and-below",
    "quacks-of-quedlinburg", "betrayal-at-house-on-the-hill", "dead-of-winter",
    "villainous", "sheriff-of-nottingham", "everdell-pearlbrook", "takenoko",
    # Tier 5
    "scythe", "root", "exit-the-game-series", "5-minute-dungeon", "5-minute-mystery",
    "unlock-escape-adventures", "unlock-mystery-adventures", "unlock-secret-adventures",
    "unlock-exotic-adventures", "unlock-timeless-adventures", "unlock-epic-adventures",
    "unlock-mythic-adventures", "unlock-game-adventures", "unlock-star-wars-escape-game",
]

# Step labels used when renaming. Position 1 = components, position N = final, middle = board/setup
LABELS = {
    1: "components",
    2: "board-setup",
    3: "player-area",
    4: "tokens-cards",
    5: "setup-detail",
    6: "mid-setup",
    7: "late-setup",
    8: "final-setup",
    9: "alt-view",
    10: "full-layout",
}

CAPTIONS = {
    1: "Game components and starting layout",
    2: "Initial board setup",
    3: "Player starting area",
    4: "Tokens, cards, and key components",
    5: "Setup detail view",
    6: "Mid-setup checkpoint",
    7: "Late-setup checkpoint",
    8: "Final setup - your table should look like this",
    9: "Alternate view of the setup",
    10: "Full layout checkpoint",
}


def pick_step_indices(n_images: int, n_steps: int) -> list[int]:
    """Return n_images step indices (0-based) that best distribute images across n_steps steps.

    Rules:
      - If n_images >= n_steps: return [0..n_steps-1] (one image per step, ignoring excess)
      - If n_images == 1: return [0]
      - If n_images == 2: return [0, n_steps-1] (first and last)
      - Otherwise: first, last, then evenly-distributed middle points
    """
    if n_steps == 0 or n_images == 0:
        return []
    if n_images >= n_steps:
        return list(range(n_steps))
    if n_images == 1:
        return [0]
    if n_images == 2:
        return [0, n_steps - 1]
    # n_images >= 3, n_steps > n_images
    result = [0, n_steps - 1]
    middle_count = n_images - 2
    for k in range(1, middle_count + 1):
        pos = int(round(k * (n_steps - 1) / (middle_count + 1)))
        if pos not in result:
            result.append(pos)
    result = sorted(set(result))[:n_images]
    return result


def rename_game_images(game_id: str) -> list[str]:
    """Rename *-src-NN.jpg to canonical setup filenames. Returns list of new filenames."""
    game_dir = IMAGES_ROOT / game_id
    if not game_dir.is_dir():
        return []

    # Check if this directory ALREADY has non-src canonical files (like wingspan).
    # If so, skip renaming and use those instead.
    existing_setup = sorted(
        f.name for f in game_dir.iterdir()
        if f.is_file() and f.suffix == ".jpg" and "-setup-" in f.name and "-src-" not in f.name
    )
    if existing_setup:
        return existing_setup

    src_files = sorted(
        f for f in game_dir.iterdir()
        if f.is_file() and f.name.startswith(f"{game_id}-src-") and f.suffix == ".jpg"
    )
    renamed: list[str] = []
    for i, src in enumerate(src_files, start=1):
        label = LABELS.get(i, f"view-{i:02d}")
        new_name = f"{game_id}-setup-{i:02d}-{label}.jpg"
        new_path = game_dir / new_name
        if new_path.exists() and new_path != src:
            new_path.unlink()
        src.rename(new_path)
        renamed.append(new_name)
    return renamed


def sql_literal_text(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def build_update_sql(game_id: str, image_files: list[str], walk_len: int, summary_len: int) -> str:
    """Build a single SQL UPDATE statement that attaches the given images to teaching.

    We use jsonb_set for each step we want to update. Returns a multi-statement
    SQL block that wraps each individual set.
    """
    if not image_files or walk_len == 0:
        return f"-- {game_id}: skipped (images={len(image_files)}, walk_len={walk_len})\n"

    walk_indices = pick_step_indices(len(image_files), walk_len)
    sum_indices = pick_step_indices(len(image_files), summary_len)

    lines = [f"-- {game_id}: {len(image_files)} images -> walk_len={walk_len} sum_len={summary_len}"]

    for i, img in enumerate(image_files):
        caption = CAPTIONS.get(i + 1, f"Setup reference view {i+1}")
        img_lit = sql_literal_text(img)
        cap_lit = sql_literal_text(caption)
        if i < len(walk_indices):
            step_idx = walk_indices[i]
            lines.append(
                f"UPDATE games SET teaching = "
                f"jsonb_set(jsonb_set(teaching, '{{setup,walkthrough,{step_idx},image}}', to_jsonb({img_lit}::text)), "
                f"'{{setup,walkthrough,{step_idx},image_caption}}', to_jsonb({cap_lit}::text)) "
                f"WHERE game_id = '{game_id}';"
            )
        if i < len(sum_indices) and summary_len > 0:
            step_idx = sum_indices[i]
            lines.append(
                f"UPDATE games SET teaching = "
                f"jsonb_set(teaching, '{{setup,summary,{step_idx},image}}', to_jsonb({img_lit}::text)) "
                f"WHERE game_id = '{game_id}';"
            )
    return "\n".join(lines) + "\n"


def main():
    manifest: dict[str, Any] = {}

    # First pass: rename all files to canonical names
    for game_id in THAIHOUSE_GAMES:
        files = rename_game_images(game_id)
        manifest[game_id] = {"files": files, "count": len(files)}

    # Output manifest
    manifest_path = IMAGES_ROOT / "_thaihouse_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))
    print(f"# Wrote manifest: {manifest_path}", file=sys.stderr)
    print(f"# Total games with images: {sum(1 for v in manifest.values() if v['count']>0)}", file=sys.stderr)
    print(f"# Total images: {sum(v['count'] for v in manifest.values())}", file=sys.stderr)

    # To build SQL we need walk/summary lengths from DB — print a JS report instead,
    # the caller will fetch lengths separately and call build_update_sql.
    # For now, print the renamed manifest as JSON for the SQL builder
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
