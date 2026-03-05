# GMAI-TASK-BARBARIAN-ANALYTICS-CRM-20260226
## From: Bard (CoS)
## To: Barbarian (Field Engineer)
## Priority: High
## Depends On: Existing EventTracker.js, Turso analytics DB, existing /admin/crm route

---

## Context

Tim wants a K2-style analytics and CRM dashboard for GameMaster Guide. The goal is device-level behavioral tracking so he can show venue owners exactly how customers interact with the app — what they search, what questions they ask, how long they play before ordering food, how often they use voice features, and whether they come back.

This data is the sales weapon: "Your customers browse 3.2 games, ask 4.7 questions per session, and order food within 12 minutes of starting a game."

**Reference:** The K2 Analytics dashboard (patron behavior tracking & CRM) is the visual and functional model. Dark theme, summary cards across the top, dwell time per page, expandable customer/device table with full session details.

**Existing foundation:**
- EventTracker.js already batches events to `/api/v1/analytics/events` with 10s auto-flush and sendBeacon on unload
- Events currently tracked: app_loaded, session_start, tab_viewed, question_asked, response_delivered, game_ended, score_started, order_placed, menu_item_viewed, game_added_to_collection
- Turso (libsql) analytics DB is configured on Render with env vars set
- Per-venue analytics tables exist: venue_analytics_daily, venue_analytics_hourly, venue_game_stats, venue_top_questions

This task expands tracking coverage and builds the visualization dashboard.

---

## PHASE 1: Expand Event Tracking

### 1A. Device Fingerprinting

Create a device identifier that persists across sessions for the same browser/device. This enables return visitor detection.

**Approach:**
- Generate a UUID on first visit, store in localStorage as `gmai_device_id`
- On every event, include `device_id` in the payload
- Collect device metadata on first visit:
  - `device_name`: Derive from User-Agent (e.g., "iPhone 14 Pro / 15", "Samsung Galaxy S22+", "Windows — Chrome 145", "iPad Air")
  - `platform`: One of: iOS, Android, Desktop, Tablet
  - `screen_resolution`: `window.screen.width x window.screen.height`
  - `user_agent`: Full UA string (for debugging)
- Backend stores device profile in a `devices` table
- Mark devices as `RETURN` when `visit_count > 1`

**Devices table schema:**
```sql
CREATE TABLE devices (
    device_id TEXT PRIMARY KEY,
    device_name TEXT,
    platform TEXT,
    screen_resolution TEXT,
    user_agent TEXT,
    venue_id TEXT,
    first_seen_at TIMESTAMP,
    last_seen_at TIMESTAMP,
    visit_count INTEGER DEFAULT 1,
    total_sessions INTEGER DEFAULT 0,
    total_events INTEGER DEFAULT 0
);
```

### 1B. New Events to Track

Add these events to EventTracker.js. Every event must include: `device_id`, `venue_id`, `session_id`, `timestamp`, and the event-specific properties listed below.

