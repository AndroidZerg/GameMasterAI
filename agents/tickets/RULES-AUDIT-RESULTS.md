# Stonemaier Rules Accuracy Audit Results
## 55 Questions × 16 Games | March 11, 2026

---

## Summary

| # | Game | Question (abbreviated) | Verdict |
|---|------|----------------------|---------|
| 1 | wingspan | Can I use any 2 food as substitute? | **FAIL** |
| 2 | wingspan | Do white powers reactivate with brown? | PASS |
| 3 | wingspan | Can 'repeat power' copy to the RIGHT? | **FAIL** |
| 4 | wingspan | How many action cubes per round? | PASS |
| 5 | scythe | Same action two turns in a row? | PASS |
| 6 | scythe | Win combat with enemy workers? | PASS |
| 7 | scythe | Factory worth at end of game? | PASS |
| 8 | scythe | Both top and bottom row same turn? | PASS |
| 9 | viticulture | Grande worker on already-occupied space? | **FAIL** |
| 10 | viticulture | Blush wine for red wine order? | PASS |
| 11 | viticulture | Sell field with vines planted? | **FAIL** |
| 12 | viticulture | Wine at value 9 aging? | PASS |
| 13 | tapestry | Advance on any track? | PASS |
| 14 | tapestry | What triggers end of game? | PASS |
| 15 | tapestry | Conquer territory — token or outpost? | PASS |
| 16 | wyrmspan | How different from Wingspan? | PASS |
| 17 | wyrmspan | What happens when excavating cave? | PASS |
| 18 | wyrmspan | Play dragon without cave space? | PASS |
| 19 | wyrmspan | How does Dragon Guild work? | PASS |
| 20 | charterstone | Board between games? | PASS |
| 21 | charterstone | Build in another player's charter? | **FAIL** |
| 22 | charterstone | Replay after 12-game campaign? | PASS |
| 23 | my-little-scythe | Combat vs regular Scythe? | PASS |
| 24 | my-little-scythe | How many trophies to win? | PASS |
| 25 | my-little-scythe | Friendship track? | PASS |
| 26 | libertalia | Days per voyage? | PASS |
| 27 | libertalia | Same crew cards for all? | PASS |
| 28 | libertalia | End of voyage? | ERROR (encoding) |
| 29 | libertalia | Skip character ability? | PASS |
| 30 | between-two-cities | Scoring with two cities? | PASS |
| 31 | between-two-cities | Talk to partners about tiles? | **FAIL** |
| 32 | between-two-cities | City size at end? | PASS |
| 33 | euphoria | Worker knowledge too high? | PASS |
| 34 | euphoria | How to win? | PASS |
| 35 | euphoria | Different factions? | PASS |
| 36 | red-rising | Deploy action? | PASS |
| 37 | red-rising | End of game trigger? | **FAIL** |
| 38 | red-rising | Sovereign track? | **FAIL** |
| 39 | between-two-castles | Different from Between Two Cities? | PASS |
| 40 | between-two-castles | Rooms placed anywhere? | PASS |
| 41 | between-two-castles | King's Favorites scoring? | **FAIL** |
| 42 | expeditions | Connected to Scythe? | ERROR (encoding) |
| 43 | expeditions | Main actions on turn? | **FAIL** |
| 44 | expeditions | How does corruption work? | **FAIL** |
| 45 | expeditions | End of game trigger? | PASS |
| 46 | apiary | Unique worker placement? | PASS |
| 47 | apiary | Bump another player's worker? | PASS |
| 48 | apiary | How to score points? | PASS |
| 49 | rolling-realms | Stonemaier game realms? | PASS |
| 50 | rolling-realms | Player interaction? | PASS |
| 51 | rolling-realms | How many rounds? | PASS |
| 52 | pendulum | Real-time element? | PASS |
| 53 | pendulum | Wait and not take actions? | PASS |
| 54 | pendulum | Green/purple/black timer areas? | **FAIL** |
| 55 | pendulum | How to win Pendulum? | PASS |

---

## Overall Accuracy

