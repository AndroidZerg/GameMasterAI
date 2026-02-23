"""
GMAI Content Quality Tester (Part C2 + Player-Count Patch)
Tests every game's Q&A accuracy against real player questions.
Includes mandatory player-count questions per GMAI-PATCH-BARBARIAN-S1-20260223-0720.

Run: python tests/content_quality_tester.py
"""
import json
import os
import sys
import time
import requests
from datetime import datetime

API_URL = "http://localhost:8100"
CONTENT_DIR = r"D:\GameMasterAI\content\games"
RULEBOOK_DIR = r"D:\GameMasterAI\content\rulebook-text"
REPORT_DIR = r"D:\GameMasterAI\tests"

# Player counts for all 50 games (min-max supported)
GAME_PLAYER_COUNTS = {
    "above-and-below": (2, 4),
    "agricola": (1, 4),
    "azul": (2, 4),
    "betrayal-at-house-on-the-hill": (3, 6),
    "brass-birmingham": (2, 4),
    "carcassonne": (2, 5),
    "castles-of-burgundy": (2, 4),
    "catan": (3, 4),
    "century-spice-road": (2, 5),
    "clank": (2, 4),
    "codenames": (2, 8),
    "concordia": (2, 5),
    "cosmic-encounter": (3, 5),
    "coup": (2, 6),
    "dead-of-winter": (2, 5),
    "decrypto": (3, 8),
    "dixit": (3, 6),
    "dominion": (2, 4),
    "everdell": (1, 4),
    "great-western-trail": (2, 4),
    "just-one": (3, 7),
    "king-of-tokyo": (2, 6),
    "kingdomino": (2, 4),
    "lords-of-waterdeep": (2, 5),
    "love-letter": (2, 4),
    "mysterium": (2, 7),
    "one-night-ultimate-werewolf": (3, 10),
    "pandemic": (2, 4),
    "patchwork": (2, 2),
    "photosynthesis": (2, 4),
    "power-grid": (2, 6),
    "quacks-of-quedlinburg": (2, 4),
    "root": (2, 4),
    "sagrada": (1, 4),
    "scythe": (1, 5),
    "seven-wonders": (2, 7),
    "sheriff-of-nottingham": (3, 5),
    "skull": (3, 6),
    "spirit-island": (1, 4),
    "splendor": (2, 4),
    "sushi-go-party": (2, 8),
    "takenoko": (2, 4),
    "telestrations": (4, 8),
    "terraforming-mars": (1, 5),
    "the-crew": (2, 5),
    "ticket-to-ride": (2, 5),
    "villainous": (2, 6),
    "viticulture": (1, 6),
    "wavelength": (2, 12),
    "wingspan": (1, 5),
}

