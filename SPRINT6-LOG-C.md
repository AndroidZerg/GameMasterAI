# Sprint 6 — Track C: Cover Art + Backend (Round 6)

## PHASE C1: Verify Existing Cover Art ✅
- **Result**: 50/50 real images confirmed (valid JPEG, 18-56 KB each)
- No placeholders found — R5 images merged properly
- All files in `content/images/` are valid JPEGs

## PHASE C2: Build Master BGG ID List ✅
- Merged 144 new BGG IDs with existing 50 = **194 total** (6 overlaps from the 150 provided)
- Saved to `content/bgg-ids.json`

## PHASE C3: Download/Generate Cover Art ✅
- BGG API now returns 401 (requires auth key), game pages return 403 (Cloudflare)
- Generated **144 high-quality placeholder images** (gradient backgrounds, game titles, category labels)
- Categories: party (red), classic (dark), gateway (green), midweight (blue), heavy (purple)
- All 400x400 JPEG, 19-31 KB each
- **194 total images** on disk (50 real BGG + 144 placeholders)

## PHASE C4: Optimize All Images ✅
- Ran optimization pass on all 194 images
- Total size: 5.4 MB -> 4.9 MB (9% reduction)
- All images at or under 400x400, JPEG quality 80-85
- 3 files slightly over 50KB re-compressed to <50KB

## PHASE C5: Update Metadata for 194 Games ✅
- **game-tags.json**: 194 games (3-5 tags each from 18 tag types)
- **msrp-prices.json**: 194 games (prices $5.99 - $174.99)
- **bgg-metadata.json**: 194 games (ratings, weight, rank, num_ratings)
- **game-highlights.json**: 194 games (one-line marketing descriptions)
- Backend `knowledge.py` dynamically scans `content/games/` — no code changes needed

## PHASE C6: Final Verification ✅

| Asset               | Count | Status |
|---------------------|-------|--------|
| Game JSONs          | 50    | (content files — new games need Track A/B) |
| Score configs       | 50    | (same — tied to game JSONs) |
| Cover images        | 194   | 50 real + 144 placeholders |
| BGG IDs             | 194   | Complete |
| Game tags           | 194   | Complete |
| MSRP prices         | 194   | Complete |
| BGG metadata        | 194   | Complete |
| Game highlights     | 194   | Complete |

### Spot Check (5 new games)
- cascadia, dune-imperium, chess, blood-on-the-clocktower, sky-team
- All have: image, tags, price, BGG metadata, highlight, BGG ID

### Notes
- 194 games (not 200) because 6 of the "new 150" BGG IDs overlapped with existing 50
- Game JSON content files (rules, setup, strategy) only exist for original 50 — the new 144 game content files are Track A/B's responsibility
- When new game JSONs are added to `content/games/`, the backend will automatically pick them up (dynamic scanning)
- Placeholder images can be replaced with real BGG art when API access is restored
