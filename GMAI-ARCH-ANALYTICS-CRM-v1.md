# GMAI Analytics & CRM — Technical Architecture Specification
## Version 1.0 | February 24, 2026
## Author: Wizard (CTO / Architect)
## Implements: GMAI-SPEC-WIZARD-S1-20260224-1600

---

## 0. ARCHITECTURE DECISIONS SUMMARY

Before the detailed spec, here are the eight key decisions and why I made them.

| # | Decision | Choice | Reasoning |
|---|----------|--------|-----------|
| 1 | Analytics storage | **Turso (libsql)** — separate from game SQLite | Render's filesystem is ephemeral. Analytics data is irreplaceable. Turso is SQLite-compatible (minimal code changes), free tier gives 9GB / 500M reads / 25M writes per month. That's ~800K events/month before we even think about limits. $0. |
| 2 | Session ID | **UUID v4, frontend-generated** on game select | Stored in `sessionStorage`. Ties all events for one play session together. Dies when tab closes — that's correct behavior. |
| 3 | Device ID | **UUID v4 in `localStorage`** | Generated on first visit. Survives refresh and browser close. Our "unique user" proxy. Doesn't survive cache clear — acceptable for cafe tablets (staff won't clear cache). |
| 4 | Event transmission | **Batched with flush triggers** | Queue in memory → flush every 10s OR on `game_ended` OR on queue ≥ 20 events OR on page unload via `navigator.sendBeacon`. Reduces API calls, handles Render cold starts, minimizes data loss. |
| 5 | Data retention | **Raw events: 90 days. Daily rollups: forever.** | Raw events are high-volume and only useful for debugging/drill-down. Rollups are tiny and power all dashboard historical views. Nightly job archives then purges raw events older than 90 days. |
| 6 | Metrics computation | **Hybrid: live queries + nightly rollups** | "Today" and "last 7 days" queries hit raw events (fast enough at our volume). Nightly cron rolls up daily aggregates into `daily_rollups` for 30-day+ historical views. Simple to build, good enough to scale to 50 venues. |
| 7 | API design | **Granular endpoints per dashboard section** | One fat endpoint means one slow query and one big payload. Granular endpoints let the frontend load sections independently, show data progressively, and cache individual sections. |
| 8 | CRM access control | **Role field on existing accounts table** | Add `role` column: `venue_admin` (default) or `super_admin` (Tim only). CRM endpoints check `role = 'super_admin'`. Clean, minimal, no new auth system needed. |

---

## 1. DATA PERSISTENCE STRATEGY

### The Problem

Render free tier uses an ephemeral filesystem. Every deploy wipes the disk. The existing game data survives because game JSON files are committed to the repo and SQLite is rebuilt on startup from those files. Analytics data cannot be rebuilt — once lost, it's gone.

### The Solution: Turso (libsql)

**What:** Turso is a hosted SQLite-compatible database (libsql). It speaks the SQLite wire protocol. Queries are standard SQL. The Python client (`libsql-experimental` or `libsql-client`) is a near drop-in replacement for `sqlite3`.

**Free tier limits:**
- 9 GB total storage
- 500 million row reads / month
- 25 million row writes / month
- 3 databases
- 3 locations

**Why this works for us:**
- At 6 venues, even aggressive usage (50 sessions/day across all venues, 15 events/session) = ~22,500 events/day = ~675K writes/month. Well under the 25M limit.
- Dashboard reads are even lighter — a few hundred queries/day max.
- SQLite-compatible means Barbarian can test locally with regular SQLite, deploy to Turso in production. Same SQL, same schema.

**Setup:**
```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create database
turso db create gmai-analytics --location sjc  # San Jose, closest to likely hosting

# Get connection URL and auth token
turso db show gmai-analytics --url
turso db tokens create gmai-analytics
```

**Backend connection (Python):**
```python
import libsql_experimental as libsql

# Production: Turso
TURSO_URL = os.getenv("TURSO_DATABASE_URL")      # e.g., libsql://gmai-analytics-xxx.turso.io
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN")

analytics_db = libsql.connect(
    TURSO_URL,
    auth_token=TURSO_AUTH_TOKEN
)

# Local development: regular SQLite file
# analytics_db = libsql.connect("analytics.db")
```

**Requirements addition:**
```
libsql-experimental>=0.0.34
```

### What stays in the existing SQLite

The existing game database (`games.db`) stays as-is. It's rebuilt from JSON files on deploy. No changes needed there.

### What goes to Turso

All new analytics tables: `events`, `feedback`, `discovery_events`, `nps_events`, `device_state`, `daily_rollups`.

---

## 2. DATABASE SCHEMA

### 2.1 `events` Table

Stores every raw interaction event. This is the foundation — all automated metrics derive from this table.

```sql
CREATE TABLE IF NOT EXISTS events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type      TEXT NOT NULL,           -- 'app_loaded', 'session_start', 'tab_viewed', etc.
    venue_id        TEXT NOT NULL,
    device_id       TEXT NOT NULL,
    session_id      TEXT,                    -- NULL for app_loaded and error_occurred (no session yet)
    game_id         TEXT,                    -- NULL for app_loaded and error_occurred
    timestamp       TEXT NOT NULL,           -- ISO 8601 UTC
    payload         TEXT NOT NULL DEFAULT '{}' -- JSON blob with event-specific fields
);

CREATE INDEX idx_events_venue_date ON events(venue_id, timestamp);
CREATE INDEX idx_events_session ON events(session_id);
CREATE INDEX idx_events_device ON events(device_id);
CREATE INDEX idx_events_type_venue ON events(event_type, venue_id, timestamp);
```

**Design rationale — why a JSON payload column instead of typed columns per event:**
- 9 event types with unique fields each = a wide, sparse table with many NULLs. Ugly.
- The JSON payload keeps the table lean. Indexes are on the common filter columns (venue, device, session, timestamp, type). Event-specific fields live in `payload` and are extracted at query time with `json_extract()`.
- SQLite/libsql handles `json_extract` efficiently for our volume.

**Payload shapes by event type:**

| event_type | payload fields |
|---|---|
| `app_loaded` | `{"load_time_ms": 1200}` |
| `session_start` | `{"game_title": "Catan"}` |
| `tab_viewed` | `{"tab_name": "setup"}` |
| `question_asked` | `{"question_text": "How do I trade?", "input_method": "voice", "stt_confidence": 0.94}` |
| `response_delivered` | `{"response_length_chars": 340, "response_time_ms": 2100, "was_fallback": false}` |
| `voice_played` | `{"duration_ms": 4500}` |
| `score_recorded` | `{"player_name": "Alice", "score_value": 12}` |
| `game_ended` | `{"end_reason": "end_button", "player_count": 4, "duration_seconds": 1140}` |
| `error_occurred` | `{"error_type": "api_timeout", "error_message": "ClawProxy 504", "stack_trace": "..."}` |

**Example row:**
```
id: 1
event_type: "session_start"
venue_id: "shall-we-play"
device_id: "d_a1b2c3d4-e5f6-7890-abcd-ef1234567890"
session_id: "s_f47ac10b-58cc-4372-a567-0e02b2c3d479"
game_id: "catan"
timestamp: "2026-02-24T19:30:15.000Z"
payload: {"game_title": "Catan"}
```

### 2.2 `feedback` Table

Stores post-game survey responses. One row per submission.

```sql
CREATE TABLE IF NOT EXISTS feedback (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id              TEXT NOT NULL,
    venue_id                TEXT NOT NULL,
    device_id               TEXT NOT NULL,
    game_id                 TEXT NOT NULL,
    lobby_id                TEXT,              -- NULL if no lobby system yet
    player_name             TEXT,              -- NULL if anonymous

    -- Required tier
    game_rating             INTEGER NOT NULL CHECK(game_rating BETWEEN 1 AND 5),
    ai_helpfulness_overall  INTEGER NOT NULL CHECK(ai_helpfulness_overall BETWEEN 1 AND 5),
    would_use_again         BOOLEAN NOT NULL,

    -- Optional tier (NULL if not expanded or not filled)
    played_before           BOOLEAN,
    helpful_setup           INTEGER CHECK(helpful_setup BETWEEN 1 AND 5),
    helpful_rules           INTEGER CHECK(helpful_rules BETWEEN 1 AND 5),
    helpful_strategy        INTEGER CHECK(helpful_strategy BETWEEN 1 AND 5),
    helpful_scoring         INTEGER CHECK(helpful_scoring BETWEEN 1 AND 5),
    feedback_text           TEXT,              -- max 500 chars enforced in API

    submitted_at            TEXT NOT NULL       -- ISO 8601 UTC
);

CREATE INDEX idx_feedback_venue_date ON feedback(venue_id, submitted_at);
CREATE INDEX idx_feedback_session ON feedback(session_id);
CREATE INDEX idx_feedback_game ON feedback(game_id, venue_id);
```

