#!/usr/bin/env python3
"""Download game cover art thumbnails from BoardGameGeek."""

import json
import os
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
BGG_IDS_FILE = os.path.join(ROOT_DIR, "content", "bgg-ids.json")
IMAGES_DIR = os.path.join(ROOT_DIR, "content", "images")
BGG_API_URL = "https://boardgamegeek.com/xmlapi2/thing?id={bgg_id}"
DELAY_SECONDS = 5


def main():
    os.makedirs(IMAGES_DIR, exist_ok=True)

    with open(BGG_IDS_FILE, "r") as f:
        bgg_ids = json.load(f)

    total = len(bgg_ids)
    success = 0
    skipped = 0
    failed = 0

    for i, (game_id, bgg_id) in enumerate(bgg_ids.items(), 1):
        dest = os.path.join(IMAGES_DIR, f"{game_id}.jpg")

        if os.path.exists(dest):
            print(f"[{i}/{total}] SKIP {game_id} — already exists")
            skipped += 1
            continue

        try:
            url = BGG_API_URL.format(bgg_id=bgg_id)
            print(f"[{i}/{total}] Fetching BGG data for {game_id} (ID {bgg_id})...")

            req = urllib.request.Request(url, headers={"User-Agent": "GMAI-CoverDownloader/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                xml_data = resp.read()

            root = ET.fromstring(xml_data)
            thumb_el = root.find(".//thumbnail")

            if thumb_el is None or not thumb_el.text:
                print(f"[{i}/{total}] FAIL {game_id} — no thumbnail in BGG response")
                failed += 1
            else:
                thumb_url = thumb_el.text.strip()
                print(f"[{i}/{total}] Downloading {thumb_url}")

                img_req = urllib.request.Request(thumb_url, headers={"User-Agent": "GMAI-CoverDownloader/1.0"})
                with urllib.request.urlopen(img_req, timeout=30) as img_resp:
                    img_data = img_resp.read()

                with open(dest, "wb") as img_file:
                    img_file.write(img_data)

                print(f"[{i}/{total}] OK {game_id} — saved ({len(img_data)} bytes)")
                success += 1

        except Exception as e:
            print(f"[{i}/{total}] FAIL {game_id} — {e}")
            failed += 1

        if i < total:
            time.sleep(DELAY_SECONDS)

    print(f"\n=== SUMMARY ===")
    print(f"Total: {total}")
    print(f"Success: {success}")
    print(f"Skipped: {skipped}")
    print(f"Failed: {failed}")


if __name__ == "__main__":
    main()
