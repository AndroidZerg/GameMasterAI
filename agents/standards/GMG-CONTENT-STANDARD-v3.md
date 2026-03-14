# GAMEMASTER GUIDE — Content Standard v3.0
## The Wingspan Standard
## Last Updated: March 14, 2026

---

## WHY THIS EXISTS

Every game guide on GameMaster Guide must feel like a patient, knowledgeable friend sitting at the table teaching you the game. Not a rulebook. Not a reference card. A person.

Wingspan is the gold standard. Every new game guide must match Wingspan's voice, structure, and quality before it ships. This document defines exactly what that means — the JSON structure, the writing voice, the tab layout, and the quality checklist.

**Who reads this:** Barbarian (before writing any game content), any content writer, any QA reviewer.

**The rule:** If the content doesn't sound like Wingspan, it doesn't ship.

---

## 1. JSON STRUCTURE

Every game file lives at `content/games/{game_id}.json`. The `game_id` is lowercase, hyphenated, and matches the filename.

### Top-Level Keys

```json
{
  "game_id": "hasty-baker",
  "title": "Hasty Baker",
  "aliases": [],
  "publisher": "Publisher Name",
  "publisher_approved": false,
  "player_count": {
    "min": 2,
    "max": 5,
    "recommended": 4,
    "expansion_max": null
  },
  "play_time_minutes": {
    "min": 20,
    "max": 40
  },
  "complexity": "gateway",
  "categories": ["card-game", "set-collection"],
  "bgg_id": null,
  "image": null,
  "source_url": "https://example.com/rules.pdf",
  "source_verified": true,

  "tabs": { ... },

  "rules_citations": { ... },

  "total_token_count": 0,
  "metadata": {
    "schema_version": "3.0",
    "created_by": "barbarian",
    "created_at": "2026-03-14T00:00:00Z",
    "validated_by": null,
    "validated_at": null,
    "validation_status": "pending",
    "revision": 1,
    "notes": ""
  }
}
```

### Field Rules

| Field | Rule |
|-------|------|
| `game_id` | Lowercase, hyphenated. Must match filename. |
| `complexity` | One of: `party`, `gateway`, `midweight`, `heavy` |
| `publisher_approved` | `true` only if publisher has given written permission |
| `source_url` | Official rules PDF or publisher rules page. Not BGG forums. Not YouTube. |
| `source_verified` | `true` only if the URL was confirmed accessible and contains official rules |
| `bgg_id` | BoardGameGeek game ID (integer). Used for cover art. Null if unknown. |
| `image` | Leave null. Frontend constructs image URL from game_id automatically. |

---

## 2. TABS STRUCTURE

The `tabs` object contains the teaching content. Every game MUST have at minimum: `setup`, `rules`, `strategy`. Additional tabs are optional but encouraged for midweight+ games.

### Required Tabs

```json
"tabs": {
  "setup": {
    "label": "Setup",
    "sections": [
      {
        "title": "Section Title",
        "content": "Walkthrough content here..."
      }
    ]
  },
  "rules": {
    "label": "Rules",
    "sections": [ ... ]
  },
  "strategy": {
    "label": "Strategy",
    "sections": [ ... ]
  }
}
```

### Optional Tabs (Recommended for Midweight+)

```json
"tabs": {
  "setup": { ... },
  "rules": { ... },
  "practice_tutorial": {
    "label": "Practice Tutorial",
    "sections": [ ... ]
  },
  "general_tips": {
    "label": "General Tips",
    "sections": [ ... ]
  },
  "advanced_strategies": {
    "label": "Advanced Strategies",
    "sections": [ ... ]
  },
  "appendix": {
    "label": "Appendix",
    "sections": [ ... ]
  },
  "strategy": { ... }
}
```

### Tab Rendering Order

The frontend renders tabs in the order they appear in the JSON object. Standard order:

1. Setup
2. Rules
3. Practice Tutorial (optional)
4. General Tips (optional — falls back to `strategy` if absent)
5. Advanced Strategies (optional)
6. Appendix (optional)
7. Strategy (always present as fallback)

### Section Format

Every section inside a tab has exactly two fields:

```json
{
  "title": "Short Descriptive Title",
  "content": "The walkthrough text. Multiple paragraphs separated by \\n\\n. Can be several hundred words for complex sections."
}
```

