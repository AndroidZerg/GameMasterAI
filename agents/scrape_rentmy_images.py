"""Scrape cover images from RentMy API for Shall We Play games."""
import json, os, re, shutil, urllib.request

IMAGE_BASE = "https://s3.us-east-2.amazonaws.com/images.rentmy.co/products/431"

os.makedirs("content/images/swp-scraped", exist_ok=True)

# ── Step 1: Load cached API responses ───────────────────────────────
print("=== Step 1: Loading API responses ===")
with open("venues/shallweplay/rentmy-api-raw.json") as f:
    api_responses = json.load(f)
print(f"Loaded {len(api_responses)} API responses")

# ── Step 2: Extract product names + image URLs ──────────────────────
print("\n=== Step 2: Extracting products ===")
products = []

for resp in api_responses:
    data = resp.get("data", {})
    # Navigate: data.result.data[]
    if isinstance(data, dict) and "result" in data:
        result = data["result"]
        if isinstance(result, dict) and "data" in result:
            items = result["data"]
        else:
            continue
    else:
        continue

    for item in items:
        name = item.get("name", "").strip()
        product_id = item.get("id")

        image_url = None
        if "images" in item and isinstance(item["images"], list) and item["images"]:
            img = item["images"][0]
            # Use image_large_free for best quality
            filename = img.get("image_large_free") or img.get("image_large") or img.get("image_small")
            if filename and product_id:
                image_url = f"{IMAGE_BASE}/{product_id}/{filename}"

        if name:
            products.append({
                "name": name,
                "image_url": image_url,
                "product_id": product_id,
            })

# Deduplicate by name
seen = set()
unique_products = []
for p in products:
    if p["name"].lower() not in seen:
        seen.add(p["name"].lower())
        unique_products.append(p)
products = unique_products

print(f"Found {len(products)} unique products")
print(f"With images: {sum(1 for p in products if p['image_url'])}")

with open("venues/shallweplay/rentmy-products-with-images.json", "w") as f:
    json.dump([{"name": p["name"], "image_url": p["image_url"]} for p in products], f, indent=2)

# ── Step 3: Download all images ─────────────────────────────────────
print("\n=== Step 3: Downloading images ===")

def title_to_game_id(title):
    game_id = title.lower()
    game_id = re.sub(r'[^a-z0-9\s-]', '', game_id)
    game_id = re.sub(r'\s+', '-', game_id.strip())
    game_id = re.sub(r'-+', '-', game_id)
    return game_id

downloaded = 0
failed = 0
skipped = 0

for product in products:
    if not product["image_url"]:
        failed += 1
        continue

    game_id = title_to_game_id(product["name"])
    img_path = f"content/images/swp-scraped/{game_id}.jpg"

    if os.path.exists(img_path):
        skipped += 1
        continue

    try:
        req = urllib.request.Request(product["image_url"], headers={"User-Agent": "Mozilla/5.0"})
        resp = urllib.request.urlopen(req, timeout=15)
        data = resp.read()

        if len(data) > 1000:
            with open(img_path, "wb") as f:
                f.write(data)
            downloaded += 1
            if downloaded % 50 == 0:
                print(f"  Downloaded {downloaded} images...")
        else:
            failed += 1
    except Exception as e:
        failed += 1
        if failed <= 5:
            print(f"  Failed: {product['name']} — {e}")

print(f"\nDownloaded: {downloaded}, Skipped: {skipped}, Failed/no URL: {failed}")

# ── Step 4: Match to our game library ───────────────────────────────
print("\n=== Step 4: Matching to game library ===")

our_games = {}
for f_name in os.listdir("content/games"):
    if f_name.endswith(".json") and f_name != "_template.json":
        gid = f_name.replace(".json", "")
        try:
            gdata = json.load(open(f"content/games/{f_name}"))
            title = gdata.get("title", "").lower()
            if title:
                our_games[title] = gid
            our_games[gid] = gid
        except:
            pass

matched = 0
already_had = 0
unmatched = []

for product in products:
    name = product["name"].strip()
    scraped_id = title_to_game_id(name)
    scraped_path = f"content/images/swp-scraped/{scraped_id}.jpg"

    if not os.path.exists(scraped_path):
        continue

    our_id = our_games.get(name.lower()) or our_games.get(scraped_id)

    # Fuzzy: one contains the other (min length 5)
    if not our_id:
        for our_key, oid in our_games.items():
            if len(our_key) >= 5 and len(scraped_id) >= 5:
                if scraped_id == our_key or (scraped_id in our_key or our_key in scraped_id):
                    our_id = oid
                    break

    if our_id:
        dest = f"content/images/{our_id}.jpg"
        if not os.path.exists(dest):
            shutil.copy2(scraped_path, dest)
            matched += 1
        else:
            already_had += 1
    else:
        unmatched.append(name)

print(f"New covers copied: {matched}")
print(f"Already had cover: {already_had}")
if unmatched:
    print(f"\nUnmatched products ({len(unmatched)}):")
    for u in sorted(unmatched):
        print(f"  - {u}")

# ── Step 5: Final report ────────────────────────────────────────────
print("\n=== IMAGE REPORT ===")
existing_covers = [f for f in os.listdir("content/images")
                   if (f.endswith(".jpg") or f.endswith(".webp") or f.endswith(".png"))
                   and not os.path.isdir(f"content/images/{f}")]
scraped_total = len([f for f in os.listdir("content/images/swp-scraped") if f.endswith(".jpg")])

print(f"RentMy products scraped: {len(products)}")
print(f"Images downloaded to staging: {scraped_total}")
print(f"New covers matched to library: {matched}")
print(f"Total cover images now: {len(existing_covers)}")
