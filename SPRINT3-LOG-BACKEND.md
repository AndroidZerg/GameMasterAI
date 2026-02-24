# Backend Sprint 3 Log
Started: 2026-02-23T21:00:00Z

## Phase B1: Seed Las Vegas Venue Accounts
- Rewrote `backend/app/models/venues.py` with 6 Las Vegas demo venues
- Added address, phone, website fields with ALTER TABLE migrations
- `seed_all_venues()` replaces `seed_demo_venue()`, returns list of seeded IDs
- Venues: meepleville, knight-and-day, little-shop-of-magic, shall-we-play, grouchy-johns, natural-twenty
- Added `get_all_venues()` for public listing
- Added GET /api/venues endpoint in venue.py

## Phase B2: Analytics Endpoints
- Created `backend/app/models/analytics.py` — analytics table, log_event, get_analytics_summary
- Created `backend/app/api/routes/analytics.py` — POST /api/analytics/event, /filter, /game-view, GET /api/admin/analytics
- Summary includes: today counts, top viewed games, top searched terms, popular filters, hourly activity

## Phase B3: Score History
- Created `backend/app/models/score_history.py` — score_history table, save_score, get_score_history, get_leaderboard
- Created `backend/app/api/routes/score_history.py` — POST /api/scores/history, GET /api/scores/history, GET /api/admin/scores/leaderboard
- Leaderboard extracts individual player scores from JSON and ranks them

## Phase B4: Venue Branding Assets
- Created `content/venue-logos/` with 6 PNG logo placeholders (generated with Pillow)
- Updated images.py with GET /api/images/venue-logos/{filename}
- Updated venue.py with address/phone/website in response and logo_url auto-detection

## Phase B5: Game Categories & Filter
- Added `filter_games()`, `get_all_categories()`, `get_quick_games()` to game model
- Added GET /api/games/categories, GET /api/games/filter, GET /api/games/quick routes
- Filter supports: complexity, min_players, max_players, category, max_play_time (all combinable)

## Phase B6: Quick Games Metadata
- Added play_time_min, play_time_max columns to games table with ALTER TABLE migration
- Updated rebuild_db() to store play_time data from game JSONs
- Updated _row_to_dict() to include play_time_minutes

## Phase B7: Enhanced Stats
- Added `_enhanced_stats()` to stats.py — total_sessions, total_questions, total_scores, busiest_hour/day, recent_sessions, player_leaderboard
- Enhanced stats only returned for authenticated venues under "enhanced" key

## Phase B8: Polish + Testing
- Updated main.py: registered analytics_router & score_history_router, init new tables, seed_all_venues
- Fixed auth.py import (removed stale seed_demo_venue reference)
- Version bumped to 0.6.0
- Full integration test: 20/20 tests passing
  - Health, games, categories, filter, quick games, stats, venues
  - Auth flow: login Meepleville, verify, venue config, enhanced stats
  - Auth flow: login Knight & Day, different venue data confirmed
  - Analytics: game view, filter, search events tracked and summarized
  - Score history: submit, retrieve, leaderboard