**Example row:**
```
id: 1
session_id: "s_f47ac10b-58cc-4372-a567-0e02b2c3d479"
venue_id: "shall-we-play"
device_id: "d_a1b2c3d4-e5f6-7890-abcd-ef1234567890"
game_id: "catan"
lobby_id: NULL
player_name: "Alice"
game_rating: 4
ai_helpfulness_overall: 5
would_use_again: 1
played_before: 0
helpful_setup: 5
helpful_rules: 4
helpful_strategy: 3
helpful_scoring: NULL
feedback_text: "Really helped with setup! Rules explanations were clear."
submitted_at: "2026-02-24T20:15:30.000Z"
```

### 2.3 `discovery_events` Table

One row per device. Records how the user first found the app.

```sql
CREATE TABLE IF NOT EXISTS discovery_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id       TEXT NOT NULL UNIQUE,     -- One entry per device, enforced
    venue_id        TEXT NOT NULL,
    source          TEXT NOT NULL CHECK(source IN ('table_sign', 'staff', 'friend', 'skipped')),
    submitted_at    TEXT NOT NULL
);

CREATE INDEX idx_discovery_venue ON discovery_events(venue_id);
```

**Example row:**
```
id: 1
device_id: "d_a1b2c3d4-e5f6-7890-abcd-ef1234567890"
venue_id: "shall-we-play"
source: "staff"
submitted_at: "2026-02-24T19:28:00.000Z"
```

### 2.4 `nps_events` Table

One row per device. NPS score collected after 3rd session.

```sql
CREATE TABLE IF NOT EXISTS nps_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id       TEXT NOT NULL UNIQUE,     -- One entry per device, enforced
    venue_id        TEXT NOT NULL,
    nps_score       INTEGER CHECK(nps_score BETWEEN 0 AND 10),  -- NULL if skipped
    session_number  INTEGER NOT NULL,
    submitted_at    TEXT NOT NULL
);

CREATE INDEX idx_nps_venue ON nps_events(venue_id);
```

**Example row:**
```
id: 1
device_id: "d_a1b2c3d4-e5f6-7890-abcd-ef1234567890"
venue_id: "shall-we-play"
nps_score: 9
session_number: 3
submitted_at: "2026-02-25T21:00:00.000Z"
```

### 2.5 `device_state` Table

Tracks per-device state to control prompt visibility and count sessions.

```sql
CREATE TABLE IF NOT EXISTS device_state (
    device_id                   TEXT PRIMARY KEY,
    venue_id                    TEXT NOT NULL,
    first_seen_at               TEXT NOT NULL,
    session_count               INTEGER NOT NULL DEFAULT 0,
    has_seen_discovery_prompt   BOOLEAN NOT NULL DEFAULT 0,
    has_seen_nps_prompt         BOOLEAN NOT NULL DEFAULT 0,
    last_session_at             TEXT
);

CREATE INDEX idx_device_state_venue ON device_state(venue_id);
```

**Example row:**
```
device_id: "d_a1b2c3d4-e5f6-7890-abcd-ef1234567890"
venue_id: "shall-we-play"
first_seen_at: "2026-02-24T19:28:00.000Z"
session_count: 3
has_seen_discovery_prompt: 1
has_seen_nps_prompt: 1
last_session_at: "2026-02-25T20:45:00.000Z"
```

### 2.6 `daily_rollups` Table

Pre-computed daily aggregates per venue. Populated by nightly cron. Powers historical dashboard views.

```sql
CREATE TABLE IF NOT EXISTS daily_rollups (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id            TEXT NOT NULL,
    date                TEXT NOT NULL,           -- 'YYYY-MM-DD'

    -- Session metrics
    total_sessions      INTEGER NOT NULL DEFAULT 0,
    unique_devices      INTEGER NOT NULL DEFAULT 0,
    completed_sessions  INTEGER NOT NULL DEFAULT 0,  -- end_reason = 'end_button' AND duration > 180s
    avg_duration_seconds REAL,

    -- Question metrics
    total_questions     INTEGER NOT NULL DEFAULT 0,
    voice_questions     INTEGER NOT NULL DEFAULT 0,
    text_questions      INTEGER NOT NULL DEFAULT 0,
    avg_stt_confidence  REAL,

    -- Response metrics
    total_responses     INTEGER NOT NULL DEFAULT 0,
    fallback_responses  INTEGER NOT NULL DEFAULT 0,
    avg_response_time_ms REAL,

    -- Feedback metrics
    feedback_count      INTEGER NOT NULL DEFAULT 0,
    avg_game_rating     REAL,
    avg_ai_helpfulness  REAL,
    would_use_again_yes INTEGER NOT NULL DEFAULT 0,
    would_use_again_no  INTEGER NOT NULL DEFAULT 0,

    -- Technical metrics
    avg_load_time_ms    REAL,
    error_count         INTEGER NOT NULL DEFAULT 0,

    -- Computed at rollup time
    completion_rate     REAL,                    -- completed_sessions / total_sessions
    fallback_rate       REAL,                    -- fallback_responses / total_responses

    UNIQUE(venue_id, date)
);

CREATE INDEX idx_rollups_venue_date ON daily_rollups(venue_id, date);
```

**Example row:**
```
id: 1
venue_id: "shall-we-play"
date: "2026-02-24"
total_sessions: 8
unique_devices: 5
completed_sessions: 6
avg_duration_seconds: 720.5
total_questions: 34
voice_questions: 28
text_questions: 6
avg_stt_confidence: 0.91
total_responses: 34
fallback_responses: 1
avg_response_time_ms: 1850.0
feedback_count: 5
avg_game_rating: 4.2
avg_ai_helpfulness: 4.4
would_use_again_yes: 4
would_use_again_no: 1
avg_load_time_ms: 1100.0
error_count: 0
completion_rate: 0.75
fallback_rate: 0.029
```

### 2.7 Schema Migration: Existing Accounts Table

Add role column to the existing accounts/venues table:

```sql
ALTER TABLE accounts ADD COLUMN role TEXT NOT NULL DEFAULT 'venue_admin'
    CHECK(role IN ('venue_admin', 'super_admin'));

-- Set Tim's account to super_admin
UPDATE accounts SET role = 'super_admin' WHERE username = 'tim';
-- (Barbarian: adjust the WHERE clause to match Tim's actual account identifier)
```

---

## 3. SESSION ID & DEVICE ID STRATEGIES

### 3.1 Device ID

**Generation:** UUID v4, prefixed with `d_` for debuggability.

**Storage:** `localStorage` under key `gmai_device_id`.

**Lifecycle:**
1. On app load, check `localStorage.getItem('gmai_device_id')`
2. If null, generate `d_` + `crypto.randomUUID()`, store it
3. Passed with every API call (events, feedback, discovery, NPS, device state)

**Frontend code:**
```javascript
// services/deviceId.js
const STORAGE_KEY = 'gmai_device_id';

export function getDeviceId() {
  let deviceId = localStorage.getItem(STORAGE_KEY);
  if (!deviceId) {
    deviceId = `d_${crypto.randomUUID()}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  return deviceId;
}
```

**Venue binding:** The first event from a device_id establishes its venue_id. If a tablet is moved between venues (unlikely but possible), the device_state record keeps the original venue_id. This is fine — it's a hardware proxy, not a user identity.

### 3.2 Session ID

**Generation:** UUID v4, prefixed with `s_` for debuggability.

**Storage:** `sessionStorage` under key `gmai_session_id`. Also held in React state.

**Lifecycle:**
1. Generated when user taps a game in GameSelector (= `session_start` event)
2. Stored in `sessionStorage` + React app state
3. Passed with every event for that game session
4. Cleared when `game_ended` fires
5. New session = new UUID (selecting another game, or replaying same game)

**Frontend code:**
```javascript
// services/sessionManager.js
export function createSession(gameId, gameTitle) {
  const sessionId = `s_${crypto.randomUUID()}`;
  sessionStorage.setItem('gmai_session_id', sessionId);
  return sessionId;
}

export function getCurrentSessionId() {
  return sessionStorage.getItem('gmai_session_id');
}

export function clearSession() {
  sessionStorage.removeItem('gmai_session_id');
}
```

---

## 4. EVENT TRANSMISSION SYSTEM

### 4.1 Architecture

Frontend maintains an in-memory event queue. Events are flushed to the backend in batches.

**Flush triggers (any of these):**
1. Queue reaches 20 events
2. 10 seconds have elapsed since last flush
3. `game_ended` event is queued (flush immediately — session is over)
4. Page is unloading (`beforeunload` via `navigator.sendBeacon`)

### 4.2 Frontend EventTracker Service

```javascript
// services/EventTracker.js
import { getDeviceId } from './deviceId';
import { getCurrentSessionId } from './sessionManager';

const FLUSH_INTERVAL_MS = 10000;
const MAX_QUEUE_SIZE = 20;
const API_URL = '/api/events';