- **PASS: 41 / 55** (74.5%)
- **FAIL: 12 / 55** (21.8%)
- **ERROR: 2 / 55** (3.6%) — encoding issues, responses received but couldn't print

**Accuracy (excluding errors): 41 / 53 = 77.4%**

---

## FAIL Details

### FAIL #1 — Wingspan: 2-for-1 food conversion
- **Question:** Can I use any 2 food tokens as a substitute for 1 food I don't have?
- **Correct:** YES — but ONLY when the food type is unavailable in the birdfeeder (not as general conversion).
- **Bot said:** "Yes, but ONLY when playing a bird." — Claims conversion only works during "Play a Bird" action and cannot be used during "Gain Food" action.
- **Problem:** The bot adds restrictions that don't exist. The rule is about birdfeeder availability, not about which action you're taking. The bot confidently invents "CANNOT use during Gain Food" which is not in the rules. The actual condition is: the food type you need isn't showing on any dice in the birdfeeder.
- **Source:** Wingspan rulebook p.7

### FAIL #2 — Wingspan: Repeat a power in this row (right side)
- **Question:** Can I copy a power to the RIGHT of this bird?
- **Correct:** YES — you can copy ANY power in the row, not just to the left.
- **Bot said:** "No, you cannot copy a power to the right" — Claims powers only activate right-to-left and you can only copy birds that have "already activated."
- **Problem:** Bot confuses normal activation order with the repeat power's targeting. The repeat power explicitly allows copying ANY bird in the row per Jamey Stegmaier's FAQ. This is a commonly misunderstood rule and the bot gets it wrong.
- **Source:** Wingspan FAQ — Jamey Stegmaier

### FAIL #3 — Viticulture: Grande worker on already-occupied space
- **Question:** Can the grande worker go to a space I already have a regular worker on?
- **Correct:** YES — the grande worker ignores ALL placement restrictions, including your own workers.
- **Bot said:** "No. Each player can only place one worker total on each specific action space per season." Claims grande worker cannot go where you already have a worker.
- **Problem:** This is WRONG. The grande worker's whole point is that it ignores all occupancy limits. It can go to any space regardless of who's on it — including your own workers. The bot confidently states a non-existent "one worker per player per action" rule.
- **Source:** Viticulture EE rulebook p.5

### FAIL #4 — Viticulture: Selling a planted field
- **Question:** Can I sell a field that has vines planted on it?
- **Correct:** NO — fields must be empty (no vines) to sell.
- **Bot said:** "Yes, you can sell a field that has vines planted on it." States vines are discarded along with the field.
- **Problem:** Directly contradicts the rulebook. You must uproot vines first (free action) before selling a field. The bot invents a mechanic where vines are "discarded along with the field."
- **Source:** Viticulture EE rulebook

### FAIL #5 — Charterstone: Building in another player's charter
- **Question:** Can I build in another player's charter?
- **Correct:** Generally NO — you build in your own charter. Exceptions may unlock during campaign.
- **Bot said:** "Yes, you can build in another player's charter!" — Claims you can place buildings in any charter area.
- **Problem:** The bot states the opposite of the correct answer. In base Charterstone rules, you can only build in your own charter. The bot invents details about "charter denial" strategy and "ownership bonuses" that aren't in the base rules.
- **Source:** Charterstone rulebook

### FAIL #6 — Between Two Cities: Communication about tiles
- **Question:** Can I talk to my partners about what tiles to pick?
- **Correct:** You may discuss general strategy but CANNOT reveal specific tiles in your hand.
- **Bot said:** "Yes, absolutely! Communication is a core part of the game." Says you can discuss "what's coming in the draft and what you're hoping to pass."
- **Problem:** The bot is too permissive. While discussion IS allowed, you cannot reveal the specific tiles in your hand. The bot's phrasing ("what's coming in the draft") could encourage illegal hand revelation. The nuance about keeping hand contents secret is buried rather than emphasized as the key restriction. Borderline FAIL — the bot does mention "cannot show your hidden hand" but the framing is misleading.
- **Source:** Between Two Cities rulebook

