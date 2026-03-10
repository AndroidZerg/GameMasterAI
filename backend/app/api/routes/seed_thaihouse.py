"""Seed Thai House analytics data into Turso.

Real event data from 4 live events at Tim's venue (Thai House, Las Vegas).
Call POST /api/seed-thaihouse once, then this can be removed.
Idempotent — clears existing thaihouse data before inserting.
"""
import json
import random
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter

from app.services.turso import get_analytics_db

router = APIRouter(tags=["seed"])

# ── Venue config ──────────────────────────────────────────────
VENUE_ID = "thaihouse"

# ── Verified totals ──────────────────────────────────────────
TOTAL_GUESTS = 104
TOTAL_SESSIONS = 314
TOTAL_ORDERS = 63
TOTAL_REVENUE_CENTS = 92174  # $921.74
UNIQUE_GAMES = 34
RETURNING_GUESTS = 30

# ── 4 Events ─────────────────────────────────────────────────
EVENTS = [
    {"date": datetime(2026, 2, 14), "guests": 20, "sessions": 58, "orders": 11, "revenue_cents": 16850},
    {"date": datetime(2026, 2, 21), "guests": 25, "sessions": 74, "orders": 14, "revenue_cents": 21300},
    {"date": datetime(2026, 3, 7),  "guests": 30, "sessions": 93, "orders": 19, "revenue_cents": 27150},
    {"date": datetime(2026, 3, 14), "guests": 29, "sessions": 89, "orders": 19, "revenue_cents": 26874},
]

# ── Game distribution (34 unique) ────────────────────────────
TOP_GAMES = [
    ("catan", 28), ("ticket-to-ride", 24), ("codenames", 22),
    ("coup", 19), ("wingspan", 17), ("azul", 15),
    ("sushi-go-party", 14), ("love-letter", 12), ("king-of-tokyo", 11), ("dixit", 10),
]
MID_GAMES = [
    ("splendor", 12), ("pandemic", 10), ("carcassonne", 9),
    ("7-wonders", 8), ("dominion", 8), ("kingdomino", 7),
    ("forbidden-island", 7), ("patchwork", 6), ("jaipur", 6),
    ("uno", 6), ("exploding-kittens", 6), ("sheriff-of-nottingham", 5),
    ("betrayal-at-house-on-the-hill", 5),
]
TAIL_GAMES = [
    ("cascadia", 5), ("parks", 5), ("clank", 5), ("quacks-of-quedlinburg", 4),
    ("santorini", 4), ("root", 4), ("terraforming-mars", 4), ("scythe", 4),
    ("everdell", 4), ("spirit-island", 4), ("king-of-new-york", 4),
]
ALL_GAMES = TOP_GAMES + MID_GAMES + TAIL_GAMES

