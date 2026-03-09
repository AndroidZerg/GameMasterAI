#!/usr/bin/env python3
"""Standalone script: parse chaclub-images-all.md, download images, import to Turso.

Usage:
    python scripts/import_ranger_images.py agents/chaclub-images-all.md

Requires: Pillow, httpx, libsql_experimental (or sqlite3 fallback).
Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN env vars for production.
"""

import asyncio
import io
import os
import re
import sys
import time

import httpx


def get_db():
    url = os.getenv("TURSO_DATABASE_URL", "")
    token = os.getenv("TURSO_AUTH_TOKEN", "")
    if url and token:
        import libsql_experimental as libsql
        return libsql.connect(url, auth_token=token)
    else:
        import sqlite3
        os.makedirs("data", exist_ok=True)
        return sqlite3.connect("data/analytics.db", check_same_thread=False)


def resize_image(raw_bytes):
    from PIL import Image
    img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    full = img.copy()
    full.thumbnail((800, 800))
    buf_full = io.BytesIO()
    full.save(buf_full, format="JPEG", quality=85)
    thumb = img.copy()
    thumb.thumbnail((200, 200))
    buf_thumb = io.BytesIO()
    thumb.save(buf_thumb, format="JPEG", quality=80)
    return buf_full.getvalue(), buf_thumb.getvalue()


def parse_markdown(md_text):
    drinks = []
    current = None
    for line in md_text.split("\n"):
        line = line.strip()
        if line.startswith("## "):
            current = {"drink_name": line[3:].strip(), "images": []}
            drinks.append(current)
            continue
        m = re.match(r'\d+\.\s*!\[([^\]]*)\]\(([^)]+)\)\s*(?:—|--|-)\s*"([^"]*)"', line)
        if m and current:
            current["images"].append({"alt": m.group(1), "url": m.group(2), "desc": m.group(3)})
    return drinks


def match_drink(db, name):
    row = db.execute("SELECT id, name FROM menu_items WHERE name = ?", (name,)).fetchone()
    if row:
        return row[0], row[1]
    stripped = re.sub(r'\s+(Iced|Frappe|Hot)\s*$', '', name, flags=re.IGNORECASE).strip()
    if stripped != name:
        row = db.execute("SELECT id, name FROM menu_items WHERE name = ?", (stripped,)).fetchone()
        if row:
            return row[0], row[1]
    return None, None


async def download_image(url):
    unsplash = re.search(r"unsplash\.com/photos/(?:[^/]+-)?([a-zA-Z0-9_-]+)", url)
    if unsplash:
        direct = f"https://images.unsplash.com/photo-{unsplash.group(1)}?w=800&q=80"
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=15) as c:
                r = await c.get(direct)
                if r.status_code == 200 and len(r.content) > 1000:
                    return r.content
        except Exception:
            pass

    async with httpx.AsyncClient(follow_redirects=True, timeout=15, headers={
        "User-Agent": "Mozilla/5.0"
    }) as c:
        r = await c.get(url)
        if r.status_code != 200:
            raise Exception(f"HTTP {r.status_code}")
        html = r.text
        og = re.search(r'<meta\s+(?:property|name)=["\']og:image["\']\s+content=["\']([^"\']+)["\']', html, re.I)
        if not og:
            og = re.search(r'<meta\s+content=["\']([^"\']+)["\']\s+(?:property|name)=["\']og:image["\']', html, re.I)
        if not og:
            raise Exception("No og:image found")
        img_r = await c.get(og.group(1))
        if img_r.status_code != 200:
            raise Exception(f"Image download HTTP {img_r.status_code}")
        return img_r.content


async def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/import_ranger_images.py <markdown_file>")
        sys.exit(1)

    md_path = sys.argv[1]
    with open(md_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    drinks = parse_markdown(md_text)
    db = get_db()
    imported = skipped = failed = 0

    for drink in drinks:
        item_id, item_name = match_drink(db, drink["drink_name"])
        if not item_id:
            print(f"  SKIP: No match for '{drink['drink_name']}'")
            skipped += len(drink["images"])
            continue

        existing = db.execute("SELECT COUNT(*) FROM menu_item_images WHERE item_id = ?", (item_id,)).fetchone()[0]

        for idx, img in enumerate(drink["images"]):
            dup = db.execute(
                "SELECT id FROM menu_item_images WHERE item_id = ? AND image_url = ?",
                (item_id, img["url"])
            ).fetchone()
            if dup:
                skipped += 1
                continue

            try:
                raw = await download_image(img["url"])
                full_blob, thumb_blob = resize_image(raw)
                status = "active" if (existing == 0 and idx == 0) else "candidate"
                db.execute(
                    """INSERT INTO menu_item_images
                       (item_id, image_url, image_blob, image_thumb_blob, alt_text, source, status, sort_order)
                       VALUES (?, ?, ?, ?, ?, 'bulk_import', ?, ?)""",
                    (item_id, img["url"], full_blob, thumb_blob, img["alt"], status, existing + idx)
                )
                db.commit()
                imported += 1
                existing += 1
                print(f"  OK: {item_name} #{idx+1}")
                await asyncio.sleep(1.5)
            except Exception as e:
                failed += 1
                print(f"  FAIL: {drink['drink_name']} #{idx+1}: {e}")

    print(f"\nDone: {imported} imported, {skipped} skipped, {failed} failed")


if __name__ == "__main__":
    asyncio.run(main())
