# GMAI-TASK-BARBARIAN-S5-20260223-0440
## From: Bard (CoS)
## To: Barbarian (Field Engineer)
## Priority: High
## Depends On: Phase 0 ✅, Phase 4 ✅, Phase 1 ✅ (50 games loaded)

---

### Context

All 50 games are loaded and the MVP is live. This is the final verification pass — confirm everything works as a complete product before Tim wakes up and starts demoing it. Paladin is still doing QA in parallel; we'll handle any rejections separately. Right now we're verifying the app works end-to-end.

---

### Instructions

#### TEST 1: Full game count verification

```bash
curl http://localhost:8100/api/games | python -c "import sys,json; data=json.load(sys.stdin); print(f'Games loaded: {len(data)}')"
```

✅ **Pass:** Returns exactly 50 games.

If any are missing, check `D:\GameMasterAI\content\games\` for the missing .json files and run `POST /api/reload`.

---

#### TEST 2: Random 5-game deep test

Pick these 5 games (one from each Rogue's batch). For each game, ask 3 questions across different modes. Verify the answers are accurate and grounded in the knowledge base — not hallucinated.

**Game 1: Ticket to Ride (Halfling — gateway)**
```bash
curl -X POST http://localhost:8100/api/query -H "Content-Type: application/json" \
  -d '{"game_id": "ticket-to-ride", "question": "How do I set up the game?", "mode": "setup"}'

curl -X POST http://localhost:8100/api/query -H "Content-Type: application/json" \
  -d '{"game_id": "ticket-to-ride", "question": "How does claiming a route work?", "mode": "rules"}'

curl -X POST http://localhost:8100/api/query -H "Content-Type: application/json" \
  -d '{"game_id": "ticket-to-ride", "question": "What should I focus on as a beginner?", "mode": "strategy"}'
```

**Game 2: Pandemic (Elf — midweight)**
```bash
curl -X POST http://localhost:8100/api/query -H "Content-Type: application/json" \
  -d '{"game_id": "pandemic", "question": "Walk me through setup step by step.", "mode": "setup"}'

curl -X POST http://localhost:8100/api/query -H "Content-Type: application/json" \
  -d '{"game_id": "pandemic", "question": "What triggers an outbreak and how does it chain?", "mode": "rules"}'

curl -X POST http://localhost:8100/api/query -H "Content-Type: application/json" \
  -d '{"game_id": "pandemic", "question": "How do we win? What are all the ways to lose?", "mode": "rules"}'
```

**Game 3: Coup (Dwarf — party)**
```bash
curl -X POST http://localhost:8100/api/query -H "Content-Type: application/json" \
  -d '{"game_id": "coup", "question": "How do I set up Coup?", "mode": "setup"}'

curl -X POST http://localhost:8100/api/query -H "Content-Type: application/json" \
  -d '{"game_id": "coup", "question": "When can I challenge and when can I block?", "mode": "rules"}'

curl -X POST http://localhost:8100/api/query -H "Content-Type: application/json" \
  -d '{"game_id": "coup", "question": "What is a good opening strategy?", "mode": "strategy"}'
```

**Game 4: King of Tokyo (Human — popular modern)**
```bash
curl -X POST http://localhost:8100/api/query -H "Content-Type: application/json" \
  -d '{"game_id": "king-of-tokyo", "question": "Set up the game for us.", "mode": "setup"}'

curl -X POST http://localhost:8100/api/query -H "Content-Type: application/json" \
  -d '{"game_id": "king-of-tokyo", "question": "How does combat work when someone is in Tokyo?", "mode": "rules"}'

curl -X POST http://localhost:8100/api/query -H "Content-Type: application/json" \
  -d '{"game_id": "king-of-tokyo", "question": "What are all the ways to win?", "mode": "rules"}'
```

**Game 5: Root (Goblin — heavy)**
```bash
curl -X POST http://localhost:8100/api/query -H "Content-Type: application/json" \
  -d '{"game_id": "root", "question": "How do I set up a 4-player game?", "mode": "setup"}'

curl -X POST http://localhost:8100/api/query -H "Content-Type: application/json" \
  -d '{"game_id": "root", "question": "How does the Marquise de Cat faction work?", "mode": "rules"}'

curl -X POST http://localhost:8100/api/query -H "Content-Type: application/json" \
  -d '{"game_id": "root", "question": "Which faction is easiest for a beginner?", "mode": "strategy"}'
