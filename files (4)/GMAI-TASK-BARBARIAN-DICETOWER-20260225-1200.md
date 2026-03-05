# GMAI-TASK-BARBARIAN-DICETOWER-20260225-1200
## From: Bard (CoS)
## To: Barbarian (Field Engineer)
## Priority: High
## Depends On: Nothing — current prod app at playgmai.com is the base

---

### Context

We are building a Dice Tower West demo layer on top of the existing playgmai.com app. The goal is a single URL (`playgmai.com`) with role-based access that controls which games users see and which features they can use. No new deployment. No new repo. The existing app gains four new account types and two new behavioral modes.

Dice Tower West runs March 11–15, 2026. Convention floor signups expire March 22 at 11:59 PM Pacific, then see a conversion screen prompting a free 30-day trial.

---

### Part 1 — New Account Roles

Add the following accounts to the auth/venue system. These sit alongside the existing 6 venue accounts.

| Username | Password | Role | Library | Permissions | Timed? |
|----------|----------|------|---------|-------------|--------|
| admin | watress2 | super_admin | Full 200 | All features, all admin | No |
| demo | watress | demo | Limited (5 PD + approved publisher games) | All features incl. admin views | No |
| meetup | bgninhenderson | meetup | Full 200 | /games + ordering only | Yes — manual toggle |
| (email signups) | none | convention | Limited (5 PD + approved publisher games) | /games + ordering only | Yes — expires March 22 11:59 PM Pacific |

**Library definitions:**
- **Full library:** All 200 games currently in the system
- **Limited library:** Only games tagged `public_domain: true` OR `publisher_approved: true` in their JSON. Initially this will be 5 games (Chess, Go, Checkers, Dominoes, Mahjong). As publisher approvals come in, they auto-appear for limited library users by tagging alone — no code change needed.

---

### Part 2 — Game Tagging

Add two new fields to the game JSON schema:

```json
"public_domain": true,
"publisher_approved": false
```

Both default to `false` for all existing 200 games. The 5 public domain games (Chess, Go, Checkers, Dominoes, Mahjong) will be delivered by Ranger/Rogues with `"public_domain": true` already set.

The backend `/api/games` endpoint must respect the requesting user's role:
- `super_admin` and `meetup` roles → return all games
- `demo` and `convention` roles → return only games where `public_domain === true OR publisher_approved === true`

---

### Part 3 — Route Access Control

| Route | super_admin | demo | meetup | convention |
|-------|------------|------|--------|-----------|
| /games | ✅ | ✅ | ✅ | ✅ |
| /games/:id | ✅ | ✅ | ✅ | ✅ |
| /score | ✅ | ✅ | ✅ | ✅ |
| /order | ✅ (demo mode) | ✅ (demo mode) | ✅ (demo mode) | ✅ (demo mode) |
| /admin | ✅ | ✅ | ❌ | ❌ |
| /analytics | ✅ | ❌ | ❌ | ❌ |

**Demo Mode ordering:** For ALL roles (including admin and demo), the order/cart UI renders with a grey "DEMO" banner at the top of the panel and a disabled checkout button that reads "Ordering available at participating venues." The cart still works (add/remove items, see subtotal) — just can't submit. This prevents any real orders being placed from the demo environment.

---

### Part 4 — Email Gate Signup (Convention Floor)

Add a new public signup flow accessible at `playgmai.com/signup`.

**Flow:**
1. User lands on `/signup` (linked from QR code on flyer)
2. Single field: email address + "Try GameMaster Guide Free" button
3. On submit: create account with role `convention`, store email, generate a simple session token
4. Redirect to `/games` — they are now logged in
5. No password required. No email verification required. Just capture and go.

**Account behavior:**
- Role: `convention`
- Access: limited library + /games + /score + /order (demo mode)
- Expiry: hard-coded to March 22, 2026 at 23:59:59 Pacific Time
- After expiry: any page load redirects to `/expired` screen (see Part 5)

**Data stored per signup:**
- email
- created_at timestamp
- last_active_at timestamp
- source: "dicetower2026" (hardcoded for this batch)

This data feeds the CRM pipeline already in place.

---

### Part 5 — Expiry Screen (/expired)

After March 22 11:59 PM Pacific, convention role accounts see this screen on any route:

```
[GameMaster Guide logo]

Your Dice Tower West demo access has ended.

Thanks for trying GameMaster Guide at Dice Tower West 2026.

[Start Your Free 30-Day Trial →]

No credit card required. Cancel anytime.
```

The CTA button links to `playgmai.com/signup` but with a flag `?trial=true` that creates the account as a 30-day free trial instead of a convention signup. Build the flag handling now even if the full trial/billing flow isn't wired yet — just set a `trial_start_date` on account creation.

---

### Part 6 — Manual Toggle for Meetup Account

In the admin panel (visible to super_admin only), add a simple "Meetup Access" toggle:

- **ON:** meetup account can log in and use the app normally
- **OFF:** meetup account login returns "This session is not currently active. Check back during the next scheduled meetup."

Default state: OFF. Tim flips it ON before each meetup, OFF after.

Store the toggle state in the existing admin config (GitHub API persistence already in place).

---

### Part 7 — Demo Badge

For accounts with role `demo` or `convention`, display a small persistent "DEMO" badge in the top-right corner of the app (below the header, unobtrusive). This visually signals to publishers and vendors that they're in a demo environment without cluttering the UI.

---

### Verification Checklist

Before emailing [GMAI-LOG]:

- [ ] admin / watress2 logs in → sees all 200 games, all routes, admin panel
- [ ] demo / watress logs in → sees only 5 PD games, all routes including admin, DEMO badge visible, analytics hidden
- [ ] meetup / bgninhenderson logs in → sees all 200 games, /games and /order only (no admin), DEMO badge visible
- [ ] Toggle meetup OFF in admin → meetup login shows "not currently active" message
- [ ] Toggle meetup ON → meetup logs in successfully
- [ ] Visit playgmai.com/signup → enter email → lands on /games as convention user
- [ ] Convention user sees only 5 PD games, DEMO badge, no admin panel
- [ ] Set system clock to March 23 → convention user sees /expired screen with trial CTA
- [ ] Order panel for any role shows DEMO banner + disabled checkout
- [ ] Analytics route returns 403 or redirects for demo/meetup/convention roles

### Report Back

Email [GMAI-LOG] Dice Tower Demo Build Complete to Tim's Gmail with:
- Confirmation of all checklist items
- Any schema changes made to the game JSON files
- The exact URL for the email gate signup page
- Any decisions you made that weren't specified above
