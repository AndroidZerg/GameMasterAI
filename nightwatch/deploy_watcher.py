# nightwatch/deploy_watcher.py
"""Polls Render API to track deployment status."""

import os
import time
from typing import Optional

import requests

from config import (
    RENDER_API_BASE,
    RENDER_API_KEY_ENV,
    RENDER_SERVICE_ID_ENV,
    DEPLOY_POLL_INTERVAL_SECONDS,
    DEPLOY_TIMEOUT_SECONDS,
)


def wait_for_deploy(commit_sha: Optional[str] = None) -> dict:
    """Poll Render deploy API until deploy is live or timeout.

    Args:
        commit_sha: Optional SHA to match against the deploy commit.

    Returns:
        dict with: status, deploy_id, commit_sha, duration_seconds
    """
    api_key = os.environ.get(RENDER_API_KEY_ENV)
    service_id = os.environ.get(RENDER_SERVICE_ID_ENV)

    if not api_key or not service_id:
        return {
            "status": "skipped",
            "deploy_id": None,
            "commit_sha": None,
            "duration_seconds": 0,
            "error": f"Missing env var(s): {RENDER_API_KEY_ENV} and/or {RENDER_SERVICE_ID_ENV}",
        }

    url = f"{RENDER_API_BASE}/services/{service_id}/deploys?limit=5"
    headers = {"Authorization": f"Bearer {api_key}"}

    start_time = time.time()

    while True:
        elapsed = time.time() - start_time
        if elapsed > DEPLOY_TIMEOUT_SECONDS:
            return {
                "status": "timeout",
                "deploy_id": None,
                "commit_sha": commit_sha,
                "duration_seconds": elapsed,
            }

        try:
            resp = requests.get(url, headers=headers, timeout=15)
            resp.raise_for_status()
            deploys = resp.json()
        except requests.RequestException as e:
            return {
                "status": "error",
                "deploy_id": None,
                "commit_sha": commit_sha,
                "duration_seconds": elapsed,
                "error": str(e),
            }

        # Find the matching deploy
        for deploy_wrapper in deploys:
            deploy = deploy_wrapper.get("deploy", deploy_wrapper)
            deploy_commit = deploy.get("commit", {}).get("id", "")
            deploy_status = deploy.get("status", "")

            # If we have a commit SHA, match it; otherwise check the latest
            if commit_sha and deploy_commit and not deploy_commit.startswith(commit_sha[:7]):
                continue

            if deploy_status == "live":
                return {
                    "status": "live",
                    "deploy_id": deploy.get("id"),
                    "commit_sha": deploy_commit,
                    "duration_seconds": time.time() - start_time,
                }

            # Deploy is still in progress
            break

        time.sleep(DEPLOY_POLL_INTERVAL_SECONDS)
