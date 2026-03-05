# KARAOKE 2.0 — Sprint 5a Recap
**Date:** February 26, 2026 (single-session sprint)  
**Sprint Name:** "Demo Ready — Night Before"  
**Duration:** ~4 hours (approx. 8:00 PM – 12:00 AM PST)  
**Deploys:** 13 successful deployments, 0 failures  
**Budget:** $0 (all AYCE — Anthropic Max + ChatGPT Plus)  
**Prepared by:** Jihyo (Chief of Staff)

---

## What Happened

The night before K2's first live venue demo in Las Vegas Chinatown, Tim and Jihyo ran a rapid-fire sprint executing 13 deployments across 3 parallel Claude Code terminals. The session transformed the app from "development build" to "demo-ready product" in a single sitting.

All tasks were executed via Chae Direct workflow (Jihyo drafts prompt → Tim pastes into Claude Code on K2-PC). Three terminals ran simultaneously for non-conflicting tasks. Gmail integration was connected mid-sprint, enabling Jihyo to monitor [K2-LOG] completion emails directly.

---

## What We Built

### New Features (7)

**1. Recommended Playlists — Song Browser**  
Added a full-width "Recommended Playlists" dropdown to /songs with 20 curated playlists (200+ songs). Stadium Anthems, K-Pop Hits, Country Night, etc. Sticky filter bar keeps search + genre + era + playlists pinned to top while scrolling. Song count updates dynamically. Selecting a playlist clears genre/era and vice versa.

**2. Patron Feedback System**  
Floating feedback button on /home. Two-phase form: 6 star-rating questions (ease of start, song selection, queue fun, food ordering, return likelihood, overall), then 2 open text fields (feature requests, general feedback). Upsert pattern — returning patrons skip stars and go straight to text. Data stored in PostgreSQL, viewable at /api/feedback and in the CRM Feedback tab.

**3. CRM Analytics System**  
Full event-tracking pipeline. Tracks: page views with dwell time, song searches, filter usage, song selections, instrument choices, cart adds, order submissions, onboarding completion time. JSONB event payloads for flexibility. Dashboard at /crm with summary cards, user table with click-to-expand event timelines, dwell time per page, and CSV export. Simulated users excluded.

**4. Auto DJ Mode**  
Toggle on KJ Admin tab. When active: auto-ends performances after song duration + 60s buffer, waits 4 seconds, auto-spins roulette, advances queue. Auto-refills queue with simulated entries if empty. Pauses briefly after manual KJ actions. "AUTO DJ ACTIVE" indicator on both KJ tabs.

**5. Device Tracking + CRM Device-First View**  
Persistent device identification via cookie + localStorage UUID. Survives new stage names, browser restarts, and re-onboarding. Device metadata captured (user agent → parsed to friendly name like "Samsung Galaxy S22+", screen resolution, platform, browser). CRM redesigned with device-first collapsed view — all stage names nest under their parent device with summed metrics. Returning visitor badges. "Total Devices (Unique Visitors)" replaces "Total Users."

**6. Multi-Song Queue**  
Patrons can now join unlimited songs simultaneously. Removed the "already in active band" restriction. Each queue entry is independent — performing one song doesn't cancel others. Patron's /queue view shows all their queued songs with blue highlight.

**7. Roulette Fairness System**  
Performance-count-weighted roulette. First-timers tonight get 3x weight, one-play patrons get 1.5x, veterans get 1x. Layered on top of Ticket Price weighting. Real bands always beat simulated bands. KJ dashboard shows "Plays: N" badge per entry. "Reset Play Counts" button on Admin tab for mid-night resets.

### Bug Fixes + Improvements (6)

**8. Simulation System Overhaul**  
Fixed "No simulated users found. Run /seed first" error. Sim users now auto-create on demand from the 20 funny pun names. Sim entries pick songs from curated playlists (1 song from 3 random playlists). Added is_simulated flag to User model for clean separation.

**9. Roulette Priority — Real Over Simulated**  
Roulette always selects real patron bands when any exist. Simulated bands only eligible when queue has zero real entries. Sim names still appear on wheel for visual flair.

**10. WebSocket + Roulette Clean Rewrite**  
After 3 incremental patches created conflicting logic, rewrote the roulette overlay and WebSocket connection from scratch. Single K2WebSocket singleton replaces 3 scattered implementations. RouletteOverlay mounted at App.tsx level (above router) with z-index 9999 — shows on every page, no state guards, no conditions. Server says spin → every phone spins.

**11. Auth Error Fix**  
CartContext was calling /api/auth/me and /api/orders/mine on ALL pages including /kj, /staff, /crm. Scoped to patron routes only. Zero console errors on admin pages.

