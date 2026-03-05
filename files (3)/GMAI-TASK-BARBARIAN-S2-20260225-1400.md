# GMAI-TASK-BARBARIAN-S2-20260225-1400
## From: Bard (CoS)
## To: Barbarian (Field Engineer)
## Priority: High
## Depends On: Current main branch (UI polish complete)

---

## Context

We're adding venue login as the entry point for QR codes on leave-behind PDFs, plus the foundation for the CRM analytics system. This is a multi-sprint ticket — complete each sprint in order, commit and push after each one. Do NOT batch.

The business goal: every venue interaction is trackable to a specific venue account, giving Tim real usage data for conversion conversations.

---

## SPRINT 1: LOGIN SCREEN AS QR ENTRY POINT (~2 hours)

### What

When a venue scans their QR code, they currently land on playgmai.com (the marketing landing page). Instead, QR codes should route to a LOGIN screen. After login, venues see their branded game library. The marketing page stays for cold leads.

### Instructions

**1. Create /login route**

Build a new LoginPage component at `/login`. This is what venue QR codes point to.

Design:
- Dark background matching app theme
- GMAI logo centered at top
- "Welcome to GameMaster AI" heading
- Email input field
- Password input field
- "Log In" button (pink/red, full width)
- "Forgot credentials? Contact tim.minh.pham@gmail.com" small text below
- On error: red inline message "Invalid email or password"
- No "Create Account" link — Tim creates all accounts manually

On successful login:
- Store auth token/session (however the existing auth works)
- Redirect to /games (the game library, branded for their venue)
- The /games page should show the venue name in the header

On failed login:
- Show error message inline, don't navigate
- Clear password field, keep email

**2. Update QR code URLs**

In the backend, wherever QR URLs are generated for venues:
- Change from `https://playgmai.com/` to `https://playgmai.com/login`
- This includes the leave-behind PDF generation if QR URLs are hardcoded there

