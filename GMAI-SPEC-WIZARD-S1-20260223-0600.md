# GMAI-SPEC-WIZARD-S1-20260223-0600
## From: Bard (CoS)
## To: Wizard (CTO / Architect)
## Priority: HIGH — Blocks content rewrite sprint (44 games waiting)
## Depends On: Nothing — this is the critical path

---

### Context

Tim has redesigned the Game Teacher screen. The original design had 4 mode tabs that were all just different chatbot flavors. The new design makes 3 tabs into pre-rendered, structured reference content and reserves the 4th tab for the AI chatbot.

**The new tab structure:**

| Tab | Content Type | AI? | Purpose |
|-----|-------------|-----|---------|
| **Setup** | Pre-rendered structured text | No | Step-by-step chronological setup guide. Expandable sections. |
| **Rules** | Pre-rendered structured text | No | Rules organized by subtopic. Table-of-contents style, tap to expand. |
| **Strategy** | Pre-rendered structured text | No | Beginner tips, common mistakes, key decisions. Expandable. |
| **Q&A** | Live AI chatbot | Yes | Voice-enabled conversational AI for in-game questions. |

**Key UX principles from Tim:**
1. Every game follows the SAME organizational structure — standardized across the entire library regardless of how the original rulebook was organized
2. Each tab shows collapsed subtopics (like a table of contents) — user taps to expand
3. Setup is in chronological order that makes sense for actually setting up the board (not necessarily the order the rulebook uses)
4. Content loads instantly (no AI latency) for the 3 reference tabs
5. The Q&A chatbot still has access to ALL game content for answering specific questions

**What this means for the schema:**

The current schema has 5 flat text sections:
```json
"sections": {
  "component_identification": { "content": "one big text blob", "token_count": 112 },
  "core_game_loop": { "content": "one big text blob", "token_count": 95 },
  "detailed_rules": { "content": "one big text blob", "token_count": 800 },
  "scoring_and_endgame": { "content": "one big text blob", "token_count": 78 },
  "beginner_strategy": { "content": "one big text blob", "token_count": 110 }
}
```

This doesn't support expandable subtopics or the tab-based UI Tim wants. We need structured sub-sections.

---

### What I Need From You

**1. Redesign the game knowledge base JSON schema** to support:
- Subtopics within each major section
- Each subtopic has a title and content (both serve as expandable accordion items in the UI)
- A mapping from schema sections to UI tabs:
  - Setup tab ← setup-related sections
  - Rules tab ← rules-related sections  
  - Strategy tab ← strategy-related sections
  - Q&A tab ← uses ALL sections as LLM context

