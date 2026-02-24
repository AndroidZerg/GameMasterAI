# Deploy + Content Sprint Log
Started: 2026-02-23T06:00:00Z
Completed: 2026-02-23

## Phase C1: Finish Public Deployment
Status: PARTIAL — manual DNS steps needed

### What's working:
- Render backend is LIVE at https://gmai-backend.onrender.com
- Health endpoint returns `{"status":"ok"}`
- render.yaml is configured correctly with CORS_ORIGIN=https://playgmai.com
- Frontend builds with Vite (React 19)

### What needs manual action (Cloudflare dashboard):
1. **api.playgmai.com DNS**: Add CNAME record `api` → `gmai-backend.onrender.com` (DNS only / gray cloud)
   - Currently: NOT configured (NXDOMAIN)
2. **Render Custom Domain**: Add `api.playgmai.com` as custom domain in Render dashboard
   - Then wait for TLS certificate provisioning
3. **Cloudflare Pages (Frontend)**:
   - Build command: `cd frontend && VITE_API_URL=https://api.playgmai.com npm run build`
   - Deploy `frontend/dist/` to Cloudflare Pages
   - Set custom domain: playgmai.com
   - Currently: playgmai.com resolves to registrar parking (162.255.119.30)
4. **End-to-end verification**: Pending DNS propagation

---

## Phase C2: Download Game Cover Art
Status: BLOCKED — BGG API returning 401 Unauthorized

### Completed:
- Created `content/bgg-ids.json` with BGG IDs for all 50 games
- Created `scripts/download_covers.py` download script
- Created `content/images/` directory

### Blocked:
- BGG XML API2 returns HTTP 401 from this network
- Script is ready; needs manual run when BGG access available
- Alternative: download covers manually from BGG game pages

---

## Phase C3: Strip Empty Player-Count Headers
Status: COMPLETE

- Ran `scripts/strip_empty_headers.py` across all 50 games
- 0 empty headers found (previous audit already cleaned them)
- Script retained for future use

---

## Phase C4: Rulebook Audit — Full Cross-Reference
Status: COMPLETE — 19 games fixed, 50/50 audited

### Methodology:
- Read every rulebook text file (50 files)
- Cross-referenced against every game JSON
- Found all player-count-dependent rules
- Verified presence, location, and accuracy in JSON

### Results:
- **19 games** received fixes (42+ individual rule additions/corrections)
- **29 games** already 100% correct
- **2 games** deferred (takenoko, sheriff-of-nottingham — OCR stubs)

### Key fixes:
- agricola: Action space details for 1/3/4/5P
- brass-birmingham: Tie-break order corrected
- castles-of-burgundy: VP scaling values added
- codenames: Full 2P/3P variant mechanics
- cosmic-encounter: Four Planets variant
- dead-of-winter: 5 missing rules (dice, crisis, food, zombies, 2P variant)
- decrypto: Full 3P asymmetric mode
- great-western-trail: Cattle market refill totals
- king-of-tokyo: Fire Breathing 2P exception
- lords-of-waterdeep: 3P header formatting
- mysterium: Card layout table values
- power-grid: Full "Against the Trust" 2P variant
- root: Dominance removal + Vagabond coalition
- seven-wonders: Full 2P expert variant + science scoring formula
- terraforming-mars: Corporate Era + Tharsis Republic solo
- the-crew: JARVIS 2P + 5P task handover
- viticulture: Friendly Variant
- wingspan: Green-side goal scoring

---

## Phase C5: Content Quality Report
Status: COMPLETE

### Final Summary:
- Total games: 50
- Games with all required subtopics: 39/50
- Games with player-count content: 39/50
- Total token count: 146,859
- Average token count: 2,937
- Average by complexity: party=1,798 / gateway=2,714 / midweight=3,114 / heavy=3,944

### Notes:
- 11 games "missing" board-layout subtopic — all are card/party games without boards (expected)
- Report saved to `tests/content_quality_report.txt`

---

## Phase C6: Fix Structured Content Tester
Status: COMPLETE — all tests passing

### Final test results (0/0/0/0):
- Test 1 (Empty headers): 0 failures
- Test 2 (Specificity): 0 failures
- Test 3 (Setup sufficiency): 5 warnings (acceptable — solo/variant rules in Rules tab)
- Test 4 (Orphan headers): 0 failures

### Fixes made:
- Root 4P section: added number for specificity
- Seven Wonders: player_count.min updated 3→2 (2P expert variant)
- The Crew: player_count.min updated 3→2 (JARVIS variant)

---

## Phase C7: Spot-Check 10 Games
Status: COMPLETE

### Results:
- 7/10 games: YES (ready to ship)
- 2/10 games: YES with minor caveats
- 1/10 games: Needs deeper rules (Brass: Birmingham — structural overview, not action-level detail)

### Fixes applied during spot-check:
- Catan: Added terrain distribution (19 hexes) + resource-to-terrain mapping
- Spirit Island: Added complete Invader Phase mechanics (Ravage/Build/Explore with damage values, piece health, Blight cascade, Fear generation, Terror Level victory conditions)
- Wingspan: Removed Splendor-contaminated text from player-setup subtopic
- 7 Wonders: Added science scoring formula (N-squared + 7 per triplet)

### Games reviewed:
1. Above and Below — YES (with caveats)
2. Splendor — YES (strongest file)
3. Catan — YES (after fix)
4. Spirit Island — YES (after fix)
5. Coup — YES
6. Brass: Birmingham — WITH CAVEATS (rules need more depth)
7. Wingspan — YES (after fix)
8. Patchwork — YES
9. 7 Wonders — YES (after fix)
10. King of Tokyo — YES (with minor caveats)

Report saved to `tests/spot_check_results.txt`

---

## Phase C8: Polish
Status: COMPLETE

### Final verification:
- All 50 game JSON files: VALID
- Structured content tester: 0/0/0/0 (all passing)
- All commits pushed to sprint/deploy-content
- Cover images: 0/50 (BGG API blocked — script ready for manual retry)
- Rulebook audit report: Complete (tests/rulebook_audit_report.txt)
- Content quality report: Complete (tests/content_quality_report.txt)
- Spot-check results: Complete (tests/spot_check_results.txt)

### Remaining items for future work:
1. **BGG cover art** — Run `scripts/download_covers.py` when BGG API accessible
2. **Takenoko** — Re-extract rulebook text from PDF; JSON is placeholder
3. **Sheriff of Nottingham** — Re-extract rulebook; verify player_count.max (5 vs 6)
4. **Brass: Birmingham** — Consider adding concrete action costs/constraints to rules
5. **DNS/Deployment** — Complete Cloudflare DNS + Pages setup (manual dashboard steps)

### Commits on sprint/deploy-content:
1. `272e121` — Track C Phase 1: Deployment verification + BGG cover art setup
2. `f83efbf` — Track C Phase 3: Strip empty headers script
3. `73f6262` — Track C Phase 4: Rulebook audit — 19 games fixed, 50/50 audited
4. `832fe0f` — Track C Phase 4-6: Audit fixes, test validation, quality reports
5. `e974602` — Track C Phase 7: Spot-check 10 games + quality fixes
6. (pending) — Track C Phase 8: Final polish + sprint log
