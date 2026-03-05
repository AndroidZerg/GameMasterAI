# GAMEMASTER GUIDE — Master Business Debrief (Dashboard Feed)
## February 26, 2026 | v2.0 | CONFIDENTIAL
## Owner: Tim Pham | tim.minh.pham@gmail.com

---

## PURPOSE OF THIS DOCUMENT

This document is the canonical state file for GameMaster Guide (GMAI). It is designed to be ingested by the Unified Dashboard project to enable cross-project context switching, task tracking, and OpenClaw agent management. Any project that needs to understand GMAI's scope, status, pipeline, agent architecture, or next actions should consume this file.

---

## 1. WHAT GAMEMASTER GUIDE IS

GameMaster Guide (formerly "GameMaster AI") is a subscription-based web application that teaches board games to customers at board game cafes. It runs on tablets at gaming tables and uses voice-driven AI to walk groups through setup, rules, strategy, and in-game questions — reducing the staff teaching burden by 50–70%.

**Rebrand rationale:** "AI" triggers job-replacement anxiety in cafe staff, who are the gatekeepers to venue adoption. "Guide" positions the product as a teaching assistant that augments staff rather than replacing them.

**Domain:** playgmai.com (live, functional)
**GitHub:** AndroidZerg/GameMasterAI

---

## 2. MARKET & COMPETITIVE POSITION

- **Global board game cafe market:** $1.27B (2024), growing at 10.14% CAGR
- **US addressable market:** 2,000–4,000 venues with board game offerings
- **Competitors in B2B cafe subscription space:** Zero. GameMaster Guide is the first mover.
- **Core pain point:** Venues have 200+ game libraries but staff can't teach them all. A dedicated game teacher costs $2,400–$4,800/month. GameMaster Guide costs $149–$499/month — a 92–98% cost reduction.
- **Value framing:** Frees existing staff from teaching duties rather than replacing human interaction. Targets new customers who feel overwhelmed by game selection, not regulars who already know the games.

---

## 3. IDEAL CUSTOMER PROFILE (ICP)

### ICP Venues (Target)
- Experience-driven cafes with cover charges ($5–$15 entry)
- Employ dedicated teaching staff or have staff who spend significant time teaching
- Community engagement systems (events, loyalty, social media presence)
- Owners who understand that dwell time = revenue
- Board game library as a primary revenue driver, not an afterthought
- **Value prop resonance:** Labor cost replacement ($2,400–$4,800/mo teacher → $149–$499/mo GMAI)

### Non-ICP Venues (Avoid or Deprioritize)
- Lending library model — games are a side offering, not the business
- No cover charge, revenue depends on ancillary purchases (food, drinks, retail)
- No dedicated teaching staff — labor savings pitch falls flat
- No CRM or customer engagement infrastructure
- Pessimistic ownership that views GMAI as pure cost, not revenue multiplier
- **Lesson learned:** Labor cost replacement pitch only works where teaching staff exist. For non-teaching venues, the pitch shifts to "unlocking revenue via dwell time," which is a harder sell and lower conversion probability.

### ICP Qualifying Questions
1. Do you charge a cover/entry fee?
2. Do you have dedicated staff who teach games?
3. How do you handle new customers who don't know any games?
4. What's your average table dwell time?
5. Do you run events or have a loyalty program?

---

## 4. BUSINESS MODEL

**Revenue:** Monthly SaaS subscription per venue, cancel anytime.

| Tier | Price | Games | Devices | Key Features |
|------|-------|-------|---------|-------------|
| Starter | $149/mo | 50 | 1 | Voice AI, score tracking, basic support |
| Standard | $299/mo | 200 | 4 | Custom branding, staff picks, GOTD, F&B menu integration, game sales prompts |
| Premium | $499/mo | 200+ | Unlimited + QR | Lobby sync, advanced analytics, priority support, API access |

**Founding Partner Program:** First 3 venues get a free 30-day pilot.

**Pricing note:** Leave-behind PDFs currently show these tiers. Pricing may be adjusted downward based on conversion feedback — flagged for review but not actioned yet.

**Gross margin:** 80–92%.
**Operating cost:** $120/month total (Anthropic $100 + ChatGPT Plus $20). Hosting (Render, Cloudflare, Turso) all on free tiers.
**Launch market:** Las Vegas → California expansion.
**Target:** 8–12 venues at $199–$349/month = $2,000–$4,000 MRR.

