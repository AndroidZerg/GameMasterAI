# GMAI-TASK-RANGER-S1-20260223-0640
## From: Bard (CoS)
## To: Ranger (Agent Orchestrator)
## Priority: HIGH — Content rewrite sprint, launch immediately
## Depends On: Schema v2.0 (finalized), PDFs (downloaded), Backend (ready)

---

### Context

Schema v2.0 is finalized. All 50 rulebook PDFs are downloaded and text-extracted. The backend and frontend are rebuilt for the new tab-based UI. The infrastructure is ready and waiting for content.

**We are scaling from 5 Rogues to 10 Rogues, 5 games each.** This halves the per-agent workload and gets content flowing to Paladin faster.

**CRITICAL: Every game is rewritten from the official rulebook PDF.** Not from training data. Not from memory. The extracted rulebook text for each game is in `D:\GameMasterAI\content\rulebook-text\{game-id}.txt`. Each Rogue MUST use this text as their primary source.

---

### The 10 Rogues

| # | Name | Platform | Status |
|---|------|----------|--------|
| 1 | **Halfling** | OpenClaw (Codex) | Existing — reassign |
| 2 | **Elf** | OpenClaw (Codex) | Existing — reassign |
| 3 | **Dwarf** | OpenClaw (Codex) | Existing — reassign |
| 4 | **Human** | OpenClaw (Codex) | Existing — reassign |
| 5 | **Goblin** | OpenClaw (Codex) | Existing — reassign |
| 6 | **Gnome** | OpenClaw (Codex) | NEW — spin up |
| 7 | **Orc** | OpenClaw (Codex) | NEW — spin up |
| 8 | **Tiefling** | OpenClaw (Codex) | NEW — spin up |
| 9 | **Druid** | OpenClaw (Codex) | NEW — spin up |
| 10 | **Monk** | OpenClaw (Codex) | NEW — spin up |

**First priority:** Confirm the OpenClaw gateway can handle 12 concurrent agents (10 Rogues + Ranger + Paladin) on the ChatGPT Plus subscription. If there's a concurrency limit, report back immediately before launching.

---

### Batch Assignments — 5 Games Each, Complexity-Balanced

Each Rogue gets exactly 1 game from each complexity tier. This balances workload so everyone finishes around the same time.

**Rogue 1 — Halfling:**
| # | Game | Complexity | Rulebook Text File |
|---|------|-----------|-------------------|
| 1 | Catan | gateway | `catan.txt` |
| 2 | Wingspan | midweight | `wingspan.txt` |
| 3 | Dixit | party | `dixit.txt` |
| 4 | Betrayal at House on the Hill | midweight | `betrayal-at-house-on-the-hill.txt` |
| 5 | Scythe | heavy | `scythe.txt` |

**Rogue 2 — Elf:**
| # | Game | Complexity | Rulebook Text File |
|---|------|-----------|-------------------|
| 6 | Ticket to Ride | gateway | `ticket-to-ride.txt` |
| 7 | 7 Wonders | midweight | `seven-wonders.txt` |
| 8 | Wavelength | party | `wavelength.txt` |
| 9 | Mysterium | midweight | `mysterium.txt` |
| 10 | Spirit Island | heavy | `spirit-island.txt` |

**Rogue 3 — Dwarf:**
| # | Game | Complexity | Rulebook Text File |
|---|------|-----------|-------------------|
| 11 | Carcassonne | gateway | `carcassonne.txt` |
| 12 | Pandemic | midweight | `pandemic.txt` |
| 13 | Just One | party | `just-one.txt` |
| 14 | Villainous | midweight | `villainous.txt` |
| 15 | Brass: Birmingham | heavy | `brass-birmingham.txt` |

**Rogue 4 — Human:**
| # | Game | Complexity | Rulebook Text File |
|---|------|-----------|-------------------|
| 16 | Azul | gateway | `azul.txt` |
| 17 | Dominion | midweight | `dominion.txt` |
| 18 | The Crew | party | `the-crew.txt` |
| 19 | Photosynthesis | midweight | `photosynthesis.txt` |
| 20 | Root | heavy | `root.txt` |

**Rogue 5 — Goblin:**
| # | Game | Complexity | Rulebook Text File |
|---|------|-----------|-------------------|
| 21 | Splendor | gateway | `splendor.txt` |
| 22 | Everdell | midweight | `everdell.txt` |
| 23 | Coup | party | `coup.txt` |
| 24 | Takenoko | midweight | `takenoko.txt` |
| 25 | Agricola | heavy | `agricola.txt` |

**Rogue 6 — Gnome:**
| # | Game | Complexity | Rulebook Text File |
|---|------|-----------|-------------------|
| 26 | Codenames | gateway | `codenames.txt` |
| 27 | Terraforming Mars | midweight | `terraforming-mars.txt` |
| 28 | Love Letter | party | `love-letter.txt` |
| 29 | Sheriff of Nottingham | midweight | `sheriff-of-nottingham.txt` |
| 30 | Concordia | heavy | `concordia.txt` |

