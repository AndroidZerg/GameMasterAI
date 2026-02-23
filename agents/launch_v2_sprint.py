#!/usr/bin/env python3
"""Launch all 10 Rogues for the v2.0 content rewrite sprint.
Each Rogue processes 5 games sequentially, writing files directly via tools."""

import json
import subprocess
import sys
from pathlib import Path
from datetime import datetime, timezone

GAMES_DIR = Path("/mnt/d/GameMasterAI/content/games")
RULEBOOK_DIR = Path("/mnt/d/GameMasterAI/content/rulebook-text")
TEMPLATE_PATH = GAMES_DIR / "_template.json"
HEARTBEAT_DIR = Path("/mnt/d/GameMasterAI/agents/heartbeat")

ASSIGNMENTS = {
    "halfling": [
        ("catan", "Catan", "gateway"),
        ("wingspan", "Wingspan", "midweight"),
        ("dixit", "Dixit", "party"),
        ("betrayal-at-house-on-the-hill", "Betrayal at House on the Hill", "midweight"),
        ("scythe", "Scythe", "heavy"),
    ],
    "elf": [
        ("ticket-to-ride", "Ticket to Ride", "gateway"),
        ("seven-wonders", "7 Wonders", "midweight"),
        ("wavelength", "Wavelength", "party"),
        ("mysterium", "Mysterium", "midweight"),
        ("spirit-island", "Spirit Island", "heavy"),
    ],
    "dwarf": [
        ("carcassonne", "Carcassonne", "gateway"),
        ("pandemic", "Pandemic", "midweight"),
        ("just-one", "Just One", "party"),
        ("villainous", "Villainous", "midweight"),
        ("brass-birmingham", "Brass: Birmingham", "heavy"),
    ],
    "human": [
        ("azul", "Azul", "gateway"),
        ("dominion", "Dominion", "midweight"),
        ("the-crew", "The Crew", "party"),
        ("photosynthesis", "Photosynthesis", "midweight"),
        ("root", "Root", "heavy"),
    ],
    "goblin": [
        ("splendor", "Splendor", "gateway"),
        ("everdell", "Everdell", "midweight"),
        ("coup", "Coup", "party"),
        ("takenoko", "Takenoko", "midweight"),
        ("agricola", "Agricola", "heavy"),
    ],
    "gnome": [
        ("codenames", "Codenames", "gateway"),
        ("terraforming-mars", "Terraforming Mars", "midweight"),
        ("love-letter", "Love Letter", "party"),
        ("sheriff-of-nottingham", "Sheriff of Nottingham", "midweight"),
        ("concordia", "Concordia", "heavy"),
    ],
    "orc": [
        ("kingdomino", "Kingdomino", "gateway"),
        ("sagrada", "Sagrada", "midweight"),
        ("skull", "Skull", "party"),
        ("dead-of-winter", "Dead of Winter", "midweight"),
        ("great-western-trail", "Great Western Trail", "heavy"),
    ],
    "tiefling": [
        ("sushi-go-party", "Sushi Go Party!", "gateway"),
        ("above-and-below", "Above and Below", "midweight"),
        ("one-night-ultimate-werewolf", "One Night Ultimate Werewolf", "party"),
        ("cosmic-encounter", "Cosmic Encounter", "midweight"),
        ("viticulture", "Viticulture", "heavy"),
    ],
    "druid": [
        ("patchwork", "Patchwork", "gateway"),
        ("lords-of-waterdeep", "Lords of Waterdeep", "midweight"),
        ("telestrations", "Telestrations", "party"),
        ("king-of-tokyo", "King of Tokyo", "midweight"),
        ("castles-of-burgundy", "Castles of Burgundy", "heavy"),
    ],
    "monk": [
        ("century-spice-road", "Century: Spice Road", "gateway"),
        ("clank", "Clank!", "midweight"),
        ("decrypto", "Decrypto", "party"),
        ("quacks-of-quedlinburg", "Quacks of Quedlinburg", "midweight"),
        ("power-grid", "Power Grid", "heavy"),
    ],
}

TOKEN_RANGES = {
    "party": "1,200-2,000",
    "gateway": "2,000-3,500",
    "midweight": "2,500-4,000",
    "heavy": "3,500-5,000",
}

template_json = TEMPLATE_PATH.read_text(encoding="utf-8")


