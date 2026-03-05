# GMAI-REVIEW-WIZARD-S2-20260225-1400
## From: Bard (CoS)
## To: Wizard (CTO / Architect)
## Priority: Medium
## Re: GMAI-ARCH-ANALYTICS-CRM-v1.md — Open Questions + Decision Confirmations

---

## Overall Assessment

The architecture spec is excellent. Clean decisions, well-reasoned tradeoffs, and the phased implementation plan is exactly right. Tim reviewed it and I've confirmed the business decisions below. Barbarian has been ticketed for Sprints 1-3 (login screen, Turso setup, frontend event tracking).

---

## Answers to Your Open Questions (Section 14)

### 1. Trial Start Date Tracking

**Tim's decision: Trial start date is NOT automatically set on first login.**

Trial start is a manual business event — it happens when the venue signs a formal agreement with Tim. A venue may be in `prospect` status for days or weeks, actively using the app, before Tim converts them to a trial.

Implementation:
- Add `trial_start_date` (TEXT, nullable) and `trial_duration_days` (INTEGER, default 30) to the accounts table
- Both fields are NULL for prospects — no trial clock until Tim sets them
- Tim sets these manually via the super_admin CRM interface (Sprint 9)
- The CRM trial tracker (GET /api/crm/trials) should only show venues where `status = 'trial'` AND `trial_start_date IS NOT NULL`

This actually gives Tim a stronger sales tool. He can show a prospect: "You've already used GMAI 85 times as a free prospect — here's what a formal trial with full support looks like."

### 2. Venue Status Values

**Confirmed statuses: `prospect`, `trial`, `active`, `churned`, `paused`**

Definitions:
- `prospect` — Demo account created, can log in and use app. No agreement signed. No trial clock. Default for all new accounts.
- `trial` — Agreement signed, Tim has set trial_start_date. 30-day clock running.
- `active` — Paying customer after trial conversion.
- `paused` — Temporarily suspended (e.g., venue closed for renovation). Account still exists, usage paused.
- `churned` — Former customer, trial ended without conversion, or cancelled subscription.

All transitions are manual (Tim via CRM). No auto-transitions.

Schema:
```sql
ALTER TABLE accounts ADD COLUMN status TEXT NOT NULL DEFAULT 'prospect'
    CHECK(status IN ('prospect', 'trial', 'active', 'churned', 'paused'));
```

### 3. Daily Digest Timing

**Confirmed: 9:00 AM Pacific (UTC-8, or UTC-7 during daylight saving)**

Tim is in Las Vegas (Pacific time zone). The digest should arrive before his morning coffee meeting prep. Use cron-job.org set to 17:00 UTC (= 9:00 AM Pacific Standard) and adjust for DST manually if needed, or set to 16:00 UTC during DST months.

---

## Architecture Feedback — One Adjustment

### Login Screen as QR Entry Point (New Requirement)

Tim has decided that venue QR codes should route to `/login` instead of the marketing landing page. This affects the frontend routing and adds a minor data flow:

**Flow:**
1. Venue scans QR on leave-behind PDF → `playgmai.com/login`
2. Logs in with demo credentials (demo@meepleville.com / gmai2026)
3. Redirected to `/games` with venue branding
4. Venue ID now set in session → all events track to this venue

**Impact on your architecture:**
- The EventTracker's `venueId` is now set from the auth session, not from a config file or URL parameter
- For non-logged-in users (/games in demo mode), venueId = "demo"
- The `last_login_at` and `login_count` fields on the accounts table give Tim basic CRM data before the full Turso pipeline is running
- No changes needed to the analytics schema — venue_id still flows the same way

**Non-logged-in users still work:**
- `/games` without auth shows "GameMaster AI Demo" with default featured games
- Events from non-logged-in users track under venue_id = "demo"
- This is fine — it's useful data (shows organic interest) without requiring login friction

### Role Column

Confirmed: `role` column with `venue_admin` (default) and `super_admin` (Tim only). Add to accounts table in Sprint 1. Barbarian has been instructed.

---

## Implementation Sequence Confirmed

Tim approved the phased approach. Current assignment:

| Sprint | Phase | Status |
|---|---|---|
| Sprint 1 | Login screen + account columns | → Barbarian (ticketed) |
| Sprint 2 | Turso setup + event ingestion | → Barbarian (ticketed) |
| Sprint 3 | Frontend EventTracker wiring | → Barbarian (ticketed) |
| Sprint 4-6 | Discovery, survey, NPS | Pending — will ticket after Sprint 3 verified |
| Sprint 7-10 | Metrics, dashboards, CRM, Telegram | Pending — will ticket after Sprint 6 verified |

Sprints 1-3 are the critical path. Every day without event tracking is data we'll never get back.

---

## No Changes Needed To

These parts of your spec are approved as-is. No modifications:

- Turso as analytics persistence (Section 1) ✅
- Event schema and payload shapes (Section 2.1) ✅
- Device ID strategy with localStorage (Section 3.1) ✅
- Session ID strategy with sessionStorage (Section 3.2) ✅
- Batched event transmission with flush triggers (Section 4) ✅
- All API endpoint contracts (Section 5) ✅
- Computed metrics SQL (Section 6) ✅
- Nightly rollup approach (Section 7) ✅
- Frontend event firing map (Section 8) ✅
- Privacy approach — no PII, 90-day raw retention (Section 10) ✅
- Chart.js for dashboards (Section 12) ✅

---

## Action Items for Wizard

None right now. Barbarian has clear instructions for Sprints 1-3. If Barbarian hits an architecture question during implementation, I'll route it to you.

The next time I'll need you is before Sprint 7 (computed metrics + rollup) — I may want you to review Barbarian's SQL implementation against your spec before it goes to production.

---

*— Bard (Chief of Staff)*
