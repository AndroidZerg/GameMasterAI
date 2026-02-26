# GAMEMASTER GUIDE — Bard Dashboard
## Last Updated: February 25, 2026 (end of Round 9)
## Status: DEMO-READY | 200 games | 6 venues | Live at playgmai.com

---

## EXECUTIVE SUMMARY

GameMaster Guide is a voice-interactive board game teaching app for board game cafes. It runs on tablets at gaming tables and uses AI to walk customers through setup, rules, strategy, and in-game questions — reducing staff teaching burden by 50–70%.

**Rebrand note:** Product renamed from "GameMaster AI" to "GameMaster Guide" (R9). Reason: "AI" triggers job-replacement anxiety in cafe staff, who are our gatekeepers. "Guide" positions the product as a teaching assistant that augments staff. Domain stays playgmai.com.

**What exists right now:** A fully functional web app at playgmai.com with 200 games, 6 Las Vegas venue accounts, login-gated access, score tracking with multiplayer lobby sync, an order/cart system, Q&A with notes, role-based access control for Dice Tower demo accounts, and the foundation of a CRM/analytics pipeline. It is demo-ready for venue pitches and convention floor demos.

**What we're selling:** Monthly SaaS subscriptions to board game cafes. Zero competitors in the B2B cafe subscription space. First-mover advantage.

---

## SPRINT HISTORY

| Round | Date | Focus | Key Deliverables |
|-------|------|-------|-----------------|
| R1 | Feb 22 | Overnight MVP | 50 games, FastAPI backend, React frontend, voice I/O, ClawProxy LLM |
| R2 | Feb 23 | Content rewrite | Schema v2.0, rulebook-sourced rewrites, quality audit |
| R3 | Feb 23 | Venue system | Login/auth, 6 Vegas venue accounts, game filtering, named score tracker |
| R4 | Feb 24 | Public deploy | playgmai.com live (Cloudflare Pages + Render), OpenAI API integration |
| R5 | Feb 24 | Expansion | 200-game library, real BGG cover art pipeline, F&B menus |
| R6 | Feb 24 | Polish | Score tracker overhaul, cover art curation, admin dashboard |
| R7 | Feb 25 | UI/UX | Order system, Q&A notes, pricing tiers, leave-behind PDFs, contact form, admin config persistence |
| R8 | Feb 25 | CRM Foundation | Login screen as entry point, Turso analytics backend, EventTracker, account schema (role/status/trial) |
| R9 | Feb 25 | Dice Tower Prep | Rebrand to GameMaster Guide, role-based demo accounts, email gate signup, Scribe agent, 5 PD game KBs, Score tab patch, NavMenu hook fix |

---

## LIVE PRODUCT

### URLs
- **App:** https://playgmai.com/ (login screen → game library)
- **Signup (convention floor):** https://playgmai.com/signup
- **Marketing/Landing:** https://playgmai.com/landing
- **Backend API:** https://gmai-backend.onrender.com
- **GitHub:** AndroidZerg/GameMasterAI

### Infrastructure
- **Frontend:** Cloudflare Pages (static React build)
- **Backend:** Render free tier (FastAPI/Python)
- **LLM:** OpenAI API (gpt-4o-mini via LLM_BASE_URL on Render)
- **Analytics DB:** Turso (libsql) — pending env var setup; falls back to local SQLite
- **Game data:** 200 JSON files committed to repo, rebuilt on deploy
- **Domain:** playgmai.com via Cloudflare (Namecheap registrar)

### Render Environment Variables
| Variable | Value/Status |
|----------|-------------|
| CORS_ORIGIN | Set |
| LLM_API_KEY | Set |
| LLM_BASE_URL | Set |
| LLM_MODEL | Set |
| TELEGRAM_BOT_TOKEN | 8535000205:AAEf2rJhVD89Qzx08Jxmalxu41PuQ1fpwR4 |
| TELEGRAM_CHAT_ID | 6236947695 |
| GITHUB_TOKEN | Set (fine-grained PAT, Contents read/write) |
| TURSO_DATABASE_URL | ⚠️ NOT YET SET — analytics falls back to local SQLite |
| TURSO_AUTH_TOKEN | ⚠️ NOT YET SET |

