# GAMEMASTER GUIDE — Mobile Game Addition Workflow
## "Text Tim, Get a Game"
## Last Updated: March 14, 2026

---

## WHAT THIS IS

A workflow for adding new game guides to the GMG platform from Tim's phone. Tim sends a plain-English request to Bard, Bard generates a single Barbarian prompt, Tim pastes it into Claude Code (remote), and walks away. Barbarian handles everything autonomously — rulebook sourcing, strategy research, content creation, deployment, and Telegram notification when done.

**Total Tim effort:** ~2 minutes (describe what you want → paste prompt → done)

---

## THE FLOW

```
Tim (phone) → Bard (Claude.ai)
  "Add Obsession with Upstairs/Downstairs expansion"

Bard → generates Barbarian mega-prompt

Tim → pastes into Claude Code (remote on phone)
  cd D:\GameMasterAI
  claude --dangerously-skip-permissions
  [paste]

Barbarian runs autonomously (~20-40 min):
  1. Reads content standard from repo
  2. Studies Wingspan gold standard
  3. Finds rulebook PDFs (publisher sites, 1j1ju, ultraboardgames)
  4. Researches strategies (Reddit, blogs, forums)
  5. Creates game JSON (content/games/)
  6. Creates teaching JSON (content/teaching/)
  7. Creates score config (content/scores/)
  8. Handles cover art
  9. Commits, pushes, forces redeploy
  10. Verifies deploy
  11. Sends Telegram to Tim: "✅ [Game Title] is live on playgmg.com"

Tim gets Telegram ping → opens the game → uses it at the table
```

---

## BARD'S JOB: CONVERT REQUEST TO PROMPT

When Tim says something like "Add Obsession with Upstairs/Downstairs expansion," Bard fills in the template at `agents/standards/GMG-BARBARIAN-GAME-PROMPT-TEMPLATE.md` with:

| Field | Example |
|-------|---------|
| GAME_TITLE | Obsession: Upstairs, Downstairs Edition |
| GAME_ID | obsession-upstairs-downstairs |
| PUBLISHER | Kayenta Games |
| PUBLISHER_TAG | kayenta |
| PUBLISHER_APPROVED | false (unless Tim confirms permission) |
| COMPLEXITY | midweight |
| SPECIAL_INSTRUCTIONS | Include all expansions: Upstairs Downstairs, Useful Box. Preserve the base game guide at obsession.json if it exists. |
| RULEBOOK_HINTS | Publisher site: kayenta.games/obsession. Check for expansion rulebooks separately. |
| STRATEGY_HINTS | Reddit r/boardgames, BGG strategy forums. Key topics: servant management, reputation vs prestige, expansion module interactions. |

Bard outputs the filled prompt as a single code block Tim can paste.

---

## RULEBOOK SOURCING PRIORITY (No BGG Downloads)

BGG blocks automated access. Barbarian uses these sources in order:

1. **Local files first** — Check `D:\GameMasterAI\{Game Name}\` for publisher-provided PDFs
2. **Publisher website** — Most publishers host rules PDFs directly
3. **1j1ju.com** — Large rulebook archive: `https://cdn.1j1ju.com/medias/{game-slug}-rulebook.pdf`
4. **Ultraboardgames.com** — Text-based rules summaries
5. **Official retailer pages** — Some host PDFs (e.g., Asmodee, Z-Man)
6. **Web search** — `"{game title}" official rules PDF filetype:pdf`

If no PDF can be found, Barbarian uses web-scraped text rules from ultraboardgames + publisher FAQ pages. The guide must still be accurate — every rule must be verifiable against at least one official source.

---

## STRATEGY RESEARCH SOURCES

1. **Reddit** — `site:reddit.com "{game title}" strategy tips` or `site:reddit.com r/boardgames "{game title}"`
2. **BGG forums** — Web search: `site:boardgamegeek.com "{game title}" strategy` (read via web, don't use API)
3. **Blog posts** — `"{game title}" strategy guide` or `"{game title}" tips beginners`
4. **YouTube transcripts** — Search for strategy videos, extract key advice

Target: 3-5 concrete strategy insights with specific card/component names.

---

## EDITION/EXPANSION HANDLING

When Tim requests a specific edition or expansion:

1. **Check if base game exists** — `content/games/{base-game-id}.json`
2. **If base exists, preserve it** — Create a NEW file with edition suffix: `{base-game-id}-{edition}.json`
3. **If base doesn't exist** — Create the requested version as the primary file
4. **Teaching file follows same pattern** — `content/teaching/{game-id}.json`
5. **Cross-reference** — Add the base game to `aliases` if relevant

Example: Base game `obsession.json` stays untouched. New file `obsession-upstairs-downstairs.json` covers all expansion content.

---

## TELEGRAM NOTIFICATION

Barbarian sends a Telegram message when the game is deployed and verified:

```bash
curl -s -X POST "https://api.telegram.org/bot8535000205:AAEf2rJhVD89Qzx08Jxmalxu41PuQ1fpwR4/sendMessage" \
  -d chat_id=6236947695 \
  -d parse_mode=Markdown \
  -d text="✅ *{GAME_TITLE}* is live on playgmg.com

📋 Setup: {N} steps | Rules: {N} steps | Strategy: {N} steps
📚 Appendix: {N} entries
🎯 Deploy verified: commit {HASH}, {TOTAL} games loaded

Open it: https://playgmg.com (search for {GAME_TITLE})"
```

If deployment FAILS, Barbarian sends:

```bash
curl -s -X POST "https://api.telegram.org/bot8535000205:AAEf2rJhVD89Qzx08Jxmalxu41PuQ1fpwR4/sendMessage" \
  -d chat_id=6236947695 \
  -d parse_mode=Markdown \
  -d text="❌ *{GAME_TITLE}* deploy FAILED

Error: {description of what went wrong}
Files created but not live. Manual intervention needed."
```

---

## WHAT TIM TELLS BARD

Tim's request can be as simple as:

- "Add Obsession with the Upstairs/Downstairs expansion"
- "Rules for Brass Birmingham"
- "Add Ark Nova — it's a heavy game, make sure the practice tutorial is detailed"
- "Quick guide for Sushi Go Party — gateway, keep it short"
- "Add Cascadia — publisher approved, I have permission from Flatout Games"

Bard extracts: game title, game ID, complexity estimate, publisher approval status, any special instructions, and generates the prompt.

---

## QUALITY GATE

Barbarian self-validates against the Content Standard v3.0 checklist before pushing. If any check fails, Barbarian fixes it (up to 5 iterations). The quality gate is built into the prompt template.

If Barbarian cannot find a rulebook or cannot verify rules accuracy, it sends a Telegram asking Tim instead of guessing:

```
⚠️ Cannot find official rules for {GAME_TITLE}.
Checked: publisher site, 1j1ju, ultraboardgames, web search.
Options:
1. Provide a rulebook PDF path on K2-PC
2. Skip this game
```

---

*This workflow turns "I want this game" into a 2-minute phone interaction. Everything else is automated.*
