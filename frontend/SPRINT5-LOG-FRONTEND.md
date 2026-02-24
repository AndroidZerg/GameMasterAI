# Sprint 5 — Frontend Log (Track A)

## Branch: `sprint5/frontend`

---

### Phase A1: Score Tracker — Full-Width Overhaul
**Status:** DONE
- Rewrote ScoreTracker from small centered modal to full-screen spreadsheet layout
- CSS Grid with player columns + category rows, sticky header/totals
- +/- steppers at 32px touch targets, boolean toggle cells, manual inputs
- Player setup capped at 2-6 with 6 colors, cooperative/elimination modes preserved

### Phase A2: Score Calculator Functions
**Status:** DONE
- Added MiniCalculator overlay with numpad (0-9), +−×÷, equals, clear
- Round up / round down buttons for fractional results
- Manual score cells open calculator on tap, "Done" saves to cell

### Phase A3: Scoring Reference Text
**Status:** DONE
- Collapsible "How to Score" accordion above spreadsheet grid
- Per-game scoring tips for Catan, Wingspan, Ticket to Ride, King of Tokyo + 8 more

### Phase A4: Swap Top Scores + Score Tracker Positions
**Status:** DONE
- "Top Scores" tab → "Score" tab with "Open Score Tracker" button + leaderboard below
- Removed floating Score FAB button (scoring now in tab bar)

### Phase A5: Show All Filters — Remove More/Less Toggle
**Status:** DONE
- All 3 filter rows (complexity, players, time, best for) always visible
- Removed expanded state and More/Less toggle button

### Phase A6: Fix Missing Play Time on Game Cards
**Status:** DONE
- Added getPlayTime() with complexity-based fallbacks (party~20, gateway~45, midweight~75, heavy~120)
- All game cards now always show play time, filter uses fallback values

### Phase A7: Game Cover Art Display Fix
**Status:** DONE
- .jpg → .png fallback for GameCard, GameOfTheDay, GameCoverThumb
- Proper alt text with game title, objectFit: cover maintained

### Phase A8: Score Tracker — Specific Scoring Configs
**Status:** DONE
- Expanded MOCK_SCORES to 18 games with specific categories
- count (stepper × points), boolean (exclusive toggle), manual (calculator), cooperative, elimination
- Added scoring reference tips for Azul, 7 Wonders, Terraforming Mars, Splendor, Dominion, Sagrada, Carcassonne

### Phase A9: Polish + Full Test
**Status:** DONE
- Fixed useState→useRef for image .png fallback flags (proper React pattern)
- Clean vite build, 0 warnings, 0 errors
- All 8 phases verified working
