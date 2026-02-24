# GMAI-TASK-BARBARIAN-REWRITE-S1-20260223-0530
## From: Bard (CoS)
## To: Barbarian (Field Engineer)
## Priority: HIGH — Blocks all venue demos
## Depends On: Phase 0 infra (complete), Audit (complete)

---

### Context

The content audit confirmed that 44 out of 50 game knowledge bases are below quality. The Rogues wrote from training data, not actual rulebooks. We need to rewrite all 44 using official rulebook PDFs as source material.

**This document contains:**
1. Verified rulebook PDF URLs for all 44 games
2. Instructions for downloading all PDFs to K2-PC
3. Instructions for re-deploying the Rogue swarm with real source material
4. Updated Rogue soul file template with rulebook-first instructions

**The 6 games that DO NOT need rewriting** (already pass quality bar):
- above-and-below (2,140 tokens — rulebook-verified by Bard)
- azul (1,005 tokens — Halfling)
- codenames (1,005 tokens — Halfling)
- kingdomino (1,005 tokens — Halfling)
- scythe (1,625 tokens — Goblin)
- sushi-go-party (1,005 tokens — Halfling)

---

### STEP 1: Download All Rulebook PDFs

Create directory: `D:\GameMasterAI\content\rulebooks\`

Download every PDF below. Use `curl` or `wget` in WSL2. If a URL returns 403/404, try the fallback URL. If both fail, note it — Bard will find an alternative.

**PRIMARY SOURCE: cdn.1j1ju.com** (1jour-1jeu.com — massive free rulebook archive)

```
# ============================================
# HALFLING BATCH (Gateway Games) — 5 need rewrite
# ============================================

# Catan (263 tokens — way too thin)
curl -L -o catan.pdf "https://cdn.1j1ju.com/medias/7a/18/fd-catan-rulebook.pdf"

# Ticket to Ride (1005 tokens but need verification)
curl -L -o ticket-to-ride.pdf "https://cdn.1j1ju.com/medias/2c/f9/7f-ticket-to-ride-rulebook.pdf"

# Carcassonne (1005 tokens but source URL was 404)
# FALLBACK: Try Z-Man Games site or search "carcassonne rulebook pdf site:cdn.1j1ju.com"
curl -L -o carcassonne.pdf "https://cdn.1j1ju.com/medias/9f/dd/e2-carcassonne-rulebook.pdf"
# If that 404s, try: https://images.zmangames.com/filer_public/d5/20/d5208d61-8583-478b-a06d-b49fc9cd7a0a/zm7810_carcassonne_rules.pdf

# Splendor (1005 tokens but need verification)
curl -L -o splendor.pdf "https://cdn.1j1ju.com/medias/7f/91/ba-splendor-rulebook.pdf"

# Patchwork (1005 tokens but need verification)
curl -L -o patchwork.pdf "https://cdn.1j1ju.com/medias/74/af/f2-patchwork-rulebook.pdf"

# Century Spice Road (1005 tokens but need verification)
# Note: French version on 1j1ju. Try English:
curl -L -o century-spice-road.pdf "https://cdn.1j1ju.com/medias/29/b8/d5-century-spice-road-rulebook.pdf"
# Fallback: https://www.planbgames.com search for rules PDF


# ============================================
# ELF BATCH (Mid-Weight Strategy) — 10 need rewrite
# ============================================

# Wingspan (647 tokens — too thin for this complexity)
curl -L -o wingspan.pdf "https://cdn.1j1ju.com/medias/ff/16/4c-wingspan-rulebook.pdf"

# 7 Wonders (503 tokens — too thin)
curl -L -o seven-wonders.pdf "https://cdn.1j1ju.com/medias/c8/d6/88-7-wonders-rule.pdf"

# Pandemic (458 tokens — too thin)
curl -L -o pandemic.pdf "https://cdn.1j1ju.com/medias/c5/69/03-pandemic-rulebook.pdf"

# Dominion (423 tokens — too thin)
curl -L -o dominion.pdf "https://cdn.1j1ju.com/medias/59/e6/c2-dominion-rulebook.pdf"

# Everdell (452 tokens — too thin)
curl -L -o everdell.pdf "https://cdn.1j1ju.com/medias/c6/cd/89-everdell-rulebook.pdf"

# Terraforming Mars (425 tokens — too thin)
curl -L -o terraforming-mars.pdf "https://cdn.1j1ju.com/medias/13/3f/fb-terraforming-mars-rule.pdf"

# Sagrada (402 tokens — too thin)
curl -L -o sagrada.pdf "https://cdn.1j1ju.com/medias/ec/47/7d-sagrada-rulebook.pdf"

# Above and Below — SKIP (already rewritten by Bard)