---

## 5. VENUE PIPELINE — CURRENT STATE

### Active Conversion Targets (Las Vegas)

| Venue | Contact | Email | Status | Priority | Notes |
|-------|---------|-------|--------|----------|-------|
| Natural Twenty Games | Zach | demo@naturaltwentygames.com | Prospect — Active | HIGH | Strong ICP fit |
| Knight & Day Games | Morgan | demo@knightanddaygames.com | Prospect — Active | HIGH | Strong ICP fit |
| Meepleville | Billy/Wayne/Tatia | demo@meepleville.com | Prospect — Active | HIGH | Strong ICP fit |

### Closed / Deprioritized

| Venue | Email | Status | Reason |
|-------|-------|--------|--------|
| Shall We Play? | demo@shallweplay.com | Trial Closed | Non-ICP. Lending library model, no teaching staff, pessimistic owner. Used for data collection only. |
| Grouchy John's Coffee | demo@grouchyjohnscoffee.com | Dropped | Non-ICP. Will not approach. |
| Little Shop of Magic | demo@littleshopofmagic.com | Declined | Owner declined GMAI. |

### Expansion Pipeline (Post-Vegas Conversion)

**Trigger:** Once Natural 20, Knight & Day, and Meepleville either convert or decline, expansion begins.

**Target markets (high venue density):**
- Anaheim, CA
- Los Angeles, CA
- Additional California cities TBD

**Expansion approach:** Cold email campaign powered by agent research (see Section 9).

---

## 6. PRODUCT STATUS: DEMO-READY

The product is live at playgmai.com with a fully functional feature set across 200 games and 6 Las Vegas venue accounts.

### Feature Set Summary

**Core Teaching Experience:** 200-game library with structured knowledge bases (Setup, Rules, Strategy tabs per game), AI-powered Q&A chat (OpenAI gpt-4o-mini), voice input (Web Speech API) and voice output (SpeechSynthesis), text-to-speech playback controls.

**Game Library & Discovery:** Search with live filter, filters (Best For, Players, Time, Difficulty), randomized daily carousels, Game of the Day, Staff Picks (per-venue configurable), 200 real BoardGameGeek cover art images (~170 real, ~30 gradient placeholders).

**Score Tracker:** Multiplayer lobby (room codes + QR join), per-game score types from config, editable player names, "Reveal Final Score" with rankings and post-game survey, lobby sync across devices.

**Q&A and Notes:** Split-screen Q&A chat + personal notes, persistent chat history per game.

**Order System:** Order panel with cart, quantities, subtotal, orders POST to backend → SQLite → Telegram notification to venue. Foundation for future POS integration.

**Venue Platform:** Login-gated access with per-venue branding, per-venue F&B menus, admin controls, self-serve onboarding wizard (5 steps), venue owner dashboard (4 tabs: Home, Analytics, Library, Menu).

**Analytics & CRM:** EventTracker with batched events, Turso (libsql) analytics database, Tim's CRM view (/admin/crm) with sparklines and CSV export.

**Demo System (Dice Tower West):** Role-based access (super_admin, demo, meetup, convention), email gate signup at /signup, demo mode ordering, meetup magic link, convention account expiry (March 22) → trial CTA funnel, 5 public domain games for IP-safe demos.

---

## 7. TECH STACK

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

---

## 8. AI AGENT TEAM (Architecture & Roles)

GameMaster Guide is built and operated by an AI agent team, orchestrated by Tim through two platforms.

### Agent Roster

| Name | Role | Platform | Function |
|------|------|----------|----------|
| **Bard** | Chief of Staff | Claude.ai (Opus) | Translates Tim's business intent into technical tickets, interprets technical output back into decisions, orchestrates sprints |
| **Wizard** | CTO / Architect | Claude.ai (Opus) | System design, tech decisions, schema definition |
| **Barbarian** | Field Engineer | Claude Code (K2-PC) | Deploys, debugs, verifies. Only agent that touches the running system |
| **Ranger** | Agent Orchestrator | OpenClaw (Codex) | Manages the Rogue content swarm, routes tasks, monitors heartbeats |
| **Rogues** (5) | Research Agents | OpenClaw (Codex) | Halfling, Elf, Dwarf, Human, Goblin — content writers for game knowledge bases |
| **Paladin** | QA Validator | OpenClaw (Codex) | Reviews every game entry against quality checklist |
| **Scribe** | Outreach Drafter | OpenClaw (Codex) | Drafts emails for Tim's review. Never sends. |

