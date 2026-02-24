"""JWT auth utilities and FastAPI dependency."""

import hashlib
import hmac
from datetime import datetime, timezone, timedelta
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_HOURS

_security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with salt. Simple but adequate for demo."""
    salt = "gmai-salt-2026"
    return hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    return hmac.compare_digest(hash_password(password), password_hash)


def create_token(venue_id: str, venue_name: str) -> str:
    payload = {
        "venue_id": venue_id,
        "venue_name": venue_name,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


async def get_current_venue(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
) -> dict:
    """FastAPI dependency: extract and validate JWT. Returns {venue_id, venue_name}."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"venue_id": payload["venue_id"], "venue_name": payload["venue_name"]}


async def get_optional_venue(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
) -> Optional[dict]:
    """Like get_current_venue but returns None instead of 401 if no token."""
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload:
        return None
    return {"venue_id": payload["venue_id"], "venue_name": payload["venue_name"]}
