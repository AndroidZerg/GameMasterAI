"""
Full 50-game v3.0 sprint with player-count audit patch (GMAI-PATCH-RANGER-S1-20260223-0720).
Each of 10 Rogues rewrites 5 games using the skimmable style guide + Step 0 player-count extraction.
"""
import subprocess
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

# WSL paths (used in prompts sent to agents running in WSL)
WSL_CONTENT_DIR = "/mnt/d/GameMasterAI/content/games"

# Windows paths (used for local file reading)
CONTENT_DIR = r"D:\GameMasterAI\content\games"
RULEBOOK_DIR = r"D:\GameMasterAI\content\rulebook-text"
TEMPLATE_PATH = r"D:\GameMasterAI\content\games\_template.json"

# Full 10-Rogue batch assignments (from GMAI-TASK-RANGER-S1-20260223-0705)
ASSIGNMENTS = {
    "halfling": ["catan", "wingspan", "dixit", "betrayal-at-house-on-the-hill", "scythe"],
    "elf": ["ticket-to-ride", "7-wonders", "wavelength", "mysterium", "spirit-island"],
    "dwarf": ["carcassonne", "pandemic", "just-one", "villainous", "brass-birmingham"],
    "human": ["azul", "dominion", "the-crew", "photosynthesis", "root"],
    "goblin": ["splendor", "everdell", "coup", "takenoko", "agricola"],
    "gnome": ["codenames", "terraforming-mars", "love-letter", "sheriff-of-nottingham", "concordia"],
    "orc": ["kingdomino", "sagrada", "skull", "dead-of-winter", "great-western-trail"],
    "tiefling": ["sushi-go-party", "above-and-below", "one-night-ultimate-werewolf", "cosmic-encounter", "viticulture"],
    "druid": ["patchwork", "lords-of-waterdeep", "telestrations", "king-of-tokyo", "castles-of-burgundy"],
    "monk": ["century-spice-road", "clank", "decrypto", "quacks-of-quedlinburg", "power-grid"],
}

# Skip games already rewritten in the test sprint (they have v3.0 content)
SKIP_GAMES = {"catan", "carcassonne", "quacks-of-quedlinburg", "splendor", "above-and-below"}

STYLE_GUIDE = r"""
## CONTENT STYLE GUIDE — SKIMMABLE FORMAT

### THE CORE PRINCIPLE
Every piece of content should be scannable in 10 seconds. A player glances at their tablet, finds what they need, reads it, and looks back at the board. They should NEVER need to read a paragraph to find one fact.

### FORMATTING RULE 1: No Walls of Text
Never write a paragraph of 3+ sentences in a row. Instead, break every sentence into its own bulleted line with a **bold summary keyword** at the start.

WRONG:
"You may trade with other players at any agreed ratio. You can also trade with the bank at 4:1, or at better rates if you have a port."

RIGHT:
- **Player trading** — You may trade with other players at any agreed ratio.
- **Bank trading** — Trade with the bank at 4:1, or at better rates if you have a port.

### FORMATTING RULE 2: Player-Count Sections
Whenever setup, rules, or strategy differs by player count, use player-count headers with SPECIFIC values:

--- 2 Players ---
- **Starting coins** — Each player begins with 5 coins (instead of 3).
- **Board setup** — Remove the gray faction tiles from the game.

--- 3 Players ---
- **Starting coins** — Each player begins with 4 coins.
- **Market size** — Display only 3 market cards (instead of 4).

Every player-count header MUST contain EXACT numbers, components, or rule changes from the rulebook. Never write vague text like "adjust starting resources."

### FORMATTING RULE 3: Sub-Headers for Dense Sections
Use #### Header Text within content to break up any section longer than ~5 bullet points.

### FORMATTING RULE 4: Numbered Steps for Sequences Only
Use numbered lists ONLY for things that happen in a specific order. Use bullet lists for everything else.

### FORMATTING RULE 5: Component Lists as Tables
For "What's in the Box," format components in scannable groups with #### sub-headers.

### FORMATTING RULE 6: Strategy Must Be Specific
WRONG: "Try to diversify your resources."
RIGHT: - **Diversify early** — Your first two settlements should touch at least 4 different resource types.
"""