### Platforms
- **Claude.ai** ($100/mo Anthropic subscription): Bard + Wizard + Barbarian
- **OpenClaw via Codex OAuth** ($20/mo ChatGPT Plus): Ranger, all Rogues, Paladin, Scribe

### Communication Flow
Tim ↔ Bard/Wizard (strategy) → Bard → Barbarian (tickets via Claude Code) → Bard → Ranger (tickets via OpenClaw) → Barbarian → Bard (email logs) → Ranger → Tim (Telegram alerts for blockers only).

### Multi-Instance Barbarian
For parallelizable tasks, work is split across multiple Claude Code instances on K2-PC (separate PowerShell terminals), each on separate files, with a final integration test pass before push.

### Agent Capabilities the Dashboard Needs to Expose
- Agent status (idle / active / blocked)
- Current task assignment per agent
- Platform routing (Claude.ai vs OpenClaw)
- Task queue depth per agent
- Blocker alerts (Telegram integration)

---

## 9. TASK BACKLOG (Prioritized)

### PHASE 1: IMMEDIATE — This Week (Feb 26–Mar 2)

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 1 | Send Asmodee outreach email | Tim/Scribe | Ready to send | inquiries@asmodeena.com — cover art/imagery permission |
| 2 | DTW exhibitor inquiry | Tim | Pending | dicetowerwest.com/exhibitors — two weeks out, time-sensitive |
| 3 | Onboard Shall We Play? (data collection only) | Barbarian | Ready | Send playgmai.com/onboarding link. Trial is for data, not conversion. |
| 4 | Convention flyer design | Tim | Pending | QR code to playgmai.com/signup for DTW floor distribution |
| 5 | Full smoke test | Barbarian | Pending | Pre-push checklist end-to-end before Dice Tower |
| 6 | Demo script writing | Scribe + Rogues | NEW | Write polished demo scripts for DTW floor conversations |

### PHASE 2: PRE-DICE TOWER (Before March 11)

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 7 | Publisher approvals | Tim | In progress | Stonemaier email sent, awaiting reply. Approval auto-adds games via `publisher_approved: true` tag. |
| 8 | Stop hook cleanup | Barbarian | Pending | k2-autodeploy.sh missing file error. 2-minute fix. |
| 9 | ~30 placeholder game images | Rogues | Low priority | Manually curated anytime |
| 10 | Vegas venue demos — Natural 20 | Tim | Pending | Live demo with Zach |
| 11 | Vegas venue demos — Knight & Day | Tim | Pending | Live demo with Morgan |
| 12 | Vegas venue demos — Meepleville | Tim | Pending | Live demo with Billy/Wayne/Tatia |

### PHASE 3: DICE TOWER WEST (March 11–15)

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 13 | Attend DTW as badge holder | Tim | Planned | Organic demos on tablet, not booth pitches |
| 14 | Lead with public domain games | Tim | Planned | Chess, Go, etc. "Imagine this with your game." |
| 15 | Collect convention signups | System | Automated | /signup → email gate → convention role → expires Mar 22 |
| 16 | Publisher networking at DTW | Tim | Planned | In-person follow-ups on Stonemaier, Asmodee, others |

### PHASE 4: POST-DTW — CONVERSION & EXPANSION (March 16+)

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 17 | Confirm/close Vegas 3 (Natural 20, Knight & Day, Meepleville) | Tim | Pending | Binary: convert or decline |
| 18 | California venue research | Rogues | NEW | Research gaming venues in Anaheim, LA, and other high-density CA cities |
| 19 | Cold email campaign — venue-specific research | Rogues | NEW | Each Rogue researches a target venue: owner name, business model, pain points, social media, reviews |
| 20 | Cold email campaign — customized outreach | Scribe | NEW | Draft personalized cold emails per venue, matching messaging to their specific pain points |
| 21 | Demo script library | Scribe | NEW | Standardized demo scripts for different venue archetypes (ICP vs. lending library) |
| 22 | Agentic Scout testing pipeline | Wizard/Ranger | Spec drafted | OpenClaw-based automated feature testing. Deploy watcher + Ranger orchestration for test-fix loops. |
| 23 | Nightly analytics rollup job | Barbarian | Pending | venue_analytics_daily populated live; cron rollup not yet built |
| 24 | Telegram daily digest | Barbarian | Pending | 9 AM Pacific automated summary to Tim |
| 25 | CRM alerts | Barbarian | Pending | Usage drops, trial expiry warnings |
| 26 | Kiosk mode | Barbarian | Pending | Needed before physical tablet deployment at venues |
| 27 | Stripe billing | Barbarian | Pending | Not needed until first paid conversion |
| 28 | Offline caching | Barbarian | Pending | Service worker for tablet reliability |

