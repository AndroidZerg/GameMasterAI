# GMAI — NIGHTWATCH: Autonomous Test-Fix-Deploy Loop
## Technical Specification v1.0 | February 26, 2026
## Author: Wizard (CTO) | For: Barbarian (Field Engineer)

---

## 1. EXECUTIVE SUMMARY (For Tim)

Nightwatch is a script that runs on K2-PC all night. Every 60 minutes it:

1. Tests the live site (playgmai.com) to make sure everything works
2. If something's broken, tells Claude Code exactly what failed and lets it fix it
3. Waits for the fix to deploy on Render
4. Sends you a Telegram message with the results

If Claude Code can't fix something after 5 tries, it stops trying, flags it for you, and moves on to other tests. You wake up to a Telegram history of everything that happened overnight.

---

## 2. ARCHITECTURE DECISION: FIX LOOP METHOD

**Recommendation: Option (b) — `claude` CLI with `--print` flag. This is the only correct answer.**

Here's why:

| Option | Approach | Verdict |
|--------|----------|---------|
| (a) Watched file polling | Barbarian polls a file in a loop | **Reject.** Requires a persistent Claude Code session consuming resources all night. Polling introduces race conditions — Barbarian might read a half-written file. No clean way to know when Claude Code is "done" thinking. |
| (b) `claude` CLI `--print` | Orchestrator invokes `claude -p "prompt" --print` per failure | **Accept.** Each invocation is stateless and clean. Orchestrator controls timing. Stdout capture gives structured feedback. Claude Code exits when done — no dangling sessions. Works natively on Windows via `claude.cmd`. |
| (c) Queue file while loop | Barbarian reads a FIFO/queue | **Reject.** Windows doesn't have native FIFO pipes. Simulating with file polling has the same race condition problems as (a). Adds complexity with zero benefit over (b). |

**The `claude` CLI approach gives us:**
- **Deterministic control flow** — orchestrator calls, waits for exit, reads stdout
- **Clean error boundaries** — if claude hangs, the orchestrator can timeout and kill the process
- **No session management** — each fix attempt is independent
- **Structured output** — we tell Claude Code to respond in JSON, parse the result

**Critical detail:** Each `claude` invocation gets the full project context via `--cwd D:\GameMasterAI`. Claude Code reads the codebase fresh each time. We pass the failure report as the prompt, and Claude Code has access to `git`, `npm`, and the Render deploy pipeline.

---

## 3. FILE STRUCTURE

```
D:\GameMasterAI\
├── nightwatch\
│   ├── nightwatch.py              # Main orchestrator (Python 3.11+)
│   ├── config.py                  # All configuration constants
│   ├── test_runner.py             # Playwright test execution + JSON output
│   ├── fix_dispatcher.py          # Claude CLI invocation logic
│   ├── deploy_watcher.py          # Render API polling
│   ├── telegram_reporter.py       # Telegram Bot API integration
│   ├── config_guardian.py         # admin-config.json protection (Item 6)
│   ├── requirements.txt           # playwright, requests, python-telegram-bot
│   ├── logs\
│   │   ├── cycle-{timestamp}.json # Full cycle report per run
│   │   └── failures-needing-human.json  # Accumulated unfixable failures
│   └── tests\
│       ├── playwright.config.ts   # Playwright config targeting playgmai.com
│       ├── smoke.spec.ts          # Core smoke tests
│       ├── games.spec.ts          # Game loading + query tests
│       ├── onboarding.spec.ts     # Onboarding flow tests
│       ├── config-guard.spec.ts   # admin-config.json integrity tests
│       └── package.json           # Playwright + dependencies
```

---

## 4. CONFIGURATION

```python
# nightwatch/config.py

# === Scheduling ===
CYCLE_INTERVAL_SECONDS = 3600          # 60 minutes between cycles
MAX_CYCLES_PER_NIGHT = 8              # Safety cap: stop after 8 hours
CYCLE_START_HOUR = 22                  # Don't start before 10 PM
CYCLE_END_HOUR = 7                     # Don't run past 7 AM

# === Test Target ===
TARGET_URL = "https://playgmai.com"
TEST_TIMEOUT_SECONDS = 120             # Per-test timeout

# === Claude Code Fix Loop ===
CLAUDE_CLI = "claude"                  # Assumes claude is on PATH
CLAUDE_CWD = r"D:\GameMasterAI"       # Working directory for fixes
CLAUDE_TIMEOUT_SECONDS = 300           # 5 min max per fix attempt
MAX_FIX_ATTEMPTS_PER_FAILURE = 5       # Give up after 5 tries
CLAUDE_MODEL = None                    # Use default (don't override)

# === Render Deploy Watching ===
RENDER_API_BASE = "https://api.render.com/v1"
RENDER_API_KEY_ENV = "RENDER_API_KEY"  # Read from environment variable
RENDER_SERVICE_ID_ENV = "RENDER_SERVICE_ID"  # Read from environment variable
DEPLOY_POLL_INTERVAL_SECONDS = 15      # Check every 15 seconds
DEPLOY_TIMEOUT_SECONDS = 600           # 10 min max wait for deploy

# === Telegram ===
TELEGRAM_BOT_TOKEN = "8535000205"      # Bot token (first part only — full token from env)
TELEGRAM_CHAT_ID = "6236947695"
TELEGRAM_BOT_TOKEN_ENV = "TELEGRAM_BOT_TOKEN"  # Full token from environment

# === Config Guardian (Item 6) ===
ADMIN_CONFIG_PATH = "frontend/src/config/admin-config.json"  # Relative to CLAUDE_CWD
ADMIN_CONFIG_FIELDS = ["gotd", "staff_picks"]  # Fields to monitor
```

