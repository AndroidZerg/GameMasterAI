# Sprint 4 — Track C: Content + Deploy Round 4
Started: 2026-02-24
Branch: sprint4/content

---

## Phase C1: Download Game Cover Art — New Approach
Status: COMPLETE — professional placeholders generated

- BGG API still returns 401 from this network (tried session cookies, curl, old API)
- Generated 400x400 gradient images with Pillow for all 50 games
- Features: gradient backgrounds by complexity, centered title, player count badge, complexity label, publisher name
- Color scheme: purple (party), green (gateway), blue (midweight), red (heavy)
- Avg file size: ~13 KB per image
- Script: `scripts/generate_pro_placeholders.py`

---

## Phase C2: Verify Image Pipeline End-to-End
Status: COMPLETE

- 50 images, 50 games — perfect 1:1 match
- All files > 1 KB (no corrupt/empty files)
- Frontend expects `.jpg` — images are `.jpg`
- Backend serves via `/api/images/{filename}` with path traversal protection

---

## Phase C3: Accurate Play Time Data
Status: COMPLETE — 13 games fixed, 14 quick games identified

### Fixed games (13):
- brass-birmingham: 90-150 → 60-120
- carcassonne: 35-50 → 30-45
- coup: 15-30 → 15-15
- dominion: 30-45 → 30-30
- just-one: 20-30 → 20-20
- kingdomino: 15-15 → 15-20
- pandemic: 45-60 → 45-45
- power-grid: 120-150 → 120-120
- seven-wonders: 30-45 → 30-30
- skull: 15-45 → 15-30
- splendor: 30-45 → 30-30
- sushi-go-party: 20-30 → 20-20
- terraforming-mars: 90-150 → 120-120

### Quick games (max ≤ 30 min): 14
codenames, coup, dominion, just-one, king-of-tokyo, kingdomino,
love-letter, one-night-ultimate-werewolf, patchwork, seven-wonders,
skull, splendor, sushi-go-party, the-crew

---

## Phase C4: "Best For" Tags
Status: COMPLETE — 50/50 games tagged, 18 tag categories

- Created `content/game-tags.json` with 18 tag categories
- All 50 games tagged (perfect 1:1 match)
- Top tags: competitive (40), family-friendly (23), great-for-2 (20), engine-building (18)
- Tag definitions included in `_meta` section for frontend reference

---

## Phase C5: Production Deployment Verification
Status: COMPLETE — all endpoints operational

### Render backend (https://gmai-backend.onrender.com):
- `/health` → `{"status":"ok"}` ✓
- `/api/games` → 50 games ✓
- `/api/games/catan` → Title, complexity, MSRP present ✓
- `/api/games/quick` → 10 quick games (will be 14 after redeploy with C3 fixes) ✓
- `/api/scores/splendor` → Score config with categories ✓
- `/api/images/catan.jpg` → 200, 4324 bytes ✓
- `/api/stats` → 50 total games available ✓
- 37 API endpoints active in OpenAPI spec

### Note:
- Auth login requires `email` field (not `username`)
- `/api/venue/menu` returns 404 (not yet implemented)
- Quick games count will update from 10 → 14 after play time data is deployed

---

## Phase C6: Comprehensive Game Metadata Report
Status: IN PROGRESS

---
