"""Contact form endpoint with Telegram notifications."""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.auth import get_current_venue
from app.models.contacts import create_contact

router = APIRouter(prefix="/api", tags=["contact"])
limiter = Limiter(key_func=get_remote_address)

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

_INQUIRIES_PATH = Path(__file__).resolve().parents[4] / "content" / "inquiries.json"


def _load_inquiries() -> list[dict]:
    if _INQUIRIES_PATH.exists():
        try:
            return json.loads(_INQUIRIES_PATH.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return []
    return []


def _save_inquiries(inquiries: list[dict]):
    _INQUIRIES_PATH.parent.mkdir(parents=True, exist_ok=True)
    _INQUIRIES_PATH.write_text(
        json.dumps(inquiries, indent=2, ensure_ascii=False), encoding="utf-8"
    )


def _send_telegram(name: str, email: str, venue: str, message: str, timestamp: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    text = (
        f"\U0001f3b2 NEW GMAI DEMO REQUEST\n\n"
        f"Name: {name}\n"
        f"Email: {email}\n"
        f"Venue: {venue}\n"
        f"Message: {message}\n"
        f"Time: {timestamp}"
    )
    try:
        httpx.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": text},
            timeout=10,
        )
    except Exception:
        pass  # Never lose the lead — telegram failure is non-fatal


class ContactRequest(BaseModel):
    name: str
    venue_name: Optional[str] = ""
    email: str
    message: Optional[str] = ""


@router.post("/contact")
@limiter.limit("10/hour")
async def submit_contact(req: ContactRequest, request: Request):
    if not req.name or not req.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    if not req.email or not req.email.strip():
        raise HTTPException(status_code=400, detail="email is required")

    name = req.name.strip()
    email = req.email.strip()
    venue = (req.venue_name or "").strip()
    message = (req.message or "").strip()
    timestamp = datetime.now(timezone.utc).isoformat()

    # Save to SQLite (existing)
    create_contact(name=name, venue_name=venue, email=email, message=message)

    # Save to inquiries.json
    inquiries = _load_inquiries()
    inquiries.append({
        "name": name,
        "email": email,
        "venue": venue,
        "message": message,
        "submitted_at": timestamp,
    })
    _save_inquiries(inquiries)

    # Telegram notification (fire-and-forget)
    _send_telegram(name, email, venue, message, timestamp)

    return {"success": True, "message": "Thanks! We'll be in touch within 24 hours."}


@router.get("/admin/inquiries")
async def get_inquiries(venue: dict = Depends(get_current_venue)):
    """Return all contact inquiries, newest first. Admin only."""
    inquiries = _load_inquiries()
    inquiries.reverse()
    return {"inquiries": inquiries}
