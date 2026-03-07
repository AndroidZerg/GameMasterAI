#!/usr/bin/env python3
"""Map source photos to menu items and generate resized web images.

Usage: python tools/map-menu-photos.py [--dry-run]

Reads:  content/menus/meetup.json + assets/Thai Food Picts.../
Writes: content/images/menu/{slug}.jpg + {slug}-thumb.jpg
Updates: meetup.json image fields
"""

import json
import os
import re
import shutil
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Install Pillow: pip install Pillow")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
MENU_JSON = ROOT / "content" / "menus" / "meetup.json"
PHOTO_SRC = ROOT / "assets" / "Thai Food Picts-20260306T230617Z-3-001" / "Thai Food Picts"
IMG_OUT = ROOT / "content" / "images" / "menu"

FULL_SIZE = 800
THUMB_SIZE = 400

# Manual verified mapping: source filename → menu item name
PHOTO_MAP = {
    "Chicken Satay.jpg": "Chicken Satay (5)",
    "Crispy-Crab-Rangoons.jpg": "Crab Rangoon (6)",
    "FreshRolls.jpg": "Fresh Summer Rolls (2)",
    "green-curry-shrimp1.jpg": "Green Curry",
    "Larb.jpg": "Larb Gai",
    "Mongolian Beef.png": "Mongolian Beef",
    "Oliang_Iced_Thai_Coffee_fullwidth.jpg": "Thai Iced Coffee",
    "Pad Kee Mao Noodles.jpg": "Drunken Noodles",
    "Pad Se Ew.jpg": "Pad See Ew",
    "Panang-Curry-Chicken-square.jpg": "Panang Curry",
    "Papaya Salad.jpg": "Papaya Salad",
    "Red Curry.jpg": "Red Curry",
    "spicy squid salad.jpg": "Squid Salad",
    "Sweet-and-Sour-Thai Style.jpg": "Sweet & Sour",
    "Thai_Beef_Salad_RE_HE_M.jpg": "Beef Salad",
    "thai-bbq-chicken-4.jpg": "Thai BBQ Chicken",
    "Thai-Cashew-nut Chicken_square-5166.jpg": "Cashew Chicken",
    "Thai-Yellow-Curry-with-Chicken-1.webp": "Yellow Curry",
    "Tom Yum.jpg": "Tom Yum Soup",
}


def slugify(name: str) -> str:
    """Convert menu item name to URL-safe slug."""
    s = name.lower()
    s = re.sub(r"\([^)]*\)", "", s).strip()
    s = re.sub(r"[&]", "and", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def resize_and_save(src_path: Path, slug: str, dry_run: bool = False):
    """Resize source photo to full + thumb sizes, save as JPEG."""
    if dry_run:
        print(f"  [DRY RUN] Would process {src_path.name} → {slug}.jpg")
        return

    img = Image.open(src_path).convert("RGB")

    # Full size
    img_full = img.copy()
    img_full.thumbnail((FULL_SIZE, FULL_SIZE), Image.LANCZOS)
    img_full.save(IMG_OUT / f"{slug}.jpg", "JPEG", quality=85)

    # Thumbnail
    img_thumb = img.copy()
    img_thumb.thumbnail((THUMB_SIZE, THUMB_SIZE), Image.LANCZOS)
    img_thumb.save(IMG_OUT / f"{slug}-thumb.jpg", "JPEG", quality=80)

    print(f"  Saved {slug}.jpg ({img_full.size}) + thumb ({img_thumb.size})")


def main():
    dry_run = "--dry-run" in sys.argv

    with open(MENU_JSON) as f:
        menu = json.load(f)

    # Build name → item reference for updating image fields
    all_items = {}
    for section in menu["sections"]:
        for item in section["items"]:
            all_items[item["name"]] = item

    IMG_OUT.mkdir(parents=True, exist_ok=True)

    processed = set()
    for src_file, item_name in PHOTO_MAP.items():
        src_path = PHOTO_SRC / src_file
        if not src_path.exists():
            print(f"  WARNING: source not found: {src_file}")
            continue

        if item_name not in all_items:
            print(f"  WARNING: menu item not found: {item_name}")
            continue

        slug = slugify(item_name)
        resize_and_save(src_path, slug, dry_run)

        # Update menu JSON
        all_items[item_name]["image"] = slug
        processed.add(slug)

    # Report items with images not in PHOTO_MAP (previously assigned)
    for name, item in all_items.items():
        if "image" in item and item["image"] not in processed:
            slug = item["image"]
            full_path = IMG_OUT / f"{slug}.jpg"
            if full_path.exists():
                print(f"  Keeping existing: {slug}.jpg for '{name}'")
            else:
                print(f"  WARNING: missing image file for '{name}': {slug}.jpg")

    if not dry_run:
        with open(MENU_JSON, "w") as f:
            json.dump(menu, f, indent=2, ensure_ascii=False)
        print(f"\nUpdated {MENU_JSON}")

    print(f"\nProcessed {len(processed)} photos from source directory")
    print(f"Total items with images: {sum(1 for i in all_items.values() if 'image' in i)}")


if __name__ == "__main__":
    main()
