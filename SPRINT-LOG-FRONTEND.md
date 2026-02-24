# Frontend Sprint Log
Started: 2026-02-23T00:00:00Z

## Phases
| Phase | Description | Status | Notes |
|-------|-------------|--------|-------|
| A1 | Kiosk Mode | DONE | Fullscreen on tap, touch-action: manipulation, overscroll-behavior: none, user-select: none, context menu blocked, swipe-back prevented, 3min idle timeout with "Still playing?" prompt, viewport meta updated |
| A2 | PWA Manifest + Icons | DONE | manifest.json with standalone display, SVG icons (192/512), Apple meta tags, theme-color |
| A3 | Dark Mode | DONE | CSS custom properties on :root, all hardcoded colors replaced with variables, dark mode default |
| A4 | Venue Branding UI | DONE | Fetches GET /api/venue, mock fallback (Meepleville), header shows venue name, accent_color overrides --accent variable |
| A5 | Game Cover Art in Selector | DONE | Image cards with /api/images/{game_id}.jpg, fallback colored cards by complexity, gradient overlay with title text |
| A6 | Score Tracker UI | DONE | Score FAB on game teacher, player setup modal, count/boolean/manual scoring types, running totals, results with winner glow, mock configs for Catan/Wingspan/Ticket to Ride |
| A7 | "Buy This Game" Banner | DONE | Subtle banner below tabs with accent border-left, price display for demo games, venue config text fallback |
| A8 | Feedback Buttons on Q&A | DONE | Thumbs up/down after each AI response, POST /api/feedback, "Thanks!" toast, one-vote-per-response, silent fail |
| A9 | Recently Played | DONE | localStorage array (max 8), "Recently Played" section above grid, smaller cards, clears on kiosk idle |
| A10 | Landing Page | DONE | Hero section, value props (3 columns), How It Works (3 steps), Pricing tiers (Starter/Standard/Premium), Contact form with API/mailto fallback |
| A11 | QR Code Generator Page | DONE | /admin/qr route, table count input (1-30), venue URL, SVG QR placeholders, print button |
| A12 | Venue Stats Page | DONE | /admin/stats route, big number stats, top 10 popular games, auto-refresh 60s, mock data fallback |
| A13 | Game Timer | DONE | Timer icon in game teacher header, start/pause/resume, HH:MM:SS elapsed display |
| A14 | Polish Pass | pending | |
