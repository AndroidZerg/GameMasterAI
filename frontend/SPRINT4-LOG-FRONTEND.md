# Sprint 4 — Frontend Log (Track A)

## Branch: `sprint4/frontend`

---

### Phase A1: Fix Score Tracker — "Coming Soon" Bug
**Status:** IN PROGRESS
**Started:** 2026-02-23

**Problem:** ScoreTracker shows "Score tracker coming soon" for any game not in the 6-game MOCK_SCORES dict. The scoring UI built in R3 is unreachable for ~44 of 50 games.

**Root Cause:** `ScoreTracker.jsx` lines 674-682 — when API fetch fails AND game isn't in MOCK_SCORES, `setNoConfig(true)` triggers the "coming soon" placeholder.

**Fix:** Add a generic fallback scoring config (simple manual total entry) so ALL games get a working score tracker. Games with specific configs keep their detailed scoring; everything else gets a "Generic Score" manual entry mode.