class EventTracker {
  constructor() {
    this.queue = [];
    this.flushTimer = null;
    this.venueId = null; // Set on app init from venue config
    this._startFlushTimer();
    this._attachUnloadHandler();
  }

  init(venueId) {
    this.venueId = venueId;
  }

  track(eventType, payload = {}) {
    const event = {
      event_type: eventType,
      venue_id: this.venueId,
      device_id: getDeviceId(),
      session_id: getCurrentSessionId(),       // may be null for app_loaded
      game_id: payload._game_id || null,       // extracted and removed from payload
      timestamp: new Date().toISOString(),
      payload: { ...payload },
    };
    delete event.payload._game_id;

    this.queue.push(event);

    // Immediate flush on game_ended or queue full
    if (eventType === 'game_ended' || this.queue.length >= MAX_QUEUE_SIZE) {
      this.flush();
    }
  }

  async flush() {
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];

    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
      });
    } catch (err) {
      // On failure, push events back to front of queue for retry
      this.queue = [...batch, ...this.queue];
      console.error('Event flush failed, will retry:', err);
    }
  }

  _startFlushTimer() {
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
  }

  _attachUnloadHandler() {
    window.addEventListener('beforeunload', () => {
      if (this.queue.length > 0) {
        // sendBeacon is fire-and-forget, works during page unload
        navigator.sendBeacon(
          API_URL,
          JSON.stringify({ events: this.queue })
        );
        this.queue = [];
      }
    });
  }

  destroy() {
    clearInterval(this.flushTimer);
  }
}

// Singleton
export const eventTracker = new EventTracker();
```

### 4.3 Backend Event Ingestion

```python
# api/routes/events.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import json

router = APIRouter()

class EventPayload(BaseModel):
    event_type: str
    venue_id: str
    device_id: str
    session_id: Optional[str] = None
    game_id: Optional[str] = None
    timestamp: str
    payload: dict = Field(default_factory=dict)

class EventBatch(BaseModel):
    events: List[EventPayload]

