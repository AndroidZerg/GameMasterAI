# GMAI-SPEC-WIZARD-S1-20260224-1600
## From: Bard (CoS)
## To: Wizard (CTO / Architect)
## Priority: High
## Depends On: Current production system (playgmai.com — Cloudflare Pages frontend + Render backend, FastAPI/Python, SQLite, 200 games, 6 venue accounts)

---

## 1. BUSINESS CONTEXT

Tim just closed a 30-day trial with "Shall We Play" — a non-ICP venue (lending library model, no cover charge, no teaching staff). Per Tim's ICP strategy, this venue will NOT convert to a paying customer. The trial exists to extract maximum usage data that becomes proof points for pitching real ICP venues.

Every data point collected during this trial feeds into:
1. **Case study one-pager** — social proof for ICP venue pitches
2. **Updated pitch deck** — replace placeholder stats with real trial data
3. **Product improvement** — fix what's broken before going to paying customers
4. **CRM foundation** — as GMAI scales to 8-12 venues, Tim needs per-venue health at a glance

What we build here becomes the permanent analytics infrastructure for every venue going forward. This is not throwaway trial code.

**Current venues:** Meepleville, Knight & Day Games, Little Shop of Magic, Shall We Play?, Grouchy John's Coffee, Natural Twenty Games. All have admin accounts with per-venue isolation.

---

## 2. WHAT WE NEED YOU TO DESIGN

Five interconnected systems:

| # | System | Purpose |
|---|--------|---------|
| 1 | Event Tracking Schema | Capture every meaningful interaction automatically |
| 2 | Feedback & Survey System | Collect user ratings at three strategic moments |
| 3 | Computed Metrics Layer | Derive 26+ metrics from raw events + feedback |
| 4 | Per-Venue Analytics Dashboard | Each venue sees their own data |
| 5 | Tim's Global CRM View | Master view across all venues |

---

## 3. EVENT TRACKING SCHEMA

### Design Requirement
The system must auto-capture 85%+ of trial metrics from normal app interactions with near-zero user effort. Users just use the app. The app logs everything silently.

### Core Events

Design an `events` table (or equivalent) that stores every meaningful interaction. All metrics are derived from these raw events — we log events, then compute metrics from them.

| Event Name | Triggered When | Key Data Fields |
|---|---|---|
| `app_loaded` | App opens in browser | venue_id, device_id, timestamp, load_time_ms |
| `session_start` | User selects a game and enters the game view | session_id, venue_id, device_id, game_id, game_title, timestamp |
| `tab_viewed` | User opens Setup/Rules/Strategy/Q&A tab | session_id, tab_name, timestamp |
| `question_asked` | User sends a question (text or voice) | session_id, question_text, input_method (voice/text), stt_confidence (float, if voice), timestamp |
| `response_delivered` | AI returns an answer | session_id, response_length_chars, response_time_ms, was_fallback (bool), timestamp |
| `voice_played` | TTS plays the response aloud | session_id, duration_ms, timestamp |
| `score_recorded` | Player score is entered in score tracker | session_id, player_name, score_value, timestamp |
| `game_ended` | User taps "End Game" and confirms | session_id, end_reason (end_button / timeout / new_game / tab_close / back_button), player_count, timestamp |
| `error_occurred` | App error, crash, or unhandled exception | venue_id, device_id, error_type, error_message, stack_trace (truncated), timestamp |

### Architecture Decisions Needed

1. **Storage location:** Should events go into the existing SQLite database (new table), a separate SQLite file, or an external analytics service (PostHog free tier, Mixpanel free tier)? Consider: Render's ephemeral filesystem (SQLite data could be lost on redeploy), query performance for dashboards, cost ($0 budget), ease of export.

2. **Session ID strategy:** We don't have user accounts. How do we generate session IDs? Recommendation to evaluate: UUID generated on the frontend when a game is selected, passed with every event for that session. The session_id ties all events for one game-play together.

3. **Device ID strategy:** How do we identify repeat users without login? Options to evaluate: persistent cookie/localStorage token on the device, fingerprint hash, or something else. Must survive browser refresh but doesn't need to survive cache clear. This is the "unique user" proxy.

4. **Event transmission:** Should the frontend fire events individually (POST per event) or batch them (queue locally, flush every N seconds or on session_end)? Consider: Render cold-start latency, potential for lost events if user closes tab, network reliability on cafe wifi.

