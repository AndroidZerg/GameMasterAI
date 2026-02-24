#!/usr/bin/env python3
"""Generate colored placeholder cover images for all games in bgg-ids.json.

Skips games that already have real images (>5KB valid JPEG/PNG).
Colors based on category: party (red), classic (dark), gateway (green),
midweight (blue), heavy (purple).
"""

import json
import os
import textwrap

from PIL import Image, ImageDraw, ImageFont

BASE_DIR = os.path.join(os.path.dirname(__file__), "..")
IMAGES_DIR = os.path.join(BASE_DIR, "content", "images")
BGG_IDS_PATH = os.path.join(BASE_DIR, "content", "bgg-ids.json")
GAMES_DIR = os.path.join(BASE_DIR, "content", "games")

CATEGORY_GAMES = {
    "party": [
        "cards-against-humanity", "what-do-you-meme", "taboo", "scattergories",
        "apples-to-apples", "monikers", "werewords", "a-fake-artist-goes-to-new-york",
        "exploding-kittens", "unstable-unicorns", "deception-murder-in-hong-kong",
        "blood-on-the-clocktower", "secret-hitler", "the-resistance-avalon",
        "cockroach-poker",
    ],
    "classic": [
        "chess", "checkers", "backgammon", "mahjong", "cribbage", "gin-rummy",
        "uno", "skip-bo", "phase-10", "scrabble", "trivial-pursuit", "clue",
        "monopoly", "risk", "jenga", "connect-four", "boggle", "bananagrams",
        "sequence",
    ],
    "gateway": [
        "cant-stop", "jaipur", "forbidden-island", "forbidden-desert", "camel-up",
        "blokus", "machi-koro", "tokaido", "alhambra", "karuba", "sushi-go",
        "love-letter-2019", "the-mind", "hanabi", "point-salad", "no-thanks",
        "take-5", "scout", "fox-in-the-forest", "hanamikoji", "lost-cities-card-game",
        "schotten-totten", "tiny-towns", "calico", "cascadia",
        "harmonies", "sky-team", "meadow", "flamecraft", "my-city", "cryptid",
        "hive", "onitama", "codenames-duet", "pandemic-hot-zone",
    ],
    "heavy": [
        "pandemic-legacy-season-1", "gloomhaven-jaws-of-the-lion",
        "descent-legends-of-the-dark", "nemesis", "eclipse-second-dawn",
        "twilight-imperium-4", "terra-mystica", "gaia-project", "feast-for-odin",
        "le-havre", "ora-et-labora", "caverna", "barrage", "kanban-ev",
        "lisboa", "the-gallerist", "anachrony", "oath", "sleeping-gods",
    ],
}

CATEGORY_COLORS = {
    "party":     ((231, 76, 60),  (192, 57, 43)),
    "classic":   ((52, 73, 94),   (44, 62, 80)),
    "gateway":   ((46, 204, 113), (39, 174, 96)),
    "midweight": ((52, 152, 219), (41, 128, 185)),
    "heavy":     ((155, 89, 182), (142, 68, 173)),
}

IMG_SIZE = 400


def get_category(game_id):
    """Determine category from game_id; try game JSON first, then lookup table."""
    game_json = os.path.join(GAMES_DIR, f"{game_id}.json")
    if os.path.exists(game_json):
        try:
            with open(game_json, "r", encoding="utf-8") as f:
                data = json.load(f)
            complexity = data.get("complexity", "")
            if complexity in CATEGORY_COLORS:
                return complexity
        except Exception:
            pass
    for cat, games in CATEGORY_GAMES.items():
        if game_id in games:
            return cat
    return "midweight"


