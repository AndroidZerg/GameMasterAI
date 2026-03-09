"""Menu item image gallery — CRUD, bulk import, public serving.

Admin endpoints require staff PIN via X-Staff-Pin header.
Images stored as BLOB in Turso (no file system dependency).
"""

import asyncio
import io
import json
import logging
import os
import re
import time
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File, Header
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List, Optional

from app.services.turso import get_menu_db
from app.api.routes.thaihouse import invalidate_menu_cache

logger = logging.getLogger(__name__)

router = APIRouter(tags=["menu-images"])

STAFF_PIN = os.getenv("DRINK_CLUB_STAFF_PIN", "1234")

_AGENTS_DIR = Path(__file__).resolve().parents[4] / "agents"


# ── Helpers ──────────────────────────────────────────────────────────────────

def _verify_pin(pin: Optional[str]):
    if not pin or pin != STAFF_PIN:
        raise HTTPException(status_code=403, detail="Invalid PIN")


def _resize_image(raw_bytes: bytes):
    """Resize image to full (800px) + thumb (200px) JPEG blobs using PIL."""
    from PIL import Image

    img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")

    # Full size
    full = img.copy()
    full.thumbnail((800, 800))
    buf_full = io.BytesIO()
    full.save(buf_full, format="JPEG", quality=85)

    # Thumbnail
    thumb = img.copy()
    thumb.thumbnail((200, 200))
    buf_thumb = io.BytesIO()
    thumb.save(buf_thumb, format="JPEG", quality=80)

    return buf_full.getvalue(), buf_thumb.getvalue()


