# GMAI — Venue Platform Spec
## GMAI-SPEC-WIZARD-SPRINT-20260225
### Wizard (CTO) | February 25, 2026 | For Bard → 4× Barbarian Instances

---

## 0. EXECUTIVE SUMMARY (for Tim)

This spec adds three big things to GMAI:

1. **Self-serve onboarding** — A venue owner clicks a link, fills out 5 steps (info, logo, games, menu, confirm), and their account is fully live. No manual setup needed from us.
2. **Venue dashboard** — The venue owner logs in and sees their own analytics, manages their game library and food/drink menu. Four tabs: Home, Analytics, Library, Menu.
3. **Tim's CRM** — You get a super-admin view of every venue: who's active, who's about to churn, export to CSV, drill into any venue's data.

Four Barbarian instances build it in parallel tonight. No conflicts because each instance touches completely different files.

---

## 1. DATABASE SCHEMA — NEW TABLES & MIGRATIONS

### 1A. ALTER: `venues` table — add onboarding columns

```sql
ALTER TABLE venues ADD COLUMN address TEXT DEFAULT '';
ALTER TABLE venues ADD COLUMN city TEXT DEFAULT '';
ALTER TABLE venues ADD COLUMN state TEXT DEFAULT '';
ALTER TABLE venues ADD COLUMN zip_code TEXT DEFAULT '';
ALTER TABLE venues ADD COLUMN hours_json TEXT DEFAULT '{}';
-- hours_json format: {"mon":"11:00-23:00","tue":"11:00-23:00",...,"sun":"closed"}
ALTER TABLE venues ADD COLUMN contact_name TEXT DEFAULT '';
ALTER TABLE venues ADD COLUMN phone TEXT DEFAULT '';
ALTER TABLE venues ADD COLUMN logo_filename TEXT DEFAULT '';
-- logo stored at: /content/venues/{venue_id}/logo.{ext}
ALTER TABLE venues ADD COLUMN onboarding_step INTEGER DEFAULT 0;
-- 0=not started, 1-5=in progress on that step, 6=complete
ALTER TABLE venues ADD COLUMN onboarding_completed_at TEXT DEFAULT NULL;
```

**Index:** None needed beyond existing `venue_id` PK.

### 1B. NEW TABLE: `venue_games`

Links venues to games from the master 200-game catalog.

```sql
CREATE TABLE venue_games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    -- 1=available for customers, 0=temporarily hidden
    is_featured INTEGER NOT NULL DEFAULT 0,
    -- 1=shows in "Staff Picks" or featured row
    is_priority INTEGER NOT NULL DEFAULT 0,
    -- 1=one of venue's top-20 priority games (used for GOTD/staff_picks pool)
    added_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (venue_id) REFERENCES venues(venue_id),
    UNIQUE(venue_id, game_id)
);

CREATE INDEX idx_venue_games_venue ON venue_games(venue_id);
CREATE INDEX idx_venue_games_active ON venue_games(venue_id, is_active);
```

### 1C. NEW TABLE: `venue_menu_categories`

```sql
CREATE TABLE venue_menu_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (venue_id) REFERENCES venues(venue_id)
);

CREATE INDEX idx_menu_cats_venue ON venue_menu_categories(venue_id);
```

### 1D. NEW TABLE: `venue_menu_items`

```sql
CREATE TABLE venue_menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price_cents INTEGER NOT NULL,
    -- stored in cents to avoid float rounding. $8.50 = 850
    is_available INTEGER NOT NULL DEFAULT 1,
    -- master toggle: item exists on menu
    is_eighty_sixed INTEGER NOT NULL DEFAULT 0,
    -- floor staff toggle: temporarily out. 1=86'd, 0=in stock
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (venue_id) REFERENCES venues(venue_id),
    FOREIGN KEY (category_id) REFERENCES venue_menu_categories(id)
);

CREATE INDEX idx_menu_items_venue ON venue_menu_items(venue_id);
CREATE INDEX idx_menu_items_cat ON venue_menu_items(category_id);
```

### 1E. NEW TABLE: `venue_analytics_daily`

Pre-aggregated daily stats. EventTracker raw events stay in Turso. This table is a nightly rollup plus live increment for "today" — keeps dashboard queries fast without hitting Turso on every page load.

```sql
CREATE TABLE venue_analytics_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id TEXT NOT NULL,
    date TEXT NOT NULL,
    -- ISO date: '2026-02-25'
    sessions_count INTEGER NOT NULL DEFAULT 0,
    questions_count INTEGER NOT NULL DEFAULT 0,
    games_played_count INTEGER NOT NULL DEFAULT 0,
    avg_session_seconds INTEGER NOT NULL DEFAULT 0,
    menu_views_count INTEGER NOT NULL DEFAULT 0,
    orders_count INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (venue_id) REFERENCES venues(venue_id),
    UNIQUE(venue_id, date)
);

CREATE INDEX idx_analytics_daily_venue_date ON venue_analytics_daily(venue_id, date);
```

### 1F. NEW TABLE: `venue_analytics_hourly`

Powers the "busiest hours" heatmap.

```sql
CREATE TABLE venue_analytics_hourly (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id TEXT NOT NULL,
    day_of_week INTEGER NOT NULL,
    -- 0=Monday, 6=Sunday
    hour INTEGER NOT NULL,
    -- 0-23
    sessions_count INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (venue_id) REFERENCES venues(venue_id),
    UNIQUE(venue_id, day_of_week, hour)
);

CREATE INDEX idx_analytics_hourly_venue ON venue_analytics_hourly(venue_id);
```

