# GMAI-TASK-BARBARIAN-S4-20260223-0345
## From: Bard (CoS)
## To: Barbarian (Field Engineer)
## Priority: High
## Depends On: Phase 0 (Complete ✅)

---

### Context

Phase 0 is done — infrastructure is verified and running. Nice work on the ClawProxy adaptation; using the gateway's built-in HTTP endpoint directly is cleaner.

Your next job is Phase 4: build the actual app. This means API endpoints, frontend screens, voice integration, and game loading. You can build everything right now even though approved game files haven't arrived yet — create a single test game file to develop against, then load real files as Paladin approves them overnight.

**Important change from the original spec:** There is no ClawProxy on port 8080. The LLM endpoint is the OpenClaw gateway's built-in HTTP API:
- **LLM Base URL:** `http://127.0.0.1:18789/v1`
- **LLM Completions:** `http://127.0.0.1:18789/v1/chat/completions`
- **Model:** `gpt-5.3-codex`
- **Auth:** Use the gateway token you configured in Phase 0

Reference the Master Architecture Document (`D:\GameMasterAI\GMAI-MASTER-ARCHITECTURE-v2.md`) Sections 12 and 13 for the full LLM query architecture and MVP screen specs.

---

### Instructions

Complete these in order. Git commit between each major step. Verify each step works before moving on.

---

#### STEP 1: Create a test game file for development

Create `D:\GameMasterAI\content\games\catan.json` with real content so you have something to develop and test against. Use this:

```json
{
  "game_id": "catan",
  "title": "Catan",
  "aliases": ["Settlers of Catan", "The Settlers of Catan"],
  "publisher": "Catan Studio",
  "player_count": { "min": 3, "max": 4, "recommended": 4, "expansion_max": 6 },
  "play_time_minutes": { "min": 60, "max": 120 },
  "complexity": "gateway",
  "categories": ["strategy", "trading", "resource-management"],
  "source_url": "https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf",
  "source_verified": true,
  "sections": {
    "component_identification": {
      "content": "19 terrain hexes (4 Forest, 4 Pasture, 4 Fields, 3 Hills, 3 Mountains, 1 Desert), 6 sea frame pieces, 18 number tokens, 95 Resource Cards (19 each: Lumber, Wool, Grain, Ore, Brick), 25 Development Cards (14 Knight, 5 Victory Point, 2 Road Building, 2 Monopoly, 2 Year of Plenty), 4 Building Costs reference cards, 2 Special Cards (Longest Road, Largest Army), 1 Robber, 1 pair of dice. Per player: 5 settlements, 4 cities, 15 roads.",
      "token_count": 110
    },
    "core_game_loop": {
      "content": "On your turn: (1) Roll the dice — every player with a settlement or city on a hex matching the number collects resources. If you roll a 7, move the robber and steal. (2) Trade — you may trade resources with other players or use maritime trade (4:1, or better with ports). (3) Build — spend resources to build roads, settlements, cities, or buy development cards. Play passes clockwise.",
      "token_count": 85
    },
    "detailed_rules": {
      "content": "SETUP: Each player places 2 settlements and 2 roads on intersections/edges of the hex grid. Settlements must be at least 2 intersections apart (distance rule). Second settlement placement goes in reverse order, and players collect starting resources from the hexes adjacent to their second settlement.\n\nROBBER: When a 7 is rolled, any player with more than 7 resource cards must discard half (rounded down). The roller moves the robber to any hex, blocking it from producing. The roller steals 1 random resource from any player with a settlement/city on that hex. Development card Knights also move the robber.\n\nBUILDING COSTS: Road = 1 Brick + 1 Lumber. Settlement = 1 Brick + 1 Lumber + 1 Wool + 1 Grain. City (upgrade from settlement) = 2 Grain + 3 Ore. Development Card = 1 Wool + 1 Grain + 1 Ore.\n\nSETTLEMENT RULES: Must be placed on an unoccupied intersection connected to one of your roads. Must obey the distance rule (no adjacent settlements). Each settlement produces 1 resource when its hex number is rolled.\n\nCITIES: Replace an existing settlement. Produce 2 resources instead of 1 when the hex number is rolled.\n\nPORTS: Build a settlement on a port intersection for better trade rates. General ports trade 3:1. Specific resource ports trade 2:1 for that resource.\n\nDEVELOPMENT CARDS: Draw from the deck, keep hidden. Play at most 1 per turn, and not on the turn you bought it. Knight = move robber and steal. Road Building = place 2 free roads. Year of Plenty = take any 2 resources from the bank. Monopoly = name a resource, all players give you all of that resource. Victory Point cards are kept secret until they win you the game.\n\nLONGEST ROAD: First player to build a continuous road of 5+ segments gets this card (2 VP). Another player takes it if they build a longer continuous road.\n\nLARGEST ARMY: First player to play 3+ Knight cards gets this card (2 VP). Another player takes it if they play more Knights.",
      "token_count": 800
    },
    "scoring_and_endgame": {
      "content": "Victory Points: Settlement = 1 VP. City = 2 VP. Longest Road card = 2 VP. Largest Army card = 2 VP. Victory Point development cards = 1 VP each. The game ends immediately when a player has 10 or more VP on their turn (including revealed VP development cards). That player wins.",
      "token_count": 78
    },
    "beginner_strategy": {
      "content": "1. Start on variety — place your initial settlements on hexes that give you access to all 5 resource types, or at least 4. Being unable to produce a resource means you're dependent on trading for it. 2. Brick and Lumber are critical early — you need them for roads and settlements. Players who can't expand early fall behind. 3. Aim for 6s and 8s — these numbers are rolled most often after 7. Settlements on 6 and 8 hexes produce the most resources over the game. 4. Don't hoard cards past 7 — if you have 8+ resources when a 7 is rolled, you lose half. Build or trade before your hand gets too big. 5. Watch the Longest Road and Largest Army — these 2 VP bonuses often decide the game. If someone is close to 10 VP, check if you can steal one of these cards to slow them down.",
      "token_count": 110
    }
  },
  "total_token_count": 1183,
  "metadata": {
    "created_by": "halfling",
    "created_at": "2026-02-23T00:00:00Z",
    "validated_by": "paladin",
    "validated_at": "2026-02-23T01:00:00Z",
    "validation_status": "approved",
    "revision": 1,
    "notes": ""
  }
}
```