def _get_item_by_slug(db, slug: str):
    """Look up a menu item by slug, return (id, name) or raise 404."""
    row = db.execute(
        "SELECT id, name FROM menu_items WHERE slug = ?", (slug,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Menu item '{slug}' not found")
    return row[0], row[1]


def _ensure_single_active(db, item_id: int, new_active_id: int):
    """Demote any existing active image for this item, promote the new one."""
    db.execute(
        "UPDATE menu_item_images SET status = 'candidate', updated_at = datetime('now') "
        "WHERE item_id = ? AND status = 'active' AND id != ?",
        (item_id, new_active_id)
    )
    db.execute(
        "UPDATE menu_item_images SET status = 'active', updated_at = datetime('now') WHERE id = ?",
        (new_active_id,)
    )
    db.commit()


def _auto_activate_if_first(db, item_id: int, image_id: int):
    """If this is the only image for the item, auto-set it as active."""
    count = db.execute(
        "SELECT COUNT(*) FROM menu_item_images WHERE item_id = ?", (item_id,)
    ).fetchone()[0]
    if count == 1:
        db.execute(
            "UPDATE menu_item_images SET status = 'active', updated_at = datetime('now') WHERE id = ?",
            (image_id,)
        )
        db.commit()


async def _download_image_from_url(url: str) -> bytes:
    """Download image bytes from a stock photo page URL.

    Handles Unsplash (direct URL construction), Pexels/Pixabay (og:image scrape).
    """
    # Unsplash: extract photo ID → direct image URL
    unsplash_match = re.search(r"unsplash\.com/photos/(?:[^/]+-)?([a-zA-Z0-9_-]+)", url)
    if unsplash_match:
        photo_id = unsplash_match.group(1)
        direct_url = f"https://images.unsplash.com/photo-{photo_id}?w=800&q=80"
        # Try direct URL first, fall back to og:image
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
                resp = await client.get(direct_url)
                if resp.status_code == 200 and len(resp.content) > 1000:
                    return resp.content
        except Exception:
            pass
        # Fallback: scrape og:image
        return await _scrape_og_image(url)

    # Pexels or Pixabay: scrape og:image
    if "pexels.com" in url or "pixabay.com" in url:
        return await _scrape_og_image(url)

    # Generic URL: try direct download
    async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
        resp = await client.get(url)
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Failed to download from URL: {resp.status_code}")
        return resp.content


async def _scrape_og_image(page_url: str) -> bytes:
    """Fetch a page and extract og:image, then download that image."""
    async with httpx.AsyncClient(follow_redirects=True, timeout=15, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }) as client:
        resp = await client.get(page_url)
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Could not fetch page: {resp.status_code}")

        html = resp.text
        # Look for og:image meta tag
        og_match = re.search(
            r'<meta\s+(?:property|name)=["\']og:image["\']\s+content=["\']([^"\']+)["\']',
            html, re.IGNORECASE
        )
        if not og_match:
            # Try reversed attribute order
            og_match = re.search(
                r'<meta\s+content=["\']([^"\']+)["\']\s+(?:property|name)=["\']og:image["\']',
                html, re.IGNORECASE
            )
        if not og_match:
            raise HTTPException(status_code=400, detail="Could not find og:image on page")

        img_url = og_match.group(1)
        img_resp = await client.get(img_url)
        if img_resp.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Failed to download og:image: {img_resp.status_code}")
        return img_resp.content


def _parse_markdown(md_text: str) -> list:
    """Parse the chaclub-images-all.md format into structured data.

    Returns: [{"drink_name": str, "images": [{"url": str, "alt": str, "desc": str}]}]
    """
    drinks = []
    current_drink = None

    for line in md_text.split("\n"):
        line = line.strip()

        # Drink header: ## Drink Name
        if line.startswith("## "):
            drink_name = line[3:].strip()
            current_drink = {"drink_name": drink_name, "images": []}
            drinks.append(current_drink)
            continue

        # Image entry: N. ![alt](url) — "description"
        img_match = re.match(
            r'\d+\.\s*!\[([^\]]*)\]\(([^)]+)\)\s*(?:—|--|-)\s*"([^"]*)"',
            line
        )
        if img_match and current_drink is not None:
            current_drink["images"].append({
                "alt": img_match.group(1),
                "url": img_match.group(2),
                "desc": img_match.group(3),
            })

    return drinks


def _match_drink_to_item(db, drink_name: str):
    """Match a markdown drink name to a menu_items row.

    Tries exact match first, then suffix-strip fallback (e.g. "Black Milk Tea Iced" → "Black Milk Tea").
    """
    row = db.execute(
        "SELECT id, name FROM menu_items WHERE name = ?", (drink_name,)
    ).fetchone()
    if row:
        return row[0], row[1]

    # Suffix-strip: remove trailing "Iced", "Frappe", etc.
    stripped = re.sub(r'\s+(Iced|Frappe|Hot)\s*$', '', drink_name, flags=re.IGNORECASE).strip()
    if stripped != drink_name:
        row = db.execute(
            "SELECT id, name FROM menu_items WHERE name = ?", (stripped,)
        ).fetchone()
        if row:
            return row[0], row[1]

    return None, None


# ── Admin Endpoints ──────────────────────────────────────────────────────────

@router.get("/api/admin/menu-images/{item_slug}")
async def list_item_images(item_slug: str, x_staff_pin: Optional[str] = Header(None)):
    _verify_pin(x_staff_pin)
    db = get_menu_db()
    item_id, item_name = _get_item_by_slug(db, item_slug)

    rows = db.execute(
        """SELECT id, image_url, image_filename, alt_text, source, status,
                  sort_order, clicks, orders, created_at
           FROM menu_item_images
           WHERE item_id = ?
           ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'candidate' THEN 1
                    WHEN 'hidden' THEN 2 ELSE 3 END, sort_order""",
        (item_id,)
    ).fetchall()

    images = []
    for r in rows:
        images.append({
            "id": r[0], "image_url": r[1], "filename": r[2], "alt_text": r[3],
            "source": r[4], "status": r[5], "sort_order": r[6],
            "clicks": r[7], "orders": r[8], "created_at": r[9],
            "has_blob": True,  # all stored images have blobs
        })

    return {"item_id": item_id, "item_name": item_name, "images": images}


@router.post("/api/admin/menu-images/{item_slug}/upload")
async def upload_image(
    item_slug: str,
    file: UploadFile = File(...),
    x_staff_pin: Optional[str] = Header(None),
):
    _verify_pin(x_staff_pin)
    db = get_menu_db()
    item_id, _ = _get_item_by_slug(db, item_slug)

    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    full_blob, thumb_blob = _resize_image(raw)

    db.execute(
        """INSERT INTO menu_item_images
           (item_id, image_blob, image_thumb_blob, image_filename, alt_text, source, status)
           VALUES (?, ?, ?, ?, ?, 'upload', 'candidate')""",
        (item_id, full_blob, thumb_blob, file.filename, "")
    )
    db.commit()

    image_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]
    _auto_activate_if_first(db, item_id, image_id)
    invalidate_menu_cache()

    return {"id": image_id, "status": "ok"}


@router.post("/api/admin/menu-images/{item_slug}/import-url")
async def import_from_url(
    item_slug: str,
    x_staff_pin: Optional[str] = Header(None),
    url: str = "",
    alt: str = "",
):
    _verify_pin(x_staff_pin)
    db = get_menu_db()
    item_id, _ = _get_item_by_slug(db, item_slug)

    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    raw = await _download_image_from_url(url)
    full_blob, thumb_blob = _resize_image(raw)

    db.execute(
        """INSERT INTO menu_item_images
           (item_id, image_url, image_blob, image_thumb_blob, alt_text, source, status)
           VALUES (?, ?, ?, ?, ?, 'url_import', 'candidate')""",
        (item_id, url, full_blob, thumb_blob, alt)
    )
    db.commit()

    image_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]
    _auto_activate_if_first(db, item_id, image_id)
    invalidate_menu_cache()

    return {"id": image_id, "status": "ok"}


class ImageUpdateRequest(BaseModel):
    status: Optional[str] = None
    sort_order: Optional[int] = None
    alt_text: Optional[str] = None