5. **Data retention:** How long do we keep raw events? Forever? Rolling 90 days? Do we archive to a flat export periodically?

---

## 4. FEEDBACK & SURVEY SYSTEM

### Design Principle
Collect the most valuable data at the moment of least friction. Three distinct moments, three different prompts.

### Moment 1: Discovery Source (First Session Only)

**When:** Fires ONCE per device, on the very first `session_start` for that device_id. Before the user gets into the game content.

**UX:** Three large buttons filling the screen:
- "I saw it on the table" (source: `table_sign`)
- "Staff told me about it" (source: `staff`)
- "Someone showed me" (source: `friend`)

**Behavior:** User taps one button. Prompt disappears. Never shows again for that device. If user dismisses/ignores (tap outside, back button), record source as `skipped`. Do not show again regardless.

**Data:**
```
POST /api/events/discovery
{
  "device_id": "string",
  "venue_id": "string",
  "source": "table_sign" | "staff" | "friend" | "skipped",
  "submitted_at": "ISO timestamp"
}
```

Save to `discovery_events` table or as a typed event in the events table.

---

### Moment 2: Post-Game Survey (After Every Completed Game)

**When:** After the results screen (scores ranked, winner celebrated). This flow already has a design — we are aligning it with the CRM requirements.

**UX:** Two-tier survey to maximize completion rate.

**REQUIRED TIER (always shows, target: <10 seconds)**

Screen title: "How was your experience?"

| Field | Input Type | Required |
|---|---|---|
| Game rating | 5 stars (1-5) | Yes |
| AI helpfulness (overall) | 5 stars (1-5) | Yes |
| Would you use GameMaster AI again? | Yes / No buttons | Yes |

Below these three fields: "Submit" button (primary) + "Give detailed feedback" link (secondary) + "Skip" link (tertiary, small text).

**OPTIONAL TIER (expands on tap, for users who want to give more)**

Tapping "Give detailed feedback" expands additional fields below:

| Field | Input Type | Required |
|---|---|---|
| "Have you played this game before?" | Yes / No buttons | No |
| "How helpful was GameMaster AI for:" | | |
| — Setup | 5 stars (1-5) | No |
| — Rules | 5 stars (1-5) | No |
| — Strategies | 5 stars (1-5) | No |
| — Keeping Score | 5 stars (1-5) | No |
| "Any other feedback?" | Text area (max 500 chars) | No |

"Submit" button at the bottom. Submitting from either tier sends ALL filled fields.

**Data:**
```
POST /api/feedback
{
  "game_id": "string",
  "lobby_id": "string | null",
  "venue_id": "string",
  "device_id": "string",
  "player_name": "string | null",
  "session_id": "string",

  // Required tier
  "game_rating": 1-5,
  "ai_helpfulness_overall": 1-5,
  "would_use_again": true | false,

  // Optional tier (null if not expanded or not filled)
  "played_before": true | false | null,
  "helpful_setup": 1-5 | null,
  "helpful_rules": 1-5 | null,
  "helpful_strategy": 1-5 | null,
  "helpful_scoring": 1-5 | null,
  "feedback_text": "string | null",

  "submitted_at": "ISO timestamp"
}
```

Save to `feedback` table. Also fire Telegram notification on submit:
```
📊 New Feedback — {Game Title} at {Venue Name}
Game: ⭐{game_rating}/5 | AI: ⭐{ai_helpfulness_overall}/5
Would use again: {Yes/No}
{If detailed: Setup: {n}/5 | Rules: {n}/5 | Strategy: {n}/5 | Scoring: {n}/5}
{If feedback_text: "truncated quote..."}
```

After submit or skip → redirect to game selector (/games).

---

### Moment 3: NPS Score (After 3rd Session Only)

**When:** Fires ONCE per device, triggered after the 3rd `game_ended` event for that device_id. Shows BEFORE the post-game survey.

**UX:** Full-screen overlay. Clean and simple.
- Title: "One quick question"
- Subtitle: "How likely are you to recommend GameMaster AI to a friend?"
- Row of numbers 0-10 (tap to select)
- Labels: "Not likely" under 0, "Very likely" under 10
- Tapping a number immediately submits and dismisses. No additional button needed.
- Small "Skip" link below the number row.