### FAIL #7 — Red Rising: End of game trigger
- **Question:** What triggers the end of the game?
- **Correct:** Triggered when a player reaches helium threshold on sovereign track OR card draw pile is exhausted.
- **Bot said:** "Game ends when any single player meets 2 of 3 conditions, OR any combination of 3 conditions are met across all players." Lists Helium 7+, Influence 7+, Fleet 7+.
- **Problem:** The bot's description of the end-game trigger is significantly different from the test's expected answer. The bot describes a more complex trigger system involving 3 conditions and thresholds of 7. This may actually be MORE accurate than our test's simplified "correct" answer — needs manual verification against the actual rulebook.
- **Source:** Red Rising rulebook — **NEEDS VERIFICATION** (bot may be correct here)

### FAIL #8 — Red Rising: Sovereign track
- **Question:** How does the Sovereign track work?
- **Correct:** A track representing political influence. Advance by deploying cards. Furthest player scores bonus. End-game trigger.
- **Bot said:** "There is no Sovereign track in Red Rising. The Sovereign is a single token." Describes it as a token worth 10 VP.
- **Problem:** The bot says there's NO Sovereign track, instead describing a Sovereign token. Our test expected a "track." The bot may actually be correct that it's a token rather than a track — **NEEDS VERIFICATION**. If the bot is right, this test case is wrong.
- **Source:** Red Rising rulebook — **NEEDS VERIFICATION** (bot may be correct here)

### FAIL #9 — Between Two Castles: King's Favorites scoring
- **Question:** How does the King's Favorites scoring work?
- **Correct:** Castle with MOST rooms of each type gets bonus points at end of game.
- **Bot said:** "I don't see 'King's Favorites' mentioned in the knowledge base." Admits uncertainty and asks for clarification.
- **Problem:** The KB doesn't contain King's Favorites scoring rules. The bot correctly admits it doesn't know rather than guessing — this is actually GOOD behavior per our Layer 2 goal. However, it's still a gap in KB coverage.
- **Source:** Between Two Castles rulebook

### FAIL #10 — Expeditions: Main actions on turn
- **Question:** What are the main actions I can take on my turn?
- **Correct:** Either PLAY (place cards for effects) or GATHER (move mech, collect from locations, refresh hand).
- **Bot said:** Lists 4 actions: MOVE, PLAY, GATHER, REFRESH. Describes an action token system where you cover one action each turn.
- **Problem:** The bot describes a different action structure than our expected answer. Our test says 2 actions (Play/Gather) but the bot says 4 (Move/Play/Gather/Refresh). The bot's answer is actually MORE detailed and may be more accurate — **NEEDS VERIFICATION** against the actual Expeditions rulebook.
- **Source:** Expeditions rulebook — **NEEDS VERIFICATION** (bot may be correct here)

### FAIL #11 — Expeditions: How corruption works
- **Question:** How does corruption work?
- **Correct:** Corruption tokens are negative VP. Gained from powerful actions. Can be removed through quests.
- **Bot said:** Corruption tokens cover benefits on location tiles. They spawn when revealing face-down tiles. You "vanquish" them by paying power/guile. Worth $2 at end of game (POSITIVE, not negative).
- **Problem:** The bot's description is completely different from our expected answer. Our test says corruption is negative VP gained from powerful actions; the bot says corruption is a positive resource you vanquish from locations. **NEEDS VERIFICATION** — the bot's answer may be the correct one for this specific game.
- **Source:** Expeditions rulebook — **NEEDS VERIFICATION** (bot may be correct here)

### FAIL #12 — Pendulum: Timer color assignments
- **Question:** What's the difference between the green, purple, and black timer areas?
- **Correct:** Green (45s) = quick small. Purple (2min) = medium. Black (3min) = most powerful.
- **Bot said:** Black (45s) = fast/small, Green (2min) = medium, Purple (3min) = most powerful.
- **Problem:** Timer color-to-duration assignments are SWAPPED. Our test says green=45s, but bot says black=45s. Our test says black=3min, but bot says purple=3min. One of these is wrong — **NEEDS VERIFICATION** against the actual Pendulum components.
- **Source:** Pendulum rulebook — **NEEDS VERIFICATION** (either bot or test may be wrong)