### 1G. NEW TABLE: `venue_game_stats`

Per-game analytics per venue. Updated on each `game_ended` event.

```sql
CREATE TABLE venue_game_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    sessions_count INTEGER NOT NULL DEFAULT 0,
    questions_count INTEGER NOT NULL DEFAULT 0,
    last_played_at TEXT DEFAULT NULL,
    FOREIGN KEY (venue_id) REFERENCES venues(venue_id),
    UNIQUE(venue_id, game_id)
);

CREATE INDEX idx_game_stats_venue ON venue_game_stats(venue_id);
CREATE INDEX idx_game_stats_sessions ON venue_game_stats(venue_id, sessions_count DESC);
```

### 1H. NEW TABLE: `venue_top_questions`

Stores the most-asked questions per game per venue for the analytics tab.

```sql
CREATE TABLE venue_top_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    question_text TEXT NOT NULL,
    ask_count INTEGER NOT NULL DEFAULT 1,
    last_asked_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (venue_id) REFERENCES venues(venue_id)
);

CREATE INDEX idx_top_questions_venue_game ON venue_top_questions(venue_id, game_id);
```

---

## 2. API ENDPOINTS

### Naming Convention
All new endpoints live under `/api/v1/`. Auth via existing JWT middleware. Role checked per-endpoint.

### 2A. ONBOARDING ENDPOINTS

| Method | Path | Auth | Role | Purpose |
|--------|------|------|------|---------|
| POST | `/api/v1/onboarding/register` | None | — | Create venue account (email + password), returns JWT |
| GET | `/api/v1/onboarding/status` | JWT | venue_admin | Get current onboarding step + saved data |
| PUT | `/api/v1/onboarding/step/1` | JWT | venue_admin | Save venue info (name, address, hours, contact) |
| PUT | `/api/v1/onboarding/step/2` | JWT | venue_admin | Upload logo (multipart form) |
| PUT | `/api/v1/onboarding/step/3` | JWT | venue_admin | Save game collection (list of game_ids + priority flags) |
| PUT | `/api/v1/onboarding/step/4` | JWT | venue_admin | Save menu (categories + items) |
| POST | `/api/v1/onboarding/complete` | JWT | venue_admin | Finalize: set status=active, generate venue_config, mark onboarding_step=6 |
| GET | `/api/v1/games/catalog` | JWT | venue_admin | Returns all 200 games (id, title, complexity, player_count, categories) for step 3 browsing |

#### Request/Response Shapes

**POST `/api/v1/onboarding/register`**
```json
// Request
{
  "venue_name": "Meeple House",
  "email": "owner@meeplehouse.com",
  "password": "securepassword123"
}
// Response 201
{
  "venue_id": "meeple-house",
  "token": "eyJhbG...",
  "onboarding_step": 0
}
```

**PUT `/api/v1/onboarding/step/1`**
```json
// Request
{
  "venue_name": "Meeple House",
  "address": "123 Board St",
  "city": "Portland",
  "state": "OR",
  "zip_code": "97201",
  "phone": "503-555-0199",
  "contact_name": "Alex Chen",
  "hours": {
    "mon": "11:00-23:00",
    "tue": "11:00-23:00",
    "wed": "11:00-23:00",
    "thu": "11:00-00:00",
    "fri": "11:00-01:00",
    "sat": "10:00-01:00",
    "sun": "10:00-22:00"
  }
}
// Response 200
{ "onboarding_step": 1, "saved": true }
```

**PUT `/api/v1/onboarding/step/2`**
```
// Request: multipart/form-data
// Field: "logo" — file upload (png, jpg, webp; max 2MB)
// Response 200
{ "onboarding_step": 2, "logo_filename": "logo.png" }
```

**PUT `/api/v1/onboarding/step/3`**
```json
// Request
{
  "games": [
    { "game_id": "catan", "is_priority": true },
    { "game_id": "ticket-to-ride", "is_priority": true },
    { "game_id": "wingspan", "is_priority": false }
    // ... up to 200 selections, exactly 20 marked is_priority
  ]
}
// Response 200
{ "onboarding_step": 3, "games_count": 85, "priority_count": 20 }
```

**PUT `/api/v1/onboarding/step/4`**
```json
// Request
{
  "categories": [
    {
      "name": "Draft Beer",
      "sort_order": 0,
      "items": [
        { "name": "Hazy IPA", "description": "Local brewery, 6.5%", "price_cents": 850, "sort_order": 0 },
        { "name": "Pilsner", "description": "Light and crisp", "price_cents": 700, "sort_order": 1 }
      ]
    },
    {
      "name": "Snacks",
      "sort_order": 1,
      "items": [
        { "name": "Loaded Nachos", "description": "", "price_cents": 1200, "sort_order": 0 }
      ]
    }
  ]
}
// Response 200
{ "onboarding_step": 4, "categories_count": 2, "items_count": 3 }
```

**POST `/api/v1/onboarding/complete`**
```json
// Request: empty body (all data already saved in steps 1-4)
// Response 200
{
  "venue_id": "meeple-house",
  "status": "active",
  "onboarding_completed_at": "2026-02-25T20:30:00Z",
  "venue_config_generated": true
}
```
Side effects: writes `admin-config.json` entry for this venue with GOTD randomly selected from priority games and staff_picks = first 6 priority games. Sets `venues.status = 'active'`, `venues.onboarding_step = 6`, `venues.trial_start_date = now()`, `venues.trial_duration_days = 14`.

### 2B. VENUE DASHBOARD ENDPOINTS

All require JWT with `role = venue_admin`. Venue ID extracted from token — venues can only see their own data.

