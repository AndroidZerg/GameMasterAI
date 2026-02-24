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
    "Accept-Language": "en-US,en;q=0.5"
})

games_dir = r"D:\GameMasterAI\content\games"
art_dir = r"D:\GameMasterAI\content\art-candidates"
MAX_IMAGES = 5

def search_google_images(query):
    """Scrape Google Images search results page for image URLs"""
    urls = []
    try:
        search_url = f"https://www.google.com/search?q={quote_plus(query)}&tbm=isch"
        resp = session.get(search_url, timeout=15)
        if resp.status_code != 200:
            print(f"  Google search failed: HTTP {resp.status_code}", flush=True)
            return urls

        # Extract image URLs from the page HTML
        # Google embeds full-size image URLs in various patterns
        # Pattern 1: "ou":"<url>" (older format)
        matches1 = re.findall(r'"ou":"(https?://[^"]+)"', resp.text)
        # Pattern 2: metadata blocks with image urls
        matches2 = re.findall(r'\["(https?://[^"]+\.(?:jpg|jpeg|png|webp)(?:\?[^"]*)?)",[0-9]+,[0-9]+\]', resp.text)
        # Pattern 3: data-src or src with full URLs
        matches3 = re.findall(r'(?:data-src|src)="(https?://(?!www\.google|encrypted-tbn|www\.gstatic)[^"]+)"', resp.text)

        seen = set()
        for url in matches1 + matches2 + matches3:
            # Skip Google's own thumbnails and tracking URLs
            if "google.com" in url or "gstatic.com" in url or "googleapis.com" in url:
                continue
            if url not in seen:
                seen.add(url)
                urls.append(url)

    except Exception as e:
        print(f"  Google search error: {e}", flush=True)
    return urls

def download_image(url, filepath):
    """Download image, return True if successful and >5KB"""
    try:
        resp = session.get(url, timeout=20, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.google.com/"
        })
        if resp.status_code == 200 and len(resp.content) > 5000:
            content_type = resp.headers.get("content-type", "")
            if "image" in content_type or url.lower().split("?")[0].endswith(('.jpg', '.jpeg', '.png', '.webp')):
                with open(filepath, "wb") as f:
                    f.write(resp.content)
                return True
    except:
        pass
    return False

# Load D-M games
games = []
for fname in sorted(os.listdir(games_dir)):
    if not fname.endswith('.json') or fname.startswith('_'):
        continue
    game_id = fname.replace('.json', '')
    if game_id[0] < "d" or game_id[0] > "m":
        continue
    with open(os.path.join(games_dir, fname), encoding="utf-8") as f:
        game = json.load(f)
    games.append({
        "game_id": game_id,
        "title": game.get("title", ""),
    })

print(f"Processing {len(games)} games (D-M) — Google Images round", flush=True)
results = {"success": 0, "partial": 0, "failed": 0}

for i, game in enumerate(games):
    game_id = game["game_id"]
    title = game["title"]
    folder = os.path.join(art_dir, game_id)
    os.makedirs(folder, exist_ok=True)

    print(f"\n[{i+1}/{len(games)}] {title} ({game_id})", flush=True)

    # Check how many google images already exist
    existing_google = [f for f in os.listdir(folder) if f.startswith(f"{game_id}-google-")]
    if len(existing_google) >= 5:
        print(f"  SKIP — already has {len(existing_google)} google candidates", flush=True)
        results["success"] += 1
        continue

    # Search Google Images
    query = f"{title} board game"
    print(f"  Searching: {query}", flush=True)
    image_urls = search_google_images(query)
    print(f"  Found {len(image_urls)} candidate URLs", flush=True)

    # Download up to 5 unique images
    downloaded = len(existing_google)
    for url in image_urls:
        if downloaded >= MAX_IMAGES:
            break

        ext = ".jpg"
        url_lower = url.lower().split("?")[0]
        if url_lower.endswith(".png"):
            ext = ".png"
        elif url_lower.endswith(".webp"):
            ext = ".webp"

        filepath = os.path.join(folder, f"{game_id}-google-{downloaded+1}{ext}")

        if download_image(url, filepath):
            downloaded += 1
            size_kb = os.path.getsize(filepath) / 1024
            print(f"    #{downloaded}: {size_kb:.0f} KB", flush=True)

    if downloaded >= 5:
        results["success"] += 1
    elif downloaded > 0:
        results["partial"] += 1
        print(f"  PARTIAL: Only got {downloaded} images", flush=True)
    else:
        results["failed"] += 1
        print(f"  FAILED: No images downloaded", flush=True)

    time.sleep(3)

print(f"\n{'='*60}", flush=True)
print(f"COMPLETE — Google Images (D-M):", flush=True)
print(f"  5 images: {results['success']} games", flush=True)
print(f"  1-4 images: {results['partial']} games", flush=True)
print(f"  0 images: {results['failed']} games", flush=True)