def get_title(game_id):
    """Get display title from game JSON or format from id."""
    game_json = os.path.join(GAMES_DIR, f"{game_id}.json")
    if os.path.exists(game_json):
        try:
            with open(game_json, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data.get("title", game_id)
        except Exception:
            pass
    title = game_id.replace("-", " ").title()
    for w in [" Of ", " The ", " And ", " In ", " For ", " To ", " A ", " At ", " On "]:
        title = title.replace(w, w.lower())
    title = title.replace("Imperium 4", "Imperium IV")
    if game_id == "kanban-ev":
        title = title.replace("Ev", "EV")
    return title


def create_placeholder(game_id, output_path):
    """Create a gradient placeholder image with game title."""
    cat = get_category(game_id)
    c1, c2 = CATEGORY_COLORS.get(cat, CATEGORY_COLORS["midweight"])

    img = Image.new("RGB", (IMG_SIZE, IMG_SIZE))
    draw = ImageDraw.Draw(img)

    # Gradient background
    for y in range(IMG_SIZE):
        t = y / IMG_SIZE
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        draw.line([(0, y), (IMG_SIZE, y)], fill=(r, g, b))

    # Diagonal pattern lines
    overlay = (min(255, c1[0] + 20), min(255, c1[1] + 20), min(255, c1[2] + 20))
    for i in range(-IMG_SIZE, IMG_SIZE * 2, 30):
        draw.line([(i, 0), (i + IMG_SIZE, IMG_SIZE)], fill=overlay, width=1)

    # Border
    draw.rectangle([(15, 15), (IMG_SIZE - 16, IMG_SIZE - 16)], outline=(255, 255, 255), width=2)

    # Load fonts
    try:
        font_title = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 26)
        font_sub = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 16)
        font_small = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 13)
    except (IOError, OSError):
        try:
            font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 26)
            font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
        except (IOError, OSError):
            font_title = ImageFont.load_default()
            font_sub = font_title
            font_small = font_title

    # Title text
    title = get_title(game_id)
    wrapped = textwrap.wrap(title, width=18)
    if len(wrapped) > 3:
        wrapped = wrapped[:3]
        wrapped[-1] = wrapped[-1][:15] + "..."

    line_height = 34
    total_height = len(wrapped) * line_height
    start_y = (IMG_SIZE - total_height) / 2 - 10

    for i, line in enumerate(wrapped):
        bbox = draw.textbbox((0, 0), line, font=font_title)
        tw = bbox[2] - bbox[0]
        x = (IMG_SIZE - tw) / 2
        y = start_y + i * line_height
        draw.text((x + 2, y + 2), line, fill=(0, 0, 0), font=font_title)
        draw.text((x, y), line, fill=(255, 255, 255), font=font_title)

    # Category label
    label = cat.upper()
    bbox = draw.textbbox((0, 0), label, font=font_sub)
    lw = bbox[2] - bbox[0]
    draw.text(((IMG_SIZE - lw) / 2, IMG_SIZE - 60), label, fill=(220, 220, 220), font=font_sub)

    # Branding
    brand = "GAMEMASTER AI"
    bbox = draw.textbbox((0, 0), brand, font=font_small)
    bw = bbox[2] - bbox[0]
    draw.text(((IMG_SIZE - bw) / 2, IMG_SIZE - 38), brand, fill=(180, 180, 180), font=font_small)

    img.save(output_path, "JPEG", quality=85)


def main():
    os.makedirs(IMAGES_DIR, exist_ok=True)

    with open(BGG_IDS_PATH, "r", encoding="utf-8") as f:
        bgg_ids = json.load(f)

    # Find existing real images
    existing_real = set()
    for fname in os.listdir(IMAGES_DIR):
        path = os.path.join(IMAGES_DIR, fname)
        if os.path.getsize(path) > 5000:
            with open(path, "rb") as fh:
                header = fh.read(4)
            if header[:2] == b"\xff\xd8" or header[:4] == b"\x89PNG":
                existing_real.add(fname.split(".")[0])

    to_generate = sorted([g for g in bgg_ids if g not in existing_real])
    print(f"Already have {len(existing_real)} real images")
    print(f"Generating {len(to_generate)} placeholder images...\n")

    success = 0
    for i, game_id in enumerate(to_generate):
        output_path = os.path.join(IMAGES_DIR, f"{game_id}.jpg")
        try:
            create_placeholder(game_id, output_path)
            success += 1
            if (i + 1) % 20 == 0 or i == 0:
                size = os.path.getsize(output_path)
                print(f"  [{i+1}/{len(to_generate)}] {game_id}: {size:,} bytes")
        except Exception as e:
            print(f"  ERROR {game_id}: {e}")

    total = len([f for f in os.listdir(IMAGES_DIR) if f.endswith((".jpg", ".png"))])
    print(f"\nGenerated {success}/{len(to_generate)} placeholders")
    print(f"Total images on disk: {total}")


if __name__ == "__main__":
    main()
