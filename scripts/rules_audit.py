"""
Stonemaier Rules Accuracy Audit
55 questions across 16 games against the live GMAI backend.
"""

import json
import time
import sys
import requests

API_BASE = "https://gmai-backend.onrender.com"
QUERY_URL = f"{API_BASE}/api/query"

TESTS = [
    # WINGSPAN (4)
    {
        "game_id": "wingspan",
        "question": "Can I use any 2 food tokens as a substitute for 1 food I don't have?",
        "correct": "YES — if none of the dice in the birdfeeder show the food type you need, you may spend any 2 food tokens to gain 1 of the type you need. This ONLY works when the type is unavailable in the feeder, not as a general conversion.",
        "source": "Wingspan rulebook p.7"
    },
    {
        "game_id": "wingspan",
        "question": "Do white 'when played' powers activate again when I use the brown power in that row?",
        "correct": "NO — white powers only activate once, at the moment the bird is played. They are never reactivated by brown powers or any other effect.",
        "source": "Wingspan rulebook p.5"
    },
    {
        "game_id": "wingspan",
        "question": "When a bird says 'repeat a power in this row', can I copy a power to the RIGHT of this bird?",
        "correct": "YES — you can copy ANY power in the row, not just powers to the left.",
        "source": "Wingspan FAQ — Jamey Stegmaier"
    },
    {
        "game_id": "wingspan",
        "question": "How many action cubes do I have in each round?",
        "correct": "Round 1: 8 cubes, Round 2: 7 cubes, Round 3: 6 cubes, Round 4: 5 cubes.",
        "source": "Wingspan rulebook p.4"
    },
    # SCYTHE (4)
    {
        "game_id": "scythe",
        "question": "Can I take the same action two turns in a row?",
        "correct": "NO — you must place your action token on a DIFFERENT section of your player mat each turn.",
        "source": "Scythe rulebook p.5"
    },
    {
        "game_id": "scythe",
        "question": "If I win combat and there are enemy workers on the territory, what happens?",
        "correct": "The losing player's workers are sent back to their home base. The winner LOSES 1 POPULARITY for EACH worker displaced.",
        "source": "Scythe rulebook p.11"
    },
    {
        "game_id": "scythe",
        "question": "How much is the Factory worth at end of game?",
        "correct": "The Factory territory is worth 3 territories (not 1) to the player who controls it at end of game.",
        "source": "Scythe rulebook p.8"
    },
    {
        "game_id": "scythe",
        "question": "Can both top and bottom row actions be taken on the same turn?",
        "correct": "YES — on your turn you may take the top-row action, then the bottom-row action on the same section.",
        "source": "Scythe rulebook p.5"
    },
    # VITICULTURE (4)
    {
        "game_id": "viticulture",
        "question": "Can the grande worker go to an action space I already have a regular worker on?",
        "correct": "YES — the grande worker can go to ANY action space, even one that is completely full.",
        "source": "Viticulture EE rulebook p.5"
    },
    {
        "game_id": "viticulture",
        "question": "Can I use a blush wine to fill an order that asks for red wine?",
        "correct": "NO — you must use the exact type of wine shown on the wine order.",
        "source": "Stonemaier FAQ"
    },
    {
        "game_id": "viticulture",
        "question": "Can I sell a field that has vines planted on it?",
        "correct": "NO — you can only sell fields that are empty (no vines).",
        "source": "Viticulture EE rulebook"
    },
    {
        "game_id": "viticulture",
        "question": "When wine ages at end of year, what happens if it's already at value 9?",
        "correct": "It stays at 9. Wine and grape tokens cannot exceed value 9.",
        "source": "Viticulture EE rulebook p.8"
    },
    # TAPESTRY (3)
    {
        "game_id": "tapestry",
        "question": "Can I advance on any track I want each turn, or am I restricted?",
        "correct": "You can advance on ANY of the 4 advancement tracks on your turn. No restriction.",
        "source": "Tapestry rulebook p.6"
    },
    {
        "game_id": "tapestry",
        "question": "What triggers the end of the game? Is it rounds or something else?",
        "correct": "No fixed rounds. Each player plays through 5 income turns at their own pace. Game ends when ALL players complete their 5th income turn.",
        "source": "Tapestry rulebook"
    },
    {
        "game_id": "tapestry",
        "question": "When I conquer a territory on the map, do I place a token or an outpost?",
        "correct": "You place an outpost from your player mat onto the conquered territory.",
        "source": "Tapestry rulebook"
    },
    # WYRMSPAN (4)
    {
        "game_id": "wyrmspan",
        "question": "How is Wyrmspan different from Wingspan mechanically?",
        "correct": "Key differences: resources from shared supply instead of birdfeeder dice, excavate caves to create dragon spaces, Dragon Guild track for bonuses.",
        "source": "Wyrmspan rulebook"
    },
    {
        "game_id": "wyrmspan",
        "question": "What happens when I excavate a cave?",
        "correct": "Excavating creates space for dragons. Take a cave card and place it to extend your cave system, creating a new slot for a dragon.",
        "source": "Wyrmspan rulebook"
    },
    {
        "game_id": "wyrmspan",
        "question": "Can I play a dragon without an empty cave space?",
        "correct": "NO — you must have an available empty cave space. You need to excavate caves first.",
        "source": "Wyrmspan rulebook"
    },
    {
        "game_id": "wyrmspan",
        "question": "How does the Dragon Guild work?",
        "correct": "A shared track where players advance by meeting conditions. Provides benefits like resources, VP, or abilities. Scored at end of game.",
        "source": "Wyrmspan rulebook"
    },
    # CHARTERSTONE (3)
    {
        "game_id": "charterstone",
        "question": "What happens to the board between games in the campaign?",
        "correct": "Legacy game — buildings are PERMANENTLY added via stickers. Board evolves over 12-game campaign.",
        "source": "Charterstone rulebook"
    },
    {
        "game_id": "charterstone",
        "question": "Can I build in another player's charter?",
        "correct": "Generally NO — you build in your own charter. Some campaign unlocks may allow exceptions.",
        "source": "Charterstone rulebook"
    },
    {
        "game_id": "charterstone",
        "question": "Can the game be replayed after the 12-game campaign?",
        "correct": "YES — becomes a replayable worker placement game. Recharge Pack available for fresh campaign.",
        "source": "Charterstone rulebook"
    },
    # MY LITTLE SCYTHE (3)
    {
        "game_id": "my-little-scythe",
        "question": "How does combat work differently from regular Scythe?",
        "correct": "Pie fight mechanic — simultaneously reveal pies to throw. Both lose committed resources. Loser gets friendship point.",
        "source": "My Little Scythe rulebook"
    },
    {
        "game_id": "my-little-scythe",
        "question": "How many trophies do you need to win?",
        "correct": "4 trophies to win (vs 6 stars in Scythe).",
        "source": "My Little Scythe rulebook"
    },
    {
        "game_id": "my-little-scythe",
        "question": "What is the friendship track and why does it matter?",
        "correct": "Similar to popularity in Scythe. Affects end-game scoring multiplier.",
        "source": "My Little Scythe rulebook"
    },
    # LIBERTALIA (4)
    {
        "game_id": "libertalia-winds-of-galecrest",
        "question": "How many days are in each voyage?",
        "correct": "Voyage 1: 4 days, Voyage 2: 5 days, Voyage 3: 6 days.",
        "source": "Libertalia rulebook"
    },
    {
        "game_id": "libertalia-winds-of-galecrest",
        "question": "Do all players have the same crew cards?",
        "correct": "YES — all players receive the exact same set of characters each voyage.",
        "source": "Libertalia rulebook"
    },
    {
        "game_id": "libertalia-winds-of-galecrest",
        "question": "What happens at the end of a voyage?",
        "correct": "Resolve anchor abilities, score and lock doubloons, discard played characters, deal new crew for next voyage.",
        "source": "Libertalia rulebook"
    },
    {
        "game_id": "libertalia-winds-of-galecrest",
        "question": "Can you skip a character's ability if it would hurt you?",
        "correct": "NO — all character abilities are MANDATORY.",
        "source": "Libertalia rulebook"
    },
    # BETWEEN TWO CITIES (3)
    {
        "game_id": "between-two-cities",
        "question": "How does scoring work when I'm building TWO cities with different partners?",
        "correct": "Your final score is the LOWER-scoring of your two cities.",
        "source": "Between Two Cities rulebook"
    },
    {
        "game_id": "between-two-cities",
        "question": "Can I talk to my partners about what tiles to pick?",
        "correct": "You may discuss general strategy but CANNOT reveal specific tiles in your hand.",
        "source": "Between Two Cities rulebook"
    },
    {
        "game_id": "between-two-cities",
        "question": "What size is each city at the end of the game?",
        "correct": "Each city is exactly a 4x4 grid of 16 tiles.",
        "source": "Between Two Cities rulebook"
    },
    # EUPHORIA (3)
    {
        "game_id": "euphoria-build-a-better-dystopia",
        "question": "What happens if my worker's knowledge gets too high?",
        "correct": "Worker becomes TOO SMART and leaves — you lose that worker permanently.",
        "source": "Euphoria rulebook"
    },
    {
        "game_id": "euphoria-build-a-better-dystopia",
        "question": "How do I win the game?",
        "correct": "Place all 10 authority (star) tokens on the board. First to 10th star wins.",
        "source": "Euphoria rulebook"
    },
    {
        "game_id": "euphoria-build-a-better-dystopia",
        "question": "What are the different factions in the game?",
        "correct": "4 factions: Euphorians, Wastelanders, Subterrans, and Icarites.",
        "source": "Euphoria rulebook"
    },
    # RED RISING (3)
    {
        "game_id": "red-rising",
        "question": "How does the deploy action work?",
        "correct": "Deploy a card to one of 4 locations, gain that location's bonus, pick up top card from a DIFFERENT location.",
        "source": "Red Rising rulebook"
    },
    {
        "game_id": "red-rising",
        "question": "What triggers the end of the game?",
        "correct": "Triggered when a player reaches helium threshold on sovereign track OR card draw pile is exhausted.",
        "source": "Red Rising rulebook"
    },
    {
        "game_id": "red-rising",
        "question": "How does the Sovereign track work?",
        "correct": "Represents political influence. Advance by deploying certain cards. Furthest player scores bonus. Also an end-game trigger.",
        "source": "Red Rising rulebook"
    },
    # BETWEEN TWO CASTLES (3)
    {
        "game_id": "between-two-castles-of-mad-king-ludwig",
        "question": "How is this different from Between Two Cities?",
        "correct": "Same cooperative-competitive structure but building castles with stacking rooms instead of flat city grid. Room adjacency matters.",
        "source": "Between Two Castles rulebook"
    },
    {
        "game_id": "between-two-castles-of-mad-king-ludwig",
        "question": "Can rooms be placed anywhere in the castle?",
        "correct": "NO — rooms must be supported (on ground or on top of existing rooms). No floating rooms. Outdoor rooms only on ground floor.",
        "source": "Between Two Castles rulebook"
    },
    {
        "game_id": "between-two-castles-of-mad-king-ludwig",
        "question": "How does the King's Favorites scoring work?",
        "correct": "Castle with MOST rooms of each type gets bonus points at end of game.",
        "source": "Between Two Castles rulebook"
    },
    # EXPEDITIONS (4)
    {
        "game_id": "expeditions",
        "question": "How is Expeditions connected to Scythe?",
        "correct": "Standalone sequel in same 1920+ universe. Set in Siberia after Scythe. Card-driven exploration, not worker placement.",
        "source": "Expeditions rulebook"
    },
    {
        "game_id": "expeditions",
        "question": "What are the main actions I can take on my turn?",
        "correct": "Either PLAY (place cards for effects) or GATHER (move mech, collect from locations, refresh hand).",
        "source": "Expeditions rulebook"
    },
    {
        "game_id": "expeditions",
        "question": "How does corruption work?",
        "correct": "Corruption tokens are negative VP. Gained from powerful actions. Can be removed through quests.",
        "source": "Expeditions rulebook"
    },
    {
        "game_id": "expeditions",
        "question": "What triggers the end of the game?",
        "correct": "Player places 4th glory token. Finish current round for equal turns, then score.",
        "source": "Expeditions rulebook"
    },
    # APIARY (3)
    {
        "game_id": "apiary",
        "question": "What makes the worker placement in Apiary unique?",
        "correct": "Workers are dice that level up each use. At max value they hibernate — provide end-game bonuses but leave the workforce.",
        "source": "Apiary rulebook"
    },
    {
        "game_id": "apiary",
        "question": "Can I bump another player's worker off a space?",
        "correct": "YES — bumped worker returns to owner and increases by 1. Getting bumped can be beneficial.",
        "source": "Apiary rulebook"
    },
    {
        "game_id": "apiary",
        "question": "How do you score points in Apiary?",
        "correct": "Seed cards, filled frames, faction bonuses, hibernated workers, resources and achievements.",
        "source": "Apiary rulebook"
    },
    # ROLLING REALMS (3)
    {
        "game_id": "rolling-realms",
        "question": "How do the Stonemaier game realms work?",
        "correct": "3 realm cards active per round (each themed after a Stonemaier game). ALL players use same dice results but apply them to realms differently.",
        "source": "Rolling Realms rulebook"
    },
    {
        "game_id": "rolling-realms",
        "question": "Is there player interaction in Rolling Realms?",
        "correct": "Minimal — all players use same dice. Competition is efficiency. No blocking or direct conflict.",
        "source": "Rolling Realms rulebook"
    },
    {
        "game_id": "rolling-realms",
        "question": "How many rounds are played?",
        "correct": "3 rounds, each with 3 different realm cards. Total of 9 realms used.",
        "source": "Rolling Realms rulebook"
    },
    # PENDULUM (4)
    {
        "game_id": "pendulum",
        "question": "How does the real-time element work?",
        "correct": "Sand timers (45s, 2min, 3min) instead of turns. Workers locked while timer is active. Place workers above/below timer.",
        "source": "Pendulum rulebook"
    },
    {
        "game_id": "pendulum",
        "question": "Can I just wait and not take any actions?",
        "correct": "Technically yes but bad idea — timers keep flowing. Hesitation means missed opportunities.",
        "source": "Pendulum rulebook"
    },
    {
        "game_id": "pendulum",
        "question": "What's the difference between the green, purple, and black timer areas?",
        "correct": "Green (45s) = quick small actions. Purple (2min) = medium. Black (3min) = most powerful but slowest.",
        "source": "Pendulum rulebook"
    },
    {
        "game_id": "pendulum",
        "question": "How do you win Pendulum?",
        "correct": "Furthest on VP track. Must advance on 4 tracks (military, political, economic, prestige). Must meet minimum thresholds on all 4.",
        "source": "Pendulum rulebook"
    },
]