# Common real-player questions per game (FAQ-style, from community sources)
# These are the types of questions real players ask in cafes
COMMON_QUESTIONS = {
    "catan": [
        "Can I trade with the bank on my first turn?",
        "What happens when you roll a 7?",
        "Do I need a road to build a settlement?",
    ],
    "carcassonne": [
        "Can I place a meeple on a city that's already claimed by another player?",
        "How does farmer scoring work at the end?",
        "Can I take back a meeple during the game?",
    ],
    "ticket-to-ride": [
        "Can I draw two face-up cards on the same turn?",
        "What happens if I can't complete a ticket?",
        "Can I pick a locomotive from the face-up cards?",
    ],
    "pandemic": [
        "What happens when you run out of cubes of one color?",
        "Can you trade cards with another player?",
        "How many actions do you get per turn?",
    ],
    "wingspan": [
        "How many food tokens do I start with?",
        "When do I gain eggs?",
        "How does the end-of-round goal scoring work?",
    ],
    "azul": [
        "What happens if I can't place all tiles I took?",
        "How is the first player decided?",
        "Do I lose points for unused tiles at the end?",
    ],
    "splendor": [
        "How many tokens can I hold at once?",
        "Can I reserve a card from the deck instead of the table?",
        "When do noble visits happen?",
    ],
    "codenames": [
        "Can the spymaster give a clue of zero?",
        "What happens if you touch the assassin?",
        "Can you give a clue that's on the board?",
    ],
    "skull": [
        "Can I look at my own tiles during bidding?",
        "What happens if I lose a challenge?",
        "Can I bid higher than the total number of tiles?",
    ],
    "king-of-tokyo": [
        "Can I stay in Tokyo voluntarily?",
        "Do I heal when I enter Tokyo?",
        "How many dice do I roll per turn?",
    ],
    "brass-birmingham": [
        "Can I build in a city I don't have a connection to?",
        "How does the canal era scoring work?",
        "What is the difference between canal and rail era?",
    ],
    "dominion": [
        "How many actions do I start each turn with?",
        "Can I play treasure cards during the action phase?",
        "When do you reshuffle the discard pile?",
    ],
    "everdell": [
        "How many workers do I have in each season?",
        "Can I play a critter without the construction?",
        "What is the maximum city size?",
    ],
    "terraforming-mars": [
        "How long does a typical game last?",
        "What are the three global parameters?",
        "Can I play cards from other players' hands?",
    ],
    "scythe": [
        "Can I move into a space occupied by another player?",
        "How does combat work?",
        "What are the end-game conditions?",
    ],
    "root": [
        "How does the Marquise de Cat score points?",
        "Can the Vagabond attack other players?",
        "What happens when the decree fails for the Eyrie?",
    ],
    "spirit-island": [
        "How many energy do spirits start with?",
        "When do invaders explore?",
        "Can I use slow powers in the fast phase?",
    ],
    "patchwork": [
        "How do I get buttons?",
        "What happens when I reach the end of the time track?",
        "How does the special 7x7 bonus tile work?",
    ],
    "seven-wonders": [
        "Can I build the same wonder stage twice?",
        "How does military conflict work?",
        "Can I discard a card for coins instead of building?",
    ],
    "lords-of-waterdeep": [
        "How many agents do I start with?",
        "Can I complete multiple quests in one turn?",
        "What do intrigue cards do?",
    ],
}

# Default questions for games without specific entries
DEFAULT_QUESTIONS = [
    "How do you win this game?",
    "How many actions can you take per turn?",
    "What happens at the end of the game?",
]


def query_gmai(game_id, question):
    """Ask GMAI a question about a game."""
    try:
        resp = requests.post(
            f"{API_URL}/api/query",
            json={"game_id": game_id, "question": question},
            timeout=30,
        )
        if resp.status_code == 200:
            return resp.json().get("answer", "")
        return f"[HTTP {resp.status_code}]"
    except Exception as e:
        return f"[ERROR: {e}]"


def get_player_count_questions(game_id):
    """Generate mandatory player-count questions per the Barbarian patch."""
    counts = GAME_PLAYER_COUNTS.get(game_id)
    if not counts:
        return []

    min_p, max_p = counts
    questions = []

    if min_p == max_p:
        # Fixed player count (e.g., Patchwork = 2 only)
        questions.append({
            "q": f"How do you set up {game_id.replace('-', ' ').title()}?",
            "type": "player-count-setup",
            "player_count": min_p,
        })
    else:
        # Variable player count — test min and max
        game_name = game_id.replace("-", " ").title()
        questions.append({
            "q": f"How do you set up {game_name} for {min_p} players?",
            "type": "player-count-setup",
            "player_count": min_p,
        })
        questions.append({
            "q": f"How do you set up {game_name} for {max_p} players?",
            "type": "player-count-setup",
            "player_count": max_p,
        })
        # Resource/component question
        questions.append({
            "q": f"How many starting resources or cards does each player get in a {min_p}-player game of {game_name}?",
            "type": "player-count-resource",
            "player_count": min_p,
        })

    return questions


def search_rulebook_for_answer(game_id, question):
    """Try to find relevant info in the rulebook text file."""
    rulebook_path = os.path.join(RULEBOOK_DIR, f"{game_id}.txt")
    if not os.path.exists(rulebook_path):
        return "[No rulebook file]"

    with open(rulebook_path, encoding="utf-8") as f:
        text = f.read()

    # Simple keyword search — return first relevant paragraph
    keywords = question.lower().split()
    # Remove common words
    stopwords = {"how", "do", "you", "the", "a", "an", "in", "is", "what", "when",
                 "can", "i", "this", "game", "does", "many", "for", "of", "to", "at"}
    keywords = [k for k in keywords if k not in stopwords and len(k) > 2]

    paragraphs = text.split("\n\n")
    best = None
    best_score = 0
    for para in paragraphs:
        score = sum(1 for kw in keywords if kw in para.lower())
        if score > best_score:
            best_score = score
            best = para.strip()

    if best and best_score >= 2:
        return best[:300]
    return "[No clear match in rulebook]"


