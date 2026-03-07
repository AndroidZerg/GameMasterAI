"""Full menu administration: items CRUD, toggle CRUD, photo management.

All endpoints require staff PIN via X-Staff-Pin header.
Persists to content/menus/meetup.json with atomic writes.
"""

import json
import logging
import os
import re
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, Header
from pydantic import BaseModel
from typing import List, Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["menu-admin"])

STAFF_PIN = os.getenv("DRINK_CLUB_STAFF_PIN", "1234")

_CONTENT_DIR = Path(__file__).resolve().parents[4] / "content"
_MENU_JSON = _CONTENT_DIR / "menus" / "meetup.json"
_IMG_DIR = _CONTENT_DIR / "images" / "menu"


# ── Helpers ──────────────────────────────────────────────────────────────────

def _verify_pin(pin: Optional[str]):
    if not pin or pin != STAFF_PIN:
        raise HTTPException(status_code=403, detail="Invalid PIN")


def _slugify(name: str) -> str:
    s = name.lower()
    s = re.sub(r"\([^)]*\)", "", s).strip()
    s = re.sub(r"[&]", "and", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def _load_menu() -> dict:
    with open(_MENU_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_menu(menu: dict):
    """Atomic write: write to temp file, then rename."""
    _MENU_JSON.parent.mkdir(parents=True, exist_ok=True)
    tmp_fd, tmp_path = tempfile.mkstemp(
        dir=str(_MENU_JSON.parent), suffix=".json.tmp"
    )
    try:
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
            json.dump(menu, f, indent=2, ensure_ascii=False)
        # On Windows, we need to remove target first
        if _MENU_JSON.exists():
            _MENU_JSON.unlink()
        Path(tmp_path).rename(_MENU_JSON)
    except Exception:
        # Clean up temp file on failure
        try:
            Path(tmp_path).unlink(missing_ok=True)
        except Exception:
            pass
        raise


def _find_item(menu: dict, slug: str):
    """Find item + section by slug. Returns (section, item, index) or raises 404."""
    for section in menu.get("sections", []):
        for i, item in enumerate(section.get("items", [])):
            item_slug = item.get("image", _slugify(item["name"]))
            if item_slug == slug or _slugify(item["name"]) == slug:
                return section, item, i
    raise HTTPException(status_code=404, detail=f"Item not found: {slug}")


def _delete_photo_files(slug: str):
    """Remove photo files for a slug if they exist."""
    for suffix in [".jpg", "-thumb.jpg"]:
        p = _IMG_DIR / f"{slug}{suffix}"
        if p.exists():
            p.unlink()


# ── Menu Items ───────────────────────────────────────────────────────────────

@router.get("/menu-items")
async def list_menu_items(x_staff_pin: Optional[str] = Header(None)):
    """List all menu items grouped by category with toggle and photo info."""
    _verify_pin(x_staff_pin)
    menu = _load_menu()
    toggles = menu.get("toggles", [])
    categories = []
    for section in menu.get("sections", []):
        items = []
        for item in section.get("items", []):
            slug = item.get("image", _slugify(item["name"]))
            has_photo = (_IMG_DIR / f"{slug}.jpg").exists()
            items.append({
                "name": item["name"],
                "description": item.get("description", ""),
                "price": item["price"],
                "slug": slug,
                "has_photo": has_photo,
                "image": item.get("image"),
                "toggles": item.get("toggles", []),
                "allows_modifications": item.get("allows_modifications", False),
            })
        categories.append({
            "name": section["name"],
            "icon": section.get("icon", ""),
            "items": items,
        })
    return {"categories": categories, "toggles": toggles}


class CreateItemRequest(BaseModel):
    category: str
    name: str
    description: str = ""
    price: float
    toggles: List[str] = []
    allows_modifications: bool = False


@router.post("/menu-items")
async def create_menu_item(req: CreateItemRequest,
                           x_staff_pin: Optional[str] = Header(None)):
    """Add a new item to the specified category."""
    _verify_pin(x_staff_pin)
    menu = _load_menu()

    # Find the target section
    target = None
    for section in menu.get("sections", []):
        if section["name"] == req.category:
            target = section
            break
    if not target:
        raise HTTPException(status_code=404, detail=f"Category not found: {req.category}")

    slug = _slugify(req.name)

    # Check for duplicate
    for section in menu.get("sections", []):
        for item in section.get("items", []):
            if _slugify(item["name"]) == slug:
                raise HTTPException(status_code=409, detail=f"Item already exists: {req.name}")

    new_item = {
        "name": req.name,
        "price": req.price,
        "description": req.description,
    }
    if req.toggles:
        new_item["toggles"] = req.toggles
    if req.allows_modifications:
        new_item["allows_modifications"] = True

    target["items"].append(new_item)
    _save_menu(menu)

    return {
        "success": True,
        "slug": slug,
        "item": {**new_item, "slug": slug, "has_photo": False, "image": None},
    }


class UpdateItemRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    toggles: Optional[List[str]] = None
    allows_modifications: Optional[bool] = None


@router.put("/menu-items/{slug}")
async def update_menu_item(slug: str, req: UpdateItemRequest,
                           x_staff_pin: Optional[str] = Header(None)):
    """Update an existing menu item."""
    _verify_pin(x_staff_pin)
    menu = _load_menu()
    _section, item, _idx = _find_item(menu, slug)

    if req.name is not None:
        item["name"] = req.name
    if req.description is not None:
        item["description"] = req.description
    if req.price is not None:
        item["price"] = req.price
    if req.toggles is not None:
        if req.toggles:
            item["toggles"] = req.toggles
        else:
            item.pop("toggles", None)
    if req.allows_modifications is not None:
        if req.allows_modifications:
            item["allows_modifications"] = True
        else:
            item.pop("allows_modifications", None)

    _save_menu(menu)
    new_slug = item.get("image", _slugify(item["name"]))
    return {"success": True, "slug": new_slug, "item": item}


@router.delete("/menu-items/{slug}")
async def delete_menu_item(slug: str,
                           x_staff_pin: Optional[str] = Header(None)):
    """Remove an item from the menu. Also deletes associated photos."""
    _verify_pin(x_staff_pin)
    menu = _load_menu()
    section, item, idx = _find_item(menu, slug)

    # Delete photo files
    photo_slug = item.get("image", slug)
    _delete_photo_files(photo_slug)

    section["items"].pop(idx)
    _save_menu(menu)
    return {"success": True, "slug": slug}


# ── Photo Management ─────────────────────────────────────────────────────────

@router.post("/menu-photos/{slug}")
async def upload_photo(slug: str, file: UploadFile = File(...),
                       x_staff_pin: Optional[str] = Header(None)):
    """Upload a photo for a menu item. Resizes to full + thumb."""
    _verify_pin(x_staff_pin)

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

    # Update menu JSON — set image field
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
async def delete_photo(slug: str,
                       x_staff_pin: Optional[str] = Header(None)):
    """Delete a menu item photo."""
    _verify_pin(x_staff_pin)

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


# ── Toggle Management ────────────────────────────────────────────────────────

@router.get("/toggles")
async def list_toggles(x_staff_pin: Optional[str] = Header(None)):
    """Return all customization toggles."""
    _verify_pin(x_staff_pin)
    menu = _load_menu()
    toggles = menu.get("toggles", [])

    # Count how many items use each toggle
    usage = {}
    for section in menu.get("sections", []):
        for item in section.get("items", []):
            for tid in item.get("toggles", []):
                usage[tid] = usage.get(tid, 0) + 1

    for t in toggles:
        t["item_count"] = usage.get(t["id"], 0)

    return {"toggles": toggles}


class ToggleOption(BaseModel):
    name: str
    upcharge: float = 0


class CreateToggleRequest(BaseModel):
    id: str
    name: str
    required: bool = True
    options: List[ToggleOption]


@router.post("/toggles")
async def create_toggle(req: CreateToggleRequest,
                        x_staff_pin: Optional[str] = Header(None)):
    """Create a new customization toggle."""
    _verify_pin(x_staff_pin)

    # Validate id format
    tid = req.id.lower().strip()
    if not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", tid):
        raise HTTPException(status_code=400, detail="Toggle ID must be lowercase, hyphenated")

    menu = _load_menu()
    toggles = menu.setdefault("toggles", [])

    # Check for duplicate
    if any(t["id"] == tid for t in toggles):
        raise HTTPException(status_code=409, detail=f"Toggle already exists: {tid}")

    new_toggle = {
        "id": tid,
        "name": req.name,
        "required": req.required,
        "options": [opt.model_dump() for opt in req.options],
    }
    toggles.append(new_toggle)
    _save_menu(menu)

    return {"success": True, "toggle": new_toggle}


class UpdateToggleRequest(BaseModel):
    name: Optional[str] = None
    required: Optional[bool] = None
    options: Optional[List[ToggleOption]] = None


@router.put("/toggles/{toggle_id}")
async def update_toggle(toggle_id: str, req: UpdateToggleRequest,
                        x_staff_pin: Optional[str] = Header(None)):
    """Update an existing toggle."""
    _verify_pin(x_staff_pin)
    menu = _load_menu()
    toggles = menu.get("toggles", [])

    target = None
    for t in toggles:
        if t["id"] == toggle_id:
            target = t
            break
    if not target:
        raise HTTPException(status_code=404, detail=f"Toggle not found: {toggle_id}")

    if req.name is not None:
        target["name"] = req.name
    if req.required is not None:
        target["required"] = req.required
    if req.options is not None:
        target["options"] = [opt.model_dump() for opt in req.options]

    _save_menu(menu)
    return {"success": True, "toggle": target}


@router.delete("/toggles/{toggle_id}")
async def delete_toggle(toggle_id: str,
                        x_staff_pin: Optional[str] = Header(None)):
    """Delete a toggle. Also removes it from all menu items."""
    _verify_pin(x_staff_pin)
    menu = _load_menu()
    toggles = menu.get("toggles", [])

    original_len = len(toggles)
    menu["toggles"] = [t for t in toggles if t["id"] != toggle_id]
    if len(menu["toggles"]) == original_len:
        raise HTTPException(status_code=404, detail=f"Toggle not found: {toggle_id}")

    # Remove from all items
    items_affected = 0
    for section in menu.get("sections", []):
        for item in section.get("items", []):
            item_toggles = item.get("toggles", [])
            if toggle_id in item_toggles:
                item["toggles"] = [t for t in item_toggles if t != toggle_id]
                if not item["toggles"]:
                    del item["toggles"]
                items_affected += 1

    _save_menu(menu)
    return {"success": True, "toggle_id": toggle_id, "items_affected": items_affected}
