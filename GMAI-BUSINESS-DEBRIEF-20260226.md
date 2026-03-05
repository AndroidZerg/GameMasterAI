# GAMEMASTER GUIDE — Master Business Debrief
## February 26, 2026 | CONFIDENTIAL
## Owner: Tim Pham | Contact: tim.minh.pham@gmail.com

---

## WHAT THIS IS

GameMaster Guide (formerly "GameMaster AI") is a subscription-based web application that teaches board games to customers at board game cafes. It runs on tablets at gaming tables and uses voice-driven AI to walk groups through setup, rules, strategy, and in-game questions — reducing the staff teaching burden by 50–70%.

**Rebrand rationale:** "AI" triggers job-replacement anxiety in cafe staff, who are the gatekeepers to venue adoption. "Guide" positions the product as a teaching assistant that augments staff rather than replacing them.

**Domain:** playgmai.com (live, functional)

---

## MARKET & COMPETITIVE POSITION

- **Global board game cafe market:** $1.27B (2024), growing at 10.14% CAGR
- **US addressable market:** 2,000–4,000 venues with board game offerings
- **Competitors in B2B cafe subscription space:** Zero. GameMaster Guide is the first mover.
- **Core pain point:** Venues have 200+ game libraries but staff can't teach them all. A dedicated game teacher costs $2,400–$4,800/month. GameMaster Guide costs $149–$499/month — a 92–98% cost reduction.
- **Value framing:** Frees existing staff from teaching duties rather than replacing human interaction. Targets new customers who feel overwhelmed by game selection, not regulars who already know the games.

---

## BUSINESS MODEL

**Revenue:** Monthly SaaS subscription per venue, cancel anytime.

| Tier | Price | Games | Devices | Key Features |
|------|-------|-------|---------|-------------|
| Starter | $149/mo | 50 | 1 | Voice AI, score tracking, basic support |
| Standard | $299/mo | 200 | 4 | Custom branding, staff picks, GOTD, F&B menu integration, game sales prompts |
| Premium | $499/mo | 200+ | Unlimited + QR | Lobby sync, advanced analytics, priority support, API access |

**Founding Partner Program:** First 3 venues get a free 30-day pilot.

**Gross margin:** 80–92%.

**Operating cost:** $120/month total (Anthropic $100 + ChatGPT Plus $20). Hosting (Render, Cloudflare, Turso) all on free tiers.

**Launch market:** Las Vegas. Target: 8–12 venues at $199–$349/month = $2,000–$4,000 MRR.

---

## PRODUCT STATUS: DEMO-READY

The product is live at playgmai.com with a fully functional feature set across 200 games and 6 Las Vegas venue accounts.

### What Exists Right Now

**Core Teaching Experience**
- 200-game library with structured knowledge bases (Setup, Rules, Strategy tabs per game)
- AI-powered Q&A chat per game (OpenAI gpt-4o-mini)
- Voice input (Web Speech API) and voice output (SpeechSynthesis)
- Text-to-speech playback controls across all content tabs

**Game Library & Discovery**
- Search bar with live filter
- Filters: Best For (Solo, Family, Party, Date Night), Players, Time, Difficulty
- Randomized daily carousels (Easy to Learn, Strategy, Party Games)
- Game of the Day and Staff Picks (per-venue configurable)
- 200 real BoardGameGeek cover art images (~170 real, ~30 gradient placeholders)

**Score Tracker**
- Unified Score tab with multiplayer lobby (room codes + QR join)
- Per-game score types pre-loaded from config files
- Editable player names, score labels, show/hide totals
- "Reveal Final Score" with rankings, personalized messages, post-game survey
- Lobby sync across devices, auto-start timer

**Q&A and Notes**
- Split-screen: Q&A chat (top) + personal notes (bottom), independently collapsible
- Persistent chat history per game, copy/paste between Q&A and notes

**Order System**
- Order panel with cart, quantities, subtotal
- Orders POST to backend → SQLite → Telegram notification to venue
- Foundation for future POS integration

**Venue Platform**
- Login-gated access with per-venue branding
- Per-venue F&B menus, admin controls (GOTD, Staff Picks, Inquiries, Feedback, Orders)
- Admin config persisted via GitHub API (survives Render restarts)
- Self-serve onboarding wizard (5 steps: venue info → logo upload → game collection → menu setup → review)
- Venue owner dashboard (4 tabs: Home, Analytics, Library, Menu)

**Analytics & CRM**
- EventTracker with batched events, auto-flush, sendBeacon on unload
- Events: app_loaded, session_start, tab_viewed, question_asked, response_delivered, game_ended, score_started, order_placed, menu_item_viewed, game_added_to_collection
- Turso (libsql) analytics database, persistent across deploys
- Tim's CRM view (/admin/crm): all venues table, trial alerts, sparklines, CSV export

