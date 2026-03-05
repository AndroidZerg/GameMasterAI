# GMAI-TASK-RANGER-STONEMAIER-20260226

## From: Bard (CoS)
## To: Ranger (Agent Orchestrator)
## Priority: High
## Context

Stonemaier Games has granted GameMaster Guide permission to create
game guides for all their titles. We are adding 12 new Stonemaier
base games to the library. All KB files must be tagged
publisher_approved: true.

## BATCH ASSIGNMENTS

Dispatch to 3 Rogues simultaneously:

### ROGUE 1 (Halfling) — 4 games:
1. Charterstone (bgg_id: 197376)
2. Tapestry (bgg_id: 286096)
3. Red Rising (bgg_id: 322623)
4. Pendulum (bgg_id: 301901)

### ROGUE 2 (Elf) — 4 games:
5. Between Two Castles of Mad King Ludwig (bgg_id: 245655)
6. Between Two Cities (bgg_id: 168435)
7. Euphoria: Build a Better Dystopia (bgg_id: 135608)
8. My Little Scythe (bgg_id: 254127)

### ROGUE 3 (Dwarf) — 4 games:
9. Libertalia: Winds of Galecrest (bgg_id: 356774)
10. Apiary (bgg_id: 400314)
11. Expeditions (bgg_id: 379078)
12. Rolling Realms (bgg_id: 321452)

## INSTRUCTIONS FOR EACH ROGUE

For every game in your batch:

1. FIND THE OFFICIAL RULES
   - Check stonemaier.com/games/{game-name} first
   - Look for "Rules" or "Learn to Play" PDF link
   - If not on Stonemaier site, check BGG files section:
     boardgamegeek.com/boardgame/{bgg_id}/files
   - Use ONLY official publisher rules — not community rewrites

2. WRITE THE KB FILE following GMAI schema exactly:
   - game_id: lowercase hyphenated (matches filename)
   - complexity: "gateway" / "midweight" / "heavy"
   - All 5 sections required: component_identification, core_game_loop,
     detailed_rules, scoring_and_endgame, beginner_strategy
   - Token count 800–3,000 per game
   - CRITICAL: Add these two fields at root level:
     "publisher_approved": true,
     "publisher": "Stonemaier Games"

3. COMPLEXITY GUIDE for Stonemaier games:
   - Rolling Realms, My Little Scythe → "gateway"
   - Between Two Cities, Between Two Castles, Red Rising,
     Libertalia, Charterstone → "midweight"
   - Tapestry, Euphoria, Pendulum, Apiary,
     Expeditions → "heavy"

4. WRITE FILES to content/games/{game_id}.json

5. UPDATE HEARTBEAT after each game

## SCHEMA REMINDER
```json
{
  "game_id": "charterstone",
  "title": "Charterstone",
  "publisher": "Stonemaier Games",
  "publisher_approved": true,
  "player_count": {"min": 1, "max": 6, "recommended": 4},
  "play_time_minutes": {"min": 75, "max": 150},
  "complexity": "midweight",
  "categories": ["engine-building", "legacy", "worker-placement"],
  "source_url": "https://stonemaiergames.com/games/charterstone/rules/",
  "source_verified": true,
  "sections": {
    "component_identification": {"content": "...", "token_count": 0},
    "core_game_loop": {"content": "...", "token_count": 0},
    "detailed_rules": {"content": "...", "token_count": 0},
    "scoring_and_endgame": {"content": "...", "token_count": 0},
    "beginner_strategy": {"content": "...", "token_count": 0}
  },
  "total_token_count": 0,
  "metadata": {
    "created_by": "halfling",
    "created_at": "2026-02-26T00:00:00Z",
    "validated_by": null,
    "validated_at": null,
    "validation_status": "pending",
    "revision": 1
  }
}
```

## QA

After all 3 Rogues finish, dispatch Paladin to validate all 12 files.
Paladin uses the standard quality checklist (GMAI-MASTER-ARCHITECTURE-v2.md Section 11).
Additional check: verify publisher_approved: true is present on all files.

## REPORT BACK

When all 12 games are Paladin-approved, email Tim:
Subject: [GMAI-LOG] Stonemaier KB Batch Complete — 12 games approved
Include: list of all 12 games, any rejections and re-do notes