# Lords of Waterdeep (390 tokens — too thin)
# Not found on 1j1ju. Try publisher:
curl -L -o lords-of-waterdeep.pdf "https://media.wizards.com/2017/dnd/downloads/Lords_of_Waterdeep_Rulebook.pdf"
# Fallback: Search "lords of waterdeep rulebook pdf"

# Clank! (412 tokens — too thin)
curl -L -o clank.pdf "https://cdn.1j1ju.com/medias/dc/cc/ae-clank-a-deck-building-adventure-rulebook.pdf"


# ============================================
# DWARF BATCH (Party & Social) — 10 need rewrite
# ============================================

# Dixit (543 tokens — thin for teaching)
curl -L -o dixit.pdf "https://cdn.1j1ju.com/medias/8f/03/3d-dixit-rulebook.pdf"

# Wavelength (484 tokens — too thin)
# Not found on 1j1ju. Try publisher:
curl -L -o wavelength.pdf "https://cdn.1j1ju.com/medias/wavelength-rulebook.pdf"
# Fallback: https://www.cmyk.games/products/wavelength — check for rules PDF link

# Just One (443 tokens — too thin)
# Not found on 1j1ju. Try:
curl -L -o just-one.pdf "https://cdn.1j1ju.com/medias/just-one-rulebook.pdf"
# Fallback: Search "just one board game rulebook pdf"

# The Crew (457 tokens — too thin)
# Not found on 1j1ju. Try Kosmos:
curl -L -o the-crew.pdf "https://cdn.1j1ju.com/medias/the-crew-rulebook.pdf"
# Fallback: https://www.kosmos.de search for rules PDF

# Coup (445 tokens — too thin)
# Not found on 1j1ju. Try publisher:
curl -L -o coup.pdf "https://cdn.1j1ju.com/medias/coup-rulebook.pdf"
# Fallback: Search "coup board game rulebook pdf indie boards and cards"

# Love Letter (451 tokens — too thin)
curl -L -o love-letter.pdf "https://cdn.1j1ju.com/medias/c0/d4/2b-love-letter-2019-rulebook.pdf"

# Skull (454 tokens — too thin)
curl -L -o skull.pdf "https://cdn.1j1ju.com/medias/eb/1e/99-skull-rulebook.pdf"

# One Night Ultimate Werewolf (443 tokens — too thin)
curl -L -o one-night-ultimate-werewolf.pdf "https://cdn.1j1ju.com/medias/0d/2e/7b-one-night-ultimate-werewolf-rulebook.pdf"

# Telestrations (426 tokens — too thin)
# Not found on 1j1ju. Try publisher:
curl -L -o telestrations.pdf "https://cdn.1j1ju.com/medias/telestrations-rulebook.pdf"
# Fallback: Search "telestrations rulebook pdf theop games"

# Decrypto (440 tokens — too thin)
curl -L -o decrypto.pdf "https://cdn.1j1ju.com/medias/fb/0d/f3-decrypto-rulebook.pdf"


# ============================================
# HUMAN BATCH (Popular Modern) — 10 need rewrite
# ============================================

# Betrayal at House on the Hill (527 tokens — too thin for 50 haunts)
curl -L -o betrayal-at-house-on-the-hill.pdf "https://instructions.hasbro.com/api/download/F4541_en-ca_avalon-hill-betrayal-at-house-on-the-hill-3rd-edition-cooperative-board-game-for-ages-12-and-up-for-3-6-players.pdf"
# Fallback: http://boardgame.bg/betrayal%20at%20house%20on%20the%20hill%20rules.pdf

# Mysterium (443 tokens — too thin)
curl -L -o mysterium.pdf "https://cdn.1j1ju.com/medias/ae/89/37-mysterium-rulebook.pdf"

# Villainous (416 tokens — too thin)
# Not found on 1j1ju base game. Try:
curl -L -o villainous.pdf "https://cdn.1j1ju.com/medias/disney-villainous-rulebook.pdf"
# Fallback: Search "disney villainous rulebook pdf ravensburger"

# Photosynthesis (407 tokens — too thin)
# Not found on 1j1ju. Try publisher:
curl -L -o photosynthesis.pdf "https://cdn.1j1ju.com/medias/photosynthesis-rulebook.pdf"
# Fallback: https://www.blueorangegames.com search for rules PDF

# Takenoko (392 tokens — too thin)
curl -L -o takenoko.pdf "https://cdn.1j1ju.com/medias/d8/1c/c5-takenoko-rulebook.pdf"

# Sheriff of Nottingham (369 tokens — too thin)
curl -L -o sheriff-of-nottingham.pdf "https://cdn.1j1ju.com/medias/d3/7f/61-sheriff-of-nottingham-rulebook.pdf"

