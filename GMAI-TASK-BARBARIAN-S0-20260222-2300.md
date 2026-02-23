# GMAI-TASK-BARBARIAN-S0-20260222-2300
## From: Bard (CoS)
## To: Barbarian (Field Engineer)
## Priority: High
## Depends On: None — this is the first task

---

### Context

You are Barbarian, the Field Engineer for GameMaster AI. This is the start of the overnight sprint. Your job right now is Phase 0: get the infrastructure standing so the app can be built on top of it once game content starts flowing in from the Rogue swarm.

Read your soul file at `D:\GameMasterAI\soul-barbarian.md` for your full role definition and rules. The Master Architecture Document is at `D:\GameMasterAI\GMAI-MASTER-ARCHITECTURE-v2.md` — that is the single source of truth for everything.

**Your non-negotiable rules:**
- Git commit before and after every change
- Test after every step — nothing is "done" until verified
- One thing at a time, never batch
- You do NOT write application logic — you deploy and verify
- Email a `[GMAI-LOG]` to Tim's Gmail after this phase completes

---

### Instructions

Complete these steps IN ORDER. Do not skip ahead. Verify each step before moving to the next.

**Step 0: Set up the project directory**

```
mkdir -p D:\GameMasterAI\backend\app\api\routes
mkdir -p D:\GameMasterAI\backend\app\models
mkdir -p D:\GameMasterAI\backend\app\services
mkdir -p D:\GameMasterAI\backend\app\core
mkdir -p D:\GameMasterAI\frontend\src\components
mkdir -p D:\GameMasterAI\frontend\src\services
mkdir -p D:\GameMasterAI\content\games
mkdir -p D:\GameMasterAI\agents\heartbeat
mkdir -p D:\GameMasterAI\agents\logs
```

Initialize git:
```
cd D:\GameMasterAI
git init
git add .
git commit -m "Initial scaffold"
```

**Step 1: Fix OpenClaw Gateway Pairing**

In WSL2:
```bash
openclaw gateway pair
```

If that fails:
```bash
# Find what's holding port 18789
lsof -i :18789
# Kill it
kill <PID>
# Restart gateway
openclaw gateway start
# Pair again
openclaw gateway pair
# Verify
openclaw doctor
```

✅ **Verify:** `openclaw doctor` shows gateway connected. If this fails, STOP and email Tim immediately — nothing else works without the gateway.

**Step 2: Install and Configure ClawProxy**

In WSL2:
```bash
npm install -g clawproxy
```

Get your gateway token:
```bash
openclaw gateway token
```

Create the config file at `~/.clawproxy/config.json`:
```json
{
  "httpPort": 8080,
  "httpHost": "127.0.0.1",
  "gatewayUrl": "ws://127.0.0.1:18789",
  "gatewayToken": "<paste the token from the command above>",
  "defaultModel": "gpt-5.3-codex"
}
```

Start ClawProxy:
```bash
clawproxy start
```

✅ **Verify:** Run this curl command and confirm you get a valid response:
```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5.3-codex","messages":[{"role":"user","content":"Say hello"}]}'
```

Also verify the models endpoint:
```bash
curl http://localhost:8080/v1/models
```

If either fails, STOP. Debug ClawProxy before proceeding. The entire app depends on this endpoint.

**Step 3: Create the FastAPI backend with health endpoint**

Set up the Python backend at `D:\GameMasterAI\backend\`:
- `requirements.txt` with: fastapi, uvicorn, sqlite3 (stdlib), pydantic
- `app/main.py` — FastAPI app with a `/health` endpoint that returns `{"status": "ok"}`
- Run on port 8100

Start it:
```bash
cd D:\GameMasterAI\backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8100 --reload
```

✅ **Verify:** `curl http://localhost:8100/health` returns `{"status": "ok"}`

**Step 4: Create the React frontend**

