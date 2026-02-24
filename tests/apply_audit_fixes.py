#!/usr/bin/env python3
"""Apply rulebook audit fixes to game JSON files.

Each fix targets a specific game, tab, subtopic, and location.
"""

import json
from pathlib import Path

GAMES_DIR = Path(__file__).resolve().parent.parent / "content" / "games"

fixes_applied = []


def load_game(game_id):
    path = GAMES_DIR / f"{game_id}.json"
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f), path


def save_game(data, path):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')


def find_subtopic(data, tab_key, subtopic_id):
    tabs = data.get("tabs", {})
    tab = tabs.get(tab_key, {})
    for st in tab.get("subtopics", []):
        if st.get("id") == subtopic_id:
            return st
    return None


def append_to_content(data, tab_key, subtopic_id, new_text):
    st = find_subtopic(data, tab_key, subtopic_id)
    if st:
        st["content"] = st["content"].rstrip() + "\n\n" + new_text
        return True
    return False


def replace_in_content(data, tab_key, subtopic_id, old, new):
    st = find_subtopic(data, tab_key, subtopic_id)
    if st and old in st["content"]:
        st["content"] = st["content"].replace(old, new)
        return True
    return False


def fix_love_letter():
    data, path = load_game("love-letter")
    # Add per-count win thresholds to endgame
    st = find_subtopic(data, "rules", "endgame")
    if st:
        content = st["content"]
        # Replace existing 4-player-only threshold with full per-count
        if "--- 4 Players ---" in content and "--- 2 Players ---" not in content:
            # Add all thresholds
            thresholds = (
                "#### Win Thresholds by Player Count\n"
                "--- 2 Players ---\n"
                "- **Win threshold** \u2014 First to 6 favor tokens wins.\n\n"
                "--- 3 Players ---\n"
                "- **Win threshold** \u2014 First to 5 favor tokens wins.\n\n"
                "--- 4 Players ---\n"
                "- **Win threshold** \u2014 First to 4 favor tokens wins.\n\n"
                "--- 5 Players ---\n"
                "- **Win threshold** \u2014 First to 3 favor tokens wins.\n\n"
                "--- 6 Players ---\n"
                "- **Win threshold** \u2014 First to 3 favor tokens wins."
            )
            # Find and replace the existing 4-player block
            import re
            content = re.sub(
                r'---\s*4\s*Players\s*---.*?(?=\n####|\n---\s*\d|\Z)',
                thresholds,
                content,
                flags=re.DOTALL
            )
            st["content"] = content
            fixes_applied.append("love-letter: Added per-count win thresholds (2P=6, 3P=5, 4P=4, 5P=3, 6P=3)")
    save_game(data, path)


def fix_power_grid():
    data, path = load_game("power-grid")
    # Add exact step 2 and game-end city counts
    added = append_to_content(data, "rules", "endgame",
        "#### Game-End City Thresholds by Player Count\n"
        "--- 2 Players ---\n"
        "- **End trigger** \u2014 Game ends when a player connects 18 cities.\n\n"
        "--- 3 Players ---\n"
        "- **End trigger** \u2014 Game ends when a player connects 17 cities.\n\n"
        "--- 4 Players ---\n"
        "- **End trigger** \u2014 Game ends when a player connects 17 cities.\n\n"
        "--- 5 Players ---\n"
        "- **End trigger** \u2014 Game ends when a player connects 15 cities.\n\n"
        "--- 6 Players ---\n"
        "- **End trigger** \u2014 Game ends when a player connects 14 cities."
    )
    if added:
        fixes_applied.append("power-grid: Added exact game-end city thresholds per player count")

    # Fix step 2 trigger
    replaced = replace_in_content(data, "rules", "special-mechanics",
        "Step 2 city threshold for current player count",
        "Step 2 city threshold: 7 cities for 2-5 players, 6 cities for 6 players"
    )
    if replaced:
        fixes_applied.append("power-grid: Fixed Step 2 trigger with exact city counts")

    save_game(data, path)


def fix_quacks():
    data, path = load_game("quacks-of-quedlinburg")
    added = append_to_content(data, "rules", "special-mechanics",
        "#### Black Ingredient Book Player-Count Variant\n"
        "--- 2 Players ---\n"
        "- **Book page** \u2014 Use the 2-player page of the black ingredient book (indicated by 2 pots at bottom).\n\n"
        "--- 3 Players ---\n"
        "- **Book page** \u2014 Use the 3-4 player page of the black ingredient book (indicated by 3-4 pots at bottom).\n\n"
        "--- 4 Players ---\n"
        "- **Book page** \u2014 Use the 3-4 player page of the black ingredient book (indicated by 3-4 pots at bottom)."
    )
    if added:
        fixes_applied.append("quacks-of-quedlinburg: Added 2P vs 3-4P black ingredient book variant")
    save_game(data, path)