@router.post("/api/events")
async def ingest_events(batch: EventBatch):
    if len(batch.events) > 100:
        raise HTTPException(status_code=400, detail="Batch too large. Max 100 events.")

    rows = []
    for e in batch.events:
        rows.append((
            e.event_type,
            e.venue_id,
            e.device_id,
            e.session_id,
            e.game_id,
            e.timestamp,
            json.dumps(e.payload)
        ))

    analytics_db.executemany(
        """INSERT INTO events (event_type, venue_id, device_id, session_id, game_id, timestamp, payload)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        rows
    )
    analytics_db.commit()

    return {"accepted": len(rows)}
```

---

## 5. API ENDPOINTS — COMPLETE SPECIFICATION

### 5.1 Event Ingestion Endpoints

---

#### `POST /api/events`
**Purpose:** Batch ingest interaction events.
**Auth:** None (public — events come from unauthenticated tablet users).
**Rate limit:** 60 requests/minute per device_id (enforce in middleware).

**Request body:**
```json
{
  "events": [
    {
      "event_type": "session_start",
      "venue_id": "shall-we-play",
      "device_id": "d_a1b2c3d4...",
      "session_id": "s_f47ac10b...",
      "game_id": "catan",
      "timestamp": "2026-02-24T19:30:15.000Z",
      "payload": { "game_title": "Catan" }
    }
  ]
}
```

**Response (200):**
```json
{ "accepted": 1 }
```

**Validation:**
- `events` array: 1–100 items
- `event_type`: must be one of the 9 defined types
- `venue_id`, `device_id`, `timestamp`: required, non-empty
- `session_id`: required for all types except `app_loaded` and `error_occurred`

---

#### `POST /api/events/discovery`
**Purpose:** Record how user discovered the app. Once per device.
**Auth:** None.

**Request body:**
```json
{
  "device_id": "d_a1b2c3d4...",
  "venue_id": "shall-we-play",
  "source": "staff",
  "submitted_at": "2026-02-24T19:28:00.000Z"
}
```

**Response (200):**
```json
{ "recorded": true }
```

**Response (409 — already exists):**
```json
{ "recorded": false, "reason": "Discovery already recorded for this device." }
```

**Backend logic:**
```python
@router.post("/api/events/discovery")
async def record_discovery(data: DiscoveryPayload):
    try:
        analytics_db.execute(
            """INSERT INTO discovery_events (device_id, venue_id, source, submitted_at)
               VALUES (?, ?, ?, ?)""",
            (data.device_id, data.venue_id, data.source, data.submitted_at)
        )
        # Also update device_state
        analytics_db.execute(
            """UPDATE device_state SET has_seen_discovery_prompt = 1
               WHERE device_id = ?""",
            (data.device_id,)
        )
        analytics_db.commit()
        return {"recorded": True}
    except IntegrityError:
        return JSONResponse(status_code=409,
            content={"recorded": False, "reason": "Discovery already recorded for this device."})
```

---

#### `POST /api/events/nps`
**Purpose:** Record NPS score. Once per device.
**Auth:** None.

**Request body:**
```json
{
  "device_id": "d_a1b2c3d4...",
  "venue_id": "shall-we-play",
  "nps_score": 9,
  "session_number": 3,
  "submitted_at": "2026-02-25T21:00:00.000Z"
}
```

`nps_score` is `null` if skipped.

**Response (200):**
```json
{ "recorded": true }
```

**Response (409 — already exists):**
```json
{ "recorded": false, "reason": "NPS already recorded for this device." }
```

**Backend logic:** Same pattern as discovery — INSERT with UNIQUE constraint, update `device_state.has_seen_nps_prompt = 1`.

---

#### `POST /api/feedback`
**Purpose:** Submit post-game survey.
**Auth:** None.

**Request body:**
```json
{
  "session_id": "s_f47ac10b...",
  "venue_id": "shall-we-play",
  "device_id": "d_a1b2c3d4...",
  "game_id": "catan",
  "lobby_id": null,
  "player_name": "Alice",

  "game_rating": 4,
  "ai_helpfulness_overall": 5,
  "would_use_again": true,

  "played_before": false,
  "helpful_setup": 5,
  "helpful_rules": 4,
  "helpful_strategy": 3,
  "helpful_scoring": null,
  "feedback_text": "Really helped with setup!",

  "submitted_at": "2026-02-24T20:15:30.000Z"
}
```

**Response (200):**
```json
{ "id": 1, "recorded": true }
```

**Backend logic:**
1. INSERT into `feedback` table.
2. Fire Telegram notification (async, non-blocking — failure must NOT fail the API response).

**Validation:**
- `game_rating`, `ai_helpfulness_overall`: required, integer 1–5
- `would_use_again`: required, boolean
- `feedback_text`: max 500 characters
- All optional tier fields: nullable

---

### 5.2 Device State Endpoints

---

#### `GET /api/device/{device_id}/state`
**Purpose:** Check what prompts to show this device.
**Auth:** None.

**Response (200 — device exists):**
```json
{
  "device_id": "d_a1b2c3d4...",
  "venue_id": "shall-we-play",
  "session_count": 2,
  "has_seen_discovery_prompt": true,
  "has_seen_nps_prompt": false,
  "show_discovery_prompt": false,
  "show_nps_prompt": false
}
```

**Computed fields:**
- `show_discovery_prompt`: `true` if `has_seen_discovery_prompt == false` AND `session_count == 0`
- `show_nps_prompt`: `true` if `has_seen_nps_prompt == false` AND `session_count >= 3`

**Response (200 — device not found / first visit):**
```json
{
  "device_id": "d_a1b2c3d4...",
  "venue_id": null,
  "session_count": 0,
  "has_seen_discovery_prompt": false,
  "has_seen_nps_prompt": false,
  "show_discovery_prompt": true,
  "show_nps_prompt": false
}
```

---

#### `POST /api/device/{device_id}/state`
**Purpose:** Register device or increment session count.
**Auth:** None.

**Request body:**
```json
{
  "venue_id": "shall-we-play",
  "action": "session_start"
}
```

**Actions:**
- `session_start`: Upsert device record. If new, create with `session_count = 1`. If existing, increment `session_count`, update `last_session_at`.

**Backend logic:**
```python
@router.post("/api/device/{device_id}/state")
async def update_device_state(device_id: str, data: DeviceStateUpdate):
    now = datetime.utcnow().isoformat() + "Z"

    analytics_db.execute("""
        INSERT INTO device_state (device_id, venue_id, first_seen_at, session_count, last_session_at)
        VALUES (?, ?, ?, 1, ?)
        ON CONFLICT(device_id) DO UPDATE SET
            session_count = session_count + 1,
            last_session_at = ?
    """, (device_id, data.venue_id, now, now, now))
    analytics_db.commit()

    return {"updated": True}
```

---

### 5.3 Venue Analytics Endpoints

**All endpoints in this section require venue admin auth.** The existing auth middleware should validate the session cookie / token and inject `venue_id`. Each endpoint only returns data for the authenticated venue.

**Common query parameter:** `range` — one of `today`, `7d`, `30d`, or `custom` (with `start` and `end` ISO dates).

**Range resolution helper (backend):**
```python
def resolve_date_range(range_param: str, start: str = None, end: str = None):
    today = date.today()
    if range_param == "today":
        return today.isoformat(), today.isoformat()
    elif range_param == "7d":
        return (today - timedelta(days=6)).isoformat(), today.isoformat()
    elif range_param == "30d":
        return (today - timedelta(days=29)).isoformat(), today.isoformat()
    elif range_param == "custom":
        return start, end  # Validate these exist
    else:
        raise HTTPException(400, "Invalid range")
```

---

#### `GET /api/admin/analytics/snapshot`
**Purpose:** Today's key numbers for the venue dashboard header.
**Auth:** Venue admin.

**Response:**
```json
{
  "date": "2026-02-24",
  "sessions_today": 8,
  "unique_users_today": 5,
  "avg_rating_today": 4.2,
  "top_game_today": { "game_id": "catan", "title": "Catan", "sessions": 3 },
  "errors_today": 0
}
```

**SQL:**
```sql
-- Sessions today
SELECT COUNT(*) FROM events
WHERE event_type = 'session_start' AND venue_id = ? AND date(timestamp) = date('now');

-- Unique users today
SELECT COUNT(DISTINCT device_id) FROM events
WHERE event_type = 'session_start' AND venue_id = ? AND date(timestamp) = date('now');

-- Avg rating today
SELECT AVG(game_rating) FROM feedback
WHERE venue_id = ? AND date(submitted_at) = date('now');

-- Top game today
SELECT game_id, COUNT(*) as cnt FROM events
WHERE event_type = 'session_start' AND venue_id = ? AND date(timestamp) = date('now')
GROUP BY game_id ORDER BY cnt DESC LIMIT 1;

-- Errors today
SELECT COUNT(*) FROM events
WHERE event_type = 'error_occurred' AND venue_id = ? AND date(timestamp) = date('now');
```

---

#### `GET /api/admin/analytics/trends?range=7d`
**Purpose:** Time-series data for line charts.
**Auth:** Venue admin.

**Response:**
```json
{
  "range": "7d",
  "start_date": "2026-02-18",
  "end_date": "2026-02-24",
  "series": [
    {
      "date": "2026-02-18",
      "sessions": 5,
      "unique_users": 3,
      "completion_rate": 0.80,
      "avg_rating": 4.3,
      "avg_ai_helpfulness": 4.1,
      "questions": 22,
      "errors": 0
    }
  ]
}
```

**SQL (for range <= 7 days, query raw events):**
```sql
SELECT
    date(e.timestamp) as day,
    COUNT(CASE WHEN e.event_type = 'session_start' THEN 1 END) as sessions,
    COUNT(DISTINCT CASE WHEN e.event_type = 'session_start' THEN e.device_id END) as unique_users,
    COUNT(CASE WHEN e.event_type = 'question_asked' THEN 1 END) as questions,
    COUNT(CASE WHEN e.event_type = 'error_occurred' THEN 1 END) as errors
FROM events e
WHERE e.venue_id = ? AND date(e.timestamp) BETWEEN ? AND ?
GROUP BY date(e.timestamp)
ORDER BY day;
```

**For range > 7 days, read from `daily_rollups`:**
```sql
SELECT * FROM daily_rollups
WHERE venue_id = ? AND date BETWEEN ? AND ?
ORDER BY date;
```

Completion rate and feedback metrics come from a second query joining `feedback` grouped by date, then merged in Python.

---

#### `GET /api/admin/analytics/games?range=30d`
**Purpose:** Game leaderboard with per-game stats.
**Auth:** Venue admin.

**Response:**
```json
{
  "range": "30d",
  "games": [
    {
      "game_id": "catan",
      "title": "Catan",
      "sessions": 15,
      "completion_rate": 0.87,
      "avg_rating": 4.4,
      "avg_duration_seconds": 840,
      "questions_per_session": 4.2
    }
  ]
}
```

**SQL:**
```sql
-- Sessions and questions per game
SELECT
    e.game_id,
    COUNT(DISTINCT CASE WHEN e.event_type = 'session_start' THEN e.session_id END) as sessions,
    COUNT(CASE WHEN e.event_type = 'question_asked' THEN 1 END) as questions
FROM events e
WHERE e.venue_id = ? AND date(e.timestamp) BETWEEN ? AND ?
GROUP BY e.game_id;

-- Avg rating per game
SELECT game_id, AVG(game_rating) as avg_rating
FROM feedback
WHERE venue_id = ? AND date(submitted_at) BETWEEN ? AND ?
GROUP BY game_id;

-- Avg duration per game
SELECT
    game_id,
    AVG(json_extract(payload, '$.duration_seconds')) as avg_duration
FROM events
WHERE event_type = 'game_ended' AND venue_id = ?
    AND date(timestamp) BETWEEN ? AND ?
    AND json_extract(payload, '$.end_reason') = 'end_button'
GROUP BY game_id;
```

Game titles resolved from the existing game database (JOIN or lookup dict).

---

#### `GET /api/admin/analytics/feedback?range=30d&filter=all&page=1&per_page=20`
**Purpose:** Paginated feedback feed.
**Auth:** Venue admin.

**Params:**
- `filter`: `all`, `positive` (rating 4-5), `negative` (rating 1-2)
- `page`, `per_page`: pagination (default page=1, per_page=20)

**Response:**
```json
{
  "range": "30d",
  "filter": "all",
  "total": 42,
  "page": 1,
  "per_page": 20,
  "entries": [
    {
      "id": 42,
      "game_id": "catan",
      "game_title": "Catan",
      "game_rating": 4,
      "ai_helpfulness_overall": 5,
      "would_use_again": true,
      "played_before": false,
      "helpful_setup": 5,
      "helpful_rules": 4,
      "helpful_strategy": 3,
      "helpful_scoring": null,
      "feedback_text": "Really helped with setup!",
      "submitted_at": "2026-02-24T20:15:30.000Z"
    }
  ]
}
```

**SQL:**
```sql
SELECT * FROM feedback
WHERE venue_id = ? AND date(submitted_at) BETWEEN ? AND ?
  AND (? = 'all' OR (? = 'positive' AND game_rating >= 4) OR (? = 'negative' AND game_rating <= 2))
ORDER BY submitted_at DESC
LIMIT ? OFFSET ?;

-- Total count for pagination
SELECT COUNT(*) FROM feedback
WHERE venue_id = ? AND date(submitted_at) BETWEEN ? AND ?
  AND (? = 'all' OR (? = 'positive' AND game_rating >= 4) OR (? = 'negative' AND game_rating <= 2));
```

---

#### `GET /api/admin/analytics/technical?range=7d`
**Purpose:** Technical health metrics.
**Auth:** Venue admin.

**Response:**
```json
{
  "range": "7d",
  "load_time": {
    "avg_ms": 1100,
    "p95_ms": 2400
  },
  "voice_accuracy": {
    "avg_confidence": 0.91,
    "by_hour": [
      { "hour": 10, "avg_confidence": 0.93, "count": 12 },
      { "hour": 11, "avg_confidence": 0.89, "count": 18 }
    ]
  },
  "errors": {
    "total": 2,
    "rate": 0.008,
    "recent": [
      {
        "timestamp": "2026-02-24T18:30:00.000Z",
        "error_type": "api_timeout",
        "error_message": "ClawProxy 504"
      }
    ]
  },
  "fallback_rate": 0.03
}
```

**SQL (examples):**
```sql
-- Avg load time
SELECT AVG(json_extract(payload, '$.load_time_ms')) as avg_ms
FROM events
WHERE event_type = 'app_loaded' AND venue_id = ? AND date(timestamp) BETWEEN ? AND ?;

-- P95 load time: fetch all values, compute in Python
SELECT json_extract(payload, '$.load_time_ms') as load_time_ms
FROM events
WHERE event_type = 'app_loaded' AND venue_id = ? AND date(timestamp) BETWEEN ? AND ?
ORDER BY load_time_ms;
-- (P95 computed in Python: sort values, take index at len*0.95)

-- Voice accuracy by hour
SELECT
    CAST(strftime('%H', timestamp) AS INTEGER) as hour,
    AVG(json_extract(payload, '$.stt_confidence')) as avg_confidence,
    COUNT(*) as count
FROM events
WHERE event_type = 'question_asked' AND venue_id = ?
    AND json_extract(payload, '$.input_method') = 'voice'
    AND date(timestamp) BETWEEN ? AND ?
GROUP BY hour;

-- Fallback rate
SELECT
    COUNT(CASE WHEN json_extract(payload, '$.was_fallback') = 1 THEN 1 END) as fallbacks,
    COUNT(*) as total
FROM events
WHERE event_type = 'response_delivered' AND venue_id = ?
    AND date(timestamp) BETWEEN ? AND ?;
```

---

#### `GET /api/admin/analytics/discovery`
**Purpose:** Discovery source breakdown for the venue.
**Auth:** Venue admin.

**Response:**
```json
{
  "total_responses": 14,
  "breakdown": {
    "table_sign": { "count": 6, "percent": 42.9 },
    "staff": { "count": 5, "percent": 35.7 },
    "friend": { "count": 2, "percent": 14.3 },
    "skipped": { "count": 1, "percent": 7.1 }
  },
  "self_discovery_rate": 0.52,
  "avg_time_to_first_interaction_minutes": 45
}
```

**SQL:**
```sql
-- Discovery breakdown
SELECT source, COUNT(*) as cnt
FROM discovery_events
WHERE venue_id = ?
GROUP BY source;
```

---

### 5.4 Global CRM Endpoints

**All CRM endpoints require `role = 'super_admin'`.** Middleware must check this after standard auth.

---

#### `GET /api/crm/venues`
**Purpose:** Venue comparison table.
**Auth:** Super admin (Tim).

**Response:**
```json
{
  "venues": [
    {
      "venue_id": "shall-we-play",
      "venue_name": "Shall We Play?",
      "status": "trial",
      "trial_day": 5,
      "trial_total_days": 30,
      "sessions_total": 23,
      "unique_users": 14,
      "completion_rate": 0.78,
      "avg_rating": 4.2,
      "nps": null,
      "errors_7d": 1,
      "health": "green",
      "last_session_at": "2026-02-24T20:15:30.000Z"
    }
  ]
}
```

**Health color logic:**
- `green`: completion_rate >= 0.70 AND avg_rating >= 3.5 AND errors_7d <= 5
- `yellow`: completion_rate >= 0.50 OR avg_rating >= 2.5 (but not green)
- `red`: completion_rate < 0.50 OR avg_rating < 2.5 OR errors_7d > 20

---

#### `GET /api/crm/trials`
**Purpose:** Trial progress tracker.
**Auth:** Super admin.

**Response:**
```json
{
  "trials": [
    {
      "venue_id": "shall-we-play",
      "venue_name": "Shall We Play?",
      "trial_start": "2026-02-20",
      "trial_end": "2026-03-21",
      "day_number": 5,
      "milestones": {
        "first_session": { "achieved": true, "date": "2026-02-20" },
        "first_feedback": { "achieved": true, "date": "2026-02-20" },
        "ten_sessions": { "achieved": true, "date": "2026-02-23" },
        "nps_collected": { "achieved": false, "date": null }
      },
      "alerts": [
        { "type": "zero_session_day", "date": "2026-02-22", "message": "No sessions recorded" }
      ],
      "usage_trend": "stable"
    }
  ]
}
```

**Usage trend logic:**
- Compare last 7 days sessions vs previous 7 days
- `rising`: > 20% increase
- `stable`: within +/-20%
- `declining`: > 20% decrease
- `insufficient_data`: < 7 days of data

---

#### `GET /api/crm/aggregate`
**Purpose:** Cross-venue aggregate stats.
**Auth:** Super admin.

**Response:**
```json
{
  "total_sessions_all_time": 456,
  "total_sessions_this_month": 123,
  "total_unique_users": 234,
  "avg_nps": 42,
  "avg_game_rating": 4.3,
  "top_games": [
    { "game_id": "catan", "title": "Catan", "sessions": 45 },
    { "game_id": "ticket-to-ride", "title": "Ticket to Ride", "sessions": 38 }
  ],
  "venue_count": 6,
  "active_trials": 1
}
```

---

#### `GET /api/crm/alerts`
**Purpose:** Active alert conditions across all venues.
**Auth:** Super admin.

**Response:**
```json
{
  "alerts": [
    {
      "venue_id": "shall-we-play",
      "venue_name": "Shall We Play?",
      "type": "usage_drop",
      "severity": "warning",
      "message": "Sessions dropped 55% week-over-week",
      "detected_at": "2026-02-24T09:00:00.000Z"
    }
  ]
}
```

**Alert conditions (checked by nightly cron + on-demand by this endpoint):**

| Condition | Type | Severity |
|---|---|---|
| Sessions/day dropped >50% WoW | `usage_drop` | warning |
| Error rate > 5% in last 7 days | `high_errors` | critical |
| Avg rating < 3.0 in last 7 days | `low_rating` | warning |
| No sessions in 48+ hours | `inactive` | critical |

---

#### `GET /api/crm/export/{venue_id}?format=csv&type=case_study`
**Purpose:** Export venue data for case studies or analysis.
**Auth:** Super admin.

**Params:**
- `format`: `csv` or `json`
- `type`: `case_study` (curated metrics), `feedback` (all feedback rows), `events` (raw events)

**Response:** File download with appropriate Content-Type and Content-Disposition headers.

**Case study export fields:**
```json
{
  "venue_name": "Shall We Play?",
  "trial_period": "2026-02-20 to 2026-03-21",
  "total_sessions": 145,
  "unique_users": 67,
  "sessions_per_day_avg": 4.8,
  "completion_rate": 0.82,
  "avg_game_rating": 4.3,
  "avg_ai_helpfulness": 4.1,
  "would_use_again_pct": 0.89,
  "nps": 42,
  "top_games": ["Catan", "Ticket to Ride", "Wingspan"],
  "discovery_breakdown": { "table_sign": 45, "staff": 30, "friend": 20, "skipped": 5 },
  "questions_per_session_avg": 3.8,
  "voice_usage_pct": 0.72,
  "avg_session_duration_minutes": 14.2,
  "error_rate": 0.008,
  "staff_hours_freed_estimate": 48.3
}
```

---

## 6. COMPUTED METRICS — FULL SQL REFERENCE

These are the queries that power the dashboard and CRM views. Barbarian: implement these as service functions that accept `venue_id` and date range parameters.

### Category A: Automated Metrics (from events)

```sql
-- 1. Total Sessions
SELECT COUNT(*) as total_sessions
FROM events WHERE event_type = 'session_start'
    AND venue_id = ? AND date(timestamp) BETWEEN ? AND ?;

-- 2. Unique Users
SELECT COUNT(DISTINCT device_id) as unique_users
FROM events WHERE event_type = 'session_start'
    AND venue_id = ? AND date(timestamp) BETWEEN ? AND ?;

-- 3. Sessions per Day (avg across active days)
SELECT CAST(COUNT(*) AS REAL) / COUNT(DISTINCT date(timestamp)) as sessions_per_day
FROM events WHERE event_type = 'session_start'
    AND venue_id = ? AND date(timestamp) BETWEEN ? AND ?;

-- 4. Peak Usage Hours (top 3)
SELECT CAST(strftime('%H', timestamp) AS INTEGER) as hour, COUNT(*) as cnt
FROM events WHERE event_type = 'session_start'
    AND venue_id = ? AND date(timestamp) BETWEEN ? AND ?
GROUP BY hour ORDER BY cnt DESC LIMIT 3;

-- 5. Avg Session Duration (seconds)
SELECT AVG(json_extract(payload, '$.duration_seconds')) as avg_duration
FROM events WHERE event_type = 'game_ended'
    AND venue_id = ? AND date(timestamp) BETWEEN ? AND ?
    AND json_extract(payload, '$.end_reason') = 'end_button';

-- 6. Games Taught (top 10 by session count)
SELECT game_id, COUNT(*) as sessions
FROM events WHERE event_type = 'session_start'
    AND venue_id = ? AND date(timestamp) BETWEEN ? AND ?
GROUP BY game_id ORDER BY sessions DESC LIMIT 10;

-- 7. Repeat Usage Rate
SELECT
    CAST(COUNT(DISTINCT CASE WHEN device_sessions >= 2 THEN device_id END) AS REAL)
    / COUNT(DISTINCT device_id) as repeat_rate
FROM (
    SELECT device_id, COUNT(*) as device_sessions
    FROM events WHERE event_type = 'session_start'
        AND venue_id = ? AND date(timestamp) BETWEEN ? AND ?
    GROUP BY device_id
) sub;

-- 8. Session Completion Rate
SELECT
    CAST(SUM(CASE WHEN ge.session_id IS NOT NULL
        AND json_extract(ge.payload, '$.end_reason') = 'end_button'
        AND json_extract(ge.payload, '$.duration_seconds') > 180 THEN 1 ELSE 0 END) AS REAL)
    / COUNT(*) as completion_rate
FROM events ss
LEFT JOIN events ge ON ss.session_id = ge.session_id AND ge.event_type = 'game_ended'
WHERE ss.event_type = 'session_start'
    AND ss.venue_id = ? AND date(ss.timestamp) BETWEEN ? AND ?;

-- 9. Drop-off Point
-- Best computed in Python: for sessions without end_reason='end_button',
-- find the last tab_viewed event per session_id.

-- 10. Questions per Session
SELECT AVG(q_count) as avg_questions_per_session
FROM (
    SELECT session_id, COUNT(*) as q_count
    FROM events WHERE event_type = 'question_asked'
        AND venue_id = ? AND date(timestamp) BETWEEN ? AND ?
    GROUP BY session_id
) sub;

-- 11. Error / Fallback Rate
SELECT
    CAST(SUM(CASE WHEN json_extract(payload, '$.was_fallback') = 1 THEN 1 ELSE 0 END) AS REAL)
    / COUNT(*) as fallback_rate
FROM events WHERE event_type = 'response_delivered'
    AND venue_id = ? AND date(timestamp) BETWEEN ? AND ?;

-- 12. Complexity vs Completion
-- Join events with game metadata from existing game DB. Compute in Python.

-- 13. Self-Discovery Rate
-- Sessions where first question_asked < session_start + 60s. Compute in Python.

-- 14. Time to First Interaction
-- Per day: first session_start timestamp minus first app_loaded timestamp. Compute in Python.

-- 15. App Load Time
SELECT AVG(json_extract(payload, '$.load_time_ms')) as avg_load_ms
FROM events WHERE event_type = 'app_loaded'
    AND venue_id = ? AND date(timestamp) BETWEEN ? AND ?;

-- 16. Voice Recognition Accuracy
SELECT AVG(json_extract(payload, '$.stt_confidence')) as avg_confidence
FROM events WHERE event_type = 'question_asked'
    AND json_extract(payload, '$.input_method') = 'voice'
    AND venue_id = ? AND date(timestamp) BETWEEN ? AND ?;

-- 17. Crash / Error Rate
SELECT
    CAST((SELECT COUNT(*) FROM events
        WHERE event_type = 'error_occurred' AND venue_id = ?
        AND date(timestamp) BETWEEN ? AND ?) AS REAL)
    /
    NULLIF((SELECT COUNT(*) FROM events
        WHERE event_type = 'session_start' AND venue_id = ?
        AND date(timestamp) BETWEEN ? AND ?), 0)
    as error_rate;

-- 18. Staff Hours Freed (estimate)
SELECT COUNT(*) * 20.0 / 60.0 as staff_hours_freed
FROM events WHERE event_type = 'session_start'
    AND venue_id = ? AND date(timestamp) BETWEEN ? AND ?;
```

### Category B: From Feedback / Survey Data

```sql
-- 19. Avg Game Rating
SELECT AVG(game_rating) FROM feedback
WHERE venue_id = ? AND date(submitted_at) BETWEEN ? AND ?;

-- 20. Avg AI Helpfulness
SELECT AVG(ai_helpfulness_overall) FROM feedback
WHERE venue_id = ? AND date(submitted_at) BETWEEN ? AND ?;

-- 21. Would Use Again %
SELECT
    CAST(SUM(CASE WHEN would_use_again = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(*)
FROM feedback
WHERE venue_id = ? AND date(submitted_at) BETWEEN ? AND ?;

-- 22-25. Avg Helpfulness per feature (setup, rules, strategy, scoring)
SELECT
    AVG(helpful_setup) as avg_setup,
    AVG(helpful_rules) as avg_rules,
    AVG(helpful_strategy) as avg_strategy,
    AVG(helpful_scoring) as avg_scoring
FROM feedback
WHERE venue_id = ? AND date(submitted_at) BETWEEN ? AND ?;

-- 26. NPS
SELECT
    (CAST(SUM(CASE WHEN nps_score >= 9 THEN 1 ELSE 0 END) AS REAL) / COUNT(*)
    - CAST(SUM(CASE WHEN nps_score <= 6 THEN 1 ELSE 0 END) AS REAL) / COUNT(*))
    * 100 as nps
FROM nps_events
WHERE venue_id = ? AND nps_score IS NOT NULL;

-- 27. Discovery Source Breakdown
SELECT source, COUNT(*) as cnt
FROM discovery_events WHERE venue_id = ?
GROUP BY source;

-- 28. Feedback Completion Rate
SELECT
    CAST((SELECT COUNT(*) FROM feedback
        WHERE venue_id = ? AND date(submitted_at) BETWEEN ? AND ?) AS REAL)
    /
    NULLIF((SELECT COUNT(*) FROM events
        WHERE event_type = 'game_ended' AND venue_id = ?
        AND date(timestamp) BETWEEN ? AND ?), 0)
    as feedback_completion_rate;

-- 29. Played Before %
SELECT
    CAST(SUM(CASE WHEN played_before = 1 THEN 1 ELSE 0 END) AS REAL)
    / COUNT(*)
FROM feedback
WHERE venue_id = ? AND played_before IS NOT NULL
    AND date(submitted_at) BETWEEN ? AND ?;
```

---

## 7. NIGHTLY ROLLUP CRON JOB

### Purpose
Pre-compute daily aggregates for fast dashboard queries on historical data.

### Trigger
Run once daily at 3:00 AM UTC (well after peak cafe hours). Barbarian: implement as a FastAPI background task triggered by a cron endpoint, or use APScheduler.

### Implementation

```python
# services/rollup.py
from datetime import date, timedelta

async def compute_daily_rollup(venue_id: str, target_date: str):
    """Compute and upsert daily rollup for one venue on one date."""
    d = target_date  # 'YYYY-MM-DD'

    sessions = analytics_db.execute(
        "SELECT COUNT(*) FROM events WHERE event_type='session_start' AND venue_id=? AND date(timestamp)=?",
        (venue_id, d)).fetchone()[0]

    unique_devices = analytics_db.execute(
        "SELECT COUNT(DISTINCT device_id) FROM events WHERE event_type='session_start' AND venue_id=? AND date(timestamp)=?",
        (venue_id, d)).fetchone()[0]

    # ... (compute all rollup fields using the SQL from Section 6)

    analytics_db.execute("""
        INSERT INTO daily_rollups (venue_id, date, total_sessions, unique_devices, ...)
        VALUES (?, ?, ?, ?, ...)
        ON CONFLICT(venue_id, date) DO UPDATE SET
            total_sessions = excluded.total_sessions,
            unique_devices = excluded.unique_devices,
            ...
    """, (venue_id, d, sessions, unique_devices, ...))
    analytics_db.commit()


async def run_nightly_rollup():
    """Roll up yesterday's data for all venues."""
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    venues = analytics_db.execute("SELECT DISTINCT venue_id FROM device_state").fetchall()

    for (venue_id,) in venues:
        await compute_daily_rollup(venue_id, yesterday)

    # Purge raw events older than 90 days
    cutoff = (date.today() - timedelta(days=90)).isoformat()
    analytics_db.execute("DELETE FROM events WHERE date(timestamp) < ?", (cutoff,))
    analytics_db.commit()
```

### Cron Endpoint (for external cron trigger via cron-job.org free tier)

```python
@router.post("/api/internal/rollup")
async def trigger_rollup(secret: str):
    if secret != os.getenv("ROLLUP_SECRET"):
        raise HTTPException(403, "Unauthorized")
    await run_nightly_rollup()
    return {"status": "completed"}
```

Use cron-job.org (free) to POST to this endpoint daily at 3:00 AM UTC.

---

## 8. FRONTEND EVENT FIRING MAP

Exact integration points. Barbarian: wire these into existing components.

### 8.1 Existing Component Modifications

| Component | Event | Trigger Point | Code |
|---|---|---|---|
| `App.jsx` | `app_loaded` | `useEffect([], ...)` on mount | `eventTracker.track('app_loaded', { load_time_ms: performance.now() })` |
| `App.jsx` | Device state check | `useEffect([], ...)` after mount | Fetch `GET /api/device/{deviceId}/state`, set prompt visibility flags in state |
| `GameSelector.jsx` | `session_start` | `onClick` handler for game card | `const sid = createSession(gameId, title); eventTracker.track('session_start', { _game_id: gameId, game_title: title })` |
| `GameSelector.jsx` | Device state update | Same `onClick` | `POST /api/device/{deviceId}/state { action: 'session_start', venue_id }` |
| `QueryInterface.jsx` | `tab_viewed` | Tab button `onClick` | `eventTracker.track('tab_viewed', { _game_id: currentGameId, tab_name: tabName })` |
| `QueryInterface.jsx` | `question_asked` | After STT completes or text submit | `eventTracker.track('question_asked', { _game_id, question_text, input_method, stt_confidence })` |
| `ResponseDisplay.jsx` | `response_delivered` | When AI response renders | `eventTracker.track('response_delivered', { _game_id, response_length_chars, response_time_ms, was_fallback })` |
| `VoiceButton.jsx` | `voice_played` | `SpeechSynthesis.onend` | `eventTracker.track('voice_played', { _game_id, duration_ms })` |
| Score tracker | `score_recorded` | On score entry | `eventTracker.track('score_recorded', { _game_id, player_name, score_value })` |
| End Game button | `game_ended` | After confirmation dialog | `eventTracker.track('game_ended', { _game_id, end_reason, player_count, duration_seconds }); clearSession();` |
| Error boundary | `error_occurred` | `componentDidCatch` / `window.onerror` | `eventTracker.track('error_occurred', { error_type, error_message, stack_trace: truncated })` |

### 8.2 New Components

#### `DiscoveryPrompt.jsx`
**Shows when:** `deviceState.show_discovery_prompt === true`
**Renders:** Full-screen overlay with 3 large buttons + dismiss handler
**On button tap:** `POST /api/events/discovery` -> hide overlay -> proceed to game
**On dismiss:** `POST /api/events/discovery` with `source: 'skipped'` -> hide overlay -> proceed

```jsx
// Pseudocode structure
function DiscoveryPrompt({ venueId, deviceId, onComplete }) {
  const handleSelect = async (source) => {
    await fetch('/api/events/discovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: deviceId,
        venue_id: venueId,
        source,
        submitted_at: new Date().toISOString()
      })
    });
    onComplete();
  };

  return (
    <div className="overlay">
      <h2>How did you find GameMaster AI?</h2>
      <button onClick={() => handleSelect('table_sign')}>I saw it on the table</button>
      <button onClick={() => handleSelect('staff')}>Staff told me about it</button>
      <button onClick={() => handleSelect('friend')}>Someone showed me</button>
    </div>
  );
}
```

#### `NPSPrompt.jsx`
**Shows when:** `deviceState.show_nps_prompt === true` (after `game_ended`, before `PostGameSurvey`)
**Renders:** Full-screen overlay with 0-10 number row

```jsx
function NPSPrompt({ venueId, deviceId, sessionNumber, onComplete }) {
  const handleScore = async (score) => {
    await fetch('/api/events/nps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: deviceId,
        venue_id: venueId,
        nps_score: score,  // null if skipped
        session_number: sessionNumber,
        submitted_at: new Date().toISOString()
      })
    });
    onComplete();
  };

  return (
    <div className="overlay">
      <h2>One quick question</h2>
      <p>How likely are you to recommend GameMaster AI to a friend?</p>
      <div className="nps-row">
        {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
          <button key={n} onClick={() => handleScore(n)}>{n}</button>
        ))}
      </div>
      <span className="nps-label-left">Not likely</span>
      <span className="nps-label-right">Very likely</span>
      <button className="skip" onClick={() => handleScore(null)}>Skip</button>
    </div>
  );
}
```

#### `PostGameSurvey.jsx`
**Shows when:** After every `game_ended` (and after NPS if it was shown)
**Renders:** Two-tier survey form per Bard's spec

```jsx
function PostGameSurvey({ sessionId, venueId, deviceId, gameId, onComplete }) {
  const [showOptional, setShowOptional] = useState(false);
  const [formData, setFormData] = useState({
    game_rating: null,
    ai_helpfulness_overall: null,
    would_use_again: null,
    played_before: null,
    helpful_setup: null,
    helpful_rules: null,
    helpful_strategy: null,
    helpful_scoring: null,
    feedback_text: null,
  });

  const handleSubmit = async () => {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        venue_id: venueId,
        device_id: deviceId,
        game_id: gameId,
        ...formData,
        submitted_at: new Date().toISOString()
      })
    });
    onComplete();
  };

  // ... render required tier fields, optional expansion, submit/skip buttons
}
```

#### `EventTracker.js`
Service module as specified in Section 4.2. Singleton, imported wherever events are tracked.

### 8.3 Post-Game Flow Sequence

When user taps "End Game" and confirms:

```
1. Fire 'game_ended' event (immediate flush)
2. Show results screen (scores ranked, winner)
3. Check deviceState:
   a. If show_nps_prompt === true -> show NPSPrompt
   b. After NPS (or if not needed) -> show PostGameSurvey
