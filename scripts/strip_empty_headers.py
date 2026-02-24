#!/usr/bin/env python3
"""Strip empty player-count headers from all game JSON files."""

import json
import os
import re
import sys

GAMES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "content", "games")
HEADER_PATTERN = re.compile(r'---\s*\d+\s*[Pp]layers?\s*---')


def strip_empty_headers(content):
    """Remove player-count headers that have no content between them."""
    lines = content.split('\n')
    result = []
    removals = []
    i = 0

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if HEADER_PATTERN.search(stripped):
            # Collect header and any blank lines after it
            header_line = line
            header_idx = i
            i += 1
            content_lines = []

            # Gather lines until next header, subtopic header (####), or end
            while i < len(lines):
                next_stripped = lines[i].strip()
                if HEADER_PATTERN.search(next_stripped):
                    break
                if next_stripped.startswith('####'):
                    break
                content_lines.append(lines[i])
                i += 1

            # Check if there's any real content
            has_content = any(cl.strip() for cl in content_lines)

            if has_content:
                result.append(header_line)
                result.extend(content_lines)
            else:
                removals.append(stripped)
        else:
            result.append(line)
            i += 1

    # Clean up multiple consecutive blank lines
    cleaned = []
    prev_blank = False
    for line in result:
        is_blank = not line.strip()
        if is_blank and prev_blank:
            continue
        cleaned.append(line)
        prev_blank = is_blank

    return '\n'.join(cleaned), removals


def process_game(filepath):
    """Process a single game JSON file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    game_id = data.get('game_id', os.path.basename(filepath))
    all_removals = []
    modified = False

    tabs = data.get('tabs', {})
    for tab_name, tab_data in tabs.items():
        subtopics = tab_data.get('subtopics', [])
        for subtopic in subtopics:
            content = subtopic.get('content', '')
            if HEADER_PATTERN.search(content):
                new_content, removals = strip_empty_headers(content)
                if removals:
                    all_removals.extend(removals)
                    subtopic['content'] = new_content
                    modified = True

    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write('\n')

    return game_id, all_removals, modified


def main():
    total_removals = 0
    total_modified = 0

    print("=== Stripping Empty Player-Count Headers ===\n")

    for filename in sorted(os.listdir(GAMES_DIR)):
        if not filename.endswith('.json') or filename.startswith('_'):
            continue

        filepath = os.path.join(GAMES_DIR, filename)
        game_id, removals, modified = process_game(filepath)

        if removals:
            print(f"{game_id}: removed {len(removals)} empty headers")
            for r in removals:
                print(f"  - {r}")
            total_removals += len(removals)
            total_modified += 1
        else:
            print(f"{game_id}: clean")

    print(f"\n=== SUMMARY ===")
    print(f"Games modified: {total_modified}")
    print(f"Headers removed: {total_removals}")


if __name__ == "__main__":
    main()
