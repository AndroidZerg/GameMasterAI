# GMAI-TASK-BARBARIAN-S1-20260223-0420
## From: Bard (CoS)
## To: Barbarian (Field Engineer)
## Priority: High
## Depends On: Phase 0 (Complete ✅), Phase 4 (Complete ✅)

---

### Context

The MVP app is live and waiting for game content. Your next job is to spawn the content production swarm in OpenClaw from WSL2. You're deploying 7 agents: Ranger (orchestrator), 5 Rogues (content writers), and Paladin (QA validator). Once deployed, they run autonomously — Rogues research games, Paladin reviews them, Ranger coordinates.

The soul files for all 7 agents are provided below. Each agent gets its own soul file as its system prompt. Deploy them using the OpenClaw CLI in WSL2.

After deploying, you'll monitor for completed game files and load them into the app as they arrive.

---

### Instructions

#### STEP 1: Save all 7 soul files to disk

Save each soul file to `D:\GameMasterAI\agents\souls\` so they're version-controlled and referenceable. The contents of each file are attached or available at `/mnt/user-data/outputs/`:

```
D:\GameMasterAI\agents\souls\
├── soul-ranger.md
├── soul-halfling.md
├── soul-elf.md
├── soul-dwarf.md
├── soul-human.md
├── soul-goblin.md
└── soul-paladin.md
```

Git commit: `"Add agent soul files for OpenClaw deployment"`

#### STEP 2: Deploy agents via OpenClaw CLI

In WSL2, use the OpenClaw CLI to spawn each agent. The exact commands will depend on the OpenClaw CLI syntax available on K2-PC. Explore with:

```bash
openclaw --help
openclaw agent --help
openclaw codex --help
```

You're looking for commands to create/spawn agents with a system prompt or instruction file. Common patterns might be:

```bash
openclaw agent create --name "ranger" --instructions-file /path/to/soul-ranger.md
openclaw codex create --name "halfling" --instructions-file /path/to/soul-halfling.md
```

**Deploy in this order:**

1. **Ranger** — `soul-ranger.md` — the orchestrator, deploy first
2. **Halfling** — `soul-halfling.md` — gateway games (simplest, produces content fastest)
3. **Elf** — `soul-elf.md` — mid-weight strategy
4. **Dwarf** — `soul-dwarf.md` — party/social
5. **Human** — `soul-human.md` — popular modern
6. **Goblin** — `soul-goblin.md` — heavy/complex
7. **Paladin** — `soul-paladin.md` — QA validator, deploy last so content is flowing when it starts

**After each agent deploys, give it its launch prompt:**

**Ranger:**
> You are Ranger, Agent Orchestrator for GameMaster AI. Your soul file defines your role. You manage 5 Rogue research agents and coordinate with Paladin (QA). The Rogues are being deployed now. Once all 5 are active, distribute the batch assignments from your soul file and begin monitoring heartbeats. Game files should be saved as {game_id}.json. Go.

**Halfling:**
> You are Halfling. Your soul file has your full identity, batch assignment (10 gateway games), schema, process, and self-check list. Start with Catan and work through your batch in order. Save each completed game as {game_id}.json. Update your heartbeat after each game. Go.

**Elf:**
> You are Elf. Your soul file has your full identity, batch assignment (10 mid-weight strategy games), schema, process, and self-check list. Start with Wingspan and work through your batch in order. Save each completed game as {game_id}.json. Update your heartbeat after each game. Go.

**Dwarf:**
> You are Dwarf. Your soul file has your full identity, batch assignment (10 party/social games), schema, process, and self-check list. Start with Dixit and work through your batch in order. Save each completed game as {game_id}.json. Update your heartbeat after each game. Go.

**Human:**
> You are Human. Your soul file has your full identity, batch assignment (10 popular modern games), schema, process, and self-check list. Start with Betrayal at House on the Hill and work through your batch in order. Save each completed game as {game_id}.json. Update your heartbeat after each game. Go.

**Goblin:**
> You are Goblin. Your soul file has your full identity, batch assignment (10 heavy/complex games), schema, process, and self-check list. Start with Scythe and work through your batch in order. Save each completed game as {game_id}.json. Update your heartbeat after each game. Go.

**Paladin:**
> You are Paladin, QA Validator for GameMaster AI. Your soul file has your 12-point quality checklist, rejection protocol, and approval protocol. Review every game file the Rogues submit. Approve or reject with specific feedback. Target: 50 games reviewed by morning. Begin reviewing as soon as the first game files arrive. Go.

✅ **Verify after each deploy:** The agent is running and responsive. Check with:
```bash
openclaw agent list
openclaw agent status <agent-name>
```

#### STEP 3: Verify the swarm is running

After all 7 are deployed, confirm:
```bash
openclaw agent list
```

Should show 7 active agents: ranger, halfling, elf, dwarf, human, goblin, paladin.

Check that heartbeat files are being written to `D:\GameMasterAI\agents\heartbeat\` as Rogues start working. You may need to configure the agents' output directory so their files land in the right place.

✅ **Verify:** At least 1 Rogue has started producing output (a heartbeat file or a game JSON file).

#### STEP 4: Set up game file pipeline

The Rogues will produce `.json` game files. These need to end up in `D:\GameMasterAI\content\games\` for the app to serve them. 

Depending on how OpenClaw stores agent output, you may need to:
- Configure agents to write directly to `D:\GameMasterAI\content\games\`
- Or set up a copy/sync from the OpenClaw output directory to `D:\GameMasterAI\content\games\`
- Or write a simple script that watches for new files and copies them over

Once approved game files are in the games directory, reload them into the app:
```bash
curl -X POST http://localhost:8100/api/reload
```

Then verify:
```bash
curl http://localhost:8100/api/games
# Should show newly loaded games
```

#### STEP 5: Ongoing monitoring

While the swarm runs overnight:
- Periodically check `openclaw agent list` for any crashed agents — restart if needed
- Check the heartbeat dashboard at `http://localhost:8100/dashboard` — games should be moving from gray → yellow → blue → green
- Each time new approved games land in the content directory, run the reload endpoint
- Spot-check loaded games with a query:
```bash
curl -X POST http://localhost:8100/api/query \
  -H "Content-Type: application/json" \
  -d '{"game_id": "<new-game-id>", "question": "How do I set up this game?", "mode": "setup"}'
```

