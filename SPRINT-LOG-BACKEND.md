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
- Updated FastAPI version to 0.3.0

## Summary
- **New files created**: 18 backend files + 50 score configs + 1 venue config
- **New endpoints**: 12 endpoints across 7 route modules
- **New SQLite tables**: 3 (sessions, feedback, contacts)
- **All 50 games** have score tracking configs

Completed: 2026-02-23T06:45:00Z
