# Sprint 3 — Track C: Deploy + Content Round 3
Started: 2026-02-23
Branch: sprint3/content

---

## Phase C1: Diagnose Player-Count Rendering Bug
Status: COMPLETE — already fixed in commit cb6ebc8

- Renderer in GameTeacher.jsx correctly handles `--- X Players ---` headers
- Preprocessing ensures headers get separate paragraph blocks
- Three render types: divider-only, section-with-bullets, section-with-numbers
- Verified across splendor, above-and-below, king-of-tokyo, seven-wonders
- Diagnostic saved to `tests/renderer_diagnostic.txt`

---

## Phase C2: Fix Player-Count Rendering
Status: COMPLETE (N/A — already working)

Renderer fix was part of Sprint 2 merge. No additional changes needed.

---

## Phase C3: Fix Game Cover Art Serving
Status: COMPLETE — pipeline verified working

- 50 placeholder images exist in `content/images/`
- Backend serves via `/api/images/{filename}` from `backend/app/api/routes/images.py`
- Path resolution verified: parents[4] → `content/images/` resolves correctly
- Frontend requests `${API_BASE}/api/images/${game.game_id}.jpg` with error fallback
- All 50 images present and path-accessible

---

## Phase C4: Download Real Cover Art
Status: COMPLETE — BGG API blocked, placeholders remain

### Attempts:
1. BGG XML API2 with User-Agent header → 401 Unauthorized
2. BGG old API (`/xmlapi/boardgame/`) → 401 Unauthorized
3. BGG with browser User-Agent + no SSL verify → 401 Unauthorized
4. BGG JSON API (geekdo.com) → Returns user images, not official covers

### Result:
- All BGG endpoints return 401 from this network
- 50 colored placeholder images remain in `content/images/`
- Placeholders are color-coded by complexity and show game titles
- TODO: Replace with real BGG covers when API access is available

---

## Phase C5: Redeploy to Render
Status: IN PROGRESS

---
