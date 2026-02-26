# nightwatch/nightwatch.py
"""Main Nightwatch orchestration loop."""

import json
import os
import subprocess
import sys
import time
from datetime import datetime

from config import (
    CYCLE_INTERVAL_SECONDS,
    MAX_CYCLES_PER_NIGHT,
    CYCLE_START_HOUR,
    CYCLE_END_HOUR,
    TARGET_URL,
    CLAUDE_CLI,
    CLAUDE_CWD,
    MAX_FIX_ATTEMPTS_PER_FAILURE,
    RENDER_API_KEY_ENV,
    RENDER_SERVICE_ID_ENV,
    TELEGRAM_BOT_TOKEN_ENV,
    ADMIN_CONFIG_PATH,
    ADMIN_CONFIG_FIELDS,
)
from config_guardian import ConfigGuardian
from test_runner import run_all, retest_single
from fix_dispatcher import dispatch_fix
from deploy_watcher import wait_for_deploy
from telegram_reporter import send_cycle_report, send_alert


LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")


def _within_operating_hours() -> bool:
    """Check if current hour is within the operating window."""
    hour = datetime.now().hour
    if CYCLE_START_HOUR > CYCLE_END_HOUR:
        # Overnight window (e.g., 22-7)
        return hour >= CYCLE_START_HOUR or hour < CYCLE_END_HOUR
    else:
        return CYCLE_START_HOUR <= hour < CYCLE_END_HOUR


def _verify_claude_cli() -> bool:
    """Verify that the Claude CLI is available."""
    try:
        result = subprocess.run(
            [CLAUDE_CLI, "--version"],
            capture_output=True,
            text=True,
            timeout=10,
            shell=True,
        )
        print(f"[nightwatch] Claude CLI: {result.stdout.strip()}")
        return True
    except Exception as e:
        print(f"[nightwatch] WARNING: Claude CLI not available: {e}")
        return False


def _check_env_vars():
    """Check for required env vars. Warn if missing but continue."""
    for var in [RENDER_API_KEY_ENV, RENDER_SERVICE_ID_ENV, TELEGRAM_BOT_TOKEN_ENV]:
        if not os.environ.get(var):
            print(f"[nightwatch] WARNING: {var} not set")


def _log_cycle(cycle: int, data: dict):
    """Write cycle report to log file."""
    os.makedirs(LOG_DIR, exist_ok=True)
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    log_file = os.path.join(LOG_DIR, f"cycle_{cycle}_{timestamp}.json")
    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"[nightwatch] Cycle {cycle} logged to {log_file}")


