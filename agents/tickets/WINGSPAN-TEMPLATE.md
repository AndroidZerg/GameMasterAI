# Wingspan JSON Template — Content Contract

All Stonemaier games must match this structure exactly.
Source: `content/games/wingspan.json`

---

## Top-Level Keys

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `game_id` | `string` | Yes | Kebab-case unique ID (e.g. `"wingspan"`) |
| `title` | `string` | Yes | Display title |
| `aliases` | `string[]` | Yes | Alternative names (can be empty `[]`) |
| `publisher` | `string` | Yes | Publisher name |
| `publisher_tag` | `string` | Yes | Lowercase tag for publisher grouping (e.g. `"stonemaier"`) |
| `publisher_approved` | `boolean` | Yes | Whether publisher has approved content |
| `image` | `string` | Yes | Path to cover image |
| `player_count` | `object` | Yes | `{ min, max, recommended, expansion_max }` |
| `play_time_minutes` | `object` | Yes | `{ min, max }` |
| `complexity` | `string` | Yes | One of: `"party"`, `"gateway"`, `"midweight"`, `"heavy"` |
| `categories` | `string[]` | Yes | Gameplay category tags |
| `source_url` | `string` | Yes | Official rules URL |
| `source_verified` | `boolean` | Yes | Whether source has been verified |
| `sections` | `object` | Legacy | Old format — kept for backward compat, DO NOT add to new games |
| `total_token_count` | `integer` | Yes | Sum of all section/tab token counts |
| `extensions` | `object` | Yes | Reserved for expansion content (can be `{}`) |
| `metadata` | `object` | Yes | Authorship, validation, revision tracking |
| `tabs` | `object` | **Yes** | **THE TEACHING MODE CONTENT — required for new format** |

---

## `player_count` Object

```json
{
  "min": 1,
  "max": 5,
  "recommended": 4,
  "expansion_max": null
}
```

## `play_time_minutes` Object

```json
{
  "min": 40,
  "max": 70
}
```

## `metadata` Object

```json
{
  "schema_version": "2.0",
  "created_by": "elf",
  "created_at": "2026-03-10T12:00:00Z",
  "validated_by": "paladin",
  "validated_at": "2026-03-10T12:30:00Z",
  "validation_status": "approved",
  "revision": 5,
  "notes": "Free-text notes about the content."
}
```

---

## `tabs` Object — FULL STRUCTURE

The `tabs` object is the **core teaching content**. It contains 5 tab keys, each with a `subtopics` array.

### Tab Keys (in display order)

| Key | Display Name | Required | Purpose |
|-----|-------------|----------|---------|
| `setup` | Setup | **Yes** | Components, game structure, setup steps |
| `rules` | Rules | **Yes** | Detailed rules, scoring, endgame |
| `strategy` | Strategy | **Yes** | Beginner strategy, tips, common mistakes |
| `walkthrough` | First-Game Walkthrough | Optional | Step-by-step first game guide |
| `advanced_strategy` | Advanced Strategy | Optional | Expert-level strategy, meta-game analysis |

### Tab Internal Structure

Each tab is an object with a single key `subtopics` — an array of subtopic entries:

```json
{
  "setup": {
    "subtopics": [
      {
        "id": "components",
        "title": "Components",
        "content": "#### Markdown content here..."
      },
      {
        "id": "game-structure",
        "title": "Game Structure & Core Loop",
        "content": "#### More markdown content..."
      }
    ]
  }
}
```

### Subtopic Entry Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Kebab-case unique ID within the tab |
| `title` | `string` | Yes | Display title for the subtopic |
| `content` | `string` | Yes | Markdown content — must NOT be empty |

---

## Complete Example: One Tab Entry (walkthrough)

```json
"walkthrough": {
  "subtopics": [
    {
      "id": "first-game-walkthrough",
      "title": "First-Game Walkthrough",
      "content": "#### Your First Game of Wingspan\n\n**Setup Decision**: You get 5 bird cards and 5 food tokens. For each bird you keep, discard 1 food. Keep 1-2 cheap birds with brown powers and 3-4 food. Keep whichever bonus card seems easier.\n\n**Round 1 (8 turns)**\n*Turn 1*: Play your cheapest bird in the Forest. Pay its food cost. Resolve any WHEN PLAYED power.\n*Turn 2*: Gain Food (Forest action). Take food from the birdfeeder. If your bird has a brown power, it activates!\n*Turns 3-4*: Play another bird or gain food/draw cards.\n*Turns 5-8*: Alternate playing birds and using habitat actions. Aim: 3-4 birds placed.\n\n**End Round 1**: Score the round goal. Place 1 cube on goal board — gone forever. Round 2: 7 turns.\n\n**Round 2 (7 turns)**: Build your engine. Play brown-power birds. Start laying eggs in Grassland.\n\n**Round 3 (6 turns)**: Engine should hum. Each habitat action triggers multiple brown powers. Play high-VP birds.\n\n**Round 4 (5 turns)**: Pure scoring. Lay eggs repeatedly (most reliable VP). Play remaining high-VP birds.\n\n**Score**: Bird points + bonus + goals + eggs + cached food + tucked cards. Target: 60-80 VP first game."
    }
  ]
}
```

---

## Summary of Each Tab's Content Pattern

### `setup` — 2 subtopics in Wingspan
1. **Components** — All physical components organized by type (boards, cards, tokens, dice, other)
2. **Game Structure & Core Loop** — Round structure, turn flow, 4 actions, between-round steps, interaction model

### `rules` — 2 subtopics in Wingspan
1. **Detailed Rules** — All mechanical rules: playing birds, power types, birdfeeder, eggs, cached food, tucked cards, nest types, goal board modes, bonus cards, setup summary
2. **Scoring & End Game** — End condition, all VP sources listed, typical score ranges, tiebreaker

### `strategy` — 1 subtopic in Wingspan
1. **Beginner Strategy** — Opening hand advice, power cards to watch for, key synergies, habitat tempo by round, common first-game mistakes

### `walkthrough` — 1 subtopic in Wingspan
1. **First-Game Walkthrough** — Guided play: setup decision, round-by-round actions with specific turn examples, scoring walkthrough

### `advanced_strategy` — 1 subtopic in Wingspan
1. **Advanced Strategy** — Meta-strategies, advanced engine patterns, power type analysis, expert tempo by round, player count adjustments, bonus card evaluation, rules edge cases

---

## Validation Checklist

- [ ] Has `tabs` key (not just `sections`)
- [ ] `tabs.setup` exists with at least 1 subtopic
- [ ] `tabs.rules` exists with at least 1 subtopic
- [ ] `tabs.strategy` exists with at least 1 subtopic
- [ ] Every subtopic has non-empty `id`, `title`, and `content`
- [ ] `publisher_tag` is `"stonemaier"`
- [ ] `publisher_approved` is `true`
- [ ] `metadata.schema_version` is `"2.0"`
