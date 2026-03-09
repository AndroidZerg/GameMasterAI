"""Discord webhook notifications for SWP rental events."""

import os
import logging

import httpx

logger = logging.getLogger(__name__)

DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")


async def send_discord_notification(message: str):
    """Send a notification to the SWP #gmg-orders Discord channel."""
    if not DISCORD_WEBHOOK_URL:
        logger.info("[DISCORD] No webhook URL configured. Message: %s", message)
        return

    try:
        async with httpx.AsyncClient() as client:
            await client.post(DISCORD_WEBHOOK_URL, json={
                "content": message,
                "username": "GameMaster Guide",
            }, timeout=10)
    except Exception as e:
        logger.error("[DISCORD] Failed to send notification: %s", e)
