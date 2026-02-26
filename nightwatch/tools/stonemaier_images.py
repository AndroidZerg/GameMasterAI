"""
Fetch Stonemaier Games images from BGG.
Permission granted by Stonemaier Games (Jamey Stegmaier) to use publicly available images.

Uses api.geekdo.com JSON API for image gallery queries (the XML API now requires auth tokens).
Falls back to known image URLs if the API is unavailable.
"""

import json
import os
import time
from datetime import datetime

import requests

STONEMAIER_GAMES = [
    {"game_id": "scythe",    "title": "Scythe",    "bgg_id": 169786},
    {"game_id": "wingspan",  "title": "Wingspan",  "bgg_id": 266192},
    {"game_id": "viticulture", "title": "Viticulture Essential Edition", "bgg_id": 183394},
    {"game_id": "charterstone",  "title": "Charterstone",  "bgg_id": 197376},
    {"game_id": "tapestry",      "title": "Tapestry",      "bgg_id": 286096},
    {"game_id": "red-rising",    "title": "Red Rising",    "bgg_id": 322623},
    {"game_id": "between-two-castles", "title": "Between Two Castles of Mad King Ludwig", "bgg_id": 245655},
    {"game_id": "between-two-cities",  "title": "Between Two Cities",  "bgg_id": 168435},
    {"game_id": "euphoria",      "title": "Euphoria: Build a Better Dystopia", "bgg_id": 135608},
    {"game_id": "pendulum",      "title": "Pendulum",      "bgg_id": 301901},
    {"game_id": "libertalia",    "title": "Libertalia: Winds of Galecrest", "bgg_id": 356774},
    {"game_id": "apiary",        "title": "Apiary",        "bgg_id": 400314},
    {"game_id": "expeditions",   "title": "Expeditions",   "bgg_id": 379078},
    {"game_id": "my-little-scythe", "title": "My Little Scythe", "bgg_id": 254127},
    {"game_id": "rolling-realms",   "title": "Rolling Realms",   "bgg_id": 321452},
]

# Known image URLs discovered via api.geekdo.com BoxFront gallery queries.
# Used as fallback if the live API is unavailable.
KNOWN_IMAGE_URLS = {
    "scythe": "https://cf.geekdo-images.com/Vf_rW03DVukbkbiCsz69VA__original/img/1mHZjZ9WOnTPCvVWQXYYHUPR9Sw=/0x0/filters:format(jpeg)/pic2323719.jpg",
    "wingspan": "https://cf.geekdo-images.com/yLZJCVLlIx4c7eJEWUNJ7w__original/img/cI782Zis9cT66j2MjSHKJGnFPNw=/0x0/filters:format(jpeg)/pic4458123.jpg",
    "viticulture": "https://cf.geekdo-images.com/2muMiNgOIYipDr5fnYJqKg__original/img/Gj_3_R6LXYqKwFh2jZAFhNrcQyU=/0x0/filters:format(jpeg)/pic2649952.jpg",
    "charterstone": "https://cf.geekdo-images.com/yKjDaHQiv28iqtzDxfQOZQ__original/img/TBiQWuVmimy-SBNrsBheCAspf78=/0x0/filters:format(jpeg)/pic3322613.jpg",
    "tapestry": "https://cf.geekdo-images.com/7kqDmkUMGxXHr1wNPA7Gvg__original/img/e6rS0PyrVlPpJjCsWPmCaGg9PXc=/0x0/filters:format(jpeg)/pic4884996.jpg",
    "red-rising": "https://cf.geekdo-images.com/V6QEXXgRgz3urOrRVZ_1zA__original/img/Gp9hIVv-zRxlkrO5Pmg3aXb4P1M=/0x0/filters:format(jpeg)/pic5960554.jpg",
    "between-two-castles": "https://cf.geekdo-images.com/IwczsFUMHhIyI_39wFaHWw__original/img/jHHxcaBR6CKa16JvSEd5nY0MOsI=/0x0/filters:format(jpeg)/pic4285717.jpg",
    "between-two-cities": "https://cf.geekdo-images.com/2-3HBsfKxeSvE4J3yI6Mlw__original/img/5z8j8KjFphv0I1ku6-0t9NW9gG8=/0x0/filters:format(jpeg)/pic2326114.jpg",
    "euphoria": "https://cf.geekdo-images.com/15VJIS_4oY6UoKJqN8xfOQ__original/img/vCEvSwdaTbmdhrN-hJQ0F11FUTs=/0x0/filters:format(jpeg)/pic1614853.jpg",
    "pendulum": "https://cf.geekdo-images.com/kgypcFnQosrcwYx5Jluafg__original/img/NahdiNIC18lj_BsU_9Ju7Hb9mek=/0x0/filters:format(jpeg)/pic5507191.jpg",
    "libertalia": "https://cf.geekdo-images.com/6e-V_Xb2IsAsMNXU18Fi6A__original/img/gLDo-RR_9RvU_Hrs9DnHWy_TWpk=/0x0/filters:format(jpeg)/pic6669033.jpg",
    "apiary": "https://cf.geekdo-images.com/dT1vJbUizZFmJAphKg-byA__original/img/lQe_6iIMvCPrG9aH65RjiWL3s2Q=/0x0/filters:format(png)/pic7720813.png",
    "expeditions": "https://cf.geekdo-images.com/9eBww9iAi472T2goijVqwQ__original/img/uvxTECY9yY2ONOllPgv7xLZCrGU=/0x0/filters:format(jpeg)/pic7320023.jpg",
    "my-little-scythe": "https://cf.geekdo-images.com/b7YuM8EgzlquhPuoWNWI4Q__original/img/1c-HYS9y8IohaDv_9ivNG9EPkSg=/0x0/filters:format(png)/pic4111946.png",
    "rolling-realms": "https://cf.geekdo-images.com/FEfq_WDFxvEjMEg1UCFXuA__original/img/9wmiduucCrB97SaHoowQhcr_DaY=/0x0/filters:format(jpeg)/pic5318301.jpg",
}

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
IMAGES_DIR = os.path.join(PROJECT_ROOT, "content", "images")
RESULTS_TXT = os.path.join(SCRIPT_DIR, "stonemaier_image_results.txt")
RESULTS_JSON = os.path.join(SCRIPT_DIR, "stonemaier_image_urls.json")

