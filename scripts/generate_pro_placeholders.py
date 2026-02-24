#!/usr/bin/env python3
"""Generate professional-quality placeholder cover images for all 50 games.

Creates 400x400 gradient images with:
- Gradient background based on complexity
- Large centered game title
- Complexity badge at bottom
- Player count indicator
- Subtle decorative elements
"""

import json
import math
import os
import textwrap

from PIL import Image, ImageDraw, ImageFont

GAMES_DIR = os.path.join(os.path.dirname(__file__), "..", "content", "games")
IMAGES_DIR = os.path.join(os.path.dirname(__file__), "..", "content", "images")

# Gradient color pairs (top, bottom) by complexity
GRADIENTS = {
    "party": ((147, 51, 234), (79, 70, 229)),       # purple → indigo
    "gateway": ((16, 185, 129), (5, 150, 105)),      # emerald → green
    "midweight": ((59, 130, 246), (37, 99, 235)),    # blue → royal blue
    "heavy": ((239, 68, 68), (185, 28, 28)),         # red → dark red
}

ACCENT_COLORS = {
    "party": (196, 181, 253),
    "gateway": (167, 243, 208),
    "midweight": (191, 219, 254),
    "heavy": (254, 202, 202),
}

IMG_SIZE = 400


def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def create_gradient(draw, size, top_color, bottom_color):
    for y in range(size):
        t = y / size
        color = lerp_color(top_color, bottom_color, t)
        draw.line([(0, y), (size - 1, y)], fill=color)


def draw_decorative_elements(draw, size, accent):
    """Draw subtle game-related decorative elements."""
    # Corner accents
    r = 60
    fade = (*accent, 30)

    # Top-left arc
    draw.arc([(-r, -r), (r, r)], 0, 90, fill=(*accent,), width=2)
    # Bottom-right arc
    draw.arc([(size - r, size - r), (size + r, size + r)], 180, 270, fill=(*accent,), width=2)

    # Subtle diamond pattern at top
    cx, cy = size // 2, 35
    s = 12
    pts = [(cx, cy - s), (cx + s, cy), (cx, cy + s), (cx - s, cy)]
    draw.polygon(pts, outline=(*accent,))

    # Bottom line
    draw.line([(40, size - 55), (size - 40, size - 55)], fill=(*accent, 80), width=1)


def create_placeholder(game_id, title, complexity, player_min, player_max, publisher, output_path):
    top, bottom = GRADIENTS.get(complexity, GRADIENTS["midweight"])
    accent = ACCENT_COLORS.get(complexity, ACCENT_COLORS["midweight"])

    img = Image.new("RGBA", (IMG_SIZE, IMG_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw gradient background
    create_gradient(draw, IMG_SIZE, top, bottom)

    # Decorative elements
    draw_decorative_elements(draw, IMG_SIZE, accent)

    # Font loading
    title_size = 28
    badge_size = 13
    player_size = 14
    pub_size = 11
    try:
        title_font = ImageFont.truetype("arial.ttf", title_size)
        title_font_sm = ImageFont.truetype("arial.ttf", 22)
        badge_font = ImageFont.truetype("arial.ttf", badge_size)
        player_font = ImageFont.truetype("arial.ttf", player_size)
        pub_font = ImageFont.truetype("arial.ttf", pub_size)
    except (IOError, OSError):
        title_font = ImageFont.load_default()
        title_font_sm = title_font
        badge_font = title_font
        player_font = title_font
        pub_font = title_font

    # Wrap title
    max_chars = 16 if len(title) < 25 else 14
    wrapped = textwrap.wrap(title, width=max_chars)
    if len(wrapped) > 3:
        wrapped = wrapped[:3]
        wrapped[-1] = wrapped[-1][:11] + "..."

    use_font = title_font if len(wrapped) <= 2 else title_font_sm
    line_h = (title_size if len(wrapped) <= 2 else 22) + 6

    # Center title vertically
    block_h = len(wrapped) * line_h
    y_start = (IMG_SIZE - block_h) // 2 - 15

    for i, line in enumerate(wrapped):
        bbox = draw.textbbox((0, 0), line, font=use_font)
        tw = bbox[2] - bbox[0]
        x = (IMG_SIZE - tw) // 2
        y = y_start + i * line_h

        # Shadow
        draw.text((x + 2, y + 2), line, fill=(0, 0, 0, 120), font=use_font)
        # Text
        draw.text((x, y), line, fill=(255, 255, 255), font=use_font)

    # Player count badge (top right area)
    pc_text = f"{player_min}-{player_max}P" if player_min != player_max else f"{player_min}P"
    bbox = draw.textbbox((0, 0), pc_text, font=player_font)
    pw = bbox[2] - bbox[0]
    ph = bbox[3] - bbox[1]
    px = IMG_SIZE - pw - 25
    py = 20
    # Badge background
    draw.rounded_rectangle(
        [px - 8, py - 4, px + pw + 8, py + ph + 6],
        radius=10,
        fill=(0, 0, 0, 100),
    )
    draw.text((px, py), pc_text, fill=(255, 255, 255), font=player_font)

    # Complexity badge (bottom center)
    badge_text = complexity.upper()
    bbox = draw.textbbox((0, 0), badge_text, font=badge_font)
    bw = bbox[2] - bbox[0]
    bh = bbox[3] - bbox[1]
    bx = (IMG_SIZE - bw) // 2
    by = IMG_SIZE - 40
    draw.rounded_rectangle(
        [bx - 12, by - 4, bx + bw + 12, by + bh + 6],
        radius=8,
        fill=(0, 0, 0, 80),
    )
    draw.text((bx, by), badge_text, fill=accent, font=badge_font)

    # Publisher (bottom, below complexity)
    if publisher:
        pub_text = publisher
        bbox = draw.textbbox((0, 0), pub_text, font=pub_font)
        ppw = bbox[2] - bbox[0]
        ppx = (IMG_SIZE - ppw) // 2
        draw.text((ppx, by + bh + 10), pub_text, fill=(200, 200, 200, 180), font=pub_font)

    # Convert to RGB and save
    rgb_img = Image.new("RGB", (IMG_SIZE, IMG_SIZE), (0, 0, 0))
    rgb_img.paste(img, mask=img.split()[3])
    rgb_img.save(output_path, "JPEG", quality=90)


def main():
    games_dir = os.path.abspath(GAMES_DIR)
    images_dir = os.path.abspath(IMAGES_DIR)
    os.makedirs(images_dir, exist_ok=True)

    json_files = sorted([
        f for f in os.listdir(games_dir)
        if f.endswith(".json") and not f.endswith("-score.json") and f != "_template.json"
    ])

    print(f"Generating professional placeholder images for {len(json_files)} games...")

    success = 0
    for fname in json_files:
        filepath = os.path.join(games_dir, fname)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)

            game_id = data.get("game_id", fname.replace(".json", ""))
            title = data.get("title", game_id)
            complexity = data.get("complexity", "midweight")
            pc = data.get("player_count", {})
            publisher = data.get("publisher", "")

            output_path = os.path.join(images_dir, f"{game_id}.jpg")
            create_placeholder(
                game_id, title, complexity,
                pc.get("min", 1), pc.get("max", 4),
                publisher, output_path,
            )
            success += 1
            print(f"  [{success}/{len(json_files)}] {game_id} ({complexity})")
        except Exception as e:
            print(f"  ERROR {fname}: {e}")

    print(f"\nDone: {success}/{len(json_files)} images in {images_dir}")


if __name__ == "__main__":
    main()
