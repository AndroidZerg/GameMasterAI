# GAMEMASTER GUIDE — Bard Dashboard
## Last Updated: February 26, 2026 (end of Round 10)
## Status: DEMO-READY | 200 games | 6 venues + special accounts | Live at playgmai.com

---

## EXECUTIVE SUMMARY

GameMaster Guide is a voice-interactive board game teaching app for board game cafes. It runs on tablets at gaming tables and uses AI to walk customers through setup, rules, strategy, and in-game questions — reducing staff teaching burden by 50–70%.

**Rebrand note:** Product renamed from "GameMaster AI" to "GameMaster Guide" (R9). Reason: "AI" triggers job-replacement anxiety in cafe staff, who are our gatekeepers. "Guide" positions the product as a teaching assistant that augments staff. Domain stays playgmai.com.

**What exists right now:** A fully functional web app at playgmai.com with 200 games, 6 Las Vegas venue accounts, self-serve onboarding wizard, per-venue analytics dashboard, Tim's CRM view, role-based access control for Dice Tower demo accounts, meetup magic link, and a full analytics pipeline. Ready for Shall We Play? onboarding and Dice Tower West demos.

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
| R10 | Feb 26 | Venue Platform | Self-serve onboarding wizard, venue owner dashboard (4 tabs), Tim's CRM view, per-venue Customize Home, meetup magic link, meetup-admin account, hidden text renderer fix, PD game content rewrite (all 5 approved), PD game images fixed, new analytics events |

---

## LIVE PRODUCT

### URLs
- **App:** https://playgmai.com/ (login screen → game library)
- **Signup (convention floor):** https://playgmai.com/signup
- **Venue onboarding:** https://playgmai.com/onboarding
- **Venue dashboard:** https://playgmai.com/venue/dashboard
- **CRM (super_admin):** https://playgmai.com/admin/crm
- **Marketing/Landing:** https://playgmai.com/landing
- **Backend API:** https://gmai-backend.onrender.com
- **GitHub:** AndroidZerg/GameMasterAI

### Infrastructure
- **Frontend:** Cloudflare Pages (static React build)
- **Backend:** Render free tier (FastAPI/Python)
- **LLM:** OpenAI API (gpt-4o-mini via LLM_BASE_URL on Render)
- **Analytics DB:** Turso (libsql) — ✅ env vars set on Render
- **Game data:** 200 JSON files + 5 PD games committed to repo
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
| TURSO_DATABASE_URL | ✅ Set |
| TURSO_AUTH_TOKEN | ✅ Set |

---

## VENUE ACCOUNTS

Six Las Vegas venues configured. All use password `gmai2026`.

| Venue | Email | Status |
|-------|-------|--------|
| Meepleville | demo@meepleville.com | prospect |
| Knight & Day Games | demo@knightanddaygames.com | prospect |
| Little Shop of Magic | demo@littleshopofmagic.com | prospect |
| Shall We Play? | demo@shallweplay.com | prospect — onboarding ready |
| Grouchy John's Coffee | demo@grouchyjohnscoffee.com | prospect |
| Natural Twenty Games | demo@naturaltwentygames.com | prospect |

**Account schema fields:** venue_id, venue_name, email, password, role (venue_admin/super_admin), status (prospect/trial/active/churned/paused), trial_start_date (NULL until manually set), trial_duration_days (default 30), address, city, state, zip_code, hours_json, contact_name, phone, logo_filename, onboarding_step (0–6), onboarding_completed_at, created_at, last_login_at.

Tim's account is `super_admin`. Trial start date is manually set when agreement is signed — NOT auto-triggered on first login.

---

## DICE TOWER WEST DEMO ACCOUNTS

Dice Tower West: March 11–15, 2026 at Westgate Las Vegas. ~4,000 attendees.

All demo accounts live at playgmai.com. Role-based access controls library and features.

| Username | Password | Role | Library | Features | Timed? |
|----------|----------|------|---------|----------|--------|
| admin | watress2 | super_admin | Full 200 | All + admin + analytics + CRM | No |
| meetup-admin | watress2 | super_admin | Full 200 | All + admin + analytics + CRM | No |
| demo-dicetower | watress2 | demo | Limited (5 PD + approved) | All + admin, no analytics, DEMO badge | No |
| meetup | bgninhenderson | meetup | Full 200 | /games + /score + /order only, DEMO badge | Manual toggle |
| (email signups) | none | convention | Limited (5 PD + approved) | /games + /score + /order only, DEMO badge | Expires Mar 22 11:59 PM PT |

