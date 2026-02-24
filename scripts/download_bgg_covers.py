#!/usr/bin/env python3
"""Download cover art from BGG via geekdo API.

Uses the geekdo images API (gallery=all, sort=hot) to get the highest-rated
image for each game, then downloads the large version from the CDN.
"""

import json
import os
import sys
import time

import requests

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
})

BGG_IDS = {
    "catan": 13,
    "ticket-to-ride": 9209,
    "carcassonne": 822,
    "azul": 230802,
    "splendor": 148228,
    "codenames": 178900,
    "kingdomino": 204583,
    "sushi-go-party": 192291,
    "patchwork": 163412,
    "century-spice-road": 209685,
    "wingspan": 266192,
    "seven-wonders": 68448,
    "pandemic": 30549,
    "dominion": 36218,
    "everdell": 199792,
    "terraforming-mars": 167791,
    "sagrada": 199561,
    "above-and-below": 172818,
    "lords-of-waterdeep": 110327,
    "clank": 201808,
    "dixit": 39856,
    "wavelength": 262543,
    "just-one": 254640,
    "the-crew": 284083,
    "coup": 131357,
    "love-letter": 129622,
    "skull": 92415,
    "one-night-ultimate-werewolf": 147949,
    "telestrations": 46213,
    "decrypto": 225694,
    "betrayal-at-house-on-the-hill": 10547,
    "mysterium": 181304,
    "villainous": 256382,
    "photosynthesis": 218603,
    "takenoko": 70919,
    "sheriff-of-nottingham": 157969,
    "dead-of-winter": 150376,
    "cosmic-encounter": 39463,
    "king-of-tokyo": 70323,
    "quacks-of-quedlinburg": 244521,
    "scythe": 169786,
    "spirit-island": 162886,
    "brass-birmingham": 224517,
    "root": 237182,
    "agricola": 31260,
    "concordia": 124361,
    "great-western-trail": 193738,
    "viticulture": 183394,
    "castles-of-burgundy": 84876,
    "power-grid": 2651,
}

IMAGES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "content", "images")
os.makedirs(IMAGES_DIR, exist_ok=True)


def get_best_image_url(bgg_id):
    """Get the highest-rated image URL for a BGG game."""
    url = (
        f"https://api.geekdo.com/api/images?ajax=1&gallery=all&nosession=1"
        f"&objectid={bgg_id}&objecttype=thing&pageid=1&showcount=1&size=thumb&sort=hot"
    )
    resp = session.get(url, timeout=15)
    if resp.status_code != 200:
        return None

    data = resp.json()
    images = data.get("images", [])
    if not images:
        return None

    # Get the large version URL
    return images[0].get("imageurl_lg")


def download_image(img_url, filepath):
    """Download an image from URL to filepath."""
    resp = session.get(img_url, timeout=20)
    if resp.status_code == 200 and len(resp.content) > 1000:
        with open(filepath, "wb") as f:
            f.write(resp.content)
        return len(resp.content)
    return 0


def main():
    success = 0
    failed = []
    total = len(BGG_IDS)

    print(f"Downloading cover images for {total} games via geekdo API...")
    print(f"Output: {IMAGES_DIR}")
    print()

    for i, (game_id, bgg_id) in enumerate(BGG_IDS.items(), 1):
        try:
            # Get the best image URL
            img_url = get_best_image_url(bgg_id)
            if not img_url:
                msg = f"[{i}/{total}] FAIL {game_id}: No image found"
                print(msg)
                failed.append(game_id)
                time.sleep(3)
                continue

            # Download it
            filepath = os.path.join(IMAGES_DIR, f"{game_id}.jpg")
            size = download_image(img_url, filepath)

            if size > 0:
                success += 1
                msg = f"[{i}/{total}] OK {game_id}: {size:,} bytes"
                print(msg)
            else:
                msg = f"[{i}/{total}] FAIL {game_id}: Download failed"
                print(msg)
                failed.append(game_id)

            # Be nice to BGG — 5 second delay
            time.sleep(5)

        except Exception as e:
            msg = f"[{i}/{total}] ERROR {game_id}: {e}"
            print(msg)
            failed.append(game_id)
            time.sleep(3)

    print(f"\nDone: {success}/{total} downloaded, {len(failed)} failed")
    if failed:
        print(f"Failed: {failed}")

    return success, failed


if __name__ == "__main__":
    success, failed = main()
    sys.exit(0 if not failed else 1)