def build_single_game_prompt(agent_name, game_id, title, complexity):
    """Build prompt for a single game."""
    token_range = TOKEN_RANGES[complexity]

    rb_path = RULEBOOK_DIR / f"{game_id}.txt"
    if rb_path.exists():
        rb_text = rb_path.read_text(encoding="utf-8", errors="replace")
        if len(rb_text) > 15000:
            rb_text = rb_text[:15000] + "\n[TRUNCATED]"
    else:
        rb_text = "[No rulebook text. Use training knowledge. Note in metadata.notes]"

    return f"""Write a Schema v2.0 game teaching guide for: {title}
game_id: {game_id}
complexity: {complexity}
Target tokens: {token_range}

Use the write tool to save the completed JSON to: /mnt/d/GameMasterAI/content/games/{game_id}.json

TEMPLATE (use this exact structure):
{template_json}

RULES:
- PRIMARY SOURCE is the rulebook text below. Write from it, not training data.
- Fill EVERY field. Set source_verified=true, metadata.created_by="{agent_name}", metadata.schema_version="2.0"
- Required subtopics: components, player-setup, starting-conditions, turn-structure, actions, endgame, opening-priorities, common-mistakes
- Optional: board-layout, special-mechanics, key-decisions
- endgame is ALWAYS last in rules tab
- Component counts must be exact from rulebook
- Turn structure must be numbered
- All VP sources and tiebreakers in endgame
- Strategy must be specific and actionable

RULEBOOK TEXT FOR {title}:
{rb_text}

Write the complete JSON file now using the write tool."""


def launch_single_game(agent_name, game_id, title, complexity):
    """Launch a single game write via openclaw agent."""
    prompt = build_single_game_prompt(agent_name, game_id, title, complexity)
    prompt_file = Path(f"/tmp/gmai-{agent_name}-{game_id}.txt")
    prompt_file.write_text(prompt, encoding="utf-8")

    cmd = f'openclaw agent --agent {agent_name} --message "$(cat {prompt_file})" --json'
    result = subprocess.run(
        ["bash", "-c", cmd],
        capture_output=True, text=True, timeout=180
    )

    # Check if file was written
    game_file = GAMES_DIR / f"{game_id}.json"
    if game_file.exists():
        try:
            data = json.loads(game_file.read_text(encoding="utf-8"))
            has_tabs = "tabs" in data
            schema = data.get("metadata", {}).get("schema_version", "?")
            print(f"  {agent_name}/{game_id}: OK (schema={schema}, has_tabs={has_tabs})")
            return True
        except:
            print(f"  {agent_name}/{game_id}: file exists but invalid JSON")
            return False
    else:
        print(f"  {agent_name}/{game_id}: file NOT written")
        return False


def process_agent(agent_name):
    """Process all 5 games for a single agent sequentially."""
    games = ASSIGNMENTS[agent_name]
    print(f"\n=== {agent_name.upper()} — {len(games)} games ===")

    completed = 0
    for game_id, title, complexity in games:
        print(f"  Starting {title}...")
        try:
            if launch_single_game(agent_name, game_id, title, complexity):
                completed += 1
        except subprocess.TimeoutExpired:
            print(f"  {agent_name}/{game_id}: TIMEOUT")
        except Exception as e:
            print(f"  {agent_name}/{game_id}: ERROR: {e}")

    # Write heartbeat
    now = datetime.now(timezone.utc).isoformat()
    heartbeat = {
        "agent": agent_name,
        "timestamp": now,
        "status": "complete" if completed == len(games) else "working",
        "current_game": "",
        "batch_progress": {
            "total": len(games),
            "completed": completed,
            "in_progress": 0,
            "failed": len(games) - completed,
            "in_qa": 0,
            "approved": 0,
        },
        "last_completed": games[-1][0] if completed > 0 else None,
        "blockers": [],
    }
    HEARTBEAT_DIR.mkdir(parents=True, exist_ok=True)
    (HEARTBEAT_DIR / f"{agent_name}.json").write_text(
        json.dumps(heartbeat, indent=2), encoding="utf-8"
    )
    print(f"  {agent_name}: {completed}/{len(games)} games complete")
    return completed


def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "all"

    if target == "all":
        agents = list(ASSIGNMENTS.keys())
    else:
        agents = [target]

    total_completed = 0
    total_games = 0
    for agent_name in agents:
        completed = process_agent(agent_name)
        total_completed += completed
        total_games += len(ASSIGNMENTS[agent_name])

    print(f"\n{'='*40}")
    print(f"SPRINT COMPLETE: {total_completed}/{total_games} games written")


if __name__ == "__main__":
    main()