**Rogue 7 — Orc:**
| # | Game | Complexity | Rulebook Text File |
|---|------|-----------|-------------------|
| 31 | Kingdomino | gateway | `kingdomino.txt` |
| 32 | Sagrada | midweight | `sagrada.txt` |
| 33 | Skull | party | `skull.txt` |
| 34 | Dead of Winter | midweight | `dead-of-winter.txt` |
| 35 | Great Western Trail | heavy | `great-western-trail.txt` |

**Rogue 8 — Tiefling:**
| # | Game | Complexity | Rulebook Text File |
|---|------|-----------|-------------------|
| 36 | Sushi Go Party! | gateway | `sushi-go-party.txt` |
| 37 | Above and Below | midweight | `above-and-below.txt` |
| 38 | One Night Ultimate Werewolf | party | `one-night-ultimate-werewolf.txt` |
| 39 | Cosmic Encounter | midweight | `cosmic-encounter.txt` |
| 40 | Viticulture | heavy | `viticulture.txt` |

**Rogue 9 — Druid:**
| # | Game | Complexity | Rulebook Text File |
|---|------|-----------|-------------------|
| 41 | Patchwork | gateway | `patchwork.txt` |
| 42 | Lords of Waterdeep | midweight | `lords-of-waterdeep.txt` |
| 43 | Telestrations | party | `telestrations.txt` |
| 44 | King of Tokyo | midweight | `king-of-tokyo.txt` |
| 45 | Castles of Burgundy | heavy | `castles-of-burgundy.txt` |

**Rogue 10 — Monk:**
| # | Game | Complexity | Rulebook Text File |
|---|------|-----------|-------------------|
| 46 | Century: Spice Road | gateway | `century-spice-road.txt` |
| 47 | Clank! | midweight | `clank.txt` |
| 48 | Decrypto | party | `decrypto.txt` |
| 49 | Quacks of Quedlinburg | midweight | `quacks-of-quedlinburg.txt` |
| 50 | Power Grid | heavy | `power-grid.txt` |

---

### What Each Rogue Receives

For each game in their batch, provide the Rogue with:

1. **The `_template.json`** — Schema v2.0 template (attached to this ticket)
2. **The extracted rulebook text** — from `D:\GameMasterAI\content\rulebook-text\{game-id}.txt`
3. **The writing instructions below**

---

### Rogue Writing Instructions (Distribute to All 10)

You are writing a structured game teaching guide for GameMaster AI, an app that teaches board games to customers at board game cafes.

**YOUR PRIMARY SOURCE is the extracted rulebook text provided to you.** Write from the rulebook. Not from memory. Not from training data. If the rulebook text is unclear or incomplete, note this in `metadata.notes` — do NOT fill gaps with guesses.

**Use the `_template.json` as your structure.** Fill in every field. Follow these rules:

#### Schema v2.0 Rules

**File naming:** `{game_id}.json` — lowercase, hyphenated. Must match the `game_id` field inside the file.

**Complexity values:** One of: `party`, `gateway`, `midweight`, `heavy`. No other values.

**Tabs structure:** Three tabs — `setup`, `rules`, `strategy`. Each contains an ordered array of subtopics.

**Required subtopics (must appear in EVERY game):**
- Setup: `components`, `player-setup`, `starting-conditions`
- Rules: `turn-structure`, `actions`, `endgame`
- Strategy: `opening-priorities`, `common-mistakes`

**Optional subtopics (include when the game needs them):**
- Setup: `board-layout` — skip for card-only games
- Rules: `special-mechanics` — skip for simple games. You MAY add additional game-specific subtopics (e.g., `trading`, `combat`, `fear`) between `special-mechanics` and `endgame`
- Strategy: `key-decisions` — skip for very simple party games

**`endgame` is ALWAYS the last subtopic in the Rules tab.**

**Subtopic IDs:** Lowercase, hyphenated. Required subtopics use the exact standard IDs. Custom subtopics use descriptive IDs (e.g., `trading`, `development-cards`, `invader-phase`).

#### Content Quality Rules

1. **Every fact must come from the rulebook.** Do not invent mechanics, player counts, component counts, or scoring rules.
2. **Component list must be exact.** Count the pieces, cards, tokens from the rulebook. "19 terrain hexes" not "some hexes."
3. **Turn structure must be numbered.** "1. Roll dice → 2. Collect resources → 3. Trade → 4. Build."
4. **Scoring must be complete.** Every VP source. Every endgame trigger. Tiebreaker rules.
5. **Strategy must be specific.** "Prioritize ore hexes with 6 or 8 number tokens" not "try to get good resources."
6. **Common mistakes must be concrete.** "Don't hoard more than 7 cards — you'll lose half when a 7 is rolled" not "manage your hand carefully."
7. **No copied rulebook text.** Rewrite in your own words as a teaching guide. You are a teacher, not a copier.

#### Token Budget by Complexity

| Complexity | Target Range |
|------------|-------------|
| `party` | 1,200 – 2,000 tokens |
| `gateway` | 2,000 – 3,500 tokens |
| `midweight` | 2,500 – 4,000 tokens |
| `heavy` | 3,500 – 5,000 tokens |