---

## VENUE ACCOUNTS

Six Las Vegas venues configured. All use password `gmai2026`.

| Venue | Email | Status |
|-------|-------|--------|
| Meepleville | demo@meepleville.com | prospect |
| Knight & Day Games | demo@knightanddaygames.com | prospect |
| Little Shop of Magic | demo@littleshopofmagic.com | prospect |
| Shall We Play? | demo@shallweplay.com | prospect |
| Grouchy John's Coffee | demo@grouchyjohnscoffee.com | prospect |
| Natural Twenty Games | demo@naturaltwentygames.com | prospect |

**Account schema fields:** venue_id, venue_name, email, password, role (venue_admin/super_admin), status (prospect/trial/active/churned/paused), trial_start_date (NULL until manually set), trial_duration_days (default 30), created_at, last_login_at.

Tim's account is `super_admin`. Trial start date is manually set when agreement is signed — NOT auto-triggered on first login.

---

## DICE TOWER WEST DEMO ACCOUNTS

Dice Tower West: March 11–15, 2026 at Westgate Las Vegas. ~4,000 attendees.

All demo accounts live at playgmai.com. Role-based access controls library and features.

| Username | Password | Role | Library | Features | Timed? |
|----------|----------|------|---------|----------|--------|
| admin | watress2 | super_admin | Full 200 | All + admin + analytics | No |
| demo | watress | demo | Limited (5 PD + approved) | All + admin, no analytics, DEMO badge | No |
| meetup | bgninhenderson | meetup | Full 200 | /games + /score + /order only, DEMO badge | Manual toggle |
| (email signups) | none | convention | Limited (5 PD + approved) | /games + /score + /order only, DEMO badge | Expires Mar 22 11:59 PM PT |

**Limited library:** Games tagged `public_domain: true` OR `publisher_approved: true` in their JSON. Initially 5 games. Publisher approvals auto-appear by tag — no code change needed.

**Demo mode ordering:** All roles see DEMO banner + disabled checkout. Cart still works (add/remove, subtotal), just can't submit.

**Meetup toggle:** Admin panel switch (super_admin only). OFF = "This session is not currently active." Default: OFF. Tim flips ON before meetup, OFF after. Persisted via GitHub API config.

**Convention expiry:** March 22 11:59 PM Pacific → /expired screen with free 30-day trial CTA (`playgmai.com/signup?trial=true`).

**Convention signup flow:** playgmai.com/signup → email only → instant /games access. No password, no verification. Email captured to CRM with `source: "dicetower2026"`.

---

## PUBLIC DOMAIN GAME LIBRARY (Dice Tower Demo)

5 games built for the convention floor — fully original content, no publisher IP.

| Game | File | Status |
|------|------|--------|
| Chess | chess.json | In progress (Barbarian producing) |
| Go | go.json | In progress |
| Checkers | checkers.json | In progress |
| Dominoes | dominoes.json | In progress |
| Mahjong | mahjong.json | In progress — Chinese Mahjong only, variant noted in metadata |

Schema addition: `public_domain: true` and `publisher_approved: false` on all 5 files.

---

## PUBLISHER OUTREACH (Dice Tower West)

Outreach emails drafted by Scribe agent. Tim sends manually.

| Publisher | Contact | Status | Priority |
|-----------|---------|--------|----------|
| Stonemaier Games | contact@stonemaier.com | Not sent yet | Highest — send today |
| Asmodee North America | inquiries@asmodeena.com | Not sent yet | Send this week |
| DTW Exhibitor inquiry | dicetowerwest.com/exhibitors | Not sent yet | Send today — 2 weeks out is late |

**Convention floor strategy:** Attend as badge holder. Demo on tablet using demo/watress login. Organic conversations, not booth pitches. Framing: "Here's how it works on Chess — imagine this with your game."

**Copyright position:** All convention-visible content is public domain. No publisher content shown without permission. Publisher games added only after written approval — tagged `publisher_approved: true`.

---

## PRICING

Per location, month-to-month, cancel anytime.

