"""Shared FastAPI dependencies for venue platform routes."""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.auth import decode_token

_security = HTTPBearer(auto_error=False)


async def get_current_venue_admin(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> dict:
    """Require venue_admin or super_admin role."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if payload.get("role") not in ("venue_admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    return payload


async def get_current_super_admin(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> dict:
    """Require super_admin role."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if payload.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin required")
    return payload


async def get_current_lgs_admin(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> dict:
    """Require lgs_admin or super_admin role. Returns payload with lgs_id."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if payload.get("role") not in ("lgs_admin", "super_admin"):
        raise HTTPException(status_code=403, detail="LGS admin access required")
    if payload.get("role") == "lgs_admin" and not payload.get("lgs_id"):
        raise HTTPException(status_code=403, detail="LGS ID not found in token")
    return payload
