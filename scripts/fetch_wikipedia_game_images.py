"""Fetch board-game images from Wikipedia English pages for the Thai House step-image task.

For each (game_id, wiki_slug) pair:
  - Download the English Wikipedia page HTML
  - Extract all upload.wikimedia.org image URLs
  - Filter out flags/icons/irrelevant chrome
  - Download the first N relevant images as `{game_id}-src-{i}.jpg` to content/images/{game_id}/
  - Resize to max 600px wide, re-save as JPEG q=85

Writes a manifest at content/images/{game_id}/_sources.json mapping downloaded file -> original URL.
"""
from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import unquote
from urllib.request import Request, urlopen

try:
    from PIL import Image
except ImportError:
    print("PIL not installed. pip install pillow", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
IMAGES_ROOT = ROOT / "content" / "images"

UA = "GameMasterGuide/1.0 (https://playgmg.com; contact@playgmg.com) Python-urllib/3"

# Wikipedia slugs for Tier 1..5 games (English Wikipedia article names)
WIKI_SLUGS: dict[str, str] = {
    # Tier 1
    "catan": "Catan",
    "wingspan": "Wingspan_(board_game)",
    "azul": "Azul_(board_game)",
    "splendor": "Splendor_(game)",
    "ticket-to-ride": "Ticket_to_Ride_(board_game)",
    "exploding-kittens": "Exploding_Kittens",
    "codenames": "Codenames_(board_game)",
    "king-of-tokyo": "King_of_Tokyo",
    "pandemic": "Pandemic_(board_game)",
    "everdell": "Everdell",
    # Tier 2
    "carcassonne": "Carcassonne_(board_game)",
    "dixit": "Dixit_(card_game)",
    "sushi-go": "Sushi_Go!",
    "seven-wonders": "7_Wonders_(board_game)",
    "flamecraft": "Flamecraft",
    "cant-stop": "Can%27t_Stop_(board_game)",
    "cant-stop-korean": "Can%27t_Stop_(board_game)",
    "century-golem-edition": "Century:_Spice_Road",
    "machi-koro": "Machi_Koro",
    "one-night-ultimate-werewolf": "Werewolf_(social_deduction_game)",
    # Tier 3
    "codenames-duet": "Codenames_(board_game)",
    "codenames-pictures-heirloom-edition": "Codenames_(board_game)",
    "wavelength": "Wavelength_(game)",
    "secret-hitler": "Secret_Hitler",
    "scattergories": "Scattergories",
    "love-letter": "Love_Letter_(card_game)",
    "spot-it": "Dobble",
    "six-nimmt": "6_nimmt!",
    "the-crew": "The_Crew:_The_Quest_for_Planet_Nine",
    "deception-murder-in-hong-kong": "Deception:_Murder_in_Hong_Kong",
    "uno": "Uno_(card_game)",
    "clue": "Cluedo",
    # Tier 4
    "rummikub": "Rummikub",
    "tokaido": "Tokaido_(board_game)",
    "century-golem-edition-endless-world": "Century:_Spice_Road",
    "risk-game-of-thrones": "Risk_(game)",
    "welcome-to": "Welcome_to...",
    "above-and-below": "Above_and_Below_(board_game)",
    "quacks-of-quedlinburg": "The_Quacks_of_Quedlinburg",
    "betrayal-at-house-on-the-hill": "Betrayal_at_House_on_the_Hill",
    "dead-of-winter": "Dead_of_Winter:_A_Crossroads_Game",
    "villainous": "Disney_Villainous",
    "sheriff-of-nottingham": "Sheriff_of_Nottingham_(board_game)",
    "everdell-pearlbrook": "Everdell",
    "takenoko": "Takenoko_(board_game)",
    # Tier 5
    "scythe": "Scythe_(board_game)",
    "root": "Root_(board_game)",
    "exit-the-game-series": "Exit:_The_Game",
    "5-minute-dungeon": "5-Minute_Dungeon",
    "5-minute-mystery": "5-Minute_Dungeon",
    "unlock-escape-adventures": "Escape_room_game",
    "unlock-mystery-adventures": "Escape_room_game",
    "unlock-secret-adventures": "Escape_room_game",
    "unlock-exotic-adventures": "Escape_room_game",
    "unlock-timeless-adventures": "Escape_room_game",
    "unlock-epic-adventures": "Escape_room_game",
    "unlock-mythic-adventures": "Escape_room_game",
    "unlock-game-adventures": "Escape_room_game",
    "unlock-star-wars-escape-game": "Escape_room_game",
}


IMG_RE = re.compile(
    r'upload\.wikimedia\.org/wikipedia/commons/thumb/[^"\' ]+?/(\d+)px-([^"\' /]+?\.(?:jpg|jpeg|png|JPG|JPEG|PNG|webp))',
    re.IGNORECASE,
)

# Filters for skipping irrelevant images (flags, icons, logos of unrelated stuff)
SKIP_PATTERNS = re.compile(
    r"(?:^|[_\-])(Flag|Icon|Logo|OOjs|Commons|Wiki|Text|Padlock|Chess_|Semi-protection|Question_book|Edit-copy|Wikisource|Wikidata|Speaker|Mouse-cursor|Symbol|Crystal|Ambox|Wikimedia)",
    re.IGNORECASE,
)


def fetch_page(url: str) -> str:
    req = Request(url, headers={"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})
    with urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def extract_image_candidates(html: str) -> list[tuple[str, str]]:
    """Return list of (full_download_url, filename) tuples, de-duped by filename.

    For each unique filename, keep the LARGEST thumbnail size that Wikipedia
    actually emits in the HTML. Wikimedia rejects arbitrary thumbnail widths
    with 429, so we must use sizes the page already references.
    """
    # {filename: (size_px, full_url)}
    best: dict[str, tuple[int, str]] = {}
    for m in IMG_RE.finditer(html):
        size_px = int(m.group(1))
        filename_enc = m.group(2)
        filename = unquote(filename_enc)
        if SKIP_PATTERNS.search(filename):
            continue
        full = f"https://{m.group(0)}"
        if filename not in best or size_px > best[filename][0]:
            best[filename] = (size_px, full)
    return [(url, fn) for fn, (_sz, url) in best.items()]


def download(url: str, dest: Path) -> bool:
    req = Request(url, headers={"User-Agent": UA})
    try:
        with urlopen(req, timeout=30) as resp:
            data = resp.read()
        dest.write_bytes(data)
        return True
    except Exception as e:
        print(f"  ERR download {url}: {e}", file=sys.stderr)
        return False


def process_image(path: Path, max_width: int = 600) -> bool:
    try:
        img = Image.open(path)
        if img.mode in ("RGBA", "P", "LA"):
            # Flatten transparency onto white background
            bg = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            bg.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
            img = bg
        elif img.mode != "RGB":
            img = img.convert("RGB")
        if img.size[0] > max_width:
            ratio = max_width / img.size[0]
            img = img.resize((max_width, int(img.size[1] * ratio)), Image.LANCZOS)
        # Always save as .jpg
        out = path.with_suffix(".jpg")
        img.save(out, "JPEG", quality=85, optimize=True)
        if out != path:
            path.unlink(missing_ok=True)
        return True
    except Exception as e:
        print(f"  ERR process {path}: {e}", file=sys.stderr)
        path.unlink(missing_ok=True)
        return False


def search_commons_api(query: str, limit: int = 10) -> list[tuple[str, str]]:
    """Search Wikimedia Commons for images via the MediaWiki API.

    Returns (download_url, filename) pairs. Uses the 640px thumbnail version
    so we stay within Wikimedia's allowed thumbnail steps.
    """
    import urllib.parse
    q = urllib.parse.quote(query)
    api = (
        f"https://commons.wikimedia.org/w/api.php"
        f"?action=query&format=json&generator=search"
        f"&gsrsearch={q}+filetype:bitmap&gsrlimit={limit}&gsrnamespace=6"
        f"&prop=imageinfo&iiprop=url|size&iiurlwidth=640"
    )
    req = Request(api, headers={"User-Agent": UA})
    try:
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"  ERR commons search '{query}': {e}", file=sys.stderr)
        return []
    pages = data.get("query", {}).get("pages", {}) or {}
    results: list[tuple[str, str]] = []
    for page in pages.values():
        title = page.get("title", "")  # e.g. "File:Foo.jpg"
        filename = title.split(":", 1)[-1]
        if SKIP_PATTERNS.search(filename):
            continue
        infos = page.get("imageinfo") or []
        if not infos:
            continue
        info = infos[0]
        thumb = info.get("thumburl") or info.get("url")
        if not thumb:
            continue
        results.append((thumb, filename))
    return results


def process_game(game_id: str, wiki_slug: str, max_images: int = 8) -> dict:
    print(f"\n=== {game_id} ({wiki_slug}) ===")
    game_dir = IMAGES_ROOT / game_id
    game_dir.mkdir(parents=True, exist_ok=True)

    url = f"https://en.wikipedia.org/wiki/{wiki_slug}"
    try:
        html = fetch_page(url)
    except Exception as e:
        print(f"  ERR fetch {url}: {e}", file=sys.stderr)
        return {"game_id": game_id, "wiki_url": url, "error": str(e), "images": []}

    candidates = extract_image_candidates(html)
    # If Wikipedia page yielded nothing, try Commons category/keyword search
    if not candidates:
        print(f"  [fallback] No wiki images; searching Commons...")
        # Derive a plain-English query from the wiki slug
        plain = unquote(wiki_slug).replace("_", " ")
        # Strip disambig like "(board game)", "(card game)"
        plain = re.sub(r"\s*\([^)]*\)\s*$", "", plain)
        query = f"{plain} board game"
        candidates = search_commons_api(query, limit=max_images * 2)
    # Heuristic: prefer images whose filename contains game-relevant words
    title_words = set(re.findall(r"[A-Za-z]+", wiki_slug.lower()))

    def score(name: str) -> int:
        low = name.lower()
        s = 0
        for w in title_words:
            if len(w) >= 4 and w in low:
                s += 10
        # Bonus for setup/board/components keywords
        for kw in ("board", "setup", "game", "component", "card", "tile", "play"):
            if kw in low:
                s += 2
        return s

    candidates.sort(key=lambda c: score(c[1]), reverse=True)

    manifest = {"game_id": game_id, "wiki_url": url, "images": []}
    for i, (dl_url, filename) in enumerate(candidates[:max_images], start=1):
        print(f"  [{i}] {filename}")
        # Sanitize filename extension
        ext = Path(filename).suffix.lower() or ".jpg"
        dest = game_dir / f"{game_id}-src-{i:02d}{ext}"
        if not download(dl_url, dest):
            continue
        if not process_image(dest):
            continue
        final = dest.with_suffix(".jpg")
        manifest["images"].append({
            "file": final.name,
            "source_url": dl_url,
            "original_filename": filename,
        })
        time.sleep(0.3)  # gentle rate limiting

    (game_dir / "_sources.json").write_text(json.dumps(manifest, indent=2))
    print(f"  saved {len(manifest['images'])} images")
    return manifest


def main():
    game_ids = sys.argv[1:] if len(sys.argv) > 1 else list(WIKI_SLUGS.keys())
    all_results = []
    for gid in game_ids:
        if gid not in WIKI_SLUGS:
            print(f"SKIP {gid}: no wiki slug mapping", file=sys.stderr)
            continue
        result = process_game(gid, WIKI_SLUGS[gid])
        all_results.append(result)
    print(f"\n=== DONE: {len(all_results)} games processed ===")
    for r in all_results:
        print(f"  {r['game_id']}: {len(r.get('images', []))} images")


if __name__ == "__main__":
    main()
