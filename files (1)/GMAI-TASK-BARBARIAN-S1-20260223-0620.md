# GMAI-TASK-BARBARIAN-S1-20260223-0620
## From: Bard (CoS)
## To: Barbarian (Field Engineer)
## Priority: HIGH — Critical path for rewrite sprint
## Depends On: Audit (complete), Schema v2.0 (finalized by Wizard)
## SUPERSEDES ALL PREVIOUS BARBARIAN TICKETS: PREP-S1-0600, PREP-S1-0615, PATCH-S1-0545, REWRITE-S1-0530

---

### Context

Wizard has finalized Schema v2.0. The game knowledge base format is changing from 5 flat text blobs to structured subtopics organized into 3 tabs (Setup, Rules, Strategy). This powers Tim's new tab-based UI where tabs 1–3 are pre-rendered reference content and tab 4 is the AI chatbot.

**This ticket has two parts:**
- **Part A:** Download and extract ALL 50 rulebook PDFs (prep for Rogue rewrite sprint)
- **Part B:** Update the backend and frontend to support Schema v2.0

Do Part A first (it's independent). Then Part B while PDFs extract.

---

## PART A: Download & Extract ALL 50 Rulebook PDFs

**ALL 50 games get rewritten from official rulebooks. No exceptions. Even the 6 that previously passed QA were written from training data.**

### A1: Download PDFs

```bash
mkdir -p /mnt/d/GameMasterAI/content/rulebooks
cd /mnt/d/GameMasterAI/content/rulebooks
```

**Halfling Batch — Gateway Games (1–10):**
```bash
# 1. Catan
curl -L -o catan.pdf "https://cdn.1j1ju.com/medias/7a/18/fd-catan-rulebook.pdf"

# 2. Ticket to Ride
curl -L -o ticket-to-ride.pdf "https://cdn.1j1ju.com/medias/2c/f9/7f-ticket-to-ride-rulebook.pdf"

# 3. Carcassonne
curl -L -o carcassonne.pdf "https://cdn.1j1ju.com/medias/9f/dd/e2-carcassonne-rulebook.pdf"
# Fallback: https://images.zmangames.com/filer_public/d5/20/d5208d61-8583-478b-a06d-b49fc9cd7a0a/zm7810_carcassonne_rules.pdf

# 4. Azul
curl -L -o azul.pdf "https://cdn.1j1ju.com/medias/03/14/fd-azul-rulebook.pdf"

# 5. Splendor
curl -L -o splendor.pdf "https://cdn.1j1ju.com/medias/7f/91/ba-splendor-rulebook.pdf"

# 6. Codenames
curl -L -o codenames.pdf "https://cdn.1j1ju.com/medias/89/5e/99-codenames-rule.pdf"

# 7. Kingdomino
curl -L -o kingdomino.pdf "https://cdn.1j1ju.com/medias/22/d4/b3-kingdomino-regle.pdf"
# NOTE: This may be French ("regle"). If French text, search "kingdomino rules pdf blue orange games english"

# 8. Sushi Go Party!
curl -L -o sushi-go-party.pdf "https://cdn.1j1ju.com/medias/f2/97/92-sushi-go-party-rulebook.pdf"

# 9. Patchwork
curl -L -o patchwork.pdf "https://cdn.1j1ju.com/medias/74/af/f2-patchwork-rulebook.pdf"

# 10. Century: Spice Road
curl -L -o century-spice-road.pdf "https://cdn.1j1ju.com/medias/29/b8/d5-century-spice-road-rulebook.pdf"
```

**Elf Batch — Mid-Weight Strategy (11–20):**
```bash
# 11. Wingspan
curl -L -o wingspan.pdf "https://cdn.1j1ju.com/medias/ff/16/4c-wingspan-rulebook.pdf"

# 12. 7 Wonders
curl -L -o seven-wonders.pdf "https://cdn.1j1ju.com/medias/c8/d6/88-7-wonders-rule.pdf"

# 13. Pandemic
curl -L -o pandemic.pdf "https://cdn.1j1ju.com/medias/c5/69/03-pandemic-rulebook.pdf"

# 14. Dominion
curl -L -o dominion.pdf "https://cdn.1j1ju.com/medias/59/e6/c2-dominion-rulebook.pdf"

# 15. Everdell
curl -L -o everdell.pdf "https://cdn.1j1ju.com/medias/c6/cd/89-everdell-rulebook.pdf"

# 16. Terraforming Mars
curl -L -o terraforming-mars.pdf "https://cdn.1j1ju.com/medias/13/3f/fb-terraforming-mars-rule.pdf"

# 17. Sagrada
curl -L -o sagrada.pdf "https://cdn.1j1ju.com/medias/ec/47/7d-sagrada-rulebook.pdf"

# 18. Above and Below
curl -L -o above-and-below.pdf "https://cdn.1j1ju.com/medias/9f/b0/4c-above-and-below-rulebook.pdf"

# 19. Lords of Waterdeep
curl -L -o lords-of-waterdeep.pdf "https://media.wizards.com/2017/dnd/downloads/Lords_of_Waterdeep_Rulebook.pdf"

# 20. Clank!
curl -L -o clank.pdf "https://cdn.1j1ju.com/medias/dc/cc/ae-clank-a-deck-building-adventure-rulebook.pdf"
```

**Dwarf Batch — Party & Social (21–30):**
```bash
# 21. Dixit
curl -L -o dixit.pdf "https://cdn.1j1ju.com/medias/8f/03/3d-dixit-rulebook.pdf"

# 22. Wavelength
curl -L -o wavelength.pdf "https://cdn.1j1ju.com/medias/wavelength-rulebook.pdf"
# If 404: Search "wavelength board game rules pdf"

# 23. Just One
curl -L -o just-one.pdf "https://cdn.1j1ju.com/medias/just-one-rulebook.pdf"
# If 404: Search "just one board game rules pdf repos production"

# 24. The Crew
curl -L -o the-crew.pdf "https://cdn.1j1ju.com/medias/the-crew-rulebook.pdf"
# If 404: Search "the crew quest for planet nine rules pdf kosmos"

# 25. Coup
curl -L -o coup.pdf "https://cdn.1j1ju.com/medias/coup-rulebook.pdf"
# If 404: Search "coup board game rules pdf indie boards and cards"

# 26. Love Letter
curl -L -o love-letter.pdf "https://cdn.1j1ju.com/medias/c0/d4/2b-love-letter-2019-rulebook.pdf"

# 27. Skull
curl -L -o skull.pdf "https://cdn.1j1ju.com/medias/eb/1e/99-skull-rulebook.pdf"

# 28. One Night Ultimate Werewolf
curl -L -o one-night-ultimate-werewolf.pdf "https://cdn.1j1ju.com/medias/0d/2e/7b-one-night-ultimate-werewolf-rulebook.pdf"

# 29. Telestrations
curl -L -o telestrations.pdf "https://cdn.1j1ju.com/medias/telestrations-rulebook.pdf"
# If 404: Search "telestrations rules pdf usaopoly"

# 30. Decrypto
curl -L -o decrypto.pdf "https://cdn.1j1ju.com/medias/fb/0d/f3-decrypto-rulebook.pdf"
```

**Human Batch — Popular Modern (31–40):**
```bash
# 31. Betrayal at House on the Hill
curl -L -o betrayal-at-house-on-the-hill.pdf "https://instructions.hasbro.com/api/download/F4541_en-ca_avalon-hill-betrayal-at-house-on-the-hill-3rd-edition-cooperative-board-game-for-ages-12-and-up-for-3-6-players.pdf"
# Fallback: http://boardgame.bg/betrayal%20at%20house%20on%20the%20hill%20rules.pdf

# 32. Mysterium
curl -L -o mysterium.pdf "https://cdn.1j1ju.com/medias/ae/89/37-mysterium-rulebook.pdf"

# 33. Villainous
curl -L -o villainous.pdf "https://cdn.1j1ju.com/medias/disney-villainous-rulebook.pdf"
# If 404: Search "disney villainous rules pdf ravensburger"

# 34. Photosynthesis
curl -L -o photosynthesis.pdf "https://cdn.1j1ju.com/medias/photosynthesis-rulebook.pdf"
# If 404: Search "photosynthesis board game rules pdf blue orange"

# 35. Takenoko
curl -L -o takenoko.pdf "https://cdn.1j1ju.com/medias/d8/1c/c5-takenoko-rulebook.pdf"

# 36. Sheriff of Nottingham
curl -L -o sheriff-of-nottingham.pdf "https://cdn.1j1ju.com/medias/d3/7f/61-sheriff-of-nottingham-rulebook.pdf"

# 37. Dead of Winter
curl -L -o dead-of-winter.pdf "https://cdn.1j1ju.com/medias/b8/42/26-dead-of-winter-a-crossroads-game-rulebook.pdf"

# 38. Cosmic Encounter
curl -L -o cosmic-encounter.pdf "https://cdn.1j1ju.com/medias/cosmic-encounter-rulebook.pdf"
# If 404: Search "cosmic encounter rules pdf fantasy flight games"

# 39. King of Tokyo
curl -L -o king-of-tokyo.pdf "https://cdn.1j1ju.com/medias/f9/2f/9b-king-of-tokyo-rulebook.pdf"

# 40. Quacks of Quedlinburg
curl -L -o quacks-of-quedlinburg.pdf "https://cdn.1j1ju.com/medias/ba/73/db-the-quacks-of-quedlinburg-rulebook.pdf"
```

**Goblin Batch — Heavy & Complex (41–50):**
```bash
# 41. Scythe
curl -L -o scythe.pdf "https://cdn.1j1ju.com/medias/68/bc/6c-scythe-rulebook.pdf"

# 42. Spirit Island
curl -L -o spirit-island.pdf "https://cdn.1j1ju.com/medias/87/39/54-spirit-island-rulebook.pdf"

# 43. Brass: Birmingham
curl -L -o brass-birmingham.pdf "https://cdn.1j1ju.com/medias/60/39/64-brass-birmingham-rulebook.pdf"
# Also: http://files.roxley.com/Brass-Birmingham-Rulebook-2018.11.20-highlights.pdf

# 44. Root
curl -L -o root.pdf "https://cdn.1j1ju.com/medias/a9/11/8f-low-of-root.pdf"

# 45. Agricola
curl -L -o agricola.pdf "https://cdn.1j1ju.com/medias/dd/16/f5-agricola-rulebook.pdf"

# 46. Concordia
curl -L -o concordia.pdf "https://cdn.1j1ju.com/medias/4c/79/a6-concordia-rulebook.pdf"

# 47. Great Western Trail
curl -L -o great-western-trail.pdf "https://cdn.1j1ju.com/medias/10/1c/e0-great-western-trail-rulebook.pdf"

# 48. Viticulture
curl -L -o viticulture.pdf "https://cdn.1j1ju.com/medias/9f/c0/a5-viticulture-essential-edition-rulebook.pdf"

# 49. Castles of Burgundy
curl -L -o castles-of-burgundy.pdf "https://cdn.1j1ju.com/medias/04/f5/f9-the-castles-of-burgundy-rulebook.pdf"

# 50. Power Grid
curl -L -o power-grid.pdf "https://cdn.1j1ju.com/medias/power-grid-rulebook.pdf"
# If 404: Search "power grid board game rules pdf rio grande games"
```

**Verify all 50:**
```bash
ls -la *.pdf | wc -l   # Must be 50
find . -name "*.pdf" -size 0   # Must return nothing
```

For ANY file that fails or is 0 bytes, search `https://en.1jour-1jeu.com/` for the game name or use the noted fallback.

### A2: Extract Text from ALL 50 PDFs

```bash
mkdir -p /mnt/d/GameMasterAI/content/rulebook-text/

sudo apt install poppler-utils
pip install pdfminer.six

for pdf in /mnt/d/GameMasterAI/content/rulebooks/*.pdf; do
    basename=$(basename "$pdf" .pdf)
    pdftotext "$pdf" "/mnt/d/GameMasterAI/content/rulebook-text/${basename}.txt" 2>/dev/null
    if [ ! -s "/mnt/d/GameMasterAI/content/rulebook-text/${basename}.txt" ]; then
        python3 -c "
from pdfminer.high_level import extract_text
text = extract_text('$pdf')
with open('/mnt/d/GameMasterAI/content/rulebook-text/${basename}.txt', 'w') as f:
    f.write(text)
"
    fi
done
```

**Verify all 50 extracted:**
```bash
ls -la /mnt/d/GameMasterAI/content/rulebook-text/*.txt | wc -l   # Must be 50
find /mnt/d/GameMasterAI/content/rulebook-text/ -name "*.txt" -size 0   # Must return nothing
wc -c /mnt/d/GameMasterAI/content/rulebook-text/*.txt | sort -n   # Character count summary
```

### A3: Deploy Template

Copy the attached `_template.json` to `D:\GameMasterAI\content\games\_template.json`, replacing the old v1.0 template.

---

## PART B: Backend & Frontend Updates for Schema v2.0

### B1: Update `knowledge.py` — New Loader + LLM Flattener

Replace the existing knowledge base loader. The new loader reads `tabs.{tab}.subtopics` instead of `sections`.

**New flattening function for LLM context (Q&A tab):**

The backend must flatten all subtopics into a single Markdown string for the system prompt. Algorithm:

```
For each tab in [setup, rules, strategy]:
    Emit "## {Tab Display Name}"
    For each subtopic in tab.subtopics:
        Emit "### {subtopic.title}"
        Emit subtopic.content
        Emit blank line
```

**Tab name mapping:**
- `setup` → `"Setup"`
- `rules` → `"Rules"`
- `strategy` → `"Strategy"`

**Example output (abbreviated):**
```markdown
## Setup

### What's in the Box
19 terrain hexes (4 forest, 4 pasture, 4 fields...)

### Board Layout
1. Arrange the 6 sea frame pieces...

### Player Setup
Each player takes: 5 settlements, 4 cities, 15 roads...

### Starting the Game
Starting with a random first player...

## Rules

### Turn Structure
On your turn: 1) Roll dice, 2) Trade, 3) Build.

### Actions & Options
...

### Endgame & Scoring
First player to 10 VP on their turn wins...

## Strategy

### Opening Priorities
Prioritize high-probability numbers (6, 8, 5, 9)...

### Common Mistakes
Don't hoard cards past 7...

### Key Decisions
Cities vs. expansion...
```

This flattened Markdown becomes the `{KNOWLEDGE BASE}` block in the LLM system prompt. The Markdown headers help the model navigate to relevant sections faster — this is an improvement over the old flat text.

**Delete all v1.0 `sections`-based loader code.** No backward compatibility. No format detection. v2.0 only.

### B2: Update API Endpoints

**`/api/games` (list endpoint):**
- Return: game_id, title, complexity, player_count, categories
- Do NOT include full tab content in the list response (too heavy)

**`/api/games/{game_id}` (detail endpoint — NEW):**
- Return the FULL game JSON including all `tabs` data
- The frontend needs this to render the accordion UI for tabs 1–3
- If game_id not found, return 404

**`/api/query` (LLM query endpoint):**
- Load game JSON → flatten tabs into Markdown using the algorithm above → inject into system prompt → send to ClawProxy
- Remove the `mode` parameter entirely. The old mode switcher is dead. The system prompt no longer changes per mode.

### B3: Update LLM System Prompt

Replace the existing system prompt with:

```
You are GameMaster AI, a friendly and knowledgeable board game teacher
working at a board game cafe. You are currently teaching {game_title}.

Use ONLY the knowledge base below to answer questions. The knowledge base is
organized into Setup, Rules, and Strategy sections with labeled subtopics.
If the knowledge base does not contain the answer, say "I'm not sure about
that specific rule — you may want to check the rulebook for {game_title}."
NEVER invent or guess at rules.

Be concise. Players are at a table with the game in front of them — they
need quick, clear answers, not essays.

KNOWLEDGE BASE:
{flattened markdown from all tabs}
```

**Key change:** No more `mode` parameter. Tabs 1–3 handle setup/rules/strategy as pre-rendered content. The LLM is only invoked for Q&A, which is always "answer the question accurately and concisely."

### B4: Update Frontend — Tab-Based UI

Replace the current single-chatbot screen with a 4-tab layout:

**Tab 1 — Setup:**
- Fetch `/api/games/{game_id}` on game select
- Render `tabs.setup.subtopics` as an expandable accordion
- Each subtopic: title shown collapsed, tap to expand and show content
- No AI call needed — instant load from the JSON

**Tab 2 — Rules:**
- Same pattern: render `tabs.rules.subtopics` as accordion
- Instant load, no AI

**Tab 3 — Strategy:**
- Same pattern: render `tabs.strategy.subtopics` as accordion
- Instant load, no AI

**Tab 4 — Q&A:**
- This is where the chatbot lives
- Voice input (mic button) + text input
- Sends question to `/api/query` with game_id
- Displays response as text + speaks via SpeechSynthesis
- Conversation history for current session

**TTS fix (from the old patch — still valid):**
Strip markdown formatting from text before passing to SpeechSynthesis. The LLM may return `**bold**` or `*italic*` — the user should see the formatting on screen but NOT hear "asterisk asterisk" spoken aloud.

```javascript
function stripMarkdownForSpeech(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')  // bold
    .replace(/\*(.+?)\*/g, '$1')       // italic
    .replace(/__(.+?)__/g, '$1')       // bold alt
    .replace(/_(.+?)_/g, '$1')         // italic alt
    .replace(/#+\s*/g, '')             // headers
    .replace(/`(.+?)`/g, '$1')        // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .trim();
}
```

### B5: Update Dashboard

The heartbeat dashboard should still show 50 games in a grid. No changes to the dashboard layout needed, but ensure it reads the new `metadata.schema_version` field if displaying version info.

### B6: Git Commit Strategy

1. **Commit 1:** PDF downloads + text extractions + new _template.json (Part A)
2. **Commit 2:** Backend changes — knowledge.py, API endpoints, system prompt (Part B1–B3)
3. **Commit 3:** Frontend changes — tab UI, TTS fix (Part B4)
4. **Commit 4:** Verification passing (Part B5)

Commit after each step. Verify between each. Roll back if anything breaks.

---

## What NOT to Do

- ❌ Do NOT launch the Rogue rewrite sprint — that's Ranger's job, separate ticket coming
- ❌ Do NOT edit any game JSON content files — Rogues own content
- ❌ Do NOT support v1.0 schema format — delete the old code, v2.0 only
- ❌ Do NOT add backward compatibility or format detection

---

## Acceptance Criteria

### Part A — PDF Prep
1. ✅ ALL 50 rulebook PDFs downloaded to `D:\GameMasterAI\content\rulebooks\`
2. ✅ ALL 50 text extractions in `D:\GameMasterAI\content\rulebook-text\`
3. ✅ New `_template.json` (v2.0) deployed to `D:\GameMasterAI\content\games\_template.json`
4. ✅ Report: per-game PDF status, file sizes, extracted text character counts

### Part B — Schema v2.0 Implementation
5. ✅ `knowledge.py` reads `tabs.{tab}.subtopics` and flattens to Markdown for LLM
6. ✅ `/api/games` returns game list (without full tab content)
7. ✅ `/api/games/{game_id}` returns full game JSON with tabs
8. ✅ `/api/query` uses new system prompt, no mode parameter
9. ✅ Frontend shows 4 tabs: Setup (accordion), Rules (accordion), Strategy (accordion), Q&A (chatbot)
10. ✅ TTS strips markdown before speaking
11. ✅ Old v1.0 schema code deleted
12. ✅ All git commits made per B6 schedule

### Verification Tests
13. ✅ `curl localhost:8100/health` returns OK
14. ✅ `curl localhost:8100/api/games` returns game list
15. ✅ `curl localhost:8100/api/games/catan` returns full v2.0 JSON (will 404 until Rogues deliver new content — that's expected)
16. ✅ Frontend loads at `localhost:3100`, shows 4-tab layout
17. ✅ Q&A tab: ask a question, get a spoken answer without asterisks in speech

**NOTE:** The app will show empty/broken accordion tabs until the Rogues deliver v2.0 content. That's expected and correct. The infrastructure must be ready BEFORE content arrives.

---

## Report Back

**Email 1:** `[GMAI-LOG] Part A Complete — 50 PDFs downloaded and extracted`
**Email 2:** `[GMAI-LOG] Part B Complete — Schema v2.0 backend + frontend live`

---

## Attached Files

The `_template.json` file is included with this ticket. Deploy it to `D:\GameMasterAI\content\games\_template.json`.

---

*End of task.*
