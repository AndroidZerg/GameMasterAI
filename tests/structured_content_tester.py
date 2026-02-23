"""Structured Content Validation Tester — scans game JSON files for player-count content issues.

No LLM calls, no API cost. Pure file validation.

Tests:
  1. No empty player-count headers
  2. Player-count content specificity (must contain numbers)
  3. Setup tab self-sufficiency (setup rules shouldn't only live in other tabs)
  4. Orphan headers (player counts outside min-max range)
"""

import json
import re
import sys
from pathlib import Path

GAMES_DIR = Path(__file__).resolve().parent.parent / "content" / "games"

# Regex for player-count headers: --- 2 Players ---, --- 4 Player ---, etc.
PC_HEADER_RE = re.compile(r"---\s*(\d+)\s*Players?\s*---", re.IGNORECASE)

# Setup-related keywords
SETUP_KEYWORDS = re.compile(
    r"\b(start|begin|place|take|receive|give|deal|distribute|each player gets|starting)\b",
    re.IGNORECASE,
)


def load_all_games():
    """Load all game JSON files."""
    games = []
    for f in sorted(GAMES_DIR.glob("*.json")):
        if f.name == "_template.json":
            continue
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            games.append(data)
        except Exception as e:
            print(f"  [ERROR] Failed to load {f.name}: {e}")
    return games


def extract_pc_sections(content: str):
    """Extract player-count header positions and their content from a subtopic content string.

    Returns list of (player_count: int, header_text: str, body: str).
    """
    lines = content.split("\n")
    sections = []
    i = 0
    while i < len(lines):
        m = PC_HEADER_RE.search(lines[i])
        if m:
            pc = int(m.group(1))
            header_text = lines[i].strip()
            # Collect body lines until next header or end
            body_lines = []
            j = i + 1
            while j < len(lines):
                # Stop at next PC header, markdown header, or divider
                if PC_HEADER_RE.search(lines[j]):
                    break
                if re.match(r"^#{1,4}\s+", lines[j].strip()):
                    break
                if re.match(r"^---\s*\S", lines[j].strip()) and not PC_HEADER_RE.search(lines[j]):
                    break
                body_lines.append(lines[j])
                j += 1
            body = "\n".join(body_lines).strip()
            sections.append((pc, header_text, body))
            i = j
        else:
            i += 1
    return sections


def test1_empty_headers(game):
    """Test 1: No empty player-count headers."""
    failures = []
    tabs = game.get("tabs", {})
    for tab_key in ["setup", "rules", "strategy"]:
        tab = tabs.get(tab_key, {})
        for subtopic in tab.get("subtopics", []):
            sid = subtopic.get("id", "?")
            content = subtopic.get("content", "")
            sections = extract_pc_sections(content)
            for pc, header, body in sections:
                if not body or not body.strip():
                    failures.append(
                        f"Empty header — {tab_key.title()} > {sid} > \"{header}\" has no content"
                    )
    return failures


def test2_specificity(game):
    """Test 2: Player-count content must contain at least one number."""
    failures = []
    tabs = game.get("tabs", {})
    for tab_key in ["setup", "rules", "strategy"]:
        tab = tabs.get(tab_key, {})
        for subtopic in tab.get("subtopics", []):
            sid = subtopic.get("id", "?")
            content = subtopic.get("content", "")
            sections = extract_pc_sections(content)
            for pc, header, body in sections:
                if body.strip() and not re.search(r"\d", body):
                    failures.append(
                        f"No specificity — {tab_key.title()} > {sid} > \"{header}\" content has no numbers"
                    )
    return failures


def test3_setup_sufficiency(game):
    """Test 3: Setup-related player-count rules should be in Setup tab."""
    warnings = []
    tabs = game.get("tabs", {})

    # Collect setup-related PC content from non-setup tabs
    non_setup_rules = []
    for tab_key in ["rules", "strategy"]:
        tab = tabs.get(tab_key, {})
        for subtopic in tab.get("subtopics", []):
            sid = subtopic.get("id", "?")
            content = subtopic.get("content", "")
            sections = extract_pc_sections(content)
            for pc, header, body in sections:
                if body.strip() and SETUP_KEYWORDS.search(body):
                    non_setup_rules.append((tab_key, sid, pc, header, body))

    # Check if those rules also exist in setup tab
    setup_tab = tabs.get("setup", {})
    setup_pc_content = ""
    for subtopic in setup_tab.get("subtopics", []):
        content = subtopic.get("content", "")
        sections = extract_pc_sections(content)
        for pc, header, body in sections:
            setup_pc_content += f" {body} "

    for tab_key, sid, pc, header, body in non_setup_rules:
        # Check if setup has ANY content for this player count
        setup_has_pc = f"--- {pc} Player" in setup_pc_content or f"--- {pc} player" in setup_pc_content
        if not setup_has_pc:
            warnings.append(
                f"Setup missing — {tab_key.title()} > {sid} > \"{header}\" has setup-related rule not in Setup tab"
            )
    return warnings


