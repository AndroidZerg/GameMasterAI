# Stonemaier Infrastructure Prep — COMPLETE

**Date**: 2026-03-10
**Agent**: Barbarian

---

## 1. Wingspan Template

**Path**: `agents/tickets/WINGSPAN-TEMPLATE.md`

Full JSON structure contract extracted from `content/games/wingspan.json`. Covers:
- All top-level keys with types
- `tabs` object structure with all 5 tab keys
- Subtopic entry format (`id`, `title`, `content`)
- Complete example tab entry (walkthrough)
- Per-tab content summary
- Validation checklist

---

## 2. Game Format Status — All 16 Stonemaier Games

All 16 games already have `tabs` with the 3 required keys (`setup`, `rules`, `strategy`).

### Full tabs format (sections + tabs) — 12 games
| Game | Tab Keys |
|------|----------|
| wingspan | setup, rules, strategy, walkthrough, advanced_strategy |
| scythe | setup, rules, strategy, walkthrough, advanced_strategy |
| viticulture | setup, rules, strategy, walkthrough, advanced_strategy |
| tapestry | setup, rules, strategy, walkthrough, advanced_strategy |
| wyrmspan | setup, rules, strategy, walkthrough, advanced_strategy |
| charterstone | setup, rules, strategy |
| my-little-scythe | setup, rules, strategy |
| between-two-cities | setup, rules, strategy |
| red-rising | setup, rules, strategy |
| between-two-castles-of-mad-king-ludwig | setup, rules, strategy |
| rolling-realms | setup, rules, strategy |
| pendulum | setup, rules, strategy |

### Tabs-only (no legacy sections) — 4 games
| Game | Tab Keys |
|------|----------|
| libertalia-winds-of-galecrest | setup, rules, strategy |
| euphoria-build-a-better-dystopia | setup, rules, strategy |
| expeditions | setup, rules, strategy |
| apiary | setup, rules, strategy |

### Games needing walkthrough + advanced_strategy tabs
- charterstone, my-little-scythe, libertalia-winds-of-galecrest, between-two-cities
- euphoria-build-a-better-dystopia, red-rising, between-two-castles-of-mad-king-ludwig
- expeditions, apiary, rolling-realms, pendulum

(11 of 16 are missing walkthrough and advanced_strategy — only the "big 5" have them)

---

## 3. Score Configs Created

3 score configs were missing and have been created:

| Game | File |
|------|------|
| tapestry | `content/scores/tapestry-score.json` |
| expeditions | `content/scores/expeditions-score.json` |
| apiary | `content/scores/apiary-score.json` |

The other 13 Stonemaier games already had score configs.

---

## 4. Validation Warning Log Output

**No warnings** — all 16 Stonemaier games already have `tabs` with the 3 required keys (`setup`, `rules`, `strategy`) and no empty subtopic content.

The validation code (added to `backend/app/services/knowledge.py`) will catch:
- Games with `sections` but no `tabs` → `WARNING: Game {game_id} is in old format — missing tabs.`
- Games with `tabs` missing `setup`/`rules`/`strategy` → `WARNING: Game {game_id} has tabs but is missing required tab(s): ...`
- Subtopics with empty `content` → `WARNING: Game {game_id} tab '{tab}' subtopic '{id}' has empty content.`

These warnings will fire at startup during `scan_game_files()` for any non-Stonemaier games still in old format.

---

## Files Changed

- `agents/tickets/WINGSPAN-TEMPLATE.md` — NEW: Content contract
- `agents/tickets/INFRA-COMPLETE.md` — NEW: This report
- `backend/app/services/knowledge.py` — MODIFIED: Added format validation warnings
- `content/scores/tapestry-score.json` — NEW: Score config
- `content/scores/expeditions-score.json` — NEW: Score config
- `content/scores/apiary-score.json` — NEW: Score config
