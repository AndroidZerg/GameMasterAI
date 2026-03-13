"""Publisher lead capture endpoint with Telegram notifications."""

from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.models.publisher_leads import create_publisher_lead

router = APIRouter(prefix="/api/v1", tags=["publisher-leads"])
limiter = Limiter(key_func=get_remote_address)

# GMG Leads bot — hardcoded for publisher lead notifications
_TG_BOT_TOKEN = "8535000205:AAEf2rJhVD89Qzx08Jxmalxu41PuQ1fpwR4"
_TG_CHAT_ID = "6236947695"


def _send_telegram(first_name: str, last_name: str, company: str, games: str, email: str, message: str):
    msg_display = message or "\u2014"
    text = (
        "\U0001f4ec New Publisher Lead\n\n"
        f"Name: {first_name} {last_name}\n"
        f"Company: {company}\n"
        f"Games: {games}\n"
        f"Email: {email}\n"
        f"Message: {msg_display}"
    )
    try:
        httpx.post(
            f"https://api.telegram.org/bot{_TG_BOT_TOKEN}/sendMessage",
            json={"chat_id": _TG_CHAT_ID, "text": text},
            timeout=10,
        )
    except Exception:
        pass  # Never lose the lead — telegram failure is non-fatal


class PublisherLeadRequest(BaseModel):
    first_name: str
    last_name: str
    company: str
    games: str
    email: str
    message: Optional[str] = ""


@router.post("/publisher-leads")
@limiter.limit("10/hour")
async def submit_publisher_lead(req: PublisherLeadRequest, request: Request):
    first_name = req.first_name.strip()
    last_name = req.last_name.strip()
    company = req.company.strip()
    games = req.games.strip()
    email = req.email.strip()
    message = (req.message or "").strip()

    # Save to SQLite
    create_publisher_lead(
        first_name=first_name, last_name=last_name,
        company=company, games=games,
        email=email, message=message,
    )

    # Telegram notification (fire-and-forget)
    _send_telegram(first_name, last_name, company, games, email, message)

    return {"status": "ok"}