| Tier | Price | Games | Devices | Key Features |
|------|-------|-------|---------|-------------|
| **Starter** | $149/mo | 50 | 1 | Voice AI, score tracking, basic support |
| **Standard** (Most Popular) | $299/mo | 200 | 4 | Custom branding, staff picks & GOTD, F&B menu integration, game sales prompts |
| **Premium** | $499/mo | 200+ | Unlimited + QR | Lobby sync, advanced analytics, priority support, API access, custom score tracking |

**Founding Partner Program:** First 3 venues get free 30-day pilot.

---

## FEATURE STATUS

### ✅ Complete & Live

**Core Teaching Experience**
- 200 games with structured content (Setup, Rules, Strategy tabs)
- AI-powered Q&A chat per game (OpenAI gpt-4o-mini)
- Voice input (Web Speech API) and voice output (SpeechSynthesis)
- Text-to-speech playback controls on Setup/Rules/Strategy tabs
- Blurred background art for non-square cover images

**Game Library**
- Search bar with live filter
- Filter by: Best For (Solo, Family, Party, Date Night, etc.), Players, Time, Difficulty
- Randomized daily carousels (Easy to Learn, Strategy, Party Games)
- Game of the Day (admin-configurable, persisted via GitHub API)
- Staff Picks (admin-configurable, persisted via GitHub API)
- 200 real BGG cover art images (~170 real, ~30 gradient placeholders)

**Score Tracker**
- Unified Score tab (combined score + play together)
- Multiplayer lobby with room codes + QR join
- Per-game score types pre-loaded from score config files
- Editable player names and score type labels
- Show/hide running total toggle
- "Reveal Final Score" with rankings and personalized messages
- End Game flow → results screen → post-game survey
- Lobby sync across devices (working)
- Auto-start timer when entering Score tab

**Q&A and Notes**
- Split-screen: Q&A chat (top) + personal notes (bottom)
- Both independently collapsible (50/50 split when both open)
- Notes expand to fill screen when Q&A collapsed
- Persistent chat history per game (localStorage)
- Copy button on AI responses, Paste button in notes
- Notes auto-save (debounced 2s)

**Order System**
- Order button (top-right) opens panel with 2 tabs:
  - Games & Accessories: current game, expansions, accessories
  - Menu: F&B items by category (hot/cold drinks, beer & wine, food, snacks)
- Cart with quantities, subtotal, checkout
- Orders POST to backend → saved to SQLite → Telegram notification
- Foundation for future POS integration

**Venue System**
- Login-gated access (no anonymous browsing)
- Per-venue branding (name displayed in app)
- Per-venue F&B menus
- Per-venue admin: Game of the Day, Staff Picks, Inquiries, Feedback, Orders
- Admin config persisted: in-memory cache → GitHub API (survives Render restarts)

**Contact & Leads**
- Contact form modal (name, email, venue, message)
- Submissions saved to backend + Telegram notification
- Telegram bot: "GameMaster Guide Leads"
- Admin Inquiries tab shows all submissions

**Analytics & CRM (Foundation — R8)**
- EventTracker service: batched events, 10s auto-flush, sendBeacon on unload
- Events tracked: app_loaded, session_start, tab_viewed, question_asked, response_delivered, game_ended
- Device ID (localStorage, persistent) + Session ID (sessionStorage, per-tab)
- Backend ingestion endpoint: POST /api/events (batch) — analytics 404 fails silently (Turso pending)
- Snapshot endpoint: GET /api/admin/analytics/snapshot
- Account schema: role, status, trial_start_date, trial_duration_days, last_login_at
- Turso (libsql) integration with local SQLite fallback

**Dice Tower Demo System (R9)**
- Role-based access: super_admin / demo / meetup / convention
- Email gate signup at /signup — no password, instant access, CRM capture
- DEMO badge for demo/convention/meetup roles
- Demo mode ordering (cart works, checkout disabled)
- Meetup toggle in admin panel
- Convention expiry: March 22 11:59 PM PT → /expired screen with trial CTA
- NavMenu hook ordering fixed (black screen on navigation resolved)
- Score tab null guard (crash on missing score config resolved)

### ⚠️ Partially Complete / Known Issues