---

### Acceptance Criteria

- [ ] All 7 soul files saved to `D:\GameMasterAI\agents\souls\`
- [ ] All 7 agents deployed and running in OpenClaw
- [ ] `openclaw agent list` shows all 7 agents active
- [ ] At least 1 Rogue has produced a game file or heartbeat update
- [ ] Pipeline confirmed: approved game files can flow from agents → content/games/ → app reload → queryable in the API
- [ ] Dashboard starts reflecting agent activity (at least 1 game no longer gray)

---

### Report Back

Post your completion log with this format:

```
[GMAI-LOG] Agent Swarm Deployed — Content Production Active

Phase: 1 (Rogue Swarm Launch)
Status: Complete / Partial / Failed
Timestamp: [ISO timestamp]

AGENTS DEPLOYED:
- [list each agent and status]

WHAT WAS VERIFIED:
- [list each acceptance criterion and pass/fail]

PIPELINE STATUS:
- [how game files flow from agents to app]

FIRST CONTENT:
- [which games have been produced so far, if any]

ISSUES FOUND:
- [any problems, or "None"]

NEXT STEPS:
- Monitor swarm overnight
- Load approved games as they arrive
- Standing by for Phase 5 (final verification) once all 50 are loaded
```

---

### IMPORTANT NOTE

If the OpenClaw CLI doesn't support the exact commands above, explore what IS available. The goal is: 7 agents running with their soul files as instructions, producing .json game files that end up in the app's content directory. Adapt the approach to whatever OpenClaw's CLI supports — document what you did so we know the actual commands for next time.

If OpenClaw's agent system doesn't work the way we expect, STOP and report back. Don't force it — tell us what you found and we'll adapt.
