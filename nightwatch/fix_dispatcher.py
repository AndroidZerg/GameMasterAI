# nightwatch/fix_dispatcher.py
"""Dispatches failures to Claude CLI for autonomous fixing."""

import json
import subprocess
from dataclasses import dataclass
from typing import Optional

from config import (
    CLAUDE_CLI,
    CLAUDE_CWD,
    CLAUDE_TIMEOUT_SECONDS,
    MAX_FIX_ATTEMPTS_PER_FAILURE,
)


@dataclass
class FixResult:
    success: bool
    commit_sha: Optional[str]
    description: str
    attempt: int


def dispatch_fix(
    failure: dict,
    attempt: int = 1,
    previous_attempts: list = None,
) -> FixResult:
    """Send a test failure to Claude CLI for fixing.

    Args:
        failure: dict with test_id, status, error
        attempt: current attempt number
        previous_attempts: list of descriptions from prior attempts

    Returns:
        FixResult with success status and details
    """
    if attempt > MAX_FIX_ATTEMPTS_PER_FAILURE:
        return FixResult(
            success=False,
            commit_sha=None,
            description=f"Exceeded max fix attempts ({MAX_FIX_ATTEMPTS_PER_FAILURE})",
            attempt=attempt,
        )

    # Build the prompt
    prompt_parts = [
        "You are Nightwatch, the autonomous test-fix agent for GameMaster AI.",
        f"A smoke test has FAILED. Fix it so it passes.",
        f"",
        f"Test ID: {failure.get('test_id', 'unknown')}",
        f"Status: {failure.get('status', 'unknown')}",
        f"Error: {failure.get('error', 'No error message')}",
        f"",
        f"Attempt: {attempt} of {MAX_FIX_ATTEMPTS_PER_FAILURE}",
    ]

    if previous_attempts:
        prompt_parts.append("")
        prompt_parts.append("Previous fix attempts that did NOT work:")
        for i, desc in enumerate(previous_attempts, 1):
            prompt_parts.append(f"  Attempt {i}: {desc}")

    prompt_parts.extend([
        "",
        "Instructions:",
        "1. Investigate the failure in the backend or frontend code",
        "2. Fix the root cause (not the test)",
        "3. Commit your fix with a descriptive message",
        "4. Respond with ONLY this JSON (no other text):",
        '{"fixed": true/false, "description": "what you did", "commit_sha": "abc123"}',
    ])

    prompt = "\n".join(prompt_parts)

    try:
        result = subprocess.run(
            [
                CLAUDE_CLI,
                "-p", prompt,
                "--output-format", "text",
                "--max-turns", "25",
                "--allowedTools", "Bash,Read,Write,Edit",
            ],
            cwd=CLAUDE_CWD,
            capture_output=True,
            text=True,
            timeout=CLAUDE_TIMEOUT_SECONDS,
            shell=True,
        )
    except subprocess.TimeoutExpired:
        return FixResult(
            success=False,
            commit_sha=None,
            description="Claude CLI timed out",
            attempt=attempt,
        )
    except Exception as e:
        return FixResult(
            success=False,
            commit_sha=None,
            description=f"Claude CLI error: {e}",
            attempt=attempt,
        )

    # Parse Claude's response
    output = result.stdout.strip()
    try:
        # Find JSON in the output (Claude may include extra text)
        json_start = output.rfind("{")
        json_end = output.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            response = json.loads(output[json_start:json_end])
        else:
            raise json.JSONDecodeError("No JSON found", output, 0)

        return FixResult(
            success=response.get("fixed", False),
            commit_sha=response.get("commit_sha"),
            description=response.get("description", "No description"),
            attempt=attempt,
        )

    except json.JSONDecodeError:
        return FixResult(
            success=False,
            commit_sha=None,
            description=f"Could not parse Claude response: {output[:200]}",
            attempt=attempt,
        )