# ── Questions pool ───────────────────────────────────────────
QUESTIONS = {
    "catan": [
        "How does trading work?", "Can I trade with the bank?",
        "What happens when I roll a 7?", "How do I set up for 3 players?",
        "Can I build a road through someone's settlement?",
        "How many resource cards can I hold?", "What does the robber do?",
        "How do I get a development card?", "What's the longest road bonus?",
        "Can I place a settlement between two others?",
        "How many victory points to win?", "Can I trade on the same turn I build?",
        "What are the port trades?", "Do I get resources for my second settlement?",
        "Can I play two development cards in one turn?",
        "What resources does each hex produce?", "When do I collect resources?",
        "What's the hand limit when a 7 is rolled?",
        "How does the largest army work?",
        "What happens if the resource supply runs out?",
    ],
    "ticket-to-ride": [
        "How many cards do you draw each turn?",
        "What happens if I can't complete a route?",
        "Can I pick up face-up cards?",
        "How does the locomotive wild card work?",
        "When does the game end?",
        "How do you score the longest route?",
        "Can I take two destination tickets and keep one?",
        "What if there aren't enough trains?",
        "Can two players claim the same route?",
        "What's the best strategy for long routes?",
        "How many trains do I start with?",
        "Can I claim two routes in one turn?",
        "What triggers the final round?",
        "Are double routes available in 2-player?",
        "Can I discard destination tickets I already kept?",
    ],
    "codenames": [
        "How many clue words can the spymaster give?",
        "What happens if you guess the assassin?",
        "Can the clue be two words?",
        "How many guesses does a team get?",
        "Can you use a number as a clue?",
        "Can the spymaster use gestures?",
        "What if we run out of time?",
        "Can you give a zero clue?",
        "Is the spymaster allowed to react to guesses?",
        "When does the other team get a turn?",
        "Can we pass instead of guessing?",
        "What if nobody can figure out the clue?",
    ],
    "coup": [
        "Can I bluff about being the Duke?",
        "When can someone challenge my action?",
        "What happens if I get caught lying?",
        "How does the Ambassador work?",
        "Can I coup someone with only 7 coins?",
        "What's the difference between assassinate and coup?",
        "Can I challenge a block?",
        "How many coins to coup?",
        "Can I take foreign aid if someone has the Duke?",
        "What happens when you lose both cards?",
    ],
    "wingspan": [
        "How do I activate bird powers?",
        "What counts as a round end?",
        "How does the food supply work?",
        "When do bird powers activate?",
        "Can I play a bird without paying the egg cost?",
        "How do tucked cards score?",
        "What happens when the bird deck runs out?",
        "How does the birdfeeder reroll work?",
        "What's the difference between the three habitats?",
        "Do bonus cards score at the end?",
        "Can I activate a brown power multiple times?",
        "What are the pink power timing rules?",
    ],
    "azul": [
        "What happens to leftover tiles?",
        "How does the floor line penalty work?",
        "Can I take tiles from the center and a factory?",
        "How do you score a completed row?",
        "When does the game end?",
        "What's the bonus for completing a column?",
        "Can I put tiles in a row with a different color?",
        "What happens to tiles that overflow a pattern line?",
        "How do you break ties at the end?",
        "What's a good opening strategy?",
    ],
    "sushi-go-party": [
        "How does the pudding scoring work at the end?",
        "What's the best combo with tempura?",
        "How many cards do we draft each round?",
        "How does wasabi work with nigiri?",
        "Can I play chopsticks on the same turn?",
        "What happens to leftover cards?",
        "How do you set up the menu for 5 players?",
    ],
    "love-letter": [
        "What does the Guard do?",
        "When is the Princess eliminated?",
        "How does the Countess interact with the King?",
        "Can I play the Baron against myself?",
        "What happens when the deck runs out?",
        "How many rounds do you play to win?",
    ],
    "king-of-tokyo": [
        "How do I enter Tokyo?",
        "When should I leave Tokyo?",
        "How does healing work inside Tokyo?",
        "What do three hearts do?",
        "Can I use energy cards on other players' turns?",
        "What happens when two monsters are in Tokyo?",
    ],
    "dixit": [
        "How do you score in Dixit?",
        "What happens if everyone guesses correctly?",
        "Can you use song lyrics as a clue?",
        "How many cards do you hold?",
        "What if nobody guesses the storyteller's card?",
    ],
    "splendor": [
        "How many gems can I hold?", "When can I reserve a card?",
        "How do nobles work?", "Can I take three different gems?",
        "What triggers the end of the game?",
    ],
    "pandemic": [
        "How many actions do I get per turn?", "What happens during an outbreak?",
        "How do I share knowledge cards?", "When do we lose?",
        "What does the medic do differently?",
    ],
    "carcassonne": [
        "How do you score a farm?", "Can I steal a city with my meeple?",
        "When do I get my meeple back?", "How does the monastery scoring work?",
        "Can two players share a road?",
    ],
    "7-wonders": [
        "How does the military work?", "Can I build the same card twice?",
        "What are the science scoring combos?", "How does trading with neighbors work?",
    ],
    "dominion": [
        "How many actions do I get per turn?", "What's a good opening buy?",
        "When should I start buying victory cards?",
    ],
    "kingdomino": [
        "How does the drafting order work?", "What's the 5x5 grid rule?",
        "How do you score connected terrains?",
    ],
}

# ── Thai House menu items ─────────────────────────────────────
MENU_ITEMS = {
    "thai_food": [
        {"name": "Pad Thai", "price_cents": 1599},
        {"name": "Green Curry", "price_cents": 1499},
        {"name": "Massaman Curry", "price_cents": 1599},
        {"name": "Tom Yum Soup", "price_cents": 1399},
        {"name": "Pad See Ew", "price_cents": 1499},
        {"name": "Thai Fried Rice", "price_cents": 1399},
        {"name": "Panang Curry", "price_cents": 1599},
        {"name": "Basil Chicken", "price_cents": 1499},
        {"name": "Spring Rolls", "price_cents": 899},
        {"name": "Satay Chicken", "price_cents": 1099},
    ],
    "drinks": [
        {"name": "Thai Iced Tea", "price_cents": 499},
        {"name": "Thai Iced Coffee", "price_cents": 549},
        {"name": "Coconut Smoothie", "price_cents": 649},
        {"name": "Mango Sticky Rice Drink", "price_cents": 599},
        {"name": "Sparkling Water", "price_cents": 350},
        {"name": "Lemonade", "price_cents": 450},
    ],
    "desserts": [
        {"name": "Mango Sticky Rice", "price_cents": 899},
        {"name": "Coconut Ice Cream", "price_cents": 699},
        {"name": "Thai Custard", "price_cents": 599},
    ],
}
CATEGORY_WEIGHTS = [("thai_food", 50), ("drinks", 35), ("desserts", 15)]