- `title`: Short, descriptive. Shows in the Table of Contents. Examples: "Lay Out the Board", "Your Turn — The Four Actions", "Common Beginner Mistakes"
- `content`: The actual teaching text. This is what gets displayed AND what TTS reads aloud. Write it to sound good spoken.

---

## 3. THE WINGSPAN VOICE

This is the most important section. The voice is what separates a good guide from a rulebook rewrite.

### Core Principles

**1. You're sitting at the table with them.**
Write as if you're physically present, teaching the game to people who just opened the box. You can see the components. You can point at things. You're patient and encouraging.

**2. Orient before instructing.**
Before telling someone what to do, tell them what they're looking at. "See that big board? That's the island map. Each hex represents a different terrain type." THEN: "Place it in the center of the table."

**3. One step at a time.**
Never stack multiple instructions in one paragraph. Each physical action gets its own moment. Let the reader complete one thing before moving to the next.

**4. Name things specifically.**
Not "put the tokens nearby" but "place the five food tokens — the little pink eggs, blue fish, golden wheat, green apples, and brown worms — in a pile where everyone can reach them."

**5. Checkpoint after each section.**
End setup sections with a natural pause: "Your play area should now have the player mat in front of you with your food tokens above it. Got all that? Let's move on."

**6. Flag common mistakes proactively.**
"Quick heads up — a lot of first-time players forget this, but you can NOT place a bird in the wetland without paying an egg for each bird already in that row."

**7. Teach by turn flow, not by rule category.**
In the Rules tab, don't organize by "Movement Rules", "Combat Rules", "Trading Rules." Instead: "On your turn, you'll do three things in order. First..."

### Voice Do's and Don'ts

| DO | DON'T |
|----|-------|
| "Take the player mat and place it in front of you" | "Each player receives one player mat" |
| "You'll see three rows — these are your habitats" | "The player mat contains three habitat rows" |
| "Here's the thing most people miss on their first game" | "Note: this rule is frequently overlooked" |
| "Now grab a handful of food tokens from the supply" | "Distribute food tokens to each player" |
| "Your forest is your food engine — the more birds there, the more food you'll earn each turn" | "The forest habitat provides food acquisition actions" |
| Use "you/your" throughout | Use "players" or "each participant" |
| Use contractions naturally | Write formally |
| Use em dashes for asides | Use parenthetical references |
| Describe physical objects by appearance | Refer to components by game-term only |

### Setup Tab Voice Example

**BAD (Reference Style — this is what Rogues produce):**
```
Components: 1 game board, 170 bird cards, 26 bonus cards, 75 egg miniatures,
5 player mats, 5 action cubes, 1 goal board, 4 goal tiles, 1 birdfeeder dice
tower with 5 food dice, 40 food tokens, 1 first-player token, 1 scorepad.

Setup: Place the bird tray in the center. Shuffle bird cards and place face-down
as draw pile. Draw 3 cards face-up on the tray. Place goal board, select 4 goals.
Each player takes 1 player mat, 8 action cubes, 5 food tokens, and draws 5 bird cards.
```

**GOOD (Wingspan Standard — this is what we ship):**
```
Let's get everything set up. Start by placing the bird tray — that's the long
cardboard piece with slots — in the center of the table where everyone can reach it.

Take the bird deck (the big stack of cards with birds on them) and shuffle it well.
Place it face-down next to the tray. Now flip the top 3 cards face-up and lay them
in the tray slots. These are the birds available for anyone to pick up.

Next, find the goal board — it's the narrow horizontal board with four spaces on it.
Place it where everyone can see it. Shuffle the goal tiles and randomly place one
in each slot, green side up for your first game.

Now each player grabs their own setup: one player mat (the wide board with three rows
of forest, grassland, and wetland), a set of 8 action cubes in your color, and
5 food tokens from the supply — grab one of each type.

Finally, deal each player 5 bird cards from the deck. Look at your hand but keep it
secret. You'll choose which birds to keep in just a moment.

Check your area: player mat in front of you, 8 action cubes on the mat's left side,
5 food tokens above your mat, and 5 bird cards in your hand. All set? Let's go.
```

### Rules Tab Voice

Teach rules through the flow of a turn, not as categorized rule blocks:

**BAD:**
```
Trading Rules: Players may trade resource cards with any other player on their turn.
Maritime trade allows 4:1 exchange with the bank. Port locations improve this ratio.
```