| Method | Path | Auth | Role | Purpose |
|--------|------|------|------|---------|
| GET | `/api/v1/venue/dashboard/home` | JWT | venue_admin | Live snapshot: active sessions, games playing, questions today, top game, today's orders |
| GET | `/api/v1/venue/dashboard/analytics` | JWT | venue_admin | Full analytics payload (30-day daily, top games, top questions, heatmap, avg session, player dist) |
| GET | `/api/v1/venue/games` | JWT | venue_admin | Venue's game collection with status flags |
| PUT | `/api/v1/venue/games/{game_id}` | JWT | venue_admin | Toggle is_active, is_featured on a single game |
| PUT | `/api/v1/venue/games/batch` | JWT | venue_admin | Batch update multiple games at once |
| GET | `/api/v1/venue/menu` | JWT | venue_admin | Full menu: categories + items |
| POST | `/api/v1/venue/menu/categories` | JWT | venue_admin | Add a category |
| PUT | `/api/v1/venue/menu/categories/{id}` | JWT | venue_admin | Edit category (name, sort_order, is_active) |
| DELETE | `/api/v1/venue/menu/categories/{id}` | JWT | venue_admin | Delete category (must have 0 items) |
| POST | `/api/v1/venue/menu/items` | JWT | venue_admin | Add menu item |
| PUT | `/api/v1/venue/menu/items/{id}` | JWT | venue_admin | Edit item (name, price, description, sort_order, is_available) |
| PATCH | `/api/v1/venue/menu/items/{id}/86` | JWT | venue_admin | Toggle is_eighty_sixed (floor staff quick action) |
| DELETE | `/api/v1/venue/menu/items/{id}` | JWT | venue_admin | Delete item |
| PUT | `/api/v1/venue/config/gotd` | JWT | venue_admin | Update Game of the Day |
| PUT | `/api/v1/venue/config/staff-picks` | JWT | venue_admin | Update Staff Picks list |

#### Key Response Shapes

**GET `/api/v1/venue/dashboard/home`**
```json
{
  "active_sessions": 4,
  "games_in_play": ["catan", "wingspan", "azul", "codenames"],
  "questions_today": 47,
  "top_game_this_week": { "game_id": "catan", "title": "Catan", "sessions": 23 },
  "orders_today": 12,
  "gotd": { "game_id": "wingspan", "title": "Wingspan" },
  "staff_picks": [
    { "game_id": "catan", "title": "Catan" },
    { "game_id": "azul", "title": "Azul" }
  ]
}
```
**Implementation note:** `active_sessions` and `games_in_play` come from querying EventTracker for `session_start` events in the last 30 minutes that don't have a corresponding `game_ended`. This is approximate and that's fine — it's a live snapshot, not an accounting ledger.

**GET `/api/v1/venue/dashboard/analytics`**
```json
{
  "daily_stats": [
    { "date": "2026-02-25", "sessions": 18, "questions": 47, "games_played": 12 },
    { "date": "2026-02-24", "sessions": 22, "questions": 61, "games_played": 15 }
    // ... 30 days
  ],
  "top_games": [
    { "game_id": "catan", "title": "Catan", "sessions": 45, "questions": 120 },
    // ... top 10
  ],
  "top_questions_by_game": {
    "catan": [
      { "question": "How does trading work?", "count": 12 },
      // ... top 5
    ]
    // ... per game
  },
  "hourly_heatmap": [
    { "day": 0, "hour": 18, "sessions": 8 },
    { "day": 0, "hour": 19, "sessions": 12 },
    // ... 7 days × 24 hours (only non-zero entries)
  ],
  "avg_session_seconds": 1847,
  "player_count_distribution": [
    { "player_count": 2, "sessions": 30 },
    { "player_count": 3, "sessions": 45 },
    { "player_count": 4, "sessions": 52 },
    { "player_count": 5, "sessions": 18 },
    { "player_count": 6, "sessions": 8 }
  ]
}
```

### 2C. CRM ENDPOINTS (super_admin only)

| Method | Path | Auth | Role | Purpose |
|--------|------|------|------|---------|
| GET | `/api/v1/admin/crm/venues` | JWT | super_admin | All venues with summary stats |
| GET | `/api/v1/admin/crm/venues/{venue_id}` | JWT | super_admin | Drill into one venue's full analytics (same shape as venue dashboard analytics) |
| GET | `/api/v1/admin/crm/venues/export` | JWT | super_admin | CSV export of venue list |
| GET | `/api/v1/admin/crm/trial-alerts` | JWT | super_admin | Venues expiring within 7 days |

**GET `/api/v1/admin/crm/venues`**
```json
{
  "venues": [
    {
      "venue_id": "meeple-house",
      "venue_name": "Meeple House",
      "status": "active",
      "trial_days_remaining": 8,
      "last_active_at": "2026-02-25T19:45:00Z",
      "sessions_this_week": 34,
      "top_game": "Catan",
      "games_count": 85,
      "onboarding_step": 6,
      "created_at": "2026-02-18T10:00:00Z"
    }
    // ...
  ],
  "total_venues": 12,
  "active_count": 8,
  "trial_count": 3,
  "expired_count": 1
}
```

**GET `/api/v1/admin/crm/venues/export`**
Returns `Content-Type: text/csv` with headers:
`venue_id,venue_name,email,status,trial_days_remaining,last_active,sessions_this_week,top_game,games_count,created_at`

### 2D. NEW ANALYTICS EVENTS

Added to the existing EventTracker system. Same fire-and-forget pattern.

