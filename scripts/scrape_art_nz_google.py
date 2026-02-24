"""Second round: scrape Google Images for N-Z games.
Downloads up to 5 images per game as {game-id}-google-1.jpg, etc.
Does not overwrite existing files.
"""
import requests
import json
import os
import time
import re
from urllib.parse import quote_plus

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
})

games_dir = r"D:\GameMasterAI\content\games"
art_dir = r"D:\GameMasterAI\content\art-candidates"
MAX_GOOGLE = 5


def search_google_images(query, num=10):
    """Scrape Google Images search results page for image URLs."""
    images = []
    try:
        url = f"https://www.google.com/search?q={quote_plus(query)}&tbm=isch"
        resp = session.get(url, timeout=15)
        if resp.status_code != 200:
            print(f"    Google: HTTP {resp.status_code}")
            return images

        # Extract image URLs from Google's HTML
        # Google embeds full-res URLs in various patterns
        # Pattern 1: data-src or src attributes with http URLs
        patterns = [
            r'"(https?://[^"]+\.(?:jpg|jpeg|png|webp)(?:\?[^"]*)?)"',
            r'imgurl=(https?://[^&"]+)',
            r'\["(https?://[^"]+)",\d+,\d+\]',
        ]

        seen = set()
        for pattern in patterns:
            matches = re.findall(pattern, resp.text)
            for match in matches:
                if match in seen:
                    continue
                # Skip Google's own thumbnails/icons
                if "google.com" in match or "gstatic.com" in match or "googleapis.com" in match:
                    continue
                if "encrypted-tbn" in match:
                    continue
                seen.add(match)
                images.append(match)
                if len(images) >= num:
                    break
            if len(images) >= num:
                break

    except Exception as e:
        print(f"    Google error: {e}")
    return images


def download_image(url, filepath):
    """Download image, return True if successful and >5KB."""
    try:
        resp = session.get(url, timeout=20)
        if resp.status_code == 200 and len(resp.content) > 5000:
            content_type = resp.headers.get("content-type", "")
            if "image" in content_type or url.lower().split("?")[0].endswith(('.jpg', '.jpeg', '.png', '.webp')):
                with open(filepath, "wb") as f:
                    f.write(resp.content)
                return True
    except:
        pass
    return False


# Load N-Z games
games = []
for fname in sorted(os.listdir(games_dir)):
    if not fname.endswith('.json') or fname.startswith('_'):
        continue
    game_id = fname.replace('.json', '')
    first_char = game_id[0].lower()
    if first_char < 'n' or first_char > 'z':
        continue
    with open(os.path.join(games_dir, fname), encoding="utf-8") as f:
        game = json.load(f)
    games.append({
        "game_id": game_id,
        "title": game.get("title", ""),
    })

print(f"Google Images scrape: {len(games)} games (N-Z)", flush=True)

results = {"success": 0, "partial": 0, "failed": 0}

for i, game in enumerate(games):
    game_id = game["game_id"]
    title = game["title"]
    folder = os.path.join(art_dir, game_id)
    os.makedirs(folder, exist_ok=True)

    print(f"\n[{i+1}/{len(games)}] {title} ({game_id})", flush=True)

    # Search Google
    query = f"{title} board game"
    img_urls = search_google_images(query, num=10)
    print(f"  Found {len(img_urls)} candidate URLs", flush=True)

    # Download up to MAX_GOOGLE unique images
    downloaded = 0
    for url in img_urls:
        if downloaded >= MAX_GOOGLE:
            break

        ext = ".jpg"
        url_lower = url.lower().split("?")[0]
        if url_lower.endswith(".png"):
            ext = ".png"

        filepath = os.path.join(folder, f"{game_id}-google-{downloaded+1}{ext}")

        # Don't overwrite existing
        if os.path.exists(filepath):
            print(f"    Skip (exists): {os.path.basename(filepath)}")
            downloaded += 1
            continue

        if download_image(url, filepath):
            downloaded += 1
            size_kb = os.path.getsize(filepath) / 1024
            print(f"    #{downloaded}: {size_kb:.0f} KB", flush=True)

    if downloaded >= 3:
        results["success"] += 1
    elif downloaded > 0:
        results["partial"] += 1
        print(f"  PARTIAL: Only got {downloaded}")
    else:
        results["failed"] += 1
        print(f"  FAILED: No images from Google")

    time.sleep(3)

print(f"\n{'='*60}")
print(f"GOOGLE IMAGES SCRAPE COMPLETE (N-Z):")
print(f"  3+ images: {results['success']} games")
print(f"  1-2 images: {results['partial']} games")
print(f"  0 images: {results['failed']} games")