| Event Name | Trigger | Properties |
|------------|---------|------------|
| `page_viewed` | Every route change | `page` (path), `referrer_page` (previous path) |
| `page_dwell` | On route change or unload (measures time on previous page) | `page`, `dwell_seconds` |
| `game_selected` | User taps a game card | `game_id`, `game_title`, `source` (search/carousel/staff_pick/gotd/browse) |
| `game_search` | User types in search bar (debounced 1s) | `query`, `results_count`, `results_shown` (first 5 game_ids) |
| `filter_applied` | User selects any filter | `filter_type` (players/time/difficulty/best_for), `filter_value` |
| `tab_switched` | User switches Setup/Rules/Strategy/Q&A/Score tab | `game_id`, `from_tab`, `to_tab` |
| `tab_dwell` | On tab switch or game exit (measures time on previous tab) | `game_id`, `tab`, `dwell_seconds` |
| `question_asked` | (Already exists — EXPAND properties) | `game_id`, `question_text`, `question_length`, `input_method` (voice/text) |
| `response_delivered` | (Already exists — EXPAND) | `game_id`, `response_length`, `response_time_ms` |
| `tts_played` | User plays text-to-speech on any tab | `game_id`, `tab`, `content_type` (setup/rules/strategy/ai_response) |
| `tts_paused` | User pauses TTS | `game_id`, `tab`, `listened_seconds` |
| `tts_completed` | TTS finishes playing fully | `game_id`, `tab`, `total_seconds` |
| `voice_input_used` | User taps mic button | `game_id`, `success` (true/false), `transcript_length` |
| `order_placed` | (Already exists — EXPAND) | `game_id` (which game they were playing), `items` (array of {name, qty, price}), `subtotal`, `minutes_since_game_start` |
| `menu_browsed` | User opens order panel | `game_id`, `minutes_since_game_start` |
| `menu_item_viewed` | (Already exists — EXPAND) | `game_id`, `item_name`, `category`, `price` |
| `score_player_added` | User adds a player in Score tab | `game_id`, `player_count` |
| `score_updated` | User enters/changes a score | `game_id`, `player_count`, `round_number` |
| `game_ended` | (Already exists — EXPAND) | `game_id`, `total_play_time_seconds`, `total_questions_asked`, `ordered_during_game` (bool) |
| `session_ended` | On tab close/navigate away (sendBeacon) | `total_duration_seconds`, `games_viewed`, `games_played`, `questions_asked`, `orders_placed` |
| `notes_edited` | User types in notes area (debounced 5s) | `game_id`, `note_length` |
| `copy_response` | User taps copy on AI response | `game_id` |
| `paste_to_notes` | User taps paste in notes | `game_id` |

### 1C. Backend Event Ingestion

Expand the existing `/api/v1/analytics/events` endpoint:

- Accept `device_id` on every event
- Upsert device record in `devices` table on every batch
- Store all raw events in an `events` table:

```sql
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name TEXT NOT NULL,
    device_id TEXT NOT NULL,
    venue_id TEXT,
    session_id TEXT,
    game_id TEXT,
    properties TEXT,  -- JSON blob of event-specific data
    timestamp TIMESTAMP NOT NULL,
    FOREIGN KEY (device_id) REFERENCES devices(device_id)
);

CREATE INDEX idx_events_device ON events(device_id);
CREATE INDEX idx_events_venue ON events(venue_id);
CREATE INDEX idx_events_name ON events(event_name);
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_game ON events(game_id);
```

Also create a `sessions` table for aggregated session data:

```sql
CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    venue_id TEXT,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    games_viewed INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    questions_asked INTEGER DEFAULT 0,
    orders_placed INTEGER DEFAULT 0,
    tts_uses INTEGER DEFAULT 0,
    voice_inputs INTEGER DEFAULT 0,
    pages_visited TEXT,  -- JSON array of pages
    FOREIGN KEY (device_id) REFERENCES devices(device_id)
);
```

### 1D. Stage Names

When a user enters player names (in Score tab or lobby), associate those names with the device_id for that session. Store in a `device_names` table:

```sql
CREATE TABLE device_names (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    name TEXT NOT NULL,
    session_id TEXT,
    seen_at TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(device_id)
);
```

This lets the CRM show "2 names" or "azx, Jordan" next to a device — same as K2.

---

## PHASE 2: Analytics Dashboard UI

### 2A. Route & Access

- **URL:** `/admin/analytics` (super_admin only)
- **Also accessible from:** venue dashboard Analytics tab (venue_admin — scoped to their venue only)
- **Design:** Dark theme matching K2 Analytics reference. Navy/dark background, card-based layout, green/blue accent colors.

### 2B. Top Summary Cards (full width row)

Display these metrics as cards across the top. All filterable by date range picker and venue selector.

| Card | Metric | Calculation |
|------|--------|------------|
| TOTAL DEVICES | Count | Unique device_ids in period |
| RETURNING | Percentage + count | Devices with visit_count > 1 |
| AVG NAMES/DEVICE | Number | Average player names per device |
| AVG VISITS | Number | Average visit_count per device |
| AVG SESSION | Duration | Average session duration_seconds |
| AVG ORDER | Dollar amount | Average order subtotal (orders only) |
| TOTAL EVENTS | Count | Total events in period |
| TOP GAME | Game title + play count | Most selected game |

