#!/usr/bin/env python3
"""Generate unified game metadata report."""

import json
import os
import sys

GAMES_DIR = os.path.join(os.path.dirname(__file__), "..", "content", "games")
IMAGES_DIR = os.path.join(os.path.dirname(__file__), "..", "content", "images")
BGG_FILE = os.path.join(os.path.dirname(__file__), "..", "content", "bgg-metadata.json")
TESTS_DIR = os.path.join(os.path.dirname(__file__), "..", "tests")


def main():
    games_dir = os.path.abspath(GAMES_DIR)
    images_dir = os.path.abspath(IMAGES_DIR)

    # Load BGG metadata
    bgg_data = {}
    bgg_path = os.path.abspath(BGG_FILE)
    if os.path.isfile(bgg_path):
        with open(bgg_path, "r", encoding="utf-8") as f:
            bgg_data = json.load(f)

    # Get all game files
    json_files = sorted([
        f for f in os.listdir(games_dir)
        if f.endswith(".json") and not f.endswith("-score.json") and f != "_template.json"
    ])

    # Get score config files
    score_files = set(
        f.replace("-score.json", "")
        for f in os.listdir(games_dir)
        if f.endswith("-score.json")
    )

    # Get image files
    image_files = set()
    if os.path.isdir(images_dir):
        image_files = set(
            f.replace(".jpg", "").replace(".png", "")
            for f in os.listdir(images_dir)
            if f.endswith((".jpg", ".png"))
        )

    rows = []
    total_tokens = 0
    issues = []

    for fname in json_files:
        filepath = os.path.join(games_dir, fname)
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        game_id = data.get("game_id", fname.replace(".json", ""))
        title = data.get("title", game_id)
        complexity = data.get("complexity", "unknown")
        pc = data.get("player_count", {})
        pc_str = f"{pc.get('min', '?')}-{pc.get('max', '?')}"
        tokens = data.get("total_token_count", 0)
        total_tokens += tokens

        has_cover = "YES" if game_id in image_files else "NO"
        has_score = "YES" if game_id in score_files else "NO"
        has_bgg = "YES" if game_id in bgg_data else "NO"

        # Check tabs
        tabs = data.get("tabs", {})
        has_setup = "setup" in tabs
        has_rules = "rules" in tabs
        has_strategy = "strategy" in tabs

        # Check required subtopics
        setup_ids = {s["id"] for s in tabs.get("setup", {}).get("subtopics", [])}
        rules_ids = {s["id"] for s in tabs.get("rules", {}).get("subtopics", [])}
        strategy_ids = {s["id"] for s in tabs.get("strategy", {}).get("subtopics", [])}

        has_components = "components" in setup_ids
        has_turn = "turn-structure" in rules_ids
        has_endgame = "endgame" in rules_ids

        game_issues = []
        if not has_setup:
            game_issues.append("missing setup tab")
        if not has_rules:
            game_issues.append("missing rules tab")
        if not has_strategy:
            game_issues.append("missing strategy tab")
        if not has_components:
            game_issues.append("missing components subtopic")
        if not has_turn:
            game_issues.append("missing turn-structure subtopic")
        if not has_endgame:
            game_issues.append("missing endgame subtopic")
        if has_score == "NO":
            game_issues.append("no score config")

        rows.append({
            "game_id": game_id,
            "title": title,
            "complexity": complexity,
            "players": pc_str,
            "tokens": tokens,
            "cover": has_cover,
            "score": has_score,
            "bgg": has_bgg,
            "issues": game_issues,
        })

        if game_issues:
            issues.append((game_id, game_issues))

    # Build report
    perfect = sum(1 for r in rows if not r["issues"])
    minor = sum(1 for r in rows if r["issues"] and len(r["issues"]) <= 1)
    needs_work = sum(1 for r in rows if len(r["issues"]) > 1)

    lines = [
        "GAME METADATA REPORT",
        "====================",
        f"Date: 2026-02-23",
        f"Total games: {len(rows)}",
        f"Total tokens: {total_tokens:,}",
        f"Average tokens: {total_tokens // len(rows):,}",
        f"Games at 100%: {perfect}/{len(rows)}",
        f"Games with minor issues: {minor}/{len(rows)}",
        f"Games needing work: {needs_work}/{len(rows)}",
        f"Cover art: {sum(1 for r in rows if r['cover'] == 'YES')}/{len(rows)}",
        f"Score configs: {sum(1 for r in rows if r['score'] == 'YES')}/{len(rows)}",
        f"BGG metadata: {sum(1 for r in rows if r['bgg'] == 'YES')}/{len(rows)}",
        "",
        "=" * 80,
        f"{'Game':<35} {'Complexity':<11} {'Players':<8} {'Tokens':<7} {'Cover':<6} {'Score':<6} {'Issues'}",
        "=" * 80,
    ]

    for r in rows:
        issue_str = "; ".join(r["issues"]) if r["issues"] else "OK"
        lines.append(
            f"{r['title']:<35} {r['complexity']:<11} {r['players']:<8} {r['tokens']:<7} {r['cover']:<6} {r['score']:<6} {issue_str}"
        )

    lines.append("=" * 80)

    if issues:
        lines.append("")
        lines.append("GAMES WITH ISSUES:")
        for gid, gi in issues:
            lines.append(f"  {gid}: {', '.join(gi)}")

    report = "\n".join(lines)
    print(report)

    os.makedirs(os.path.abspath(TESTS_DIR), exist_ok=True)
    report_path = os.path.join(os.path.abspath(TESTS_DIR), "game_metadata_report.txt")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"\nSaved to: {report_path}")


if __name__ == "__main__":
    main()