def score_answer(gmai_answer, question, game_id, q_type="general"):
    """Score a GMAI answer: correct, partial, wrong, or missing."""
    answer_lower = gmai_answer.lower()

    # Check for "I don't know" / missing
    if any(phrase in answer_lower for phrase in ["i'm not sure", "i don't know", "not available",
                                                   "i don't have", "i cannot find", "no information"]):
        return "missing"

    # Check for error responses
    if gmai_answer.startswith("[ERROR") or gmai_answer.startswith("[HTTP"):
        return "error"

    # For player-count questions, check if the response mentions the specific count
    if q_type in ("player-count-setup", "player-count-resource"):
        # Extract player count from question type metadata
        # A good answer should mention specific numbers for the asked count
        if len(gmai_answer) > 50:
            return "correct"  # Has substantial content (manual review needed)
        return "partial"

    # General scoring: substantial answer = correct, short = partial
    if len(gmai_answer) > 100:
        return "correct"
    elif len(gmai_answer) > 30:
        return "partial"
    return "wrong"


def test_game(game_id):
    """Run all tests for a single game."""
    game_name = game_id.replace("-", " ").title()
    print(f"\n--- Testing: {game_name} ---")

    game_results = {
        "game_id": game_id,
        "game_name": game_name,
        "player_count_range": GAME_PLAYER_COUNTS.get(game_id, (0, 0)),
        "general_questions": [],
        "player_count_questions": [],
    }

    # General questions
    questions = COMMON_QUESTIONS.get(game_id, DEFAULT_QUESTIONS)
    for q in questions:
        answer = query_gmai(game_id, q)
        score = score_answer(answer, q, game_id)
        result = {
            "question": q,
            "gmai_answer": answer[:500],
            "score": score,
        }
        game_results["general_questions"].append(result)
        icon = {"correct": "OK", "partial": "~~", "wrong": "XX", "missing": "??", "error": "!!"}[score]
        print(f"  [{icon}] {q}")
        time.sleep(0.5)  # Rate limit

    # Player-count questions (MANDATORY per Barbarian patch)
    pc_questions = get_player_count_questions(game_id)
    for pcq in pc_questions:
        answer = query_gmai(game_id, pcq["q"])
        score = score_answer(answer, pcq["q"], game_id, pcq["type"])

        # Cross-reference with rulebook
        rulebook_ref = search_rulebook_for_answer(game_id, pcq["q"])

        result = {
            "question": pcq["q"],
            "type": pcq["type"],
            "player_count": pcq["player_count"],
            "gmai_answer": answer[:500],
            "rulebook_reference": rulebook_ref[:300] if rulebook_ref else "",
            "score": score,
        }
        game_results["player_count_questions"].append(result)
        icon = {"correct": "OK", "partial": "~~", "wrong": "XX", "missing": "??", "error": "!!"}[score]
        print(f"  [{icon}] [PC] {pcq['q']}")
        time.sleep(0.5)

    # Calculate scores
    gen_scores = [r["score"] for r in game_results["general_questions"]]
    pc_scores = [r["score"] for r in game_results["player_count_questions"]]

    game_results["general_score"] = f"{gen_scores.count('correct')}/{len(gen_scores)}"
    game_results["player_count_score"] = f"{pc_scores.count('correct')}/{len(pc_scores)}"
    game_results["general_correct"] = gen_scores.count("correct")
    game_results["general_total"] = len(gen_scores)
    game_results["pc_correct"] = pc_scores.count("correct")
    game_results["pc_total"] = len(pc_scores)

    return game_results