**GOOD:**
```
After you roll for resources, you get a chance to trade. You can make deals with
any other player — "I'll give you two wheat for one ore" — and there are no
restrictions on what you offer. Just remember, only the player whose turn it is
can initiate trades.

If nobody wants to deal, you can always trade with the bank: hand in 4 of the same
resource and take any 1 you want. Not a great rate, but it gets you out of a jam.
And if you've built on a port? Even better — ports let you trade at 3:1 or even 2:1
for specific resources.
```

### Strategy Tab Voice

Name specific game elements. Give concrete advice, not platitudes:

**BAD:**
```
Try to diversify your resources and plan ahead. Don't put all your eggs in one basket.
Focus on building an efficient engine.
```

**GOOD:**
```
In your first game, here's the biggest trap: spending your early turns playing
expensive birds. That 7-food bird looks amazing, but you'll burn three turns just
gathering food to play it. Instead, start with cheap forest birds — anything that
costs 1-2 food and gives you a "gain food" power. Birds like the Eastern Bluebird
or the Killdeer. They'll pay for themselves within two rounds.

Your forest row is your food engine. Your grassland is your egg engine. Your wetland
draws cards. The winning move in most games is getting 2-3 birds into your forest
by the end of Round 1, then shifting to eggs and cards in Rounds 2-3.
```

---

## 4. RULES CITATIONS

Every game guide should include a `rules_citations` field with key rulings sourced from official FAQs, BGG forums, and errata documents. This helps the AI answer edge-case questions accurately.

```json
"rules_citations": {
  "source_url": "https://stonemaiergames.com/games/wingspan/rules/",
  "key_rulings": [
    {
      "topic": "Repeat a Power (Brown)",
      "ruling": "When you activate a brown 'when activated' power, you may choose not to use it. You cannot partially use a power.",
      "source": "Official FAQ v1.5"
    },
    {
      "topic": "Tucking vs Caching",
      "ruling": "Tucked cards go face-down behind the bird and are worth 1 VP each. Cached food sits on top of the bird and is also worth 1 VP each. They are different mechanics.",
      "source": "BGG FAQ thread"
    }
  ]
}
```

Target: 5-10 key rulings per game. Focus on the questions people actually ask at the table — the edge cases, the "wait, does this mean...?" moments.

---

## 5. SCORE CONFIGS

Every game also needs a score config file at `content/scores/{game_id}.json`. This drives the Score tab in the app.

```json
{
  "game_id": "hasty-baker",
  "title": "Hasty Baker",
  "score_types": [
    {
      "id": "recipes",
      "label": "Recipes Completed",
      "description": "Points from completed recipe cards"
    },
    {
      "id": "bonus",
      "label": "Bonus Points",
      "description": "Points from bonus objectives"
    }
  ],
  "min_players": 2,
  "max_players": 5,
  "default_players": 4
}
```

Score types should match the actual scoring categories in the game's endgame. Check the rulebook's scoring section.

---

## 6. COVER ART

Place a cover image at `content/images/{game_id}.jpg`. The frontend serves this from `/api/images/{game_id}.jpg`.

Requirements:
- JPEG format, reasonable file size (under 500KB)
- Square or near-square preferred (the UI handles non-square with blurred background)
- Use BGG cover art if publisher-approved, or a photo of the box if not

---

## 7. CONTENT CREATION WORKFLOW

### For Each New Game