**Demo System (Dice Tower West)**
- Role-based access: super_admin, demo, meetup, convention
- Email gate signup at /signup for convention floor
- Demo mode ordering (cart works, checkout disabled, DEMO badge)
- Meetup magic link (/join?key=...) for QR code access
- Convention account expiry (March 22) → trial CTA funnel
- 5 public domain games (Chess, Go, Checkers, Dominoes, Mahjong) for IP-safe demos

---

## VENUE PIPELINE

Six Las Vegas venues configured with accounts. All use password `gmai2026`.

| Venue | Email | Status | Notes |
|-------|-------|--------|-------|
| Meepleville | demo@meepleville.com | Prospect | |
| Knight & Day Games | demo@knightanddaygames.com | Prospect | |
| Little Shop of Magic | demo@littleshopofmagic.com | Prospect | |
| Shall We Play? | demo@shallweplay.com | Prospect | Onboarding ready, closed trial for data collection |
| Grouchy John's Coffee | demo@grouchyjohnscoffee.com | Prospect | |
| Natural Twenty Games | demo@naturaltwentygames.com | Prospect | |

**Sales approach:** Live demos with venue owners, leading with labor cost math ($2,400–$4,800/mo teacher vs $149–$499/mo GMAI). Emphasize freeing staff, not replacing them.

---

## TECH STACK

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React (Vite) | Cloudflare Pages |
| Backend | FastAPI (Python 3.11+) | Render free tier |
| Game DB | SQLite | Rebuilt from 200 JSON files on each deploy |
| Venue DB | SQLite (8 tables) | Venue platform: games, menus, analytics |
| Analytics DB | Turso (libsql) | Persistent across deploys |
| LLM | OpenAI API (gpt-4o-mini) | Via Render env vars |
| Voice | Web Speech API (in/out) | Browser-native, free |
| Domain | Cloudflare DNS + Namecheap | playgmai.com |
| Notifications | Telegram Bot API | Leads, orders, feedback |
| Admin Config | GitHub API | Per-venue GOTD + Staff Picks persistence |
| Event Tracking | Custom EventTracker.js | Batched, sendBeacon on unload |
| Source Control | GitHub | AndroidZerg/GameMasterAI |

**Data persistence architecture:** Multi-layered solution using SQLite for local storage, GitHub API for cross-deployment persistence, and in-memory caching. Each venue maintains independent customization that survives Render's ephemeral filesystem and server restarts.

---

## THE TEAM (AI Agent Architecture)

GameMaster Guide is built and operated by an AI agent team, orchestrated by Tim through two platforms.

| Name | Role | Platform | Function |
|------|------|----------|----------|
| **Bard** | Chief of Staff | Claude.ai (Opus) | Translates Tim's business intent into technical tickets, interprets technical output back into decisions, orchestrates sprints |
| **Wizard** | CTO / Architect | Claude.ai (Opus) | System design, tech decisions, schema definition |
| **Barbarian** | Field Engineer | Claude Code (K2-PC) | Deploys, debugs, verifies. Only agent that touches the running system |
| **Ranger** | Agent Orchestrator | OpenClaw (Codex) | Manages the Rogue content swarm, routes tasks, monitors heartbeats |
| **Rogues** (5) | Research Agents | OpenClaw (Codex) | Halfling, Elf, Dwarf, Human, Goblin — content writers for game knowledge bases |
| **Paladin** | QA Validator | OpenClaw (Codex) | Reviews every game entry against quality checklist |
| **Scribe** | Outreach Drafter | OpenClaw (Codex) | Drafts emails for Tim's review. Never sends. |

**Platforms:**
- **Claude.ai** ($100/mo Anthropic subscription): Bard + Wizard + Barbarian
- **OpenClaw via Codex OAuth** ($20/mo ChatGPT Plus): Ranger, all Rogues, Paladin, Scribe

**Communication flow:** Tim ↔ Bard/Wizard (strategy), Bard → Barbarian (tickets via Claude Code), Bard → Ranger (tickets via OpenClaw), Barbarian → Bard (email logs), Ranger → Tim (Telegram alerts for blockers only).

**Multi-instance Barbarian:** For parallelizable tasks, work is split across multiple Claude Code instances on K2-PC (separate PowerShell terminals), each on separate files, with a final integration test pass before push.

---

## SPRINT HISTORY (10 Rounds)

| Round | Date | Focus | Key Deliverables |
|-------|------|-------|-----------------|
| R1 | Feb 22 | Overnight MVP | 50 games, FastAPI backend, React frontend, voice I/O, ClawProxy LLM |
| R2 | Feb 23 | Content rewrite | Schema v2.0, rulebook-sourced rewrites, quality audit |
| R3 | Feb 23 | Venue system | Login/auth, 6 Vegas venue accounts, game filtering, named score tracker |
| R4 | Feb 24 | Public deploy | playgmai.com live (Cloudflare Pages + Render), OpenAI API integration |
| R5 | Feb 24 | Expansion | 200-game library, real BGG cover art pipeline, F&B menus |
| R6 | Feb 24 | Polish | Score tracker overhaul, cover art curation, admin dashboard |
| R7 | Feb 25 | UI/UX | Order system, Q&A notes, pricing tiers, leave-behind PDFs, contact form, admin config persistence |
| R8 | Feb 25 | CRM Foundation | Login screen entry point, Turso analytics backend, EventTracker, account schema |
| R9 | Feb 25 | Dice Tower Prep | Rebrand to GameMaster Guide, role-based demos, email gate signup, 5 PD game KBs |
| R10 | Feb 26 | Venue Platform | Self-serve onboarding, venue dashboard (4 tabs), CRM view, meetup magic link, analytics events |

