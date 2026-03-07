"""Admin photo management for Thai House menu items."""

import json
import logging
import os
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, Header
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["menu-photos"])

ADMIN_PIN = os.getenv("DRINK_CLUB_STAFF_PIN", "1234")

_CONTENT_DIR = Path(__file__).resolve().parents[4] / "content"
_MENU_JSON = _CONTENT_DIR / "menus" / "meetup.json"
_IMG_DIR = _CONTENT_DIR / "images" / "menu"


def _verify_pin(pin: Optional[str]):
    if not pin or pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid PIN")


def _slugify(name: str) -> str:
    s = name.lower()
    s = re.sub(r"\([^)]*\)", "", s).strip()
    s = re.sub(r"[&]", "and", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def _load_menu():
    with open(_MENU_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_menu(menu):
    with open(_MENU_JSON, "w", encoding="utf-8") as f:
        json.dump(menu, f, indent=2, ensure_ascii=False)


@router.get("/menu-items")
async def list_menu_items(x_admin_pin: Optional[str] = Header(None)):
    """List all menu items grouped by category with photo status."""
    _verify_pin(x_admin_pin)
    menu = _load_menu()
    categories = []
    for section in menu.get("sections", []):
        items = []
        for item in section.get("items", []):
            slug = item.get("image", _slugify(item["name"]))
            has_photo = (_IMG_DIR / f"{slug}.jpg").exists()
            items.append({
                "name": item["name"],
                "price": item["price"],
                "slug": slug,
                "has_photo": has_photo,
                "image": item.get("image"),
            })
        categories.append({
            "name": section["name"],
            "icon": section.get("icon", ""),
            "items": items,
        })
    return {"categories": categories}


@router.post("/menu-photos/{slug}")
async def upload_photo(slug: str, file: UploadFile = File(...),
                       x_admin_pin: Optional[str] = Header(None)):
    """Upload a photo for a menu item. Resizes to full + thumb."""
    _verify_pin(x_admin_pin)

    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        from PIL import Image
        import io
    except ImportError:
        raise HTTPException(status_code=500, detail="Pillow not installed on server")

    contents = await file.read()
    img = Image.open(io.BytesIO(contents)).convert("RGB")

    _IMG_DIR.mkdir(parents=True, exist_ok=True)

    # Full size (800px)
    img_full = img.copy()
    img_full.thumbnail((800, 800), Image.LANCZOS)
    img_full.save(_IMG_DIR / f"{slug}.jpg", "JPEG", quality=85)

    # Thumbnail (400px)
    img_thumb = img.copy()
    img_thumb.thumbnail((400, 400), Image.LANCZOS)
    img_thumb.save(_IMG_DIR / f"{slug}-thumb.jpg", "JPEG", quality=80)

    # Update menu JSON — find item and set image field
    menu = _load_menu()
    found = False
    for section in menu.get("sections", []):
        for item in section.get("items", []):
            if item.get("image") == slug or _slugify(item["name"]) == slug:
                item["image"] = slug
                found = True
                break
        if found:
            break

    if found:
        _save_menu(menu)

    return {"success": True, "slug": slug, "menu_updated": found}


@router.delete("/menu-photos/{slug}")
async def delete_photo(slug: str, x_admin_pin: Optional[str] = Header(None)):
    """Delete a menu item photo."""
    _verify_pin(x_admin_pin)

    full_path = _IMG_DIR / f"{slug}.jpg"
    thumb_path = _IMG_DIR / f"{slug}-thumb.jpg"

    deleted = False
    if full_path.exists():
        full_path.unlink()
        deleted = True
    if thumb_path.exists():
        thumb_path.unlink()
        deleted = True

    if not deleted:
        raise HTTPException(status_code=404, detail="Photo not found")

    # Remove image field from menu JSON
    menu = _load_menu()
    for section in menu.get("sections", []):
        for item in section.get("items", []):
            if item.get("image") == slug:
                del item["image"]
                break
    _save_menu(menu)

    return {"success": True, "slug": slug}
