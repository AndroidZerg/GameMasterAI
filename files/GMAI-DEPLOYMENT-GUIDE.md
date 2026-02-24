# GMAI — OpenClaw Agent Deployment Guide
## Deploy these 7 agents in this order

---

## DEPLOYMENT ORDER

### 1. Ranger (Agent Orchestrator)
**File:** `soul-ranger.md`
**Deploy in:** OpenClaw as an agent
**What to tell it after deploying:**
> You are Ranger, Agent Orchestrator for GameMaster AI. Your soul file defines your role. You manage 5 Rogue research agents and coordinate with Paladin (QA). The Rogues are being deployed now. Once all 5 are active, distribute the batch assignments from your soul file and begin monitoring heartbeats. Game files should be saved as {game_id}.json and placed in the output directory for Barbarian to pick up. Go.

---

### 2. Halfling (Rogue — Gateway Games)
**File:** `soul-halfling.md`
**Deploy in:** OpenClaw as an agent
**What to tell it after deploying:**
> You are Halfling. Your soul file has your full identity, batch assignment (10 gateway games), schema, process, and self-check list. Start with Catan and work through your batch in order. Save each completed game as {game_id}.json. Update your heartbeat after each game. Go.

---

### 3. Elf (Rogue — Mid-Weight Strategy)
**File:** `soul-elf.md`
**Deploy in:** OpenClaw as an agent
**What to tell it after deploying:**
> You are Elf. Your soul file has your full identity, batch assignment (10 mid-weight strategy games), schema, process, and self-check list. Start with Wingspan and work through your batch in order. Save each completed game as {game_id}.json. Update your heartbeat after each game. Go.

---

### 4. Dwarf (Rogue — Party & Social)
**File:** `soul-dwarf.md`
**Deploy in:** OpenClaw as an agent
**What to tell it after deploying:**
> You are Dwarf. Your soul file has your full identity, batch assignment (10 party/social games), schema, process, and self-check list. Start with Dixit and work through your batch in order. Save each completed game as {game_id}.json. Update your heartbeat after each game. Go.

---

### 5. Human (Rogue — Popular Modern)
**File:** `soul-human.md`
**Deploy in:** OpenClaw as an agent
**What to tell it after deploying:**
> You are Human. Your soul file has your full identity, batch assignment (10 popular modern games), schema, process, and self-check list. Start with Betrayal at House on the Hill and work through your batch in order. Save each completed game as {game_id}.json. Update your heartbeat after each game. Go.

---

### 6. Goblin (Rogue — Heavy & Complex)
**File:** `soul-goblin.md`
**Deploy in:** OpenClaw as an agent
**What to tell it after deploying:**
> You are Goblin. Your soul file has your full identity, batch assignment (10 heavy/complex games), schema, process, and self-check list. Start with Scythe and work through your batch in order. Save each completed game as {game_id}.json. Update your heartbeat after each game. Go.

---

### 7. Paladin (QA Validator)
**File:** `soul-paladin.md`
**Deploy in:** OpenClaw as an agent
**What to tell it after deploying:**
> You are Paladin, QA Validator for GameMaster AI. Your soul file has your 12-point quality checklist, rejection protocol, and approval protocol. Review every game file the Rogues submit. Approve or reject with specific feedback. Target: 50 games reviewed by morning. Begin reviewing as soon as the first game files arrive. Go.

---

## AFTER ALL 7 ARE DEPLOYED

The swarm should be self-running:
- Rogues research and write game files autonomously
- Paladin reviews as files arrive
- Ranger monitors heartbeats and routes rejections

**You'll know it's working when:** Ranger reports active heartbeats from all 5 Rogues and Paladin starts approving games.

**Bring approved .json files to Barbarian:** As Paladin approves games, copy the .json files to `D:\GameMasterAI\content\games\` on K2-PC and tell Barbarian to run `POST /api/reload` to load them into the app.