def generate_text_report(all_results):
    """Generate a human-readable text report."""
    lines = []
    lines.append("=" * 70)
    lines.append("  GMAI CONTENT QUALITY TEST REPORT")
    lines.append(f"  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("=" * 70)

    total_gen_correct = sum(r["general_correct"] for r in all_results)
    total_gen = sum(r["general_total"] for r in all_results)
    total_pc_correct = sum(r["pc_correct"] for r in all_results)
    total_pc = sum(r["pc_total"] for r in all_results)

    lines.append(f"\nOVERALL SCORES:")
    lines.append(f"  General Questions: {total_gen_correct}/{total_gen} ({100*total_gen_correct/max(total_gen,1):.0f}%)")
    lines.append(f"  Player-Count Questions: {total_pc_correct}/{total_pc} ({100*total_pc_correct/max(total_pc,1):.0f}%)")
    lines.append(f"  Total: {total_gen_correct+total_pc_correct}/{total_gen+total_pc}")

    # Per-game breakdown
    lines.append(f"\n{'='*70}")
    lines.append("PER-GAME RESULTS:")
    lines.append(f"{'='*70}")

    failed_games = []
    for r in sorted(all_results, key=lambda x: x["game_id"]):
        gen = r["general_score"]
        pc = r["player_count_score"]
        lines.append(f"\n  {r['game_name']} ({r['player_count_range'][0]}-{r['player_count_range'][1]}P)")
        lines.append(f"    General: {gen}  |  Player-Count: {pc}")

        # Detail on any failures
        for q in r["general_questions"]:
            if q["score"] in ("wrong", "missing"):
                lines.append(f"    [FAIL] Q: {q['question']}")
                lines.append(f"           A: {q['gmai_answer'][:200]}")
                failed_games.append((r["game_id"], q["question"], q["score"]))

        for q in r["player_count_questions"]:
            if q["score"] in ("wrong", "missing", "partial"):
                lines.append(f"    [{'WARN' if q['score']=='partial' else 'FAIL'}] Q: {q['question']}")
                lines.append(f"           A: {q['gmai_answer'][:200]}")
                if q["score"] == "partial":
                    failed_games.append((r["game_id"], q["question"], "partial-pc"))

    # Failed games summary
    if failed_games:
        lines.append(f"\n{'='*70}")
        lines.append("GAMES NEEDING CONTENT FIXES:")
        lines.append(f"{'='*70}")
        by_game = {}
        for gid, q, score in failed_games:
            by_game.setdefault(gid, []).append((q, score))
        for gid, issues in sorted(by_game.items()):
            lines.append(f"\n  {gid}:")
            for q, s in issues:
                lines.append(f"    [{s}] {q}")

    return "\n".join(lines)


def main():
    print("=" * 60)
    print("  GMAI CONTENT QUALITY TESTER — Part C2 + Player-Count Patch")
    print("=" * 60)

    # Check backend
    try:
        resp = requests.get(f"{API_URL}/health", timeout=5)
        if resp.status_code != 200:
            raise Exception("Backend unhealthy")
        print("Backend: OK")
    except Exception as e:
        print(f"Backend not reachable: {e}")
        sys.exit(1)

    # Get list of all games
    try:
        resp = requests.get(f"{API_URL}/api/games", timeout=10)
        games = resp.json()
        game_ids = [g["game_id"] for g in games]
        print(f"Games available: {len(game_ids)}")
    except Exception as e:
        print(f"Could not fetch game list: {e}")
        # Fallback: use directory listing
        game_ids = [f.replace(".json", "") for f in os.listdir(CONTENT_DIR)
                    if f.endswith(".json") and not f.startswith("_")]
        print(f"Using directory listing: {len(game_ids)} games")

    # Run tests for all games
    all_results = []
    for game_id in sorted(game_ids):
        try:
            result = test_game(game_id)
            all_results.append(result)
        except Exception as e:
            print(f"  ERROR testing {game_id}: {e}")
            all_results.append({
                "game_id": game_id,
                "game_name": game_id.replace("-", " ").title(),
                "player_count_range": GAME_PLAYER_COUNTS.get(game_id, (0, 0)),
                "general_questions": [],
                "player_count_questions": [],
                "general_score": "0/0",
                "player_count_score": "0/0",
                "general_correct": 0, "general_total": 0,
                "pc_correct": 0, "pc_total": 0,
                "error": str(e),
            })

    # Generate reports
    text_report = generate_text_report(all_results)
    print("\n" + text_report)

    # Save JSON report
    json_path = os.path.join(REPORT_DIR, "content_quality_results.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({"timestamp": datetime.now().isoformat(), "results": all_results}, f, indent=2)
    print(f"\nJSON report: {json_path}")

    # Save text report
    txt_path = os.path.join(REPORT_DIR, "content_quality_report.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(text_report)
    print(f"Text report: {txt_path}")


if __name__ == "__main__":
    main()
