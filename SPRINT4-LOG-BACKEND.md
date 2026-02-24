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

## Phase B3: Expansion Data
- Created content/expansions.json with expansion data for 25+ popular games
- GET /api/games/{game_id}/expansions — returns expansion list (empty array if none)
- Each expansion has: name, adds_players (nullable), description
- Covers: catan, ticket-to-ride, wingspan, carcassonne, dominion, pandemic, spirit-island, root, scythe, king-of-tokyo + 15 more

## Phase B4: Customer Rating System
- Upgraded feedback table: added reaction (loved/fun/okay/meh) and comment fields
- POST /api/feedback now accepts rating 1-5 (stars) + backward compat with -1/1 thumbs
- GET /api/games/{game_id}/rating — aggregate: average, total, distribution {1:n, 2:n, ...}
- GET /api/games now includes average_rating field for each game with ratings
- Schema migration via ALTER TABLE for backward compat

## Phase B5: "Best For" Tags System
- Auto-generates tags from metadata: Solo, Great for 2, Family Friendly, Party Game, Brain Burner, Quick Play, Cooperative, Mystery/Deduction, Large Group
- GET /api/games response now includes "tags" array for each game
- GET /api/games/filter accepts ?tag=cooperative, ?tag=quick-play, etc.
- Tag matching is case-insensitive with hyphen-to-space normalization

## Phase B6: Game of the Day Endpoint
- GET /api/games/featured — returns "Game of the Day" with why_play one-liner
- Selection: MD5 hash of date string -> deterministic daily pick
- Created content/game-highlights.json with one-liners for all 50 games
- Same game all day, changes at midnight UTC

## Phase B7: Staff Picks + Venue Customization
- Added staff_picks JSON column to venues table
- GET /api/venue now includes staff_picks array
- POST /api/admin/staff-picks — update venue's staff picks (auth required)
- GET /api/games/staff-picks — returns full game data for picked games
- Default: first 5 games alphabetically when no picks set
