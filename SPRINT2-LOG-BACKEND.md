# Backend Sprint 2 Log
Started: 2026-02-23T20:00:00Z

## Phase B1: Venue Accounts + Auth System ✅
- Created JWT auth system with PyJWT
- Venues SQLite table: id, venue_id, venue_name, email, password_hash, accent_color, logo_url, tagline, default_theme, created_at, last_login
- Auth endpoints: POST /api/auth/login, /api/auth/verify, /api/auth/logout
- `get_current_venue()` FastAPI dependency for protected routes
- `get_optional_venue()` for routes that work with or without auth
- Demo venue seeded on startup: demo@meepleville.com / gmai2026
- Password hashing with SHA-256 + salt

## Phase B2: Protect Admin Routes ✅
- POST /api/admin/venue now requires JWT auth
- GET /api/admin/export/sessions requires JWT auth
- GET /api/admin/export/feedback requires JWT auth
- POST /api/admin/collection requires JWT auth
- Public endpoints remain unauthenticated: /api/games, /api/scores, /api/sessions, /api/feedback, /health, etc.
- 401 returns `{"detail": "Not authenticated"}`

## Phase B3: Venue Collection Management ✅
- venue_collections SQLite table: id, venue_id, game_id, added_at, UNIQUE(venue_id, game_id)
- POST /api/admin/collection — replaces entire collection (auth required)
- GET /api/admin/collection — returns venue's collection (auth required)
- GET /api/venue/collection — public, returns collection if authenticated
- GET /api/games?venue=true — filters to venue's collection when authenticated
- Demo venue seeded with all 50 games

## Phase B4: MSRP Price Data ✅
- Created content/msrp-prices.json with realistic MSRPs for all 50 games
- Prices loaded on startup and merged into game metadata
- GET /api/games now includes "msrp" field
- GET /api/games/{game_id} includes "msrp" field
- GET /api/games/{game_id}/price — returns {game_id, msrp, currency: "USD"}

## Phase B5: Venue-Specific Config ✅
- GET /api/venue: if authenticated, returns venue config from DB; otherwise returns default from venue-config.json
- Includes: venue_name, tagline, accent_color, logo_url, default_theme, game_count
- POST /api/admin/venue updates the venues DB row (not the global JSON file)

## Phase B6: Venue Registration ✅
- POST /api/auth/register — creates new venue account
- Generates venue_id from venue_name (lowercase, hyphenated)
- Hashes password, validates email uniqueness, minimum 8-char password
- Seeds new venue with all 50 games in collection
- Returns JWT token immediately
- Rate limited: 5 registrations per hour per IP

## Phase B7: QR Code Table Tracking ✅
- POST /api/sessions/start now accepts venue_id parameter (from QR codes)
- Sessions table stores venue_id per session
- GET /api/stats: if authenticated, returns stats for THIS venue only; otherwise returns global stats
- GET /api/admin/export/sessions: filters to venue's sessions
- GET /api/admin/export/feedback: filters to venue's feedback

## Phase B8: Polish + Testing ✅
- Full integration test: register → login → verify → access admin → 401 on invalid token
- Collection test: set → filter → reset
- MSRP: all 50 games have prices
- Venue-specific stats verified
- All 17 required routes registered and working
- Server boots cleanly with all tables auto-created
- Error handling on all endpoints

## Summary
- **New files**: auth.py (routes), auth.py (core), venues.py (model), msrp-prices.json
- **Modified files**: main.py, config.py, requirements.txt, admin.py, export.py, games.py, sessions.py, stats.py, venue.py
- **New endpoints**: 8 (auth login/verify/logout/register, admin collection GET/POST, venue collection, game price)
- **Modified endpoints**: 5 (admin venue, export sessions/feedback, stats, games list)
- **New SQLite tables**: 2 (venues, venue_collections)

Completed: 2026-02-23T20:45:00Z