DOWNLOAD_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
MIN_FILE_SIZE = 10 * 1024  # 10KB


def fetch_bgg_image_url(bgg_id):
    """Fetch image URL from BGG's geekdo JSON API (BoxFront tag, hot sort)."""
    url = (
        f"https://api.geekdo.com/api/images?ajax=1&gallery=game&nosession=1"
        f"&objectid={bgg_id}&objecttype=thing&sort=hot&tag=BoxFront"
    )
    resp = requests.get(url, headers={"User-Agent": DOWNLOAD_UA}, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    images = data.get("images", [])
    if images:
        # Return the first (hottest) BoxFront image, original size
        img = images[0]
        img_url = img.get("imageurl_lg") or img.get("imageurl")
        if img_url:
            return img_url
    raise ValueError(f"No BoxFront images found for BGG ID {bgg_id}")


def download_image(image_url, dest_path):
    """Attempt to download the image. Returns True if successful."""
    resp = requests.get(
        image_url,
        headers={"User-Agent": DOWNLOAD_UA},
        stream=True,
        timeout=30,
    )
    if resp.status_code != 200:
        return False

    with open(dest_path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)

    if os.path.getsize(dest_path) < MIN_FILE_SIZE:
        os.remove(dest_path)
        return False
    return True


def main():
    os.makedirs(IMAGES_DIR, exist_ok=True)

    downloaded = []
    url_only = []
    failed = []

    for i, game in enumerate(STONEMAIER_GAMES):
        gid = game["game_id"]
        bgg_id = game["bgg_id"]
        title = game["title"]
        print(f"[{i+1}/{len(STONEMAIER_GAMES)}] {title} (BGG {bgg_id})...", end=" ", flush=True)

        # Step 1: get image URL (try API, fall back to known URLs)
        image_url = None
        try:
            image_url = fetch_bgg_image_url(bgg_id)
        except Exception as e:
            print(f"API failed ({e}), ", end="", flush=True)

        if not image_url:
            image_url = KNOWN_IMAGE_URLS.get(gid)
            if image_url:
                print("using known URL... ", end="", flush=True)
            else:
                print("FAILED - no URL available")
                failed.append({"game_id": gid, "error": "No API result and no known URL"})
                if i < len(STONEMAIER_GAMES) - 1:
                    time.sleep(2)
                continue

        # Step 2: attempt download
        ext = ".png" if "format(png)" in image_url else ".jpg"
        dest = os.path.join(IMAGES_DIR, f"{gid}{ext}")
        try:
            ok = download_image(image_url, dest)
        except Exception:
            ok = False

        if ok:
            size_kb = os.path.getsize(dest) / 1024
            print(f"DOWNLOADED ({size_kb:.0f} KB)")
            downloaded.append({"game_id": gid, "url": image_url, "ext": ext})
        else:
            print(f"URL_ONLY")
            url_only.append({"game_id": gid, "url": image_url, "ext": ext})
            if os.path.exists(dest):
                os.remove(dest)

        # Step 3: rate limit
        if i < len(STONEMAIER_GAMES) - 1:
            time.sleep(2)

    # Step 4: write output files
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Results TXT
    lines = [
        "=== STONEMAIER IMAGE RESULTS ===",
        f"Generated: {timestamp}",
        "",
    ]

    lines.append("DOWNLOADED (saved to content/images/):")
    if downloaded:
        for d in downloaded:
            lines.append(f"  {d['game_id']}{d['ext']} -- {d['url']}")
    else:
        lines.append("  (none)")
    lines.append("")

    lines.append("URL ONLY (download manually, save as content/images/{game_id}.jpg):")
    if url_only:
        for u in url_only:
            lines.append(f"  {u['game_id']}{u['ext']} -- {u['url']}")
    else:
        lines.append("  (none)")
    lines.append("")

    lines.append("FAILED (BGG lookup failed, find image manually):")
    if failed:
        for f_ in failed:
            lines.append(f"  {f_['game_id']} -- {f_['error']}")
    else:
        lines.append("  (none)")
    lines.append("")

    txt_content = "\n".join(lines)
    with open(RESULTS_TXT, "w", encoding="utf-8") as f:
        f.write(txt_content)

    # Results JSON
    json_data = {}
    for d in downloaded:
        json_data[d["game_id"]] = {"url": d["url"], "status": "downloaded"}
    for u in url_only:
        json_data[u["game_id"]] = {"url": u["url"], "status": "url_only"}
    for f_ in failed:
        json_data[f_["game_id"]] = {"url": None, "status": "failed", "error": f_["error"]}

    with open(RESULTS_JSON, "w", encoding="utf-8") as f:
        json.dump(json_data, f, indent=2)

    # Summary
    print(f"\n{'='*50}")
    print(f"DONE: {len(downloaded)} downloaded, {len(url_only)} url_only, {len(failed)} failed")
    print(f"Results: {RESULTS_TXT}")
    print(f"JSON:    {RESULTS_JSON}")
    print()
    print(txt_content)


if __name__ == "__main__":
    main()
