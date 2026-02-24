"""Auth endpoints — login, verify, logout, register."""

import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.auth import hash_password, verify_password, create_token, get_current_venue
from app.models.venues import (
    get_venue_by_email, update_venue_login, create_venue,
    get_venue_by_id, set_venue_collection, get_venue_collection,
)
from app.models.game import search_games

router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    venue_name: str
    email: str
    password: str
    tagline: Optional[str] = ""


@router.post("/login")
async def login(req: LoginRequest):
    """Authenticate with email/password. Returns JWT token."""
    if not req.email or not req.password:
        raise HTTPException(status_code=400, detail="Email and password required")

    venue = get_venue_by_email(req.email.strip().lower())
    if not venue or not verify_password(req.password, venue["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    update_venue_login(venue["venue_id"])
    token = create_token(venue["venue_id"], venue["venue_name"])
    return {"token": token, "venue_id": venue["venue_id"], "venue_name": venue["venue_name"]}


@router.post("/verify")
async def verify_token(venue: dict = Depends(get_current_venue)):
    """Verify a JWT token. Returns venue info or 401."""
    return {"valid": True, "venue_id": venue["venue_id"], "venue_name": venue["venue_name"]}


@router.post("/logout")
async def logout():
    """Logout — frontend handles token removal."""
    return {"status": "ok"}


@router.post("/register")
@limiter.limit("5/hour")
async def register(req: RegisterRequest, request: Request):
    """Register a new venue account."""
    if not req.venue_name or not req.venue_name.strip():
        raise HTTPException(status_code=400, detail="venue_name is required")
    if not req.email or not req.email.strip():
        raise HTTPException(status_code=400, detail="email is required")
    if not req.password or len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    email = req.email.strip().lower()
    existing = get_venue_by_email(email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Generate venue_id from name
    venue_id = re.sub(r"[^a-z0-9]+", "-", req.venue_name.strip().lower()).strip("-")
    if not venue_id:
        raise HTTPException(status_code=400, detail="Invalid venue name")

    # Ensure unique venue_id
    if get_venue_by_id(venue_id):
        venue_id = f"{venue_id}-{hash(email) % 10000}"

    pw_hash = hash_password(req.password)
    create_venue(
        venue_id=venue_id,
        venue_name=req.venue_name.strip(),
        email=email,
        password_hash=pw_hash,
        tagline=(req.tagline or "").strip(),
    )

    # Seed collection with all games
    all_games = search_games()
    game_ids = [g["game_id"] for g in all_games]
    set_venue_collection(venue_id, game_ids)

    token = create_token(venue_id, req.venue_name.strip())
    return {"token": token, "venue_id": venue_id, "venue_name": req.venue_name.strip()}