def fix_terraforming_mars():
    data, path = load_game("terraforming-mars")
    # Add 2-player award exception
    added1 = append_to_content(data, "rules", "endgame",
        "#### 2-Player Award Exception\n"
        "--- 2 Players ---\n"
        "- **No second place** \u2014 In a 2-player game, second place in funded awards gives 0 VP instead of 2 VP."
    )
    if added1:
        fixes_applied.append("terraforming-mars: Added 2-player award scoring exception")

    # Add solo variant rules
    added2 = append_to_content(data, "rules", "special-mechanics",
        "#### Solo Variant Rules\n"
        "--- 1 Player ---\n"
        "- **Starting TR** \u2014 Start at TR 14 instead of 20.\n"
        "- **No milestones or awards** \u2014 Milestones and Awards are not used in solo play.\n"
        "- **Neutral opponent** \u2014 A virtual opponent exists for resource/production removal effects.\n"
        "- **Neutral cities** \u2014 Place 2 neutral city tiles on the map with adjacent greenery before choosing cards.\n"
        "- **Generation cap** \u2014 Must complete terraforming (all 3 global parameters at goal) before end of Generation 14.\n"
        "- **Loss condition** \u2014 If not terraformed by end of Generation 14, you lose.\n"
        "- **Post-game greenery** \u2014 Convert remaining plants to greenery without raising oxygen, then score VP."
    )
    if added2:
        fixes_applied.append("terraforming-mars: Added solo variant rules")
    save_game(data, path)


def fix_sushi_go_party():
    data, path = load_game("sushi-go-party")
    # Add pudding 2-player exception
    added = append_to_content(data, "rules", "endgame",
        "#### 2-Player Pudding Exception\n"
        "--- 2 Players ---\n"
        "- **No fewest penalty** \u2014 The player with the fewest Pudding does not lose any points in a 2-player game."
    )
    if added:
        fixes_applied.append("sushi-go-party: Added 2-player pudding no-penalty exception")
    save_game(data, path)


def fix_scythe():
    data, path = load_game("scythe")
    added = append_to_content(data, "rules", "special-mechanics",
        "#### 2-Player Recruit Rule\n"
        "--- 2 Players ---\n"
        "- **Recruit bonus limit** \u2014 When your opponent takes a bottom-row action that would trigger your Recruit Ongoing Bonus, you gain it only once (not twice)."
    )
    if added:
        fixes_applied.append("scythe: Added 2-player recruit bonus limit rule")
    save_game(data, path)


def fix_the_crew():
    data, path = load_game("the-crew")
    # Add dealing differences
    st = find_subtopic(data, "setup", "player-setup")
    if st and "Player-Count Dealing Differences" in st.get("content", ""):
        # The header exists but may be empty - add content after it
        content = st["content"]
        old_header = "Player-Count Dealing Differences"
        if old_header in content:
            # Find and expand this section
            dealing_content = (
                "Player-Count Dealing Differences\n"
                "--- 3 Players ---\n"
                "- **Card distribution** \u2014 40 cards dealt as evenly as possible; one player receives 14 cards, two receive 13.\n"
                "- **Leftover card** \u2014 After the last trick, 1 card remains unplayed.\n\n"
                "--- 4 Players ---\n"
                "- **Card distribution** \u2014 40 cards dealt evenly; each player receives 10 cards.\n\n"
                "--- 5 Players ---\n"
                "- **Card distribution** \u2014 40 cards dealt evenly; each player receives 8 cards."
            )
            content = content.replace(old_header, dealing_content)
            st["content"] = content
            fixes_applied.append("the-crew: Filled player-count dealing differences (3P=14/13/13, 4P=10, 5P=8)")

    # Add 3-player challenge variant
    added = append_to_content(data, "rules", "special-mechanics",
        "#### 3-Player Challenge Variant\n"
        "--- 3 Players ---\n"
        "- **Reduced deck** \u2014 Remove all green playing cards, all green task cards, and the Rocket 1 card.\n"
        "- **Mission exceptions** \u2014 Missions 13 and 44 are affected; you do not need to win Rocket 1 in those missions."
    )
    if added:
        fixes_applied.append("the-crew: Added 3-player challenge variant (remove green cards)")

    save_game(data, path)


def main():
    print("Applying rulebook audit fixes...\n")

    fix_love_letter()
    fix_power_grid()
    fix_quacks()
    fix_terraforming_mars()
    fix_sushi_go_party()
    fix_scythe()
    fix_the_crew()

    print(f"Total fixes applied: {len(fixes_applied)}\n")
    for fix in fixes_applied:
        print(f"  - {fix}")

    # Save fix log
    log_path = Path(__file__).resolve().parent / "rulebook_audit_fixes.txt"
    with open(log_path, 'w', encoding='utf-8') as f:
        f.write("=== RULEBOOK AUDIT FIX LOG ===\n")
        f.write("Date: 2026-02-23\n")
        f.write("Auditor: Barbarian (Claude Code / Opus)\n\n")
        f.write(f"Total fixes applied: {len(fixes_applied)}\n\n")
        for fix in fixes_applied:
            f.write(f"- {fix}\n")
    print(f"\nFix log saved to: {log_path}")


if __name__ == "__main__":
    main()
