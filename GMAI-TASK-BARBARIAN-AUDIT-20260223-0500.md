# GMAI-TASK-BARBARIAN-AUDIT-20260223-0500
## From: Bard (CoS)
## To: Barbarian (Field Engineer)
## Priority: High
## Depends On: Phase 4 ✅ (50 games loaded)

---

### Context

Tim tested Above and Below and the rules are shallow — the Rogues likely wrote from training data rather than actually finding and reading official rulebooks. We need to audit all 50 game files to find out which ones have real source URLs vs. fabricated ones, and flag the quality of each knowledge base.

This is a data extraction task — pull info from the 50 JSON files and give us a report. Also, replace the Above and Below game file with a corrected version.

---

### Instructions

#### STEP 1: Replace Above and Below

Copy the new `above-and-below.json` file (attached) to `D:\GameMasterAI\content\games\above-and-below.json`, replacing the existing one.

Then reload:
```bash
curl -X POST http://localhost:8100/api/reload
```

Verify it loaded:
```bash
curl -X POST http://localhost:8100/api/query \
  -H "Content-Type: application/json" \
  -d '{"game_id": "above-and-below", "question": "What are all the actions I can take on my turn?", "mode": "rules"}'
```

The response should mention: Explore (with details about cave cards, dice, lanterns, exerting), Build (hammer villager), Harvest, Train (quill villager), Labor, and Free Actions (buy from player, sell, refresh building row).

✅ **Verify:** Response mentions all 5 main actions plus free actions with mechanical detail.

Git commit: `"Replace Above and Below with rulebook-verified version"`

---

#### STEP 2: Extract the audit data from all 50 games

Write and run a Python script that reads every `.json` file in `D:\GameMasterAI\content\games\` (skip `_template.json`) and outputs a report with this info per game:

```python
import json, os, glob

games_dir = r"D:\GameMasterAI\content\games"
files = sorted(glob.glob(os.path.join(games_dir, "*.json")))

print(f"{'GAME_ID':<40} {'TOKENS':>6} {'SOURCE_URL':<80} {'VERIFIED':>8} {'CREATED_BY':<10}")
print("-" * 155)

for f in files:
    if '_template' in f:
        continue
    with open(f, 'r', encoding='utf-8') as fh:
        data = json.load(fh)
    
    game_id = data.get('game_id', 'MISSING')
    total_tokens = data.get('total_token_count', 0)
    source_url = data.get('source_url', 'MISSING')
    verified = data.get('source_verified', False)
    created_by = data.get('metadata', {}).get('created_by', 'unknown')
    
    # Check section completeness
    sections = data.get('sections', {})
    required = ['component_identification', 'core_game_loop', 'detailed_rules', 'scoring_and_endgame', 'beginner_strategy']
    empty_sections = []
    for s in required:
        content = sections.get(s, {}).get('content', '')
        if len(content) < 50:  # Less than 50 chars = probably placeholder
            empty_sections.append(s)
    
    section_status = "OK" if not empty_sections else f"THIN: {', '.join(empty_sections)}"
    
    print(f"{game_id:<40} {total_tokens:>6} {source_url:<80} {str(verified):>8} {created_by:<10} {section_status}")
```

Run this script and capture the full output.

---

#### STEP 3: Test source URLs

For each unique `source_url` in the 50 games, test if it's actually reachable. Run a script like:

```python
import json, os, glob, urllib.request

games_dir = r"D:\GameMasterAI\content\games"
files = sorted(glob.glob(os.path.join(games_dir, "*.json")))

print(f"{'GAME_ID':<40} {'URL_STATUS':<12} {'SOURCE_URL'}")
print("-" * 140)

for f in files:
    if '_template' in f:
        continue
    with open(f, 'r', encoding='utf-8') as fh:
        data = json.load(fh)
    
    game_id = data.get('game_id', 'MISSING')
    source_url = data.get('source_url', '')
    
    if not source_url or source_url == 'MISSING':
        status = "NO_URL"
    else:
        try:
            req = urllib.request.Request(source_url, method='HEAD', headers={'User-Agent': 'Mozilla/5.0'})
            resp = urllib.request.urlopen(req, timeout=10)
            status = f"HTTP_{resp.status}"
        except Exception as e:
            status = f"FAILED"
    
    print(f"{game_id:<40} {status:<12} {source_url}")
```

---

#### STEP 4: Generate the summary report

After running both scripts, compile a summary:

```
AUDIT SUMMARY
=============
Total games: 50
Games with reachable source URLs: X/50
Games with unreachable/fake URLs: X/50
Games with total_token_count < 800 (too thin): X/50
Games with total_token_count > 3000 (too long): X/50
Games with thin sections (<50 chars): X/50

NEEDS REWRITE (unreachable URL or thin content):
- game_id_1 (reason)
- game_id_2 (reason)
- ...

PROBABLY OK (reachable URL, good token count, all sections substantive):
- game_id_1
- game_id_2
- ...
```

---

### Acceptance Criteria

- [ ] Above and Below replaced and verified with a test query
- [ ] Full audit table output for all 50 games (game_id, token count, source URL, verified flag, creator, section status)
- [ ] URL reachability test results for all 50 games
- [ ] Summary report classifying games as "needs rewrite" vs "probably ok"

---

### Report Back

Post the full audit output plus the summary. We need to see every game's data to decide which ones need the rulebook treatment.