**Behavior:** Shows once. If answered or skipped, never shows again for that device. Backend must track which device_ids have seen the NPS prompt.

**Data:**
```
POST /api/events/nps
{
  "device_id": "string",
  "venue_id": "string",
  "nps_score": 0-10 | null (if skipped),
  "session_number": integer,
  "submitted_at": "ISO timestamp"
}
```

Save to `nps_events` table or as a typed event.

**NPS Calculation:** Standard formula: % Promoters (9-10) minus % Detractors (0-6). Passives (7-8) counted in total but not in the formula.

---

## 5. COMPUTED METRICS LAYER

Every metric Tim wants must be computable from raw events + feedback data. No additional user input required for the auto metrics.

### Category A: Fully Automated (from events only — 18 metrics)

| Metric | Computation | Target |
|---|---|---|
| Total Sessions | COUNT of `session_start` events per venue | 50+ / 30 days |
| Unique Users | COUNT DISTINCT `device_id` from `session_start` | 25+ / 30 days |
| Sessions per Day | Total sessions / days where at least 1 session occurred | 2+ / day |
| Peak Usage Hours | GROUP BY hour from `session_start` timestamps, top 3 | Identify top 3 |
| Avg Session Duration | AVG of (`game_ended.timestamp` - `session_start.timestamp`) per session | 10-20 min |
| Games Taught (by title) | GROUP BY `game_id` from `session_start`, COUNT | Track top 10 |
| Repeat Usage Rate | Devices with 2+ sessions / total distinct devices | 20%+ |
| Session Completion Rate | Sessions with `game_ended` where end_reason = `end_button` AND duration > 3 min / total sessions | 80%+ |
| Drop-off Point | Last `tab_viewed` before `game_ended` where end_reason != `end_button` | Top 3 drop-offs |
| Questions per Session | COUNT of `question_asked` per session_id | 3-5 avg |
| Error / Fallback Rate | `response_delivered` where was_fallback=true / total responses | <5% |
| Complexity vs Completion | JOIN game complexity rating with completion rate per game | 70%+ even for complex |
| Self-Discovery Rate | Sessions where first `question_asked` timestamp < `session_start` + 60 seconds | 50%+ |
| Time to First Interaction | First `session_start` of the day minus first `app_loaded` of the day | <2 hours |
| App Load Time | AVG of `load_time_ms` from `app_loaded` events | <3 seconds |
| Voice Recognition Accuracy | AVG of `stt_confidence` from `question_asked` where input_method=voice | 90%+ |
| Crash / Error Rate | COUNT of `error_occurred` / COUNT of `session_start` | <1% |
| Staff Hours Freed (est.) | Total sessions × 20 minutes / 60 | 10+ hrs/month |

### Category B: From Minimal User Input (from feedback + survey — 8 metrics)

| Metric | Computation | Source |
|---|---|---|
| Avg Game Rating | AVG of `game_rating` from feedback | Post-game survey (required tier) |
| Avg AI Helpfulness | AVG of `ai_helpfulness_overall` from feedback | Post-game survey (required tier) |
| Would Use Again % | COUNT where `would_use_again`=true / total feedback responses | Post-game survey (required tier) |
| Avg Helpfulness — Setup | AVG of `helpful_setup` (where not null) | Post-game survey (optional tier) |
| Avg Helpfulness — Rules | AVG of `helpful_rules` (where not null) | Post-game survey (optional tier) |
| Avg Helpfulness — Strategy | AVG of `helpful_strategy` (where not null) | Post-game survey (optional tier) |
| Avg Helpfulness — Scoring | AVG of `helpful_scoring` (where not null) | Post-game survey (optional tier) |
| Net Promoter Score | % scoring 9-10 minus % scoring 0-6 | NPS prompt (3rd session) |
| Discovery Source Breakdown | GROUP BY `source` from discovery events | Discovery prompt (first session) |
| Feedback Completion Rate | COUNT feedback submitted / COUNT `game_ended` events | Derived |
| Played Before % | COUNT where `played_before`=true / total (where not null) | Post-game survey (optional tier) |

### Category C: Manual Collection (4 metrics — not in the system)

These require POS data or staff observation. Not part of this architecture. Tim collects these during in-person venue visits.

