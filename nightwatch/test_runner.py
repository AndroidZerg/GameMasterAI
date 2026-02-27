# nightwatch/test_runner.py
"""Runs Playwright smoke tests and parses JSON results."""

import json
import subprocess
import time
import os
from config import TEST_TIMEOUT_SECONDS, TARGET_URL


def run_all(test_dir: str = None, target_url: str = None) -> dict:
    """Run all Playwright tests and return normalized results.

    Returns:
        dict with keys: timestamp, total, passed, failed, pass_rate, failures (list)
    """
    if test_dir is None:
        test_dir = os.path.join(os.path.dirname(__file__), "tests")
    if target_url is None:
        target_url = TARGET_URL

    env = os.environ.copy()
    env["TARGET_URL"] = target_url

    try:
        result = subprocess.run(
            ["npx", "playwright", "test", "--reporter=json"],
            cwd=test_dir,
            capture_output=True,
            text=True,
            timeout=TEST_TIMEOUT_SECONDS,
            env=env,
            shell=True,
            encoding="utf-8",
            errors="replace",
        )
    except subprocess.TimeoutExpired:
        return {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "total": 0,
            "passed": 0,
            "failed": 0,
            "pass_rate": 0.0,
            "failures": [],
            "error": "Test run timed out",
        }

    # Parse JSON output (stdout contains the JSON report)
    raw = result.stdout
    try:
        report = json.loads(raw)
    except json.JSONDecodeError:
        return {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "total": 0,
            "passed": 0,
            "failed": 0,
            "pass_rate": 0.0,
            "failures": [],
            "error": f"Failed to parse test output: {result.stderr[:500]}",
        }

    # Normalize results from Playwright JSON reporter
    suites = report.get("suites", [])
    passed = 0
    failed = 0
    failures = []

    def walk_suites(suites_list):
        nonlocal passed, failed
        for suite in suites_list:
            for spec in suite.get("specs", []):
                for test in spec.get("tests", []):
                    status = test.get("status", "")
                    if status == "expected":
                        passed += 1
                    else:
                        failed += 1
                        failures.append({
                            "test_id": spec.get("title", "unknown"),
                            "status": status,
                            "error": _extract_error(test),
                        })
            # Recurse into nested suites
            walk_suites(suite.get("suites", []))

    walk_suites(suites)
    total = passed + failed

    return {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "total": total,
        "passed": passed,
        "failed": failed,
        "pass_rate": (passed / total * 100) if total > 0 else 0.0,
        "failures": failures,
    }


def retest_single(test_dir: str, target_url: str, test_id: str) -> dict:
    """Re-run a single test by title grep after a fix attempt."""
    if test_dir is None:
        test_dir = os.path.join(os.path.dirname(__file__), "tests")

    env = os.environ.copy()
    env["TARGET_URL"] = target_url

    try:
        result = subprocess.run(
            ["npx", "playwright", "test", "--reporter=json", "-g", test_id],
            cwd=test_dir,
            capture_output=True,
            text=True,
            timeout=TEST_TIMEOUT_SECONDS,
            env=env,
            shell=True,
            encoding="utf-8",
            errors="replace",
        )
    except subprocess.TimeoutExpired:
        return {"test_id": test_id, "passed": False, "error": "Timeout"}

    try:
        report = json.loads(result.stdout)
    except json.JSONDecodeError:
        return {"test_id": test_id, "passed": False, "error": result.stderr[:500]}

    # Check if all specs passed
    all_passed = True
    for suite in report.get("suites", []):
        for spec in suite.get("specs", []):
            for test in spec.get("tests", []):
                if test.get("status") != "expected":
                    all_passed = False

    return {"test_id": test_id, "passed": all_passed}


def _extract_error(test: dict) -> str:
    """Extract error message from a Playwright test result."""
    for result in test.get("results", []):
        if result.get("error", {}).get("message"):
            return result["error"]["message"][:500]
        if result.get("errors"):
            for err in result["errors"]:
                if err.get("message"):
                    return err["message"][:500]
    return "Unknown error"
