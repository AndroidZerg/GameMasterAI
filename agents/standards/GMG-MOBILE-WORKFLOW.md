# GAMEMASTER GUIDE — Mobile Game Addition Workflow
## "Text Tim, Get a Game"
## Last Updated: March 14, 2026

---

## WHAT THIS IS

A workflow for adding new game guides to the GMG platform entirely from Tim's phone. Tim sends a plain-English request to Bard (Claude.ai), Bard generates a single Barbarian prompt, Tim pastes it into Claude Code via Remote Control on the Claude app, and walks away. Barbarian handles everything autonomously — rulebook sourcing, strategy research, content creation, deployment, and Telegram notification when done.

**Total Tim effort:** ~2 minutes (describe what you want → copy prompt → paste in Claude app → done)

**No physical access to K2-PC required.** Everything runs through Remote Control.

---

## ONE-TIME SETUP (Already Done)

On K2-PC, a persistent Claude Code session runs with Remote Control enabled:

```powershell
cd D:\GameMasterAI
claude --dangerously-skip-permissions
/rc
```

This session stays alive as long as K2-PC is on and Claude Code is running. Tim connects to it from the Claude app on his phone (Code tab → "GMG Game Builder" or whatever the session is named).

**If the session dies** (K2-PC restart, terminal closed, etc.), someone needs to physically restart it on K2-PC, or Tim can do it via remote desktop. Then `/rc` again to re-enable phone access.

**Recommended:** Run inside tmux so the session survives terminal disconnects:
```powershell
tmux new -s gmg
cd D:\GameMasterAI
claude --dangerously-skip-permissions
/rc
# Detach with Ctrl+B, D if needed — session persists
```

---

## THE FLOW

```
1. Tim opens Claude.ai on phone (this Bard conversation)
   "Add Obsession with Upstairs/Downstairs expansion"

2. Bard generates Barbarian mega-prompt (copy-ready)

3. Tim switches to Claude app → Code tab → taps the active session
   Pastes the prompt directly into Remote Control

4. Barbarian runs autonomously on K2-PC (~20-40 min):
   - Reads content standard + Wingspan gold standard from repo
   - Finds rulebook (publisher sites, 1j1ju, ultraboardgames)
   - Researches strategy (Reddit, BGG forums, blogs)
   - Creates game JSON (content/games/) with subtopics
   - Creates teaching JSON (content/teaching/) with walkthrough/summary
   - Creates score config (content/scores/)
   - Handles cover art
   - Self-validates against 25-point quality checklist
   - Commits, pushes, forces redeploy
   - Verifies deploy via /health and /api/v1/deploy-status
   - Sends Telegram to Tim

5. Tim gets Telegram: "✅ Obsession is live on playgmg.com"
   Opens the game in the app → uses it at the table
```

---

## WHAT TIM TELLS BARD

Tim's request can be as simple as:

- "Add Obsession with the Upstairs/Downstairs expansion"
- "Rules for Brass Birmingham"
- "Add Ark Nova — it's a heavy game"
- "Quick guide for Sushi Go Party"
- "Add Cascadia — publisher approved, I have permission from Flatout Games"

Bard extracts: game title, game ID, complexity, publisher info, any special instructions. Then fills in the prompt template at `agents/standards/GMG-BARBARIAN-GAME-PROMPT-TEMPLATE.md` and outputs the complete prompt as a single code block Tim can copy.

---

## RULEBOOK SOURCING PRIORITY (No BGG Downloads)

BGG blocks automated access. Barbarian uses these sources in order:

1. **Local files first** — Check `D:\GameMasterAI\{Game Name}\` for publisher-provided PDFs
2. **Publisher website** — Most publishers host rules PDFs directly
3. **1j1ju.com** — Large rulebook archive: `https://cdn.1j1ju.com/medias/{game-slug}-rulebook.pdf`
4. **Ultraboardgames.com** — Text-based rules summaries
5. **Web search** — `"{game title}" official rules PDF filetype:pdf`

If no rulebook found, Barbarian sends a Telegram asking Tim for a PDF path instead of guessing.

---

## EDITION/EXPANSION HANDLING

When Tim requests a specific edition or expansion:

1. **Check if base game exists** — `content/games/{base-game-id}.json`
2. **If base exists, preserve it** — Create a NEW file with edition suffix
3. **If base doesn't exist** — Create the requested version as the primary file
4. **Teaching file follows same pattern** — `content/teaching/{game-id}.json`

---

## TELEGRAM NOTIFICATIONS

**Success:**
```
✅ *Obsession* is live on playgmg.com

📋 Setup: 12 steps | Rules: 18 steps | Strategy: 8 steps
📚 Appendix: 35 entries
🎯 Deploy verified: commit abc1234, 310 games loaded
```

**Failure:**
```
❌ *Obsession* deploy FAILED

Error: Could not find official rulebook
Files created but not live. Manual intervention needed.
```

**Blocker (needs Tim's input):**
```
⚠️ Cannot find official rules for *Obsession*
Checked: publisher site, 1j1ju, ultraboardgames, web search.
Need a rulebook PDF path on K2-PC or a URL to proceed.
```

---

## QUALITY GATE

Barbarian self-validates against the Content Standard v3.0 checklist (25 checks) before pushing. Key checks:

- Both files exist (game JSON + teaching JSON)
- Game JSON uses `subtopics` (not `sections`, no `label` keys)
- Teaching JSON has `setup`, `rules`, `strategy` with matching walkthrough/summary step counts
- Walkthrough text is Wingspan voice (conversational, TTS-friendly)
- Rules citations use `rulings` key with 5+ entries
- Valid JSON on all files
- No invented rules

If any check fails, Barbarian fixes it (up to 5 iterations) before pushing.

---

## REMOTE CONTROL TIPS

- **Session stays alive** as long as K2-PC is awake and terminal is open
- **Auto-reconnect:** If your phone loses connection, just reopen the session in the Claude app — it reconnects
- **10-minute timeout:** If K2-PC loses internet for ~10 min, the session dies. Restart with `/rc`
- **Multiple games:** Paste one prompt at a time. Wait for the Telegram "done" notification before pasting the next
- **Monitoring:** You can watch Barbarian work in real-time from the Claude app, but you don't need to — the Telegram ping is your signal
- **If session crashes:** On K2-PC, reopen terminal → `tmux attach -t gmg` (or start fresh) → `cd D:\GameMasterAI` → `claude --dangerously-skip-permissions` → `/rc`

---

*This workflow turns "I want this game" into a 2-minute phone interaction. Everything else is automated.*
