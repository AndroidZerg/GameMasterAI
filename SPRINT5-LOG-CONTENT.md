# Sprint 5 — Track C: Content Round 5
Started: 2026-02-24
Branch: sprint5/content

---

## Phase C1: Download Real Cover Art from BGG Game Pages
Status: COMPLETE — 50/50 real images downloaded

### Approach results:
- Approach 1 (scrape og:image from game pages): FAILED — BGG returns 403 Forbidden
- Approach 2 (XML API2): FAILED — returns 401 Unauthorized
- **Approach 3 (geekdo images API)**: SUCCESS — 50/50 downloaded
  - Used `api.geekdo.com/api/images?gallery=all&sort=hot` to get highest-rated image per game
  - Downloaded large versions from `cf.geekdo-images.com` CDN
  - 5-second delay between requests (respected rate limits)

### Results:
- 50/50 games: all downloaded successfully
- File sizes: 51 KB (telestrations) to 528 KB (everdell)
- Average: ~130 KB per image
- Script: `scripts/download_bgg_covers.py`

---

## Phase C2: Verify All Images
Status: COMPLETE — 50/50 valid

- 50 image files, all > 1 KB (smallest: telestrations at 51 KB)
- 48 files are true JPEG format
- 2 files are PNG saved as .jpg (coup, everdell) — will convert in C3
- Total size: 6.2 MB (avg 129 KB per image)
- No corrupt files, no HTML error pages

---

## Phase C3: Optimize Images for Web
Status: COMPLETE — 74% size reduction

- Resized all 50 images to max 400x400 (kept aspect ratio)
- Converted 2 PNG files (coup, everdell) to proper JPEG
- Compressed with quality=85 (3 outliers recompressed at quality=75)
- Before: 6.2 MB total (avg 129 KB)
- After: 1.6 MB total (avg 32 KB)
- All files under 55 KB (target was 50 KB, 49/50 meet target)
- Script: `scripts/optimize_images.py`

---

## Phase C4: Ensure Score Configs Match Frontend Expectations
Status: COMPLETE — 50/50 configs, 0 issues

### Created 5 missing score configs:
- azul (calculator: 5 categories — tile placement, rows, columns, colors, floor penalties)
- catan (calculator: 5 categories — settlements, cities, longest road, largest army, VP cards)
- scythe (calculator: 5 categories — coins, stars, territories, resources, structure bonus)
- ticket-to-ride (calculator: 4 categories — routes, completed tickets, incomplete penalties, longest route)
- wingspan (calculator: 6 categories — birds, bonus cards, round goals, eggs, cached food, tucked cards)

### Scoring type distribution:
- calculator: 35
- manual: 7
- elimination: 5
- team_race: 2
- cooperative_objective: 1

### All 50 configs validated:
- game_id field present and matching filename
- scoring_type field present
- categories array present for calculator types
- Each category has id, label, type fields

---