1. **Read the rulebook.** The actual official rulebook, not a summary. If the rulebook files are in the repo (e.g., `D:\GameMasterAI\{Game Name}\`), read them directly. If not, find the official rules PDF.

2. **Research edge cases.** Check BGG forums for the top 5-10 most-asked rules questions. Check for official errata or FAQ documents. Check Reddit for common strategy discussions.

3. **Write the Setup tab first.** Walk through the physical setup step by step. Imagine the box is open in front of you. What do you pick up first? What goes where? End with a checkpoint.

4. **Write the Rules tab.** Teach through turn flow. Start with "On your turn, you'll..." and walk through each decision point. After covering the basic turn, handle special cases, end-game triggers, and scoring.

5. **Write the Strategy tab.** Name specific cards, positions, resources. Give the advice you'd give a friend on their first game. "In your first game, do THIS. The trap is THAT."

6. **Add rules_citations.** Pull 5-10 key rulings from official sources. Focus on table-time questions.

7. **Create the score config.** Match the game's actual endgame scoring categories.

8. **Validate the JSON.** Run `python -m json.tool content/games/{game_id}.json` to confirm valid JSON.

9. **Read it aloud.** If the content sounds awkward when read aloud, rewrite it. TTS will read this verbatim — it must flow as natural speech.

---

## 8. QUALITY CHECKLIST

Before any game guide ships, it must pass every check:

| # | Check | Pass Criteria |
|---|-------|--------------|
| 1 | Valid JSON | `python -m json.tool` passes with zero errors |
| 2 | game_id matches filename | `hasty-baker.json` has `"game_id": "hasty-baker"` |
| 3 | All required tabs present | `setup`, `rules`, `strategy` all exist with sections |
| 4 | No empty sections | Every section has non-empty `title` and `content` |
| 5 | Wingspan voice | Content reads like a person teaching, not a rulebook |
| 6 | Orient-then-instruct | Setup describes what you're looking at before telling you what to do |
| 7 | One step at a time | No paragraphs that stack 3+ instructions without a break |
| 8 | Specific names | Components described by appearance AND game name, not just "the tokens" |
| 9 | Checkpoints | Setup sections end with "here's what your area should look like" |
| 10 | Turn flow teaching | Rules organized by turn flow, not by rule category |
| 11 | Concrete strategy | Strategy names specific game elements, not generic advice |
| 12 | Common mistakes flagged | At least 2-3 "heads up" callouts for first-time player traps |
| 13 | Rules citations | 5-10 key rulings with sources |
| 14 | Score config exists | `content/scores/{game_id}.json` created and matches game scoring |
| 15 | Sounds good spoken | Content reads naturally when spoken aloud by TTS |
| 16 | No invented rules | Every rule can be traced to the official rulebook |
| 17 | Player count accurate | Matches the game's published player count |
| 18 | Complexity correct | Matches the game's actual weight (party/gateway/midweight/heavy) |
| 19 | Source URL valid | Points to official rules, confirmed accessible |
| 20 | Token count in range | Total content 1,500-5,000 tokens for gateway, 3,000-8,000 for midweight+ |

---

## 9. COMMON FAILURE MODES

These are the mistakes we've seen in previous content sprints. Watch for them:

**1. Reference voice instead of walkthrough voice.**
The #1 failure. Content reads like a rulebook summary instead of a person teaching. If you see bullet points, passive voice, or "players receive," it's wrong.

**2. Stacking instructions.**
"Place the board in the center, shuffle the cards, deal 5 to each player, and put the remaining cards face-down." That's 4 actions in one sentence. Break them apart.

**3. Generic strategy advice.**
"Try to balance your resource production" tells the player nothing. "In your first game, grab at least two wheat hexes — you'll need wheat for both settlements and cities, and running out of wheat is the #1 reason beginners stall" tells them exactly what to do.

**4. Missing edge cases in rules.**
The rulebook says "draw 2 cards." But what happens when the deck runs out? What if there's only 1 card left? These are the questions people ask at the table. Cover them.

**5. Wrong tab organization.**
Rules organized as "Movement", "Combat", "Trading" instead of "Your Turn: Step 1, Step 2, Step 3." Teach by flow, not by category.

**6. Content that doesn't sound right spoken.**
TTS reads the content verbatim. If you wrote "e.g." it will say "e.g." not "for example." If you wrote "(see page 12)" it will read that aloud. Write for speech.

---

## 10. MINIMUM VIABLE GUIDE (Gateway Games)

For simple gateway games, the minimum viable guide is:

- **Setup tab:** 3-6 sections covering components, board layout, player setup, starting conditions
- **Rules tab:** 4-8 sections covering turn overview, main actions, special rules, end game & scoring
- **Strategy tab:** 3-5 sections covering first-game priorities, common mistakes, key decisions
- **Rules citations:** 5 key rulings
- **Score config:** All endgame scoring categories

Total content: ~1,500-3,000 tokens.

### Full Guide (Midweight+ Games)

For midweight and heavy games, the full guide adds:

- **Practice Tutorial tab:** A scripted first round walking through 2-4 players taking real turns with specific examples
- **General Tips tab:** Broader strategic concepts, timing advice, common mistakes expanded
- **Advanced Strategies tab:** Named strategies, engine combinations, meta-game advice
- **Appendix tab:** Quick-reference entries for powers, keywords, edge cases

Total content: ~3,000-8,000 tokens.

---

*This is the permanent content standard for GameMaster Guide. Every game guide must meet this standard before shipping. When in doubt, read Wingspan and match its voice.*
