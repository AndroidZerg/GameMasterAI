# TASK: Scrape 10 Cover Art Candidates Per Game

Run on main. Use `--dangerously-skip-permissions`.

## Goal
For each of the 196 games, download up to 10 candidate box art images into `content/art-candidates/{game-id}/`. Tim will manually pick winners.

## Sources (in priority order)

1. **Wikipedia / Wikimedia Commons** — Freely licensed, reliable API, no auth needed
2. **Publisher websites** — Official box art
3. **Amazon product images** — High quality box shots
4. **Open image search** — DuckDuckGo image search as fallback

## STEP 1: Create folder structure

```python
import json, os

games_dir = r"D:\GameMasterAI\content\games"
art_dir = r"D:\GameMasterAI\content\art-candidates"
os.makedirs(art_dir, exist_ok=True)

for fname in sorted(os.listdir(games_dir)):
    if not fname.endswith('.json') or fname.startswith('_'):
        continue
    game_id = fname.replace('.json', '')
    os.makedirs(os.path.join(art_dir, game_id), exist_ok=True)

print(f"Folders ready in {art_dir}")
```

## STEP 2: Run the scraper

```python
import requests
import json
import os
import time
import re
from urllib.parse import quote_plus

session = requests.Session()
session.headers.update({
    "User-Agent": "GameMasterAI/1.0 (board game teaching app; contact: tim.pham91@gmail.com)"
})

games_dir = r"D:\GameMasterAI\content\games"
art_dir = r"D:\GameMasterAI\content\art-candidates"
MAX_IMAGES = 10

def get_wikipedia_image(title):
    """Search Wikipedia for the board game and get its main image"""
    images = []
    try:
        # Search for the game's Wikipedia page
        search_queries = [
            f"{title} (board game)",
            f"{title} board game",
            title
        ]
        
        for query in search_queries:
            url = "https://en.wikipedia.org/w/api.php"
            params = {
                "action": "query",
                "titles": query,
                "prop": "pageimages|images",
                "pithumbsize": 500,
                "format": "json"
            }
            resp = session.get(url, params=params, timeout=15)
            if resp.status_code != 200:
                continue
            
            data = resp.json()
            pages = data.get("query", {}).get("pages", {})
            
            for page_id, page in pages.items():
                if page_id == "-1":
                    continue
                
                # Get the main thumbnail
                thumb = page.get("thumbnail", {}).get("source")
                if thumb:
                    # Get higher res version
                    high_res = re.sub(r'/\d+px-', '/500px-', thumb)
                    images.append(("wikipedia_thumb", high_res))
                
                # Get all images from the page
                for img in page.get("images", []):
                    img_title = img.get("title", "")
                    if any(x in img_title.lower() for x in ["cover", "box", "logo", title.lower().split()[0].lower()]):
                        # Get the actual image URL
                        img_url = get_commons_url(img_title)
                        if img_url:
                            images.append(("wikipedia_page", img_url))
            
            if images:
                break
            time.sleep(1)
    except Exception as e:
        print(f"    Wikipedia error: {e}")
    
    return images

def get_commons_url(file_title):
    """Get the actual URL for a Wikimedia Commons file"""
    try:
        url = "https://en.wikipedia.org/w/api.php"
        params = {
            "action": "query",
            "titles": file_title,
            "prop": "imageinfo",
            "iiprop": "url",
            "iiurlwidth": 500,
            "format": "json"
        }
        resp = session.get(url, params=params, timeout=10)
        data = resp.json()
        pages = data.get("query", {}).get("pages", {})
        for page in pages.values():
            info = page.get("imageinfo", [{}])[0]
            return info.get("thumburl") or info.get("url")
    except:
        pass
    return None

def search_duckduckgo(query, num=8):
    """Search DuckDuckGo for images"""
    images = []
    try:
        token_url = f"https://duckduckgo.com/?q={quote_plus(query)}&iax=images&ia=images"
        resp = session.get(token_url, timeout=10)
        vqd_match = re.search(r'vqd=([\d-]+)', resp.text)
        if not vqd_match:
            # Try alternate pattern
            vqd_match = re.search(r"vqd='([\d-]+)'", resp.text)
        if not vqd_match:
            vqd_match = re.search(r'vqd%3D([\d-]+)', resp.text)
        if not vqd_match:
            return images
        vqd = vqd_match.group(1)
        
        img_url = f"https://duckduckgo.com/i.js?l=us-en&o=json&q={quote_plus(query)}&vqd={vqd}&f=size:Medium,type:photo&p=1"
        resp = session.get(img_url, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            for item in data.get("results", [])[:num]:
                img = item.get("image")
                if img:
                    source = item.get("source", "unknown")
                    images.append(("ddg_" + source[:20], img))
    except Exception as e:
        print(f"    DDG error: {e}")
    
    return images

def search_bing(query, num=5):
    """Search Bing for images (no API key needed for basic scraping)"""
    images = []
    try:
        url = f"https://www.bing.com/images/search?q={quote_plus(query)}&qft=+filterui:photo-photo&form=IRFLTR&first=1"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        resp = session.get(url, headers=headers, timeout=15)
        
        # Extract image URLs from the page
        matches = re.findall(r'murl&quot;:&quot;(https?://[^&]+?)&quot;', resp.text)
        for match in matches[:num]:
            images.append(("bing", match))
    except Exception as e:
        print(f"    Bing error: {e}")
    
    return images

def download_image(url, filepath):
    """Download image, return True if successful"""
    try:
        resp = session.get(url, timeout=20, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })
        if resp.status_code == 200 and len(resp.content) > 5000:
            content_type = resp.headers.get("content-type", "")
            if "image" in content_type or url.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                with open(filepath, "wb") as f:
                    f.write(resp.content)
                return True
    except:
        pass
    return False

# ============================================================
# MAIN LOOP
# ============================================================
games = []
for fname in sorted(os.listdir(games_dir)):
    if not fname.endswith('.json') or fname.startswith('_'):
        continue
    with open(os.path.join(games_dir, fname)) as f:
        game = json.load(f)
    games.append({
        "game_id": fname.replace('.json', ''),
        "title": game.get("title", ""),
    })

print(f"Processing {len(games)} games...")
results = {"success": 0, "partial": 0, "failed": 0}

for i, game in enumerate(games):
    game_id = game["game_id"]
    title = game["title"]
    folder = os.path.join(art_dir, game_id)
    os.makedirs(folder, exist_ok=True)
    
    # Skip if already has enough candidates
    existing = [f for f in os.listdir(folder) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
    if len(existing) >= 5:
        print(f"[{i+1}/{len(games)}] SKIP {title} — already has {len(existing)} candidates")
        results["success"] += 1
        continue
    
    print(f"\n[{i+1}/{len(games)}] {title}")
    
    # Collect candidate URLs from all sources
    all_candidates = []
    
    # Source 1: Wikipedia
    print(f"  Searching Wikipedia...")
    wiki_imgs = get_wikipedia_image(title)
    all_candidates.extend(wiki_imgs)
    time.sleep(1)
    
    # Source 2: DuckDuckGo — box art specific
    print(f"  Searching DDG for box art...")
    ddg_imgs = search_duckduckgo(f"{title} board game box art cover", num=5)
    all_candidates.extend(ddg_imgs)
    time.sleep(2)
    
    # Source 3: DuckDuckGo — broader search
    print(f"  Searching DDG broader...")
    ddg_imgs2 = search_duckduckgo(f"{title} board game", num=5)
    all_candidates.extend(ddg_imgs2)
    time.sleep(2)
    
    # Source 4: Bing images
    print(f"  Searching Bing...")
    bing_imgs = search_bing(f"{title} board game box art", num=5)
    all_candidates.extend(bing_imgs)
    time.sleep(2)
    
    # Download unique candidates
    downloaded = len(existing)
    seen_urls = set()
    
    for source, url in all_candidates:
        if downloaded >= MAX_IMAGES:
            break
        if url in seen_urls:
            continue
        seen_urls.add(url)
        
        ext = ".jpg"
        if ".png" in url.lower()[:url.lower().rfind("?") if "?" in url else len(url)]:
            ext = ".png"
        
        filepath = os.path.join(folder, f"{game_id}-{downloaded+1}{ext}")
        
        if download_image(url, filepath):
            downloaded += 1
            size_kb = os.path.getsize(filepath) / 1024
            print(f"    [{source}] #{downloaded}: {size_kb:.0f} KB")
    
    if downloaded >= 5:
        results["success"] += 1
    elif downloaded > 0:
        results["partial"] += 1
        print(f"  PARTIAL: Only got {downloaded} images")
    else:
        results["failed"] += 1
        print(f"  FAILED: No images found")
    
    # Rate limit between games
    time.sleep(3)

print(f"\n{'='*60}")
print(f"COMPLETE:")
print(f"  5+ images: {results['success']} games")
print(f"  1-4 images: {results['partial']} games")
print(f"  0 images: {results['failed']} games")
print(f"\nCandidates are in: D:\\GameMasterAI\\content\\art-candidates\\")
print(f"Tim: Browse folders, pick winners, copy to D:\\GameMasterAI\\content\\art-winners\\")
```

## STEP 3: Open the folder for Tim

After the scraper finishes:

```
explorer D:\GameMasterAI\content\art-candidates
```

## Tim's Workflow

1. Open `art-candidates` in Explorer
2. Each game has its own folder with up to 10 candidate images
3. Find the real box art — copy it to `D:\GameMasterAI\content\art-winners\`
4. Name it `{game-id}.jpg` (or just copy with original name — the deploy script strips trailing numbers)
5. When ready to deploy a batch, tell Barbarian to run the deploy script from TASK-ART-CURATION.md Step 3

## Notes

- Wikipedia images are freely licensed — best source
- DuckDuckGo and Bing don't need API keys
- Rate limited to ~3-5 seconds between games to avoid blocks
- Full run takes ~30-45 minutes for 196 games
- Some games may get 0 results if title is too generic — Tim can manually save those
