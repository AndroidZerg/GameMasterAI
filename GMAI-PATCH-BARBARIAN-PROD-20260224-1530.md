# GMAI-PATCH-BARBARIAN-PROD-20260224-1530
## From: Bard (CoS)
## To: Barbarian (Field Engineer)
## Priority: High
## Depends On: None

---

### Context

The admin "Customize Home" page allows configuration of Game of the Day and Staff Picks, but changes made in the admin panel are not reflected on the live /games homepage.

**Current state:**
- Admin panel shows: "Betrayal at House on the Hill (3rd Edition)" as Game of the Day (Manual Pick mode)
- Live /games page shows: "Onitama" as Game of the Day
- Staff Picks also differ between admin config and live display

**Screenshots provided by Tim:**
1. `/mnt/user-data/uploads/1771952070524_image.png` - Live /games page showing Onitama
2. `/mnt/user-data/uploads/1771952080889_image.png` - Admin panel showing Betrayal configuration

---

### Instructions

**Step 1: Verify the backend configuration endpoint**
- Check if the admin panel is successfully POSTING configuration changes to the backend
- Verify the backend is storing the updated configuration (check database or config file)
- Test the GET endpoint that serves homepage configuration to the frontend
- Confirm the backend is returning the latest configuration when queried

**Step 2: Verify the frontend is fetching latest data**
- Check if the /games page is calling the correct API endpoint to get homepage config
- Look for caching issues (browser cache, service workers, API response caching)
- Verify the frontend is re-rendering when configuration data changes
- Check for any hardcoded values or stale state

**Step 3: Identify the root cause**
Determine which layer is broken:
- **Backend not saving:** Admin panel sends data but backend doesn't persist it
- **Backend not serving:** Backend has the data but GET endpoint returns stale/wrong data
- **Frontend not fetching:** Frontend doesn't call the API or ignores the response
- **Frontend caching:** Frontend fetches correct data but displays cached version

**Step 4: Fix the issue**
- Implement the fix at the identified layer
- Ensure configuration changes in admin panel immediately reflect on /games page
- Consider adding cache-busting for homepage configuration if not already present

**Step 5: Verify end-to-end**
1. Open admin panel
2. Change Game of the Day to a different game (e.g., "Wingspan")
3. Save configuration
4. Navigate to /games page
5. Confirm Game of the Day now shows "Wingspan"
6. Repeat test with Staff Picks changes
7. Test that both Auto-Rotate and Manual Pick modes work correctly

---

### Acceptance Criteria

- [ ] Admin panel configuration changes save successfully to backend
- [ ] Backend serves the latest configuration via GET endpoint
- [ ] Frontend fetches and displays latest configuration on /games page
- [ ] Changes made in admin panel appear on /games page within 5 seconds (including page refresh if needed)
- [ ] Both Game of the Day and Staff Picks sync correctly
- [ ] No browser caching prevents configuration updates from displaying
- [ ] Configuration persists after server restart

---

### Technical Notes

**Likely investigation paths:**
- Check `backend/app/api/routes/` for admin config endpoints
- Check frontend API service calls for homepage data fetching
- Look for any `.env` or config files that might be overriding database values
- Check for React state management issues (stale state, missing re-renders)
- Verify any caching middleware in FastAPI isn't preventing updates

**Quick diagnostic commands:**
```bash
# Check if backend has the updated config
curl http://localhost:8100/api/config/homepage

# Check FastAPI logs for POST requests from admin panel
# Check React dev console for API calls when loading /games page
```

---

### Report Back

**Provide in [GMAI-LOG] email:**

1. **Root cause identified:** Exactly which layer was broken and why
2. **Fix implemented:** What you changed to resolve the issue
3. **Verification results:** Screenshot or description of successful end-to-end test showing admin change → live page update
4. **Any additional recommendations:** Cache strategy improvements, error handling additions, etc.

**Example report structure:**
```
[GMAI-LOG] Homepage Config Sync - FIXED

ROOT CAUSE:
Frontend was fetching from /api/config/homepage but data was cached with 5-minute TTL.
Admin panel was correctly saving to database, backend was correctly serving latest data,
but browser cache prevented updates from displaying.

FIX IMPLEMENTED:
- Added Cache-Control: no-cache header to /api/config/homepage endpoint
- Added cache-busting query param to frontend API call: ?t=${Date.now()}
- Frontend now fetches fresh config on every /games page load

VERIFICATION:
✅ Changed Game of the Day from Onitama → Betrayal in admin panel
✅ Navigated to /games page → Betrayal now displays correctly
✅ Changed Staff Picks order → changes reflected immediately
✅ Tested after server restart → configuration persists
✅ Tested both Auto-Rotate and Manual Pick modes → both work

Files modified:
- backend/app/api/routes/config.py (added no-cache header)
- frontend/src/services/api.js (added cache-busting param)

Commit: abc123f "Fix homepage config caching preventing admin updates"
```

---

**Expected completion time:** 30-60 minutes

**Tim needs:** A working admin panel where configuration changes immediately reflect on the live /games page. This is critical for venue staff to manage what games are featured.