# Dead of Winter (444 tokens — too thin)
curl -L -o dead-of-winter.pdf "https://cdn.1j1ju.com/medias/b8/42/26-dead-of-winter-a-crossroads-game-rulebook.pdf"

# Cosmic Encounter (407 tokens — too thin)
# Not found on 1j1ju. Try FFG:
curl -L -o cosmic-encounter.pdf "https://cdn.1j1ju.com/medias/cosmic-encounter-rulebook.pdf"
# Fallback: Search "cosmic encounter rulebook pdf fantasy flight games"

# King of Tokyo (397 tokens — too thin)
curl -L -o king-of-tokyo.pdf "https://cdn.1j1ju.com/medias/f9/2f/9b-king-of-tokyo-rulebook.pdf"

# Quacks of Quedlinburg (413 tokens — too thin)
curl -L -o quacks-of-quedlinburg.pdf "https://cdn.1j1ju.com/medias/ba/73/db-the-quacks-of-quedlinburg-rulebook.pdf"


# ============================================
# GOBLIN BATCH (Heavy & Complex) — 9 need rewrite (Scythe OK)
# ============================================

# Scythe — SKIP (already 1,625 tokens, passes quality bar)

# Spirit Island (387 tokens — WAY too thin for this complexity)
curl -L -o spirit-island.pdf "https://cdn.1j1ju.com/medias/87/39/54-spirit-island-rulebook.pdf"

# Brass: Birmingham (398 tokens — too thin)
curl -L -o brass-birmingham.pdf "https://cdn.1j1ju.com/medias/60/39/64-brass-birmingham-rulebook.pdf"
# Also available: http://files.roxley.com/Brass-Birmingham-Rulebook-2018.11.20-highlights.pdf

# Root (343 tokens — too thin)
curl -L -o root.pdf "https://cdn.1j1ju.com/medias/a9/11/8f-low-of-root.pdf"
# Note: This is the "Law of Root" rules reference. Also search for learning guide.

# Agricola (338 tokens — too thin)
curl -L -o agricola.pdf "https://cdn.1j1ju.com/medias/dd/16/f5-agricola-rulebook.pdf"

# Concordia (353 tokens — too thin)
curl -L -o concordia.pdf "https://cdn.1j1ju.com/medias/4c/79/a6-concordia-rulebook.pdf"

# Great Western Trail (332 tokens — too thin)
curl -L -o great-western-trail.pdf "https://cdn.1j1ju.com/medias/10/1c/e0-great-western-trail-rulebook.pdf"

# Viticulture (320 tokens — too thin)
curl -L -o viticulture.pdf "https://cdn.1j1ju.com/medias/9f/c0/a5-viticulture-essential-edition-rulebook.pdf"

# Castles of Burgundy (307 tokens — too thin)
curl -L -o castles-of-burgundy.pdf "https://cdn.1j1ju.com/medias/04/f5/f9-the-castles-of-burgundy-rulebook.pdf"

# Power Grid (340 tokens — too thin)
# Base game not found on 1j1ju. Try:
curl -L -o power-grid.pdf "https://cdn.1j1ju.com/medias/power-grid-rulebook.pdf"
# Fallback: Search "power grid friedemann friese rulebook pdf"
```

**After downloading, verify:**
```bash
cd /mnt/d/GameMasterAI/content/rulebooks/
ls -la *.pdf | wc -l   # Should be 44 files
# Check for any 0-byte files (failed downloads):
find . -name "*.pdf" -size 0
```

For any PDF that fails to download, search `https://en.1jour-1jeu.com/` for the game name — their file section will have the correct URL. Or search `{game name} rulebook pdf filetype:pdf`.

---

### STEP 2: Extract Text from All PDFs

For each downloaded PDF, extract the text content so the Rogues can use it:

```bash
mkdir -p /mnt/d/GameMasterAI/content/rulebook-text/

for pdf in /mnt/d/GameMasterAI/content/rulebooks/*.pdf; do
    basename=$(basename "$pdf" .pdf)
    # Try pdftotext first (cleaner output)
    pdftotext "$pdf" "/mnt/d/GameMasterAI/content/rulebook-text/${basename}.txt" 2>/dev/null
    if [ ! -s "/mnt/d/GameMasterAI/content/rulebook-text/${basename}.txt" ]; then
        # Fallback: use python pdfminer
        python3 -c "
from pdfminer.high_level import extract_text
text = extract_text('$pdf')
with open('/mnt/d/GameMasterAI/content/rulebook-text/${basename}.txt', 'w') as f:
    f.write(text)
" 2>/dev/null
    fi
done

# Report results:
echo "=== Extraction Results ==="
for txt in /mnt/d/GameMasterAI/content/rulebook-text/*.txt; do
    basename=$(basename "$txt")
    chars=$(wc -c < "$txt")
    echo "$basename: $chars characters"
done
```