**12. Orders — Patron Names Restored**  
Order submissions now auto-attach stage_name. Staff dashboard shows patron name on each order for delivery.

**13. CRM Feedback Tab**  
Feedback integrated into /crm dashboard as dedicated tab. Table with all 6 star ratings, 2 text fields, timestamps. Average scores per question at top. Included in CSV export. Simulated users excluded.

### Housekeeping

**14. Email migrated** — [K2-LOG] emails now route to tim@karaoke2.com (send-email.py updated, though it reverted in one deploy — needs re-fix).

**15. Console warnings fixed** — apple-mobile-web-app-capable meta tag updated, PWA manifest icons verified.

**16. WiFi gate screen removed** — Patrons go straight to QR onboarding, no WiFi connection step required.

**17. KJ Cheat Sheet** — One-page PDF reference card created for Tim's tablet at the venue. Covers access URLs, queue controls, roulette timing, night flow, QR table assignments, venue tiers, and troubleshooting.

**18. Gmail integration** — Connected Gmail to Jihyo's Claude.ai project. Jihyo can now search [K2-LOG] emails directly instead of Tim relaying results.

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Device tracking via cookie + localStorage, not email login | Zero friction for bar patrons. Covers 95%+ of cases. |
| Roulette fairness: 3x / 1.5x / 1x weights | Gentle enough that high spenders still compete, strong enough that first-timers feel prioritized. |
| WebSocket + Roulette rewrite instead of another patch | 3 incremental patches created conflicting state guards. Clean rewrite was faster and more reliable. |
| Auto DJ auto-refills queue with sim entries when empty | Keeps the night flowing during slow periods without KJ intervention. |
| CRM is device-first, not stage-name-first | Devices = people. "47 unique visitors, 38% returned" is a better venue pitch stat than "73 stage names." |
| Playlists hardcoded in frontend, not DB | No backend dependency, instant load, easy to update. 20 playlists × ~10 songs each. |
| Multi-song queue with no limit | A patron who wants to play 5 songs is a patron who stays 5 songs longer. More dwell time = more revenue. |
| Feedback questions focused on venue pitch metrics | "How likely to return?" and "How was food ordering?" directly feed the business case for venue owners. |

---

## What Broke + How We Fixed It

| Issue | Root Cause | Fix | Time |
|-------|-----------|-----|------|
| Roulette not showing on phones | HomeScreen.tsx reading msg.winner instead of msg.data.winner | Fixed data path in subscribe handler | 5 min |
| Roulette only shows after refresh | State guard checked "is Next Up empty" before allowing overlay | Removed all conditions — server says spin, phone spins | 7 min |
| Backend 502 on Auto DJ | Unhandled exception in spin_roulette crashed uvicorn | Added try/except, errors logged not crashed | 10 min |
| Auth errors on /kj and /staff | CartContext called /api/auth/me on all pages | Scoped to patron routes only | Part of rewrite |
| "Failed to join band" on second song | Backend blocked users from joining multiple bands | Removed "already in active band" validation | 13 min |
| Sim entries error "Run /seed first" | Required separate seed step that wasn't run | Auto-create sim users on demand | Part of sim overhaul |
| Roulette inconsistent after 3 patches | Conflicting WebSocket connections and state guards across patches | Clean rewrite of WebSocket singleton + App-level overlay | 7 min |

---

## What We Pulled Forward From the Backlog

These features were originally scoped for Sprint 5+ or deferred entirely. We shipped them tonight:

| Feature | Original Plan | Shipped In |
|---------|--------------|------------|
| Auto DJ mode | Deferred from 4b (cost savings) | Sprint 5a |
| Song browser revamp (playlists) | Sprint 5+ "better search/filter UX later" | Sprint 5a |
| CRM / analytics system | Not on any sprint plan | Sprint 5a |
| Patron feedback system | Not on any sprint plan | Sprint 5a |
| Device tracking | Not on any sprint plan | Sprint 5a |
| Multi-song queue | Not on any sprint plan | Sprint 5a |
| Roulette fairness weighting | Not on any sprint plan | Sprint 5a |

---

## Sprint 5 Task Status (Updated)