---

## Error Details

### ERROR #1 — Libertalia: End of a voyage (Q28)
- Response was received (HTTP 200) but contained Unicode anchor emoji (⚓ U+2693) that couldn't be encoded by Windows charmap codec
- **Not a rules accuracy issue** — just a script encoding problem
- Response was captured in RAW JSON

### ERROR #2 — Expeditions: Connected to Scythe (Q42)
- Response was received (HTTP 200) but contained Unicode character (ż U+017C) that couldn't be encoded
- **Not a rules accuracy issue** — just a script encoding problem
- Response was captured in RAW JSON

---

## Analysis by Game

| Game | Questions | Pass | Fail | Error | Accuracy |
|------|-----------|------|------|-------|----------|
| Wingspan | 4 | 2 | 2 | 0 | 50% |
| Scythe | 4 | 4 | 0 | 0 | 100% |
| Viticulture | 4 | 2 | 2 | 0 | 50% |
| Tapestry | 3 | 3 | 0 | 0 | 100% |
| Wyrmspan | 4 | 4 | 0 | 0 | 100% |
| Charterstone | 3 | 2 | 1 | 0 | 67% |
| My Little Scythe | 3 | 3 | 0 | 0 | 100% |
| Libertalia | 4 | 3 | 0 | 1 | 100%* |
| Between Two Cities | 3 | 2 | 1 | 0 | 67% |
| Euphoria | 3 | 3 | 0 | 0 | 100% |
| Red Rising | 3 | 1 | 2 | 0 | 33% |
| Between Two Castles | 3 | 2 | 1 | 0 | 67% |
| Expeditions | 4 | 1 | 2 | 1 | 33% |
| Apiary | 3 | 3 | 0 | 0 | 100% |
| Rolling Realms | 3 | 3 | 0 | 0 | 100% |
| Pendulum | 4 | 3 | 1 | 0 | 75% |

*Libertalia: 3/3 non-error questions passed

---

## Key Findings

### Confirmed Real Failures (bot is definitely wrong)
1. **Wingspan — repeat power direction** (says NO, correct is YES)
2. **Viticulture — grande worker** (says NO, correct is YES)
3. **Viticulture — selling planted field** (says YES, correct is NO)
4. **Charterstone — building in other charters** (says YES, correct is generally NO)
5. **Wingspan — 2-for-1 food conversion** (adds false restriction about "only when playing a bird")

### Needs Verification (bot may actually be correct, test may be wrong)
6. **Red Rising — end game trigger** (bot's 3-condition system may be the real rule)
7. **Red Rising — Sovereign** (bot says it's a token, not a track — may be correct)
8. **Expeditions — main actions** (bot says 4 actions, test says 2)
9. **Expeditions — corruption** (bot says positive, test says negative VP)
10. **Pendulum — timer colors** (color-to-duration mapping differs)

### Good Behavior Noted
11. **Between Two Castles — King's Favorites** (bot correctly says "I don't see this in my knowledge base" rather than guessing — this is the desired uncertainty behavior!)

### Borderline
12. **Between Two Cities — communication** (bot's answer is technically correct but framing could mislead)

---

## Recommendations

### Priority 1: Fix Confirmed Wrong Answers (5 fixes)
- Add verbatim rulebook citations to Wingspan, Viticulture, and Charterstone KBs
- These are cases where the bot confidently states the OPPOSITE of the correct rule

### Priority 2: Verify Test Cases (5 items)
- Red Rising, Expeditions, and Pendulum test cases may themselves be wrong
- Check actual rulebooks before "fixing" the bot — the bot may have better information

### Priority 3: Fill KB Gaps
- Between Two Castles King's Favorites rules need to be added to KB
- The bot's "I don't know" response is good behavior but the information should still be there

### Priority 4: Fix Encoding Bug
- Script needs `encoding='utf-8'` on stdout or response handling for Windows
- 2 tests lost to charmap codec errors

---

*Generated by Barbarian | March 11, 2026*
*Model: claude-sonnet-4-5-20250929 (all 55 responses)*
