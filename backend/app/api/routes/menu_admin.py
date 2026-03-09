"""Full menu administration: items CRUD, toggle CRUD, photo management.

All endpoints require staff PIN via X-Staff-Pin header.
Primary storage: Turso DB. Also syncs to content/menus/meetup.json as backup.
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

from app.services.turso import get_menu_db
from app.api.routes.thaihouse import invalidate_menu_cache

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


def _sync_json_from_turso():
    """Sync Turso menu state back to the JSON file as a backup."""
    invalidate_menu_cache()
    try:
        db = get_menu_db()
        toggle_rows = db.execute(
            "SELECT id, name, required, options FROM menu_toggles ORDER BY sort_order"
        ).fetchall()
        toggles = [
            {"id": r[0], "name": r[1], "required": bool(r[2]),
             "options": json.loads(r[3])}
            for r in toggle_rows
        ]

        cat_rows = db.execute(
            "SELECT id, name, icon FROM menu_categories ORDER BY sort_order"
        ).fetchall()
        sections = []
        for cat in cat_rows:
            item_rows = db.execute(
                """SELECT slug, name, description, price, image, toggles,
                          allows_modifications
                   FROM menu_items WHERE category_id = ? ORDER BY sort_order""",
                (cat[0],)
            ).fetchall()
            items = []
            for r in item_rows:
                item = {"name": r[1], "price": r[3]}
                if r[2]:
                    item["description"] = r[2]
                if r[4]:
                    item["image"] = r[4]
                item_toggles = json.loads(r[5]) if r[5] else []
                if item_toggles:
                    item["toggles"] = item_toggles
                if bool(r[6]):
                    item["allows_modifications"] = True
                items.append(item)
            sections.append({"name": cat[1], "icon": cat[2], "items": items})

        menu = {"toggles": toggles, "sections": sections}
        _MENU_JSON.parent.mkdir(parents=True, exist_ok=True)
        tmp_fd, tmp_path = tempfile.mkstemp(
            dir=str(_MENU_JSON.parent), suffix=".json.tmp"
        )
        try:
            with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
                json.dump(menu, f, indent=2, ensure_ascii=False)
            if _MENU_JSON.exists():
                _MENU_JSON.unlink()
            Path(tmp_path).rename(_MENU_JSON)
        except Exception:
            try:
                Path(tmp_path).unlink(missing_ok=True)
            except Exception:
                pass
            raise
    except Exception as e:
        logger.error(f"JSON sync from Turso failed: {e}")


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
    db = get_menu_db()

    toggle_rows = db.execute(
        "SELECT id, name, required, options FROM menu_toggles ORDER BY sort_order"
    ).fetchall()
    toggles = [
        {"id": r[0], "name": r[1], "required": bool(r[2]),
         "options": json.loads(r[3])}
        for r in toggle_rows
    ]

    cat_rows = db.execute(
        "SELECT id, name, icon FROM menu_categories ORDER BY sort_order"
    ).fetchall()

    # Batch-fetch active gallery images (avoid N+1)
    active_gallery = {}
    try:
        gal_rows = db.execute(
            "SELECT item_id, id FROM menu_item_images WHERE status = 'active'"
        ).fetchall()
        for gr in gal_rows:
            active_gallery[gr[0]] = gr[1]
    except Exception:
        pass

    categories = []
    for cat in cat_rows:
        item_rows = db.execute(
            """SELECT id, slug, name, description, price, image, toggles,
                      allows_modifications
               FROM menu_items WHERE category_id = ? ORDER BY sort_order""",
            (cat[0],)
        ).fetchall()
        items = []
        for r in item_rows:
            item_id = r[0]
            slug = r[1]
            has_file = (_IMG_DIR / f"{slug}.jpg").exists()
            gal_id = active_gallery.get(item_id)
            items.append({
                "name": r[2],
                "description": r[3] or "",
                "price": r[4],
                "slug": slug,
                "has_photo": has_file or bool(gal_id),
                "image": r[5],
                "gallery_image_id": gal_id,
                "toggles": json.loads(r[6]) if r[6] else [],
                "allows_modifications": bool(r[7]),
            })
        categories.append({
            "name": cat[1],
            "icon": cat[2],
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
    db = get_menu_db()

    # Find the target category
    cat_row = db.execute(
        "SELECT id FROM menu_categories WHERE name = ?", (req.category,)
    ).fetchone()
    if not cat_row:
        raise HTTPException(status_code=404, detail=f"Category not found: {req.category}")

    slug = _slugify(req.name)

    # Check for duplicate
    existing = db.execute(
        "SELECT id FROM menu_items WHERE slug = ?", (slug,)
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail=f"Item already exists: {req.name}")

    # Get max sort_order for this category
    max_sort = db.execute(
        "SELECT COALESCE(MAX(sort_order), -1) FROM menu_items WHERE category_id = ?",
        (cat_row[0],)
    ).fetchone()[0]

    db.execute(
        """INSERT INTO menu_items
           (slug, category_id, name, description, price, toggles,
            allows_modifications, active, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)""",
        (slug, cat_row[0], req.name, req.description, req.price,
         json.dumps(req.toggles), 1 if req.allows_modifications else 0,
         max_sort + 1)
    )
    db.commit()
    _sync_json_from_turso()

    return {
        "success": True,
        "slug": slug,
        "item": {"name": req.name, "price": req.price, "slug": slug,
                 "has_photo": False, "image": None},
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
    db = get_menu_db()

    existing = db.execute(
        "SELECT id, name, image FROM menu_items WHERE slug = ?", (slug,)
    ).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail=f"Item not found: {slug}")

    updates = []
    params = []
    if req.name is not None:
        updates.append("name = ?")
        params.append(req.name)
    if req.description is not None:
        updates.append("description = ?")
        params.append(req.description)
    if req.price is not None:
        updates.append("price = ?")
        params.append(req.price)
    if req.toggles is not None:
        updates.append("toggles = ?")
        params.append(json.dumps(req.toggles))
    if req.allows_modifications is not None:
        updates.append("allows_modifications = ?")
        params.append(1 if req.allows_modifications else 0)

    if updates:
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(slug)
        db.execute(
            f"UPDATE menu_items SET {', '.join(updates)} WHERE slug = ?",
            tuple(params)
        )
        db.commit()
        _sync_json_from_turso()

    # Return updated item
    row = db.execute(
        "SELECT slug, name, description, price, image, toggles, allows_modifications FROM menu_items WHERE slug = ?",
        (slug,)
    ).fetchone()
    item = {
        "name": row[1], "description": row[2], "price": row[3],
        "image": row[4], "toggles": json.loads(row[5]) if row[5] else [],
        "allows_modifications": bool(row[6]), "slug": row[0],
    }
    return {"success": True, "slug": slug, "item": item}


@router.delete("/menu-items/{slug}")
async def delete_menu_item(slug: str,
                           x_staff_pin: Optional[str] = Header(None)):
    """Remove an item from the menu. Also deletes associated photos."""
    _verify_pin(x_staff_pin)
    db = get_menu_db()

    existing = db.execute(
        "SELECT id, image FROM menu_items WHERE slug = ?", (slug,)
    ).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail=f"Item not found: {slug}")

    photo_slug = existing[1] or slug
    _delete_photo_files(photo_slug)

    db.execute("DELETE FROM menu_items WHERE slug = ?", (slug,))
    db.commit()
    _sync_json_from_turso()

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

    # Update Turso — set image field
    db = get_menu_db()
    result = db.execute(
        "UPDATE menu_items SET image = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ?",
        (slug, slug)
    )
    db.commit()
    _sync_json_from_turso()

    return {"success": True, "slug": slug, "menu_updated": True}


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

    # Remove image field in Turso
    db = get_menu_db()
    db.execute(
        "UPDATE menu_items SET image = NULL, updated_at = CURRENT_TIMESTAMP WHERE slug = ?",
        (slug,)
    )
    db.commit()
    _sync_json_from_turso()

    return {"success": True, "slug": slug}


# ── Toggle Management ────────────────────────────────────────────────────────

@router.get("/toggles")
async def list_toggles(x_staff_pin: Optional[str] = Header(None)):
    """Return all customization toggles."""
    _verify_pin(x_staff_pin)
    db = get_menu_db()

    toggle_rows = db.execute(
        "SELECT id, name, required, options FROM menu_toggles ORDER BY sort_order"
    ).fetchall()

    # Count usage
    toggles = []
    for r in toggle_rows:
        tid = r[0]
        count = 0
        item_rows = db.execute(
            "SELECT toggles FROM menu_items WHERE toggles LIKE ?",
            (f'%"{tid}"%',)
        ).fetchall()
        count = len(item_rows)
        toggles.append({
            "id": tid, "name": r[1], "required": bool(r[2]),
            "options": json.loads(r[3]), "item_count": count,
        })

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

    tid = req.id.lower().strip()
    if not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", tid):
        raise HTTPException(status_code=400, detail="Toggle ID must be lowercase, hyphenated")

    db = get_menu_db()
    existing = db.execute("SELECT id FROM menu_toggles WHERE id = ?", (tid,)).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail=f"Toggle already exists: {tid}")

    max_sort = db.execute("SELECT COALESCE(MAX(sort_order), -1) FROM menu_toggles").fetchone()[0]

    new_toggle = {
        "id": tid, "name": req.name, "required": req.required,
        "options": [opt.model_dump() for opt in req.options],
    }
    db.execute(
        "INSERT INTO menu_toggles (id, name, required, options, sort_order) VALUES (?, ?, ?, ?, ?)",
        (tid, req.name, 1 if req.required else 0,
         json.dumps(new_toggle["options"]), max_sort + 1)
    )
    db.commit()
    _sync_json_from_turso()

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
    db = get_menu_db()

    existing = db.execute("SELECT id FROM menu_toggles WHERE id = ?", (toggle_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail=f"Toggle not found: {toggle_id}")

    updates = []
    params = []
    if req.name is not None:
        updates.append("name = ?")
        params.append(req.name)
    if req.required is not None:
        updates.append("required = ?")
        params.append(1 if req.required else 0)
    if req.options is not None:
        updates.append("options = ?")
        params.append(json.dumps([opt.model_dump() for opt in req.options]))

    if updates:
        params.append(toggle_id)
        db.execute(
            f"UPDATE menu_toggles SET {', '.join(updates)} WHERE id = ?",
            tuple(params)
        )
        db.commit()
        _sync_json_from_turso()

    row = db.execute(
        "SELECT id, name, required, options FROM menu_toggles WHERE id = ?", (toggle_id,)
    ).fetchone()
    toggle = {
        "id": row[0], "name": row[1], "required": bool(row[2]),
        "options": json.loads(row[3]),
    }
    return {"success": True, "toggle": toggle}


@router.delete("/toggles/{toggle_id}")
async def delete_toggle(toggle_id: str,
                        x_staff_pin: Optional[str] = Header(None)):
    """Delete a toggle. Also removes it from all menu items."""
    _verify_pin(x_staff_pin)
    db = get_menu_db()

    existing = db.execute("SELECT id FROM menu_toggles WHERE id = ?", (toggle_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail=f"Toggle not found: {toggle_id}")

    # Remove from all items
    items_affected = 0
    item_rows = db.execute(
        "SELECT id, toggles FROM menu_items WHERE toggles LIKE ?",
        (f'%"{toggle_id}"%',)
    ).fetchall()
    for row in item_rows:
        item_toggles = json.loads(row[1]) if row[1] else []
        if toggle_id in item_toggles:
            item_toggles = [t for t in item_toggles if t != toggle_id]
            db.execute(
                "UPDATE menu_items SET toggles = ? WHERE id = ?",
                (json.dumps(item_toggles), row[0])
            )
            items_affected += 1

    db.execute("DELETE FROM menu_toggles WHERE id = ?", (toggle_id,))
    db.commit()
    _sync_json_from_turso()

    return {"success": True, "toggle_id": toggle_id, "items_affected": items_affected}


# ── Category Management ──────────────────────────────────────────────────────

class CreateCategoryRequest(BaseModel):
    name: str
    icon: str = ""


class UpdateCategoryRequest(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None


@router.get("/categories")
async def list_categories(x_staff_pin: Optional[str] = Header(None)):
    """List all categories with item counts."""
    _verify_pin(x_staff_pin)
    db = get_menu_db()
    rows = db.execute(
        "SELECT id, name, icon, sort_order FROM menu_categories ORDER BY sort_order"
    ).fetchall()
    categories = []
    for r in rows:
        count = db.execute(
            "SELECT COUNT(*) FROM menu_items WHERE category_id = ?", (r[0],)
        ).fetchone()[0]
        categories.append({
            "id": r[0], "name": r[1], "icon": r[2] or "",
            "sort_order": r[3], "item_count": count,
        })
    return {"categories": categories}


@router.post("/categories")
async def create_category(req: CreateCategoryRequest,
                          x_staff_pin: Optional[str] = Header(None)):
    """Create a new menu category."""
    _verify_pin(x_staff_pin)
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    db = get_menu_db()

    existing = db.execute(
        "SELECT id FROM menu_categories WHERE name = ?", (req.name.strip(),)
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail=f"Category already exists: {req.name}")

    max_sort = db.execute(
        "SELECT COALESCE(MAX(sort_order), -1) FROM menu_categories"
    ).fetchone()[0]

    db.execute(
        "INSERT INTO menu_categories (name, icon, sort_order) VALUES (?, ?, ?)",
        (req.name.strip(), req.icon.strip(), max_sort + 1)
    )
    db.commit()
    _sync_json_from_turso()

    cat_id = db.execute("SELECT id FROM menu_categories WHERE name = ?", (req.name.strip(),)).fetchone()[0]
    return {"success": True, "category": {"id": cat_id, "name": req.name.strip(), "icon": req.icon.strip()}}


@router.put("/categories/{category_id}")
async def update_category(category_id: int, req: UpdateCategoryRequest,
                          x_staff_pin: Optional[str] = Header(None)):
    """Update a category name and/or icon."""
    _verify_pin(x_staff_pin)
    db = get_menu_db()

    existing = db.execute(
        "SELECT id, name, icon FROM menu_categories WHERE id = ?", (category_id,)
    ).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")

    updates = []
    params = []
    if req.name is not None:
        # Check uniqueness
        dup = db.execute(
            "SELECT id FROM menu_categories WHERE name = ? AND id != ?",
            (req.name.strip(), category_id)
        ).fetchone()
        if dup:
            raise HTTPException(status_code=409, detail=f"Category name already taken: {req.name}")
        updates.append("name = ?")
        params.append(req.name.strip())
    if req.icon is not None:
        updates.append("icon = ?")
        params.append(req.icon.strip())

    if updates:
        params.append(category_id)
        db.execute(f"UPDATE menu_categories SET {', '.join(updates)} WHERE id = ?", tuple(params))
        db.commit()
        _sync_json_from_turso()

    return {"success": True}


@router.delete("/categories/{category_id}")
async def delete_category(category_id: int,
                          x_staff_pin: Optional[str] = Header(None)):
    """Delete a category. Fails if it still contains items."""
    _verify_pin(x_staff_pin)
    db = get_menu_db()

    existing = db.execute(
        "SELECT id FROM menu_categories WHERE id = ?", (category_id,)
    ).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")

    count = db.execute(
        "SELECT COUNT(*) FROM menu_items WHERE category_id = ?", (category_id,)
    ).fetchone()[0]
    if count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete category with {count} item(s). Move or delete items first."
        )

    db.execute("DELETE FROM menu_categories WHERE id = ?", (category_id,))
    db.commit()
    _sync_json_from_turso()

    return {"success": True, "category_id": category_id}
