#!/usr/bin/env python3
"""Scan all game JSONs for empty player-count headers.

An empty header is a "--- X Players ---" line (or similar) that has no
actual content (bullet points or sentences) before the next header or
end of the string.
"""

import json
import os
import re
import sys

GAMES_DIR = os.path.join(os.path.dirname(__file__), "..", "content", "games")

# Patterns that match player-count headers
HEADER_PATTERNS = [
    r"^---\s*\d+\s*[Pp]layers?\s*---",          # --- 2 Players ---
    r"^---\s*\d+[-–]\d+\s*[Pp]layers?\s*---",    # --- 2-3 Players ---
    r"^---\s*\d+\s*[Pp]layers?\s*\([^)]*\)\s*---", # --- 2 Players (Variant) ---
    r"^---\s*\d+\+?\s*[Pp]layers?\s*.*---",       # catch-all with ---
    r"^\d+\s+PLAYERS?\s*$",                        # 2 PLAYERS
]

COMBINED_PATTERN = re.compile("|".join(HEADER_PATTERNS), re.MULTILINE | re.IGNORECASE)


def has_content(text: str) -> bool:
    """Check if text has actual content (not just whitespace/blank lines)."""
    stripped = text.strip()
    if not stripped:
        return False
    # Check for at least one bullet, sentence, or meaningful text
    lines = [l.strip() for l in stripped.split("\n") if l.strip()]
    return len(lines) > 0


def scan_content(content_str: str) -> list[str]:
    """Find empty player-count headers in a content string."""
    empty_headers = []
    matches = list(COMBINED_PATTERN.finditer(content_str))

    for i, match in enumerate(matches):
        header_text = match.group(0).strip()
        start = match.end()

        # Find end: next player-count header or end of string
        if i + 1 < len(matches):
            end = matches[i + 1].start()
        else:
            end = len(content_str)

        between = content_str[start:end]

        # The content between player-count headers may include #### sub-headers,
        # bullet points, etc. All of that counts as content.
        if not has_content(between):
            empty_headers.append(header_text)

    return empty_headers


def scan_game(filepath: str) -> list[dict]:
    """Scan a single game JSON for empty headers."""
    results = []

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    game_id = data.get("game_id", os.path.basename(filepath).replace(".json", ""))
    tabs = data.get("tabs", {})

    for tab_name, tab_data in tabs.items():
        subtopics = tab_data.get("subtopics", [])
        for subtopic in subtopics:
            subtopic_id = subtopic.get("id", "unknown")
            content = subtopic.get("content", "")

            empty = scan_content(content)
            if empty:
                results.append({
                    "game": game_id,
                    "tab": tab_name,
                    "subtopic": subtopic_id,
                    "empty_headers": empty,
                })

    return results


def main():
    games_dir = os.path.abspath(GAMES_DIR)
    if not os.path.isdir(games_dir):
        print(f"ERROR: Games directory not found: {games_dir}")
        sys.exit(1)

    # Get all game JSON files (exclude score files)
    json_files = sorted([
        f for f in os.listdir(games_dir)
        if f.endswith(".json") and not f.endswith("-score.json")
    ])

    print(f"Scanning {len(json_files)} game files...")

    all_results = []
    total_empty = 0
    games_with_empty = set()

    for fname in json_files:
        filepath = os.path.join(games_dir, fname)
        try:
            results = scan_game(filepath)
            if results:
                all_results.extend(results)
                for r in results:
                    total_empty += len(r["empty_headers"])
                    games_with_empty.add(r["game"])
        except Exception as e:
            print(f"ERROR scanning {fname}: {e}")

    # Build report
    report_lines = [
        "EMPTY HEADER SCAN RESULTS",
        "=========================",
        f"Scanned: {len(json_files)} game files",
        f"Date: 2026-02-23",
        "",
    ]

    if all_results:
        for r in all_results:
            report_lines.append(f"Game: {r['game']}")
            report_lines.append(f"  Tab: {r['tab']}")
            report_lines.append(f"  Subtopic: {r['subtopic']}")
            report_lines.append(f"  Empty headers: {', '.join(repr(h) for h in r['empty_headers'])}")
            report_lines.append("")
    else:
        report_lines.append("No empty headers found.")
        report_lines.append("")

    report_lines.append(f"TOTAL: {total_empty} empty headers across {len(games_with_empty)} games")

    report = "\n".join(report_lines)
    print(report)

    # Save report
    tests_dir = os.path.join(os.path.dirname(__file__), "..", "tests")
    os.makedirs(tests_dir, exist_ok=True)
    report_path = os.path.join(tests_dir, "empty_headers_scan.txt")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)

    print(f"\nReport saved to: {report_path}")
    return total_empty


if __name__ == "__main__":
    count = main()
    sys.exit(0 if count == 0 else 1)