### 2C. Avg Dwell Time per Page Row

Horizontal row of pill/chip elements showing average dwell time per page route:

`/games 2m 10s` `/game/{id} 8m 30s` `/score 5m 45s` `/order 1m 20s` `/venue/dashboard 45s`

Calculate from `page_dwell` events.

### 2D. Avg Dwell Time per Tab Row

Same pill layout but for in-game tabs:

`Setup 1m 30s` `Rules 3m 15s` `Strategy 2m 05s` `Q&A 4m 40s` `Score 6m 20s`

Calculate from `tab_dwell` events.

### 2E. Customers Table

Main table below the summary cards. One row per device. Columns:

| Column | Source |
|--------|--------|
| Device | `device_name` from devices table |
| RETURN badge | Show green "RETURN" badge if visit_count > 1 |
| Platform | `platform` — show as colored pill (iOS=blue, Android=green, Desktop=gray) |
| Visits | `visit_count` |
| Stage Names | Comma-separated names from device_names table |
| Games Played | Count of distinct game_ids from game_selected events |
| Questions | Count of question_asked events |
| TTS Uses | Count of tts_played events |
| Orders | Count of order_placed events |
| Spent | Sum of order subtotals |
| Avg Session | Average session duration for this device |
| Events | Total event count |
| Last Active | Most recent event timestamp |

**Expandable rows:** Clicking the ► arrow on any row expands to show:
- **Session timeline:** Chronological list of this device's events with timestamps
- **Games browsed:** List of games viewed with time spent on each
- **Questions asked:** Full text of every question, grouped by game
- **Orders placed:** Items ordered with timestamps and which game they were playing
- **TTS usage:** Which tabs/games they listened to, duration
- **Voice vs text ratio:** Pie chart or simple fraction

**Sorting:** Clickable column headers, sort asc/desc.

**"Expand All" button** in top-right of table (same as K2).

### 2F. Filters & Controls

- **Date range picker** (top right): Start date → End date. Defaults to "Last 7 days."
- **Venue selector** (top right, super_admin only): Dropdown of all venues + "All Venues" option.
- **Export CSV** button: Exports the customers table with all columns.
- **Refresh** button: Re-fetches all data.

### 2G. Additional Dashboard Sections (below customers table)

**Top Questions Asked (across all games)**
- Table: Rank | Question | Game | Times Asked
- Top 20, sorted by frequency
- Useful for identifying what customers struggle with most

**Top Games by Usage**
- Bar chart: horizontal bars showing play count per game
- Top 15 games

**Time to First Order**
- Distribution chart: How many minutes after starting a game do customers place their first order?
- Buckets: 0-5min, 5-10min, 10-15min, 15-20min, 20-30min, 30min+
- This is the money stat for venue owners

**Voice vs Text Input**
- Simple donut chart showing percentage of questions asked via voice vs typed
- Shows the value of voice AI

**Peak Usage Hours**
- Heatmap (day of week × hour of day) showing session density
- Helps venues understand when the app gets the most use

---

## PHASE 2 BACKEND: API Endpoints

Create these endpoints to power the dashboard. All require super_admin or venue_admin auth.

| Endpoint | Method | Returns |
|----------|--------|---------|
| `/api/v1/analytics/summary` | GET | Summary card metrics (with date range + venue filters) |
| `/api/v1/analytics/devices` | GET | Paginated device list with all columns |
| `/api/v1/analytics/devices/{device_id}` | GET | Full device detail (expanded row data) |
| `/api/v1/analytics/devices/{device_id}/timeline` | GET | Chronological event timeline for device |
| `/api/v1/analytics/dwell/pages` | GET | Average dwell time per page |
| `/api/v1/analytics/dwell/tabs` | GET | Average dwell time per tab |
| `/api/v1/analytics/top-questions` | GET | Top 20 questions with game + count |
| `/api/v1/analytics/top-games` | GET | Top 15 games by usage |
| `/api/v1/analytics/time-to-order` | GET | Time-to-order distribution buckets |
| `/api/v1/analytics/input-methods` | GET | Voice vs text counts |
| `/api/v1/analytics/peak-hours` | GET | 7×24 heatmap data |
| `/api/v1/analytics/export` | GET | CSV download of devices table |

