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
