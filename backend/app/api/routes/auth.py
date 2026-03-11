"""Auth endpoints — login, verify, logout, register, convention signup, Stonemaier signup."""

import logging
import os
import re
import secrets
import uuid
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.auth import hash_password, verify_password, create_token, get_current_venue
from app.models.venues import (
    get_venue_by_email, update_venue_login, create_venue,
    get_venue_by_id, get_venue_by_username, set_venue_collection,
)
from app.models.game import search_games
from app.services.admin_config import get_meetup_enabled
from app.services.turso import insert_signup, get_signup_by_email

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")

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

    # Fallback: check signups table (convention / stonemaier users)
    if not venue:
        signup = get_signup_by_email(login_input)
        if signup and signup.get("password_hash") and verify_password(req.password, signup["password_hash"]):
            dtw = get_venue_by_id("dicetowerwest")
            venue_display = dtw["venue_name"] if dtw else "Dice Tower West"
            token = create_token("dicetowerwest", venue_display, role="convention")
            return {
                "token": token,
                "venue_id": "dicetowerwest",
                "venue_name": venue_display,
                "role": "convention",
                "status": "active",
                "expires_at": CONVENTION_EXPIRY,
            }

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
async def register(req: RegisterRequest, request: Request,
                   venue: dict = Depends(get_current_venue)):
    """Register a new venue account. Super admin only."""
    # Only super_admin can create venues
    if venue.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super_admin can create venues")

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
    """Email-only signup for Dice Tower West convention floor attendees.

    All signups share the single 'dicetowerwest' venue. No new venue is created.
    Individual emails are tracked in the signups table (Turso).
    """
    if not req.email or not req.email.strip():
        raise HTTPException(status_code=400, detail="Email is required")

    email = req.email.strip().lower()
    venue_id = "dicetowerwest"
    venue_display = "Dice Tower West"
    role = "convention"
    expires_at = CONVENTION_EXPIRY if not trial else None

    # Check if email already registered in venues table (legacy) — log them in
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

    # Check if already in signups table — return token for shared venue
    existing_signup = get_signup_by_email(email)
    if existing_signup:
        token = create_token(venue_id, venue_display, role=role)
        return {
            "token": token,
            "venue_id": venue_id,
            "venue_name": venue_display,
            "role": role,
            "expires_at": expires_at,
        }

    # New signup — record in signups table, do NOT create a venue
    source = "dicetower2026-trial" if trial else "dicetower2026"
    ip_address = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    insert_signup(
        signup_id=str(uuid.uuid4()),
        first_name="",
        email=email,
        source=source,
        role=role,
        signed_up_at=datetime.now(timezone.utc).isoformat(),
        ip_address=ip_address,
        password_hash="",
        raw_password="",
    )

    token = create_token(venue_id, venue_display, role=role)
    return {
        "token": token,
        "venue_id": venue_id,
        "venue_name": venue_display,
        "role": role,
        "expires_at": expires_at,
    }


# ── Stonemaier / Dice Tower signup ──────────────────────────────


class StonemaierSignupRequest(BaseModel):
    first_name: str
    email: str


def _generate_password(length: int = 8) -> str:
    """Generate a random alphanumeric password."""
    alphabet = "abcdefghjkmnpqrstuvwxyz23456789"  # no ambiguous chars
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _send_signup_telegram(first_name: str, email: str, password: str):
    """Fire-and-forget Telegram notification for new signup."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    now_pacific = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    text = (
        f"\U0001F3AE New Dice Tower Signup\n"
        f"\U0001F464 {first_name}\n"
        f"\U0001F4E7 {email}\n"
        f"\U0001F550 {now_pacific}\n"
        f"\U0001F511 Password: {password}\n"
        f"\U0001F4CD Source: dicetower2026"
    )
    try:
        httpx.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": text},
            timeout=10,
        )
    except Exception:
        pass


def _send_signup_email(first_name: str, email: str, password: str):
    """Send welcome email via Resend. Logs content if API key not set."""
    subject = "You're in \u2014 GameMaster Guide"
    html_body = f"""<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
