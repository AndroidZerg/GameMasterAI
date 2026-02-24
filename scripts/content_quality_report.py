#!/usr/bin/env python3
"""Generate comprehensive content quality report for all 50 games."""

import json
import os
import re
import sys
from pathlib import Path

GAMES_DIR = Path(__file__).resolve().parent.parent / "content" / "games"
PC_HEADER_RE = re.compile(r"---\s*(\d+)\s*Players?\s*---", re.IGNORECASE)

REQUIRED_TABS = ["setup", "rules", "strategy"]
REQUIRED_SETUP_SUBTOPICS = ["components", "board-layout", "player-setup", "starting-conditions"]
REQUIRED_RULES_SUBTOPICS = ["turn-structure", "actions", "special-mechanics", "endgame"]
REQUIRED_STRATEGY_SUBTOPICS = ["opening-priorities", "common-mistakes", "key-decisions"]


def analyze_game(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    game_id = data.get('game_id', '')
    title = data.get('title', '')
    complexity = data.get('complexity', '')
    token_count = data.get('total_token_count', 0)
    source_url = data.get('source_url', '')
    source_verified = data.get('source_verified', False)
    pc = data.get('player_count', {})
    pc_min = pc.get('min', 0)
    pc_max = pc.get('max', 0)

    tabs = data.get('tabs', {})

    # Check required tabs
    missing_tabs = [t for t in REQUIRED_TABS if t not in tabs]

    # Check subtopics per tab
    subtopic_counts = {}
    missing_subtopics = []
    for tab_name in REQUIRED_TABS:
        tab = tabs.get(tab_name, {})
        subs = tab.get('subtopics', [])
        sub_ids = [s.get('id', '') for s in subs]
        subtopic_counts[tab_name] = len(subs)

        if tab_name == 'setup':
            required = REQUIRED_SETUP_SUBTOPICS
        elif tab_name == 'rules':
            required = REQUIRED_RULES_SUBTOPICS
        elif tab_name == 'strategy':
            required = REQUIRED_STRATEGY_SUBTOPICS
        else:
            required = []

        for req in required:
            if req not in sub_ids:
                missing_subtopics.append(f"{tab_name}/{req}")

    # Check player-count headers
    pc_headers_with_content = 0
    pc_headers_total = 0
    for tab_name, tab in tabs.items():
        for sub in tab.get('subtopics', []):
            content = sub.get('content', '')
            for m in PC_HEADER_RE.finditer(content):
                pc_headers_total += 1
                # Check if there's content after this header
                start = m.end()
                rest = content[start:]
                next_header = PC_HEADER_RE.search(rest)
                next_section = re.search(r'^####\s+', rest, re.MULTILINE)
                if next_header:
                    body = rest[:next_header.start()]
                elif next_section:
                    body = rest[:next_section.start()]
                else:
                    body = rest
                if body.strip():
                    pc_headers_with_content += 1

    return {
        'game_id': game_id,
        'title': title,
        'complexity': complexity,
        'token_count': token_count,
        'source_url': source_url,
        'source_verified': source_verified,
        'pc_range': f"{pc_min}-{pc_max}",
        'missing_tabs': missing_tabs,
        'subtopic_counts': subtopic_counts,
        'missing_subtopics': missing_subtopics,
        'pc_headers_total': pc_headers_total,
        'pc_headers_with_content': pc_headers_with_content,
        'has_all_subtopics': len(missing_subtopics) == 0,
        'has_pc_content': pc_headers_with_content > 0,
    }


def main():
    games = []
    for f in sorted(GAMES_DIR.glob("*.json")):
        if f.name == "_template.json":
            continue
        games.append(analyze_game(f))

    # Summary stats
    total = len(games)
    all_subtopics = sum(1 for g in games if g['has_all_subtopics'])
    has_pc = sum(1 for g in games if g['has_pc_content'])
    total_tokens = sum(g['token_count'] for g in games)

    # By complexity
    by_complexity = {}
    for g in games:
        c = g['complexity'] or 'unknown'
        by_complexity.setdefault(c, []).append(g['token_count'])

    lines = []
    lines.append("=" * 70)
    lines.append("CONTENT QUALITY REPORT — GMAI Game Database")
    lines.append(f"Generated: 2026-02-23")
    lines.append(f"Total games: {total}")
    lines.append("=" * 70)
    lines.append("")
    lines.append("=== SUMMARY ===")
    lines.append(f"Games with all required subtopics: {all_subtopics}/{total}")
    lines.append(f"Games with player-count content: {has_pc}/{total}")
    lines.append(f"Total token count across all games: {total_tokens:,}")
    lines.append(f"Average token count: {total_tokens // total:,}")
    lines.append("")
    lines.append("Average token count by complexity:")
    for c in sorted(by_complexity.keys()):
        tokens = by_complexity[c]
        avg = sum(tokens) // len(tokens)
        lines.append(f"  {c}: {avg:,} tokens ({len(tokens)} games)")
    lines.append("")

    # Issues summary
    games_with_issues = [g for g in games if g['missing_subtopics'] or g['missing_tabs']]
    if games_with_issues:
        lines.append(f"=== GAMES WITH ISSUES ({len(games_with_issues)}) ===")
        for g in games_with_issues:
            lines.append(f"  {g['game_id']}:")
            if g['missing_tabs']:
                lines.append(f"    Missing tabs: {', '.join(g['missing_tabs'])}")
            if g['missing_subtopics']:
                lines.append(f"    Missing subtopics: {', '.join(g['missing_subtopics'])}")
        lines.append("")
    else:
        lines.append("=== NO STRUCTURAL ISSUES FOUND ===")
        lines.append("")

    # Per-game detail
    lines.append("=" * 70)
    lines.append("=== PER-GAME DETAIL ===")
    lines.append("=" * 70)
    lines.append("")

    for g in games:
        lines.append(f"--- {g['title']} ({g['game_id']}) ---")
        lines.append(f"  Complexity: {g['complexity']}")
        lines.append(f"  Player range: {g['pc_range']}")
        lines.append(f"  Token count: {g['token_count']:,}")
        lines.append(f"  Source URL: {g['source_url']}")
        lines.append(f"  Source verified: {g['source_verified']}")
        lines.append(f"  Subtopics: setup={g['subtopic_counts'].get('setup', 0)}, "
                      f"rules={g['subtopic_counts'].get('rules', 0)}, "
                      f"strategy={g['subtopic_counts'].get('strategy', 0)}")
        lines.append(f"  PC headers: {g['pc_headers_with_content']}/{g['pc_headers_total']} with content")
        if g['missing_subtopics']:
            lines.append(f"  MISSING: {', '.join(g['missing_subtopics'])}")
        else:
            lines.append(f"  All required subtopics: YES")
        lines.append("")

    report = "\n".join(lines)

    out_path = Path(__file__).resolve().parent.parent / "tests" / "content_quality_report.txt"
    out_path.write_text(report, encoding='utf-8')
    print(report)
    print(f"\nReport saved to {out_path}")


if __name__ == "__main__":
    main()