@router.put("/api/admin/menu-images/{image_id}")
async def update_image(
    image_id: int,
    req: ImageUpdateRequest,
    x_staff_pin: Optional[str] = Header(None),
):
    _verify_pin(x_staff_pin)
    db = get_menu_db()

    row = db.execute(
        "SELECT id, item_id, status FROM menu_item_images WHERE id = ?", (image_id,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Image not found")

    if req.status is not None:
        valid = {"active", "candidate", "hidden", "rejected"}
        if req.status not in valid:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid}")

        if req.status == "active":
            _ensure_single_active(db, row[1], image_id)
        else:
            db.execute(
                "UPDATE menu_item_images SET status = ?, updated_at = datetime('now') WHERE id = ?",
                (req.status, image_id)
            )
            db.commit()

    if req.sort_order is not None:
        db.execute(
            "UPDATE menu_item_images SET sort_order = ?, updated_at = datetime('now') WHERE id = ?",
            (req.sort_order, image_id)
        )
        db.commit()

    if req.alt_text is not None:
        db.execute(
            "UPDATE menu_item_images SET alt_text = ?, updated_at = datetime('now') WHERE id = ?",
            (req.alt_text, image_id)
        )
        db.commit()

    invalidate_menu_cache()
    return {"status": "ok"}


@router.delete("/api/admin/menu-images/{image_id}")
async def delete_image(
    image_id: int,
    x_staff_pin: Optional[str] = Header(None),
):
    _verify_pin(x_staff_pin)
    db = get_menu_db()

    row = db.execute("SELECT id FROM menu_item_images WHERE id = ?", (image_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Image not found")

    db.execute("DELETE FROM menu_item_images WHERE id = ?", (image_id,))
    db.commit()
    invalidate_menu_cache()
    return {"status": "ok"}


@router.post("/api/admin/menu-images/bulk-import")
async def bulk_import(x_staff_pin: Optional[str] = Header(None)):
    """Parse chaclub-images-all.md, download all images, import into DB."""
    _verify_pin(x_staff_pin)

    md_path = _AGENTS_DIR / "chaclub-images-all.md"
    if not md_path.exists():
        raise HTTPException(status_code=404, detail="chaclub-images-all.md not found")

    md_text = md_path.read_text(encoding="utf-8")
    drinks = _parse_markdown(md_text)

    db = get_menu_db()
    results = {"imported": 0, "skipped": 0, "failed": 0, "details": []}

    for drink in drinks:
        item_id, item_name = _match_drink_to_item(db, drink["drink_name"])
        if item_id is None:
            results["skipped"] += len(drink["images"])
            results["details"].append(f"No match: {drink['drink_name']}")
            continue

        # Check how many images already exist for this item
        existing = db.execute(
            "SELECT COUNT(*) FROM menu_item_images WHERE item_id = ?", (item_id,)
        ).fetchone()[0]

        for idx, img in enumerate(drink["images"]):
            # Skip if URL already imported
            dup = db.execute(
                "SELECT id FROM menu_item_images WHERE item_id = ? AND image_url = ?",
                (item_id, img["url"])
            ).fetchone()
            if dup:
                results["skipped"] += 1
                continue

            try:
                raw = await _download_image_from_url(img["url"])
                full_blob, thumb_blob = _resize_image(raw)

                status = "active" if (existing == 0 and idx == 0) else "candidate"

                db.execute(
                    """INSERT INTO menu_item_images
                       (item_id, image_url, image_blob, image_thumb_blob, alt_text,
                        source, status, sort_order)
                       VALUES (?, ?, ?, ?, ?, 'bulk_import', ?, ?)""",
                    (item_id, img["url"], full_blob, thumb_blob,
                     img["alt"], status, existing + idx)
                )
                db.commit()
                results["imported"] += 1
                existing += 1

                # Rate limit between downloads
                await asyncio.sleep(1.5)

            except Exception as e:
                results["failed"] += 1
                results["details"].append(f"Failed: {drink['drink_name']} #{idx+1}: {str(e)[:80]}")
                logger.warning(f"Bulk import failed for {img['url']}: {e}")

    results["details"].append(f"Done: {results['imported']} imported, {results['skipped']} skipped, {results['failed']} failed")
    invalidate_menu_cache()
    return results


# ── Public Endpoints (no auth) ───────────────────────────────────────────────

@router.get("/api/public/menu-images/{image_id}")
async def serve_image(image_id: int):
    """Serve full-size JPEG blob with 24hr cache."""
    db = get_menu_db()
    row = db.execute(
        "SELECT image_blob FROM menu_item_images WHERE id = ?", (image_id,)
    ).fetchone()
    if not row or not row[0]:
        raise HTTPException(status_code=404, detail="Image not found")

    return Response(
        content=row[0],
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get("/api/public/menu-images/{image_id}/thumb")
async def serve_thumbnail(image_id: int):
    """Serve thumbnail JPEG blob with 24hr cache."""
    db = get_menu_db()
    row = db.execute(
        "SELECT image_thumb_blob FROM menu_item_images WHERE id = ?", (image_id,)
    ).fetchone()
    if not row or not row[0]:
        raise HTTPException(status_code=404, detail="Thumbnail not found")

    return Response(
        content=row[0],
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )
