# nightwatch/telegram_reporter.py
"""Sends cycle reports and alerts via Telegram."""

import os
import time

import requests

from config import TELEGRAM_BOT_TOKEN_ENV, TELEGRAM_CHAT_ID


def _send_message(text: str) -> bool:
    """Send a Telegram message. Returns True on success."""
    token = os.environ.get(TELEGRAM_BOT_TOKEN_ENV)
    if not token:
        print(f"[telegram] Skipped: {TELEGRAM_BOT_TOKEN_ENV} not set")
        return False

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "Markdown",
    }

    try:
        resp = requests.post(url, json=payload, timeout=10)
        resp.raise_for_status()
        return True
    except requests.RequestException as e:
        print(f"[telegram] Send failed: {e}")
        return False


def send_cycle_report(
    cycle: int,
    test_report: dict,
    fixes: list,
    config_status: dict,
    next_run: str,
    human_review: list = None,
) -> bool:
    """Send a formatted cycle report to Telegram."""
    passed = test_report.get("passed", 0)
    failed = test_report.get("failed", 0)
    total = test_report.get("total", 0)
    pass_rate = test_report.get("pass_rate", 0)

    config_ok = config_status.get("config_intact", True)
    config_icon = "OK" if config_ok else "CHANGED"

    lines = [
        f"*Nightwatch Cycle {cycle}*",
        f"Time: {time.strftime('%H:%M:%S')}",
        f"",
        f"Tests: {passed}/{total} passed ({pass_rate:.0f}%)",
        f"Failed: {failed}",
    ]

    if fixes:
        lines.append("")
        lines.append("*Fixes applied:*")
        for fix in fixes:
            icon = "OK" if fix.get("success") else "FAIL"
            lines.append(f"  [{icon}] {fix.get('test_id', '?')}: {fix.get('description', '?')}")

    lines.append(f"")
    lines.append(f"Config: {config_icon}")

    if human_review:
        lines.append("")
        lines.append("*Needs human review:*")
        for item in human_review:
            lines.append(f"  - {item}")

    lines.append(f"")
    lines.append(f"Next run: {next_run}")

    return _send_message("\n".join(lines))


def send_alert(message: str) -> bool:
    """Send an immediate critical alert."""
    text = f"CRITICAL: Nightwatch Alert\n\n{message}"
    return _send_message(text)
