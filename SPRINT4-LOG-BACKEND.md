# Backend Sprint 4 Log
Started: 2026-02-23T22:30:00Z
Branch: sprint4/backend

## Phase B1: Fix Venue Login — Debug + Repair
- Root cause: `seed_all_venues()` skipped existing venues (`if existing: continue`)
- If DB had stale entries with wrong password hashes, logins would fail
- Fix: Changed to UPSERT using `ON CONFLICT(venue_id) DO UPDATE SET ...`
- Now re-running the server always ensures correct demo accounts with fresh password hashes
- All 6 venue logins verified working:
  - demo@meepleville.com / gmai2026 -> OK
  - demo@knightanddaygames.com / gmai2026 -> OK
  - demo@littleshopofmagic.com / gmai2026 -> OK
  - demo@shallweplay.com / gmai2026 -> OK
  - demo@grouchyjohns.com / gmai2026 -> OK
  - demo@naturaltwentygames.com / gmai2026 -> OK
- Protected endpoint (GET /api/stats with Bearer token) returns enhanced stats

## Phase B2: F&B Menu System
- Created content/menus/ with 3 venue menus: meepleville, knight-and-day, grouchy-johns
- Created backend/app/api/routes/menu.py
- GET /api/venue/menu — serves venue menu (auth, venue_id param, or default meepleville)
- POST /api/admin/menu — update venue menu (auth required), saves to content/menus/{venue_id}.json
- Venues without menus return {sections: [], message: "No menu configured"}