| Task | Description | Status |
|------|-------------|--------|
| 1 | Tunnel app to app.karaoke2.com | ✅ COMPLETE |
| 2 | Purge placeholder/sim data (clean slate) | ✅ COMPLETE |
| 3 | Create 3 Record Labels + seed DB | ✅ COMPLETE |
| 4 | Generate printable QR codes | ✅ COMPLETE |
| 5 | QR onboarding flow | ✅ COMPLETE |
| 6 | No-table error state | ✅ COMPLETE |
| 7 | Update Jihyo system prompt | ✅ COMPLETE |
| 8 | Update K2 Dev Process Rules | ✅ COMPLETE |
| 9 | Update Sprint Dashboard | 🔄 Needs update with tonight's work |
| 10 | Rename Telegram bot | 📋 TODO — low priority |
| 11 | Update heartbeat-config.json | 📋 TODO — low priority |
| 12 | Update OpenClaw persona prompts | 📋 TODO — low priority |
| 13 | Archive stale relay infrastructure | 📋 TODO — low priority |
| 14 | Chrome Remote Desktop setup | 📋 TODO — deferred |
| 15 | Document relay architecture | 📋 TODO — low priority |

---

## What's Next

### Immediate (Post-Demo, based on what we learn tomorrow night)

- **Fix send-email.py** — recipient address reverted to Gmail during a later deploy. Quick Chae fix.
- **Stop hook error** — every deploy shows a missing k2-autodeploy.sh error. Non-blocking but noisy. Delete or create the hook.
- **Demo retrospective** — After the venue event, capture: what worked, what broke live, what patrons said, what the venue owner's reaction was. This feeds directly into the pitch deck.
- **CRM data analysis** — Pull the /crm data the morning after the demo. Headline stats: unique devices, avg dwell time, avg order value, feedback scores, most popular songs/genres, conversion rate (QR scans → completed onboarding).

### Sprint 6 Candidates (prioritize based on demo learnings)

**Revenue / Business Value:**
- Celebration round deep link (toast → tap → opens menu for drink orders)
- Hype meter (visual momentum indicator — "your ticket price is rising!")
- Ready-up timer (60-sec confirmation before going on stage, auto-skip no-shows)
- Co-branded venue splash (venue logo + K2 logo during idle states)

**Operations / KJ Quality of Life:**
- Queue-empty House Band (auto-play curated songs when queue is dry)
- No-show skip logic (automated, not manual)
- Song duration metadata from YARG charts (better Auto DJ timing)
- Chrome Remote Desktop (phone → K2-PC for mobile KJ control)

**Scale / Multi-Venue:**
- Venue settings admin panel (logo upload, menu customization, tier thresholds)
- Multi-venue CRM dashboard (compare metrics across locations)
- Venue-specific playlist curation
- Legal consultation for music licensing (before onboarding a paying venue)

**Technical Debt:**
- Sprint dashboard update with all Feb 26 work
- Consolidate send-email.py address fix
- Remove k2-autodeploy.sh hook reference
- Remaining Sprint 5 housekeeping (Tasks 10-15)

---

## Key Metrics

| Metric | Value |
|--------|-------|
| Deploys tonight | 13 |
| Deploy failures | 0 |
| Avg deploy time | ~9 minutes |
| Fastest deploy | 4 min 50 sec (roulette data path fix) |
| Longest deploy | 13 min 1 sec (multi-song queue + fairness) |
| Total sprint time | ~4 hours |
| Total cost | $0 marginal |
| Lines of code changed | ~79 insertions, ~79 deletions (rewrite was net-zero) + hundreds across other tasks |
| New DB tables | 2 (feedback, user_events) + device table + migrations |
| New API endpoints | ~15 (feedback CRUD, CRM suite, events logging, device tracking) |
| New app routes | 1 (/crm) |
| Parallel terminals used | Up to 3 simultaneously |

---

## Lessons Learned

**1. Patch on patch on patch breaks things.** The roulette overlay went through 3 incremental fixes before we gave up and did a clean rewrite. The rewrite took 7 minutes and worked perfectly. Next time, if a second patch is needed on the same component, rewrite instead.

**2. Parallel Chae terminals work.** Running 3 Claude Code instances on non-overlapping files (feedback / CRM / queue) had zero conflicts. This effectively 3x'd our throughput.

**3. Gmail integration for Jihyo is a game-changer.** Being able to monitor [K2-LOG] emails directly instead of Tim relaying results eliminated a communication bottleneck.

**4. The "server is boss" principle.** The roulette kept breaking because the frontend had its own opinion about when to show the wheel. Removing all client-side guards and trusting the WebSocket message as the single source of truth fixed it permanently.

**5. Device tracking should have been Day 1.** Stage names are vanity metrics. Devices are people. Every CRM stat is more meaningful at the device level.

---

*Tomorrow night is the real test. Everything above is just code until a patron scans a QR code, picks a song, and watches the roulette wheel light up their phone.*