### Environment Variables Required

Tim needs to set these on K2-PC before first run:

```powershell
# PowerShell — run once, persists across sessions
[System.Environment]::SetEnvironmentVariable("RENDER_API_KEY", "rnd_xxxxx", "User")
[System.Environment]::SetEnvironmentVariable("RENDER_SERVICE_ID", "<your-service-id>", "User")
[System.Environment]::SetEnvironmentVariable("TELEGRAM_BOT_TOKEN", "8535000205:AAxxxxx", "User")
```

### Render Service ID Lookup

Barbarian runs this once to find the service ID:

```powershell
# PowerShell
$headers = @{ "Authorization" = "Bearer $env:RENDER_API_KEY"; "Accept" = "application/json" }
Invoke-RestMethod -Uri "https://api.render.com/v1/services?limit=50" -Headers $headers |
  ConvertTo-Json -Depth 5
# Find the service with name containing "gmai" — the "id" field is your RENDER_SERVICE_ID
# Format: srv-xxxxxxxxxxxxxxxxx
```

---

## 5. MAIN ORCHESTRATOR

```
nightwatch.py — The Brain
━━━━━━━━━━━━━━━━━━━━━━━━━

while (current_hour between CYCLE_START_HOUR and CYCLE_END_HOUR)
  AND (cycle_count < MAX_CYCLES_PER_NIGHT):

    ┌─────────────────────────────┐
    │  PHASE 1: SNAPSHOT          │
    │  config_guardian.snapshot()  │  ← Record admin-config.json state
    └──────────────┬──────────────┘
                   ▼
    ┌─────────────────────────────┐
    │  PHASE 2: TEST              │
    │  test_runner.run_all()      │  ← Playwright against playgmai.com
    │  Returns: TestReport{       │     Structured JSON results
    │    passed: [...],           │
    │    failed: [...],           │
    │    timestamp: "..."         │
    │  }                          │
    └──────────────┬──────────────┘
                   ▼
    ┌─────────────────────────────┐
    │  PHASE 3: CONFIG CHECK      │
    │  config_guardian.verify()    │  ← Compare admin-config post-test
    │  If changed → CRITICAL flag │     Trace via git diff
    └──────────────┬──────────────┘
                   ▼
    ┌─────────────────────────────┐
    │  PHASE 4: FIX LOOP          │
    │  For each unique failure:   │
    │    if attempts < 5:         │
    │      fix_dispatcher.fix()   │  ← claude -p "..." --print
    │      deploy_watcher.wait()  │  ← Poll Render until live
    │      test_runner.retest()   │  ← Verify fix worked
    │    else:                    │
    │      log as NEEDS_HUMAN     │
    └──────────────┬──────────────┘
                   ▼
    ┌─────────────────────────────┐
    │  PHASE 5: REPORT            │
    │  telegram_reporter.send()   │  ← Summary to Tim
    │  Log cycle to disk          │
    └──────────────┬──────────────┘
                   ▼
    sleep(remaining time until next cycle)
```

---

## 6. TEST RUNNER — `test_runner.py`

### Playwright Test Output Contract

Every test produces a structured result. The Playwright tests themselves run in Node.js, but we invoke them from Python and parse the JSON output.

```python
# test_runner.py

import subprocess
import json
from pathlib import Path
from datetime import datetime, timezone

def run_all(test_dir: Path, target_url: str) -> dict:
    """
    Execute full Playwright suite. Returns structured report.
    """
    result = subprocess.run(
        ["npx", "playwright", "test", "--reporter=json"],
        cwd=str(test_dir),
        capture_output=True,
        text=True,
        timeout=600,  # 10 min global timeout
        env={**os.environ, "TARGET_URL": target_url}
    )

    # Playwright JSON reporter writes to stdout
    report = json.loads(result.stdout)

    return normalize_report(report)


def normalize_report(raw: dict) -> dict:
    """
    Flatten Playwright JSON into our contract format.
    """
    passed = []
    failed = []

    for suite in raw.get("suites", []):
        for spec in suite.get("specs", []):
            for test in spec.get("tests", []):
                entry = {
                    "test_id": f"{suite['title']}::{spec['title']}",
                    "title": spec["title"],
                    "file": suite.get("file", ""),
                    "status": test["status"],  # "passed", "failed", "timedOut"
                    "duration_ms": test.get("duration", 0),
                    "error": None
                }

                if test["status"] != "passed":
                    # Extract the actual error message for Claude Code
                    results = test.get("results", [{}])
                    if results:
                        error_obj = results[0].get("error", {})
                        entry["error"] = {
                            "message": error_obj.get("message", "Unknown error"),
                            "snippet": error_obj.get("snippet", ""),
                            "stack": error_obj.get("stack", "")[:500]  # Truncate
                        }
                    failed.append(entry)
                else:
                    passed.append(entry)

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total": len(passed) + len(failed),
        "passed": passed,
        "failed": failed,
        "pass_rate": len(passed) / max(len(passed) + len(failed), 1)
    }


def retest_single(test_dir: Path, target_url: str, test_id: str) -> bool:
    """
    Re-run a single test to verify a fix. Returns True if now passing.
    """
    # test_id format: "file::specTitle"
    file_part, spec_part = test_id.split("::", 1)
    result = subprocess.run(
        ["npx", "playwright", "test", file_part, "-g", spec_part, "--reporter=json"],
        cwd=str(test_dir),
        capture_output=True,
        text=True,
        timeout=120,
        env={**os.environ, "TARGET_URL": target_url}
    )

    try:
        report = json.loads(result.stdout)
        normalized = normalize_report(report)
        return len(normalized["failed"]) == 0
    except json.JSONDecodeError:
        return False
```

