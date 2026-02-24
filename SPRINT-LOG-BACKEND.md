# Backend Sprint Log
Started: 2026-02-23T06:00:00Z

## Phase B1: Venue Config Endpoint ✅
- Created `content/venue-config.json` with Meepleville config
- Added `GET /api/venue` endpoint in `backend/app/api/routes/venue.py`
- Returns venue config JSON from file

## Phase B2: Session Tracking ✅
- Created `backend/app/models/sessions.py` with SQLite table auto-creation
- Added endpoints: `POST /api/sessions/start`, `POST /api/sessions/{id}/end`, `POST /api/sessions/{id}/question`, `POST /api/sessions/{id}/scored`
- Sessions table: id, game_id, table_number, started_at, ended_at, duration_seconds, questions_asked, score_tracked, venue_id

## Phase B3: Stats Endpoint ✅
- Added `GET /api/stats` in `backend/app/api/routes/stats.py`
- Returns today/this_week/all_time/feedback aggregations
- Top games joined with game metadata for titles

## Phase B4: Feedback Endpoint ✅
- Created `backend/app/models/feedback.py` with SQLite table auto-creation
- Added `POST /api/feedback` and `GET /api/feedback` (with optional `?game_id=` filter)
- Validates rating is 1 or -1

## Phase B5: Score Config API ✅
- Added `GET /api/scores/{game_id}` in `backend/app/api/routes/scores.py`
- Returns score JSON from `content/scores/{game_id}-score.json`
- Returns `{"scoring_type": "unavailable"}` if file not found

## Phase B6: Score Configs — 5 Demo Games ✅
- Created score configs for: catan, ticket-to-ride, azul, wingspan, scythe
- Scythe uses `tiered_calculator` with popularity tier multipliers

## Phase B7: Contact Form Endpoint ✅
- Created `backend/app/models/contacts.py` with SQLite table auto-creation
- Added `POST /api/contact` with rate limiting (10/hour per IP)
- Input validation for name, email, message

## Phase B8: Score Configs — 45 Remaining Games ✅
- All 50 games now have score configs in `content/scores/`
- Scoring types used: calculator (28), elimination (7), cooperative (6), team_race (3), tiered_calculator (1)
- All scoring rules verified against game JSON endgame subtopics

## Phase B9: Static Image Serving ✅
- Added `GET /api/images/{filename}` in `backend/app/api/routes/images.py`
- Serves from `content/images/` directory
- Path traversal prevention, 404 on missing images
- CORS handled by existing middleware

## Phase B10: Polish + Edge Cases ✅
- All endpoints have error handling (try/except, proper HTTP status codes)
- Input validation on session/feedback/contact endpoints
- Rate limiting on contact form (10/hour per IP via slowapi)
- `/health` endpoint still works
- All SQLite tables auto-create on startup via lifespan handler

## Phase B11: Game Recommendations Endpoint ✅
- Added `GET /api/recommendations?players=4&complexity=gateway&category=strategy`
- Returns top 5 games with relevance scoring across player count, complexity, category
- Falls back to closest matches when no exact matches found

## Phase B12: Fuzzy Search Endpoint ✅
- Added `GET /api/games/search?q=dragons`
- Fuzzy search across title, aliases, and categories
- Ranked by relevance: exact > prefix > substring matches
- Handles partial matches ("cat" finds "Catan")

## Phase B13: Popular Games Endpoint ✅
- Added `GET /api/games/popular`
- Returns top 10 most-played games from session data
- Falls back to curated gateway game defaults when no sessions exist

## Phase B14: Admin Venue Config Update ✅
- Added `POST /api/admin/venue`
- Updates venue-config.json with partial updates (only provided fields)
- Validates: hex color format, non-empty names, dark/light theme

## Phase B15: Export Endpoints ✅
- Added `GET /api/admin/export/sessions?format=csv`
- Added `GET /api/admin/export/feedback?format=csv`
- Joins with game metadata for titles, streams as downloadable CSV files

## Phase B16: API Documentation ✅
- All endpoints tagged by category: games, sessions, feedback, admin, scores, venue, system
- FastAPI auto-docs at `/docs` with proper descriptions
- Bumped version to 0.4.0

## Summary
- **New route modules**: 12 (venue, sessions, feedback, stats, scores, contact, images, recommendations, search, popular, admin, export)
- **Total new endpoints**: 18 across 12 route modules
- **New SQLite tables**: 3 (sessions, feedback, contacts)
- **Score configs**: 50 games covered in `content/scores/`
- **All endpoints** have error handling, input validation, and proper HTTP status codes

Completed: 2026-02-23T07:15:00Z
