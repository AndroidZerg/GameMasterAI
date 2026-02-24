# GMAI-TASK-BARBARIAN-S1-20260223-0700
## From: Bard (CoS)
## To: Barbarian (Field Engineer)
## Priority: HIGH
## Depends On: Schema v2.0 (live), 50 games loaded (done)

---

### Context

Tim reviewed the app and has three categories of work:
1. **TTS bugs** — speed controls broken, need to be available before playback
2. **Frontend formatting** — new rendering patterns for skimmable content
3. **Tester bot** — automated UI testing + content quality testing against real forum questions

---

## PART A: TTS Bug Fixes

### Bug 1: Speed-up button makes controls disappear
When user taps 🐇 (speed up), the playback controls vanish. Fix so controls persist during playback and speed changes apply without disrupting the UI.

### Bug 2: Speed selection unavailable until TTS starts
Currently, the 🐢/🐇 speed controls only appear AFTER pressing a 🔊 speaker button. Tim wants users to set their preferred speed BEFORE starting playback.

**Fix:** Add a persistent TTS speed control in the Game Teacher header area (visible on all tabs, all the time). Options: 0.75x / 1.0x / 1.25x / 1.5x. Default: 1.0x. This setting persists across section reads within the same game session. When user taps any 🔊 button, it uses the pre-selected speed.

### Bug 3: Numbered lists all show "1."
In the screenshot, Board Layout shows every step as "1." instead of sequential numbers (1, 2, 3...). This is because each numbered line separated by `\n\n` creates a new `<ol>` starting at 1. Fix the FormattedContent component to detect consecutive numbered items and render them as a single `<ol>` with proper sequential numbering.

---

## PART B: Frontend Formatting — New Rendering Patterns

Tim's core directive: **Make content skimmable in 10 seconds.** The tablet is a quick-reference guide, not a textbook. People scan for what they need, read that section, and get back to playing.

### B1: Bold-prefix bullets for sentence groups

When content is a group of sentences (not already a list), break each sentence into its own bulleted line with a bolded summary word at the start.

**Example — Before:**
```
You may trade with other players at any agreed ratio. You can also trade with the bank at 4:1, or at better rates if you have a port. Maritime trade requires a settlement or city on a port intersection.
```

**Example — After (how Rogues will write it, how frontend should render it):**
```
- **Player trading** — You may trade with other players at any agreed ratio.
- **Bank trading** — You can also trade with the bank at 4:1, or at better rates if you have a port.
- **Port access** — Maritime trade requires a settlement or city on a port intersection.
```

**Frontend rendering:** The FormattedContent component should detect lines starting with `- **word**` or `- **phrase** —` and render as a styled bullet list with the bold prefix visually prominent (e.g., slightly larger or colored differently so eyes can scan the bold words).

### B2: Player-count headers

Some setup and rules content varies by player count. Rogues will write these with section dividers:

```
--- 2 Players ---
Each player starts with 5 coins and 3 workers.

--- 3 Players ---
Each player starts with 4 coins and 3 workers.

--- 4 Players ---
Each player starts with 3 coins and 2 workers.
```

**Frontend rendering:** The FormattedContent component should detect lines matching `--- {text} ---` and render them as styled sub-headers (divider line, bold text, divider line — visually distinct from regular content). These act as anchors users can scan to find their player count.

### B3: Sub-headers within content

Rogues may use `#### Header Text` within content strings to break up dense sections. The FormattedContent component should render these as styled sub-headers (smaller than accordion titles, larger than body text, bold).

### B4: Rendering priority

The FormattedContent component should process content in this order:
1. Split on `\n\n` into blocks
2. Detect `--- Header ---` blocks → render as player-count dividers
3. Detect `#### Header` blocks → render as sub-headers
4. Detect consecutive numbered lines (`1.`, `2.`, etc.) → render as single `<ol>`
5. Detect bullet lines (`- text`) → render as `<ul>`, with bold-prefix handling
6. Detect `Header:\n- bullets` mixed blocks → render header bold, then `<ul>`
7. Everything else → render as paragraph

---

## PART C: Tester Bot

Build an automated testing system with two components:

### C1: UI Tester

