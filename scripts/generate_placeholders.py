#!/usr/bin/env python3
"""Generate colored placeholder cover images for all 50 games.

Colors based on complexity:
- party (purple)    -> #7B2D8E
- gateway (green)   -> #2E7D32
- midweight (blue)  -> #1565C0
- heavy (red)       -> #C62828
"""

import json
import os
import sys
import textwrap

from PIL import Image, ImageDraw, ImageFont

GAMES_DIR = os.path.join(os.path.dirname(__file__), "..", "content", "games")
IMAGES_DIR = os.path.join(os.path.dirname(__file__), "..", "content", "images")

COMPLEXITY_COLORS = {
    "party": (123, 45, 142),      # purple
    "gateway": (46, 125, 50),     # green
    "midweight": (21, 101, 192),  # blue
    "heavy": (198, 40, 40),       # red
}

DEFAULT_COLOR = (100, 100, 100)  # gray fallback
IMG_SIZE = 200


def create_placeholder(game_id: str, title: str, complexity: str, output_path: str):
    """Create a placeholder image with game title on colored background."""
    color = COMPLEXITY_COLORS.get(complexity, DEFAULT_COLOR)

    img = Image.new("RGB", (IMG_SIZE, IMG_SIZE), color)
    draw = ImageDraw.Draw(img)

    # Try to use a decent font, fall back to default
    font_size = 18
    small_font_size = 12
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
        small_font = ImageFont.truetype("arial.ttf", small_font_size)
    except (IOError, OSError):
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
            small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", small_font_size)
        except (IOError, OSError):
            font = ImageFont.load_default()
            small_font = font

    # Wrap title text
    wrapped = textwrap.wrap(title, width=14)
    if len(wrapped) > 3:
        wrapped = wrapped[:3]
        wrapped[-1] = wrapped[-1][:12] + "..."

    # Calculate vertical position to center text block
    line_height = font_size + 4
    total_height = len(wrapped) * line_height + small_font_size + 10
    y_start = (IMG_SIZE - total_height) // 2

    # Draw title lines
    for i, line in enumerate(wrapped):
        bbox = draw.textbbox((0, 0), line, font=font)
        text_width = bbox[2] - bbox[0]
        x = (IMG_SIZE - text_width) // 2
        y = y_start + i * line_height

        # Draw shadow
        draw.text((x + 1, y + 1), line, fill=(0, 0, 0), font=font)
        # Draw text
        draw.text((x, y), line, fill=(255, 255, 255), font=font)

    # Draw complexity label at bottom
    label = complexity.upper()
    bbox = draw.textbbox((0, 0), label, font=small_font)
    label_width = bbox[2] - bbox[0]
    lx = (IMG_SIZE - label_width) // 2
    ly = y_start + len(wrapped) * line_height + 8
    draw.text((lx, ly), label, fill=(200, 200, 200), font=small_font)

    # Draw thin border
    draw.rectangle([0, 0, IMG_SIZE - 1, IMG_SIZE - 1], outline=(255, 255, 255, 128))

    img.save(output_path, "JPEG", quality=85)


def main():
    games_dir = os.path.abspath(GAMES_DIR)
    images_dir = os.path.abspath(IMAGES_DIR)
    os.makedirs(images_dir, exist_ok=True)

    json_files = sorted([
        f for f in os.listdir(games_dir)
        if f.endswith(".json") and not f.endswith("-score.json") and f != "_template.json"
    ])

    print(f"Generating placeholder images for {len(json_files)} games...")

    success = 0
    for fname in json_files:
        filepath = os.path.join(games_dir, fname)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)

            game_id = data.get("game_id", fname.replace(".json", ""))
            title = data.get("title", game_id)
            complexity = data.get("complexity", "midweight")

            output_path = os.path.join(images_dir, f"{game_id}.jpg")
            create_placeholder(game_id, title, complexity, output_path)
            success += 1
            print(f"  [{success}/{len(json_files)}] {game_id} ({complexity})")
        except Exception as e:
            print(f"  ERROR {fname}: {e}")

    print(f"\nDone: {success}/{len(json_files)} images generated in {images_dir}")


if __name__ == "__main__":
    main()