def main():
    print("[nightwatch] Starting Nightwatch orchestrator")
    print(f"[nightwatch] Target: {TARGET_URL}")
    print(f"[nightwatch] Operating hours: {CYCLE_START_HOUR}:00 - {CYCLE_END_HOUR}:00")

    # Startup checks
    claude_available = _verify_claude_cli()
    _check_env_vars()

    guardian = ConfigGuardian(CLAUDE_CWD, ADMIN_CONFIG_PATH, ADMIN_CONFIG_FIELDS)
    test_dir = os.path.join(os.path.dirname(__file__), "tests")

    cycle = 1

    while cycle <= MAX_CYCLES_PER_NIGHT:
        if not _within_operating_hours():
            print(f"[nightwatch] Outside operating hours. Exiting.")
            break

        print(f"\n{'='*60}")
        print(f"[nightwatch] === CYCLE {cycle} === {time.strftime('%H:%M:%S')}")
        print(f"{'='*60}")

        human_review = []
        fixes_applied = []

        # Phase 1: Config snapshot
        print("[nightwatch] Phase 1: Config snapshot")
        config_snapshot = guardian.snapshot()
        print(f"[nightwatch] Snapshot: {config_snapshot}")

        # Phase 2: Run all tests
        print("[nightwatch] Phase 2: Running smoke tests")
        test_report = run_all(test_dir, TARGET_URL)
        print(f"[nightwatch] Results: {test_report['passed']}/{test_report['total']} passed")

        # Phase 3: Verify config integrity
        print("[nightwatch] Phase 3: Config verification")
        config_status = guardian.verify()
        if not config_status.get("config_intact", True):
            alert_msg = (
                f"Admin config changed during test run!\n"
                f"Changes: {json.dumps(config_status.get('changes', {}), indent=2)}\n"
                f"Trace: {config_status.get('trace', 'N/A')}"
            )
            print(f"[nightwatch] ALERT: {alert_msg}")
            send_alert(alert_msg)
            human_review.append("Config changed during cycle - investigate")

        # Phase 4: Fix failures
        if test_report.get("failures") and claude_available:
            print(f"[nightwatch] Phase 4: Fixing {len(test_report['failures'])} failure(s)")

            for failure in test_report["failures"]:
                test_id = failure.get("test_id", "unknown")
                print(f"[nightwatch] Fixing: {test_id}")

                previous_attempts = []
                fixed = False

                for attempt in range(1, MAX_FIX_ATTEMPTS_PER_FAILURE + 1):
                    fix_result = dispatch_fix(failure, attempt, previous_attempts)
                    print(f"[nightwatch]   Attempt {attempt}: {'OK' if fix_result.success else 'FAIL'} - {fix_result.description}")

                    if fix_result.success:
                        # Wait for deploy
                        print(f"[nightwatch]   Waiting for deploy...")
                        deploy_status = wait_for_deploy(fix_result.commit_sha)
                        print(f"[nightwatch]   Deploy: {deploy_status.get('status')}")

                        if deploy_status.get("status") == "live":
                            # Retest
                            print(f"[nightwatch]   Retesting: {test_id}")
                            retest = retest_single(test_dir, TARGET_URL, test_id)
                            if retest.get("passed"):
                                print(f"[nightwatch]   VERIFIED: {test_id} now passes")
                                fixed = True
                                fixes_applied.append({
                                    "test_id": test_id,
                                    "success": True,
                                    "description": fix_result.description,
                                    "attempt": attempt,
                                    "commit_sha": fix_result.commit_sha,
                                })
                                break
                            else:
                                previous_attempts.append(fix_result.description)
                                print(f"[nightwatch]   Retest FAILED, trying again...")
                        elif deploy_status.get("status") == "skipped":
                            # No Render credentials, skip deploy wait
                            previous_attempts.append(fix_result.description)
                            human_review.append(f"Deploy skipped for {test_id} - no Render credentials")
                            break
                        else:
                            previous_attempts.append(fix_result.description)
                    else:
                        previous_attempts.append(fix_result.description)

                if not fixed:
                    fixes_applied.append({
                        "test_id": test_id,
                        "success": False,
                        "description": f"Failed after {len(previous_attempts)} attempts",
                        "attempt": len(previous_attempts),
                    })
                    human_review.append(f"Could not fix: {test_id}")

        elif test_report.get("failures"):
            print("[nightwatch] Phase 4: Skipped (Claude CLI not available)")
            human_review.append("Fixes skipped - Claude CLI unavailable")

        # Phase 5: Report
        next_run = time.strftime(
            "%H:%M:%S",
            time.localtime(time.time() + CYCLE_INTERVAL_SECONDS),
        )
        print(f"[nightwatch] Phase 5: Reporting")

        cycle_data = {
            "cycle": cycle,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "test_report": test_report,
            "config_status": config_status,
            "fixes": fixes_applied,
            "human_review": human_review,
            "next_run": next_run,
        }

        _log_cycle(cycle, cycle_data)
        send_cycle_report(cycle, test_report, fixes_applied, config_status, next_run, human_review)

        cycle += 1

        if cycle <= MAX_CYCLES_PER_NIGHT:
            print(f"[nightwatch] Sleeping until {next_run}")
            time.sleep(CYCLE_INTERVAL_SECONDS)

    print("[nightwatch] Nightwatch session complete.")


if __name__ == "__main__":
    main()
