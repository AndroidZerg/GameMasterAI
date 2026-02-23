"""
Launch 5 test Rogues with v3.0 skimmable style guide for feedback.
Each Rogue rewrites 1 game using the new formatting rules.
"""
import subprocess
import json
import os
import time

# WSL paths (used in prompts sent to agents running in WSL)
WSL_CONTENT_DIR = "/mnt/d/GameMasterAI/content/games"

# Windows paths (used for local file reading)
CONTENT_DIR = r"D:\GameMasterAI\content\games"
RULEBOOK_DIR = r"D:\GameMasterAI\content\rulebook-text"
TEMPLATE_PATH = r"D:\GameMasterAI\content\games\_template.json"

TEST_ASSIGNMENTS = {
    "tiefling": "above-and-below",
    "dwarf": "carcassonne",
    "monk": "quacks-of-quedlinburg",
    "goblin": "splendor",
    "halfling": "catan",
}

STYLE_GUIDE = r"""
## CONTENT STYLE GUIDE — SKIMMABLE FORMAT

### THE CORE PRINCIPLE
Every piece of content should be scannable in 10 seconds. A player glances at their tablet, finds what they need, reads it, and looks back at the board. They should NEVER need to read a paragraph to find one fact.

### FORMATTING RULE 1: No Walls of Text
Never write a paragraph of 3+ sentences in a row. Instead, break every sentence into its own bulleted line with a **bold summary keyword** at the start.

WRONG — Wall of text:
"You may trade with other players at any agreed ratio. You can also trade with the bank at 4:1, or at better rates if you have a port."

RIGHT — Scannable bullets:
- **Player trading** — You may trade with other players at any agreed ratio.
- **Bank trading** — Trade with the bank at 4:1, or at better rates if you have a port.

The bold prefix is the anchor. A player scanning for info sees the bold keywords instantly.

### FORMATTING RULE 2: Player-Count Sections
Whenever setup, rules, or strategy differs by player count, use player-count headers:

--- 2 Players ---
Each player starts with 5 coins and 3 workers.

--- 3 Players ---
Each player starts with 4 coins and 3 workers.

Only use these where there's an actual difference. If all player counts play the same, just write normally.

### FORMATTING RULE 3: Sub-Headers for Dense Sections
Use #### Header Text within content to break up any section longer than ~5 bullet points:

#### Movement Actions
- **Walk** — Move 1-2 spaces along connected paths.
- **Ride** — Spend 1 horse token to move up to 4 spaces.

#### Build Actions
- **House** — Pay 2 wood + 1 stone. Place on an empty village space.

### FORMATTING RULE 4: Numbered Steps for Sequences Only
Use numbered lists ONLY for things that happen in a specific order. Use bullet lists for everything else.

### FORMATTING RULE 5: Component Lists as Tables
For "What's in the Box," format components in scannable groups with sub-headers:

#### Board & Tokens
- **1** game board
- **4** player boards

#### Cards
- **80** resource cards (20 each: wood, brick, wheat, sheep)

### FORMATTING RULE 6: Strategy Must Be Specific
WRONG: "Try to diversify your resources."
RIGHT: - **Diversify early** — Your first two settlements should touch at least 4 different resource types.
"""


def build_prompt(game_id):
    """Build the rewrite prompt for a single game."""
    # Read existing JSON
    json_path = os.path.join(CONTENT_DIR, f"{game_id}.json")
    with open(json_path, encoding="utf-8") as f:
        existing = f.read()

    # Read rulebook text
    rulebook_path = os.path.join(RULEBOOK_DIR, f"{game_id}.txt")
    rulebook_text = ""
    if os.path.exists(rulebook_path):
        with open(rulebook_path, encoding="utf-8") as f:
            rulebook_text = f.read()[:12000]  # Cap at 12k chars

    # Read template
    with open(TEMPLATE_PATH, encoding="utf-8") as f:
        template = f.read()

    return f"""You are rewriting a board game knowledge file for GameMaster AI. Your job is to reformat the content to be SCANNABLE and SKIMMABLE — not rewrite the rules from scratch.

{STYLE_GUIDE}

## YOUR TASK

Rewrite the content for **{game_id}** following ALL formatting rules above. The schema stays exactly the same (same tabs, same subtopics). Only the `content` field of each subtopic changes.

### EXISTING JSON (reformat this):
```json
{existing}
```

### RULEBOOK TEXT (reference for accuracy):
```
{rulebook_text[:8000]}
```

### IMPORTANT RULES:
1. Keep the EXACT same JSON structure — same game_id, same tabs, same subtopic IDs and titles
2. Reformat EVERY content field using the style guide
3. Use `- **Bold keyword** — explanation` for informational bullets
4. Use `#### Sub-Header` to break up dense sections
5. Use `--- X Players ---` headers where setup/rules vary by player count
6. Numbered lists ONLY for sequential steps
7. Group component lists with #### sub-headers
8. Strategy bullets must be specific and actionable
9. Increment metadata.revision by 1
10. Set metadata.created_at to current timestamp
11. Output ONLY valid JSON — no markdown fences, no explanation

Use your `write` tool to save the completed JSON to {WSL_CONTENT_DIR}/{game_id}.json
"""


def launch_game(agent_name, game_id):
    """Launch a single game rewrite via openclaw."""
    prompt = build_prompt(game_id)

    print(f"  Launching {agent_name}/{game_id}...")
    start = time.time()

    try:
        result = subprocess.run(
            [
                "wsl", "openclaw", "agent",
                "--agent", agent_name,
                "--message", prompt,
                "--json",
            ],
            capture_output=True,
            text=True,
            timeout=300,  # 5 min timeout
        )

        elapsed = time.time() - start

        # Check if file was written (CONTENT_DIR is already a Windows path)
        json_path = os.path.join(CONTENT_DIR, f"{game_id}.json")
        try:
            with open(json_path, encoding="utf-8") as f:
                data = json.load(f)
            has_tabs = "tabs" in data

            # Check for new style markers
            all_content = ""
            for tab_key in ["setup", "rules", "strategy"]:
                tab = data.get("tabs", {}).get(tab_key, {})
                for st in tab.get("subtopics", []):
                    all_content += st.get("content", "")

            has_bold_prefix = "**" in all_content and "—" in all_content
            has_subheaders = "####" in all_content
            revision = data.get("metadata", {}).get("revision", 0)

            print(f"  {agent_name}/{game_id}: OK ({elapsed:.0f}s) rev={revision} bold_prefix={has_bold_prefix} subheaders={has_subheaders}")
            return True
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"  {agent_name}/{game_id}: FILE ERROR - {e}")
            return False

    except subprocess.TimeoutExpired:
        print(f"  {agent_name}/{game_id}: TIMEOUT (300s)")
        return False
    except Exception as e:
        print(f"  {agent_name}/{game_id}: ERROR - {e}")
        return False


def main():
    print("=== v3.0 Test Sprint — 5 Games ===\n")

    results = {}
    for agent_name, game_id in TEST_ASSIGNMENTS.items():
        ok = launch_game(agent_name, game_id)
        results[game_id] = ok

    print(f"\n=== RESULTS ===")
    passed = sum(1 for v in results.values() if v)
    print(f"Passed: {passed}/{len(results)}")
    for game_id, ok in results.items():
        print(f"  {'✅' if ok else '❌'} {game_id}")


if __name__ == "__main__":
    main()
