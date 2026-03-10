---
# GAMEMASTER GUIDE — Barbarian Pre-Push Checklist
## Required before every `git push` to main
## Last Updated: March 10, 2026

---

## WHY THIS EXISTS

Round 8 shipped a black screen crash on every page navigation. It reached production and broke all 6 venue demos. The root cause was an infinite React re-render loop introduced in R8 changes that was never caught because we pushed without testing navigation paths in dev mode.

On 2026-03-10, a stale static landing.html in frontend/public/ shadowed the /landing React route on Cloudflare Pages. The file carried a 7-day cache header. Visitors saw the old page for hours after a correct deploy. The fix was deleting the static file — but it should never have shipped.

This checklist exists so these things never happen again. Barbarian runs this before every push. No exceptions.

---

## THE CHECKLIST

### 1. Dev Mode Smoke Test (MANDATORY — every push)

Start the frontend dev server. Do NOT test against the production build — dev mode gives unminified errors with exact line numbers.
```bash
cd D:\GameMasterAI\frontend
npm run dev
```

Open `http://localhost:5173` in Chrome with DevTools Console open. Run through every path:

| # | Test | Expected Result | ✅/❌ |
|---|------|----------------|-------|
| 1 | Load `/` (not logged in) | Login screen appears | |
| 2 | Login with `demo@meepleville.com` / `gmai2026` | Redirects to `/games`, shows game library | |
| 3 | Click any game | `/game/{id}` loads, Setup tab shown | |
| 4 | Switch to Rules tab | Content loads, no crash | |
| 5 | Switch to Strategy tab | Content loads, no crash | |
| 6 | Switch to Q&A and Notes tab | Chat + Notes appear, no background bleed | |
| 7 | Ask a question in Q&A | Response appears, no crash | |
| 8 | Switch to Score tab | Score tracker loads, timer starts | |
| 9 | Click + Player | Player added, stays (not deleted) | |
| 10 | Click ← Games | Returns to game library, no black screen | |
| 11 | Click a DIFFERENT game | New game loads, no crash | |
| 12 | Click ← Games again | Library loads, no crash | |
| 13 | Click Order button | Order panel opens with game + accessories | |
| 14 | Close Order panel | Returns to game view | |
| 15 | Refresh page on `/game/{id}` | Page reloads correctly, stays on game | |
| 16 | Log out | Returns to login screen | |
| 17 | Check Console | **Zero** React errors, **zero** 404s, **zero** unhandled exceptions | |

**If ANY test fails: DO NOT PUSH. Fix first.**

---

### 2. Console Error Check (MANDATORY — every push)

With DevTools Console open during the smoke test, there should be:

- **Zero** `Uncaught Error` messages
- **Zero** `React error #` messages
- **Zero** `404 Not Found` on API calls (leaderboard, lobby, etc.)
- **Zero** `TypeError: Cannot read properties of undefined`
- **Zero** `ReferenceError: X is not defined`

Warnings are acceptable. Errors are not.

---

### 3. Build Check (MANDATORY — every push)
```bash
cd D:\GameMasterAI\frontend
npm run build 2>&1 | findstr /i "error"
```

**Zero errors.** Warnings are acceptable. If there are build errors, fix them before pushing.

---

### 4. Static File Shadow Check (MANDATORY — every push)

A static HTML file in frontend/public/ will shadow any matching React
route on Cloudflare Pages. Cloudflare serves static files before the
SPA catch-all _redirects rule — so the old file gets served instead of
the React app, with its own cache headers, regardless of what the build
contains.
```bash
dir frontend\public\*.html
```

The ONLY .html file that should exist is index.html (the SPA shell).
If ANY other .html file appears — delete it before pushing.
```bash
# If you find extras, delete them:
del frontend\public\landing.html
del frontend\public\[any-other-route].html
```

Note: Explicit _redirects rules for paths that Cloudflare already serves
as static files cause infinite redirect loops. Real static files are
served before catch-all rewrites — do not add redirect rules for them.