**Limited library:** Games tagged `public_domain: true` OR `publisher_approved: true` in their JSON. Currently 5 PD games. Publisher approvals auto-appear by tag — no code change needed.

**Demo mode ordering:** All roles see DEMO banner + disabled checkout. Cart still works (add/remove, subtotal), just can't submit.

**Meetup toggle:** In admin Dashboard tab (super_admin only). OFF = "This session is not currently active." Default: OFF. Tim flips ON before meetup, OFF after. Persisted via GitHub API config. Both `admin` and `meetup-admin` can control this.

**Meetup magic link:** playgmai.com/join?key=bgninhenderson → auto-login as meetup account. Use for QR codes at meetup events.

**Convention expiry:** March 22 11:59 PM Pacific → /expired screen with free 30-day trial CTA (`playgmai.com/signup?trial=true`).

**Convention signup flow:** playgmai.com/signup → email only → instant /games access. No password, no verification. Email captured to CRM with `source: "dicetower2026"`.

---

## PUBLIC DOMAIN GAME LIBRARY (Dice Tower Demo)

5 games — fully original content, no publisher IP. All approved by Paladin QA on first pass.

| Game | File | Content | Token Count | Status |
|------|------|---------|-------------|--------|
| Chess | chess.json | FIDE Laws of Chess (2023) | ~2,547 | ✅ Complete |
| Go | go.json | AGA + BGA rules | ~2,280 | ✅ Complete |
| Checkers | checkers.json | ACF Official Rules | ~1,773 | ✅ Complete |
| Dominoes | dominoes.json | WDF + Domino Plaza rules | ~2,027 | ✅ Complete |
| Mahjong | mahjong.json | World Mahjong Org (MCR) | ~2,987 | ✅ Complete — Chinese MCR only |

Schema: `public_domain: true`, `publisher_approved: false` on all 5.
Images: served from content/images/ at /api/images/{game_id}.jpg — frontend constructs URL automatically (does NOT read image field from JSON).

---

## PUBLISHER OUTREACH (Dice Tower West)

| Publisher | Contact | Status | Priority |
|-----------|---------|--------|----------|
| Stonemaier Games | contact@stonemaier.com | ✅ Sent — awaiting reply | Highest |
| Asmodee North America | inquiries@asmodeena.com | ⏳ Ready to send | Send this week |
| DTW Exhibitor inquiry | dicetowerwest.com/exhibitors | ⏳ Not sent | Send today — cutting it close |

**Ask:** Permission to use cover art and game imagery. Rules content is written in our own words — no approval needed for that.

**Convention floor strategy:** Attend as badge holder. Demo on tablet using demo-dicetower/watress2 login. Organic conversations, not booth pitches. Framing: "Here's how it works on Chess — imagine this with your game."

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
- Hidden text bug fixed — all content visible in UI matches TTS

**Game Library**
- Search bar with live filter
- Filter by: Best For (Solo, Family, Party, Date Night, etc.), Players, Time, Difficulty
- Randomized daily carousels (Easy to Learn, Strategy, Party Games)
- Game of the Day (per-venue configurable, persisted via GitHub API)
- Staff Picks (per-venue configurable, persisted via GitHub API)
- Per-venue Customize Home — dropdown selects any account (Global Defaults, Convention, Meetup, all 6 venues)
- 200 real BGG cover art images (~170 real, ~30 gradient placeholders)
- Recently played reset (admin-clearable)

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
- score_started event tracked in analytics

**Q&A and Notes**
- Split-screen: Q&A chat (top) + personal notes (bottom)
- Both independently collapsible (50/50 split when both open)
- Notes expand to fill screen when Q&A collapsed
- Persistent chat history per game (localStorage)
- Copy button on AI responses, Paste button in notes
- Notes auto-save (debounced 2s)

**Order System**
- Order button (top-right) opens panel with 2 tabs
- Cart with quantities, subtotal, checkout
- Orders POST to backend → saved to SQLite → Telegram notification
- order_placed event tracked in analytics
- Foundation for future POS integration

**Venue System**
- Login-gated access (no anonymous browsing)
- Login accepts username OR email
- Per-venue branding (name displayed in app)
- Per-venue F&B menus
- Per-venue admin: Game of the Day, Staff Picks, Inquiries, Feedback, Orders
- Admin config persisted: in-memory cache → GitHub API (survives Render restarts)

