"""Admin endpoints — venue config update."""

import json
import re
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin", tags=["admin"])

_VENUE_CONFIG_PATH = Path(__file__).resolve().parents[4] / "content" / "venue-config.json"
_HEX_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


class VenueUpdateRequest(BaseModel):
    venue_name: Optional[str] = None
    accent_color: Optional[str] = None
    buy_button_text: Optional[str] = None
    logo_url: Optional[str] = None
    venue_tagline: Optional[str] = None
    show_buy_button: Optional[bool] = None
    contact_email: Optional[str] = None
    default_theme: Optional[str] = None


@router.post("/venue")
async def update_venue_config(req: VenueUpdateRequest):
    """Update venue-config.json with provided fields. Only non-null fields are updated."""
    if not _VENUE_CONFIG_PATH.exists():
        raise HTTPException(status_code=404, detail="Venue config not found")

    try:
        config = json.loads(_VENUE_CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read config: {e}")

    # Validate and apply updates
    if req.venue_name is not None:
        if not req.venue_name.strip():
            raise HTTPException(status_code=400, detail="venue_name cannot be empty")
        config["venue_name"] = req.venue_name.strip()

    if req.accent_color is not None:
        if not _HEX_COLOR_RE.match(req.accent_color):
            raise HTTPException(status_code=400, detail="accent_color must be a hex color (e.g. #e94560)")
        config["accent_color"] = req.accent_color

    if req.buy_button_text is not None:
        config["buy_button_text"] = req.buy_button_text.strip()

    if req.logo_url is not None:
        config["logo_url"] = req.logo_url.strip() or None

    if req.venue_tagline is not None:
        config["venue_tagline"] = req.venue_tagline.strip()

    if req.show_buy_button is not None:
        config["show_buy_button"] = req.show_buy_button

    if req.contact_email is not None:
        config["contact_email"] = req.contact_email.strip() or None

    if req.default_theme is not None:
        if req.default_theme not in ("dark", "light"):
            raise HTTPException(status_code=400, detail="default_theme must be 'dark' or 'light'")
        config["default_theme"] = req.default_theme

    try:
        _VENUE_CONFIG_PATH.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write config: {e}")

    return config
