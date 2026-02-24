"""Contact form endpoint."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.models.contacts import create_contact

router = APIRouter(prefix="/api", tags=["contact"])
limiter = Limiter(key_func=get_remote_address)


class ContactRequest(BaseModel):
    name: str
    venue_name: Optional[str] = ""
    email: str
    message: str


@router.post("/contact")
@limiter.limit("10/hour")
async def submit_contact(req: ContactRequest, request: Request):
    if not req.name or not req.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    if not req.email or not req.email.strip():
        raise HTTPException(status_code=400, detail="email is required")
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="message is required")

    create_contact(
        name=req.name.strip(),
        venue_name=(req.venue_name or "").strip(),
        email=req.email.strip(),
        message=req.message.strip(),
    )
    return {"success": True, "message": "Thanks! We'll be in touch."}
