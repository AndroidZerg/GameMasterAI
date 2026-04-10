"""Publisher Portal — authentication routes (signup, login, profile, refresh)."""

from datetime import datetime, timezone

import httpx
import jwt
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

from app.services.supabase_client import (
    get_admin_client,
    get_anon_client,
    SUPABASE_JWT_SECRET,
)

router = APIRouter(tags=["publisher-auth"])

# Telegram — reuse the same GMG leads bot
_TG_BOT_TOKEN = "8535000205:AAEf2rJhVD89Qzx08Jxmalxu41PuQ1fpwR4"
_TG_CHAT_ID = "6236947695"


def _send_telegram(text: str):
    try:
        httpx.post(
            f"https://api.telegram.org/bot{_TG_BOT_TOKEN}/sendMessage",
            json={"chat_id": _TG_CHAT_ID, "text": text},
            timeout=10,
        )
    except Exception:
        pass  # Telegram failure is non-fatal


# ── Helpers ─────────────────────────────────────────────────────

async def get_current_publisher(request: Request) -> dict:
    """Extract and verify publisher from Supabase JWT. Use as FastAPI Depends()."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Missing authorization token")
    token = auth_header.split(" ", 1)[1]

    if not SUPABASE_JWT_SECRET:
        raise HTTPException(500, "Server misconfigured: JWT secret not set")

    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id = payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

    admin = get_admin_client()
    result = admin.table("publishers").select("*").eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(403, "No publisher account found")
    return result.data[0]


# ── Request Models ──────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: str
    password: str
    company_name: str
    contact_name: str
    phone: Optional[str] = None
    website: Optional[str] = None
    mailing_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    agreement_accepted: bool = False
    invite_token: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: str


class UpdateProfileRequest(BaseModel):
    phone: Optional[str] = None
    website: Optional[str] = None
    mailing_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None


# ── Routes ──────────────────────────────────────────────────────

@router.post("/signup")
async def publisher_signup(body: SignupRequest):
    """Public publisher signup with consignment agreement acceptance."""
    if not body.agreement_accepted:
        raise HTTPException(400, "You must accept the consignment agreement to sign up")

    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

    admin = get_admin_client()
    anon = get_anon_client()

    # Check invite token (tracking only — not gating)
    invite_row = None
    if body.invite_token:
        try:
            inv = admin.table("publisher_invites").select("*").eq("token", body.invite_token).execute()
            if inv.data:
                row = inv.data[0]
                if not row.get("used_at"):
                    invite_row = row
        except Exception:
            pass  # Invite lookup failure is non-fatal

    # Create Supabase Auth user
    try:
        auth_result = admin.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,
        })
        user_id = auth_result.user.id
    except Exception as e:
        err_msg = str(e)
        if "already been registered" in err_msg or "already exists" in err_msg:
            raise HTTPException(409, "An account with this email already exists")
        raise HTTPException(400, f"Failed to create account: {err_msg}")

    # Insert publisher record
    now = datetime.now(timezone.utc).isoformat()
    pub_data = {
        "user_id": str(user_id),
        "company_name": body.company_name,
        "contact_name": body.contact_name,
        "email": body.email,
        "phone": body.phone or "",
        "website": body.website or "",
        "mailing_address": body.mailing_address or "",
        "city": body.city or "",
        "state": body.state or "",
        "zip_code": body.zip_code or "",
        "status": "active",
        "agreement_accepted_at": now,
        "created_at": now,
        "last_login_at": now,
    }
    try:
        insert_result = admin.table("publishers").insert(pub_data).execute()
        publisher = insert_result.data[0] if insert_result.data else pub_data
    except Exception as e:
        raise HTTPException(500, f"Failed to create publisher profile: {e}")

    # Mark invite as used
    if invite_row:
        try:
            admin.table("publisher_invites").update({
                "used_at": now,
                "used_by": str(user_id),
            }).eq("id", invite_row["id"]).execute()
        except Exception:
            pass

    # Sign in to get session tokens
    try:
        sign_in = anon.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password,
        })
        session = {
            "access_token": sign_in.session.access_token,
            "refresh_token": sign_in.session.refresh_token,
        }
    except Exception:
        session = None

    # Telegram notification
    _send_telegram(
        f"\U0001f3e2 New publisher signed up: {body.company_name} ({body.email})"
    )

    return {"session": session, "publisher": publisher}


@router.post("/login")
async def publisher_login(body: LoginRequest):
    """Publisher login — returns session tokens and publisher profile."""
    anon = get_anon_client()
    admin = get_admin_client()

    try:
        sign_in = anon.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password,
        })
    except Exception as e:
        raise HTTPException(401, "Invalid email or password")

    user_id = str(sign_in.user.id)

    # Look up publisher record
    result = admin.table("publishers").select("*").eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(403, "No publisher account found for this email")

    publisher = result.data[0]

    # Update last_login_at
    try:
        now = datetime.now(timezone.utc).isoformat()
        admin.table("publishers").update({"last_login_at": now}).eq("id", publisher["id"]).execute()
        publisher["last_login_at"] = now
    except Exception:
        pass

    session = {
        "access_token": sign_in.session.access_token,
        "refresh_token": sign_in.session.refresh_token,
    }

    return {"session": session, "publisher": publisher}


@router.get("/me")
async def publisher_me(request: Request):
    """Get current publisher profile (requires auth)."""
    publisher = await get_current_publisher(request)
    return publisher


@router.patch("/me")
async def publisher_update_profile(request: Request, body: UpdateProfileRequest):
    """Update publisher profile fields."""
    publisher = await get_current_publisher(request)
    admin = get_admin_client()

    updates = {}
    for field in ["phone", "website", "mailing_address", "city", "state", "zip_code"]:
        val = getattr(body, field, None)
        if val is not None:
            updates[field] = val

    if not updates:
        return publisher

    result = admin.table("publishers").update(updates).eq("id", publisher["id"]).execute()
    return result.data[0] if result.data else {**publisher, **updates}


@router.post("/refresh")
async def publisher_refresh(body: RefreshRequest):
    """Refresh Supabase session tokens."""
    anon = get_anon_client()
    try:
        result = anon.auth.refresh_session(body.refresh_token)
        return {
            "session": {
                "access_token": result.session.access_token,
                "refresh_token": result.session.refresh_token,
            }
        }
    except Exception:
        raise HTTPException(401, "Invalid or expired refresh token")


@router.post("/logout")
async def publisher_logout():
    """Publisher logout — stateless JWT, just return OK."""
    return {"ok": True}


@router.post("/forgot-password")
async def publisher_forgot_password(body: ForgotPasswordRequest):
    """Send password reset email. Returns 200 regardless to avoid leaking accounts."""
    anon = get_anon_client()
    try:
        anon.auth.reset_password_email(body.email)
    except Exception:
        pass  # Don't leak whether email exists
    return {"ok": True, "message": "If an account exists, a reset link has been sent"}