If `pdftotext` isn't installed: `sudo apt install poppler-utils`
If `pdfminer` isn't installed: `pip install pdfminer.six`

---

### STEP 3: Prepare Rogue Rewrite Instructions

Create a rewrite instruction file for each Rogue batch. Each file includes:
- The list of games to rewrite
- The path to each game's extracted rulebook text
- The path to the existing (thin) game JSON file
- The GMAI schema template

**Template for each Rogue's rewrite instruction:**

```
You are rewriting game knowledge bases for GameMaster AI.

For each game in your batch:

1. READ the official rulebook text provided in the rulebook-text/ directory.
   This is your PRIMARY source. Do NOT write from memory.

2. READ the existing game JSON file in content/games/ to see what's already there.

3. REWRITE all 5 sections using the rulebook as your source:
   - component_identification: List ALL components with exact counts from the rulebook
   - core_game_loop: Describe exactly what happens on a turn, from the rulebook
   - detailed_rules: Cover ALL rules, special cases, and edge cases from the rulebook
   - scoring_and_endgame: List ALL victory point sources and end-game triggers
   - beginner_strategy: Write actionable advice based on the actual game mechanics

4. REQUIREMENTS:
   - Total token count must be 800-3,000
   - Every fact must come from the rulebook, not your training data
   - Include player counts, play time, and complexity from the rulebook
   - Set source_verified: true (you have the actual rulebook)
   - Update source_url to the PDF URL from the rulebooks/ directory
   - Set metadata.revision to current + 1

5. OUTPUT: Write the complete JSON file to content/games/{game_id}.json
   (overwriting the existing thin version)
```

---

### STEP 4: Re-Deploy Rogues

For each Rogue, update their AGENT.md soul file to include the rewrite instruction, then re-launch:

```bash
# For each rogue (halfling, elf, dwarf, human, goblin):
# 1. Update soul file with rewrite instructions + game list
# 2. Ensure rulebook text files are accessible in their workspace
# 3. Launch with rewrite prompt

# Example for Halfling:
openclaw agent --agent halfling --message "REWRITE SPRINT: You have 5 games to rewrite using official rulebook text. Read each rulebook-text/*.txt file, then rewrite the game JSON. Games: catan, ticket-to-ride, carcassonne, splendor, patchwork. The rulebook text files are in content/rulebook-text/. Output to content/games/. Follow the schema exactly. Token target: 800-3000 per game." --json
```

**Batch assignments for rewrite sprint:**

| Rogue | Games to Rewrite | Count |
|-------|-----------------|-------|
| Halfling | catan, ticket-to-ride, carcassonne, splendor, patchwork, century-spice-road | 6 |
| Elf | wingspan, seven-wonders, pandemic, dominion, everdell, terraforming-mars, sagrada, lords-of-waterdeep, clank | 9 |
| Dwarf | dixit, wavelength, just-one, the-crew, coup, love-letter, skull, one-night-ultimate-werewolf, telestrations, decrypto | 10 |
| Human | betrayal-at-house-on-the-hill, mysterium, villainous, photosynthesis, takenoko, sheriff-of-nottingham, dead-of-winter, cosmic-encounter, king-of-tokyo, quacks-of-quedlinburg | 10 |
| Goblin | spirit-island, brass-birmingham, root, agricola, concordia, great-western-trail, viticulture, castles-of-burgundy, power-grid | 9 |

Halfling gets the lightest load (6) because gateway games are quickest and they already proved they produce decent quality.

---

### STEP 5: Re-run QA

After all rewrites are complete, Paladin must re-validate ALL 44 rewritten games using the same 12-point quality checklist. The bar is higher this time:
- Every section must reference actual rulebook content
- Token count 800-3,000 (no exceptions)
- Source URLs must point to real PDFs
- No training-data hallucinations

---

### Acceptance Criteria

1. ✅ All 44 rulebook PDFs downloaded to `D:\GameMasterAI\content\rulebooks\`
2. ✅ All 44 text extractions saved to `D:\GameMasterAI\content\rulebook-text\`
3. ✅ All 5 Rogues re-launched with rewrite instructions and rulebook text access
4. ✅ All 44 game JSON files rewritten with 800-3,000 tokens each
5. ✅ Paladin re-validates all 44 (approval/rejection cycle complete)
6. ✅ All 50 games loaded and queryable in the app
7. ✅ 5-game random test: 3 questions each, all accurate

### Report Back

Email `[GMAI-LOG] Rewrite Sprint` updates to Tim's Gmail at these checkpoints:
- After Step 1 (PDFs downloaded — report any failures)
- After Step 2 (text extracted — report any extraction issues)
- After Step 4 (Rogues launched — all 5 active)
- After Step 5 (QA complete — final count of approved vs rejected)

---

*End of task.*
