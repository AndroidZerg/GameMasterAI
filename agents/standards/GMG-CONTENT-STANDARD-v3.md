# GAMEMASTER GUIDE — Content Standard v3.0
## The Wingspan Standard
## Last Updated: March 14, 2026

---

## WHY THIS EXISTS

Every game guide on GameMaster Guide must feel like a patient, knowledgeable friend sitting at the table teaching you the game. Not a rulebook. Not a reference card. A person.

Wingspan is the gold standard. Every new game guide must match Wingspan's voice, structure, and quality before it ships. This document defines exactly what that means — the two-file architecture, the teaching JSON structure, the writing voice, and the quality checklist.

**Who reads this:** Barbarian (before writing any game content), any content writer, any QA reviewer.

**The rule:** If the content doesn't sound like Wingspan, it doesn't ship.

---

## 1. TWO-FILE ARCHITECTURE

Every game requires TWO JSON files:

### File 1: Game JSON — `content/games/{game_id}.json`

This is the metadata + accordion content. The frontend reads `tabs[activeTab].subtopics` to render expandable panels (the collapsed sections with speaker and dropdown icons).

### File 2: Teaching JSON — `content/teaching/{game_id}.json`

This is the step-by-step walkthrough and summary experience. The frontend reads `gameData.teaching` to render numbered steps, images, TTS playback, prev/next navigation, TOC, and the walkthrough/summary toggle.

**The backend merges them at load time:**
```python
# backend/app/api/routes/games.py
teaching_path = _CONTENT_ROOT / "teaching" / f"{game_id}.json"
if teaching_path.exists():
    teaching = json.loads(teaching_path.read_text(encoding="utf-8"))
    game["teaching"] = teaching.get("sections", {})
```

**Without a teaching file, the game only shows accordion panels — no walkthrough, no step-by-step, no TTS navigation, no "Start from beginning."**

---

## 2. GAME JSON STRUCTURE — `content/games/{game_id}.json`

### Top-Level Keys

```json
{
  "game_id": "hasty-baker",
  "title": "Hasty Baker",
  "aliases": [],
  "publisher": "GoChuckle",
  "publisher_tag": "gochuckle",
  "publisher_approved": true,
  "image": "/images/hasty-baker.jpg",
  "player_count": {
    "min": 2,
    "max": 6,
    "recommended": 4,
    "expansion_max": null
  },
  "play_time_minutes": {
    "min": 15,
    "max": 30
  },
  "complexity": "gateway",
  "categories": ["card-game", "set-collection"],
  "source_url": "https://example.com/rules.pdf",
  "source_verified": true,
  "total_token_count": 2500,
  "extensions": {},
  "metadata": {
    "schema_version": "3.0",
    "created_by": "barbarian",
    "created_at": "2026-03-14T00:00:00Z",
    "validated_by": null,
    "validated_at": null,
    "validation_status": "pending",
    "revision": 1,
    "notes": ""
  },
  "tabs": { ... },
  "rules_citations": { ... }
}
```

### Field Rules

| Field | Rule |
|-------|------|
| `game_id` | Lowercase, hyphenated. Must match filename. |
| `publisher_tag` | Lowercase, no spaces. Used for role-based library filtering. |
| `publisher_approved` | `true` only if publisher has given written permission. |
| `image` | Path string like `"/images/hasty-baker.jpg"`. Frontend constructs full URL. |
| `complexity` | One of: `party`, `gateway`, `midweight`, `heavy`. |
| `source_url` | Official rules PDF or publisher rules page. |
| `extensions` | Empty object `{}` unless game has special features. |

### Tabs Structure — Accordion Content

The `tabs` object contains accordion panels. Each tab has a `subtopics` array. **NOT `sections`. NOT `label`.** The frontend reads `tabs[tabKey].subtopics`.

```json
"tabs": {
  "setup": {
    "subtopics": [
      {
        "id": "components",
        "title": "Components",
        "content": "Detailed component list and overview text..."
      },
      {
        "id": "game-structure",
        "title": "Game Structure",
        "content": "Overview of rounds, phases, and game flow..."
      }
    ]
  },
  "rules": {
    "subtopics": [
      {
        "id": "detailed-rules",
        "title": "Detailed Rules",
        "content": "Full rules text with markdown formatting..."
      },
      {
        "id": "endgame",
        "title": "End of Game & Scoring",
        "content": "Endgame trigger and scoring rules..."
      }
    ]
  },
  "strategy": {
    "subtopics": [
      {
        "id": "beginner-strategy",
        "title": "Beginner Strategy",
        "content": "Strategy tips for first-time players..."
      }
    ]
  }
}
```

**Subtopic shape:** `{ "id": "string", "title": "string", "content": "string" }`
- `id`: lowercase, hyphenated identifier
- `title`: Display title for the accordion header
- `content`: Markdown-formatted text (supports `####` headings, `**bold**`, bullet lists, `\n\n` paragraph breaks)

