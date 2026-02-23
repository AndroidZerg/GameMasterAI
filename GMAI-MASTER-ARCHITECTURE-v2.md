# GAMEMASTER AI — Master Architecture Document
## Version 2.0 | February 22, 2026 | CONFIDENTIAL

---

## 1. PROJECT OVERVIEW

**GameMaster AI (GMAI)** is a subscription-based web application that teaches board games to customers at board game cafes. The app runs on tablets at gaming tables, using voice-driven AI interaction to walk groups through setup, rules, strategy, and in-game questions — reducing the staff teaching burden by 50–70%.

**Target market:** B2B — board game cafes, bars, and venues. Zero competitors exist in this market segment.

**Business model:** Monthly SaaS subscription ($99–$349/month per venue).

**CEO & Domain Expert:** Tim Pham. Tim is the authority on the business, market, and venue economics. He does not write code or read technical specs. All technical output must be translated into plain English for Tim's decision-making.

---

## 2. OVERNIGHT SPRINT OBJECTIVE

**Goal:** By morning of February 23, 2026, deliver:

1. A **functional webapp MVP** — game selector → text input + mic button → LLM query with game-specific context → text + voice response
2. **50 structured game knowledge bases** — researched, formatted, and loaded into the system
3. A **heartbeat dashboard** Tim can check from his phone to monitor agent progress overnight

**This is Option A (Full Send):** Working app + content simultaneously. Voice interaction uses browser-native Web Speech API. No kiosk mode polish tonight — that's a follow-up sprint.

---

## 3. THE TEAM

| # | Name | Role | Tier | Platform | Model | Monthly Cost |
|---|------|------|------|----------|-------|-------------|
| 1 | **Bard** | Chief of Staff | Strategic | Claude.ai Project | Claude Opus 4.6 | $0 (subscription) |
| 2 | **Wizard** | CTO / Architect | Strategic | Claude.ai Project | Claude Opus 4.6 | $0 (subscription) |
| 3 | **Barbarian** | Field Engineer | Field | Claude Code on K2-PC | Claude Code | $0 (subscription) |
| 4 | **Ranger** | Agent Orchestrator | Batch Agent | OpenClaw (Codex OAuth) | GPT-5.3-Codex | $0 (subscription) |
| 5a | **Halfling** | Rogue — Research Agent | Batch Agent | OpenClaw (Codex OAuth) | GPT-5.3-Codex | $0 (subscription) |
| 5b | **Elf** | Rogue — Research Agent | Batch Agent | OpenClaw (Codex OAuth) | GPT-5.3-Codex | $0 (subscription) |
| 5c | **Dwarf** | Rogue — Research Agent | Batch Agent | OpenClaw (Codex OAuth) | GPT-5.3-Codex | $0 (subscription) |
| 5d | **Human** | Rogue — Research Agent | Batch Agent | OpenClaw (Codex OAuth) | GPT-5.3-Codex | $0 (subscription) |
| 5e | **Goblin** | Rogue — Research Agent | Batch Agent | OpenClaw (Codex OAuth) | GPT-5.3-Codex | $0 (subscription) |
| 6 | **Paladin** | QA Validator | Batch Agent | OpenClaw (Codex OAuth) | GPT-5.3-Codex | $0 (subscription) |

**Total cost: $0 per sprint. All platforms covered by Tim's existing subscriptions ($100/mo Anthropic + $20/mo ChatGPT Plus = $120/mo total across all projects).**

### Role Boundaries (Non-Negotiable)

- **Bard** (CoS): Translates, orchestrates, routes. NEVER writes code.
- **Wizard** (CTO): Designs architecture, makes tech decisions. Writes specs, not deployment code.
- **Barbarian** (Field Engineer): ONLY persona that touches the running system. Deploys, debugs, verifies, manages infrastructure. Does NOT write application logic — routes app bugs back to the responsible agent.
- **Ranger** (Orchestrator): Manages the Rogue swarm. Assigns game batches. Monitors heartbeats. Sends Telegram alerts on blockers ONLY.
- **Rogues** (Halfling, Elf, Dwarf, Human, Goblin): Research and format game knowledge bases. Work autonomously in parallel. Each assigned 10 games. Do NOT deploy anything.
- **Paladin** (QA): Reviews every completed game entry against the quality checklist. Approves or rejects. No exceptions, no shortcuts.

