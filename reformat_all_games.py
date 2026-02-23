"""
Reformat all 50 game JSON files to use proper list formatting.
Converts inline numbered lists and bullet-style content into
newline-separated items for clean rendering in the frontend.
"""
import json
import os
import re

GAMES_DIR = "D:/GameMasterAI/content/games"


def split_inline_numbered(text):
    """Split inline numbered lists like '1) Foo. 2) Bar.' into separate lines."""
    # Match patterns like " 2) ", " 3) " that follow a sentence end
    # But be careful not to split things like "2-4 players" or "(2)" references
    parts = re.split(r'(?<=\.)\s+(?=\d+\)\s)', text)
    if len(parts) > 1:
        return "\n\n".join(p.strip() for p in parts if p.strip())
    return text


def split_inline_bullets(text):
    """Split inline bullet items: '- Foo. - Bar.' into separate lines."""
    parts = re.split(r'(?<=\.)\s+(?=- )', text)
    if len(parts) > 1:
        return "\n\n".join(p.strip() for p in parts if p.strip())
    return text


def reformat_content(content):
    """Reformat a single content string for clean list display."""
    if not content or not content.strip():
        return content

    # Split on existing double newlines first
    paragraphs = content.split("\n\n")
    result_paragraphs = []

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        # Check if paragraph has inline numbered items (e.g., "1) Foo. 2) Bar.")
        # Look for pattern: sentence ending with period followed by "N) "
        if re.search(r'\.\s+\d+\)\s', para):
            para = split_inline_numbered(para)

        # Check for inline bullet items
        if re.search(r'\.\s+- ', para) and "\n- " not in para:
            para = split_inline_bullets(para)

        result_paragraphs.append(para)

    return "\n\n".join(result_paragraphs)


def process_game(filepath):
    """Process a single game JSON file."""
    with open(filepath, encoding="utf-8") as f:
        data = json.load(f)

    if "tabs" not in data:
        return False, "no tabs (v1.0?)"

    changed = False
    tabs = data["tabs"]

    for tab_key in ["setup", "rules", "strategy"]:
        tab = tabs.get(tab_key, {})
        for subtopic in tab.get("subtopics", []):
            original = subtopic.get("content", "")
            reformatted = reformat_content(original)
            if reformatted != original:
                subtopic["content"] = reformatted
                changed = True

    if changed:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    return changed, "ok"


def main():
    files = sorted(f for f in os.listdir(GAMES_DIR)
                   if f.endswith(".json") and not f.startswith("_"))

    changed_count = 0
    unchanged_count = 0
    errors = []

    for fname in files:
        filepath = os.path.join(GAMES_DIR, fname)
        try:
            changed, status = process_game(filepath)
            game_id = fname.replace(".json", "")
            if changed:
                changed_count += 1
                print(f"  REFORMATTED: {game_id}")
            else:
                unchanged_count += 1
        except Exception as e:
            errors.append(f"{fname}: {e}")
            print(f"  ERROR: {fname} - {e}")

    print(f"\nDone: {changed_count} reformatted, {unchanged_count} unchanged, {len(errors)} errors")


if __name__ == "__main__":
    main()
