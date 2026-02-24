"""F&B menu endpoints — serve and manage venue menus."""

import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_venue, get_optional_venue

router = APIRouter(prefix="/api", tags=["menu"])

_MENUS_DIR = Path(__file__).resolve().parents[4] / "content" / "menus"


def _load_menu(venue_id: str) -> Optional[dict]:
    menu_path = _MENUS_DIR / f"{venue_id}.json"
    if menu_path.exists():
        try:
            return json.loads(menu_path.read_text(encoding="utf-8"))
        except Exception:
            return None
    return None


@router.get("/venue/menu")
async def get_menu(
    venue_id: Optional[str] = None,
    venue: Optional[dict] = Depends(get_optional_venue),
):
    """Get F&B menu. Auth token -> venue's menu. venue_id param -> that venue. Default -> meepleville."""
    vid = None
    if venue:
        vid = venue["venue_id"]
    elif venue_id:
        vid = venue_id
    else:
        vid = "meepleville"

    menu = _load_menu(vid)
    if menu:
        return menu
    return {"venue_id": vid, "sections": [], "message": "No menu configured"}


class MenuUpdateRequest(BaseModel):
    sections: list[dict]


@router.post("/admin/menu")
async def update_menu(
    req: MenuUpdateRequest,
    venue: dict = Depends(get_current_venue),
):
    """Update venue's F&B menu. Requires auth."""
    vid = venue["venue_id"]
    menu_data = {"venue_id": vid, "sections": req.sections}
    _MENUS_DIR.mkdir(parents=True, exist_ok=True)
    menu_path = _MENUS_DIR / f"{vid}.json"
    menu_path.write_text(json.dumps(menu_data, indent=2, ensure_ascii=False), encoding="utf-8")
    return {"status": "ok", "venue_id": vid, "sections_count": len(req.sections)}
