#!/usr/bin/env python3
"""Optimize all cover images for web: resize to 400x400 max, convert to JPEG, compress."""

import os

from PIL import Image

IMAGES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "content", "images")


def main():
    resized = 0
    converted = 0
    total_before = 0
    total_after = 0

    files = sorted(f for f in os.listdir(IMAGES_DIR) if f.endswith((".jpg", ".jpeg", ".png")))
    print(f"Optimizing {len(files)} images...")

    for f in files:
        path = os.path.join(IMAGES_DIR, f)
        before_size = os.path.getsize(path)
        total_before += before_size

        img = Image.open(path)
        original_size = img.size

        # Convert RGBA/P to RGB for JPEG saving
        if img.mode in ("RGBA", "P", "LA"):
            bg = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            if "A" in img.mode:
                bg.paste(img, mask=img.split()[-1])
            else:
                bg.paste(img)
            img = bg
            converted += 1
        elif img.mode != "RGB":
            img = img.convert("RGB")

        # Resize if larger than 400x400
        changed = False
        if img.width > 400 or img.height > 400:
            img.thumbnail((400, 400), Image.LANCZOS)
            changed = True
            resized += 1

        # Save as optimized JPEG
        img.save(path, "JPEG", quality=85, optimize=True)
        after_size = os.path.getsize(path)
        total_after += after_size

        status = []
        if changed:
            status.append(f"{original_size[0]}x{original_size[1]} -> {img.size[0]}x{img.size[1]}")
        if before_size != after_size:
            status.append(f"{before_size // 1024}KB -> {after_size // 1024}KB")

        if status:
            print(f"  {f}: {' | '.join(status)}")

    print(f"\nResized: {resized} images")
    print(f"Converted from PNG: {converted} images")
    print(f"Total before: {total_before / 1024 / 1024:.1f} MB")
    print(f"Total after: {total_after / 1024 / 1024:.1f} MB")
    print(f"Savings: {(total_before - total_after) / 1024 / 1024:.1f} MB ({(1 - total_after / total_before) * 100:.0f}%)")

    # Check any over 50KB
    over_50 = []
    for f in sorted(os.listdir(IMAGES_DIR)):
        if f.endswith((".jpg", ".jpeg", ".png")):
            size = os.path.getsize(os.path.join(IMAGES_DIR, f))
            if size > 50 * 1024:
                over_50.append((f, size))
    print(f"\nFiles over 50KB: {len(over_50)}")
    for fname, sz in over_50:
        print(f"  {fname}: {sz // 1024}KB")


if __name__ == "__main__":
    main()