| Event Name | Trigger | Payload |
|------------|---------|---------|
| `menu_item_viewed` | Customer taps a menu item to see details | `{ venue_id, item_id, category_id }` |
| `game_added_to_collection` | Venue owner adds a game during onboarding or in Library tab | `{ venue_id, game_id, source: "onboarding" \| "library" }` |
| `score_started` | Customer taps "Start Scoring" in the score tracker | `{ venue_id, game_id, player_count }` |
| `order_placed` | Order confirmed (existing Telegram flow + new EventTracker call) | `{ venue_id, items: [{item_id, quantity}], total_cents }` |

**Implementation:** Add these four event names to the EventTracker's known events list. No schema change needed in Turso — events table already has `event_name TEXT, payload_json TEXT`. Each Barbarian instance that builds the UI triggering these events is responsible for adding the `trackEvent()` call at the right point.

---

## 3. LOGO UPLOAD HANDLING

**Storage:** Logos saved to `content/venues/{venue_id}/logo.{ext}` on the backend filesystem.

**Upload flow:**
1. Frontend sends multipart form to `/api/v1/onboarding/step/2`
2. Backend validates: file type (png/jpg/webp), max 2MB, image dimensions ≤ 1024×1024
3. Backend saves to `content/venues/{venue_id}/logo.{ext}`
4. Backend updates `venues.logo_filename`
5. Logo served via existing static file serving at `/content/venues/{venue_id}/logo.{ext}`

**Why not Cloudflare R2 or external CDN:** We're in the $5-20/month budget range. Logos are small, venue count is low (sub-100 for months). Filesystem is fine. When we hit 500+ venues, we revisit.

---

## 4. VENUE CONFIG INTEGRATION

When onboarding completes (`POST /api/v1/onboarding/complete`), the backend must write/update the venue's entry in `admin-config.json` via the existing GitHub API persistence layer.

```json
{
  "meeple-house": {
    "gotd": "wingspan",
    "staff_picks": ["catan", "azul", "ticket-to-ride", "wingspan", "codenames", "splendor"],
    "venue_name": "Meeple House",
    "logo": "/content/venues/meeple-house/logo.png"
  }
}
```

**GOTD:** Randomly selected from the venue's 20 priority games.
**Staff Picks:** First 6 of the venue's priority games (by the order they were selected in onboarding step 3).

The venue dashboard's "Quick-edit GOTD + Staff Picks" buttons (`PUT /api/v1/venue/config/gotd` and `PUT /api/v1/venue/config/staff-picks`) also update this same config via the GitHub API.

---

## 5. FILE LIST — EVERY FILE CREATED OR MODIFIED

### New Files

| # | File Path | Owner Instance | Purpose |
|---|-----------|---------------|---------|
| 1 | `backend/app/models/venue_games.py` | Instance 1 | SQLAlchemy model for venue_games |
| 2 | `backend/app/models/venue_menu.py` | Instance 1 | SQLAlchemy models for venue_menu_categories + venue_menu_items |
| 3 | `backend/app/models/venue_analytics.py` | Instance 1 | SQLAlchemy models for venue_analytics_daily, venue_analytics_hourly, venue_game_stats, venue_top_questions |
| 4 | `backend/app/migrations/004_venue_platform.py` | Instance 1 | Migration script: ALTER venues + CREATE all new tables |
| 5 | `backend/app/api/routes/onboarding.py` | Instance 2 | All onboarding endpoints |
| 6 | `backend/app/services/onboarding.py` | Instance 2 | Onboarding business logic (validation, venue_config generation) |
| 7 | `backend/app/api/routes/venue_dashboard.py` | Instance 3 | All venue dashboard endpoints |
| 8 | `backend/app/services/venue_analytics.py` | Instance 3 | Analytics aggregation, heatmap calc, session counting |
| 9 | `backend/app/api/routes/venue_menu.py` | Instance 3 | All menu CRUD endpoints |
| 10 | `backend/app/api/routes/crm.py` | Instance 4 | All CRM endpoints |
| 11 | `backend/app/services/crm.py` | Instance 4 | CRM aggregation, CSV export, trial alert logic |
| 12 | `frontend/src/pages/Onboarding/OnboardingWizard.jsx` | Instance 2 | Main wizard container with step routing |
| 13 | `frontend/src/pages/Onboarding/steps/VenueInfoStep.jsx` | Instance 2 | Step 1 form |
| 14 | `frontend/src/pages/Onboarding/steps/LogoUploadStep.jsx` | Instance 2 | Step 2 file upload |
| 15 | `frontend/src/pages/Onboarding/steps/GameCollectionStep.jsx` | Instance 2 | Step 3 game browser + selector |
| 16 | `frontend/src/pages/Onboarding/steps/MenuSetupStep.jsx` | Instance 2 | Step 4 menu builder |
| 17 | `frontend/src/pages/Onboarding/steps/ReviewStep.jsx` | Instance 2 | Step 5 review + confirm |
| 18 | `frontend/src/pages/VenueDashboard/VenueDashboard.jsx` | Instance 3 | Dashboard shell with tab navigation |
| 19 | `frontend/src/pages/VenueDashboard/tabs/HomeTab.jsx` | Instance 3 | Live snapshot view |
| 20 | `frontend/src/pages/VenueDashboard/tabs/AnalyticsTab.jsx` | Instance 3 | Charts + heatmap |
| 21 | `frontend/src/pages/VenueDashboard/tabs/LibraryTab.jsx` | Instance 3 | Game collection manager |
| 22 | `frontend/src/pages/VenueDashboard/tabs/MenuTab.jsx` | Instance 3 | Menu editor |
| 23 | `frontend/src/pages/Admin/CRMView.jsx` | Instance 4 | Venue table + drill-down + export |
| 24 | `frontend/src/pages/Admin/VenueDetail.jsx` | Instance 4 | Single venue drill-down (reuses analytics components) |
| 25 | `frontend/src/services/onboardingApi.js` | Instance 2 | API client for onboarding endpoints |
| 26 | `frontend/src/services/venueDashboardApi.js` | Instance 3 | API client for dashboard endpoints |
| 27 | `frontend/src/services/crmApi.js` | Instance 4 | API client for CRM endpoints |
| 28 | `frontend/src/components/charts/BarChart.jsx` | Instance 3 | Reusable bar chart (recharts wrapper) |
| 29 | `frontend/src/components/charts/HeatmapChart.jsx` | Instance 3 | Day×Hour heatmap component |
| 30 | `frontend/src/components/charts/StatCard.jsx` | Instance 3 | Dashboard stat card component |