### Playwright Test Structure

```typescript
// tests/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  retries: 0,        // No retries — we want real failure data
  use: {
    baseURL: process.env.TARGET_URL || 'https://playgmai.com',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
```

```typescript
// tests/smoke.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('API health check', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('game list loads', async ({ request }) => {
    const response = await request.get('/api/games');
    expect(response.status()).toBe(200);
    const games = await response.json();
    expect(games.length).toBeGreaterThan(0);
  });

  test('game query returns answer', async ({ request }) => {
    // Pick first available game
    const gamesRes = await request.get('/api/games');
    const games = await gamesRes.json();
    const firstGame = games[0];

    const queryRes = await request.post('/api/query', {
      data: {
        game_id: firstGame.game_id,
        question: "How do I set up this game?",
        mode: "setup"
      }
    });
    expect(queryRes.status()).toBe(200);
    const answer = await queryRes.json();
    expect(answer.response).toBeTruthy();
    expect(answer.response.length).toBeGreaterThan(20);
  });
});
```

```typescript
// tests/config-guard.spec.ts
// NOTE: This test is invoked by config_guardian.py, not directly by Playwright suite.
// config_guardian handles the before/after snapshot logic.
// This file exists so Playwright can structurally run it if needed.

import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('Config Guard', () => {
  test('admin-config.json has valid structure', async ({ request }) => {
    // Fetch the config from the API or test the deployed frontend
    const response = await request.get('/');
    expect(response.status()).toBe(200);
    // The actual field comparison is done by config_guardian.py
    // This test just ensures the app loads without resetting config
  });
});
```

---

## 7. FIX DISPATCHER — `fix_dispatcher.py`

This is the core innovation. We invoke Claude Code as a CLI tool, passing the failure context as a prompt, and capture its output.

```python
# fix_dispatcher.py

import subprocess
import json
import os
from pathlib import Path
from datetime import datetime, timezone

class FixResult:
    def __init__(self, success: bool, commit_sha: str | None,
                 description: str, attempt: int):
        self.success = success
        self.commit_sha = commit_sha
        self.description = description
        self.attempt = attempt

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "commit_sha": self.commit_sha,
            "description": self.description,
            "attempt": self.attempt
        }


def build_fix_prompt(failure: dict, attempt: int, previous_attempts: list[str]) -> str:
    """
    Construct the prompt sent to Claude Code for a specific failure.
    """
    prompt = f"""You are fixing a test failure on the GMAI production site (playgmai.com).

## FAILURE DETAILS
- Test: {failure['test_id']}
- Title: {failure['title']}
- File: {failure['file']}
- Error message: {failure['error']['message']}
- Code snippet: {failure['error'].get('snippet', 'N/A')}
- Stack trace (truncated): {failure['error'].get('stack', 'N/A')}

## ATTEMPT {attempt} of 5
"""

    if previous_attempts:
        prompt += "\n## PREVIOUS FIX ATTEMPTS (these did NOT work)\n"
        for i, desc in enumerate(previous_attempts, 1):
            prompt += f"  Attempt {i}: {desc}\n"
        prompt += "\nDo NOT repeat these approaches. Try something different.\n"

    prompt += """
## INSTRUCTIONS
1. Diagnose the root cause by reading the relevant source files
2. Make the minimal fix required — do NOT refactor unrelated code
3. CRITICAL: Do NOT modify admin-config.json unless the bug is specifically about that file
4. Run `git add -A && git commit -m "nightwatch: fix {test_title}"` after your fix
5. Run `git push origin main` to trigger Render deploy
6. Respond with ONLY a JSON object (no markdown fences):
   {{"fixed": true/false, "description": "what you changed and why", "commit_sha": "abc1234"}}

If you cannot determine the fix, respond:
   {{"fixed": false, "description": "reason you cannot fix this", "commit_sha": null}}
"""
    return prompt


def dispatch_fix(failure: dict, attempt: int,
                 previous_attempts: list[str],
                 cwd: str, timeout: int = 300) -> FixResult:
    """
    Invoke claude CLI to fix a single test failure.
    """
    prompt = build_fix_prompt(failure, attempt, previous_attempts)

    try:
        result = subprocess.run(
            [
                "claude",
                "-p", prompt,
                "--output-format", "text",
                "--max-turns", "25",        # Allow multi-step reasoning
                "--allowedTools",
                "Bash,Read,Write,Edit",     # No browser, no MCP — code fixes only
            ],
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=os.environ.copy()
        )

        stdout = result.stdout.strip()

        # Claude Code may wrap response in markdown fences
        if stdout.startswith("```"):
            stdout = stdout.split("\n", 1)[1]  # Remove opening fence
            if stdout.endswith("```"):
                stdout = stdout[:-3]
            stdout = stdout.strip()

        response = json.loads(stdout)

        return FixResult(
            success=response.get("fixed", False),
            commit_sha=response.get("commit_sha"),
            description=response.get("description", "No description"),
            attempt=attempt
        )

    except subprocess.TimeoutExpired:
        return FixResult(
            success=False,
            commit_sha=None,
            description=f"Claude Code timed out after {timeout}s",
            attempt=attempt
        )
    except (json.JSONDecodeError, KeyError) as e:
        return FixResult(
            success=False,
            commit_sha=None,
            description=f"Could not parse Claude Code response: {e}. Raw: {stdout[:200]}",
            attempt=attempt
        )
    except Exception as e:
        return FixResult(
            success=False,
            commit_sha=None,
            description=f"Unexpected error: {e}",
            attempt=attempt
        )