| Metric | How Tim Collects It |
|---|---|
| Dwell Time Change | Observe: do AI-taught groups stay longer? Compare with staff estimates. |
| Food & Bev Correlation | Check POS: do tables that used AI place more food/drink orders? |
| Game Purchase Correlation | Check POS: do game sales spike on high-AI-usage days? |
| Staff Observations | Ask staff informally: noticed any changes since the tablet went in? |

### Architecture Decisions Needed

1. **Compute on-read vs scheduled rollup?** Should dashboard queries compute metrics live from raw events (simpler, slower) or should a background job pre-compute daily/hourly rollups into a summary table (faster reads, more complex)?

2. **API design:** Define the endpoints that serve computed metrics to the dashboards. Consider: should there be one fat `/api/admin/analytics` endpoint that returns everything, or granular endpoints per metric category?

3. **Time-range filtering:** All metric queries must support: today, last 7 days, last 30 days, custom date range. How should this be parameterized?

---

## 6. PER-VENUE ANALYTICS DASHBOARD

Each venue's admin account already has an admin page. This extends it with an analytics tab.

### Dashboard Sections

**Section 1: Today's Snapshot (top of page)**
- Sessions today (number)
- Unique users today (number)
- Avg rating today (stars)
- Top game today (title)
- Errors today (number, red if > 0)

**Section 2: Trends (charts)**
- Sessions per day — line chart, last 30 days
- Completion rate per day — line chart, last 30 days
- Avg rating per day — line chart, last 30 days

**Section 3: Game Leaderboard**
- Table: Game title | Sessions | Completion Rate | Avg Rating | Avg Duration
- Sorted by session count descending
- Filterable by date range

**Section 4: Feedback Feed**
- Reverse-chronological list of feedback entries
- Each entry shows: game, rating stars, AI helpfulness stars, would-use-again badge, timestamp
- Expandable to show detailed ratings + comment text if available
- Filterable: all / positive only (4-5 stars) / negative only (1-2 stars)

**Section 5: Technical Health**
- App load time (avg, p95)
- Voice accuracy (avg, by hour of day)
- Error/crash count (with expandable error log)
- Fallback rate

**Section 6: Discovery & Adoption**
- How users found the app (pie chart: table_sign / staff / friend / skipped)
- Self-discovery rate (percentage)
- Time to first interaction (average per day)

### Design Constraints
- Must work on Tim's phone (responsive, mobile-first)
- Auto-refreshes or has a manual refresh button
- Date range picker: Today / 7 days / 30 days / Custom
- No external JS charting libraries required — simple HTML/CSS bar charts and tables are fine for MVP. If Wizard recommends a charting library, specify which one and why.

---

## 7. TIM'S GLOBAL CRM VIEW

Accessible only to Tim (super-admin). Shows data across ALL venues.

### CRM Sections

**Section 1: Venue Comparison Table**

| Venue | Status | Day # | Sessions | Users | Completion | Avg Rating | NPS | Errors |
|---|---|---|---|---|---|---|---|---|
| Shall We Play? | Trial (Day 5/30) | 5 | 23 | 14 | 78% | 4.2 | — | 1 |
| Meepleville | Active | — | 156 | 89 | 85% | 4.5 | 42 | 0 |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |

Sortable by any column. Color-coded: green = healthy, yellow = watch, red = problem.

**Section 2: Trial Tracker**
- For venues on trial: progress bar showing day X of 30
- Key milestones: first session, first feedback, 10th session, NPS collected
- Alert flags: zero-session days, declining usage trend, high error rate

**Section 3: Aggregate Stats**
- Total sessions across all venues (all time + this month)
- Total unique users across all venues
- Average NPS across all venues
- Average game rating across all venues
- Top 10 most-taught games globally

**Section 4: Export**
- "Export Case Study Data" button per venue → generates a JSON or CSV with all 30-day metrics matching the case study template fields
- "Export All Feedback" → CSV of all feedback entries for a venue
- "Export Raw Events" → CSV of all events for a venue (for deep analysis)

**Section 5: Alert System**
- Flag venues where: sessions/day dropped >50% week-over-week
- Flag venues where: error rate > 5%
- Flag venues where: avg rating < 3.0
- Flag venues where: no sessions in 48+ hours
- Alerts visible on CRM dashboard + Telegram notification to Tim