**No `label` key on tabs.** The frontend determines tab display names from the tab key, not a label field.

### Rules Citations

```json
"rules_citations": {
  "source_url": "https://example.com/rules/",
  "rulings": [
    {
      "topic": "Wild Ingredient Usage",
      "ruling": "A wild ingredient can substitute for exactly one ingredient, not multiple.",
      "source": "Official FAQ"
    }
  ]
}
```

**Key name is `rulings`, not `key_rulings`.** Match Wingspan's format exactly.

---

## 3. TEACHING JSON STRUCTURE — `content/teaching/{game_id}.json`

This file powers the step-by-step teaching experience: numbered walkthrough, summary bullets, TTS, prev/next, TOC, images.

### Top-Level

```json
{
  "game_id": "hasty-baker",
  "title": "Hasty Baker",
  "sections": {
    "setup": { ... },
    "rules": { ... },
    "strategy": { ... }
  }
}
```

### Required Sections

Every teaching file MUST have at minimum: `setup`, `rules`, `strategy`.

### Optional Sections (Recommended for Midweight+)

- `practice_tutorial` — Scripted first round with example players
- `general_tips` — Broader beginner strategy (replaces/supplements strategy)
- `advanced_strategies` — Deep engine/combo strategies
- `appendix` — Searchable reference entries

### Section Format — Walkthrough + Summary

Every section (except appendix) has both a `walkthrough` and `summary` array:

```json
"setup": {
  "walkthrough": [
    {
      "step": 1,
      "title": "Shuffle the Ingredient Deck",
      "text": "Alright, let's get Hasty Baker set up. Find the big stack of ingredient cards — these have colorful pictures of flour, sugar, eggs, butter, and other baking supplies on them. Give them a good shuffle and place the deck face-down in the center of the table where everyone can reach it.",
      "image": "hasty-baker-setup-01-ingredient-deck.jpg",
      "image_caption": "Ingredient deck shuffled and placed face-down"
    },
    {
      "step": 2,
      "title": "Deal Starting Hands",
      "text": "Now deal 5 ingredient cards to each player. Go ahead and look at your hand but keep it secret from other players. These are the ingredients you'll be working with to complete recipes.",
      "image": null,
      "image_caption": null
    }
  ],
  "summary": [
    {
      "step": 1,
      "title": "Shuffle the Ingredient Deck",
      "bullets": [
        "Shuffle all ingredient cards into one face-down deck",
        "Place centrally where all players can reach"
      ],
      "image": "hasty-baker-setup-01-ingredient-deck.jpg"
    },
    {
      "step": 2,
      "title": "Deal Starting Hands",
      "bullets": [
        "Deal 5 ingredient cards to each player",
        "Keep your hand secret"
      ],
      "image": null
    }
  ]
}
```

### Walkthrough Step Shape

```json
{
  "step": 1,
  "title": "Short Step Title",
  "text": "Conversational walkthrough text. Written for TTS. 2-4 sentences.",
  "image": "filename.jpg or null",
  "image_caption": "Brief description or null"
}
```

- `step`: Integer, 1-indexed, sequential
- `title`: Short title shown in TOC and step header
- `text`: The teaching content. TTS reads this aloud. Must be Wingspan voice.
- `image`: Filename only (no path). Served from `content/images/{game_id}/`. Null if no image.
- `image_caption`: Caption below image. Null if no image.

**Note:** `general_tips` and `advanced_strategies` steps typically do NOT have images.

### Summary Step Shape

```json
{
  "step": 1,
  "title": "Short Step Title",
  "bullets": [
    "Action-oriented bullet point",
    "Another concise instruction"
  ],
  "image": "filename.jpg or null"
}
```

- `step`: Must match walkthrough step numbers exactly
- `title`: Same title as corresponding walkthrough step
- `bullets`: Array of concise strings. No conversational filler.
- `image`: Same image as walkthrough (or null). No `image_caption` on summary.

**Step counts must match between walkthrough and summary for each section.**

### Appendix Shape

```json
"appendix": {
  "categories": ["Cards", "Ingredients", "Scoring", "Terminology"],
  "entries": [
    {
      "term": "Blue Ribbon Card",
      "definition": "A special card worth bonus points at end of game.",
      "category": "Cards"
    }
  ]
}
```

---

## 4. IMAGE FILES

Step images go in `content/images/{game_id}/` (a subdirectory per game).

### Naming Convention
```
{game_id}-{section}-{##}-{description}.jpg
```

Examples:
```
hasty-baker-setup-01-ingredient-deck.jpg
hasty-baker-setup-02-recipe-cards.jpg
house-hounds-setup-01-house-cards.jpg
```

### Cover Art
Separate from step images. Goes at `content/images/{game_id}.jpg` (not in subdirectory). Referenced in game JSON as `"image": "/images/{game_id}.jpg"`.

