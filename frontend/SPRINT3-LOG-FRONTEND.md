# Sprint 3 — Frontend Log

## A1: Fix Game Card Display Bugs
- **Fixed**: Removed duplicate title — title now only appears BELOW the card image
- **Fixed**: Long titles truncated with ellipsis (text-overflow: ellipsis, white-space: nowrap)
- **Fixed**: Card layout restructured — image area (cover art or clean colored fallback) on top, text info below
- **Fixed**: Added shimmer loading state while cover art images load
- **Files**: `GameSelector.jsx`

## A2: Real QR Code Generation
- **Added**: `qrcode` npm package for scannable QR codes
- **Replaced**: Fake SVG placeholder with real canvas-based QR rendering
- **Added**: Error correction level M for reliable scanning
- **Improved**: Print CSS — page margins, card borders, page-break-inside: avoid
- **Files**: `QRGeneratorPage.jsx`, `index.css`, `package.json`

## A3: Named Score Tracker — Player Setup
- **Added**: Player colors (10 colors) with clickable color picker dots
- **Added**: Player avatars (10 emoji avatars) with tap-to-cycle
- **Added**: Color-coded player borders throughout the scoring UI
- **Files**: `ScoreTracker.jsx`

## A4: Game-Specific Scoring Types
- **Added**: `calculator` type — existing category-based scoring (count/boolean/manual)
- **Added**: `cooperative` type — Win/Loss buttons with team display (Pandemic, The Crew)
- **Added**: `elimination` type — Eliminate/Revive players with optional VP counter (King of Tokyo)
- **Added**: Mock configs for cooperative games (Pandemic, The Crew) and elimination (King of Tokyo)
- **Files**: `ScoreTracker.jsx`

## A5: Results + Winner with Session POST
- **Added**: POST to `/api/sessions` with game_id, players, scores, winner, timestamp
- **Added**: Cooperative results screen (Victory/Defeat with team display)
- **Added**: Player colors in results — winner row uses player color as background
- **Added**: Avatar display throughout results
- **Files**: `ScoreTracker.jsx`

## A6: Game Filtering + Analytics
- **Added**: Complexity filter bar (All / Party / Gateway / Midweight / Heavy pills)
- **Added**: Player count filter (Any / 2 / 3-4 / 5-6 / 7+ pills)
- **Added**: URL search params sync — filters persist in URL (?complexity=party&players=2)
- **Added**: "Clear Filters" button when no results match
- **Added**: Analytics POST to `/api/analytics` on filter change and game selection
- **Renamed**: `/app` route → `/games` with redirect for backward compatibility
- **Updated**: All navigation references across LandingPage, LoginPage, NavMenu, GameTeacher
- **Files**: `GameSelector.jsx`, `App.jsx`, `NavMenu.jsx`, `LandingPage.jsx`, `LoginPage.jsx`, `GameTeacher.jsx`

## A7: Genre Carousel Recommendations
- **Added**: Horizontal scrolling carousels grouped by complexity (Party / Easy to Learn / Strategists / Brain Burners)
- **Added**: Scroll snap for smooth mobile swiping
- **Added**: Hidden scrollbar CSS for clean carousel appearance
- **Added**: Carousels auto-hide when search or filters are active
- **Files**: `GameSelector.jsx`, `index.css`

## A8: Header Branding Restructure
- **Redesigned**: Header layout with dice emoji icon + "GameMaster AI" title in centered row
- **Added**: Venue name displayed in accent color below title
- **Added**: Tagline and game count as separate subtle lines
- **Files**: `GameSelector.jsx`

## A9: Game Cover Art Display
- **Already done (A1)**: Shimmer loading state on GameCard images
- **Added**: GameCoverThumb component — 40x40 cover art thumbnail in GameTeacher header
- **Added**: Graceful fallback — thumbnail hides if image fails to load
- **Files**: `GameTeacher.jsx`
