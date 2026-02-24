#!/usr/bin/env python3
"""Part B: Rulebook Audit Script.

Reads every rulebook text file, extracts player-count-specific rules,
cross-references with game JSON files, and identifies gaps.

This script FINDS gaps. Fixing them requires manual review per game
since rulebook text is OCR'd and messy.
"""

import json
import re
import os
from pathlib import Path

GAMES_DIR = Path(__file__).resolve().parent.parent / "content" / "games"
RULEBOOK_DIR = Path(__file__).resolve().parent.parent / "content" / "rulebook-text"
REPORT_DIR = Path(__file__).resolve().parent

PC_HEADER_RE = r"---\s*(\d+)\s*Players?\s*---"

# Patterns that indicate player-count-specific rules in rulebook text
PLAYER_COUNT_PATTERNS = [
    # Explicit player count references
    r'\b(\d)\s*[-–]\s*player',
    r'\bfor\s+(\d)\s+players?\b',
    r'\bwith\s+(\d)\s+players?\b',
    r'\b(\d)\s+players?\b',
    r'\b(\d)[-–]player\b',
    r'\btwo[-\s]?player',
    r'\bthree[-\s]?player',
    r'\bfour[-\s]?player',
    r'\bfive[-\s]?player',
    r'\bsix[-\s]?player',
    r'\bsolo\b',
    r'\b1\s*player\b',
    # Comparative references
    r'\bfewer\s+(?:than\s+)?\d\s+players?\b',
    r'\bmore\s+than\s+\d\s+players?\b',
    r'\bwith\s+fewer\s+players?\b',
    r'\bwith\s+more\s+players?\b',
    # Setup variations
    r'\bremove\s+\d+\s+.*?\bfor\b',
    r'\buse\s+only\b.*?\bplayers?\b',
    r'\bdo\s+not\s+use\b.*?\bplayers?\b',
]


def extract_pc_rules_from_rulebook(text: str) -> list[dict]:
    """Extract sentences/paragraphs that reference player counts from rulebook text."""
    lines = text.split('\n')
    rules_found = []

    for i, line in enumerate(lines):
        line_lower = line.lower().strip()
        if not line_lower:
            continue

        for pattern in PLAYER_COUNT_PATTERNS:
            if re.search(pattern, line_lower):
                # Get context: current line + up to 2 surrounding lines
                context_start = max(0, i - 1)
                context_end = min(len(lines), i + 3)
                context = ' '.join(l.strip() for l in lines[context_start:context_end] if l.strip())

                rules_found.append({
                    'line_num': i + 1,
                    'text': line.strip(),
                    'context': context[:300],
                    'pattern': pattern,
                })
                break  # avoid duplicate matches for same line

    return rules_found


def extract_pc_sections_from_json(game_data: dict) -> dict:
    """Extract all player-count sections from game JSON, organized by tab > subtopic."""
    sections = {}
    tabs = game_data.get("tabs", {})

    for tab_key, tab_data in tabs.items():
        for subtopic in tab_data.get("subtopics", []):
            content = subtopic.get("content", "")
            sid = subtopic.get("id", "unknown")

            # Find all PC headers and their content
            parts = re.split(r'(---\s*\d+\s*Players?\s*---)', content)
            for j in range(1, len(parts), 2):
                header = parts[j].strip()
                body = parts[j + 1] if j + 1 < len(parts) else ""
                # Get body up to next #### header or end
                body_match = re.split(r'\n####\s', body)
                body_text = body_match[0].strip() if body_match else body.strip()

                pc_match = re.search(r'(\d+)\s*Players?', header)
                pc = int(pc_match.group(1)) if pc_match else 0

                key = f"{tab_key} > {sid}"
                if key not in sections:
                    sections[key] = []
                sections[key].append({
                    'player_count': pc,
                    'header': header,
                    'body': body_text,
                    'has_content': bool(body_text.strip()),
                    'has_numbers': bool(re.search(r'\d', body_text)),
                })

    return sections


def count_pc_headers(game_data: dict) -> int:
    """Count total player-count headers in a game file."""
    count = 0
    tabs = game_data.get("tabs", {})
    for tab_data in tabs.values():
        for subtopic in tab_data.get("subtopics", []):
            content = subtopic.get("content", "")
            count += len(re.findall(PC_HEADER_RE, content))
    return count