PLAYER_COUNT_AUDIT = r"""
## MANDATORY STEP 0: PLAYER-COUNT AUDIT

BEFORE writing ANY content, you MUST search the entire rulebook text for every instance of player-count variation. Look for:
- "2 player" / "2-player" / "two player" / "for 2 players"
- "3 player" / "3-player" / "three player" / "for 3 players"
- "4 player" / "5 player" / "6 player" (and so on)
- "fewer players" / "more players" / "with fewer" / "with more"
- "solo" / "solo mode" / "solitaire"
- "variant" / "adjusted" / "modified" / "scale"
- Specific numbers in setup tables that differ by count
- Any table or chart with columns for different player counts

Create a player-count reference list FIRST. Example:
```
PLAYER-COUNT DIFFERENCES FOUND:
- Setup: Starting coins differ (2P: 5 coins, 3P: 4 coins, 4P: 3 coins)
- Setup: Board size differs (2P: small board, 3-4P: full board)
- Rules: In 2P, trade action replaced with dummy player mechanic
```

Then, every subtopic that contains a player-count difference from your list MUST include `--- X Players ---` headers with the EXACT specific values for each count. This is a REJECTION-WORTHY requirement.
"""


def build_prompt(game_id):
    """Build the rewrite prompt for a single game."""
    json_path = os.path.join(CONTENT_DIR, f"{game_id}.json")
    with open(json_path, encoding="utf-8") as f:
        existing = f.read()

    rulebook_path = os.path.join(RULEBOOK_DIR, f"{game_id}.txt")
    rulebook_text = ""
    if os.path.exists(rulebook_path):
        with open(rulebook_path, encoding="utf-8") as f:
            rulebook_text = f.read()[:12000]

    return f"""You are rewriting a board game knowledge file for GameMaster Guide. Your job is to reformat the content to be SCANNABLE and SKIMMABLE — not rewrite the rules from scratch.

{PLAYER_COUNT_AUDIT}

{STYLE_GUIDE}

## YOUR TASK

Rewrite the content for **{game_id}** following ALL formatting rules above. The schema stays exactly the same (same tabs, same subtopics). Only the `content` field of each subtopic changes.

### STEP 0 FIRST: Read the rulebook text below and create your player-count reference list before writing anything.

### EXISTING JSON (reformat this):
```json
{existing}
```

### RULEBOOK TEXT (reference for accuracy — search this for player-count variants):
```
{rulebook_text[:8000]}
```

### IMPORTANT RULES:
1. Do Step 0 FIRST — search rulebook for ALL player-count variants
2. Keep the EXACT same JSON structure — same game_id, same tabs, same subtopic IDs and titles
3. Reformat EVERY content field using the style guide
4. Use `- **Bold keyword** — explanation` for informational bullets
5. Use `#### Sub-Header` to break up dense sections
6. Use `--- X Players ---` headers with EXACT SPECIFIC VALUES where setup/rules vary by player count
7. Numbered lists ONLY for sequential steps
8. Group component lists with #### sub-headers
9. Strategy bullets must be specific and actionable
10. Increment metadata.revision by 1
11. Set metadata.created_at to current timestamp
12. Output ONLY valid JSON — no markdown fences, no explanation
13. Every player-count header must have EXACT numbers from the rulebook, never vague language

Use your `write` tool to save the completed JSON to {WSL_CONTENT_DIR}/{game_id}.json
"""