**2. Define the standardized subtopic structure.** Tim wants every game to follow the same organizational pattern. This means we need:
- A standard set of subtopics for Setup (e.g., "Components," "Board Layout," "Player Setup," "Starting Conditions")
- A standard set of subtopics for Rules (e.g., "Turn Structure," "Actions Available," "Special Mechanics," "Endgame Trigger")
- A standard set of subtopics for Strategy (e.g., "Opening Priorities," "Common Mistakes," "Key Decisions")
- Rules for when a subtopic can be omitted (e.g., some party games don't have a "Board Layout")

**3. Handle the dual-use requirement.** The same content needs to:
- Render as expandable HTML in the frontend (Setup/Rules/Strategy tabs)
- Concatenate into a single text block for the LLM system prompt (Q&A tab)
- Both need to work well. The structured format can't break the LLM's ability to reason about rules.

**4. Backward compatibility.** We have 6 games that already pass quality (above-and-below, azul, codenames, kingdomino, scythe, sushi-go-party). Can the new schema accommodate both old-format (flat text) and new-format (structured subtopics) during the transition? Or should we just rewrite all 50?

**5. Consider the frontend data flow:**
- Tabs 1-3 (Setup/Rules/Strategy): Frontend fetches game JSON, renders subtopics as expandable accordion UI. No API call needed beyond the initial game load.
- Tab 4 (Q&A): Frontend sends question to /api/query. Backend loads full game JSON, flattens all sections into LLM context, sends to gateway, returns response.

**6. Token budget.** Current spec is 800-3,000 tokens total per game. With richer structured content, do we need to increase this? What's the LLM context window implication if we go to, say, 5,000 tokens per game?

---

### My Proposed Starting Point (For You to Improve)

Here's a rough sketch of what I think the schema could look like. Please improve, restructure, or completely replace this:

```json
{
  "game_id": "catan",
  "title": "Catan",
  "aliases": ["Settlers of Catan"],
  "publisher": "Catan Studio",
  "player_count": { "min": 3, "max": 4, "recommended": 4, "expansion_max": 6 },
  "play_time_minutes": { "min": 60, "max": 120 },
  "complexity": "gateway",
  "categories": ["strategy", "trading", "resource-management"],
  "source_url": "https://cdn.1j1ju.com/medias/7a/18/fd-catan-rulebook.pdf",
  "source_verified": true,

  "tabs": {
    "setup": {
      "display_name": "Setup",
      "subtopics": [
        {
          "title": "What's in the Box",
          "content": "19 terrain hexes (4 wood, 4 wheat, 4 sheep, 3 brick, 3 ore, 1 desert)..."
        },
        {
          "title": "Build the Board",
          "content": "1. Arrange the 6 sea frame pieces into a hexagonal border..."
        },
        {
          "title": "Player Setup",
          "content": "Each player takes: 5 settlements, 4 cities, 15 roads, 1 building cost card..."
        },
        {
          "title": "Starting Placements",
          "content": "Starting with a random first player and going clockwise..."
        }
      ]
    },
    "rules": {
      "display_name": "Rules",
      "subtopics": [
        {
          "title": "Turn Overview",
          "content": "On your turn: 1) Roll dice for resource production, 2) Trade, 3) Build."
        },
        {
          "title": "Resource Production",
          "content": "Roll 2 dice. Every player with a settlement adjacent to a terrain hex matching the number rolled receives..."
        },
        {
          "title": "Trading",
          "content": "You may trade with other players (any mutually agreed deal) or with the bank (4:1, or better with ports)..."
        },
        {
          "title": "Building",
          "content": "Roads cost 1 brick + 1 wood. Settlements cost 1 brick + 1 wood + 1 wheat + 1 sheep..."
        },
        {
          "title": "The Robber",
          "content": "When a 7 is rolled: any player with 8+ cards discards half. Then the roller moves the robber..."
        },
        {
          "title": "Development Cards",
          "content": "Cost: 1 ore + 1 wheat + 1 sheep. Types: Knight (14), VP (5), Road Building (2), Year of Plenty (2), Monopoly (2)..."
        },
        {
          "title": "Winning the Game",
          "content": "First player to reach 10 victory points on their turn wins. VP sources: settlements (1), cities (2), longest road (2), largest army (2), VP development cards (1 each)."
        }
      ]
    },
    "strategy": {
      "display_name": "Strategy",
      "subtopics": [
        {
          "title": "Starting Placement Tips",
          "content": "Prioritize high-probability numbers (6, 8, 5, 9). Diversify resources..."
        },
        {
          "title": "Common Mistakes",
          "content": "Don't over-invest in roads early. Don't ignore ore/wheat — you need them for cities and dev cards..."
        },
        {
          "title": "Key Decisions",
          "content": "Cities vs. expansion: cities double your income but cost ore+wheat. Expanding gets you new resource types..."
        }
      ]
    }
  },

  "total_token_count": 1850,
  "metadata": {
    "schema_version": "2.0",
    "created_by": "halfling",
    "created_at": "2026-02-23T06:00:00Z",
    "validated_by": null,
    "validated_at": null,
    "validation_status": "pending",
    "revision": 2,
    "notes": ""
  }
}
```

**Open questions for you:**
- Should subtopic titles be standardized across ALL games (e.g., every game must have "What's in the Box," "Turn Overview," "Winning the Game") or flexible per game?
- Should we add an `order` field to subtopics or just use array position?
- Should the Q&A tab's LLM context include the subtopic titles as headers, or flatten everything into prose?
- Do we need a `summary` field per subtopic (the collapsed preview text) separate from the full `content`?
- Should the schema support images/diagrams in the future (some setup guides would benefit from visual layout)?

---

### Acceptance Criteria

1. ✅ New schema definition with structured subtopics
2. ✅ Standard subtopic templates for Setup, Rules, and Strategy
3. ✅ Rules for which subtopics are required vs. optional
4. ✅ Guidance on how the backend flattens structured content for LLM context
5. ✅ Updated token budget recommendation
6. ✅ Migration path for existing 6 "good" games
7. ✅ Updated _template.json that Rogues will use

### Report Back

Return the finalized schema spec as a response in this project. Bard will translate it into Rogue instructions and update the rewrite task.

---

*End of spec request.*
