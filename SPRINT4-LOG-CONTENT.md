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
Status: IN PROGRESS

---