- **Admin config persistence:** GitHub API implemented. Hardcoded defaults ensure worst case is still good demo.
- **~30 placeholder game images:** Gradient placeholders, not broken — low priority.
- **Leaderboard endpoint:** Returns empty array (stub). Future feature.
- **Score tab patch:** In progress this sprint — null guard + graceful empty state for missing configs.
- **Rebrand:** In progress this sprint — "GameMaster AI" → "GameMaster Guide" across all UI strings.

### 🔲 Not Yet Built (Future Sprints)

**Dice Tower**
- Convention flyer with QR code to playgmai.com/signup
- Publisher-approved games (pending Stonemaier/Asmodee response)

**CRM & Analytics (Wizard's Spec — Phases 7-10)**
- Computed metrics + nightly rollup job
- Per-venue analytics dashboard (charts, trends, game leaderboard)
- Global CRM view (super_admin only): venue comparison, trial tracker, exports
- Telegram daily digest (9 AM Pacific / 17:00 UTC)
- CRM alerts (usage drops, trial expiry warnings)
- Discovery prompt ("How did you hear about us?")
- NPS survey (after 3rd game)

**Product Features**
- Kiosk mode lockdown
- Offline caching (service worker)
- Per-game custom score sheets
- Advanced analytics dashboard for venue owners
- POS integration
- Custom TTS voices
- Tablet-specific gestures

**Business Operations**
- Stripe billing (not needed until first paid conversion)
- Venue onboarding flow (self-serve signup)
- Automated trial expiry management
- Case study data export from CRM

---

## TECH STACK

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React (Vite) | Deployed to Cloudflare Pages |
| Backend | FastAPI (Python 3.11+) | Deployed to Render free tier |
| Game DB | SQLite | Rebuilt from JSON files on each deploy |
| Analytics DB | Turso (libsql) | Persistent across deploys; local SQLite fallback |
| LLM | OpenAI API (gpt-4o-mini) | Via Render env vars |
| Voice In | Web Speech API | Browser-native, free |
| Voice Out | SpeechSynthesis API | Browser-native, free |
| Domain | Cloudflare (DNS) + Namecheap (registrar) | playgmai.com |
| Notifications | Telegram Bot API | Leads, orders, feedback |
| Admin Config | GitHub API | Persists GOTD + Staff Picks across deploys |
| Event Tracking | Custom EventTracker.js | Batched, sendBeacon on unload |

---

## FILE STRUCTURE (Key Paths)

```
D:\GameMasterAI\
├── backend\
│   ├── app\
│   │   ├── main.py
│   │   ├── api\routes\        (games.py, auth.py, analytics.py, etc.)
│   │   ├── models\            (venues.py, etc.)
│   │   └── services\          (admin_config.py, turso.py, etc.)
│   └── requirements.txt
├── frontend\
│   ├── src\
│   │   ├── App.jsx
│   │   ├── components\        (LoginPage, GameSelector, GameTeacher, ScoreTab, NavMenu, etc.)
│   │   ├── contexts\          (AuthContext.jsx)
│   │   └── services\          (EventTracker.js, api.js)
│   └── dist\                  (built output → Cloudflare Pages)
├── content\
│   ├── games\                 (200 JSON knowledge bases + 5 PD games in progress)
│   ├── images\                (200 cover art files)
│   ├── scores\                (200 per-game score configs)
│   └── admin-config.json      (GitHub API source of truth — includes meetup toggle)
├── agents\
│   └── scribe\
│       └── drafts\            (Scribe email drafts output here)
└── README.md
```

---

## THE TEAM

| Name | Role | Platform | What They Do |
|------|------|----------|-------------|
| **Bard** | Chief of Staff | Claude.ai (Opus) | Translate, orchestrate, route. Never writes code. |
| **Wizard** | CTO / Architect | Claude.ai (Opus) | System design, tech decisions, schema definition. |
| **Barbarian** | Field Engineer | Claude Code on K2-PC | Deploys, debugs, verifies. Only persona that touches the running system. |
| **Ranger** | Agent Orchestrator | OpenClaw (Codex) | Manages Rogue swarm. Routes content tasks. |
| **Rogues** (5) | Research Agents | OpenClaw (Codex) | Content writers — game knowledge bases. |
| **Paladin** | QA Validator | OpenClaw (Codex) | Reviews game content quality. |
| **Scribe** | Outreach Drafter | OpenClaw (Codex) | Drafts emails for Tim's review. Never sends. Output to agents\scribe\drafts\. |

**Multi-instance Barbarian workflow:** For parallelizable tasks, split work across multiple Claude Code instances on K2-PC (PowerShell terminals). Each works on separate files. Final instance does `npm run build && git push`.

### Prompt Format Rules (Bard → Barbarian)

**Barbarian solo tasks (code, debug, deploy):** PowerShell paste format — no file download needed.

```powershell
cd D:\GameMasterAI
claude --dangerously-skip-permissions
```

Paste the prompt directly into Claude Code. No .md file, no download step.

**Multi-agent tasks (content, QA, anything routing through Ranger to OpenClaw):** .md ticket format — Tim downloads and attaches to the target session.

### Barbarian Prompt Standard (Required on Every Task)

**Step 1 — PowerShell format:**
Every Barbarian task starts with:
```
cd D:\GameMasterAI
claude --dangerously-skip-permissions
```
Then immediately: "You are Barbarian, field engineer for GameMaster Guide."

**Step 2 — TEST-FIX LOOP (mandatory — no exceptions):**
Every prompt must end with a test-fix loop. Barbarian does not push until all tests pass:
```
## TEST-FIX LOOP
Run tests → fix any failures → re-run → repeat until all PASS.
Do not push until every test shows PASS.
Max 5 iterations. If still failing after 5, stop and report exactly what's failing and why.
```

**Frontend tasks additionally require:**
- Run `npm run dev`, navigate all affected paths in the browser
- Check DevTools console: zero errors, zero 404s
- Run `npm run build 2>&1 | findstr /i "error"` — must be zero errors
- Do not push until both checks pass

---

## BUSINESS CONTEXT

- **Market:** $1.27B globally (2024), 10.14% CAGR. 2,000–4,000 US venues.
- **Zero competitors** in B2B cafe subscription space.
- **Cost to venue:** $149–$499/mo vs $2,400–$4,800/mo for a dedicated game teacher (92–98% savings).
- **Launch market:** Las Vegas. Target: 8–12 venues.
- **Founding Partner:** First 3 venues get free 30-day pilot.
- **Contact:** tim.minh.pham@gmail.com
- **Cost to run:** $120/mo (Anthropic $100 + ChatGPT Plus $20). Render, Cloudflare, Turso all on free tiers.

---

## OPEN QUESTIONS / DECISIONS PENDING

1. **Turso env vars** — Run Turso CLI on K2-PC to get database URL + auth token, add to Render. 5-minute task.
2. **~30 placeholder images** — Low priority, manually curated anytime.
3. **Stripe billing** — Not needed until first paid conversion.
4. **Kiosk mode** — Needed before physical tablet deployment at venues. Not needed for demos.
5. **Wizard review request** — Review Barbarian's SQL for computed metrics before Phase 7-9 goes to production.
6. **Publisher approvals** — Stonemaier and Asmodee outreach not yet sent. Any yes before March 11 adds their games to the limited library.
7. **Convention flyer** — QR code to playgmai.com/signup. Design pending after rebrand and Score tab patch land.

---

## NEXT PRIORITIES (Tim's Call)

1. **Send publisher outreach emails** — Stonemaier + Asmodee + DTW exhibitor inquiry. Today.
2. **Barbarian: Score tab patch** — In flight this sprint.
3. **Barbarian: Rebrand** — "GameMaster AI" → "GameMaster Guide" across all UI. In flight.
4. **Barbarian: Dice Tower demo build** — Role accounts, email gate, expiry screen, meetup toggle.
5. **Convention flyer** — After rebrand lands and signup URL is confirmed live.
6. **Venue outreach** — Product is demo-ready. Start pitching the 6 configured Vegas venues.
7. **Turso setup** — 5-minute task, unlocks persistent analytics.
8. **CRM Phases 7-10** — After Dice Tower.

---

*This dashboard is the single source of truth for any new Bard instance. Read soul-bard.md and GMAI-MASTER-ARCHITECTURE-v2.md for deeper context on team roles and original architecture.*