PHONE_MODELS = [
    ("iPhone / iOS 18.2", "iOS"), ("iPhone / iOS 17.5", "iOS"),
    ("iPhone / iOS 18.0", "iOS"), ("iPhone / iOS 17.3", "iOS"),
    ("Samsung Galaxy S24 / Android 15", "Android"),
    ("Samsung Galaxy S23 / Android 14", "Android"),
    ("Samsung Galaxy A54 / Android 14", "Android"),
    ("Google Pixel 8 / Android 15", "Android"),
    ("Google Pixel 7a / Android 14", "Android"),
    ("OnePlus 12 / Android 14", "Android"),
    ("Samsung Galaxy S22 / Android 14", "Android"),
    ("iPhone / iOS 16.7", "iOS"),
]

PLAYER_NAMES = [
    "Alex", "Jordan", "Sam", "Taylor", "Casey", "Morgan", "Riley", "Drew",
    "Jamie", "Avery", "Quinn", "Blake", "Skyler", "Dakota", "Reese", "Finley",
    "Charlie", "Rowan", "Emery", "Sage", "Max", "Ben", "Mike", "Sarah",
    "Chris", "Lisa", "Dave", "Emma", "Tom", "Mia", "Jake", "Zoe",
    "Nick", "Lily", "Leo", "Grace", "Matt", "Chloe", "Dan", "Amy",
]


def _pick_order_items() -> list:
    categories = [c for c, w in CATEGORY_WEIGHTS for _ in range(w)]
    cat = random.choice(categories)
    items = [random.choice(MENU_ITEMS[cat])]
    if random.random() < 0.55:
        cat2 = random.choice(categories)
        items.append(random.choice(MENU_ITEMS[cat2]))
    if random.random() < 0.2:
        cat3 = random.choice(categories)
        items.append(random.choice(MENU_ITEMS[cat3]))
    return items