def run_audit():
    results = []
    passes = 0
    fails = 0
    errors = 0

    print(f"Starting rules audit: {len(TESTS)} questions")
    print(f"Endpoint: {QUERY_URL}")
    print("=" * 60)

    for i, test in enumerate(TESTS):
        game_id = test["game_id"]
        question = test["question"]
        correct = test["correct"]

        print(f"\n[{i+1}/{len(TESTS)}] {game_id}: {question[:60]}...")

        try:
            resp = requests.post(
                QUERY_URL,
                json={"game_id": game_id, "question": question},
                timeout=60,
            )

            if resp.status_code != 200:
                print(f"  ERROR: HTTP {resp.status_code} — {resp.text[:200]}")
                results.append({
                    **test,
                    "status": "ERROR",
                    "http_status": resp.status_code,
                    "response": resp.text[:500],
                    "verdict_reason": f"HTTP {resp.status_code}"
                })
                errors += 1
                # Rate limit: wait between requests
                time.sleep(7)
                continue

            data = resp.json()
            answer = data.get("answer", "")
            model = data.get("model", "unknown")

            print(f"  Response ({len(answer)} chars, model={model})")
            print(f"  Answer preview: {answer[:120]}...")

            results.append({
                **test,
                "status": "RECEIVED",
                "http_status": 200,
                "response": answer,
                "model": model,
                "game_title": data.get("game_title", ""),
            })

        except Exception as e:
            print(f"  EXCEPTION: {e}")
            results.append({
                **test,
                "status": "ERROR",
                "http_status": None,
                "response": str(e),
                "verdict_reason": str(e)
            })
            errors += 1

        # Rate limit: 10 req/min = 1 every 6s, use 7s to be safe
        time.sleep(7)

    # Save raw results
    raw_path = "agents/tickets/RULES-AUDIT-RAW.json"
    with open(raw_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\nRaw results saved to {raw_path}")
    print(f"Total: {len(results)} responses ({errors} errors)")
    print("\nManual review needed — run verdict pass separately or review raw JSON.")

    return results


if __name__ == "__main__":
    run_audit()