---

## 10. COLD OUTREACH WORKFLOW (New)

Once Vegas conversion attempts conclude, the agent team pivots to outbound sales.

### Research Phase (Rogues)
Each Rogue agent is assigned target venues in expansion markets and produces a research brief per venue:
- Venue name, location, owner/manager name
- Business model (cover charge? teaching staff? events?)
- ICP score (fits ICP / partial fit / non-ICP)
- Online presence (website, social, Google reviews)
- Identified pain points (from reviews, social posts, job listings for teaching staff, etc.)
- Competitive landscape (any other tech in venue?)

### Drafting Phase (Scribe)
Scribe takes each research brief and drafts a personalized cold email:
- Leads with the venue's specific pain point
- References something specific about the venue (a review, an event, a game they feature)
- Positions GMAI as a solution to their problem, not a generic pitch
- Includes the founding partner offer if applicable
- All drafts go to Tim for review — Scribe never sends

### Approval Phase (Tim)
Tim reviews, edits, and sends all outreach. No agent sends email autonomously.

### Follow-Up Tracking
- Scribe drafts follow-up sequences (Day 3, Day 7, Day 14)
- CRM tracks outreach status per venue
- Telegram alerts Tim on replies

---

## 11. KEY METRICS

### Product
- Games in library: 200 (+ 5 PD)
- Venue accounts configured: 6
- Active trials: 0 (Shall We Play? ready for data-only onboarding)

### Revenue
- MRR: $0 (pre-revenue, founding partner pilots pending)
- Target MRR: $2,000–$4,000 (8–12 venues at $199–$349/mo)

### Cost
- Monthly operating: $120 (Anthropic $100 + ChatGPT Plus $20)
- Hosting: $0 (free tiers)

### Pipeline
- Active prospects: 3 (Natural 20, Knight & Day, Meepleville)
- Declined/dropped: 3 (Little Shop of Magic, Shall We Play?, Grouchy John's)
- Expansion market: California (pending Vegas close-out)
- Publisher outreach: Stonemaier (sent), Asmodee (ready), DTW exhibitor (pending)

---

## 12. SPRINT HISTORY (10 Rounds)

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

## 13. KEY CONTACTS & RESOURCES

| Resource | Details |
|----------|---------|
| Product URL | https://playgmai.com |
| Backend API | https://gmai-backend.onrender.com |
| GitHub | AndroidZerg/GameMasterAI |
| Tim's email | tim.minh.pham@gmail.com |
| Telegram Leads Bot | GameMaster AI Leads |

---

## 14. WHAT THE UNIFIED DASHBOARD NEEDS FROM THIS DOCUMENT

This section defines the data contract between GMAI and the Unified Dashboard.

### Data the Dashboard Should Ingest
- **Task backlog** (Section 9): Task name, owner, status, phase, priority, notes
- **Agent roster** (Section 8): Agent name, role, platform, current assignment, status
- **Pipeline** (Section 5): Venue name, contact, status, ICP fit, priority
- **Metrics** (Section 11): MRR, cost, game count, venue count, trial count
- **Sprint history** (Section 12): Round, date, focus, deliverables
- **Key URLs** (Section 13): Product, backend, GitHub, contact

### Dashboard Features GMAI Needs
- Task board with phase-based columns (Immediate → Pre-DTW → DTW → Post-DTW)
- Agent status panel showing idle/active/blocked per agent with platform badge
- Pipeline view with venue cards showing ICP score, status, and next action
- Content switching between GMAI and other open projects
- OpenClaw agent management UI: task assignment, heartbeat monitoring, output review queue
- Cold outreach tracker: research status → draft status → sent → replied → converted

### Update Cadence
This document should be refreshed after each sprint or significant pipeline change. The dashboard should pull from the latest version.

---

*This document is the complete business state of GameMaster Guide as of February 26, 2026 (v2.0). Feed to any project that needs full context on GMAI's scope, status, pipeline, agent architecture, or next actions.*