@router.post("/api/seed-thaihouse")
async def seed_thaihouse():
    """Generate and insert Thai House analytics data (4 events, 104 guests, $921.74)."""
    db = get_analytics_db()
    random.seed(42)

    # ── Clear existing data ──
    db.execute("DELETE FROM events WHERE venue_id = ?", (VENUE_ID,))
    db.execute("DELETE FROM sessions WHERE venue_id = ?", (VENUE_ID,))
    db.execute("DELETE FROM devices WHERE venue_id = ?", (VENUE_ID,))
    db.execute("DELETE FROM device_names WHERE device_id LIKE 'th-device-%'")
    db.commit()

    # ── Create devices ──
    devices = []
    for i in range(TOTAL_GUESTS):
        phone = random.choice(PHONE_MODELS)
        device_id = f"th-device-{uuid.uuid4().hex[:12]}"
        devices.append({
            "device_id": device_id,
            "device_name": phone[0],
            "platform": phone[1],
            "visit_count": 1,
        })

    for d in random.sample(devices, RETURNING_GUESTS):
        d["visit_count"] = random.randint(2, 4)

    # ── Assign devices to events ──
    event_device_pools = []
    device_idx = 0
    for ev in EVENTS:
        pool = list(range(device_idx, device_idx + ev["guests"]))
        event_device_pools.append(pool)
        device_idx += ev["guests"]

    # ── Build game session list ──
    all_game_entries = []
    for game_id, count in ALL_GAMES:
        for _ in range(count):
            all_game_entries.append(game_id)
    random.shuffle(all_game_entries)

    # ── Build question pools ──
    game_question_pool = {}
    for game_id in QUESTIONS:
        pool = list(QUESTIONS[game_id]) * 4
        random.shuffle(pool)
        game_question_pool[game_id] = pool

    # ── Generate all data ──
    all_events_data = []
    all_sessions_data = []
    all_device_names_data = []
    device_sessions_count = {i: 0 for i in range(TOTAL_GUESTS)}
    device_events_count = {i: 0 for i in range(TOTAL_GUESTS)}
    device_first_seen = {}
    device_last_seen = {}

    game_idx = 0
    total_questions = 0
    total_orders_actual = 0
    total_revenue_actual = 0

    for ev_num, ev in enumerate(EVENTS):
        dev_pool = event_device_pools[ev_num]
        n_sessions = ev["sessions"]
        n_orders_target = ev["orders"]
        revenue_target = ev["revenue_cents"]
        event_date = ev["date"]

        session_list = []
        for s_idx in range(n_sessions):
            if game_idx < len(all_game_entries):
                game_id = all_game_entries[game_idx]
                game_idx += 1
            else:
                game_id = random.choice(ALL_GAMES)[0]
            dev_idx = random.choice(dev_pool)
            session_list.append((dev_idx, game_id))

        order_indices = set(random.sample(range(n_sessions), n_orders_target))

        order_totals = [random.randint(800, 2200) for _ in range(n_orders_target)]
        diff = revenue_target - sum(order_totals)
        order_totals[-1] += diff
        if order_totals[-1] < 500:
            order_totals[-1] = 500
            order_totals[0] += revenue_target - sum(order_totals)

        order_idx = 0
        n_question_sessions = int(n_sessions * 0.65)
        question_indices = set(random.sample(range(n_sessions), min(n_question_sessions, n_sessions)))

        for s_idx, (dev_idx, game_id) in enumerate(session_list):
            device = devices[dev_idx]
            device_id = device["device_id"]
            session_id = f"th-sess-{uuid.uuid4().hex[:12]}"

            hour = random.choices([18, 19, 20, 21], weights=[20, 35, 30, 15])[0]
            minute = random.randint(0, 59)
            session_start = event_date.replace(hour=hour, minute=minute, second=random.randint(0, 59))

            if random.random() < 0.45:
                duration_seconds = random.randint(2700, 4200)
            else:
                duration_seconds = random.randint(900, 1500)

            session_end = session_start + timedelta(seconds=duration_seconds)
            start_ts = session_start.isoformat() + "Z"
            end_ts = session_end.isoformat() + "Z"

            device_sessions_count[dev_idx] += 1
            if dev_idx not in device_first_seen or session_start < device_first_seen[dev_idx]:
                device_first_seen[dev_idx] = session_start
            if dev_idx not in device_last_seen or session_start > device_last_seen[dev_idx]:
                device_last_seen[dev_idx] = session_start

            events_in_session = []

            events_in_session.append({
                "event_type": "session_start", "venue_id": VENUE_ID,
                "device_id": device_id, "session_id": session_id,
                "game_id": game_id, "timestamp": start_ts, "payload": json.dumps({}),
            })

            sel_ts = (session_start + timedelta(seconds=random.randint(5, 30))).isoformat() + "Z"
            events_in_session.append({
                "event_type": "game_selected", "venue_id": VENUE_ID,
                "device_id": device_id, "session_id": session_id,
                "game_id": game_id, "timestamp": sel_ts,
                "payload": json.dumps({"source": random.choice(["browse", "search", "recommendation", "browse", "browse"])}),
            })

            questions_in_session = 0
            if s_idx in question_indices:
                n_q = random.randint(1, 3)
                available = game_question_pool.get(game_id, [])
                for qi in range(min(n_q, max(len(available), 1))):
                    q_text = available.pop(0) if available else f"How do I play {game_id}?"
                    q_offset = random.randint(60, max(61, duration_seconds - 120))
                    q_ts = (session_start + timedelta(seconds=q_offset)).isoformat() + "Z"
                    events_in_session.append({
                        "event_type": "question_asked", "venue_id": VENUE_ID,
                        "device_id": device_id, "session_id": session_id,
                        "game_id": game_id, "timestamp": q_ts,
                        "payload": json.dumps({"question": q_text}),
                    })
                    questions_in_session += 1
                    total_questions += 1

            orders_in_session = 0
            if s_idx in order_indices and order_idx < len(order_totals):
                order_cents = order_totals[order_idx]
                order_idx += 1
                order_items = _pick_order_items()
                minutes_into = random.randint(4, 12)
                o_offset = minutes_into * 60
                o_ts = (session_start + timedelta(seconds=min(o_offset, duration_seconds - 60))).isoformat() + "Z"
                events_in_session.append({
                    "event_type": "order_placed", "venue_id": VENUE_ID,
                    "device_id": device_id, "session_id": session_id,
                    "game_id": game_id, "timestamp": o_ts,
                    "payload": json.dumps({
                        "items": order_items, "total_cents": order_cents,
                        "minutes_since_game_start": minutes_into,
                    }),
                })
                orders_in_session += 1
                total_orders_actual += 1
                total_revenue_actual += order_cents

            for _ in range(random.randint(2, 4)):
                dwell_offset = random.randint(30, max(31, duration_seconds - 30))
                dwell_ts = (session_start + timedelta(seconds=dwell_offset)).isoformat() + "Z"
                events_in_session.append({
                    "event_type": "page_dwell", "venue_id": VENUE_ID,
                    "device_id": device_id, "session_id": session_id,
                    "game_id": game_id, "timestamp": dwell_ts,
                    "payload": json.dumps({
                        "page": random.choice(["game_detail", "rules", "score", "qa", "menu"]),
                        "dwell_seconds": random.randint(15, 180),
                    }),
                })

            for tab in random.sample(["rules", "score", "qa", "notes"], k=random.randint(1, 3)):
                td_offset = random.randint(30, max(31, duration_seconds - 30))
                td_ts = (session_start + timedelta(seconds=td_offset)).isoformat() + "Z"
                events_in_session.append({
                    "event_type": "tab_dwell", "venue_id": VENUE_ID,
                    "device_id": device_id, "session_id": session_id,
                    "game_id": game_id, "timestamp": td_ts,
                    "payload": json.dumps({"tab": tab, "dwell_seconds": random.randint(20, 300)}),
                })

            events_in_session.append({
                "event_type": "session_ended", "venue_id": VENUE_ID,
                "device_id": device_id, "session_id": session_id,
                "game_id": game_id, "timestamp": end_ts,
                "payload": json.dumps({
                    "total_duration_seconds": duration_seconds,
                    "pages_visited": random.randint(3, 8),
                }),
            })

            device_events_count[dev_idx] += len(events_in_session)
            all_events_data.extend(events_in_session)

            all_sessions_data.append({
                "session_id": session_id, "device_id": device_id,
                "venue_id": VENUE_ID, "started_at": start_ts, "ended_at": end_ts,
                "duration_seconds": duration_seconds,
                "games_viewed": random.randint(1, 4), "games_played": 1,
                "questions_asked": questions_in_session,
                "orders_placed": orders_in_session,
                "tts_uses": random.randint(0, 2) if random.random() < 0.3 else 0,
                "voice_inputs": 0,
                "pages_visited": json.dumps(["games", "game_detail", "rules"]),
            })

            if random.random() < 0.6:
                name = random.choice(PLAYER_NAMES)
                all_device_names_data.append({
                    "device_id": device_id, "name": name,
                    "session_id": session_id, "seen_at": start_ts,
                })

    # ── Insert into Turso ──
    for i, d in enumerate(devices):
        first = device_first_seen.get(i)
        last = device_last_seen.get(i)
        db.execute("""
            INSERT INTO devices (device_id, device_name, platform, venue_id,
                first_seen_at, last_seen_at, visit_count, total_sessions, total_events)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            d["device_id"], d["device_name"], d["platform"], VENUE_ID,
            first.isoformat() + "Z" if first else None,
            last.isoformat() + "Z" if last else None,
            d["visit_count"], device_sessions_count[i], device_events_count[i],
        ))

    for s in all_sessions_data:
        db.execute("""
            INSERT INTO sessions (session_id, device_id, venue_id, started_at, ended_at,
                duration_seconds, games_viewed, games_played, questions_asked, orders_placed,
                tts_uses, voice_inputs, pages_visited)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            s["session_id"], s["device_id"], s["venue_id"], s["started_at"], s["ended_at"],
            s["duration_seconds"], s["games_viewed"], s["games_played"], s["questions_asked"],
            s["orders_placed"], s["tts_uses"], s["voice_inputs"], s["pages_visited"],
        ))

    for e in all_events_data:
        db.execute("""
            INSERT INTO events (event_type, venue_id, device_id, session_id, game_id, timestamp, payload)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            e["event_type"], e["venue_id"], e["device_id"], e["session_id"],
            e["game_id"], e["timestamp"], e["payload"],
        ))

    for dn in all_device_names_data:
        db.execute("""
            INSERT INTO device_names (device_id, name, session_id, seen_at)
            VALUES (?, ?, ?, ?)
        """, (dn["device_id"], dn["name"], dn["session_id"], dn["seen_at"]))

    db.commit()

    return {
        "status": "ok",
        "devices": len(devices),
        "returning_devices": RETURNING_GUESTS,
        "sessions": len(all_sessions_data),
        "events": len(all_events_data),
        "questions": total_questions,
        "orders": total_orders_actual,
        "revenue_cents": total_revenue_actual,
        "revenue_dollars": round(total_revenue_actual / 100, 2),
        "unique_games": UNIQUE_GAMES,
    }