---

## 4. TECH STACK

### Zero-Cost LLM Access: ClawProxy + OpenClaw OAuth

The webapp does NOT use paid API keys. Instead, it routes all LLM requests through ClawProxy, which connects to OpenClaw's gateway, which authenticates via Codex OAuth against Tim's existing ChatGPT Plus subscription.

**The LLM request flow:**
```
User question → FastAPI backend → ClawProxy (localhost:8080)
    → OpenClaw Gateway (ws://127.0.0.1:18789)
    → Codex OAuth → OpenAI GPT-5.3-Codex
    → Response flows back the same path
```

**Cost: $0.** All requests covered by the $20/month ChatGPT Plus subscription.

**ClawProxy** exposes a standard OpenAI-compatible endpoint at `http://localhost:8080/v1/chat/completions`. The FastAPI backend treats it exactly like any OpenAI endpoint — same JSON format, same model names. The backend code has zero awareness that it's going through a proxy.

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Database:** SQLite (single file, zero setup, built into Python) — stores game metadata for search/filter
- **LLM Endpoint:** `http://localhost:8080/v1/chat/completions` via ClawProxy
- **LLM Model:** `gpt-5.3-codex` (default OpenClaw model)
- **API Port:** 8100 (avoids conflict with K2's ports)

### Frontend
- **Framework:** React (Vite build tooling)
- **Voice Input:** Web Speech API (browser-native, free)
- **Voice Output:** Web Speech API with SpeechSynthesis (browser-native, free)
- **Dev Port:** 3100 (avoids conflict with K2's ports)
- **Target Device:** Tablet browsers (iPad Safari, Android Chrome)

### Infrastructure
- **Machine:** K2-PC (Windows, Docker Desktop available but NOT used for GMAI)
- **OpenClaw Gateway:** Already running in WSL2 on port 18789
- **ClawProxy:** Installed in WSL2, serves on port 8080
- **No Docker containers.** No PostgreSQL. No Redis. All data is flat files + SQLite.
- **Game Knowledge Bases:** Stored as JSON files in `D:\GameMasterAI\content\games\`

### File Structure
```
D:\GameMasterAI\
├── backend\
│   ├── app\
│   │   ├── main.py              # FastAPI entry point
│   │   ├── api\
│   │   │   ├── routes\
│   │   │   │   ├── games.py     # Game listing, search, filter
│   │   │   │   ├── query.py     # LLM query endpoint (→ ClawProxy)
│   │   │   │   └── dashboard.py # Agent monitoring dashboard
│   │   ├── models\
│   │   │   └── game.py          # SQLite game model
│   │   ├── services\
│   │   │   ├── llm.py           # ClawProxy client (OpenAI-compatible)
│   │   │   └── knowledge.py     # Game KB loader (reads JSON files)
│   │   └── core\
│   │       └── config.py        # Settings
│   ├── games.db                 # SQLite database (auto-created)
│   └── requirements.txt
├── frontend\
│   ├── src\
│   │   ├── App.jsx
│   │   ├── components\
│   │   │   ├── GameSelector.jsx
│   │   │   ├── QueryInterface.jsx
│   │   │   ├── VoiceButton.jsx
│   │   │   └── ResponseDisplay.jsx
│   │   └── services\
│   │       └── api.js
│   ├── package.json
│   └── vite.config.js
├── content\
│   └── games\
│       ├── catan.json
│       ├── ticket-to-ride.json
│       ├── ...                  # 50 game files
│       └── _template.json       # Schema template
├── agents\
│   ├── heartbeat\
│   │   ├── status.json          # Aggregated agent status
│   │   └── dashboard.html       # Static monitoring page
│   └── logs\
│       ├── halfling.log
│       ├── elf.log
│       ├── dwarf.log
│       ├── human.log
│       └── goblin.log
└── README.md
```

---

## 5. GAME KNOWLEDGE BASE SCHEMA

Every game knowledge base follows this exact JSON structure. This is the contract between Rogues (who produce them), Paladin (who validates them), and the backend (which serves them to the LLM).

```json
{
  "game_id": "catan",
  "title": "Catan",
  "aliases": ["Settlers of Catan", "The Settlers of Catan"],
  "publisher": "Catan Studio",
  "player_count": {
    "min": 3,
    "max": 4,
    "recommended": 4,
    "expansion_max": 6
  },
  "play_time_minutes": {
    "min": 60,
    "max": 120
  },
  "complexity": "gateway",
  "categories": ["strategy", "trading", "resource-management"],
  "source_url": "https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf",
  "source_verified": true,
  "sections": {
    "component_identification": {
      "content": "[Full component list with exact counts]",
      "token_count": 112
    },
    "core_game_loop": {
      "content": "[What happens on each turn — the essential flow]",
      "token_count": 95
    },
    "detailed_rules": {
      "content": "[Comprehensive rules — all actions, edge cases, special mechanics]",
      "token_count": 800
    },
    "scoring_and_endgame": {
      "content": "[All VP sources, end-game trigger, final scoring]",
      "token_count": 78
    },
    "beginner_strategy": {
      "content": "[Actionable advice for first-time players]",
      "token_count": 110
    }
  },
  "total_token_count": 1195,
  "metadata": {
    "created_by": "halfling",
    "created_at": "2026-02-23T00:00:00Z",
    "validated_by": null,
    "validated_at": null,
    "validation_status": "pending",
    "revision": 1,
    "notes": ""
  }
}
```

### Schema Rules

1. **`game_id`**: Lowercase, hyphenated. Must match filename (e.g., `ticket-to-ride.json`).
2. **`complexity`**: One of: `party`, `gateway`, `midweight`, `heavy`. No other values.
3. **`sections`**: All five sections are REQUIRED. No section may be empty.
4. **`token_count`**: Approximate per-section. Total should be 800–3,000 tokens. Under 800 means the guide is too thin. Over 5,000 means it needs trimming.
5. **`source_url`**: Must link to the actual rules PDF or official rules page. Not a BGG forum post. Not a YouTube video.
6. **`source_verified`**: Set to `true` only if the Rogue confirmed the URL is accessible and contains the official rules.
7. **`metadata.created_by`**: Must be the Rogue's name (halfling, elf, dwarf, human, goblin).
8. **`metadata.validation_status`**: One of: `pending`, `approved`, `rejected`. Only Paladin changes this.

---

## 6. THE 50-GAME CATALOG

### Batch Assignments

**Halfling (Batch 1 — Gateway Games):**
1. Catan
2. Ticket to Ride
3. Carcassonne
4. Azul
5. Splendor
6. Codenames
7. Kingdomino
8. Sushi Go Party!
9. Patchwork
10. Century: Spice Road

**Elf (Batch 2 — Mid-Weight Strategy):**
11. Wingspan
12. 7 Wonders
13. Pandemic
14. Dominion
15. Everdell
16. Terraforming Mars
17. Sagrada
18. Above and Below
19. Lords of Waterdeep
20. Clank!

**Dwarf (Batch 3 — Party & Social):**
21. Dixit
22. Wavelength
23. Just One
24. The Crew
25. Coup
26. Love Letter
27. Skull
28. One Night Ultimate Werewolf
29. Telestrations
30. Decrypto

**Human (Batch 4 — Popular Modern):**
31. Betrayal at House on the Hill
32. Mysterium
33. Villainous
34. Photosynthesis
35. Takenoko
36. Sheriff of Nottingham
37. Dead of Winter
38. Cosmic Encounter
39. King of Tokyo
40. Quacks of Quedlinburg

**Goblin (Batch 5 — Heavy & Complex):**
41. Scythe
42. Spirit Island
43. Brass: Birmingham
44. Root
45. Agricola
46. Concordia
47. Great Western Trail
48. Viticulture
49. Castles of Burgundy
50. Power Grid

### Why This Distribution

- **Halfling** gets gateways — shortest rules, fastest to produce, gets early wins flowing to Paladin quickly.
- **Elf** gets mid-weight strategy — these have the highest teaching value for cafes.
- **Dwarf** gets party games — short rules but need careful handling of social/hidden-role mechanics.
- **Human** gets popular modern — mixed complexity, the "meat" of a cafe library.
- **Goblin** gets heavy games — longest rules, most complex, saved for the grind.

---

## 7. COMMUNICATION ARCHITECTURE

```
Tim ↔ Bard                    Claude.ai project — strategy, planning, sprint management
Tim ↔ Wizard                  Claude.ai project — architecture decisions, tech judgment
Bard → Barbarian              Tim downloads .md ticket → attaches to Claude Code session
Bard → Ranger                 Tim downloads .md ticket → Ranger picks up and routes to Rogues
Barbarian → Bard              [GMAI-LOG] email to Tim's Gmail → Bard reads via Gmail search
Ranger → Tim                  Telegram notifications — blocker alerts and decision requests ONLY
Ranger → Rogues               Direct task assignment within OpenClaw agent orchestration
Rogues → Ranger               Completed game files + heartbeat status updates
Paladin → Ranger              Approved/rejected status updates → Ranger re-routes rejections
```

### Ticket System

**File naming:** `GMAI-{TYPE}-{TO}-{SPRINT}-{YYYYMMDD}-{HHMM}.md`

**Ticket types:**
- `TASK` — Work instructions
- `LOG` — Completed work results
- `SPEC` — Feature specifications
- `PATCH` — Bug fix instructions
- `REVIEW` — Review or feedback request

**Email relay tag:** `[GMAI-LOG]`

Barbarian emails completion reports to Tim's Gmail after every deployment with the subject line starting with `[GMAI-LOG]`. Bard reads these via Gmail search.

---

## 8. HEARTBEAT & MONITORING SYSTEM

### Agent Heartbeat Protocol

Every Rogue writes a status update to a shared status file at regular intervals. The format:

```json
{
  "agent": "halfling",
  "timestamp": "2026-02-23T01:30:00Z",
  "status": "working",
  "current_game": "splendor",
  "batch_progress": {
    "total": 10,
    "completed": 3,
    "in_progress": 1,
    "failed": 0,
    "in_qa": 2,
    "approved": 1
  },
  "last_completed": "carcassonne",
  "blockers": []
}
```

### Status Values
- `working` — Actively researching/writing a game
- `idle` — Waiting for QA feedback or next assignment
- `blocked` — Cannot proceed — requires intervention
- `complete` — Batch finished

### Dashboard

Barbarian builds a simple static HTML dashboard at `http://localhost:8100/dashboard` that:
- Reads all agent heartbeat files from `D:\GameMasterAI\agents\heartbeat\`
- Shows a grid: 50 games, color-coded by status (gray = not started, yellow = in progress, blue = in QA, green = approved, red = rejected/failed)
- Shows each Rogue's current game and batch progress
- Auto-refreshes every 60 seconds
- Accessible from Tim's phone on the local network

### Ranger Alert Rules

Ranger sends Telegram alerts ONLY for:
- A Rogue has been `blocked` for more than 15 minutes
- A Rogue's heartbeat is missing for more than 30 minutes (agent may have crashed)
- Paladin has rejected 3+ games from the same Rogue (pattern problem — needs intervention)
- All 50 games are complete (the good alert)

Ranger does NOT alert for: routine completions, QA passes, normal progress.

---

## 9. OVERNIGHT EXECUTION PLAN

### Phase 0: Infrastructure Setup (Barbarian — ~45 minutes)

**Step 1: Fix OpenClaw Gateway Pairing**
```
# In WSL2 on K2-PC:
openclaw gateway pair
# If that fails:
kill 266  # (or whatever pid holds port 18789)
openclaw gateway start
openclaw gateway pair
# Verify:
openclaw doctor  # Should show gateway connected
```

**Step 2: Install and Configure ClawProxy**
```
npm install -g clawproxy
# Create config at ~/.clawproxy/config.json:
{
  "httpPort": 8080,
  "httpHost": "127.0.0.1",
  "gatewayUrl": "ws://127.0.0.1:18789",
  "gatewayToken": "<get from openclaw gateway token>",
  "defaultModel": "gpt-5.3-codex"
}
# Start ClawProxy:
clawproxy start
```

**Step 3: Verify LLM Endpoint**
```
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5.3-codex","messages":[{"role":"user","content":"Say hello"}]}'
# Must return a valid response. If this fails, STOP — nothing else works.
```

**Step 4: Scaffold the Project**
```
# Create directory structure at D:\GameMasterAI\
# Set up FastAPI backend with health endpoint
# Set up React frontend with Vite
# Create game KB template file (_template.json)
# Build heartbeat dashboard page
# Verify: localhost:8100/health returns OK, localhost:3100 loads
```

**Barbarian emails `[GMAI-LOG] Phase 0 Complete` to Tim's Gmail when done.**

### Phase 1: Rogue Swarm Launch (Ranger — starts after Phase 0)
1. Ranger distributes the 50-game batch assignments (Section 6 of this document)
2. Each Rogue receives: their 10 games, the schema template, the quality checklist
3. All 5 Rogues begin working simultaneously
4. Ranger monitors heartbeats from all agents

### Phase 2: Research & Content Production (Rogues — ~4–6 hours)
Each Rogue follows this process for every game in their batch:

1. **Find the official rules PDF** — Check publisher website first, then BoardGameGeek files section. Only use official publisher rules, not community rewrites.
2. **Read and extract** — Process the full rulebook. Identify all components, core loop, detailed rules, scoring, and strategic considerations.
3. **Structure into schema** — Fill every field in the template. All five sections required. Include accurate token counts.
4. **Self-check** — Verify: Is every section substantive? Are there any invented rules? Does the component list match what's actually in the box? Are scoring conditions complete?
5. **Write the JSON file** — Name it `{game_id}.json`, place in the content output directory.
6. **Update heartbeat** — Mark game as `in_qa`, update progress counts.

### Phase 3: QA Validation (Paladin — runs in parallel with Phase 2)
Paladin picks up games as they arrive from Rogues. For each game:

1. Check all 5 sections are present and substantive (not placeholder text)
2. Verify `game_id` matches filename
3. Verify `complexity` is a valid value
4. Verify `source_url` points to an actual rules PDF/page
5. Verify component list is plausible (correct number of cards, pieces, etc.)
6. Verify core game loop accurately describes how a turn works
7. Verify scoring conditions are complete (no missing VP sources)
8. Verify total token count is 800–3,000
9. Check for LLM hallucination patterns: invented mechanics, wrong player counts, rules from a different game

**If approved:** Set `validation_status` to `approved`, return to Ranger.
**If rejected:** Set `validation_status` to `rejected`, add specific reasons to `metadata.notes`, return to Ranger → Ranger routes back to originating Rogue.

### Phase 4: App Integration (Barbarian — starts after ~10 games approved)
Once Paladin has approved the first batch:

1. Load approved game JSON files into SQLite database
2. Build the `/api/games` endpoint — returns list of all games with title, complexity, player count
3. Build the `/api/query` endpoint — accepts game_id + user question, loads game KB, sends to ClawProxy (`localhost:8080`), returns response
4. Wire up React frontend: game selector grid → query input → response display
5. Add Web Speech API voice input (mic button → speech-to-text → send as query)
6. Add Web Speech API voice output (response text → speech synthesis)
7. Test end-to-end: select Catan → ask "how do I set up the board?" → get accurate spoken response
8. Continue loading games as Paladin approves them throughout the night

**Barbarian emails `[GMAI-LOG] MVP Live — {N} games loaded` when first playable version is up.**

### Phase 5: Final Verification (Barbarian — morning)
1. All 50 game files loaded and queryable
2. Pick 5 random games, ask 3 questions each — verify accuracy
3. Dashboard shows all 50 green
4. Frontend loads cleanly on tablet-sized viewport
5. Voice input and output functional

**Barbarian emails `[GMAI-LOG] Overnight Sprint Complete — 50 games, MVP live` to Tim's Gmail.**

---

## 10. DEVELOPMENT PROCESS RULES

**Rule 1 — Schema Before Content.**
No Rogue writes a single game file until Wizard has finalized the schema (Section 5) and Barbarian has verified the template loads correctly. The schema in this document IS the finalized schema.

**Rule 2 — Barbarian Tests After Every Deploy.**
No deploy is marked "done" until Barbarian has verified it on the running system. Minimum: health endpoint returns 200, new endpoints respond correctly, frontend builds with zero errors, at least one game query returns an accurate answer.

**Rule 3 — Bard Verifies Deliverables Against Spec.**
No task is marked complete until every acceptance criterion is checked. Route back to the responsible agent with the specific gap identified.

**Rule 4 — Incremental Deploys, Never Batched.**
One feature at a time. Verify between each. If a deploy breaks something, roll back that single change and report.

**Rule 5 — Source of Truth Lives with the Writers.**
Rogues own game content. Barbarian deploys content but does NOT edit game files. Content errors get routed back through Ranger to the responsible Rogue.

**Rule 6 — Git Before Every Deploy.**
Barbarian commits before and after every deploy. `git checkout .` enables instant rollback.

---

## 11. QUALITY CHECKLIST (Paladin's Reference)

| # | Check | Pass Criteria |
|---|-------|--------------|
| 1 | All 5 sections present | No section is empty or contains placeholder text |
| 2 | game_id matches filename | `catan.json` has `"game_id": "catan"` |
| 3 | Complexity value valid | One of: `party`, `gateway`, `midweight`, `heavy` |
| 4 | Source URL valid | Points to official rules PDF or publisher rules page |
| 5 | Player count accurate | Matches the actual game's published player count |
| 6 | Component list plausible | Correct number of pieces, cards, dice for this game |
| 7 | Core loop accurate | Correctly describes what happens on a turn |
| 8 | Scoring complete | All VP sources listed, end-game trigger correct |
| 9 | Strategy is helpful | Gives actionable advice, not generic platitudes |
| 10 | Token count in range | Total 800–3,000 tokens |
| 11 | No hallucinations | No invented mechanics, no rules from other games |
| 12 | No copyright violation | Original teaching text, not copied rulebook text |

### Rejection Protocol

A single failed check = rejection. Paladin specifies WHICH check(s) failed and the exact correction. Vague rejections not permitted.

---

## 12. LLM QUERY ARCHITECTURE

### How a User Query Gets Answered

```
1. User selects game (e.g., "Catan") on tablet
2. User taps mic → speaks: "How does trading work?"
3. Web Speech API transcribes → "How does trading work?"
4. Frontend POSTs to /api/query:
   { "game_id": "catan", "question": "How does trading work?", "mode": "rules" }
5. Backend loads catan.json knowledge base from disk
6. Backend constructs LLM prompt:
   SYSTEM: You are GameMaster AI, a friendly board game teacher at a cafe.
   You are teaching {game_title}. Use ONLY the knowledge base below to answer.
   If you are not sure, say so — never invent rules.
   
   KNOWLEDGE BASE:
   {full game JSON sections concatenated as text}
   
   USER: {question}
7. Backend POSTs to http://localhost:8080/v1/chat/completions
   (ClawProxy → OpenClaw Gateway → Codex OAuth → GPT-5.3-Codex)
8. Response returned to frontend
9. Frontend displays text + triggers SpeechSynthesis to speak it aloud
```

### Interaction Modes

The `mode` parameter shapes the system prompt:
- `setup` — "Walk the group through setting up this game step by step"
- `rules` — "Answer rules questions accurately and concisely"
- `strategy` — "Provide strategic advice for players learning this game"
- `qa` — "Answer the question as briefly and clearly as possible — the game is in progress"

---

## 13. WEBAPP MVP SPECIFICATION

### Screens

**Screen 1 — Game Selector**
- Grid of game cards showing: title, player count, complexity badge
- Search bar with live filter
- Sort by: alphabetical, complexity, player count
- Tap a game → navigate to Screen 2

**Screen 2 — Game Teacher**
- Header: game title + "Back to Games" button
- Mode tabs: Setup | Rules | Strategy | Q&A
- Large microphone button (center, prominent)
- Text input field below mic button (fallback)
- Response area: shows text of last answer
- Auto-speaks response via Web Speech API
- Conversation history for current session (scrollable)

### MVP Cuts (Not Tonight)
- No user accounts or authentication
- No kiosk mode lockdown
- No offline caching
- No analytics dashboard for venue owners
- No game cover art (text-only cards)
- No tablet-specific gestures
- No custom TTS voices

---

## 14. KEY TECHNICAL REFERENCE FOR BARD

Bard (CoS) needs to evaluate agent output without reading code:

### "Is the LLM proxy working?"
- Barbarian should report: `curl localhost:8080/v1/models` returns model list including `gpt-5.3-codex`
- Barbarian should report: a test chat completion returns a coherent response

### "Is the backend working?"
- Barbarian should report: `http://localhost:8100/health` returns `{"status": "ok"}`
- Barbarian should report: `http://localhost:8100/api/games` returns a list of games
- Barbarian should report: POSTing a question to `/api/query` returns a coherent answer

### "Is the frontend working?"
- Barbarian should report: `http://localhost:3100` loads in a browser
- Games appear in the selector grid
- Tapping a game and asking a question returns an answer on screen

### "Is the dashboard working?"
- Barbarian should report: `http://localhost:8100/dashboard` shows the 50-game status grid
- Colors update as games move through the pipeline

### "Are the agents running?"
- Ranger should report: all 5 Rogues have active heartbeats
- Games are moving from `in_progress` → `in_qa` → `approved`
- Paladin is actively reviewing

### Ports Reference
| Service | Port |
|---------|------|
| ClawProxy (LLM) | 8080 |
| FastAPI backend | 8100 |
| React frontend (dev) | 3100 |
| OpenClaw Gateway | 18789 |

---

## 15. BATCH AGENT MAINTENANCE

**Codex OAuth token expiry:** Tokens expire approximately every 10 days.

**Re-auth command:** `openclaw models auth login --provider openai-codex` (run in WSL2, Tim approves in browser).

**Emergency fallback:** OpenRouter configured with GLM-5 and Kimi K2.5 but unfunded. Use only if both Anthropic and OpenClaw platforms are completely unavailable.

---

## 16. WHAT EACH PERSONA IS NOT

| Persona | Is NOT |
|---------|--------|
| **Bard** | Not a coder. Not an architect. Not a product manager. Translates and routes. |
| **Wizard** | Not a deployer. Not a sprint manager. Designs systems, doesn't build them. |
| **Barbarian** | Not an app logic writer. Not a content creator. Deploys and verifies only. |
| **Ranger** | Not a content creator. Not a coder. Manages the swarm, nothing else. |
| **Rogues** | Not deployers. Not QA. Research and format content only. |
| **Paladin** | Not a content creator. Not a deployer. Validates only. |

---

## 17. GLOSSARY

| Term | Meaning |
|------|---------|
| **GMAI** | GameMaster AI — this project |
| **K2-PC** | Tim's dedicated Windows development machine (also runs K2/Karaoke 2.0) |
| **Knowledge Base (KB)** | The structured JSON file containing all teaching content for one game |
| **Rogue Swarm** | The 5 parallel research agents (Halfling, Elf, Dwarf, Human, Goblin) |
| **Heartbeat** | Regular status update written by each agent to the monitoring system |
| **ClawProxy** | OpenAI-compatible HTTP proxy that connects to OpenClaw Gateway |
| **OpenClaw** | Platform for running autonomous agents via Codex OAuth |
| **Codex OAuth** | Authentication method connecting OpenClaw to ChatGPT Plus subscription — replaces API keys |

---

*END OF MASTER ARCHITECTURE DOCUMENT*