---

### 5. React Anti-Pattern Scan (Run after modifying any .jsx file)

Search for known crash patterns in modified files:
```bash
# useEffect without dependency array (infinite loop risk)
findstr /n "useEffect(() =>" D:\GameMasterAI\frontend\src\components\*.jsx
# Every useEffect MUST have a dependency array: [] or [dep1, dep2]

# Context value not memoized (causes all consumers to re-render)
findstr /n "value={{" D:\GameMasterAI\frontend\src\contexts\*.jsx
# Every context Provider value MUST use useMemo

# Missing interval cleanup (memory leak + ghost state updates)
findstr /n "setInterval" D:\GameMasterAI\frontend\src\components\*.jsx
# Every setInterval MUST have clearInterval in a useEffect cleanup
```

---

### 6. API Endpoint Check (Run after modifying backend routes)
```bash
findstr /r /s "fetch.*api/" D:\GameMasterAI\frontend\src\*.jsx D:\GameMasterAI\frontend\src\*.js
findstr /r /s "@router\.\|@app\." D:\GameMasterAI\backend\app\api\routes\*.py
```

Every frontend `fetch('/api/...')` must have a corresponding backend
route. Missing endpoints cause 404s which can trigger re-render loops.

---

### 7. Environment Variable Check (Run after adding new env vars)

If you added a new environment variable the backend reads with `os.getenv()`:

- **Does it have a fallback?** `os.getenv("VAR", "default")` — never None if code depends on it
- **Is it set on Render?** Check the Render dashboard before pushing
- **Does the app start without it?** Test locally without the var set

---

### 8. Git Hygiene (MANDATORY — every push)
```bash
# Check what you're about to push
git diff --stat HEAD origin/main
git log --oneline HEAD...origin/main

# Only push files you intentionally modified
git status
# If there are untracked files (screenshots, zips, etc.), don't stage them
```

---

## QUICK VERSION (Copy-Paste for Fast Runs)
```bash
cd D:\GameMasterAI\frontend

# 1. Static file check
dir frontend\public\*.html
# Only index.html should appear — delete anything else

# 2. Smoke test
npm run dev
# Test: login → games → game → all tabs → back → different game → back → logout → console clean

# 3. Build check
npm run build 2>&1 | findstr /i "error"
# Must be zero errors

cd D:\GameMasterAI
git add -A
git commit -m "description"
git push
```

---

## KNOWN PAST BUGS (Reference)

| Bug | Root Cause | How to Check |
|-----|-----------|-------------|
| Black screen on navigation | useEffect infinite loop / missing deps | Smoke test #1-16 |
| MSRP_PRICES not defined | Referenced undefined variable | Build check (catches at compile) |
| Leaderboard 404 spam | Frontend fetches endpoint that doesn't exist | Console error check |
| Lobby polling 404 after leave | setInterval not cleared on unmount | Navigate away from Score, check console |
| + Player deleted after 1 second | useEffect reinitializing state on every render | Smoke test #9 |
| Admin config resetting | Render ephemeral filesystem, GitHub API fallback failing | Check GOTD/Staff Picks after deploy |
| Wrong GOTD image | Image URL from different game than title | Visual check on /games |
| Telegram not sending | Corrupted bot token on Render | Submit contact form, check Telegram |
| Browser autofill on score inputs | Missing autocomplete="off" | Open Score tab on mobile |
| Notes not expanding | Fixed height instead of flex | Collapse Q&A, check Notes fills screen |
| Static HTML shadowing SPA route | .html file in frontend/public/ matches a React route — Cloudflare serves the static file with its own 7-day cache headers instead of the React app | Before every push: `dir frontend\public\*.html` — delete any file that is not index.html |

---

## WHEN TO SKIP THIS CHECKLIST

Never.

---

*If Barbarian reports "checklist passed" in the commit log, we know the push was tested. If the commit message doesn't mention the checklist, ask why.*
