import requests
import json
import time
import os
import re
import xml.etree.ElementTree as ET

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5"
})

# Load all games
games_dir = "content/games"
img_dir = "content/images"
os.makedirs(img_dir, exist_ok=True)

games = []
for fname in sorted(os.listdir(games_dir)):
    if not fname.endswith(".json") or fname.startswith("_"):
        continue
    with open(os.path.join(games_dir, fname), encoding="utf-8") as f:
        game = json.load(f)
    games.append({
        "game_id": fname.replace(".json", ""),
        "title": game.get("title", ""),
        "aliases": game.get("aliases", [])
    })

print(f"Found {len(games)} games to process")

# Step 1: Search BGG for each game to get the CORRECT BGG ID
def search_bgg(title):
    """Search BGG by title and return the best matching game ID and image URL"""
    try:
        # Use BGG search API
        url = f"https://boardgamegeek.com/xmlapi2/search?query={requests.utils.quote(title)}&type=boardgame&exact=1"
        resp = session.get(url, timeout=15)

        if resp.status_code == 202:
            # BGG returns 202 when queued — wait and retry
            time.sleep(5)
            resp = session.get(url, timeout=15)

        if resp.status_code != 200:
            print(f"  Search failed: HTTP {resp.status_code}")
            return None

        root = ET.fromstring(resp.text)
        items = root.findall(".//item")

        if not items:
            # Try non-exact search
            url = f"https://boardgamegeek.com/xmlapi2/search?query={requests.utils.quote(title)}&type=boardgame"
            resp = session.get(url, timeout=15)
            if resp.status_code == 202:
                time.sleep(5)
                resp = session.get(url, timeout=15)
            if resp.status_code != 200:
                return None
            root = ET.fromstring(resp.text)
            items = root.findall(".//item")

        if not items:
            return None

        # Return the first (best) match ID
        bgg_id = items[0].get("id")
        return int(bgg_id)

    except Exception as e:
        print(f"  Search error: {e}")
        return None

def get_image_url(bgg_id):
    """Get the image URL for a BGG game ID"""
    try:
        url = f"https://boardgamegeek.com/xmlapi2/thing?id={bgg_id}&type=boardgame"
        resp = session.get(url, timeout=15)

        if resp.status_code == 202:
            time.sleep(5)
            resp = session.get(url, timeout=15)

        if resp.status_code != 200:
            print(f"  Thing API failed: HTTP {resp.status_code}")
            return None, None

        root = ET.fromstring(resp.text)

        # Verify title matches
        name_elem = root.find(".//name[@type='primary']")
        actual_title = name_elem.get("value") if name_elem is not None else "Unknown"

        # Get image URL
        image_elem = root.find(".//image")
        thumb_elem = root.find(".//thumbnail")

        img_url = None
        if image_elem is not None and image_elem.text:
            img_url = image_elem.text.strip()
        elif thumb_elem is not None and thumb_elem.text:
            img_url = thumb_elem.text.strip()

        return actual_title, img_url

    except Exception as e:
        print(f"  Thing API error: {e}")
        return None, None

def download_image(url, filepath):
    """Download an image from URL"""
    try:
        resp = session.get(url, timeout=30)
        if resp.status_code == 200 and len(resp.content) > 1000:
            with open(filepath, "wb") as f:
                f.write(resp.content)
            return True
    except Exception as e:
        print(f"  Download error: {e}")
    return False

# Process all games
results = {"success": [], "failed": [], "skipped": []}
verified_ids = {}

for i, game in enumerate(games):
    game_id = game["game_id"]
    title = game["title"]
    filepath = os.path.join(img_dir, f"{game_id}.jpg")

    print(f"\n[{i+1}/{len(games)}] {title} ({game_id})")

    # Search BGG for correct ID
    bgg_id = search_bgg(title)

    if not bgg_id:
        # Try aliases
        for alias in game.get("aliases", []):
            bgg_id = search_bgg(alias)
            if bgg_id:
                print(f"  Found via alias: {alias}")
                break

    if not bgg_id:
        print(f"  FAILED: No BGG match found")
        results["failed"].append(game_id)
        time.sleep(2)
        continue

    # Get image URL from BGG
    actual_title, img_url = get_image_url(bgg_id)

    if not img_url:
        print(f"  FAILED: No image URL (BGG #{bgg_id}, title: {actual_title})")
        results["failed"].append(game_id)
        time.sleep(3)
        continue

    print(f"  BGG #{bgg_id}: {actual_title}")
    print(f"  Image: {img_url}")

    # Download
    if download_image(img_url, filepath):
        print(f"  OK: Downloaded")
        results["success"].append(game_id)
        verified_ids[game_id] = {"bgg_id": bgg_id, "title": actual_title, "image_url": img_url}
    else:
        print(f"  FAILED: Download failed")
        results["failed"].append(game_id)

    # Rate limit: BGG asks for 5 seconds between requests
    time.sleep(5)

# Save verified IDs
with open("content/bgg-ids-verified.json", "w") as f:
    json.dump(verified_ids, f, indent=2)

# Summary
print(f"\n{'='*60}")
print(f"RESULTS:")
print(f"  Success: {len(results['success'])}")
print(f"  Failed:  {len(results['failed'])}")
print(f"  Skipped: {len(results['skipped'])}")
print(f"\nFailed games: {results['failed']}")