✅ **Verify:** File exists, is valid JSON, and has all 5 sections with real content.

Git commit: `"Add test game file (Catan) for development"`

---

#### STEP 2: Build the game loading service

Create `backend/app/services/knowledge.py`:
- Function to scan `D:\GameMasterAI\content\games\` for all `.json` files (skip `_template.json`)
- Function to load a single game's full JSON by `game_id`
- Function to get metadata (title, complexity, player count, categories) for all games
- Load game files from disk on demand — no caching needed for MVP

Create `backend/app/models/game.py`:
- SQLite model for game metadata: game_id, title, aliases (JSON string), player_count_min, player_count_max, complexity, categories (JSON string)
- Function to rebuild the SQLite database from the JSON files on disk (scan → insert all)

✅ **Verify:** Import the modules, call the scan function, confirm it finds `catan.json` and loads it correctly.

Git commit: `"Add game loading service and SQLite model"`

---

#### STEP 3: Build the /api/games endpoint

Create `backend/app/api/routes/games.py`:
- `GET /api/games` — returns list of all games with: game_id, title, complexity, player_count (min/max), categories
- Support `?search=` query parameter — filters by title (case-insensitive substring match)
- Support `?complexity=` query parameter — filters by complexity value
- On backend startup, scan the games directory and populate SQLite

Wire this route into the FastAPI app.

✅ **Verify:**
```bash
curl http://localhost:8100/api/games
# Should return array with Catan

curl "http://localhost:8100/api/games?search=cat"
# Should return Catan