def test4_orphan_headers(game):
    """Test 4: Player-count headers outside min-max range."""
    failures = []
    pc_info = game.get("player_count", {})
    pc_min = pc_info.get("min", 0)
    pc_max = pc_info.get("max", 99)
    expansion_max = pc_info.get("expansion_max")
    effective_max = expansion_max if expansion_max else pc_max

    tabs = game.get("tabs", {})
    for tab_key in ["setup", "rules", "strategy"]:
        tab = tabs.get(tab_key, {})
        for subtopic in tab.get("subtopics", []):
            sid = subtopic.get("id", "?")
            content = subtopic.get("content", "")
            sections = extract_pc_sections(content)
            for pc, header, body in sections:
                if pc < pc_min or pc > effective_max:
                    failures.append(
                        f"Orphan header — {tab_key.title()} > {sid} > \"{header}\" "
                        f"is outside range {pc_min}-{effective_max}"
                    )
    return failures


def run_all_tests(games):
    """Run all 4 tests on all games and return structured results."""
    results = []
    for game in games:
        gid = game.get("game_id", "unknown")
        r = {
            "game_id": gid,
            "test1_failures": test1_empty_headers(game),
            "test2_failures": test2_specificity(game),
            "test3_warnings": test3_setup_sufficiency(game),
            "test4_failures": test4_orphan_headers(game),
        }
        results.append(r)
    return results


def format_report(results):
    """Format results into the report format."""
    lines = ["=== STRUCTURED CONTENT VALIDATION ===", ""]

    t1_total, t2_total, t3_total, t4_total = 0, 0, 0, 0

    for r in results:
        gid = r["game_id"]
        lines.append(f"Game: {gid}")

        if r["test1_failures"]:
            for f in r["test1_failures"]:
                lines.append(f"  [FAIL] Test 1: {f}")
            t1_total += len(r["test1_failures"])
        else:
            lines.append("  [PASS] Test 1: No empty headers")

        if r["test2_failures"]:
            for f in r["test2_failures"]:
                lines.append(f"  [FAIL] Test 2: {f}")
            t2_total += len(r["test2_failures"])
        else:
            lines.append("  [PASS] Test 2: All player-count content has specific values")

        if r["test3_warnings"]:
            for w in r["test3_warnings"]:
                lines.append(f"  [WARN] Test 3: {w}")
            t3_total += len(r["test3_warnings"])
        else:
            lines.append("  [PASS] Test 3: Setup tab is self-sufficient")

        if r["test4_failures"]:
            for f in r["test4_failures"]:
                lines.append(f"  [FAIL] Test 4: {f}")
            t4_total += len(r["test4_failures"])
        else:
            lines.append("  [PASS] Test 4: No orphan headers")

        lines.append("")

    lines.append(f"SUMMARY: {len(results)} games scanned")
    lines.append(f"  Test 1 (Empty headers):     {t1_total} failures")
    lines.append(f"  Test 2 (Specificity):       {t2_total} failures")
    lines.append(f"  Test 3 (Setup sufficiency): {t3_total} warnings")
    lines.append(f"  Test 4 (Orphan headers):    {t4_total} failures")

    return "\n".join(lines)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")

    print("Loading game files...")
    games = load_all_games()
    print(f"Loaded {len(games)} games.\n")

    print("Running structured content validation...\n")
    results = run_all_tests(games)
    report = format_report(results)
    print(report)

    # Save report
    output = sys.argv[1] if len(sys.argv) > 1 else "tests/structured_content_BEFORE.txt"
    out_path = Path(__file__).resolve().parent.parent / output
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(report, encoding="utf-8")
    print(f"\nReport saved to {out_path}")
