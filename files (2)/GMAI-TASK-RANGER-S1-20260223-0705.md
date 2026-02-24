# GMAI-TASK-RANGER-S1-20260223-0705
## From: Bard (CoS)
## To: Ranger (Agent Orchestrator)
## Priority: HIGH — Content rewrite with new formatting standards
## Depends On: Schema v2.0 (unchanged), all 50 games exist (being reformatted)

---

### Context

Tim reviewed the app and established a clear product directive: **the tablet is a quick-reference guide, not a textbook.** People scan for what they need in 10 seconds, read that section, and get back to playing.

This means every game's content needs to be rewritten with skimmable formatting. The schema itself doesn't change — same `_template.json`, same tabs, same subtopics. What changes is HOW the content is written inside each subtopic.

**Same 10 Rogues, same 5 games each, same batch assignments as the last sprint.** The Rogues already know their games. This rewrite should be faster than the first pass because they're reformatting existing content, not starting from scratch.

---

### New Content Writing Style Guide

**Distribute this to ALL 10 Rogues. This replaces the previous writing instructions.**

---

#### THE CORE PRINCIPLE

Every piece of content should be scannable in 10 seconds. A player glances at their tablet, finds what they need, reads it, and looks back at the board. They should NEVER need to read a paragraph to find one fact.

**Target users:**
- Complete newbies learning for the first time
- Veterans who haven't played in a while and need a refresher
- Anyone mid-game who needs to check a rule quickly without feeling embarrassed about asking

#### FORMATTING RULE 1: No Walls of Text

Never write a paragraph of 3+ sentences in a row. Instead, break every sentence into its own bulleted line with a **bold summary keyword** at the start.

**❌ WRONG — Wall of text:**
```
You may trade with other players at any agreed ratio. You can also trade with the bank at 4:1, or at better rates if you have a port. Maritime trade requires a settlement or city on a port intersection. You cannot trade on the turn you build a settlement on a port.
```

**✅ RIGHT — Scannable bullets:**
```
- **Player trading** — You may trade with other players at any agreed ratio.
- **Bank trading** — Trade with the bank at 4:1, or at better rates if you have a port.
- **Port access** — Maritime trade requires a settlement or city on a port intersection.
- **Port timing** — You cannot trade on the turn you build a settlement on a port.
```

The bold prefix is the anchor. A player scanning for "how do ports work?" sees **Port access** and **Port timing** instantly.

#### FORMATTING RULE 2: Player-Count Sections

Whenever setup, rules, or strategy differs by player count, use player-count headers:

```
--- 2 Players ---
Each player starts with 5 coins and 3 workers. Use the smaller board.

--- 3 Players ---
Each player starts with 4 coins and 3 workers. Remove the gray faction tiles.

--- 4 Players ---
Each player starts with 3 coins and 2 workers. Use all components.
```

**Where to use this:**
- **Setup tab → Player Setup**: Starting resources that vary by count
- **Setup tab → Board Layout**: Board configuration that changes by count
- **Setup tab → Starting the Game**: First-turn rules that differ by count
- **Rules tab**: Any rule that changes by player count
- **Anywhere** the rulebook says "In a 2-player game..." or "With 3 players..."

**Do NOT add player-count headers where there's no difference.** If all player counts play the same, just write the content normally.

#### FORMATTING RULE 3: Sub-Headers for Dense Sections

Use `#### Header Text` within content to break up any section longer than ~5 bullet points. This creates visual breathing room.

**Example — Actions & Options for a complex game:**
```
#### Movement Actions

- **Walk** — Move your character 1–2 spaces along connected paths.
- **Ride** — Spend 1 horse token to move up to 4 spaces.
- **Sail** — If at a port, move to any other port on the map.

#### Build Actions

- **House** — Pay 2 wood + 1 stone. Place on an empty village space.
- **Workshop** — Pay 1 wood + 2 stone + 1 coin. Place on a town space.

#### Trade Actions

- **Market trade** — Swap any 2 resources for 1 resource of your choice.
- **Player trade** — Negotiate freely with other players on your turn only.
```

#### FORMATTING RULE 4: Numbered Steps for Sequences

Use numbered lists ONLY for things that happen in a specific order (setup steps, turn phases, scoring procedure). Use bullet lists for everything else.

**Numbered (sequential):**
```
1. Roll the dice.
2. Collect resources matching the number rolled.
3. Trade with other players or the bank.
4. Build roads, settlements, cities, or buy development cards.
5. Pass the dice to the left.
```

**Bulleted (non-sequential options):**
```
- **Build a road** — 1 brick + 1 wood. Place between two connected intersections.
- **Build a settlement** — 1 brick + 1 wood + 1 wheat + 1 sheep. Place on an empty intersection.
- **Build a city** — 2 wheat + 3 ore. Replace an existing settlement.
- **Buy a development card** — 1 wheat + 1 sheep + 1 ore. Draw from the deck.
```