---

## UPCOMING TASKS & PRIORITIES

### Immediate (This Week)

1. **Send Asmodee outreach email** — Ready to send to inquiries@asmodeena.com for cover art/imagery permission
2. **DTW exhibitor inquiry** — dicetowerwest.com/exhibitors. Two weeks out from event, time-sensitive.
3. **Onboard Shall We Play?** — Send playgmai.com/onboarding link. First real venue data flowing through the system.
4. **Convention flyer design** — QR code to playgmai.com/signup for Dice Tower West floor distribution
5. **Full smoke test** — Run Barbarian pre-push checklist end-to-end before Dice Tower

### Near-Term (Pre-Dice Tower, before March 11)

6. **Publisher approvals** — Stonemaier email sent, awaiting reply. Any approval before March 11 auto-adds games to limited demo library via `publisher_approved: true` tag.
7. **Stop hook cleanup** — k2-autodeploy.sh missing file error on every Barbarian push. 2-minute fix, cleans up deploy noise.
8. **~30 placeholder game images** — Low priority, manually curated anytime.

### Post-Dice Tower

9. **Agentic Scout testing pipeline** — OpenClaw-based automated feature testing. Wizard spec drafted. Deploy watcher + Ranger orchestration for test-fix loops.
10. **Nightly analytics rollup job** — venue_analytics_daily populated live; cron rollup not yet built. Fine for single-digit venues.
11. **Telegram daily digest** — 9 AM Pacific automated summary to Tim.
12. **CRM alerts** — Usage drops, trial expiry warnings.
13. **Kiosk mode** — Needed before physical tablet deployment at venues.
14. **Stripe billing** — Not needed until first paid conversion.
15. **Offline caching** — Service worker for tablet reliability.

---

## DICE TOWER WEST (March 11–15, 2026)

**Event:** Dice Tower West at Westgate Las Vegas. ~4,000 attendees.
**Strategy:** Attend as badge holder. Demo on tablet using demo accounts. Organic conversations, not booth pitches. Lead with public domain games (Chess, Go, etc.) and say "imagine this with your game."

**Demo accounts configured:**

| Username | Role | Library | Purpose |
|----------|------|---------|---------|
| admin | super_admin | Full 200 | Tim's full-access account |
| demo-dicetower | demo | Limited (PD + approved) | Convention floor demos |
| meetup | meetup | Full 200 | QR code magic link access |
| (email signups) | convention | Limited | /signup → instant access, expires Mar 22 |

**Copyright position:** All convention-visible content is public domain. Publisher games added only after written permission, auto-tagged.

---

## KEY METRICS TO TRACK

**Product:**
- Games in library: 200 (+ 5 PD)
- Venue accounts: 6
- Active trials: 0 (Shall We Play? ready to onboard)

**Revenue:**
- MRR: $0 (pre-revenue, founding partner pilots pending)
- Target MRR: $2,000–$4,000 (8–12 venues at $199–$349/mo)

**Cost:**
- Monthly operating: $120 (Anthropic $100 + ChatGPT Plus $20)
- Hosting: $0 (free tiers)

**Pipeline:**
- Prospects: 6 Las Vegas venues
- Publisher outreach: Stonemaier (sent), Asmodee (ready), DTW exhibitor (pending)

---

## KEY CONTACTS & RESOURCES

| Resource | Details |
|----------|---------|
| Product URL | https://playgmai.com |
| Backend API | https://gmai-backend.onrender.com |
| GitHub | AndroidZerg/GameMasterAI |
| Tim's email | tim.minh.pham@gmail.com |
| Telegram Leads Bot | GameMaster AI Leads (token: 8535000205, chat_id: 6236947695) |
| Thai House Orders Bot | @thai_house_orders_bot (token: 8656641841, chat_id: -5213518274) |

---

## CROSS-PROJECT CONTEXT

Tim is building a unified dashboard to bridge all open projects for easier content switching, task tracking, and OpenClaw agent management UI. This document serves as the GameMaster Guide input to that unified system.

**What the unified dashboard needs from GMAI:**
- Current sprint status and task backlog (listed above)
- Agent roster and their platforms/capabilities
- Active blockers and pending decisions
- Key URLs and credentials for monitoring
- Revenue/pipeline metrics

---

*This document is the complete business state of GameMaster Guide as of February 26, 2026. Feed to any project that needs full context on GMAI's scope, status, and direction.*