**Self-Serve Venue Onboarding (R10)**
- 5-step wizard at playgmai.com/onboarding
- Step 1: Venue info (name, address, hours, contact)
- Step 2: Logo upload (stored as BLOB in SQLite — survives Render redeploys)
- Step 3: Game collection (browse 200 games, select owned, pick top 20 priority)
- Step 4: Menu setup (categories, items, prices in cents)
- Step 5: Review & confirm → sets status active
- Resume logic: saves each step independently, resumes where left off
- Logo served at GET /api/v1/venues/{venue_id}/logo

**Venue Owner Dashboard (R10)**
- 4-tab dashboard at /venue/dashboard (venue_admin role)
- Home tab: active sessions, questions today, top game, orders, quick GOTD/staff picks edit
- Analytics tab: sessions per day bar chart, top 10 games, busiest hours heatmap, most asked questions, avg session length
- Library tab: game collection manager with Active/Featured/Priority toggles, add games modal
- Menu tab: category accordion, item editor, 86 toggle for floor staff

**Tim's CRM View (R10)**
- Super_admin only at /admin/crm
- All venues table: status, trial days remaining, last active, sessions this week, top game, onboarding progress
- Trial alert banner for venues expiring ≤7 days
- Sort by any column, filter by status
- Venue detail side panel: contact info, 30-day sparkline, top 5 games, quick actions
- Export to CSV

**Analytics & CRM**
- EventTracker: batched events, 10s auto-flush, sendBeacon on unload
- Events tracked: app_loaded, session_start, tab_viewed, question_asked, response_delivered, game_ended, score_started, order_placed, menu_item_viewed, game_added_to_collection
- 8 new database tables: venue_logos, venue_games, venue_menu_categories, venue_menu_items, venue_analytics_daily, venue_analytics_hourly, venue_game_stats, venue_top_questions
- Turso (libsql) analytics — ✅ env vars configured on Render

**Contact & Leads**
- Contact form modal (name, email, venue, message)
- Submissions saved to backend + Telegram notification
- Telegram bot: "GameMaster Guide Leads"
- Admin Inquiries tab shows all submissions

**Dice Tower Demo System**
- Role-based access: super_admin / demo / meetup / convention
- Email gate signup at /signup
- DEMO badge for demo/convention/meetup roles
- Demo mode ordering (cart works, checkout disabled)
- Meetup toggle in admin Dashboard tab (prominent, first item)
- Meetup magic link: /join?key=bgninhenderson → auto-login
- Convention expiry: March 22 11:59 PM PT → /expired screen with trial CTA
- meetup-admin account (super_admin, same as admin)

### ⚠️ Partially Complete / Known Issues

- **~30 placeholder game images:** Gradient placeholders, not broken — low priority.
- **Leaderboard endpoint:** Returns empty array (stub). Future feature.
- **Stop hook error:** k2-autodeploy.sh missing — non-blocking noise on every Barbarian push. Cleanup pending.
- **Nightly rollup job:** venue_analytics_daily populated live; rollup cron not yet built. Fine for single-digit venues.

### 🔲 Not Yet Built (Future Sprints)

**Dice Tower**
- Convention flyer with QR code to playgmai.com/signup
- Publisher-approved games (pending Stonemaier/Asmodee response)

**Testing Pipeline**
- Agentic Scout swarm (OpenClaw) for automated feature testing
- Deploy watcher (Render API polling — only test live commit)
- Ranger orchestration for test-fix loop across Scouts
- CRM event verification in Scout tests

**CRM & Analytics**
- Nightly rollup job for venue_analytics_daily
- Telegram daily digest (9 AM Pacific / 17:00 UTC)
- CRM alerts (usage drops, trial expiry warnings)
- Discovery prompt ("How did you hear about us?")
- NPS survey (after 3rd game)

**Product Features**
- Kiosk mode lockdown
- Offline caching (service worker)
- Per-game custom score sheets
- POS integration
- Custom TTS voices
- Tablet-specific gestures

**Business Operations**
- Stripe billing (not needed until first paid conversion)
- Automated trial expiry management
- Case study data export from CRM

---

