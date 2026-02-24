# Frontend Sprint 2 Log
Started: 2026-02-23

## Phases
| Phase | Description | Status |
|-------|-------------|--------|
| A1 | Navigation Menu | DONE | Slide-in drawer, hamburger icon, public + admin items, venue name header, overlay, swipe-to-close, Escape key, auto-close on navigate |
| A2 | Login Page | DONE | /login route, email/password form, error display, demo login (demo@meepleville.com/demo), redirect if already logged in, session expired message |
| A3 | Auth Context + Protected Routes | DONE | AuthContext with login/logout/token, ProtectedRoute wrapper, 401 auto-logout, Bearer token on admin API calls |
| A4 | MSRP Price Badge | DONE | Removed BuyBanner, added subtle price badge next to title, comprehensive MSRP data for all 50 games by complexity tier |
| A5 | Venue Settings Page | DONE | /admin/settings (protected), name/tagline/color/logo/theme fields, live preview card, save with toast, color picker |
| A6 | Venue Game Collection Manager | DONE | /admin/collection (protected), checkbox grid, search/filter, select all/clear, save with count badge, localStorage fallback |
| A7 | Updated Game Selector with Collection Filter | DONE | Fetches venue collection, filters display, game count badge, falls back to show all in demo mode |
| A8 | Logout + Session Management | DONE | Logout clears localStorage + redirects, 401 auto-logout via API interceptor, session expired message on login page |
| A9 | Polish Navigation + Responsive | DONE | Hamburger always visible, Breadcrumb component, Escape closes menu, pages have padding-top for menu button, smooth slide animation |
| A10 | Polish Pass | pending |