All endpoints accept query params: `venue_id`, `start_date`, `end_date`.

Venue_admin users are automatically scoped to their own venue_id.

---

## Implementation Order

**Do Phase 1 first, Phase 2 second.** Phase 1 can ship without Phase 2 — it just means data starts accumulating immediately while we build the dashboard.

Within Phase 1:
1. Device fingerprinting (1A) — this is the foundation
2. New events (1B) — expand EventTracker
3. Backend tables + ingestion (1C) — store everything
4. Stage names (1D) — name association

Within Phase 2:
1. Backend API endpoints first — get the data flowing
2. Dashboard UI — build the visualization layer
3. Expanded rows — device detail drill-down
4. Charts — time-to-order, peak hours, input methods

---

## TEST-FIX LOOP

### Phase 1 Tests
1. Open app in Chrome DevTools → Network tab
2. Navigate through: login → games → search "catan" → select Catan → Setup tab → Rules tab → Q&A → ask a question → Score tab → add player → Order button → browse menu → close → back to games
3. Check every event batch POST to `/api/v1/analytics/events`:
   - Every event has `device_id` (UUID format)
   - `page_viewed` fires on every route change
   - `page_dwell` fires with correct seconds
   - `game_search` fires with query text
   - `tab_switched` fires with from/to tabs
   - `tab_dwell` fires with correct seconds
   - `question_asked` includes `input_method`
   - `tts_played` fires when TTS starts
   - `menu_browsed` includes `minutes_since_game_start`
4. Refresh page → `device_id` in localStorage persists (same UUID)
5. Check Turso DB: `devices` table has entry, `events` table has all events
6. Open in a different browser → different device_id generated

### Phase 2 Tests
1. Login as admin/watress2 → navigate to `/admin/analytics`
2. Summary cards show correct counts matching raw data
3. Dwell time pills show reasonable durations
4. Customers table shows all devices with correct columns
5. Click ► on a device → expanded view shows session timeline, questions, orders
6. Date range filter changes all metrics
7. Venue filter (super_admin) scopes data correctly
8. Export CSV downloads correct data
9. All charts render (top questions, top games, time-to-order, peak hours)
10. Login as venue account → `/venue/dashboard` Analytics tab shows only that venue's data
11. Zero console errors throughout

Run tests → fix any failures → re-run → repeat until all PASS.
Do not push until every test shows PASS.
Max 5 iterations per phase. If still failing after 5, stop and report exactly what's failing and why.

---

## Acceptance Criteria

- [ ] Device fingerprinting generates persistent UUID, detects return visitors
- [ ] All events in the table above fire correctly with all listed properties
- [ ] Raw events stored in Turso with proper indexes
- [ ] `/admin/analytics` dashboard loads with dark theme matching K2 reference
- [ ] Summary cards calculate correctly from real data
- [ ] Dwell time per page and per tab displayed as pill elements
- [ ] Customers table is sortable, expandable, with all columns
- [ ] Expanded device row shows full session detail including questions asked
- [ ] Date range and venue filters work on all sections
- [ ] CSV export works
- [ ] Time-to-order distribution chart renders
- [ ] Voice vs text chart renders
- [ ] Peak hours heatmap renders
- [ ] Venue_admin sees only their venue data
- [ ] Zero console errors on the dashboard
- [ ] EventTracker still batches efficiently (no performance regression on the main app)

---

## Report Back

After each phase, report:
1. Which events are firing (list with sample payloads)
2. Row counts in Turso tables
3. Screenshot of the dashboard (Phase 2)
4. Any events that couldn't be implemented and why
5. Performance impact on main app (any noticeable lag from expanded tracking?)