curl "http://localhost:8100/api/games?complexity=gateway"
# Should return Catan
```

Git commit: `"Add /api/games endpoint with search and filter"`

---

#### STEP 4: Build the /api/query endpoint

Create `backend/app/api/routes/query.py`:
- `POST /api/query` — accepts JSON body: `{ "game_id": "catan", "question": "How do I set up the board?", "mode": "rules" }`
- Loads the full game JSON from disk using the knowledge service
- Constructs the LLM system prompt (see below)
- Sends the request to `http://127.0.0.1:18789/v1/chat/completions`
- Returns the LLM response text to the frontend

Create `backend/app/services/llm.py`:
- OpenAI-compatible client that POSTs to the gateway endpoint
- Include the gateway auth token in the request headers
- Model: `gpt-5.3-codex`
- Handle errors gracefully — if the gateway is down, return a clear error message

**System prompt template (from Section 12 of the architecture doc):**
```
You are GameMaster AI, a friendly and knowledgeable board game teacher working at a board game cafe. You are currently teaching {game_title}.

Use ONLY the knowledge base below to answer questions. If the knowledge base does not contain the answer, say "I'm not sure about that specific rule — you may want to check the rulebook for {game_title}." NEVER invent or guess at rules.

Be concise. Players are at a table with the game in front of them — they need quick, clear answers, not essays.

MODE: {mode}
- setup: Walk through game setup step by step
- rules: Answer rules questions accurately
- strategy: Give helpful strategic advice for new players
- qa: Ultra-brief answers — the game is in progress

KNOWLEDGE BASE:
{all 5 sections concatenated as text}
```

✅ **Verify:**
```bash
curl -X POST http://localhost:8100/api/query \
  -H "Content-Type: application/json" \
  -d '{"game_id": "catan", "question": "How do I set up the board?", "mode": "setup"}'
# Must return a coherent, accurate response about Catan setup
```

Test a second query to confirm it's using the knowledge base:
```bash
curl -X POST http://localhost:8100/api/query \
  -H "Content-Type: application/json" \
  -d '{"game_id": "catan", "question": "What happens when I roll a 7?", "mode": "rules"}'
# Must mention: discard if >7 cards, move robber, steal from adjacent player
```

Git commit: `"Add /api/query endpoint with LLM integration"`

---

#### STEP 5: Build the frontend — Game Selector screen

Replace the default Vite content with the GMAI app. Build `frontend/src/components/GameSelector.jsx`:
- Fetch game list from `/api/games` on mount
- Display games as a grid of cards, each showing: title, player count range, complexity badge
- Complexity badges color-coded: party = purple, gateway = green, midweight = blue, heavy = red
- Search bar at top — filters games as user types (calls `/api/games?search=`)
- Tapping a game card navigates to the Game Teacher screen
- Clean, readable layout — this runs on a tablet at a cafe table

✅ **Verify:** Open `http://localhost:3100`, see Catan in the game grid with correct info. Search for "cat" and see it filter.

Git commit: `"Add Game Selector screen"`

---

#### STEP 6: Build the frontend — Game Teacher screen

Build `frontend/src/components/QueryInterface.jsx` (and supporting components):
- Header: game title + "Back to Games" button
- Mode tabs: Setup | Rules | Strategy | Q&A (default to Rules)
- Large, prominent microphone button (center of screen)
- Text input field below the mic button (fallback for typing)
- "Ask" button to submit the text query
- Response display area showing the last answer
- Scrollable conversation history for the current session
- POST questions to `/api/query` with the selected game_id and current mode

✅ **Verify:** Navigate to Catan, type "How do I set up the board?" in the text field, press Ask. Confirm a real LLM response appears on screen with accurate Catan setup instructions.

Git commit: `"Add Game Teacher screen with text query"`

---

#### STEP 7: Add voice input (Web Speech API)