## TECH STACK

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React (Vite) | Deployed to Cloudflare Pages |
| Backend | FastAPI (Python 3.11+) | Deployed to Render free tier |
| Game DB | SQLite | Rebuilt from JSON files on each deploy |
| Venue DB | SQLite (8 new tables) | Venue platform data — venue_games, menus, analytics |
| Analytics DB | Turso (libsql) | Persistent across deploys; local SQLite fallback |
| LLM | OpenAI API (gpt-4o-mini) | Via Render env vars |
| Voice In | Web Speech API | Browser-native, free |
| Voice Out | SpeechSynthesis API | Browser-native, free |
| Domain | Cloudflare (DNS) + Namecheap (registrar) | playgmai.com |
| Notifications | Telegram Bot API | Leads, orders, feedback |
| Admin Config | GitHub API | Persists GOTD + Staff Picks per venue across deploys |
| Event Tracking | Custom EventTracker.js | Batched, sendBeacon on unload |

---

## FILE STRUCTURE (Key Paths)

```
D:\GameMasterAI\
├── backend\
│   ├── app\
│   │   ├── main.py
│   │   ├── api\
│   │   │   ├── deps.py                    (shared auth dependencies)
│   │   │   └── routes\                    (games.py, auth.py, analytics.py,
│   │   │                                   onboarding.py, venue_dashboard.py, crm.py)
│   │   ├── models\                        (venues.py, venue_platform.py)
│   │   └── services\                      (admin_config.py, turso.py,
│   │                                       onboarding.py, venue_analytics.py, crm_service.py)
│   └── requirements.txt                   (includes python-multipart)
├── frontend\
│   ├── src\
│   │   ├── App.jsx
│   │   ├── components\
│   │   │   ├── (existing: LoginPage, GameSelector, GameTeacher, ScoreTab, NavMenu, etc.)
│   │   │   ├── onboarding\                (5-step wizard components)
│   │   │   ├── venue\                     (HomeTab, AnalyticsTab, LibraryTab, MenuTab)
│   │   │   └── crm\                       (StatusBadge, TrialAlertBanner, VenueDetailPanel)
│   │   ├── pages\                         (OnboardingPage, VenueDashboard, CRMPage)
│   │   ├── contexts\                      (AuthContext.jsx)
│   │   ├── services\                      (EventTracker.js, api.js, analyticsEvents.js)
│   │   └── utils\                         (format.js — formatPrice, formatDuration, formatDate)
│   └── dist\                              (built output → Cloudflare Pages)
├── content\
│   ├── games\                             (200 JSON knowledge bases + 5 PD games)
│   ├── images\                            (200 cover art + 5 PD game images)
│   ├── scores\                            (200 per-game score configs)
│   └── admin-config.json                  (per-venue GOTD + staff picks)
├── agents\
│   └── scribe\
│       └── drafts\
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

**Multi-instance Barbarian workflow:** For parallelizable tasks, split work across multiple Claude Code instances on K2-PC (PowerShell terminals). Each works on separate files. Final instance does integration test pass then pushes.

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

1. **Asmodee outreach** — Email ready to send to inquiries@asmodeena.com. Waiting on Tim.
2. **DTW exhibitor inquiry** — dicetowerwest.com/exhibitors. Send today — cutting it close at 2 weeks out.
3. **Shall We Play? onboarding** — Product is ready. Send onboarding link to get first real venue data flowing.
4. **Convention flyer** — QR code to playgmai.com/signup. Design pending.
5. **Stop hook cleanup** — k2-autodeploy.sh missing file error on every Barbarian push. 2-minute fix.
6. **~30 placeholder images** — Low priority, manually curated anytime.
7. **Stripe billing** — Not needed until first paid conversion.
8. **Kiosk mode** — Needed before physical tablet deployment at venues.
9. **Publisher approvals** — Stonemaier sent. Any yes before March 11 auto-adds their games to limited library.
10. **Agentic Scout testing pipeline** — Wizard spec drafted. Build after Dice Tower.

---

## NEXT PRIORITIES (Tim's Call)

1. **Send Asmodee + DTW exhibitor emails** — Today.
2. **Onboard Shall We Play?** — Send playgmai.com/onboarding link. First real venue data.
3. **Convention flyer** — QR to /signup. Needed for March 11.
4. **Full smoke test** — Run Barbarian checklist end-to-end before Dice Tower.
5. **Stop hook cleanup** — Remove noise from every Barbarian report.
6. **Scout testing pipeline** — After Dice Tower.
7. **Stripe billing** — After first paid conversion.

---

*This dashboard is the single source of truth for any new Bard instance. Read soul-bard.md and GMAI-MASTER-ARCHITECTURE-v2.md for deeper context on team roles and original architecture.*