---

## 5. SCORE CONFIGS — `content/scores/{game_id}.json`

```json
{
  "game_id": "hasty-baker",
  "title": "Hasty Baker",
  "score_types": [
    {
      "id": "recipes",
      "label": "Completed Recipes",
      "description": "1 point per completed recipe card"
    }
  ],
  "min_players": 2,
  "max_players": 6,
  "default_players": 4
}
```

---

## 6. THE WINGSPAN VOICE

### Core Principles

**1. You're sitting at the table with them.**
Write as if physically present, teaching people who just opened the box.

**2. Orient before instructing.**
Describe what they're looking at BEFORE telling them what to do.

**3. One step at a time.**
Each walkthrough step = ONE action. Never stack 3+ instructions.

**4. Name things specifically.**
Describe components by appearance AND game name.

**5. Checkpoint after setup.**
Final setup step confirms what their area should look like.

**6. Flag common mistakes.**
"Quick heads up — most new players forget this..."

**7. Teach rules by turn flow.**
"On your turn, you'll pick one of two actions. First..."

### Voice Do's and Don'ts

| DO | DON'T |
|----|-------|
| "Grab the recipe deck and shuffle it well" | "Shuffle the recipe deck" |
| "You'll see each recipe shows the ingredients you need" | "Recipe cards display required ingredients" |
| "Here's what trips up most new players" | "Note: this rule is frequently misunderstood" |
| Use "you/your" throughout | Use "players" or "each participant" |
| Use contractions naturally | Write formally |
| 2-4 sentences per walkthrough step | Long paragraphs |
| Written for speech (TTS reads verbatim) | Abbreviations, "(see page 12)", "e.g." |

---

## 7. QUALITY CHECKLIST

| # | Check | Pass Criteria |
|---|-------|--------------|
| 1 | Both files exist | `content/games/{id}.json` AND `content/teaching/{id}.json` |
| 2 | Valid JSON | `python -m json.tool` passes on all files |
| 3 | game_id matches filename | Same game_id in both files, matches filename |
| 4 | Game JSON uses subtopics | Tabs contain `subtopics` array, NOT `sections`, NOT `label` |
| 5 | Teaching has required sections | `setup`, `rules`, `strategy` with walkthrough + summary |
| 6 | Step counts match | Walkthrough and summary have same count per section |
| 7 | Steps sequential | 1, 2, 3... no gaps or duplicates |
| 8 | Wingspan voice | Walkthrough text sounds like a friend teaching |
| 9 | Orient-then-instruct | Describe before directing |
| 10 | One step at a time | No stacked instructions |
| 11 | Specific names | Components described by appearance + name |
| 12 | Checkpoints | Final setup step confirms player area |
| 13 | Turn flow teaching | Rules by flow, not category |
| 14 | Concrete strategy | Names specific game elements |
| 15 | Common mistakes | 2-3 "heads up" callouts |
| 16 | TTS-friendly | No abbreviations or markdown in walkthrough text |
| 17 | Summary concise | Bullets action-oriented, no filler |
| 18 | Rules citations | `rulings` array with 5+ entries |
| 19 | Score config exists | Matches game's actual scoring |
| 20 | No invented rules | Traces to official rulebook |
| 21 | Images referenced correctly | Filenames in teaching JSON exist on disk |
| 22 | Cover art exists | `content/images/{game_id}.jpg` present |
| 23 | No label key on tabs | Tabs do NOT have `"label"` field |
| 24 | Has publisher_tag | Lowercase string for library filtering |
| 25 | `rulings` not `key_rulings` | Match Wingspan's exact key name |

---

## 8. WINGSPAN REFERENCE — COUNTS

### Game JSON (content/games/wingspan.json)
- `tabs.setup`: 2 subtopics
- `tabs.rules`: 2 subtopics
- `tabs.strategy`: 1 subtopic
- `tabs.walkthrough`: 1 subtopic
- `tabs.advanced_strategy`: 1 subtopic

### Teaching JSON (content/teaching/wingspan.json)
- `setup`: 14 walkthrough + 14 summary steps (with images)
- `rules`: 11 walkthrough + 11 summary steps (with images)
- `practice_tutorial`: 25 + 25 steps
- `general_tips`: 8 + 8 steps
- `advanced_strategies`: 10 + 10 steps
- `appendix`: 79 entries, 9 categories

### Images: 19 step images + 1 cover

### Minimum Viable Guide (Gateway Games)
- Game JSON: setup (1-2 subtopics), rules (1-2 subtopics), strategy (1 subtopic)
- Teaching JSON: setup (6-10 steps), rules (8-12 steps), strategy (5-8 steps)
- Appendix: 10-20 entries
- Score config

---

*Every game must have BOTH a game JSON and a teaching JSON. When in doubt, read Wingspan's files and match their structure exactly.*