### Modified Files

| # | File Path | Owner Instance | Change |
|---|-----------|---------------|--------|
| 31 | `backend/app/main.py` | Instance 1 | Register 4 new routers: onboarding, venue_dashboard, venue_menu, crm |
| 32 | `backend/app/models/__init__.py` | Instance 1 | Import new models |
| 33 | `backend/app/core/config.py` | Instance 1 | Add LOGO_UPLOAD_DIR, MAX_LOGO_SIZE_BYTES constants |
| 34 | `frontend/src/App.jsx` | Instance 1 | Add routes: /onboarding, /venue, /admin/crm |
| 35 | `frontend/src/services/api.js` | Instance 1 | Add base URL helpers for new endpoint groups |
| 36 | `backend/app/services/event_tracker.py` | Instance 4 | Add 4 new event names to known events |

---

## 6. SPLIT PLAN — 4 BARBARIAN INSTANCES

### Ground Rules
- **Zero shared file edits.** Each instance creates its own files. Only Instance 1 modifies shared files (main.py, App.jsx, etc.).
- **Instance 1 finishes first.** It creates the database layer and modifies shared files. Instances 2-4 wait for Instance 1 to commit before starting.
- **Instances 2, 3, 4 run in parallel** once Instance 1 is done. They touch completely different files.

---

### INSTANCE 1: Foundation (Database + Routing Shell)

**Mission:** Create all database tables, models, and wire up the routing skeleton. Every other instance depends on this.

**Files to CREATE:**
- `backend/app/models/venue_games.py`
- `backend/app/models/venue_menu.py`
- `backend/app/models/venue_analytics.py`
- `backend/app/migrations/004_venue_platform.py`

**Files to MODIFY:**
- `backend/app/main.py` — add 4 router includes (import stubs that will 404 until Instances 2-4 fill them in):
  ```python
  from app.api.routes import onboarding, venue_dashboard, venue_menu, crm
  app.include_router(onboarding.router, prefix="/api/v1/onboarding", tags=["onboarding"])
  app.include_router(venue_dashboard.router, prefix="/api/v1/venue", tags=["venue"])
  app.include_router(venue_menu.router, prefix="/api/v1/venue/menu", tags=["venue-menu"])
  app.include_router(crm.router, prefix="/api/v1/admin/crm", tags=["crm"])
  ```
  **CRITICAL:** Create placeholder route files with empty routers so the app doesn't crash on import:
  ```python
  # backend/app/api/routes/onboarding.py (placeholder)
  from fastapi import APIRouter
  router = APIRouter()
  ```
  Create one placeholder for each: `onboarding.py`, `venue_dashboard.py`, `venue_menu.py`, `crm.py`
- `backend/app/models/__init__.py` — import new models
- `backend/app/core/config.py` — add constants
- `frontend/src/App.jsx` — add route entries (pointing to placeholder pages)
- `frontend/src/services/api.js` — add base helpers

**Acceptance criteria:**
1. `python -m app.migrations.004_venue_platform` runs without error
2. All 7 new tables exist in SQLite with correct columns and indexes
3. `venues` table has new columns
4. Backend starts without import errors
5. Frontend builds without errors
6. Git commit pushed

**Estimated time:** 45-60 minutes.

**SIGNAL WHEN DONE:** Barbarian emails `[GMAI-LOG] Instance 1 Foundation Complete — DB + routing ready`

---

### INSTANCE 2: Onboarding Wizard

**Depends on:** Instance 1 complete.

**Mission:** Full self-serve onboarding flow. Venue owner goes from zero to active venue in 5 steps.