Automated browser tests using Playwright or Puppeteer (whatever's available on K2-PC). Tests to implement:

**Navigation tests:**
- [ ] Game selector loads, shows 50 games
- [ ] Clicking a game navigates to Game Teacher screen
- [ ] All 4 tabs are present: Setup, Rules, Strategy, Q&A
- [ ] "← Games" button returns to selector
- [ ] Repeat for at least 5 games across complexity levels

**Accordion tests:**
- [ ] Each tab shows correct number of accordion sections
- [ ] Clicking accordion expands/collapses content
- [ ] Content is non-empty in every section
- [ ] Player-count headers render (where present)
- [ ] Bold-prefix bullets render correctly
- [ ] Numbered lists render with sequential numbers (not all "1.")

**TTS tests:**
- [ ] Speed selector is visible before any playback
- [ ] Changing speed works (0.75x, 1.0x, 1.25x, 1.5x)
- [ ] Per-section 🔊 button triggers speech
- [ ] Stop button stops speech
- [ ] Pause/resume works
- [ ] Speed change during playback doesn't crash controls
- [ ] Speech output does NOT contain asterisks or markdown syntax

**Q&A tests:**
- [ ] Text input sends question and receives response
- [ ] Response displays on screen
- [ ] Per-message 🔊 button works
- [ ] Response doesn't contain hallucinated rules (checked against known answers)

**Run against 5 representative games:** Catan (gateway), Wingspan (midweight), Skull (party), Brass Birmingham (heavy), King of Tokyo (modern).

### C2: Content Quality Tester

This is the more important test. For each of the 50 games:

1. **Find real player questions.** Search Reddit (r/boardgames, game-specific subreddits), BoardGameGeek forums, and other community sources for the 3–5 most commonly asked questions about each game. Focus on:
   - Setup confusion ("How many cards do we deal for 3 players?")
   - Rules disputes ("Can I trade on my first turn?")
   - Scoring confusion ("Do points from X count at the end?")
   - Edge cases ("What happens if the deck runs out?")

2. **Ask GMAI the same questions.** POST each question to `/api/query` with the game's `game_id`.

3. **Compare answers.** For each question:
   - Does GMAI's answer match the community consensus?
   - Does GMAI's answer match the official rulebook?
   - Does GMAI say "I'm not sure" for things it should know?
   - Does GMAI confidently give a WRONG answer? (This is the critical failure)

4. **Generate a report.** Per game:
   ```
   Game: Catan
   Question 1: "Can I trade with the bank on my first turn?"
   Forum answer: "Yes, but only at 4:1 unless you have a port."
   GMAI answer: "{actual response}"
   Match: ✅ / ❌ / ⚠️ (partial)
   
   Question 2: ...
   
   Overall: 4/5 correct, 1 partial
   ```

5. **Summary report** across all 50 games: total questions asked, accuracy rate, list of games with ❌ failures that need content fixes.

**The content quality test output is the input for the next content fix sprint.** Any game where GMAI gives wrong answers gets flagged for Rogue revision.

### C3: Output

Generate all test results as a report file. Email `[GMAI-LOG] Tester Bot Results` with:
- UI test pass/fail summary
- Content quality scores per game
- List of games needing content fixes (with specific questions that failed)

---

## Acceptance Criteria

### Part A — TTS Fixes
1. ✅ Speed controls visible and usable BEFORE starting any playback
2. ✅ Speed change during playback doesn't break controls
3. ✅ Numbered lists show sequential numbers (1, 2, 3...) not all "1."

### Part B — Frontend Formatting
4. ✅ `--- Header ---` renders as styled player-count dividers
5. ✅ `#### Header` renders as sub-headers
6. ✅ `- **Bold prefix** — text` renders with scannable bold keywords
7. ✅ Consecutive numbered items render as single sequential `<ol>`
8. ✅ Mixed header + bullet blocks render correctly

### Part C — Tester Bot
9. ✅ UI tester runs against 5 representative games, all navigation/accordion/TTS tests pass
10. ✅ Content quality tester runs against all 50 games with 3–5 real forum questions each
11. ✅ Report generated with per-game accuracy scores
12. ✅ Failed games listed with specific questions and expected answers

### Git Commits
- Commit after Part A (TTS fixes)
- Commit after Part B (formatting)
- Commit after Part C (tester bot)

### Report Back
**Email 1:** `[GMAI-LOG] TTS + Formatting fixes deployed`
**Email 2:** `[GMAI-LOG] Tester Bot Results — X/50 games passing`

---

*End of task.*
