#!/usr/bin/env python3
"""Part A: Strip every empty player-count header across all 50 game files.

An empty header is one where there's a `--- X Players ---` pattern
followed immediately by another header or end of content with no
bullet content in between.
"""

import json
import re
from pathlib import Path

GAMES_DIR = Path(__file__).resolve().parent.parent / "content" / "games"
PC_HEADER_RE = r"---\s*\d+\s*Players?\s*---"

def strip_empty_pc_headers(content: str) -> tuple[str, list[str]]:
    """Remove empty player-count headers from a content string.
    Returns (cleaned_content, list_of_removed_headers).
    """
    lines = content.split("\n")
    cleaned = []
    removed = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if re.search(PC_HEADER_RE, line.strip()):
            # Check if there's content before the next header or end
            has_content = False
            j = i + 1
            while j < len(lines):
                next_line = lines[j].strip()
                if re.search(PC_HEADER_RE, next_line):
                    break  # hit next PC header
                if next_line.startswith("####"):
                    break  # hit next section header
                if next_line.startswith("- **") or next_line.startswith("- "):
                    has_content = True
                    break
                if next_line and not next_line.startswith("#"):
                    has_content = True
                    break
                j += 1

            if has_content:
                cleaned.append(line)
            else:
                removed.append(line.strip())
                # Also skip any blank lines after the empty header
                while i + 1 < len(lines) and not lines[i + 1].strip():
                    i += 1
        else:
            cleaned.append(line)
        i += 1

    return "\n".join(cleaned), removed


def process_game(filepath: Path) -> dict:
    """Process a single game file, strip empty headers, return results."""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    if filepath.name == "_template.json":
        return {"game": "_template", "changes": 0, "removed": []}

    game_id = data.get("game_id", filepath.stem)
    total_removed = []
    changed = False

    tabs = data.get("tabs", {})
    for tab_key, tab_data in tabs.items():
        for subtopic in tab_data.get("subtopics", []):
            content = subtopic.get("content", "")
            if re.search(PC_HEADER_RE, content):
                new_content, removed = strip_empty_pc_headers(content)
                if removed:
                    for r in removed:
                        total_removed.append(f"{tab_key} > {subtopic['id']} > {r}")
                    subtopic["content"] = new_content
                    changed = True

    if changed:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")

    return {
        "game": game_id,
        "changes": len(total_removed),
        "removed": total_removed
    }


def main():
    print("Part A: Stripping empty player-count headers...\n")

    game_files = sorted(GAMES_DIR.glob("*.json"))
    total_changes = 0
    games_changed = 0
    all_results = []

    for gf in game_files:
        if gf.name == "_template.json":
            continue
        result = process_game(gf)
        all_results.append(result)
        if result["changes"] > 0:
            games_changed += 1
            total_changes += result["changes"]
            print(f"  {result['game']}: removed {result['changes']} empty headers")
            for r in result["removed"]:
                print(f"    - {r}")

    print(f"\n=== PART A SUMMARY ===")
    print(f"Games scanned: {len(all_results)}")
    print(f"Games with empty headers: {games_changed}")
    print(f"Total empty headers removed: {total_changes}")

    if total_changes == 0:
        print("✅ No empty headers found — content is already clean from Rogue S2-S4 patches.")


if __name__ == "__main__":
    main()
