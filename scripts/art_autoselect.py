"""
Box Art Auto-Selector — A-C games only
Scores candidate images on criteria that identify clean box art vs gameplay photos.
"""

import os
import json
import shutil
from PIL import Image, ImageStat, ImageFilter
import numpy as np

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False
    print("WARNING: opencv not available — some scoring features disabled")

try:
    import pytesseract
    if os.path.exists(r"C:\Program Files\Tesseract-OCR\tesseract.exe"):
        pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    HAS_OCR = True
except ImportError:
    HAS_OCR = False
    print("WARNING: pytesseract not available — OCR scoring disabled")


def score_image(filepath, game_title):
    """Score an image 0-100 on how likely it is to be clean box art."""
    scores = {}

    try:
        img = Image.open(filepath)
        if img.mode != 'RGB':
            img = img.convert('RGB')
    except Exception as e:
        print(f"    Cannot open {filepath}: {e}")
        return 0, {}

    width, height = img.size
    pixels = np.array(img)

    # CRITERION 1: ASPECT RATIO (0-15 points)
    ratio = max(width, height) / max(min(width, height), 1)
    if ratio <= 1.15:
        scores["aspect"] = 15
    elif ratio <= 1.3:
        scores["aspect"] = 12
    elif ratio <= 1.5:
        scores["aspect"] = 8
    elif ratio <= 2.0:
        scores["aspect"] = 4
    else:
        scores["aspect"] = 0

    # CRITERION 2: FILLS THE FRAME (0-20 points)
    edge_size = max(5, min(width, height) // 20)
    top = pixels[:edge_size, :, :].reshape(-1, 3)
    bottom = pixels[-edge_size:, :, :].reshape(-1, 3)
    left = pixels[:, :edge_size, :].reshape(-1, 3)
    right = pixels[:, -edge_size:, :].reshape(-1, 3)
    edges = np.vstack([top, bottom, left, right])
    edge_std = np.mean(np.std(edges, axis=0))

    if edge_std > 50:
        scores["fills_frame"] = 20
    elif edge_std > 35:
        scores["fills_frame"] = 15
    elif edge_std > 25:
        scores["fills_frame"] = 10
    elif edge_std > 15:
        scores["fills_frame"] = 5
    else:
        scores["fills_frame"] = 0

    # CRITERION 3: COLOR SATURATION (0-10 points)
    hsv = img.convert("HSV")
    hsv_arr = np.array(hsv)
    mean_saturation = np.mean(hsv_arr[:, :, 1])

    if mean_saturation > 100:
        scores["saturation"] = 10
    elif mean_saturation > 70:
        scores["saturation"] = 8
    elif mean_saturation > 50:
        scores["saturation"] = 5
    elif mean_saturation > 30:
        scores["saturation"] = 3
    else:
        scores["saturation"] = 0

    # CRITERION 4: NO TABLE/BACKGROUND DETECTION (0-15 points)
    edge_hsv = np.array(hsv.crop((0, 0, width, edge_size)))
    edge_hue = edge_hsv[:, :, 0].flatten()
    edge_sat = edge_hsv[:, :, 1].flatten()

    brown_mask = (edge_hue > 5) & (edge_hue < 35) & (edge_sat > 20) & (edge_sat < 150)
    brown_pct = np.sum(brown_mask) / max(len(brown_mask), 1)

    edge_val = edge_hsv[:, :, 2].flatten()
    white_mask = (edge_sat < 30) & (edge_val > 200)
    white_pct = np.sum(white_mask) / max(len(white_mask), 1)

    if brown_pct < 0.1 and white_pct < 0.3:
        scores["no_table"] = 15
    elif brown_pct < 0.2 and white_pct < 0.5:
        scores["no_table"] = 10
    elif brown_pct < 0.4:
        scores["no_table"] = 5
    else:
        scores["no_table"] = 0

    # CRITERION 5: IMAGE SIZE (0-10 points)
    file_size = os.path.getsize(filepath)
    total_pixels = width * height

    if total_pixels > 200000 and file_size > 50000:
        scores["size"] = 10
    elif total_pixels > 100000 and file_size > 20000:
        scores["size"] = 7
    elif total_pixels > 50000:
        scores["size"] = 4
    else:
        scores["size"] = 1

    # CRITERION 6: TEXT DETECTION (0-20 points)
    scores["has_title"] = 0
    if HAS_OCR:
        try:
            ocr_text = pytesseract.image_to_string(img, timeout=10).lower()
            title_lower = game_title.lower()
            if title_lower in ocr_text:
                scores["has_title"] = 20
            else:
                title_words = [w for w in title_lower.split() if len(w) >= 4]
                matches = sum(1 for w in title_words if w in ocr_text)
                if matches > 0:
                    scores["has_title"] = min(15, matches * 8)
        except Exception:
            pass

    # CRITERION 7: NOT ANGLED (0-10 points)
    if HAS_CV2:
        try:
            gray = cv2.cvtColor(pixels, cv2.COLOR_RGB2GRAY)
            edges_cv = cv2.Canny(gray, 50, 150)
            lines = cv2.HoughLinesP(edges_cv, 1, np.pi/180, threshold=80,
                                     minLineLength=min(width, height)//4, maxLineGap=10)
            diagonal_count = 0
            if lines is not None:
                for line in lines:
                    x1, y1, x2, y2 = line[0]
                    if abs(x2 - x1) > 0:
                        angle = abs(np.degrees(np.arctan2(y2-y1, x2-x1)))
                        if (20 < angle < 70) or (110 < angle < 160):
                            diagonal_count += 1
            if diagonal_count < 3:
                scores["not_angled"] = 10
            elif diagonal_count < 8:
                scores["not_angled"] = 6
            elif diagonal_count < 15:
                scores["not_angled"] = 3
            else:
                scores["not_angled"] = 0
        except Exception:
            scores["not_angled"] = 5
    else:
        scores["not_angled"] = 5

    total = sum(scores.values())
    return total, scores


def select_best_art(games_dir, candidates_dir, winners_dir):
    """Process A-C games and auto-select the best candidate"""

    os.makedirs(winners_dir, exist_ok=True)

    games = []
    for fname in sorted(os.listdir(games_dir)):
        if not fname.endswith('.json') or fname.startswith('_'):
            continue
        game_id = fname.replace('.json', '')
        # FILTER: A-C games only
        if not game_id[0] in 'abc':
            continue
        with open(os.path.join(games_dir, fname), encoding='utf-8') as f:
            game = json.load(f)
        games.append({
            "game_id": game_id,
            "title": game.get("title", "")
        })

    print(f"Found {len(games)} A-C games to process")

    results = {"selected": 0, "no_candidates": 0, "failed": 0}
    all_scores = {}

    for i, game in enumerate(games):
        game_id = game["game_id"]
        title = game["title"]
        folder = os.path.join(candidates_dir, game_id)

        if not os.path.exists(folder):
            print(f"[{i+1}/{len(games)}] {title} — NO FOLDER")
            results["no_candidates"] += 1
            continue

        candidates = [f for f in os.listdir(folder)
                      if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))
                      and os.path.getsize(os.path.join(folder, f)) > 3000]

        if not candidates:
            print(f"[{i+1}/{len(games)}] {title} — NO CANDIDATES")
            results["no_candidates"] += 1
            continue

        print(f"\n[{i+1}/{len(games)}] {title} ({len(candidates)} candidates)")

        # Score each candidate
        candidate_scores = []
        for fname in candidates:
            filepath = os.path.join(folder, fname)
            score, details = score_image(filepath, title)
            candidate_scores.append((fname, score, details))
            detail_str = " | ".join(f"{k}:{v}" for k, v in details.items())
            print(f"    {fname}: {score}/100 [{detail_str}]")

        # Pick the best
        candidate_scores.sort(key=lambda x: x[1], reverse=True)
        best_name, best_score, best_details = candidate_scores[0]

        # Copy winner
        src = os.path.join(folder, best_name)
        dst = os.path.join(winners_dir, f"{game_id}.jpg")

        try:
            img = Image.open(src)
            if img.mode == 'RGBA':
                img = img.convert('RGB')
            if img.width > 400 or img.height > 400:
                img.thumbnail((400, 400), Image.LANCZOS)
            img.save(dst, 'JPEG', quality=90)

            print(f"  WINNER: {best_name} (score: {best_score})")
            results["selected"] += 1

            all_scores[game_id] = {
                "winner": best_name,
                "score": best_score,
                "details": best_details,
                "runner_up": candidate_scores[1][0] if len(candidate_scores) > 1 else None,
                "runner_up_score": candidate_scores[1][1] if len(candidate_scores) > 1 else None
            }
        except Exception as e:
            print(f"  ERROR: {e}")
            results["failed"] += 1

    # Save scoring report
    report_path = os.path.join(winners_dir, "_scores.json")
    with open(report_path, "w") as f:
        json.dump(all_scores, f, indent=2)

    # Save review list
    review_path = os.path.join(winners_dir, "_NEEDS_REVIEW.txt")
    with open(review_path, "w") as f:
        f.write("GAMES WHERE AUTO-SELECTOR IS LOW CONFIDENCE (score < 50)\n")
        f.write("Tim should manually check these:\n\n")
        low_conf = [(gid, info) for gid, info in all_scores.items() if info["score"] < 50]
        low_conf.sort(key=lambda x: x[1]["score"])
        for gid, info in low_conf:
            f.write(f"  {gid:40s}  score: {info['score']:3d}  winner: {info['winner']}\n")
        f.write(f"\nTotal needing review: {len(low_conf)}\n")

    print(f"\n{'='*60}")
    print(f"RESULTS:")
    print(f"  Auto-selected:   {results['selected']}")
    print(f"  No candidates:   {results['no_candidates']}")
    print(f"  Failed:          {results['failed']}")
    print(f"\nWinners saved to: {winners_dir}")
    print(f"Scores saved to: {report_path}")
    print(f"Review list: {review_path}")


if __name__ == "__main__":
    games_dir = r"D:\GameMasterAI\content\games"
    candidates_dir = r"D:\GameMasterAI\content\art-candidates"
    winners_dir = r"D:\GameMasterAI\content\art-winners"

    select_best_art(games_dir, candidates_dir, winners_dir)