**Files to CREATE:**
- `backend/app/api/routes/onboarding.py` (REPLACES Instance 1's placeholder)
- `backend/app/services/onboarding.py`
- `frontend/src/pages/Onboarding/OnboardingWizard.jsx`
- `frontend/src/pages/Onboarding/steps/VenueInfoStep.jsx`
- `frontend/src/pages/Onboarding/steps/LogoUploadStep.jsx`
- `frontend/src/pages/Onboarding/steps/GameCollectionStep.jsx`
- `frontend/src/pages/Onboarding/steps/MenuSetupStep.jsx`
- `frontend/src/pages/Onboarding/steps/ReviewStep.jsx`
- `frontend/src/services/onboardingApi.js`

**Files to MODIFY:** None. Instance 1 already wired the router and route.

**Key implementation details:**

1. **Registration creates the venue immediately** with `status='onboarding'`, `role='venue_admin'`, `onboarding_step=0`. Returns JWT so the rest of the wizard is authenticated.

2. **Each step saves independently.** Venue owner can close browser, come back later, resume from where they left off. `GET /api/v1/onboarding/status` returns all previously saved data.

3. **Step 3 (Game Collection):** Frontend loads `/api/v1/games/catalog` which returns all 200 games. UI shows a searchable/filterable grid. Venue owner checks games they own. Must select at least 10, at most 200. Must mark exactly 20 as "priority" (used for GOTD/staff picks). Show a counter: "12 games selected, 8/20 priority slots used."

4. **Step 4 (Menu):** Dynamic form. "Add Category" button creates a named category. Within each category, "Add Item" creates an item row (name, description, price). Drag-to-reorder for sort_order. Minimum: 0 categories (menu is optional). No maximum.

5. **Step 5 (Review):** Read-only summary of everything. "Confirm & Launch" button calls `POST /api/v1/onboarding/complete`.

6. **Logo upload:** Use `<input type="file" accept="image/*">`. Preview image client-side before upload. Backend validates file type and size server-side.

7. **Onboarding complete side effects** (in `services/onboarding.py`):
   - Set `venues.status = 'active'`
   - Set `venues.onboarding_step = 6`
   - Set `venues.trial_start_date = now()`
   - Set `venues.trial_duration_days = 14`
   - Set `venues.onboarding_completed_at = now()`
   - Write venue config to admin-config.json via GitHub API
   - Fire `trackEvent('onboarding_completed', { venue_id })`

**Acceptance criteria:**
1. Navigate to `/onboarding` → see step 1 form
2. Complete all 5 steps with valid data
3. Venue appears in `venues` table with status='active'
4. Games appear in `venue_games` table
5. Menu appears in `venue_menu_categories` + `venue_menu_items`
6. Logo file exists on disk
7. admin-config.json updated with new venue's GOTD + staff picks
8. Refreshing mid-wizard resumes at correct step
9. Validation errors shown inline (empty required fields, bad email format, logo too large)

**Estimated time:** 2-3 hours.

---

### INSTANCE 3: Venue Dashboard

**Depends on:** Instance 1 complete.

**Mission:** Four-tab dashboard for venue owners. Home (live snapshot), Analytics (charts), Library (game manager), Menu (editor).

**Files to CREATE:**
- `backend/app/api/routes/venue_dashboard.py` (REPLACES Instance 1's placeholder)
- `backend/app/api/routes/venue_menu.py` (REPLACES Instance 1's placeholder)
- `backend/app/services/venue_analytics.py`
- `frontend/src/pages/VenueDashboard/VenueDashboard.jsx`
- `frontend/src/pages/VenueDashboard/tabs/HomeTab.jsx`
- `frontend/src/pages/VenueDashboard/tabs/AnalyticsTab.jsx`
- `frontend/src/pages/VenueDashboard/tabs/LibraryTab.jsx`
- `frontend/src/pages/VenueDashboard/tabs/MenuTab.jsx`
- `frontend/src/services/venueDashboardApi.js`
- `frontend/src/components/charts/BarChart.jsx`
- `frontend/src/components/charts/HeatmapChart.jsx`
- `frontend/src/components/charts/StatCard.jsx`

**Files to MODIFY:** None.

**Key implementation details:**

1. **Home Tab:**
   - StatCards across the top: Active Sessions, Questions Today, Orders Today
   - "Games Being Played Right Now" — live list, auto-refresh every 60s
   - "Most Popular This Week" — single highlighted game card
   - GOTD quick-edit: dropdown of priority games, select → PUT to config endpoint
   - Staff Picks quick-edit: multi-select from priority games (max 6), save

2. **Analytics Tab:**
   - Bar chart: "Games Played Per Day" — last 30 days, recharts `<BarChart>`
   - Horizontal bar chart: "Top 10 Games" by session count
   - Collapsible per-game sections: "Most Asked Questions" — show top 5 per game
   - Heatmap: 7×24 grid, day-of-week vs hour, color intensity = session count. Use a simple div grid with CSS background-color opacity. No heavy charting library needed.
   - Stat cards: Avg Session Length (formatted as "12m 34s"), Player Count Distribution (small horizontal bar)

3. **Library Tab:**
   - Table: Game name | Complexity | Players | Active (toggle) | Featured (toggle)
   - Search bar (filters by title)
   - Filter dropdown: complexity, player count
   - Bulk actions: "Deactivate Selected", "Feature Selected"
   - "Add Games" button → modal with same game browser as onboarding step 3 (consider extracting to shared component, but for tonight, copy-paste is fine)

4. **Menu Tab:**
   - Left sidebar: category list with drag-to-reorder
   - Main area: items in selected category
   - Each item row: name, price (editable inline), availability toggle, 86 toggle (red highlight when 86'd)
   - "Add Category" button at bottom of sidebar
   - "Add Item" button at bottom of item list
   - Edit item: click row → inline edit or modal
   - Delete: swipe or trash icon with confirm

5. **Venue scoping:** Every dashboard endpoint extracts `venue_id` from the JWT. No venue_id in the URL. This prevents venues from snooping on each other even if they guess a venue_id.

6. **Analytics data source:** For tonight, query EventTracker (Turso) directly in the analytics service. The `venue_analytics_daily` rollup table is for future optimization. Write a TODO comment noting that a nightly cron should populate the rollup tables. For tonight, live queries against Turso are fine — our venue count is single-digits.

**Acceptance criteria:**
1. Login as venue_admin → redirected to `/venue/dashboard`
2. Home tab shows live stats (or zeros if no data yet)
3. Analytics tab renders all charts with sample/real data
4. Library tab lists venue's games, toggles work, search works
5. Menu tab CRUD all works: add/edit/delete categories and items
6. 86 toggle visually highlights the item and persists
7. GOTD and Staff Picks edits persist and show on customer-facing app

**Estimated time:** 3-4 hours.

---

### INSTANCE 4: CRM + Analytics Events

**Depends on:** Instance 1 complete.

**Mission:** Tim's super-admin CRM view + wire up the 4 new analytics events across the system.

**Files to CREATE:**
- `backend/app/api/routes/crm.py` (REPLACES Instance 1's placeholder)
- `backend/app/services/crm.py`
- `frontend/src/pages/Admin/CRMView.jsx`
- `frontend/src/pages/Admin/VenueDetail.jsx`
- `frontend/src/services/crmApi.js`

**Files to MODIFY:**
- `backend/app/services/event_tracker.py` — add 4 new event names to the known events list/enum

**Key implementation details:**

1. **CRM Table View:**
   - Sortable table columns: Venue Name, Status (badge: green=active, yellow=trial, red=expired), Trial Days Remaining, Last Active, Sessions This Week, Top Game, Games Count
   - Search by venue name
   - Filter by status (all, active, trial, expired)
   - "Export CSV" button → calls `/api/v1/admin/crm/venues/export`, browser downloads file
   - Click venue row → navigate to `/admin/crm/{venue_id}`

2. **Trial Alerts:**
   - Yellow banner at top of CRM: "3 venues expiring in 7 days" with venue names linked
   - Computed from `trial_start_date + trial_duration_days` vs today

3. **Venue Detail (drill-down):**
   - Header: venue name, status badge, contact info, logo
   - Same analytics layout as the venue dashboard's Analytics tab
   - **Reuse strategy:** Instance 3 builds the chart components. Instance 4 imports them. If Instance 3 isn't done yet, Instance 4 builds a simplified version with raw data tables and a TODO to swap in charts later. This is the one acceptable cross-instance dependency.

4. **CSV Export format:**
   ```
   venue_id,venue_name,email,status,trial_days_remaining,last_active,sessions_this_week,top_game,games_count,created_at
   meeple-house,Meeple House,owner@meeplehouse.com,active,8,2026-02-25T19:45:00Z,34,Catan,85,2026-02-18T10:00:00Z
   ```

5. **New analytics events wiring:**
   - `menu_item_viewed`: Fire in the customer-facing menu component when an item detail is expanded/tapped. If the customer menu component doesn't exist yet (it's a separate feature), add the `trackEvent` call in a shared utility with a comment noting where it should be called from.
   - `game_added_to_collection`: Fire in onboarding step 3 (Instance 2's code) AND in Library tab "Add Games" (Instance 3's code). Since Instance 4 can't edit those files, **Instance 4 creates a utility function** in `frontend/src/services/analyticsEvents.js` that wraps `trackEvent` for each new event. Instance 2 and Instance 3 import and call it. Include this in the integration notes.
   - `score_started`: Fire when the score tracker feature is triggered. Add the call to the existing score tracker component if it exists, otherwise document where it should go.
   - `order_placed`: Add `trackEvent('order_placed', ...)` alongside the existing Telegram notification in the order flow.

6. **Analytics events utility file** (created by Instance 4, used by all):
   ```javascript
   // frontend/src/services/analyticsEvents.js
   import { trackEvent } from './api';
   
   export const trackMenuItemViewed = (venueId, itemId, categoryId) =>
     trackEvent('menu_item_viewed', { venue_id: venueId, item_id: itemId, category_id: categoryId });
   
   export const trackGameAddedToCollection = (venueId, gameId, source) =>
     trackEvent('game_added_to_collection', { venue_id: venueId, game_id: gameId, source });
   
   export const trackScoreStarted = (venueId, gameId, playerCount) =>
     trackEvent('score_started', { venue_id: venueId, game_id: gameId, player_count: playerCount });
   
   export const trackOrderPlaced = (venueId, items, totalCents) =>
     trackEvent('order_placed', { venue_id: venueId, items, total_cents: totalCents });
   ```

**Acceptance criteria:**
1. Login as super_admin → navigate to `/admin/crm`
2. All venues appear in table with correct stats
3. Sort by any column works
4. Filter by status works
5. Click venue → drill into detail view with analytics
6. "Export CSV" downloads valid CSV file
7. Trial alert banner shows venues expiring within 7 days
8. `analyticsEvents.js` utility file exists and exports all 4 tracking functions
9. `event_tracker.py` recognizes the 4 new event names

**Estimated time:** 2-3 hours.

---

## 7. INTEGRATION POINTS & DEPENDENCY ORDER

```
┌─────────────────┐
│   INSTANCE 1    │ ◄── MUST FINISH FIRST
│   Foundation    │     (DB + routing + shared files)
│   ~60 min       │
└────────┬────────┘
         │
         │  git commit + [GMAI-LOG] signal
         │
    ┌────┴────┬────────────┐
    ▼         ▼            ▼
┌────────┐ ┌────────┐ ┌────────┐
│ INST 2 │ │ INST 3 │ │ INST 4 │  ◄── RUN IN PARALLEL
│Onboard │ │Dashboard│ │CRM+Evt │
│ ~2-3hr │ │ ~3-4hr │ │ ~2-3hr │
└────────┘ └────────┘ └────────┘
```

### Explicit Dependencies

| Dependency | Blocker | Blocked | Mitigation |
|------------|---------|---------|------------|
| DB tables must exist | Instance 1 | Instances 2, 3, 4 | Instance 1 finishes first (hard gate) |
| Router placeholders in main.py | Instance 1 | Instances 2, 3, 4 | Instance 1 creates empty routers |
| Routes in App.jsx | Instance 1 | Instances 2, 3, 4 | Instance 1 adds route entries |
| Chart components | Instance 3 | Instance 4 (venue detail drill-down) | Instance 4 builds data tables first, swaps charts in later |
| analyticsEvents.js | Instance 4 | Instances 2, 3 (calling trackEvent) | Instances 2, 3 add import + call as final step; if Instance 4 isn't done, use inline trackEvent calls |
| Game catalog endpoint | Instance 2 (uses it) | None | Catalog endpoint reads from existing games table — no new work needed, it's a read-only query |

### Git Merge Order

1. Instance 1 merges to `main` first
2. Instances 2, 3, 4 each branch from Instance 1's commit
3. Instances 2, 3, 4 merge in any order (no file conflicts by design)
4. Final: one integration test pass after all 4 merge

---

## 8. RISK FLAGS

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| 1 | **Turso query performance** for live analytics | Analytics tab could be slow if Turso has 100K+ events | For tonight: acceptable. Add pagination. Future: populate rollup tables nightly. |
| 2 | **Logo upload on Render.com** — ephemeral filesystem | Logos disappear on redeploy | **CRITICAL:** Logos must be stored in the SQLite DB as BLOBs OR pushed to the GitHub repo via API. Filesystem storage only works if Render has persistent disk. **Decision: Store logo as base64 in a `venue_logos` table (single-column BLOB). Serve from memory.** This is ugly but reliable. Revisit with R2 when budget allows. |
| 3 | **admin-config.json write conflicts** | Two instances could write config simultaneously | Instance 1 and Instance 2 both write config. Use a simple file lock (fcntl) or serialize writes through a single service function. |
| 4 | **JWT role check gaps** | If a venue_admin endpoint forgets auth, data leaks | Every route file must start with `current_user = get_current_venue_admin(token)` dependency. Instance 1 should create this shared dependency function. |
| 5 | **Onboarding step 3 loads 200 games at once** | Slow on mobile | Games catalog is ~200 items × ~100 bytes = ~20KB JSON. Fine. No pagination needed. |
| 6 | **Menu price stored as cents** | Frontend must convert display. Division errors. | Use a shared `formatPrice(cents)` utility: `(cents / 100).toFixed(2)`. Create in `frontend/src/utils/format.js`. Instance 1 should create this utility. |
| 7 | **Cross-instance import of analyticsEvents.js** | Instance 2/3 may not know the exact import path | Spec defines the exact path: `frontend/src/services/analyticsEvents.js`. All instances use this path. |
| 8 | **Existing EventTracker fire-and-forget may drop events** | Analytics undercounts | Acceptable for tonight. Future: add retry queue. |

### Risk #2 Resolution — Logo Storage

**Revised approach based on Render.com constraints:**

Replace `venues.logo_filename` with:

```sql
CREATE TABLE venue_logos (
    venue_id TEXT PRIMARY KEY,
    logo_data BLOB NOT NULL,
    content_type TEXT NOT NULL,
    -- 'image/png', 'image/jpeg', 'image/webp'
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (venue_id) REFERENCES venues(venue_id)
);
```

Serve logos via: `GET /api/v1/venues/{venue_id}/logo` — returns binary with correct Content-Type header. Add cache-control headers (`max-age=86400`) so browsers cache it.

**Instance 1 adds this table. Instance 2 uses it for upload/serve.**

---

## 9. SHARED UTILITIES (Instance 1 Creates These)

Instance 1 is responsible for creating these shared pieces that other instances import:

### Backend

```python
# backend/app/api/deps.py (add to existing or create)

async def get_current_venue_admin(token: str = Depends(oauth2_scheme)) -> dict:
    """Decode JWT, verify role is venue_admin, return user dict with venue_id."""
    payload = decode_jwt(token)
    if payload.get("role") not in ("venue_admin", "super_admin"):
        raise HTTPException(403, "Not authorized")
    return payload

async def get_current_super_admin(token: str = Depends(oauth2_scheme)) -> dict:
    """Decode JWT, verify role is super_admin."""
    payload = decode_jwt(token)
    if payload.get("role") != "super_admin":
        raise HTTPException(403, "Super admin required")
    return payload
```

### Frontend

```javascript
// frontend/src/utils/format.js
export const formatPrice = (cents) => `$${(cents / 100).toFixed(2)}`;
export const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
};
```

---

## 10. TESTING CHECKLIST (Post-Merge Integration)

After all 4 instances merge, one Barbarian runs this full integration pass:

1. **Fresh start:** Delete SQLite DB, run migration, verify all tables created
2. **Onboarding flow:** Register new venue → complete all 5 steps → verify DB state
3. **Login as venue_admin:** See dashboard with zeros → verify no errors
4. **Simulate activity:** Manually insert 50 EventTracker rows → verify analytics populate
5. **Library management:** Toggle games active/inactive, toggle featured → verify changes persist
6. **Menu management:** Full CRUD on categories and items → verify 86 toggle
7. **CRM view:** Login as super_admin → see all venues → export CSV → verify file contents
8. **Trial alerts:** Create a venue with trial expiring in 3 days → verify alert banner
9. **Logo upload:** Upload a 500KB PNG → verify it serves back correctly at the logo URL
10. **Config sync:** Change GOTD via dashboard → verify admin-config.json updated
11. **Cross-role security:** Try accessing `/api/v1/admin/crm/venues` with a venue_admin JWT → verify 403
12. **Analytics events:** Verify all 4 new event types appear in EventTracker after triggering their UI actions

---

*END OF SPEC — Wizard out. Bard, slice it and send it.*