4. After survey submit or skip -> navigate to /games (GameSelector)
5. Clear session
```

---

## 9. TELEGRAM INTEGRATION

### 9.1 Feedback Notifications

**Trigger:** Every `POST /api/feedback` submission.
**Format:**
```
📊 New Feedback — {Game Title} at {Venue Name}
Game: ⭐{game_rating}/5 | AI: ⭐{ai_helpfulness_overall}/5
Would use again: {Yes/No}
{If detailed: Setup: {n}/5 | Rules: {n}/5 | Strategy: {n}/5 | Scoring: {n}/5}
{If feedback_text: "first 100 chars..."}
```

### 9.2 CRM Alert Notifications

**Trigger:** Nightly cron (after rollup) and on-demand from `/api/crm/alerts`.
**Format:**
```
🚨 GMAI Alert — {Venue Name}
Type: {alert_type_human_readable}
Details: {message}
Action needed: Check CRM dashboard
```

### 9.3 Daily Digest (Optional, Phase 10)

**Trigger:** Daily at 9:00 AM Pacific (cron job).
**Format:**
```
📈 GMAI Daily Digest — {date}

{For each venue with activity yesterday:}
🏪 {Venue Name}
Sessions: {n} | Users: {n} | Rating: ⭐{n}/5
{If any alerts: ⚠️ {alert_message}}