#### FORMATTING RULE 5: Component Lists as Tables

For "What's in the Box," format components in scannable groups, not one long list:

```
#### Board & Tokens

- **1** game board
- **4** player boards
- **1** score track
- **40** coin tokens (10 each in 1, 2, 5, 10 denominations)

#### Cards

- **80** resource cards (20 each: wood, brick, wheat, sheep)
- **25** development cards (14 knight, 5 VP, 2 road building, 2 year of plenty, 2 monopoly)

#### Player Pieces (per player)

- **5** settlements
- **4** cities
- **15** roads
- **1** building cost reference card
```

#### FORMATTING RULE 6: Strategy Must Be Actionable and Specific

**❌ WRONG — Generic:**
```
Try to diversify your resources and have a plan for how you'll score points.
```

**✅ RIGHT — Specific and scannable:**
```
- **Diversify early** — Your first two settlements should touch at least 4 different resource types. Being locked out of any one resource cripples your options.
- **Target 6s and 8s** — These numbers are rolled most often. A settlement on a 6-ore / 8-wheat intersection generates resources almost every turn.
- **Don't ignore development cards** — New players skip them, but Largest Army (2 VP) is often the difference between winning and losing.
```

---

### Batch Assignments (UNCHANGED from last sprint)

Same 10 Rogues, same 5 games each. Refer to GMAI-TASK-RANGER-S1-20260223-0640 for the full assignment table.

Quick reference:
| Rogue | Games |
|-------|-------|
| Halfling | Catan, Wingspan, Dixit, Betrayal at House on the Hill, Scythe |
| Elf | Ticket to Ride, 7 Wonders, Wavelength, Mysterium, Spirit Island |
| Dwarf | Carcassonne, Pandemic, Just One, Villainous, Brass Birmingham |
| Human | Azul, Dominion, The Crew, Photosynthesis, Root |
| Goblin | Splendor, Everdell, Coup, Takenoko, Agricola |
| Gnome | Codenames, Terraforming Mars, Love Letter, Sheriff of Nottingham, Concordia |
| Orc | Kingdomino, Sagrada, Skull, Dead of Winter, Great Western Trail |
| Tiefling | Sushi Go Party!, Above and Below, One Night Ultimate Werewolf, Cosmic Encounter, Viticulture |
| Druid | Patchwork, Lords of Waterdeep, Telestrations, King of Tokyo, Castles of Burgundy |
| Monk | Century Spice Road, Clank!, Decrypto, Quacks of Quedlinburg, Power Grid |

### What Each Rogue Receives

1. **Their existing v2.0 JSON files** — they're reformatting, not starting over
2. **The rulebook text files** — still the primary source of truth
3. **This style guide** — the new formatting rules above
4. **The `_template.json`** — unchanged from last sprint

### Process Per Game

1. Open the existing v2.0 JSON file for the game
2. Reformat EVERY subtopic's `content` field according to the new style guide:
   - Break paragraphs into bold-prefix bullets
   - Add player-count headers where setup/rules vary
   - Add sub-headers (`####`) to break up dense sections
   - Format component lists in grouped tables
   - Ensure numbered lists are only for sequential steps
   - Ensure strategy bullets are specific and actionable
3. Cross-reference against the rulebook text — verify player-count variants are accurate
4. Update `metadata.revision` (increment by 1)
5. Update `metadata.created_at` to current timestamp
6. Leave `validation_status` as `"pending"`
7. Deliver to Ranger

### Paladin — Updated Style Checks

Add these to Paladin's checklist (in addition to the existing 17 checks):

| # | Check | Pass Criteria |
|---|-------|---------------|
| 18 | No walls of text | No paragraph with 3+ consecutive sentences without bullet formatting |
| 19 | Bold-prefix bullets used | Informational content uses `- **Keyword** — explanation` format |
| 20 | Player-count headers present | If the game's setup or rules vary by player count, `--- X Players ---` headers are used |
| 21 | Sequential numbering correct | Numbered lists only for sequential steps. Options/choices use bullets. |
| 22 | Component list grouped | "What's in the Box" uses `####` sub-headers to group component types |
| 23 | Strategy is specific | Each strategy bullet includes a specific game element, not generic advice |

---

### Acceptance Criteria

1. ✅ All 10 Rogues launched with new style guide
2. ✅ Paladin updated with 6 new style checks (18–23)
3. ✅ All 50 games reformatted and delivered
4. ✅ Backend reloaded with reformatted content
5. ✅ Spot-check: 5 random games show scannable formatting in the frontend

### Report Back

**Telegram:** Confirm swarm launch
**Telegram:** Confirm all 50 complete
**Email (via Barbarian):** `[GMAI-LOG] 50 games reformatted with skimmable style`

---

*End of task.*
