# GMAI-TASK-RANGER-PD-CONTENT-REWRITE-20260226
## From: Bard (CoS)
## To: Ranger (Agent Orchestrator)
## Priority: High
## Depends On: Schema is finalized — do not change structure, only content

---

### Context

The 5 public domain game knowledge bases are structurally correct but the
teaching content is thin and below production quality. These games are the
only titles visible to convention attendees at Dice Tower West (March 11–15)
and to all demo/convention accounts. They must match the quality bar set by
Catan, Above & Below, and Quacks of Quedlinburg.

The schema is locked. Rogues rewrite CONTENT ONLY — do not restructure,
rename fields, or change image_url, public_domain, or publisher_approved.

---

### Source Authority

Each game has an official authoritative rules source. Rogues must use ONLY
these sources — no BGG forum posts, no YouTube summaries, no community wikis.

| Game | Source | URL |
|------|--------|-----|
| Chess | FIDE Laws of Chess (2023) | https://www.fide.com/FIDE/handbook/LawsOfChess.pdf |
| Go | American Go Association Simplified Rules | https://www.usgo.org/files/pdf/simplegorules.pdf + https://www.britgo.org/files/rules/short-rules.pdf |
| Checkers | American Checkers Federation Official Rules | https://www.usacheckers.com/rulesofcheckers.php |
| Dominoes | Official Double-Six rules from Domino Plaza + World Domino Federation | https://www.domino-games.com/domino-rules/basic-dominoes.html |
| Mahjong | World Mahjong Organization Official Rules (Chinese Mahjong) | https://mahjong-europe.org/portal/index.php?option=com_content&view=article&id=25&Itemid=9 |

---

### Game Assignments

Assign based on complexity tier — these are all gateway/midweight:

| Agent | Game | Rationale |
|-------|------|-----------|
| Halfling | Chess | Gateway complexity, most familiar structure |
| Elf | Go | Deceptively deep strategy — needs careful handling |
| Dwarf | Checkers | Short rules, social/casual feel |
| Human | Dominoes | Mixed mechanics, needs clear setup explanation |
| Goblin | Mahjong | Most complex of the 5 — Chinese variant only |

---

### Quality Standard

Rogues must produce content at the level of Catan, Above & Below, and
Quacks of Quedlinburg in the existing library. Read one of those files
before writing to calibrate tone, depth, and structure.

The target reader is someone sitting at a game table who has NEVER played
this game before. They need enough to start playing in under 5 minutes.

**Setup subtopics (4 required):**
- `components` — Complete, accurate component list with exact counts
- `board-layout` — Clear spatial description of how the play area is arranged
- `player-setup` — What each player receives and prepares before the game starts
- `starting-conditions` — The exact state of the game at the moment play begins

**Rules subtopics (4 required):**
- `turn-structure` — Exactly what happens on a turn, step by step
- `actions` — All legal moves/actions available to a player with full detail
- `special-mechanics` — Edge cases, exceptions, and unique rules that come up during play
- `endgame` — Precise win/loss/draw conditions and how the game ends

**Strategy subtopics (3 required):**
- `opening-priorities` — What to focus on in the first few turns
- `common-mistakes` — The errors beginners make most often, with corrections
- `key-decisions` — The pivotal choices that determine who wins

**Content rules:**
- No placeholder text or generic advice ("play well and have fun")
- Every rule stated must be accurate and sourced from the official rules
- Strategy must be actionable and specific — not vague platitudes
- Token count per section: 300–800 tokens. Total: 1,500–3,000 tokens
- Voice-friendly language — the TTS will read this aloud. No bullet points
  inside content strings. Write in flowing sentences and short paragraphs.
- Do not invent rules. If a rule is unclear in the source, note it in
  metadata.notes and use the most widely accepted interpretation.

**Chess-specific notes:**
- Include en passant, castling, and promotion rules in special-mechanics
- Cover both checkmate and stalemate in endgame
- Strategy should cover opening principles (control center, develop pieces)

**Go-specific notes:**
- Explain territory and capture clearly — most beginners don't understand
  how scoring works
- Cover ko rule and suicide rule in special-mechanics
- Strategy: emphasize influence vs territory tradeoff

**Checkers-specific notes:**
- American Checkers (8x8, men and kings) — not international draughts
- Forced capture rule is critical — must be in special-mechanics
- Kinging procedure must be explicit

**Dominoes-specific notes:**
- Standard Draw Dominoes (double-six set, 2–4 players)
- Spinner rule and doubles placement in special-mechanics
- Scoring: points at end of round, target score to win game

**Mahjong-specific notes:**
- Chinese Mahjong (Mahjong Competition Rules) only
- This is the most complex game — the setup and starting hand deal
  must be explained very carefully
- Explain winds, dragons, suits clearly in components
- Special-mechanics: flowers, seasons tiles if included in MCR
- Note clearly in metadata: "Chinese Mahjong (MCR). Other regional
  variants not covered."

---

### File Locations

Read current files from:
`content/games/{game_id}.json`

Write updated files back to the same location. Do NOT create new files.
Do NOT change any field except the content strings inside each subtopic.

Specifically — do NOT change:
- game_id, title, aliases, publisher, player_count, play_time_minutes
- complexity, categories, source_url, source_verified
- public_domain, publisher_approved, image_url
- metadata.created_by, metadata.created_at
- Tab/subtopic IDs and titles
- The schema structure itself

DO update:
- content strings inside each subtopic
- token_count per subtopic (recalculate after writing)
- total_token_count (sum of all subtopics)
- metadata.validated_by = null
- metadata.validation_status = "pending"
- metadata.notes = any caveats about rules interpretations

---

### Paladin QA

After each Rogue completes a game, route to Paladin for validation
against the quality checklist. Paladin must specifically verify:

1. All rules are accurate against the cited official source
2. No invented mechanics
3. Voice-friendly — no raw bullet lists in content strings
4. Token counts are in range (300–800 per section, 1,500–3,000 total)
5. Strategy is actionable and specific
6. Mahjong explicitly notes Chinese MCR variant only

---

### Delivery

Each Rogue delivers their completed JSON to Ranger.
Ranger routes to Paladin for QA.
Paladin approves or rejects with specific notes.
Ranger delivers all 5 approved files to Barbarian for deployment.

Barbarian drops files into content/games/ and pushes to main.

---

### Acceptance Criteria

- [ ] All 5 games have production-quality content at Catan/Above & Below standard
- [ ] All 5 pass Paladin QA
- [ ] Token counts in range for all sections
- [ ] No invented rules — all content traceable to official sources
- [ ] Voice-friendly content — flows naturally when read aloud
- [ ] Schema unchanged — only content strings updated

### Report Back

Ranger reports to Bard via [GMAI-LOG] email when all 5 are deployed.
Include: which games passed QA on first attempt, which needed revision,
and final token counts for each game.