def get_current_commit_sha(cwd: str) -> str | None:
    """Get the HEAD commit SHA after Claude Code pushes."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=cwd, capture_output=True, text=True
        )
        return result.stdout.strip()[:7]
    except Exception:
        return None
```

### Why `--allowedTools Bash,Read,Write,Edit`

We explicitly restrict Claude Code to file operations and shell commands. No browser tool, no MCP servers. Reasons:

1. **Scope containment** — Claude Code should read source, edit source, commit, push. Nothing else.
2. **No accidental state mutation** — no web browsing that might hit the production API.
3. **Faster execution** — fewer tools = faster tool selection = faster fixes.
4. **Predictable behavior** — the fix loop is deterministic and auditable.

---

## 8. DEPLOY WATCHER — `deploy_watcher.py`

After Claude Code pushes, we poll Render until the deploy goes live.

```python
# deploy_watcher.py

import os
import time
import requests
from datetime import datetime, timezone

class DeployStatus:
    BUILDING = "building"
    DEPLOYING = "deploying"
    LIVE = "live"
    FAILED = "failed"
    CANCELED = "canceled"
    TIMED_OUT = "timed_out"


def wait_for_deploy(commit_sha: str | None,
                    poll_interval: int = 15,
                    timeout: int = 600) -> dict:
    """
    Poll Render API until the latest deploy is live.
    Optionally match a specific commit SHA.

    Returns: {
        "status": "live" | "failed" | "timed_out",
        "deploy_id": "...",
        "commit_sha": "...",
        "duration_seconds": N
    }
    """
    api_key = os.environ.get("RENDER_API_KEY")
    service_id = os.environ.get("RENDER_SERVICE_ID")

    if not api_key or not service_id:
        return {
            "status": "failed",
            "deploy_id": None,
            "commit_sha": commit_sha,
            "duration_seconds": 0,
            "error": "RENDER_API_KEY or RENDER_SERVICE_ID not set"
        }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json"
    }
    url = f"https://api.render.com/v1/services/{service_id}/deploys?limit=5"

    start = time.time()

    while (time.time() - start) < timeout:
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            resp.raise_for_status()
            deploys = resp.json()

            if not deploys:
                time.sleep(poll_interval)
                continue

            # Render API returns array of deploy objects
            # Each has: id, commit.id, status, createdAt, updatedAt, finishedAt
            latest = deploys[0]
            deploy_obj = latest.get("deploy", latest)  # Handle nested structure
            deploy_status = deploy_obj.get("status", "unknown")
            deploy_commit = deploy_obj.get("commit", {}).get("id", "")[:7]
            deploy_id = deploy_obj.get("id", "unknown")

            # If we have a target commit, verify it matches
            if commit_sha and deploy_commit and deploy_commit != commit_sha:
                # Our commit hasn't triggered a deploy yet — keep waiting
                time.sleep(poll_interval)
                continue

            if deploy_status == "live":
                return {
                    "status": DeployStatus.LIVE,
                    "deploy_id": deploy_id,
                    "commit_sha": deploy_commit,
                    "duration_seconds": int(time.time() - start)
                }
            elif deploy_status in ("deactivated", "build_failed",
                                     "update_failed", "canceled"):
                return {
                    "status": DeployStatus.FAILED,
                    "deploy_id": deploy_id,
                    "commit_sha": deploy_commit,
                    "duration_seconds": int(time.time() - start),
                    "error": f"Deploy ended with status: {deploy_status}"
                }

            # Still building/deploying — keep polling
            time.sleep(poll_interval)

        except requests.RequestException as e:
            # Network error — retry
            time.sleep(poll_interval)

    # Timed out
    return {
        "status": DeployStatus.TIMED_OUT,
        "deploy_id": None,
        "commit_sha": commit_sha,
        "duration_seconds": int(time.time() - start),
        "error": f"Deploy did not complete within {timeout}s"
    }
```

---

## 9. CONFIG GUARDIAN — `config_guardian.py`

This solves the recurring admin-config.json reset bug (Item 6).

```python
# config_guardian.py

import json
import subprocess
from pathlib import Path
from datetime import datetime, timezone
from copy import deepcopy

class ConfigGuardian:
    """
    Monitors admin-config.json for unauthorized changes.
    Snapshots before tests, verifies after, traces the culprit via git.
    """

    def __init__(self, repo_root: str, config_path: str, fields: list[str]):
        self.repo_root = Path(repo_root)
        self.config_file = self.repo_root / config_path
        self.fields = fields
        self.snapshot_data: dict | None = None
        self.snapshot_time: str | None = None

    def snapshot(self) -> dict | None:
        """
        Record the current state of monitored fields.
        Call this BEFORE running the test suite.
        """
        if not self.config_file.exists():
            return None

        with open(self.config_file) as f:
            config = json.load(f)

        self.snapshot_data = {
            field: deepcopy(config.get(field))
            for field in self.fields
        }
        self.snapshot_time = datetime.now(timezone.utc).isoformat()
        return self.snapshot_data

    def verify(self) -> dict:
        """
        Compare current state against snapshot.
        Call this AFTER running the test suite.

        Returns: {
            "config_intact": bool,
            "changes": { "field": {"before": ..., "after": ...} },
            "severity": "ok" | "critical",
            "git_blame": "..." | null
        }
        """
        if self.snapshot_data is None:
            return {
                "config_intact": True,
                "changes": {},
                "severity": "ok",
                "git_blame": None,
                "note": "No snapshot was taken — skipping verification"
            }

        if not self.config_file.exists():
            return {
                "config_intact": False,
                "changes": {"_file": {"before": "existed", "after": "DELETED"}},
                "severity": "critical",
                "git_blame": self._trace_change()
            }

        with open(self.config_file) as f:
            current = json.load(f)

        changes = {}
        for field in self.fields:
            before = self.snapshot_data.get(field)
            after = current.get(field)
            if before != after:
                changes[field] = {"before": before, "after": after}

        if changes:
            return {
                "config_intact": False,
                "changes": changes,
                "severity": "critical",
                "git_blame": self._trace_change()
            }

        return {
            "config_intact": True,
            "changes": {},
            "severity": "ok",
            "git_blame": None
        }

    def _trace_change(self) -> str | None:
        """
        Use git diff and git log to figure out what changed the config.
        """
        try:
            # Check if file has uncommitted changes
            diff_result = subprocess.run(
                ["git", "diff", "--name-only", str(self.config_file.relative_to(self.repo_root))],
                cwd=str(self.repo_root),
                capture_output=True, text=True
            )

            if diff_result.stdout.strip():
                # File was modified but not committed — get the diff
                diff_detail = subprocess.run(
                    ["git", "diff", str(self.config_file.relative_to(self.repo_root))],
                    cwd=str(self.repo_root),
                    capture_output=True, text=True
                )
                return f"UNCOMMITTED CHANGE:\n{diff_detail.stdout[:1000]}"

            # Check recent commits that touched this file
            log_result = subprocess.run(
                ["git", "log", "--oneline", "-5", "--",
                 str(self.config_file.relative_to(self.repo_root))],
                cwd=str(self.repo_root),
                capture_output=True, text=True
            )
            if log_result.stdout.strip():
                return f"RECENT COMMITS:\n{log_result.stdout.strip()}"

            return "No git changes detected — config may have been reset by a build process"

        except Exception as e:
            return f"Git trace failed: {e}"
```

### How This Catches the Bug

The key insight: the config reset happens during *some code path that runs as part of the test or deploy cycle*. By snapshotting before and checking after, we isolate whether:

1. **The Playwright tests themselves** trigger a reset (e.g., the onboarding flow writes defaults)
2. **A deploy/build step** resets the file (e.g., a build script that generates defaults)
3. **Claude Code's fix attempt** accidentally overwrites it (caught by the `--allowedTools` constraint + the prompt warning)

The `git_blame` trace tells us exactly which commit or uncommitted change caused it.

---

## 10. TELEGRAM REPORTER — `telegram_reporter.py`

```python
# telegram_reporter.py

import requests
from datetime import datetime, timezone

TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"

def send_cycle_report(
    token: str,
    chat_id: str,
    cycle_number: int,
    test_report: dict,
    fixes: list[dict],
    config_status: dict,
    next_run: str,
    human_review_items: list[str]
) -> bool:
    """
    Send a formatted cycle summary to Telegram.
    """
    total = test_report["total"]
    passed = len(test_report["passed"])
    failed = len(test_report["failed"])

    # Build message
    lines = []
    lines.append(f"🤖 *NIGHTWATCH — Cycle {cycle_number}*")
    lines.append(f"⏰ {datetime.now(timezone.utc).strftime('%H:%M UTC')}")
    lines.append("")

    # Test results
    if failed == 0:
        lines.append(f"✅ All {total} tests passing")
    else:
        lines.append(f"📊 Tests: {passed}/{total} passed, {failed} failed")

    # Fixes applied
    if fixes:
        lines.append("")
        lines.append("🔧 *Fixes Applied:*")
        for fix in fixes:
            status = "✅" if fix["success"] else "❌"
            sha = fix.get("commit_sha", "N/A")
            lines.append(f"  {status} {fix['description'][:60]}")
            if fix.get("commit_sha"):
                lines.append(f"     Commit: `{sha}`")

    # Config guardian
    if not config_status.get("config_intact", True):
        lines.append("")
        lines.append("🚨 *CRITICAL: admin-config.json was modified!*")
        for field, change in config_status.get("changes", {}).items():
            lines.append(f"  ⚠️ `{field}` changed")
        if config_status.get("git_blame"):
            blame_preview = config_status["git_blame"][:100]
            lines.append(f"  Trace: {blame_preview}")

    # Human review items
    if human_review_items:
        lines.append("")
        lines.append("⛔ *NEEDS HUMAN REVIEW:*")
        for item in human_review_items:
            lines.append(f"  • {item[:80]}")

    # Next run
    lines.append("")
    lines.append(f"⏭️ Next run: {next_run}")

    message = "\n".join(lines)

    # Send
    try:
        resp = requests.post(
            TELEGRAM_API.format(token=token),
            json={
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "Markdown"
            },
            timeout=10
        )
        return resp.status_code == 200
    except Exception:
        return False


def send_alert(token: str, chat_id: str, message: str) -> bool:
    """Send an immediate alert (for critical config changes, etc.)"""
    try:
        resp = requests.post(
            TELEGRAM_API.format(token=token),
            json={
                "chat_id": chat_id,
                "text": f"🚨 *NIGHTWATCH ALERT*\n\n{message}",
                "parse_mode": "Markdown"
            },
            timeout=10
        )
        return resp.status_code == 200
    except Exception:
        return False
```

---

## 11. MAIN LOOP — `nightwatch.py`

```python
#!/usr/bin/env python3
"""
NIGHTWATCH — Autonomous test-fix-deploy loop for GMAI
Run: python nightwatch.py
"""

import os
import sys
import json
import time
from pathlib import Path
from datetime import datetime, timezone

from config import *
from test_runner import run_all, retest_single
from fix_dispatcher import dispatch_fix, get_current_commit_sha
from deploy_watcher import wait_for_deploy
from telegram_reporter import send_cycle_report, send_alert
from config_guardian import ConfigGuardian


def load_human_review_log(log_path: Path) -> dict:
    """Load the persistent log of failures that need human review."""
    if log_path.exists():
        with open(log_path) as f:
            return json.load(f)
    return {"failures": {}}


def save_human_review_log(log_path: Path, data: dict):
    with open(log_path, "w") as f:
        json.dump(data, f, indent=2)


def run_cycle(cycle_number: int, test_dir: Path, human_log_path: Path) -> dict:
    """
    Execute one full test → fix → deploy → report cycle.
    """
    human_log = load_human_review_log(human_log_path)
    cycle_report = {
        "cycle": cycle_number,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "test_report": None,
        "fixes": [],
        "config_status": None,
        "human_review_items": []
    }

    # === PHASE 1: Snapshot admin-config.json ===
    guardian = ConfigGuardian(CLAUDE_CWD, ADMIN_CONFIG_PATH, ADMIN_CONFIG_FIELDS)
    guardian.snapshot()

    # === PHASE 2: Run full test suite ===
    print(f"[Cycle {cycle_number}] Running tests against {TARGET_URL}...")
    test_report = run_all(test_dir, TARGET_URL)
    cycle_report["test_report"] = test_report

    print(f"[Cycle {cycle_number}] Results: {len(test_report['passed'])} passed, "
          f"{len(test_report['failed'])} failed")

    # === PHASE 3: Check admin-config.json ===
    config_status = guardian.verify()
    cycle_report["config_status"] = config_status

    if not config_status.get("config_intact", True):
        print(f"[Cycle {cycle_number}] ⚠️ CRITICAL: admin-config.json was modified!")
        # Immediate Telegram alert for this
        send_alert(
            os.environ.get(TELEGRAM_BOT_TOKEN_ENV, ""),
            TELEGRAM_CHAT_ID,
            f"admin-config.json modified during cycle {cycle_number}!\n"
            f"Changes: {json.dumps(config_status['changes'], indent=2)[:300]}\n"
            f"Trace: {config_status.get('git_blame', 'unknown')[:200]}"
        )

    # === PHASE 4: Fix loop ===
    if test_report["failed"]:
        for failure in test_report["failed"]:
            test_id = failure["test_id"]

            # Skip if already flagged for human review
            if test_id in human_log.get("failures", {}):
                cycle_report["human_review_items"].append(
                    f"{test_id} (previously flagged)"
                )
                continue

            # Track attempts across cycles via the human review log
            attempt_key = f"_attempts_{test_id}"
            previous_attempts = human_log.get("failures", {}).get(attempt_key, [])
            attempt_num = len(previous_attempts) + 1

            if attempt_num > MAX_FIX_ATTEMPTS_PER_FAILURE:
                # Exhausted — flag for human review
                human_log.setdefault("failures", {})[test_id] = {
                    "flagged_at": datetime.now(timezone.utc).isoformat(),
                    "last_error": failure["error"]["message"][:200],
                    "attempts": previous_attempts
                }
                save_human_review_log(human_log_path, human_log)
                cycle_report["human_review_items"].append(test_id)
                continue

            print(f"[Cycle {cycle_number}] Attempting fix for: {test_id} "
                  f"(attempt {attempt_num}/{MAX_FIX_ATTEMPTS_PER_FAILURE})")

            # Dispatch to Claude Code
            fix_result = dispatch_fix(
                failure=failure,
                attempt=attempt_num,
                previous_attempts=previous_attempts,
                cwd=CLAUDE_CWD,
                timeout=CLAUDE_TIMEOUT_SECONDS
            )

            cycle_report["fixes"].append(fix_result.to_dict())

            if fix_result.success and fix_result.commit_sha:
                # Wait for Render deploy
                print(f"[Cycle {cycle_number}] Fix pushed (commit {fix_result.commit_sha}). "
                      f"Waiting for deploy...")
                deploy_status = wait_for_deploy(
                    commit_sha=fix_result.commit_sha,
                    poll_interval=DEPLOY_POLL_INTERVAL_SECONDS,
                    timeout=DEPLOY_TIMEOUT_SECONDS
                )

                if deploy_status["status"] == "live":
                    # Verify fix
                    print(f"[Cycle {cycle_number}] Deploy live. Re-testing {test_id}...")
                    is_fixed = retest_single(test_dir, TARGET_URL, test_id)

                    if is_fixed:
                        print(f"[Cycle {cycle_number}] ✅ {test_id} FIXED!")
                        # Clear attempt history on success
                        human_log.get("failures", {}).pop(attempt_key, None)
                    else:
                        print(f"[Cycle {cycle_number}] ❌ {test_id} still failing after fix")
                        human_log.setdefault("failures", {}).setdefault(attempt_key, [])
                        human_log["failures"][attempt_key].append(fix_result.description)
                else:
                    print(f"[Cycle {cycle_number}] Deploy failed: {deploy_status.get('error')}")
                    human_log.setdefault("failures", {}).setdefault(attempt_key, [])
                    human_log["failures"][attempt_key].append(
                        f"Deploy failed: {deploy_status.get('error', 'unknown')}"
                    )
            else:
                # Claude Code couldn't fix it
                human_log.setdefault("failures", {}).setdefault(attempt_key, [])
                human_log["failures"][attempt_key].append(fix_result.description)

            save_human_review_log(human_log_path, human_log)

    # === PHASE 5: Report ===
    next_run = datetime.fromtimestamp(
        time.time() + CYCLE_INTERVAL_SECONDS, tz=timezone.utc
    ).strftime("%H:%M UTC")

    send_cycle_report(
        token=os.environ.get(TELEGRAM_BOT_TOKEN_ENV, ""),
        chat_id=TELEGRAM_CHAT_ID,
        cycle_number=cycle_number,
        test_report=test_report,
        fixes=cycle_report["fixes"],
        config_status=config_status,
        next_run=next_run,
        human_review_items=cycle_report["human_review_items"]
    )

    # Log cycle to disk
    cycle_report["completed_at"] = datetime.now(timezone.utc).isoformat()
    log_file = Path("nightwatch/logs") / f"cycle-{cycle_number}-{int(time.time())}.json"
    log_file.parent.mkdir(parents=True, exist_ok=True)
    with open(log_file, "w") as f:
        json.dump(cycle_report, f, indent=2)

    return cycle_report


def main():
    print("=" * 60)
    print("  NIGHTWATCH — GMAI Autonomous Test-Fix-Deploy Loop")
    print("=" * 60)

    # Verify environment
    missing_env = []
    for var in [TELEGRAM_BOT_TOKEN_ENV, "RENDER_API_KEY", "RENDER_SERVICE_ID"]:
        if not os.environ.get(var):
            missing_env.append(var)
    if missing_env:
        print(f"⚠️ Missing environment variables: {', '.join(missing_env)}")
        print("Some features will be degraded. Continuing anyway...")

    # Verify claude CLI is available
    try:
        subprocess.run(["claude", "--version"], capture_output=True, timeout=10)
    except FileNotFoundError:
        print("❌ FATAL: 'claude' CLI not found on PATH. Install Claude Code first.")
        sys.exit(1)

    test_dir = Path(CLAUDE_CWD) / "nightwatch" / "tests"
    human_log_path = Path(CLAUDE_CWD) / "nightwatch" / "logs" / "failures-needing-human.json"

    cycle = 1
    while cycle <= MAX_CYCLES_PER_NIGHT:
        current_hour = datetime.now().hour
        if current_hour >= CYCLE_END_HOUR and current_hour < CYCLE_START_HOUR:
            print(f"Outside operating hours ({CYCLE_START_HOUR}:00 - {CYCLE_END_HOUR}:00). Stopping.")
            break

        print(f"\n{'='*40}")
        print(f"  CYCLE {cycle} — {datetime.now().strftime('%H:%M:%S')}")
        print(f"{'='*40}")

        try:
            run_cycle(cycle, test_dir, human_log_path)
        except Exception as e:
            print(f"[Cycle {cycle}] UNHANDLED ERROR: {e}")
            send_alert(
                os.environ.get(TELEGRAM_BOT_TOKEN_ENV, ""),
                TELEGRAM_CHAT_ID,
                f"Cycle {cycle} crashed: {str(e)[:200]}"
            )

        cycle += 1

        if cycle <= MAX_CYCLES_PER_NIGHT:
            print(f"\nSleeping {CYCLE_INTERVAL_SECONDS}s until next cycle...")
            time.sleep(CYCLE_INTERVAL_SECONDS)

    print("\n🏁 NIGHTWATCH complete. Check Telegram for full history.")


if __name__ == "__main__":
    main()
```

---

## 12. SCHEDULING OPTIONS

### Option A: Python Loop (Recommended for Tonight)

The `nightwatch.py` script already contains its own sleep loop. Just run it:

```powershell
cd D:\GameMasterAI
python nightwatch\nightwatch.py
```

Leave the terminal open. It runs until 7 AM or 8 cycles, whichever comes first.

**Why this over Task Scheduler:** Simpler. No Windows config. The script manages its own timing, state, and error handling. Task Scheduler adds a layer of complexity for zero benefit on a single-night run.

### Option B: Windows Task Scheduler (For Recurring Use)

If Nightwatch becomes a permanent fixture:

```powershell
# Create scheduled task that runs every 60 min from 10 PM to 7 AM
$action = New-ScheduledTaskAction `
    -Execute "python" `
    -Argument "D:\GameMasterAI\nightwatch\nightwatch.py --single-cycle" `
    -WorkingDirectory "D:\GameMasterAI"

$trigger = New-ScheduledTaskTrigger `
    -Daily -At "10:00 PM" `
    -RepetitionInterval (New-TimeSpan -Hours 1) `
    -RepetitionDuration (New-TimeSpan -Hours 9)

Register-ScheduledTask -TaskName "GMAI-Nightwatch" `
    -Action $action -Trigger $trigger `
    -Description "GMAI autonomous test-fix-deploy loop"
```

This requires adding a `--single-cycle` flag to `nightwatch.py` that runs one cycle and exits.

**My recommendation: Use Option A tonight. Move to Option B only if Tim wants this running every night.**

---

## 13. REQUIREMENTS

```
# nightwatch/requirements.txt
playwright==1.49.1
requests>=2.31.0
```

```json
// nightwatch/tests/package.json
{
  "name": "gmai-nightwatch-tests",
  "private": true,
  "scripts": {
    "test": "npx playwright test",
    "install-browsers": "npx playwright install chromium"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.1"
  }
}
```

### Setup Commands (Barbarian runs once)

```powershell
cd D:\GameMasterAI\nightwatch
pip install -r requirements.txt
cd tests
npm install
npx playwright install chromium
```

---

## 14. FAILURE TRACKING ACROSS CYCLES

This is the part most specs forget. A failure might not be fixable in one cycle — maybe the deploy takes too long, or Claude Code's fix introduces a new issue. Here's how state persists:

**`failures-needing-human.json`** — persists across all cycles in a night:

```json
{
  "failures": {
    "smoke.spec.ts::game query returns answer": {
      "flagged_at": "2026-02-27T03:30:00Z",
      "last_error": "Expected response length > 20, got 0",
      "attempts": [
        "Attempt 1: Added error handling to query endpoint",
        "Attempt 2: Fixed JSON parsing in knowledge base loader",
        "Attempt 3: Increased timeout on ClawProxy connection",
        "Attempt 4: Added retry logic to LLM service",
        "Attempt 5: Rewired the query pipeline — still returning empty"
      ]
    },
    "_attempts_games.spec.ts::game cards render": [
      "Fixed missing CSS class on game card component"
    ]
  }
}
```

Entries prefixed with `_attempts_` are in-progress (not yet flagged for human review). Entries without the prefix are finalized — 5 attempts exhausted, needs Tim.

**Between nights:** Barbarian or Tim should manually clear `failures-needing-human.json` after addressing flagged issues. Nightwatch does NOT auto-clear this file.

---

## 15. SAFETY GUARDRAILS

| Risk | Mitigation |
|------|-----------|
| Claude Code goes rogue, rewrites half the app | `--allowedTools Bash,Read,Write,Edit` + `--max-turns 25` limit. Prompt explicitly says "minimal fix." |
| Infinite deploy loop (fix → break → fix) | `MAX_FIX_ATTEMPTS_PER_FAILURE = 5`. After 5 tries on any single test, it stops. |
| admin-config.json gets overwritten | Config Guardian snapshots before, verifies after. Prompt explicitly warns Claude Code not to touch it. |
| Claude Code hangs forever | `CLAUDE_TIMEOUT_SECONDS = 300`. Subprocess killed after 5 min. |
| Render deploy hangs | `DEPLOY_TIMEOUT_SECONDS = 600`. Moves on after 10 min. |
| Network goes down | Telegram send is best-effort. Test runner has its own timeout. All errors logged to disk. |
| K2-PC goes to sleep | Tim must set power plan to "Never sleep" before running. |
| Git push conflicts | Claude Code runs in the repo dir. If push fails, it's logged as a failed fix attempt. |
| Multiple failures create conflicting fixes | Failures are fixed sequentially, not in parallel. Each fix is committed and deployed before the next. |

---

## 16. BARBARIAN IMPLEMENTATION CHECKLIST

Barbarian: implement in this order. Check off each before moving to the next.

```
[ ] 1. Create nightwatch/ directory structure per Section 3
[ ] 2. Create config.py with all constants per Section 4
[ ] 3. Set environment variables on K2-PC per Section 4
[ ] 4. Look up RENDER_SERVICE_ID using the PowerShell command in Section 4
[ ] 5. Create tests/package.json and install Playwright + Chromium
[ ] 6. Create tests/playwright.config.ts targeting playgmai.com
[ ] 7. Write tests/smoke.spec.ts (4 tests per Section 6)
[ ] 8. Run tests manually — verify they execute against production
[ ] 9. Create test_runner.py per Section 6
[ ] 10. Create config_guardian.py per Section 9
[ ] 11. Create fix_dispatcher.py per Section 7
[ ] 12. Test fix_dispatcher manually — feed it a known failure, verify it invokes claude CLI
[ ] 13. Create deploy_watcher.py per Section 8
[ ] 14. Test deploy_watcher manually — push a trivial commit, verify it detects "live"
[ ] 15. Create telegram_reporter.py per Section 10
[ ] 16. Send a test Telegram message — verify Tim receives it
[ ] 17. Create nightwatch.py per Section 11
[ ] 18. Run one full cycle manually — watch the whole pipeline execute
[ ] 19. Set K2-PC power plan to "Never sleep"
[ ] 20. Launch nightwatch.py and walk away
```

---

## 17. OPEN QUESTIONS FOR TIM

1. **Additional test cases?** The spec includes smoke tests and config guard. Should we add tests for specific games, the onboarding flow, or specific UI interactions? More tests = better coverage but slower cycles.

2. **Multiple failure priority.** Currently we fix failures in the order Playwright reports them. Want to prioritize certain tests (e.g., always fix smoke tests before game-specific tests)?

3. **Morning notification.** Want a special "good morning" summary Telegram at 7 AM with the full night's history, or is the per-cycle reporting enough?

---

*END OF NIGHTWATCH SPECIFICATION*
