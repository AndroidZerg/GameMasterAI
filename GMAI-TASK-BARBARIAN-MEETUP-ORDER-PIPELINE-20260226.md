# GMAI-TASK-BARBARIAN-MEETUP-ORDER-PIPELINE-20260226
## From: Bard (CoS)
## To: Barbarian (Field Engineer)
## Priority: Critical — full pipeline fix, deploy, and verify

---

## Context

The meetup account at Thai House (Henderson) needs a fully working food ordering pipeline. Right now there are 5 issues to fix in one push:

1. The Order panel shows the old default Henderson menu (Hot Drinks, Cold Drinks, Beer & Wine) instead of the Thai House menu — even though the API at `/api/venue/menu?venue_id=meetup` correctly returns the 90-item Thai House menu
2. Meetup role has DEMO restrictions that block actual checkout
3. No customer name field on orders (meetup is a shared login — staff need to know who to hand food to)
4. Orders need to route to the new Thai House Orders Telegram bot
5. The "Games & Accessories" tab in the Order panel should be hideable per-venue (Thai House doesn't sell games)

Fix all five, push, deploy, and loop-test until everything works.

---

## Thai House Orders Telegram Bot

- **Token:** `8656641841:AAGnwDTvxk2K7kf3Y6Wlf4zVnKIf7HllwE`
- **Chat ID:** `-5213518274`

These must be added as Render env vars:
```
THAI_HOUSE_BOT_TOKEN = 8656641841:AAGnwDTvxk2K7kf3Y6Wlf4zVnKIf7HllwE
THAI_HOUSE_CHAT_ID = -5213518274
```

---

## FIX 1: Meetup Menu Not Loading in Frontend

The backend API is correct — `GET /api/venue/menu?venue_id=meetup` returns the full Thai House menu (90 items, 11 categories). But the frontend Order panel still shows the old default Henderson menu.

**Investigate the frontend Order panel component.** Find where it loads the menu. Likely causes:
- It may be hardcoding a default menu or using a fallback when the API call fails
- It may not be passing `venue_id` from the auth context to the menu endpoint
- It may be hitting the wrong endpoint (e.g., `/api/v1/venue/menu` DB-based instead of `/api/venue/menu` file-based)
- It may be caching the old menu in React state or a stale closure

**The fix:** Make sure the Order panel loads menu data from `GET /api/venue/menu?venue_id={venue_id}` using the authenticated user's venue_id. When the meetup account opens Order, it must show:
- 11 Thai House categories: Appetizers, Soups, Salads, Stir-Fry, Curries, Fried Rice, Seafood, Chef Specials, Beverages, Desserts, Specials
- 90 items total
- No trace of the old Henderson menu (Hot Drinks, Cold Drinks, Beer & Wine, Food, Snacks)

---

## FIX 2: Enable Real Ordering for Meetup

The meetup role currently has DEMO restrictions — the cart works but checkout is disabled with "Ordering available at participating venues."

**Change the ordering permissions so meetup can place real food orders.** Specifically:
- The meetup role should be able to submit food orders (checkout button works, order is saved, Telegram notification fires)
- The DEMO badge can stay on the meetup account for other features (game library browsing, etc.) — just food ordering needs to work
- If the DEMO restriction is a blanket check on the role, you may need to make ordering permissions more granular (e.g., `can_order: true` on the meetup account or role)

**Important:** Convention role should STILL have ordering disabled (they're browsing at Dice Tower, not ordering food). Only meetup gets real ordering.

---

## FIX 3: Required Customer Name on Orders

Since the meetup account is a shared login via magic link, there's no per-user identity. Thai House staff need to know who ordered.

**Add a "Your Name" text input field in the Order/Cart/Checkout flow:**
- Required — cannot submit without entering a name
- Placed prominently above the checkout/submit button
- Persists in React state for the session (not localStorage) so repeat orders don't require re-typing
- Sent to the backend as `customer_name` in the order payload
- Backend stores it with the order record
- Included in ALL Telegram notifications (both GMAI Leads and Thai House bot)

This applies to all venues, not just meetup — it's useful everywhere.

---

## FIX 4: Thai House Telegram Bot Integration

When an order is placed from the **meetup** venue_id, send a formatted message to the Thai House Orders Telegram bot IN ADDITION to the existing GMAI Leads bot.

**Message format for Thai House bot:**
```
🎮 GameMaster Guide — Table Order
Henderson Meetup | {time in Pacific Time}
👤 Name: {customer_name}

🛒 Order:
  {qty}x {item_name} — ${item_total}
  {qty}x {item_name} — ${item_total}
  ...

💰 Total: ${order_total}

📝 Notes: {order_notes if any}
```

**Routing logic:**
```
When an order is submitted:
  1. Always save to SQLite (existing)
  2. Always send to GMAI Leads bot (existing) — include customer_name
  3. IF venue_id == "meetup" AND THAI_HOUSE_BOT_TOKEN is set:
     ALSO send to Thai House Orders bot
```

**Graceful degradation:** If THAI_HOUSE_BOT_TOKEN or THAI_HOUSE_CHAT_ID is not set, log a warning on startup and silently skip the Thai House notification. Never crash.

---

## FIX 5: Per-Venue "Games & Accessories" Toggle

The Order panel has two tabs: "Games & Accessories" and "Menu". Thai House is a restaurant, not a game store — they don't sell games or accessories.

**Add a per-venue configuration that controls whether the "Games & Accessories" tab is shown in the Order panel.**

Implementation options (pick the simplest):
- A field in the venue account record (e.g., `show_game_store: true/false`)
- A field in the menu JSON file (e.g., `"show_game_store": false` at the top level of meetup.json)
- A hardcoded check on venue_id (least preferred but fastest — only do this if the other options require significant refactoring)

**Behavior when Games & Accessories is OFF:**
- The Order panel opens directly to the Menu tab
- The "Games & Accessories" tab is completely hidden (not just disabled)
- No visual trace that it ever existed

**Default values:**
- meetup: OFF (Thai House doesn't sell games)
- All other existing venues: ON (they're game stores/cafes)
- New venues via onboarding: ON by default

---

## Deploy, Test, and Loop

After all 5 fixes are implemented:

### Pre-push checks
```bash
cd D:\GameMasterAI\frontend
npm run dev
```
Run the full Barbarian pre-push checklist (all 17 smoke test items).
```bash
npm run build 2>&1 | findstr /i "error"
```
Must be zero errors.

### Push and deploy
```bash
git add -A
git commit -m "feat: meetup ordering pipeline — Thai House menu, real checkout, customer name, Telegram bot, game store toggle"
git push
```

Wait for Render deploy to complete (check health endpoint).

### Post-deploy verification — FULL TEST SUITE

**Test A: Meetup menu loads correctly**
1. Open incognito browser
2. Go to playgmai.com/join?key=bgninhenderson
3. Open any game → tap Order
4. VERIFY: Menu tab shows Thai House categories (Appetizers, Soups, Salads, etc.)
5. VERIFY: NO "Hot Drinks", "Cold Drinks", "Beer & Wine" categories
6. VERIFY: "Games & Accessories" tab is NOT visible

**Test B: Real ordering works for meetup**
1. Add items to cart (e.g., 1x Pad Thai $12.95, 1x Thai Iced Tea $4.50)
2. Go to cart
3. VERIFY: Checkout button is active (not grayed out, no "participating venues" message)
4. Try to submit WITHOUT entering a name → MUST be blocked
5. Enter name "Test Order — Delete Me"
6. Submit order
7. VERIFY: Order confirmation appears in the app
8. VERIFY: Message appears in Thai House Orders Telegram group with correct format (🎮 header, 👤 name, items, total)
9. VERIFY: Message ALSO appears in GMAI Leads Telegram bot

**Test C: Name persists for session**
1. After submitting an order, open Order panel again
2. Add a different item
3. Go to cart
4. VERIFY: Name field still shows "Test Order — Delete Me"

**Test D: Non-meetup venue does NOT route to Thai House**
1. Open new incognito window
2. Log in as demo@meepleville.com / gmai2026
3. Open a game → Order
4. VERIFY: "Games & Accessories" tab IS visible (Meepleville is a game store)
5. VERIFY: Menu shows Meepleville's menu (NOT Thai House)
6. Add an item, go to cart
7. VERIFY: Checkout still shows DEMO restriction for Meepleville (they're a prospect, not meetup)

**Test E: Convention account stays restricted**
1. Log in as demo-dicetower / watress2
2. Open Order panel
3. VERIFY: DEMO mode ordering (cart works, checkout disabled)

**Test F: Admin config survived the deploy**
1. Log in as admin / watress2
2. Go to Customize Home
3. VERIFY: Global Default shows Wingspan GOTD + 10-pick Meepleville list
4. VERIFY: Convention shows Chess GOTD + 5 PD games
5. If these have reset, report IMMEDIATELY — the three-layer persistence fix didn't work

**Test G: Edge cases**
1. Meetup user: open Order, switch between Menu categories rapidly — no crashes
2. Meetup user: add 10+ different items, verify cart totals correctly
3. Meetup user: remove all items from cart, verify subtotal shows $0.00 and submit is disabled
4. Meetup user: enter a very long name (30+ characters) — should work, no overflow
5. Meetup user: enter name with special characters (e.g., "José O'Brien") — should work
6. Refresh page mid-order — verify cart state (acceptable if cart clears on refresh)

### If ANY test fails:
Fix the issue, rebuild, re-push, re-deploy, re-run ALL tests from the top.
Max 3 deploy cycles. If still failing after 3, stop and report exactly what's failing and why.

---

## Files Likely Modified

**Frontend:**
- Order panel component — menu loading, Games & Accessories toggle, customer name field
- Auth context or role permissions — enable checkout for meetup
- Cart/checkout component — name field, submit logic

**Backend:**
- Config — THAI_HOUSE_BOT_TOKEN, THAI_HOUSE_CHAT_ID env vars
- Telegram service — Thai House send function
- Order route — accept customer_name, conditional Thai House notification
- Venue menu endpoint — possibly (if the frontend issue traces back here)
- Menu JSON (meetup.json) — possibly add `show_game_store: false` field

---

## Report Back

1. Root cause of the menu not loading (Fix 1) — what was the frontend doing wrong?
2. How ordering permissions were changed for meetup (Fix 2)
3. Where the customer name field was added and how it flows to Telegram (Fix 3)
4. Confirmation Thai House bot receives meetup orders with correct format (Fix 4)
5. How the Games & Accessories toggle was implemented (Fix 5)
6. Full test results for Tests A through G
7. Post-deploy admin config check (Test F) — did Customize Home survive?
8. Commit hash and deploy status