Build `frontend/src/components/VoiceButton.jsx`:
- Uses browser-native `webkitSpeechRecognition` or `SpeechRecognition`
- Tap the mic button → starts listening → visual indicator that it's recording (color change, pulse animation, anything clear)
- When speech is recognized → auto-fills the text input → auto-submits the query
- Handle errors: if speech recognition isn't supported, hide the mic button and show text input only

✅ **Verify:** Open on Chrome (best Web Speech API support), tap mic, say "What happens when I roll a 7?" — confirm the speech is transcribed and the query is sent and answered.

Git commit: `"Add voice input via Web Speech API"`

---

#### STEP 8: Add voice output (SpeechSynthesis)

When the app receives an LLM response:
- Automatically speak it aloud using `window.speechSynthesis` and `SpeechSynthesisUtterance`
- Use a natural-sounding voice if available (check `getVoices()` for a good English voice)
- Keep speaking rate slightly slower than default (0.9) for clarity in a noisy cafe
- Add a mute/unmute toggle button so users can silence voice output

✅ **Verify:** Ask Catan a question → response appears as text AND is spoken aloud. Tap mute → ask another question → response appears as text only, no audio.

Git commit: `"Add voice output via SpeechSynthesis"`

---

#### STEP 9: End-to-end test

Run through the complete flow:
1. Open `http://localhost:3100` on a browser
2. See Catan in the game grid
3. Tap Catan → Game Teacher screen opens
4. Switch to "Setup" mode tab
5. Tap mic → say "Walk me through setting up the board"
6. Speech is transcribed → query sent → LLM response appears as text → response is spoken aloud
7. Switch to "Rules" mode
8. Type "What happens when someone rolls a 7?" → submit
9. Accurate response about the robber, discarding, and stealing
10. Switch to "Strategy" mode
11. Ask "What should I focus on as a beginner?"
12. Get specific Catan strategy advice (not generic)

✅ **Verify:** All 12 steps pass. The full loop works: select game → ask question (voice or text) → get accurate answer (text + voice).

Git commit: `"Phase 4 complete — MVP end-to-end verified"`

---

#### STEP 10: Load additional games as they arrive

The Rogue swarm is producing game files overnight. As new `.json` files appear in `D:\GameMasterAI\content\games\`:
- Add a `/api/reload` endpoint (or reload on startup) that re-scans the games directory and updates SQLite
- Each time you load new files, verify: the game appears in the selector, and a test query returns an accurate response
- Don't wait for all 50 — load them in batches as they arrive

This step is ongoing through the night. No single commit — commit each batch load.

---

### Acceptance Criteria

ALL of these must be true before you report Phase 4 complete:

- [ ] `GET /api/games` returns all loaded games with correct metadata
- [ ] `GET /api/games?search=catan` filters correctly
- [ ] `POST /api/query` with a game_id and question returns an accurate LLM response
- [ ] Game Selector screen shows game grid with search and complexity badges
- [ ] Game Teacher screen has mode tabs (Setup/Rules/Strategy/Q&A), mic button, text input, response area
- [ ] Voice input works: tap mic → speak → speech transcribed → query sent → answer received
- [ ] Voice output works: LLM response is spoken aloud automatically
- [ ] Mute toggle works: voice output can be silenced
- [ ] End-to-end flow passes all 12 steps in the test above
- [ ] At least 1 game (Catan) is fully functional
- [ ] Git repo has commits for each step

---

### Report Back

Post your completion log here (Tim will relay to Bard) with this format:

```
[GMAI-LOG] Phase 4 Complete — MVP Live

Phase: 4
Status: Complete / Partial / Failed
Timestamp: [ISO timestamp]

WHAT WAS DONE:
- [list each step completed]

WHAT WAS VERIFIED:
- [list each acceptance criterion and pass/fail]

GAMES LOADED:
- [count and list of games currently in the system]

ISSUES FOUND:
- [any problems, or "None"]

NEXT STEPS:
- Continue loading games as Rogues/Paladin deliver them
- Standing by for Phase 5 (final verification) once all 50 are loaded
```