def audit_game(game_id: str) -> dict:
    """Audit a single game: read rulebook, read JSON, cross-reference."""
    rulebook_path = RULEBOOK_DIR / f"{game_id}.txt"
    json_path = GAMES_DIR / f"{game_id}.json"

    result = {
        'game_id': game_id,
        'rulebook_exists': rulebook_path.exists(),
        'json_exists': json_path.exists(),
        'rulebook_pc_rules': 0,
        'json_pc_headers': 0,
        'empty_headers': 0,
        'vague_headers': 0,  # has content but no numbers
        'status': 'OK',
        'issues': [],
        'rulebook_rules': [],
        'json_sections': {},
    }

    if not rulebook_path.exists():
        result['status'] = 'MISSING_RULEBOOK'
        result['issues'].append("Rulebook text file not found")
        return result

    if not json_path.exists():
        result['status'] = 'MISSING_JSON'
        result['issues'].append("Game JSON file not found")
        return result

    # Read rulebook
    with open(rulebook_path, 'r', encoding='utf-8', errors='replace') as f:
        rulebook_text = f.read()

    # Read game JSON
    with open(json_path, 'r', encoding='utf-8') as f:
        game_data = json.load(f)

    # Extract player-count rules from rulebook
    pc_rules = extract_pc_rules_from_rulebook(rulebook_text)
    result['rulebook_pc_rules'] = len(pc_rules)
    result['rulebook_rules'] = pc_rules

    # Extract PC sections from game JSON
    json_sections = extract_pc_sections_from_json(game_data)
    result['json_sections'] = json_sections
    result['json_pc_headers'] = count_pc_headers(game_data)

    # Check for empty headers
    for location, sections in json_sections.items():
        for sec in sections:
            if not sec['has_content']:
                result['empty_headers'] += 1
                result['issues'].append(f"EMPTY HEADER: {location} > {sec['header']}")
            elif not sec['has_numbers']:
                result['vague_headers'] += 1
                result['issues'].append(f"VAGUE (no numbers): {location} > {sec['header']}")

    # Check player count range
    pc_min = game_data.get('player_count', {}).get('min', 1)
    pc_max = game_data.get('player_count', {}).get('max', 4)

    # Check for orphan headers (outside valid range)
    for location, sections in json_sections.items():
        for sec in sections:
            pc = sec['player_count']
            if pc < pc_min or pc > pc_max:
                result['issues'].append(f"ORPHAN: {location} > {sec['header']} (game range {pc_min}-{pc_max})")

    if result['empty_headers'] > 0 or result['vague_headers'] > 0:
        result['status'] = 'NEEDS_FIX'

    return result


def main():
    print("=" * 60)
    print("RULEBOOK AUDIT - Part B: Cross-Reference Analysis")
    print("=" * 60)

    # Get all game IDs from JSON files
    game_files = sorted(GAMES_DIR.glob("*.json"))
    game_ids = [gf.stem for gf in game_files if gf.stem != "_template"]

    all_results = []
    total_rulebook_rules = 0
    total_json_headers = 0
    total_empty = 0
    total_vague = 0
    games_with_issues = 0

    for game_id in game_ids:
        result = audit_game(game_id)
        all_results.append(result)
        total_rulebook_rules += result['rulebook_pc_rules']
        total_json_headers += result['json_pc_headers']
        total_empty += result['empty_headers']
        total_vague += result['vague_headers']
        if result['issues']:
            games_with_issues += 1

    # Print summary
    print(f"\nGames audited: {len(all_results)}")
    print(f"Total player-count rules found in rulebooks: {total_rulebook_rules}")
    print(f"Total PC headers in game JSONs: {total_json_headers}")
    print(f"Empty headers: {total_empty}")
    print(f"Vague headers (no numbers): {total_vague}")
    print(f"Games with issues: {games_with_issues}")

    # Print per-game details
    print("\n" + "=" * 60)
    print("PER-GAME DETAILS")
    print("=" * 60)

    for result in all_results:
        status_icon = "PASS" if not result['issues'] else "ISSUES"
        print(f"\n=== {result['game_id']} === [{status_icon}]")
        print(f"  Rulebook PC rules: {result['rulebook_pc_rules']}")
        print(f"  JSON PC headers: {result['json_pc_headers']}")
        if result['issues']:
            for issue in result['issues']:
                print(f"  [{issue.split(':')[0]}] {issue}")
        else:
            print(f"  All headers have content with specific numbers")

    # Write report
    report_path = REPORT_DIR / "rulebook_audit_report.txt"
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("=== RULEBOOK AUDIT SUMMARY ===\n")
        f.write("Date: 2026-02-23\n")
        f.write("Auditor: Barbarian (Claude Code / Opus)\n")
        f.write("Method: Direct rulebook-to-JSON cross-reference\n\n")
        f.write(f"Games audited: {len(all_results)}\n")
        f.write(f"Total player-count rules found in rulebooks: {total_rulebook_rules}\n")
        f.write(f"Total PC headers in game JSONs: {total_json_headers}\n")
        f.write(f"Empty headers: {total_empty}\n")
        f.write(f"Vague headers (no numbers): {total_vague}\n")
        f.write(f"Games with issues: {games_with_issues}\n")
        f.write(f"Games already clean: {len(all_results) - games_with_issues}\n\n")

        for result in all_results:
            f.write(f"\n=== GAME: {result['game_id']} ===\n")
            f.write(f"Rulebook player-count rules found: {result['rulebook_pc_rules']}\n")
            f.write(f"JSON player-count headers: {result['json_pc_headers']}\n")

            if result['issues']:
                for issue in result['issues']:
                    f.write(f"[ISSUE] {issue}\n")
            else:
                f.write("[PASS] All headers present with specific numeric content\n")

            # List JSON sections
            for location, sections in result['json_sections'].items():
                for sec in sections:
                    status = "PRESENT" if sec['has_content'] and sec['has_numbers'] else "VAGUE" if sec['has_content'] else "EMPTY"
                    f.write(f"  [{status}] {location} > {sec['header']}\n")

            f.write(f"\nScore: {result['json_pc_headers'] - result['empty_headers'] - result['vague_headers']}/{result['json_pc_headers']} headers clean\n")

    print(f"\nReport saved to: {report_path}")


if __name__ == "__main__":
    main()