<p>Hi {first_name},</p>
<p>You now have access to <strong>GameMaster Guide</strong> \u2014 the AI that teaches board games by voice.</p>
<p><strong>Log in here:</strong> <a href="https://playgmg.com">https://playgmg.com</a><br/>
<strong>Email:</strong> {email}<br/>
<strong>Password:</strong> {password}</p>
<p>You'll see the full Stonemaier Games collection: Wingspan, Wyrmspan, Scythe, Tapestry, Viticulture, and more.</p>
<p>See you at Dice Tower.<br/>
\u2014 Tim, GameMaster Guide<br/>
<a href="mailto:tim@playgmg.com">tim@playgmg.com</a> | <a href="https://playgmg.com">playgmg.com</a></p>
</div>"""
    text_body = (
        f"Hi {first_name},\n\n"
        f"You now have access to GameMaster Guide \u2014 the AI that teaches board games by voice.\n\n"
        f"Log in here: https://playgmg.com\n"
        f"Email: {email}\n"
        f"Password: {password}\n\n"
        f"You'll see the full Stonemaier Games collection: Wingspan, Wyrmspan, Scythe, Tapestry, Viticulture, and more.\n\n"
        f"See you at Dice Tower.\n"
        f"\u2014 Tim, GameMaster Guide\n"
        f"tim@playgmg.com | playgmg.com"
    )

    if not RESEND_API_KEY:
        logger.info(f"[EMAIL FALLBACK] Would send to {email}:\nSubject: {subject}\n{text_body}")
        return

    try:
        httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": "Tim at GameMaster Guide <tim@playgmg.com>",
                "to": [email],
                "subject": subject,
                "html": html_body,
                "text": text_body,
            },
            timeout=10,
        )
    except Exception as e:
        logger.warning(f"Resend email failed for {email}: {e}")


@router.post("/signup/stonemaier")
@limiter.limit("10/hour")
async def stonemaier_signup(req: StonemaierSignupRequest, request: Request):
    """Stonemaier / Dice Tower signup — first_name + email, instant access.

    All signups share the single 'dicetowerwest' venue. No new venue is created.
    Individual emails are tracked in the signups table (Turso).
    """
    if not req.first_name or not req.first_name.strip():
        raise HTTPException(status_code=400, detail="First name is required")
    if not req.email or not req.email.strip():
        raise HTTPException(status_code=400, detail="Email is required")

    first_name = req.first_name.strip()
    email = req.email.strip().lower()
    venue_id = "dicetowerwest"
    venue_display = "Dice Tower West"
    role = "convention"

    # Check if email already registered in venues table (legacy) — log them in
    existing = get_venue_by_email(email)
    if existing:
        existing_role = existing.get("role", "convention")
        token = create_token(existing["venue_id"], existing["venue_name"], role=existing_role)
        update_venue_login(existing["venue_id"])
        return {
            "token": token,
            "venue_id": existing["venue_id"],
            "venue_name": existing["venue_name"],
            "role": existing_role,
            "first_name": first_name,
        }

    # Check if already in signups table — return token for shared venue
    existing_signup = get_signup_by_email(email)
    if existing_signup:
        token = create_token(venue_id, venue_display, role=role)
        return {
            "token": token,
            "venue_id": venue_id,
            "venue_name": venue_display,
            "role": role,
            "first_name": first_name,
        }

    # Generate password for welcome email
    raw_password = _generate_password()
    pw_hash = hash_password(raw_password)

    # Store in Turso signups table — do NOT create a venue
    ip_address = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    insert_signup(
        signup_id=str(uuid.uuid4()),
        first_name=first_name,
        email=email,
        source="dicetower2026",
        role=role,
        signed_up_at=datetime.now(timezone.utc).isoformat(),
        ip_address=ip_address,
        password_hash=pw_hash,
        raw_password=raw_password,
    )

    # Fire-and-forget: Telegram + Email
    _send_signup_telegram(first_name, email, raw_password)
    _send_signup_email(first_name, email, raw_password)

    token = create_token(venue_id, venue_display, role=role)
    return {
        "token": token,
        "venue_id": venue_id,
        "venue_name": venue_display,
        "role": role,
        "first_name": first_name,
    }