**3. Keep the marketing landing page at /**

The root route `/` stays as the marketing/landing page. No changes to it.
Cold leads, Google traffic, etc. still see the landing page with pricing, features, CTAs.

**4. Auto-redirect if already logged in**

If a user hits `/login` but already has a valid session:
- Skip login screen
- Redirect straight to `/games`

If a user hits `/games` without a valid session:
- Redirect to `/login`

**5. Demo mode (no login)**

The existing "GameMaster AI Demo" experience (no login required) should still work.
Route: `/demo` or keep current behavior on `/games` when no auth.

Actually — simplify this: If someone hits `/games` with no session, show the full game library in demo mode (venue = "GameMaster AI Demo", venue_id = "demo"). No redirect to login. Login is only required for branded venue experience.

Update the /games page logic:
- If logged in → show venue-branded experience (venue name, custom GOTD, staff picks)
- If NOT logged in → show "GameMaster AI Demo" experience (default GOTD, default staff picks)
- Both work fine, login just adds venue branding and tracking

**6. Add venue status columns to accounts table**

Alter the existing accounts/venues table:

```sql
ALTER TABLE accounts ADD COLUMN role TEXT NOT NULL DEFAULT 'venue_admin'
    CHECK(role IN ('venue_admin', 'super_admin'));
ALTER TABLE accounts ADD COLUMN status TEXT NOT NULL DEFAULT 'prospect'
    CHECK(status IN ('prospect', 'trial', 'active', 'churned', 'paused'));
ALTER TABLE accounts ADD COLUMN trial_start_date TEXT;  -- ISO date, NULL until Tim sets it
ALTER TABLE accounts ADD COLUMN trial_duration_days INTEGER DEFAULT 30;
ALTER TABLE accounts ADD COLUMN last_login_at TEXT;  -- ISO timestamp, updated on each login
ALTER TABLE accounts ADD COLUMN login_count INTEGER NOT NULL DEFAULT 0;
```

Set Tim's account to super_admin:
```sql
UPDATE accounts SET role = 'super_admin' WHERE email LIKE '%tim%' OR username = 'tim';
```

All existing venue accounts default to: role=venue_admin, status=prospect.

**7. Track login events**

On successful login:
- Update `last_login_at` to current timestamp
- Increment `login_count`
- This is simple SQL, no Turso needed yet

### Acceptance Criteria
- [ ] Scanning QR goes to /login page
- [ ] Login with demo@meepleville.com / gmai2026 → lands on /games with "Meepleville" branding
- [ ] Login with wrong password → shows error, stays on /login
- [ ] /games without login → shows demo mode (full library, no venue branding)
- [ ] Already logged in + hitting /login → redirects to /games
- [ ] Accounts table has new columns (role, status, trial_start_date, last_login_at, login_count)
- [ ] Tim's account has role=super_admin

### Build & Push
```
cd D:\GameMasterAI\frontend && npm run build
cd D:\GameMasterAI && git add -A && git commit -m "Sprint 1: Login screen as QR entry point, venue status tracking" && git push
```

---

## SPRINT 2: TURSO DATABASE SETUP + EVENT INGESTION (~3 hours)

### What

Set up Turso (hosted SQLite) for persistent analytics storage. Create the event ingestion pipeline. This is the foundation — every later analytics feature depends on this.

### Instructions

**1. Install Turso CLI and create database**

In WSL2 on K2-PC:
```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso db create gmai-analytics --location sjc
turso db show gmai-analytics --url
turso db tokens create gmai-analytics
```

Save the URL and token. Add to Render environment variables:
- `TURSO_DATABASE_URL` = the libsql:// URL
- `TURSO_AUTH_TOKEN` = the token

**2. Add Python dependency**

Add to requirements.txt:
```
libsql-experimental>=0.0.34
```

**3. Create analytics database connection**

Create `backend/app/services/analytics_db.py`:

```python
import os
import libsql_experimental as libsql
import logging

logger = logging.getLogger(__name__)

TURSO_URL = os.getenv("TURSO_DATABASE_URL")
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN")

_connection = None

def get_analytics_db():
    global _connection
    if _connection is None:
        if TURSO_URL and TURSO_AUTH_TOKEN:
            _connection = libsql.connect(TURSO_URL, auth_token=TURSO_AUTH_TOKEN)
            logger.info(f"Connected to Turso: {TURSO_URL}")
        else:
            # Local dev fallback
            _connection = libsql.connect("analytics.db")
            logger.warning("Using local analytics.db (no Turso credentials)")
    return _connection

def init_analytics_tables():
    db = get_analytics_db()
    db.executescript("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            venue_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            session_id TEXT,
            game_id TEXT,
            timestamp TEXT NOT NULL,
            payload TEXT NOT NULL DEFAULT '{}'
        );
        CREATE INDEX IF NOT EXISTS idx_events_venue_date ON events(venue_id, timestamp);
        CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
        CREATE INDEX IF NOT EXISTS idx_events_type_venue ON events(event_type, venue_id, timestamp);

        CREATE TABLE IF NOT EXISTS device_state (
            device_id TEXT PRIMARY KEY,
            venue_id TEXT NOT NULL,
            first_seen_at TEXT NOT NULL,
            session_count INTEGER NOT NULL DEFAULT 0,
            has_seen_discovery_prompt BOOLEAN NOT NULL DEFAULT 0,
            has_seen_nps_prompt BOOLEAN NOT NULL DEFAULT 0,
            last_session_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_device_state_venue ON device_state(venue_id);

        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            venue_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            game_id TEXT NOT NULL,
            lobby_id TEXT,
            player_name TEXT,
            game_rating INTEGER NOT NULL CHECK(game_rating BETWEEN 1 AND 5),
            ai_helpfulness_overall INTEGER NOT NULL CHECK(ai_helpfulness_overall BETWEEN 1 AND 5),
            would_use_again BOOLEAN NOT NULL,
            played_before BOOLEAN,
            helpful_setup INTEGER CHECK(helpful_setup BETWEEN 1 AND 5),
            helpful_rules INTEGER CHECK(helpful_rules BETWEEN 1 AND 5),
            helpful_strategy INTEGER CHECK(helpful_strategy BETWEEN 1 AND 5),
            helpful_scoring INTEGER CHECK(helpful_scoring BETWEEN 1 AND 5),
            feedback_text TEXT,
            submitted_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_feedback_venue_date ON feedback(venue_id, submitted_at);
        CREATE INDEX IF NOT EXISTS idx_feedback_game ON feedback(game_id, venue_id);

        CREATE TABLE IF NOT EXISTS discovery_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL UNIQUE,
            venue_id TEXT NOT NULL,
            source TEXT NOT NULL CHECK(source IN ('table_sign', 'staff', 'friend', 'skipped')),
            submitted_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS nps_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL UNIQUE,
            venue_id TEXT NOT NULL,
            nps_score INTEGER CHECK(nps_score BETWEEN 0 AND 10),
            session_number INTEGER NOT NULL,
            submitted_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS daily_rollups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venue_id TEXT NOT NULL,
            date TEXT NOT NULL,
            total_sessions INTEGER NOT NULL DEFAULT 0,
            unique_devices INTEGER NOT NULL DEFAULT 0,
            completed_sessions INTEGER NOT NULL DEFAULT 0,
            avg_duration_seconds REAL,
            total_questions INTEGER NOT NULL DEFAULT 0,
            voice_questions INTEGER NOT NULL DEFAULT 0,
            text_questions INTEGER NOT NULL DEFAULT 0,
            avg_stt_confidence REAL,
            total_responses INTEGER NOT NULL DEFAULT 0,
            fallback_responses INTEGER NOT NULL DEFAULT 0,
            avg_response_time_ms REAL,
            feedback_count INTEGER NOT NULL DEFAULT 0,
            avg_game_rating REAL,
            avg_ai_helpfulness REAL,
            would_use_again_yes INTEGER NOT NULL DEFAULT 0,
            would_use_again_no INTEGER NOT NULL DEFAULT 0,
            avg_load_time_ms REAL,
            error_count INTEGER NOT NULL DEFAULT 0,
            completion_rate REAL,
            fallback_rate REAL,
            UNIQUE(venue_id, date)
        );
        CREATE INDEX IF NOT EXISTS idx_rollups_venue_date ON daily_rollups(venue_id, date);
    """)
    db.commit()
    logger.info("Analytics tables initialized")
```

**4. Initialize on startup**

In main.py, add to the startup event:
```python
from app.services.analytics_db import init_analytics_tables
init_analytics_tables()
```

**5. Create event ingestion endpoint**

Create `backend/app/api/routes/events.py`:

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import json
from app.services.analytics_db import get_analytics_db

router = APIRouter()

VALID_EVENT_TYPES = {
    'app_loaded', 'session_start', 'tab_viewed', 'question_asked',
    'response_delivered', 'voice_played', 'score_recorded',
    'game_ended', 'error_occurred'
}

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

    db = get_analytics_db()
    rows = []
    for e in batch.events:
        if e.event_type not in VALID_EVENT_TYPES:
            continue  # skip invalid, don't fail batch
        rows.append((
            e.event_type, e.venue_id, e.device_id,
            e.session_id, e.game_id, e.timestamp,
            json.dumps(e.payload)
        ))

    if rows:
        db.executemany(
            """INSERT INTO events (event_type, venue_id, device_id, session_id, game_id, timestamp, payload)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            rows
        )
        db.commit()

    return {"accepted": len(rows)}
```

**6. Create device state endpoints**

Add to events.py or create a new device.py route file:

```python
@router.get("/api/device/{device_id}/state")
async def get_device_state(device_id: str):
    db = get_analytics_db()
    row = db.execute("SELECT * FROM device_state WHERE device_id = ?", (device_id,)).fetchone()
    if row:
        return {
            "device_id": row[0], "venue_id": row[1],
            "session_count": row[3],
            "has_seen_discovery_prompt": bool(row[4]),
            "has_seen_nps_prompt": bool(row[5]),
            "show_discovery_prompt": not bool(row[4]) and row[3] == 0,
            "show_nps_prompt": not bool(row[5]) and row[3] >= 3
        }
    return {
        "device_id": device_id, "venue_id": None,
        "session_count": 0,
        "has_seen_discovery_prompt": False, "has_seen_nps_prompt": False,
        "show_discovery_prompt": True, "show_nps_prompt": False
    }

@router.post("/api/device/{device_id}/state")
async def update_device_state(device_id: str, data: dict):
    db = get_analytics_db()
    from datetime import datetime
    now = datetime.utcnow().isoformat() + "Z"
    db.execute("""
        INSERT INTO device_state (device_id, venue_id, first_seen_at, session_count, last_session_at)
        VALUES (?, ?, ?, 1, ?)
        ON CONFLICT(device_id) DO UPDATE SET
            session_count = session_count + 1,
            last_session_at = ?
    """, (device_id, data.get("venue_id", "demo"), now, now, now))
    db.commit()
    return {"updated": True}
```

**7. Create leaderboard endpoint (stops the 404 error)**

Add a simple endpoint that the frontend is already calling:

```python
@router.get("/api/leaderboard/{game_id}")
async def get_leaderboard(game_id: str):
    # TODO: populate from real data later
    return []
```

**8. Register routes**

In main.py, register the new router:
```python
from app.api.routes.events import router as events_router
app.include_router(events_router)
```

### Acceptance Criteria
- [ ] Turso database created and credentials in Render env vars
- [ ] POST /api/events accepts a batch of events and stores them in Turso
- [ ] GET /api/device/{id}/state returns device state
- [ ] POST /api/device/{id}/state upserts device record
- [ ] GET /api/leaderboard/{game_id} returns [] (no more 404)
- [ ] Tables created successfully on startup (check Render logs)
- [ ] Test: POST a batch of 3 events, verify they appear in Turso (use `turso db shell gmai-analytics` then `SELECT * FROM events;`)

### Build & Push
```
cd D:\GameMasterAI\frontend && npm run build
cd D:\GameMasterAI && git add -A && git commit -m "Sprint 2: Turso analytics DB, event ingestion, device state endpoints" && git push
```

---

## SPRINT 3: FRONTEND EVENT TRACKING (~3 hours)

### What

Wire up the EventTracker service on the frontend so every user interaction is captured and batched to the backend.

### Instructions

**1. Create EventTracker service**

Create `frontend/src/services/EventTracker.js`:

Implement as a singleton class with:
- In-memory event queue
- `track(eventType, payload)` method
- Auto-flush every 10 seconds
- Flush on queue >= 20 events
- Immediate flush on `game_ended`
- `navigator.sendBeacon` on page unload
- Retry on failure (push events back to queue)
- `init(venueId)` to set the current venue

Refer to Section 4.2 of the architecture doc for the complete implementation.

**2. Create device ID service**

Create `frontend/src/services/deviceId.js`:
```javascript
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

**3. Create session manager**

Create `frontend/src/services/sessionManager.js`:
```javascript
export function createSession(gameId) {
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

**4. Wire events into existing components**

Follow the firing map from Section 8.1 of the architecture doc:

| Component | Event | When |
|---|---|---|
| App.jsx | `app_loaded` | On mount, with load_time_ms |
| GameSelector (game card click) | `session_start` | When user picks a game |
| Tab buttons | `tab_viewed` | When user switches tabs |
| Q&A submit | `question_asked` | After text submit or STT complete |
| AI response render | `response_delivered` | When response appears |
| Voice playback | `voice_played` | When TTS finishes |
| Score input | `score_recorded` | When a score is entered |
| End Game button | `game_ended` | After confirmation, before survey |
| Error boundary | `error_occurred` | On any caught error |

**5. Initialize EventTracker with venue context**

In App.jsx on mount:
- Get device ID from localStorage
- Get venue ID from auth session (or "demo" if not logged in)
- Call `eventTracker.init(venueId)`
- Track `app_loaded` event

### Acceptance Criteria
- [ ] Open app → `app_loaded` event fires
- [ ] Select a game → `session_start` fires with game_id
- [ ] Switch tabs → `tab_viewed` fires with tab_name
- [ ] Ask a question → `question_asked` fires with question_text and input_method
- [ ] All events batch-flush to POST /api/events every 10s
- [ ] Events appear in Turso (verify with `turso db shell`)
- [ ] Page close sends remaining events via sendBeacon

### Build & Push
```
cd D:\GameMasterAI\frontend && npm run build
cd D:\GameMasterAI && git add -A && git commit -m "Sprint 3: Frontend EventTracker, device ID, session manager, all events wired" && git push
```

---

## FUTURE SPRINTS (DO NOT START YET)

These are planned but not yet assigned. Bard will ticket them separately:

- Sprint 4: Discovery prompt component
- Sprint 5: Post-game survey (update existing)
- Sprint 6: NPS prompt
- Sprint 7: Computed metrics + nightly rollup cron
- Sprint 8: Per-venue analytics dashboard
- Sprint 9: Global CRM view (super_admin only)
- Sprint 10: Telegram digest + alerts

---

## Report Back

After each sprint, email [GMAI-LOG] to Tim's Gmail with:
1. What was deployed
2. What endpoints are live
3. Any errors or issues encountered
4. Verification results (did you test it?)