def launch_game(agent_name, game_id):
    """Launch a single game rewrite via openclaw."""
    prompt = build_prompt(game_id)

    print(f"  [{agent_name}] Starting {game_id}...", flush=True)
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
            timeout=360,  # 6 min timeout (extra time for player-count audit)
        )

        elapsed = time.time() - start

        # Validate the output file
        json_path = os.path.join(CONTENT_DIR, f"{game_id}.json")
        try:
            with open(json_path, encoding="utf-8") as f:
                data = json.load(f)

            all_content = ""
            for tab_key in ["setup", "rules", "strategy"]:
                tab = data.get("tabs", {}).get(tab_key, {})
                for st in tab.get("subtopics", []):
                    all_content += st.get("content", "")

            has_bold_prefix = "**" in all_content and "\u2014" in all_content
            has_subheaders = "####" in all_content
            has_player_count = "---" in all_content and "Players" in all_content
            revision = data.get("metadata", {}).get("revision", 0)

            status = "OK"
            markers = []
            if has_bold_prefix: markers.append("bold")
            if has_subheaders: markers.append("sub-h")
            if has_player_count: markers.append("player-ct")

            print(f"  [{agent_name}] {game_id}: {status} ({elapsed:.0f}s) rev={revision} [{', '.join(markers)}]", flush=True)
            return {"game": game_id, "agent": agent_name, "status": "ok", "time": elapsed, "revision": revision,
                    "bold": has_bold_prefix, "subheaders": has_subheaders, "player_count": has_player_count}

        except json.JSONDecodeError as e:
            print(f"  [{agent_name}] {game_id}: BAD JSON - {e}", flush=True)
            return {"game": game_id, "agent": agent_name, "status": "bad_json", "time": elapsed, "error": str(e)}
        except FileNotFoundError:
            print(f"  [{agent_name}] {game_id}: FILE NOT FOUND", flush=True)
            return {"game": game_id, "agent": agent_name, "status": "no_file", "time": elapsed}

    except subprocess.TimeoutExpired:
        elapsed = time.time() - start
        print(f"  [{agent_name}] {game_id}: TIMEOUT ({elapsed:.0f}s)", flush=True)
        return {"game": game_id, "agent": agent_name, "status": "timeout", "time": elapsed}
    except Exception as e:
        elapsed = time.time() - start
        print(f"  [{agent_name}] {game_id}: ERROR - {e}", flush=True)
        return {"game": game_id, "agent": agent_name, "status": "error", "time": elapsed, "error": str(e)}


def main():
    print("=" * 60, flush=True)
    print("  v3.0 FULL SPRINT — 50 Games (with Player-Count Audit)", flush=True)
    print("=" * 60, flush=True)

    # Build task list (skip already-completed test games)
    tasks = []
    skipped = []
    for agent_name, games in ASSIGNMENTS.items():
        for game_id in games:
            if game_id in SKIP_GAMES:
                skipped.append(f"  SKIP {agent_name}/{game_id} (already v3.0)")
                continue
            tasks.append((agent_name, game_id))

    print(f"\nTotal: {len(tasks)} games to rewrite, {len(skipped)} skipped", flush=True)
    for s in skipped:
        print(s, flush=True)
    print(flush=True)

    # Launch Rogues — 10 concurrent (one per Rogue)
    all_results = []
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = {pool.submit(launch_game, agent, game): (agent, game) for agent, game in tasks}
        for future in as_completed(futures):
            result = future.result()
            all_results.append(result)

    # Summary
    print("\n" + "=" * 60, flush=True)
    print("  SPRINT RESULTS", flush=True)
    print("=" * 60, flush=True)

    ok_count = sum(1 for r in all_results if r["status"] == "ok")
    bad_json = [r for r in all_results if r["status"] == "bad_json"]
    timeouts = [r for r in all_results if r["status"] == "timeout"]
    errors = [r for r in all_results if r["status"] in ("error", "no_file")]

    print(f"OK:       {ok_count}/{len(all_results)}", flush=True)
    print(f"Bad JSON: {len(bad_json)}", flush=True)
    print(f"Timeouts: {len(timeouts)}", flush=True)
    print(f"Errors:   {len(errors)}", flush=True)

    # Style marker coverage
    ok_results = [r for r in all_results if r["status"] == "ok"]
    bold_count = sum(1 for r in ok_results if r.get("bold"))
    sub_count = sum(1 for r in ok_results if r.get("subheaders"))
    pc_count = sum(1 for r in ok_results if r.get("player_count"))
    print(f"\nStyle markers (of {len(ok_results)} OK games):", flush=True)
    print(f"  Bold-prefix: {bold_count}", flush=True)
    print(f"  Sub-headers: {sub_count}", flush=True)
    print(f"  Player-count headers: {pc_count}", flush=True)

    if bad_json:
        print("\nBAD JSON games:", flush=True)
        for r in bad_json:
            print(f"  {r['agent']}/{r['game']}: {r.get('error', 'unknown')}", flush=True)

    if timeouts:
        print("\nTIMEOUT games:", flush=True)
        for r in timeouts:
            print(f"  {r['agent']}/{r['game']}", flush=True)

    # Save results to file
    report_path = os.path.join(r"D:\GameMasterAI\agents", "v3_sprint_results.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2)
    print(f"\nResults saved to {report_path}", flush=True)


if __name__ == "__main__":
    main()
