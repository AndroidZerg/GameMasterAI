#!/usr/bin/env python3
"""Generate the definitive final content quality report for Sprint 2."""

import json
import os
import re
import sys

GAMES_DIR = os.path.join(os.path.dirname(__file__), "..", "content", "games")
IMAGES_DIR = os.path.join(os.path.dirname(__file__), "..", "content", "images")
BGG_FILE = os.path.join(os.path.dirname(__file__), "..", "content", "bgg-metadata.json")
TESTS_DIR = os.path.join(os.path.dirname(__file__), "..", "tests")

REQUIRED_SUBTOPIC_IDS = {
    "setup": ["components"],
    "rules": ["turn-structure", "endgame"],
    "strategy": ["opening-priorities", "common-mistakes"],
}

HEADER_PATTERN = re.compile(r"---\s*\d+.*?[Pp]layers?.*?---")


def has_content_after_header(content: str) -> tuple[int, int, list[str]]:
    """Count player-count headers and check for empty ones."""
    matches = list(HEADER_PATTERN.finditer(content))
    total = len(matches)
    empty = []

    for i, match in enumerate(matches):
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
        between = content[start:end].strip()
        if not between:
            empty.append(match.group(0).strip())

    return total, len(empty), empty


def analyze_game(filepath: str, image_files: set, score_files: set, bgg_data: dict) -> dict:
    """Analyze a single game JSON for quality metrics."""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    game_id = data.get("game_id", os.path.basename(filepath).replace(".json", ""))
    title = data.get("title", game_id)
    complexity = data.get("complexity", "unknown")
    tokens = data.get("total_token_count", 0)

    tabs = data.get("tabs", {})

    # Check required subtopics
    missing_subtopics = []
    for tab_name, required_ids in REQUIRED_SUBTOPIC_IDS.items():
        tab_data = tabs.get(tab_name, {})
        subtopic_ids = {s["id"] for s in tab_data.get("subtopics", [])}
        for req_id in required_ids:
            if req_id not in subtopic_ids:
                missing_subtopics.append(f"{tab_name}/{req_id}")

    # Count all subtopics
    total_subtopics = sum(
        len(tab_data.get("subtopics", []))
        for tab_data in tabs.values()
    )

    # Count player-count headers
    total_headers = 0
    total_empty = 0
    empty_details = []

    for tab_name, tab_data in tabs.items():
        for subtopic in tab_data.get("subtopics", []):
            content = subtopic.get("content", "")
            count, empties, empty_list = has_content_after_header(content)
            total_headers += count
            total_empty += empties
            if empty_list:
                empty_details.extend(
                    f"{tab_name}/{subtopic['id']}: {h}" for h in empty_list
                )

    has_cover = game_id in image_files
    has_score = game_id in score_files
    has_bgg = game_id in bgg_data

    issues = []
    if missing_subtopics:
        issues.append(f"missing: {', '.join(missing_subtopics)}")
    if total_empty > 0:
        issues.append(f"{total_empty} empty player-count headers")
    if not has_score:
        issues.append("no score config")
    if tokens < 500:
        issues.append(f"low token count ({tokens})")

    quality = "100%"
    if issues:
        if any("empty" in i or "missing" in i and "score" not in i for i in issues):
            quality = "NEEDS WORK"
        else:
            quality = "MINOR ISSUES"

    return {
        "game_id": game_id,
        "title": title,
        "complexity": complexity,
        "tokens": tokens,
        "subtopics": total_subtopics,
        "player_headers": total_headers,
        "empty_headers": total_empty,
        "has_cover": has_cover,
        "has_score": has_score,
        "has_bgg": has_bgg,
        "missing_subtopics": missing_subtopics,
        "issues": issues,
        "quality": quality,
        "empty_details": empty_details,
    }


