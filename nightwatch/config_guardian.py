# nightwatch/config_guardian.py
"""Monitors admin-config.json for unauthorized changes."""

import json
import os
import subprocess


class ConfigGuardian:
    def __init__(self, repo_root: str, config_path: str, fields: list):
        self.repo_root = repo_root
        self.config_path = config_path
        self.full_path = os.path.join(repo_root, config_path)
        self.fields = fields
        self._snapshot = None

    def snapshot(self) -> dict:
        """Read current state of admin-config.json and store it."""
        try:
            with open(self.full_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            self._snapshot = {"error": str(e)}
            return self._snapshot

        # Extract the fields we care about from _default
        default_cfg = data.get("_default", {})
        captured = {}

        if "game_of_the_day" in self.fields:
            featured = default_cfg.get("featured", {})
            captured["game_of_the_day"] = {
                "mode": featured.get("mode"),
                "game_id": featured.get("game_id"),
            }

        if "staff_picks" in self.fields:
            captured["staff_picks"] = default_cfg.get("staff_picks", [])

        self._snapshot = captured
        return self._snapshot

    def verify(self) -> dict:
        """Compare current state to snapshot. Returns config_intact bool + details."""
        if self._snapshot is None:
            return {"config_intact": False, "error": "No snapshot taken"}

        current = self.snapshot()
        if "error" in current:
            return {"config_intact": False, "error": current["error"]}

        # Deep compare
        intact = current == self._snapshot
        result = {"config_intact": intact}

        if not intact:
            result["changes"] = {
                "before": self._snapshot,
                "after": current,
            }
            result["trace"] = self._trace_change()

        return result

    def _trace_change(self) -> str:
        """Use git to identify what changed the config file."""
        try:
            # Check git diff for the config file
            diff_result = subprocess.run(
                ["git", "diff", "--", self.config_path],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=10,
            )

            # Check recent git log for the file
            log_result = subprocess.run(
                ["git", "log", "--oneline", "-5", "--", self.config_path],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=10,
            )

            trace = ""
            if diff_result.stdout.strip():
                trace += f"Git diff:\n{diff_result.stdout[:1000]}\n"
            if log_result.stdout.strip():
                trace += f"Recent commits:\n{log_result.stdout[:500]}"
            return trace if trace else "No git changes detected (change may be uncommitted)"

        except Exception as e:
            return f"Trace failed: {e}"