### Architecture Decision Needed

1. **Routing:** Separate admin route (e.g., `/admin/crm`) or integrated into existing admin with a toggle?
2. **Access control:** How to differentiate Tim's super-admin from venue admins? Currently using per-venue accounts with password `gmai2026`. Need a clean separation.

---

## 8. DATABASE SCHEMA

Design the complete schema for all new tables. The existing system has game tables and venue/account tables in SQLite. These new tables extend the existing database.

### Tables Needed

**`events`** — Raw interaction events
- All events from Section 3 go here
- Must support high-write volume (potentially dozens of events per session)
- Must support efficient reads by venue_id + date range for dashboard queries

**`feedback`** — Post-game survey responses
- All fields from Section 4, Moment 2
- One row per survey submission
- Links to session_id

**`discovery_events`** — First-session discovery source
- Fields from Section 4, Moment 1
- One row per device_id (only fires once)

**`nps_events`** — NPS scores
- Fields from Section 4, Moment 3
- One row per device_id (only fires once)

**`device_state`** — Track per-device state
- device_id, venue_id, first_seen_at, session_count, has_seen_discovery_prompt, has_seen_nps_prompt
- Updated on each session. Used to determine when to show discovery and NPS prompts.

**`daily_rollups`** (if you recommend pre-computation)
- venue_id, date, total_sessions, unique_devices, avg_duration, completion_rate, avg_rating, avg_ai_helpfulness, error_count, etc.
- One row per venue per day

### For Each Table, Provide:
- Column names, types, nullable, defaults
- Primary key and indexes
- Foreign key relationships (if any)
- Example row

---

## 9. API ENDPOINTS

Design all new endpoints needed. The existing system has routes under `/api/` for games and queries, and `/api/admin/` for venue admin.

### Event Ingestion
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/events` | Write a batch of events (frontend sends array) |
| POST | `/api/events/discovery` | Record discovery source (first session) |
| POST | `/api/events/nps` | Record NPS score (3rd session) |
| POST | `/api/feedback` | Submit post-game survey (update existing endpoint) |

### Device State
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/device/{device_id}/state` | Check if discovery/NPS prompts have been shown |
| POST | `/api/device/{device_id}/state` | Update device state (increment session count, etc.) |

### Venue Analytics (per-venue admin)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/analytics/snapshot` | Today's key numbers |
| GET | `/api/admin/analytics/trends?range=7d` | Time-series data for charts |
| GET | `/api/admin/analytics/games` | Game leaderboard with stats |
| GET | `/api/admin/analytics/feedback?filter=all` | Paginated feedback feed |
| GET | `/api/admin/analytics/technical` | Load time, voice accuracy, errors |
| GET | `/api/admin/analytics/discovery` | Discovery source breakdown |

### Global CRM (Tim only)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/crm/venues` | Venue comparison table data |
| GET | `/api/crm/trials` | Trial tracker status for each venue |
| GET | `/api/crm/aggregate` | Cross-venue aggregate stats |
| GET | `/api/crm/alerts` | Active alerts |
| GET | `/api/crm/export/{venue_id}?format=csv` | Export venue data |

### For Each Endpoint, Provide:
- Request parameters / body shape
- Response JSON shape
- Auth requirements (venue admin vs super-admin)
- SQL query or pseudocode for the computation

---

## 10. FRONTEND EVENT FIRING LOGIC

Specify exactly WHERE in the frontend each event gets triggered. Map to existing components or describe new components needed.

| Event | Frontend Location | Trigger |
|---|---|---|
| `app_loaded` | App.jsx (root component mount) | `useEffect` on mount, measure `performance.now()` for load time |
| `session_start` | GameSelector.jsx → when user taps a game | `onClick` handler, generate UUID for session_id |
| `tab_viewed` | QueryInterface.jsx → tab buttons | `onClick` on Setup/Rules/Strategy/Q&A tabs |
| `question_asked` | QueryInterface.jsx → send button / voice submit | After STT completes (voice) or on text submit |
| `response_delivered` | ResponseDisplay.jsx → when AI response renders | Measure time from question sent to response received |
| `voice_played` | VoiceButton.jsx → TTS completion | `onend` event from SpeechSynthesis |
| `score_recorded` | Score tracker component | On score entry/update |
| `game_ended` | End Game button → after confirmation | On confirm tap |
| `error_occurred` | Global error boundary / try-catch in API calls | `window.onerror` + component error boundaries |
| Discovery prompt | New component: DiscoveryPrompt.jsx | Rendered on first session if `device_state.has_seen_discovery_prompt === false` |
| NPS prompt | New component: NPSPrompt.jsx | Rendered after 3rd game_ended if `device_state.has_seen_nps_prompt === false` |
| Post-game survey | Existing/new component: PostGameSurvey.jsx | Rendered after results screen on every game_ended |