Totals: {total_sessions} sessions across {venue_count} venues
```

### 9.4 Implementation

```python
# services/telegram.py
import httpx
import os

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")   # 8535000205
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")        # 6236947695
TELEGRAM_URL = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"

async def send_telegram(message: str):
    """Fire and forget. Never block on Telegram failure."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(TELEGRAM_URL, json={
                "chat_id": CHAT_ID,
                "text": message,
                "parse_mode": "Markdown"
            })
    except Exception as e:
        # Log but don't raise — Telegram is nice-to-have, not critical path
        print(f"Telegram send failed: {e}")
```

---

## 10. PRIVACY APPROACH

### What We Collect
- **Device ID:** Random UUID stored in localStorage. Not tied to any personal identity. Cannot identify a person — only identifies a browser instance on a hardware device.
- **Interaction events:** What games were played, what questions were asked, how long sessions lasted. No names, emails, or personal identifiers.
- **Feedback:** Voluntary ratings and optional free-text. Player names in score tracker are nicknames entered by the user (e.g., "Alice", "Player 1") — not real identities.
- **Voice data:** Not recorded or stored. Web Speech API processes speech locally in the browser. We only store the transcribed text and confidence score.

### What We Do NOT Collect
- Real names, emails, phone numbers, or any PII
- Audio recordings
- Location data (beyond venue_id, which is the cafe's identity, not the user's)
- Browsing history or cross-site tracking
- Photos or biometric data

### Data Retention
- Raw events: 90 days, then purged (daily rollups preserved indefinitely)
- Feedback: Indefinite (small volume, high value)
- Discovery/NPS: Indefinite (one record per device, trivial storage)
- Device state: Indefinite (one record per device)

### User Control
- No login means no "delete my data" flow needed (GDPR exemption for anonymous data)
- Clearing browser localStorage resets the device_id — effectively a fresh start
- Venue owners can request full data export or deletion via Tim

### Venue Isolation
- All queries are filtered by `venue_id`
- Venue admins can ONLY see their own data
- CRM view is restricted to Tim's super_admin account
- No cross-venue data leakage in any API response

---

## 11. MIGRATION & IMPLEMENTATION PLAN

### Constraints Recap
- $0 budget
- Production system live at playgmai.com — cannot break it
- Render ephemeral filesystem (solved by Turso)
- Cloudflare Pages frontend (static deploy)
- Must work on cafe wifi

### Phase-by-Phase Implementation

#### Phase 1: Foundation — Analytics Database + Event Ingestion
**What:** Create Turso database, create all tables (Section 2), deploy `POST /api/events` endpoint.
**Why first:** Everything depends on this. No data collection = no analytics.
**Steps:**
1. Create Turso account and database
2. Add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to Render environment variables
3. Add `libsql-experimental` to `requirements.txt`
4. Create `services/analytics_db.py` — connection helper (Turso in prod, local SQLite in dev)
5. Create all 6 tables via migration script (run on startup if tables don't exist)
6. Deploy `POST /api/events` endpoint
7. **Verify:** POST a test event batch, query Turso to confirm data landed

#### Phase 2: Device State
**What:** Deploy device state table + GET/POST endpoints.
**Why second:** Needed before any prompts can be shown.
**Steps:**
1. Deploy `GET /api/device/{device_id}/state` and `POST /api/device/{device_id}/state`
2. **Verify:** Create a device state, retrieve it, increment session count

#### Phase 3: Frontend EventTracker
**What:** Add `EventTracker.js`, `deviceId.js`, `sessionManager.js` to frontend. Wire events into existing components.
**Why third:** Start collecting real usage data immediately.
**Steps:**
1. Create the 3 service modules
2. Add `app_loaded` tracking to `App.jsx`
3. Add `session_start` tracking to `GameSelector.jsx`
4. Add `tab_viewed`, `question_asked` tracking to `QueryInterface.jsx`
5. Add `response_delivered` tracking to `ResponseDisplay.jsx`
6. Add `voice_played` tracking to `VoiceButton.jsx`
7. Add `game_ended` tracking to End Game flow
8. Add global error boundary for `error_occurred`
9. Deploy to Cloudflare Pages
10. **Verify:** Use the app, check Turso for events appearing

#### Phase 4: Discovery Prompt
**What:** `DiscoveryPrompt.jsx` component + `POST /api/events/discovery` endpoint.
**Steps:**
1. Deploy discovery endpoint
2. Build DiscoveryPrompt component
3. Integrate into app flow: on first session, show prompt before game content loads
4. **Verify:** Clear localStorage, open app, see prompt, tap option, verify in Turso, refresh — prompt gone

#### Phase 5: Post-Game Survey
**What:** `PostGameSurvey.jsx` component + update `POST /api/feedback` endpoint.
**Steps:**
1. Update feedback endpoint to accept all fields from Section 2.2
2. Build PostGameSurvey component (two-tier)
3. Wire into post-game flow (after results screen)
4. Add Telegram notification on feedback submission
5. **Verify:** Complete game, see survey, submit required + optional, verify data + Telegram

#### Phase 6: NPS Prompt
**What:** `NPSPrompt.jsx` component + `POST /api/events/nps` endpoint.
**Steps:**
1. Deploy NPS endpoint
2. Build NPSPrompt component
3. Wire into post-game flow: show after 3rd game_ended, before PostGameSurvey
4. **Verify:** Complete 3 games on same device, see NPS on 3rd, verify data

#### Phase 7: Computed Metrics + Rollup Job
**What:** Implement all SQL queries from Section 6 as service functions. Build nightly rollup. Set up cron.
**Steps:**
1. Create `services/metrics.py` with query functions
2. Create `services/rollup.py` with nightly rollup logic
3. Deploy `POST /api/internal/rollup` endpoint with secret auth
4. Register cron at cron-job.org for daily 3:00 AM UTC
5. **Verify:** Trigger rollup manually, check `daily_rollups` table

#### Phase 8: Per-Venue Analytics Dashboard
**What:** All `/api/admin/analytics/*` endpoints + frontend dashboard page.
**Steps:**
1. Deploy all 6 analytics endpoints
2. Build analytics tab in existing admin page
3. Implement charts with Chart.js (CDN)
4. Add date range picker
5. **Verify:** Log in as venue admin, see real data

#### Phase 9: Global CRM View
**What:** All `/api/crm/*` endpoints + CRM frontend page.
**Steps:**
1. Add `role` column to accounts table, set Tim's to `super_admin`
2. Deploy all 5 CRM endpoints
3. Build CRM page at `/admin/crm` (only visible to super_admin)
4. Implement venue comparison, trial tracker, aggregates, exports
5. **Verify:** Log in as Tim, see all venues, export case study data

#### Phase 10: Telegram Alerts + Digest
**What:** Extend Telegram with CRM alerts and daily digest.
**Steps:**
1. Add alert checking to rollup cron
2. Send Telegram on alert conditions
3. Build daily digest message
4. Add 9:00 AM Pacific cron trigger for digest
5. **Verify:** Trigger an alert condition, verify Telegram message

### Sprint Strategy

**Sprint 1 (Phases 1-6):** Get data collection running ASAP. Every day without event tracking is data we'll never get back. Target: 2-3 days of Barbarian time.

**Sprint 2 (Phases 7-10):** Dashboards and CRM. These just read data that's already being collected, so they can lag by a few days without data loss. Target: 3-4 days of Barbarian time.

### Rollback Strategy

Each phase is independently deployable. If a phase breaks production:
1. Revert the Render deploy (git revert + push)
2. Frontend: revert Cloudflare Pages deploy
3. Turso data is persistent and unaffected by backend rollbacks
4. The EventTracker queues events locally if backend is down, flushes on recovery

### Estimated Effort

| Phase | Effort | Cumulative |
|---|---|---|
| 1: Foundation | 2-3 hours | 3 hours |
| 2: Device state | 1 hour | 4 hours |
| 3: Frontend events | 2-3 hours | 7 hours |
| 4: Discovery prompt | 1-2 hours | 9 hours |
| 5: Post-game survey | 2-3 hours | 12 hours |
| 6: NPS prompt | 1-2 hours | 14 hours |
| 7: Metrics + rollup | 3-4 hours | 18 hours |
| 8: Venue dashboard | 4-5 hours | 23 hours |
| 9: CRM view | 4-5 hours | 28 hours |
| 10: Telegram | 2-3 hours | 31 hours |

**Total: ~31 hours of Barbarian time.**

---

## 12. CHARTING LIBRARY RECOMMENDATION

**Recommendation: Chart.js via CDN.**

Why:
- Free, MIT license
- 60KB gzipped — loads fast even on cafe wifi
- Supports line, bar, pie, doughnut — covers all dashboard needs
- Responsive and mobile-friendly out of the box
- CDN: `https://cdn.jsdelivr.net/npm/chart.js` — no npm install needed for Cloudflare Pages
- Well-documented

Alternative: inline SVG bars. Works for simple charts but painful for line charts and pie charts. Chart.js is worth the 60KB.

---

## 13. DASHBOARD DATA CONTRACTS SUMMARY

Quick reference for Barbarian when wiring up the frontend.

| Dashboard Section | API Endpoint | Key Response Fields |
|---|---|---|
| Today's Snapshot | `GET /api/admin/analytics/snapshot` | sessions_today, unique_users_today, avg_rating_today, top_game_today, errors_today |
| Trends Charts | `GET /api/admin/analytics/trends?range=7d` | series[].date, sessions, completion_rate, avg_rating |
| Game Leaderboard | `GET /api/admin/analytics/games?range=30d` | games[].game_id, sessions, completion_rate, avg_rating, avg_duration |
| Feedback Feed | `GET /api/admin/analytics/feedback?range=30d&filter=all&page=1` | entries[].game_rating, ai_helpfulness, feedback_text, submitted_at |
| Technical Health | `GET /api/admin/analytics/technical?range=7d` | load_time.avg_ms, voice_accuracy.avg, errors.total, fallback_rate |
| Discovery | `GET /api/admin/analytics/discovery` | breakdown.{source}.count, self_discovery_rate |
| CRM Venues | `GET /api/crm/venues` | venues[].venue_name, status, sessions, completion_rate, health |
| CRM Trials | `GET /api/crm/trials` | trials[].milestones, alerts, usage_trend |
| CRM Aggregate | `GET /api/crm/aggregate` | total_sessions, avg_nps, avg_rating, top_games |
| CRM Alerts | `GET /api/crm/alerts` | alerts[].type, severity, message |

---

## 14. OPEN QUESTIONS FOR TIM

These are business decisions, not technical ones. I need Tim's call before Barbarian starts Phase 9:

1. **Trial start date tracking:** Where does Tim record when a venue's trial started? I need a `trial_start_date` and `trial_duration_days` per venue. Recommendation: add two columns to the existing venue/accounts table. Tim sets them once per venue.

2. **Venue status values:** I've assumed `trial` and `active`. Are there others? (`churned`, `prospect`, `paused`?) This affects the CRM view.

3. **Daily digest timing:** 9:00 AM which timezone? I'm assuming Pacific since Tim is in Vegas. Confirm.

---

## ACCEPTANCE CRITERIA CHECKLIST

Mapping back to Bard's requirements from the original ticket:

- [x] Event schema: every event type with exact field names, types, and fire conditions (Section 2.1, Section 8)
- [x] Database schema: all new tables with columns, types, indexes, example rows (Section 2)
- [x] Storage strategy decided with reasoning (Section 1 — Turso)
- [x] Session ID and device ID strategies defined (Section 3)
- [x] Event transmission approach decided with reasoning (Section 4 — batched)
- [x] All API endpoints specified with request/response shapes and auth (Section 5)
- [x] Computed metrics: SQL queries for every metric (Section 6)
- [x] Feedback UX: wireframe-level spec for all three survey moments (Section 8.2)
- [x] Frontend integration points: which components fire which events (Section 8.1)
- [x] Dashboard data contracts: JSON shapes for analytics APIs (Section 13)
- [x] CRM view data contracts: JSON shapes for CRM APIs (Section 5.4)
- [x] Telegram message formats for feedback + alerts (Section 9)
- [x] Migration plan: phased implementation without breaking production (Section 11)
- [x] Data persistence strategy for Render's ephemeral filesystem (Section 1 — Turso)
- [x] Privacy approach: what we collect, what we don't, retention policy (Section 10)
- [x] Implementation order confirmed with reasoning (Section 11)

---

*End of architecture specification. — Wizard (CTO / Architect)*