```

For each response, check:
- [ ] Answer is relevant to the question asked
- [ ] Answer references actual game mechanics (not generic filler)
- [ ] No invented rules or mechanics
- [ ] Response is concise (not a wall of text)
- [ ] Mode is respected (setup = step-by-step, rules = accurate, strategy = actionable advice)

✅ **Pass:** All 15 queries return accurate, relevant, concise responses.

If any response is wrong or hallucinated, note the game_id, question, and what was wrong.

---

#### TEST 3: Frontend verification on tablet viewport

Open Chrome DevTools → toggle device toolbar → set viewport to **1024x768** (standard tablet).

Load `http://localhost:3100` and verify:

- [ ] Game Selector grid loads with all 50 games visible (scrollable)
- [ ] Search bar filters games as you type
- [ ] Complexity badges display with correct colors
- [ ] Tapping a game opens the Game Teacher screen
- [ ] Mode tabs (Setup / Rules / Strategy / Q&A) are tappable and switch correctly
- [ ] Text input field is visible and usable
- [ ] Mic button is visible and prominent
- [ ] Response area displays text clearly
- [ ] "Back to Games" button works
- [ ] No layout overflow, no cut-off text, no broken elements

✅ **Pass:** All UI elements render correctly at tablet resolution.

---

#### TEST 4: Voice input test

In Chrome on K2-PC (Chrome has the best Web Speech API support):

1. Open `http://localhost:3100`
2. Select any game
3. Tap the mic button
4. Say clearly: "How do I set up this game?"
5. Verify: speech is transcribed into the text field
6. Verify: query is sent automatically
7. Verify: response appears on screen

✅ **Pass:** Voice input captures speech and triggers a query.

Note: If Chrome blocks mic access, you may need to allow it in site settings for localhost.

---

#### TEST 5: Voice output test

1. Make sure the voice/mute toggle is set to ON (unmuted)
2. Ask any game a question (voice or text)
3. Verify: the response is spoken aloud via SpeechSynthesis
4. Verify: speaking rate is comfortable (not too fast)
5. Toggle mute ON
6. Ask another question
7. Verify: response appears as text only, no audio

✅ **Pass:** Voice output speaks responses when unmuted, stays silent when muted.

---

#### TEST 6: Dashboard verification

Open `http://localhost:8100/dashboard` and verify:

- [ ] 50-game grid is visible
- [ ] Games are color-coded (should be mostly green/blue at this point)
- [ ] Agent status table shows all 5 Rogues
- [ ] Page auto-refreshes (wait 60 seconds, confirm data updates)
- [ ] Loads on mobile viewport (check at 375px width)

✅ **Pass:** Dashboard displays full swarm status, works on mobile.

---

#### TEST 7: Search and filter

```bash
# Search by name
curl "http://localhost:8100/api/games?search=wing"
# Should return Wingspan

# Filter by complexity
curl "http://localhost:8100/api/games?complexity=heavy"
# Should return ~10 games (Goblin's batch)

# Filter by complexity
curl "http://localhost:8100/api/games?complexity=party"
# Should return ~10 games (Dwarf's batch)
```

Also test search in the frontend:
1. Type "pan" in the search bar → should show Pandemic
2. Type "sc" → should show Scythe (and possibly others)
3. Clear search → all 50 games visible again

✅ **Pass:** Search and filter work correctly via API and frontend.

---

#### FINAL: Git commit and report

```bash
cd D:\GameMasterAI
git add .
git commit -m "Phase 5 — Final verification complete, 50-game MVP live"
```

---

### Acceptance Criteria

- [ ] 50 games loaded and returned by /api/games
- [ ] 15 test queries across 5 games all return accurate responses
- [ ] Frontend renders correctly at 1024x768 tablet viewport
- [ ] Voice input captures speech and triggers queries
- [ ] Voice output speaks responses, mute toggle works
- [ ] Dashboard shows 50-game grid with agent status
- [ ] Search and filter work via API and frontend
- [ ] Final git commit made

---

### Report Back

```
[GMAI-LOG] Overnight Sprint Complete — 50 Games, MVP Live

Phase: 5 (Final Verification)
Status: Complete / Partial / Failed
Timestamp: [ISO timestamp]

TEST RESULTS:
- Test 1 (Game Count): PASS/FAIL — {count} games loaded
- Test 2 (5-Game Deep Test): PASS/FAIL — {notes on any failures}
- Test 3 (Tablet Viewport): PASS/FAIL — {notes}
- Test 4 (Voice Input): PASS/FAIL — {notes}
- Test 5 (Voice Output): PASS/FAIL — {notes}
- Test 6 (Dashboard): PASS/FAIL — {notes}
- Test 7 (Search/Filter): PASS/FAIL — {notes}

ISSUES FOUND:
- {any problems, or "None"}

FINAL STATUS:
- Total games: 50
- All queryable: Yes/No
- Voice working: Yes/No
- Dashboard working: Yes/No
- MVP demo-ready: Yes/No
```