### New Frontend Components Needed
1. **DiscoveryPrompt.jsx** — 3-button overlay
2. **NPSPrompt.jsx** — 0-10 number row overlay
3. **PostGameSurvey.jsx** — Two-tier survey (required + expandable optional)
4. **EventTracker.js** — Service module that queues events and flushes to backend

---

## 11. TELEGRAM INTEGRATION

The existing Telegram bot (token: 8535000205, chat_id: 6236947695) already handles lead notifications. Extend it for:

1. **Feedback notifications** — Send on every survey submission (format in Section 4, Moment 2)
2. **CRM alerts** — Send when alert conditions are triggered (Section 7, Section 5)
3. **Daily digest** (optional) — Send once per day at 9 AM: yesterday's key metrics per venue

---

## 12. MIGRATION & IMPLEMENTATION PLAN

### Constraints
- $0 budget. No paid services.
- Existing system is live at playgmai.com. Cannot break current functionality.
- Render free tier has ephemeral filesystem — SQLite data can be lost on redeploy. Address this.
- Frontend is on Cloudflare Pages — static deploy, no server-side rendering.
- Must work on cafe wifi (potentially slow/unreliable connections).

### Implementation Order (Recommended — confirm or revise)

| Phase | What | Why First |
|---|---|---|
| 1 | Events table + `/api/events` endpoint | Foundation — everything builds on this |
| 2 | Device state table + endpoint | Needed to control discovery/NPS prompt visibility |
| 3 | Frontend EventTracker.js service | Start collecting data immediately |
| 4 | Discovery prompt component + endpoint | Fires on first session — must be ready at trial start |
| 5 | PostGameSurvey component (two-tier) + update `/api/feedback` | Core survey data collection |
| 6 | NPS prompt component + endpoint | Fires on 3rd session — can ship slightly later |
| 7 | Computed metrics queries | Needed for dashboards |
| 8 | Per-venue analytics dashboard | Venue owners can see their data |
| 9 | Global CRM view | Tim's master view |
| 10 | Telegram alerts + digest | Nice-to-have, not blocking trial |

---

## 13. ACCEPTANCE CRITERIA

The architecture spec is complete when ALL of the following are documented:

- [ ] Event schema: every event type with exact field names, types, and fire conditions
- [ ] Database schema: all new tables with columns, types, indexes, example rows
- [ ] Storage strategy decided with reasoning (SQLite vs external, ephemeral disk mitigation)
- [ ] Session ID and device ID strategies defined
- [ ] Event transmission approach (batch vs individual) decided with reasoning
- [ ] All API endpoints specified with request/response shapes and auth requirements
- [ ] Computed metrics: SQL queries or pseudocode for every metric in Section 5
- [ ] Feedback UX: wireframe-level spec for all three survey moments
- [ ] Frontend integration points: which components fire which events
- [ ] Dashboard data contracts: what JSON shapes the frontend expects from analytics APIs
- [ ] CRM view data contracts: what JSON shapes the CRM frontend expects
- [ ] Telegram message formats for feedback + alerts
- [ ] Migration plan: how to add this to production without breaking anything
- [ ] Data persistence strategy for Render's ephemeral filesystem
- [ ] Privacy approach: what we collect, what we don't, data retention policy
- [ ] Implementation order confirmed or revised with reasoning

---

## 14. REPORT BACK

Provide the full technical architecture as a spec document that Barbarian can implement directly. The spec should be detailed enough that Barbarian can build each phase without needing to make architecture decisions — all decisions should be made by Wizard in this spec.

Format the deliverable as a single `.md` file with clear section headers matching the implementation phases. Include exact SQL for table creation, exact JSON shapes for all API requests/responses, and exact event firing pseudocode for frontend integration.

---

*End of ticket. — Bard (CoS)*