def main():
    games_dir = os.path.abspath(GAMES_DIR)
    images_dir = os.path.abspath(IMAGES_DIR)

    # Load BGG metadata
    bgg_data = {}
    bgg_path = os.path.abspath(BGG_FILE)
    if os.path.isfile(bgg_path):
        with open(bgg_path, "r", encoding="utf-8") as f:
            bgg_data = json.load(f)

    # Gather file sets
    json_files = sorted([
        f for f in os.listdir(games_dir)
        if f.endswith(".json") and not f.endswith("-score.json") and f != "_template.json"
    ])

    score_files = set(
        f.replace("-score.json", "")
        for f in os.listdir(games_dir)
        if f.endswith("-score.json")
    )

    image_files = set()
    if os.path.isdir(images_dir):
        image_files = set(
            f.rsplit(".", 1)[0]
            for f in os.listdir(images_dir)
            if f.endswith((".jpg", ".png"))
        )

    # Analyze all games
    results = []
    for fname in json_files:
        filepath = os.path.join(games_dir, fname)
        try:
            result = analyze_game(filepath, image_files, score_files, bgg_data)
            results.append(result)
        except Exception as e:
            print(f"ERROR analyzing {fname}: {e}")

    # Summary stats
    total = len(results)
    perfect = sum(1 for r in results if r["quality"] == "100%")
    minor = sum(1 for r in results if r["quality"] == "MINOR ISSUES")
    needs_work = sum(1 for r in results if r["quality"] == "NEEDS WORK")
    total_tokens = sum(r["tokens"] for r in results)
    total_headers = sum(r["player_headers"] for r in results)
    total_empty = sum(r["empty_headers"] for r in results)
    total_covers = sum(1 for r in results if r["has_cover"])
    total_scores = sum(1 for r in results if r["has_score"])
    total_bgg = sum(1 for r in results if r["has_bgg"])

    # Build report
    lines = [
        "FINAL CONTENT QUALITY REPORT — Sprint 2",
        "=" * 50,
        f"Date: 2026-02-23",
        f"Total games: {total}",
        "",
        "SUMMARY",
        "-" * 50,
        f"  Games at 100% quality:    {perfect}/{total}",
        f"  Games with minor issues:  {minor}/{total}",
        f"  Games needing work:       {needs_work}/{total}",
        f"  Total token count:        {total_tokens:,}",
        f"  Average token count:      {total_tokens // total:,}",
        f"  Total player-count headers: {total_headers}",
        f"  Empty player-count headers: {total_empty}",
        f"  Cover art:                {total_covers}/{total}",
        f"  Score configs:            {total_scores}/{total}",
        f"  BGG metadata:             {total_bgg}/{total}",
        "",
        "=" * 110,
        f"{'Game':<35} {'Cmplx':<10} {'Tokens':<7} {'Subs':<5} {'PcHdr':<6} {'Cover':<6} {'Score':<6} {'Quality'}",
        "=" * 110,
    ]

    for r in results:
        lines.append(
            f"{r['title']:<35} {r['complexity']:<10} {r['tokens']:<7} {r['subtopics']:<5} "
            f"{r['player_headers']:<6} {'Y' if r['has_cover'] else 'N':<6} "
            f"{'Y' if r['has_score'] else 'N':<6} {r['quality']}"
        )

    lines.append("=" * 110)

    # Issues detail
    games_with_issues = [r for r in results if r["issues"]]
    if games_with_issues:
        lines.append("")
        lines.append("DETAILED ISSUES:")
        lines.append("-" * 50)
        for r in games_with_issues:
            lines.append(f"  {r['game_id']}:")
            for issue in r["issues"]:
                lines.append(f"    - {issue}")
            if r["empty_details"]:
                for detail in r["empty_details"]:
                    lines.append(f"    - EMPTY: {detail}")

    # Token distribution by complexity
    by_complexity = {}
    for r in results:
        by_complexity.setdefault(r["complexity"], []).append(r["tokens"])

    lines.append("")
    lines.append("TOKEN DISTRIBUTION BY COMPLEXITY:")
    lines.append("-" * 50)
    for cplx in ["party", "gateway", "midweight", "heavy"]:
        if cplx in by_complexity:
            vals = by_complexity[cplx]
            avg = sum(vals) // len(vals)
            lines.append(f"  {cplx:<12} — {len(vals)} games, avg {avg:,} tokens, range {min(vals):,}-{max(vals):,}")

    lines.append("")
    lines.append("=" * 50)
    lines.append("END OF REPORT")

    report = "\n".join(lines)
    print(report)

    os.makedirs(os.path.abspath(TESTS_DIR), exist_ok=True)
    report_path = os.path.join(os.path.abspath(TESTS_DIR), "final_content_quality_report.txt")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"\nSaved to: {report_path}")


if __name__ == "__main__":
    main()