**Hard floor:** 1,200 tokens. Below this, the guide is too thin to teach the game.
**Hard ceiling:** 5,000 tokens. Above this, you're writing a rulebook, not a teaching guide.

#### Per-Game Process

1. Read the extracted rulebook text thoroughly
2. Fill in the template — all metadata fields + all required subtopics
3. Add optional/custom subtopics where the game demands them
4. Self-check: Is every section substantive? Are component counts accurate? Is scoring complete? Are there any invented rules?
5. Set `source_verified` to `true` (you're working from the actual rulebook)
6. Set `metadata.created_by` to your Rogue name
7. Set `metadata.created_at` to current ISO timestamp
8. Leave `validation_status` as `"pending"` — Paladin handles that
9. Output the completed JSON file named `{game_id}.json`
10. Update your heartbeat status

#### Output

Deliver completed JSON files to Ranger. One file per game. Do your games in any order, but deliver each one as soon as it's done — don't wait to batch them.

---

### Paladin — Updated QA Checklist (v2.0)

Distribute this updated checklist to Paladin:

| # | Check | Pass Criteria |
|---|-------|---------------|
| 1 | `game_id` matches filename | `catan.json` → `"game_id": "catan"` |
| 2 | `complexity` is valid | One of: `party`, `gateway`, `midweight`, `heavy` |
| 3 | `source_url` is valid | Points to official rules PDF or publisher rules page |
| 4 | `schema_version` is `"2.0"` | Must be the string `"2.0"` |
| 5 | All 3 tabs present | `tabs.setup`, `tabs.rules`, `tabs.strategy` all exist |
| 6 | Required subtopics present | Setup: components, player-setup, starting-conditions. Rules: turn-structure, actions, endgame. Strategy: opening-priorities, common-mistakes. |
| 7 | No empty content | Every subtopic `content` field is substantive |
| 8 | Subtopic IDs valid | Lowercase, hyphenated, unique within tab, required IDs match exactly |
| 9 | `endgame` is last in Rules | Must be final item in `tabs.rules.subtopics` |
| 10 | Player count accurate | Matches published player count |
| 11 | Component list plausible | Correct types and counts |
| 12 | Turn structure accurate | Correctly describes turn/round phases |
| 13 | Scoring complete | All VP sources, end trigger, tiebreakers |
| 14 | Strategy is actionable | Specific advice, not generic platitudes |
| 15 | Token count in range | 1,200–5,000 (see complexity guidelines) |
| 16 | No hallucinations | No invented mechanics, no rules from other games |
| 17 | No copyright violation | Original teaching text, not copied from rulebook |

**Rejection = single failed check.** Paladin specifies which check(s) failed and exact correction needed. Vague rejections not permitted. Rejected games route back to the originating Rogue for fix.

---

### Heartbeat Protocol

Same as before. Each Rogue writes status updates:

```json
{
  "agent": "rogue-name",
  "timestamp": "ISO 8601",
  "status": "working | idle | blocked | complete",
  "current_game": "game-id",
  "batch_progress": {
    "total": 5,
    "completed": 0,
    "in_progress": 1,
    "failed": 0,
    "in_qa": 0,
    "approved": 0
  },
  "last_completed": null,
  "blockers": []
}
```

### Ranger Alert Rules (Updated for 10 Rogues)

Alert Tim via Telegram ONLY for:
- A Rogue has been `blocked` for more than 15 minutes
- A Rogue's heartbeat is missing for more than 20 minutes (reduced from 30 — faster catch with more agents)
- Paladin has rejected 2+ games from the same Rogue (reduced from 3 — tighter with only 5 games per Rogue)
- All 50 games are approved (the good alert)

Do NOT alert for: routine completions, QA passes, normal progress.

---

### Launch Sequence

1. **Confirm** OpenClaw gateway can handle 12 concurrent agents. If not, report back immediately.
2. **Spin up** the 5 new Rogues (Gnome, Orc, Tiefling, Druid, Monk)
3. **Distribute** to all 10 Rogues: their 5-game assignment, the `_template.json`, the extracted rulebook text for each game, and the writing instructions
4. **Distribute** updated QA checklist to Paladin
5. **Launch** all 10 Rogues simultaneously
6. **Monitor** heartbeats, route Paladin rejections back to originating Rogues

---

### Acceptance Criteria

1. ✅ Gateway concurrency confirmed (or blocker reported)
2. ✅ 10 Rogues active and working
3. ✅ Paladin active with v2.0 checklist
4. ✅ All 50 games assigned and in progress
5. ✅ Heartbeats flowing from all 10 agents
6. ✅ First completed games arriving at Paladin within ~30 minutes of launch

### Report Back

**Immediate:** Telegram to Tim confirming swarm launch (or reporting concurrency blocker)
**Ongoing:** Heartbeat monitoring, Telegram alerts per rules above
**Completion:** Telegram when all 50 games approved

---

*End of task.*
