# GMAI-TASK-RANGER-DICETOWER-20260225-1201
## From: Bard (CoS)
## To: Ranger (Agent Orchestrator) → route to Rogues
## Priority: High
## Depends On: Nothing — schema is unchanged from current standard

---

### Context

We need 5 public domain game knowledge bases built for the Dice Tower West demo. These are the only games that will appear for convention floor attendees and the floor demo account. They must be fully original — no rulebook text reproduced, all content synthesized from game knowledge. These games are public domain, so no IP concerns, but the writing must still be original to GMAI.

These 5 games are the entire public-facing product for Dice Tower. Quality matters. They are what publishers will see when evaluating whether to license their games to us.

---

### Assignment

Assign all 5 games to a single Rogue (recommend Halfling — these are all gateway/simple complexity).

**Games:**
1. Chess
2. Go
3. Checkers
4. Dominoes (standard Draw game)
5. Mahjong (standard Chinese Mahjong — not American, not video game versions)

---

### Schema

Use the standard GMAI schema with two additional required fields:

```json
{
  "game_id": "chess",
  "title": "Chess",
  "public_domain": true,
  "publisher_approved": false,
  ...
}
```

`public_domain` must be set to `true` on all 5 files. This is what gates their visibility to convention and demo users.

All other schema rules apply as normal (5 sections required, 800–3,000 tokens total, source_url required).

**For source_url on public domain games:** Link to the official FIDE rules (Chess), IGF rules (Go), World Checkers/Draughts Federation rules, or equivalent authoritative governing body. Do not link to Wikipedia or tutorial sites.

---

### Quality Notes for These Specific Games

These games will be demoed live to board game publishers at Dice Tower West. The content needs to be excellent.

- **Chess:** Focus the strategy section on first-time players, not competitive players. Opening principles, piece values, basic tactics (forks, pins). The setup section must clearly describe the board orientation ("queen on her own color").
- **Go:** This is the hardest to teach. The core loop section must be exceptionally clear — capturing, territory, ko rule. Strategy should focus on the concept of influence vs. territory for beginners.
- **Checkers:** Short rules, so the token count will be on the lower end. Compensate with a rich strategy section covering king strategy, forced captures, and endgame technique.
- **Dominoes:** Specify this is the standard Draw game (not Block, not Muggins). Core loop must cover the train layout and the spinner concept clearly.
- **Mahjong:** This is the most complex of the 5. Standard Chinese Mahjong only — explicitly note in the metadata that this does not cover American Mahjong, Japanese Riichi, or any regional variants. The detailed_rules section will likely be near the 3,000 token ceiling — that's acceptable here.

---

### Acceptance Criteria

Paladin applies standard QA checklist plus:
- [ ] `public_domain: true` is present on all 5 files
- [ ] No rulebook text reproduced — all original writing
- [ ] source_url links to an authoritative governing body or official rules source
- [ ] Strategy section gives actionable advice for complete beginners (these are demo games shown to non-gamers at a convention)
- [ ] Mahjong file explicitly states which variant is covered in the metadata notes field

### Report Back

Ranger reports to Tim via Telegram when all 5 are approved by Paladin, with a list of the 5 filenames ready for Barbarian to load.
