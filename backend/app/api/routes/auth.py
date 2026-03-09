"""Auth endpoints — login, verify, logout, register, convention signup."""

import re
import hashlib
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.auth import hash_password, verify_password, create_token, get_current_venue
from app.models.venues import (
    get_venue_by_email, update_venue_login, create_venue,
    get_venue_by_id, get_venue_by_username, set_venue_collection, get_venue_collection,
)
from app.models.game import search_games, search_limited_library
from app.services.admin_config import get_meetup_enabled

router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

# Convention accounts expire March 22, 2026 at 11:59:59 PM Pacific
CONVENTION_EXPIRY = "2026-03-22T23:59:59-08:00"


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    venue_name: str
    email: str
    password: str
    tagline: Optional[str] = ""


class SignupRequest(BaseModel):
    email: str


@router.post("/login")
async def login(req: LoginRequest):
    """Authenticate with email/password. Returns JWT token."""
    if not req.email or not req.password:
        raise HTTPException(status_code=400, detail="Email and password required")

    login_input = req.email.strip().lower()
    venue = get_venue_by_email(login_input)
    if not venue:
        venue = get_venue_by_id(login_input)
    if not venue:
        venue = get_venue_by_username(login_input)
    if not venue or not verify_password(req.password, venue["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    role = venue.get("role", "venue_admin")

    # Meetup toggle check — if meetup account and toggle is OFF, block login
    if role == "meetup":
        if not get_meetup_enabled():
            raise HTTPException(
                status_code=403,
                detail="This session is not currently active. Check back during the next scheduled meetup.",
            )

    # Convention expiry check
    if role == "convention":
        expires_at = venue.get("expires_at")
        if expires_at:
            try:
                from datetime import datetime as dt
                exp = dt.fromisoformat(expires_at)
                if dt.now(exp.tzinfo or timezone.utc) > exp:
                    raise HTTPException(
                        status_code=403,
                        detail="expired",
                    )
            except HTTPException:
                raise
            except Exception:
                pass

    update_venue_login(venue["venue_id"])
    lgs_id = venue.get("lgs_id") if role == "lgs_admin" else None
    token = create_token(venue["venue_id"], venue["venue_name"], role=role, lgs_id=lgs_id)
    resp = {
        "token": token,
        "venue_id": venue["venue_id"],
        "venue_name": venue["venue_name"],
        "role": role,
        "status": venue.get("status", "prospect"),
        "expires_at": venue.get("expires_at"),
    }
    if lgs_id:
        resp["lgs_id"] = lgs_id
    return resp


@router.get("/join")
async def magic_link_join(key: str = Query(..., min_length=1)):
    """Magic-link login — scan QR, auto-login as meetup account."""
    # Lookup: match key against the meetup account's password (used as magic key)
    MAGIC_KEYS = {
        "bgninhenderson": "meetup",
    }

    venue_id = MAGIC_KEYS.get(key)
    if not venue_id:
        raise HTTPException(status_code=401, detail="Invalid or expired link")

    venue = get_venue_by_id(venue_id)
    if not venue:
        raise HTTPException(status_code=401, detail="Invalid or expired link")

    role = venue.get("role", "venue_admin")

    # Meetup toggle check
    if role == "meetup":
        if not get_meetup_enabled():
            raise HTTPException(
                status_code=403,
                detail="This session is not currently active. Check back during the next scheduled meetup.",
            )

    update_venue_login(venue["venue_id"])
    token = create_token(venue["venue_id"], venue["venue_name"], role=role)
    return {
        "token": token,
        "venue_id": venue["venue_id"],
        "venue_name": venue["venue_name"],
        "role": role,
        "status": venue.get("status", "prospect"),
        "expires_at": venue.get("expires_at"),
    }


@router.get("/guest")
async def guest_auth(venue: str = Query(None, min_length=1),
                     table: Optional[int] = Query(None)):
    """QR code guest auth — issue a guest JWT for a venue by slug.

    The slug is matched against venue_ids after stripping hyphens,
    so ``shallweplay`` resolves to the correct venue.
    """
    if not venue:
        raise HTTPException(status_code=400, detail="venue parameter is required")

    slug = venue.strip().lower()

    # Try exact match first
    matched = get_venue_by_id(slug)

    # Fuzzy match: strip hyphens from both slug and stored venue_ids
    if not matched:
        from app.models.venues import get_all_venues
        normalised = slug.replace("-", "")
        for v in get_all_venues():
            if v["venue_id"].replace("-", "") == normalised:
                matched = v
                break

    if not matched:
        raise HTTPException(status_code=404, detail="Unknown venue")

    token = create_token(matched["venue_id"], matched["venue_name"], role="guest")
    update_venue_login(matched["venue_id"])
    return {
        "token": token,
        "venue_id": matched["venue_id"],
        "venue_name": matched["venue_name"],
        "role": "guest",
        "status": matched.get("status", "active"),
        "expires_at": None,
        "table": table,
    }


@router.post("/verify")
async def verify_token(venue: dict = Depends(get_current_venue)):
    """Verify a JWT token. Returns venue info or 401."""
    return {
        "valid": True,
        "venue_id": venue["venue_id"],
        "venue_name": venue["venue_name"],
        "role": venue.get("role", "venue_admin"),
        "status": venue.get("status", "prospect"),
    }


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
    return {
        "token": token,
        "venue_id": venue_id,
        "venue_name": req.venue_name.strip(),
        "role": "venue_admin",
        "status": "prospect",
    }


@router.post("/signup")
@limiter.limit("10/hour")
async def convention_signup(req: SignupRequest, request: Request,
                            trial: Optional[bool] = Query(None)):
    """Email-only signup for Dice Tower West convention floor attendees."""
    if not req.email or not req.email.strip():
        raise HTTPException(status_code=400, detail="Email is required")

    email = req.email.strip().lower()

    # Check if email already registered — if so, log them in
    existing = get_venue_by_email(email)
    if existing:
        role = existing.get("role", "convention")
        token = create_token(existing["venue_id"], existing["venue_name"], role=role)
        update_venue_login(existing["venue_id"])
        return {
            "token": token,
            "venue_id": existing["venue_id"],
            "venue_name": existing["venue_name"],
            "role": role,
            "expires_at": existing.get("expires_at"),
        }

    # Generate venue_id from email
    email_prefix = email.split("@")[0]
    venue_id = re.sub(r"[^a-z0-9]+", "-", email_prefix.lower()).strip("-")
    venue_id = f"conv-{venue_id}"
    if get_venue_by_id(venue_id):
        venue_id = f"{venue_id}-{abs(hash(email)) % 10000}"

    # No password for convention accounts — generate a random hash
    pw_hash = hashlib.sha256(f"conv-{email}-{datetime.now(timezone.utc).isoformat()}".encode()).hexdigest()

    if trial:
        # Trial account — no expiry, trial_start_date set
        role = "convention"
        create_venue(
            venue_id=venue_id,
            venue_name="GameMaster Guide User",
            email=email,
            password_hash=pw_hash,
            role=role,
            source="dicetower2026-trial",
            trial_start_date=datetime.now(timezone.utc).isoformat(),
        )
        expires_at = None
    else:
        # Convention demo account — expires March 22
        role = "convention"
        create_venue(
            venue_id=venue_id,
            venue_name="Dice Tower West Attendee",
            email=email,
            password_hash=pw_hash,
            role=role,
            source="dicetower2026",
            expires_at=CONVENTION_EXPIRY,
        )
        expires_at = CONVENTION_EXPIRY

    # Give convention/trial users the limited library
    limited = search_limited_library()
    limited_ids = [g["game_id"] for g in limited]
    set_venue_collection(venue_id, limited_ids)

    token = create_token(venue_id, "Dice Tower West Attendee", role=role)
    return {
        "token": token,
        "venue_id": venue_id,
        "venue_name": "Dice Tower West Attendee",
        "role": role,
        "expires_at": expires_at,
    }