Set up the React app at `D:\GameMasterAI\frontend\`:
```bash
cd D:\GameMasterAI\frontend
npm create vite@latest . -- --template react
npm install
```

Configure Vite to run on port 3100 (in `vite.config.js`, set `server.port: 3100`).

Start it:
```bash
npm run dev
```

✅ **Verify:** Open `http://localhost:3100` in a browser — the default Vite React page loads.

**Step 5: Build the heartbeat dashboard**

Add a `/dashboard` route to the FastAPI backend that serves a static HTML page. This page should:
- Read all JSON files from `D:\GameMasterAI\agents\heartbeat\`
- Display a grid of 50 game titles, color-coded by status:
  - Gray = not started
  - Yellow = in progress
  - Blue = in QA
  - Green = approved
  - Red = rejected/failed
- Show each Rogue agent's name, current game, and batch progress counts
- Auto-refresh every 60 seconds
- Be viewable on mobile (Tim will check this from his phone)

For now, the grid will be mostly gray — that's correct. It'll fill in as Rogues start producing content overnight.

✅ **Verify:** `http://localhost:8100/dashboard` loads and shows the empty grid.

**Step 6: Create the game schema template**

Save the empty schema template as `D:\GameMasterAI\content\games\_template.json`:
```json
{
  "game_id": "",
  "title": "",
  "aliases": [],
  "publisher": "",
  "player_count": {
    "min": 0,
    "max": 0,
    "recommended": 0,
    "expansion_max": 0
  },
  "play_time_minutes": {
    "min": 0,
    "max": 0
  },
  "complexity": "",
  "categories": [],
  "source_url": "",
  "source_verified": false,
  "sections": {
    "component_identification": {
      "content": "",
      "token_count": 0
    },
    "core_game_loop": {
      "content": "",
      "token_count": 0
    },
    "detailed_rules": {
      "content": "",
      "token_count": 0
    },
    "scoring_and_endgame": {
      "content": "",
      "token_count": 0
    },
    "beginner_strategy": {
      "content": "",
      "token_count": 0
    }
  },
  "total_token_count": 0,
  "metadata": {
    "created_by": "",
    "created_at": "",
    "validated_by": null,
    "validated_at": null,
    "validation_status": "pending",
    "revision": 1,
    "notes": ""
  }
}
```

**Step 7: Final git commit**
```bash
cd D:\GameMasterAI
git add .
git commit -m "Phase 0 complete — infrastructure scaffold, health endpoint, dashboard, ClawProxy verified"
```

---

### Acceptance Criteria

ALL of these must be true before you report Phase 0 complete:

- [ ] `openclaw doctor` shows gateway connected
- [ ] `curl http://localhost:8080/v1/models` returns model list
- [ ] `curl http://localhost:8080/v1/chat/completions` with a test message returns a valid LLM response
- [ ] `curl http://localhost:8100/health` returns `{"status": "ok"}`
- [ ] `http://localhost:3100` loads the React app in a browser
- [ ] `http://localhost:8100/dashboard` loads the heartbeat dashboard (empty grid is fine)
- [ ] `_template.json` exists at `D:\GameMasterAI\content\games\_template.json`
- [ ] Git repo initialized with at least 2 commits (initial scaffold + Phase 0 complete)
- [ ] All services running on correct ports: ClawProxy 8080, Backend 8100, Frontend 3100, Gateway 18789

---

### Report Back

Email Tim's Gmail with:

```
Subject: [GMAI-LOG] Phase 0 Complete — Infrastructure Ready

Phase: 0
Status: Complete (or Partial/Failed with details)
Timestamp: [ISO timestamp]

WHAT WAS DONE:
- [list each step completed]

WHAT WAS VERIFIED:
- [list each acceptance criterion and pass/fail]

ISSUES FOUND:
- [any problems encountered, or "None"]

NEXT STEPS:
- Waiting for approved game files from Paladin to begin Phase 4 (App Integration)
```

If ANY acceptance criterion fails, report the failure in the email and STOP. Do not proceed to Phase 4 with broken infrastructure.
