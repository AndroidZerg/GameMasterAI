"""Temporary: Seed Meepleville analytics data for demo dashboard.

Call POST /api/seed-meepleville once, then remove this file.
"""
import json
import random
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter

from app.services.turso import get_analytics_db

router = APIRouter(tags=["seed"])

# ── Config ──────────────────────────────────────────────────
VENUE_ID = "meepleville"
START_DATE = datetime(2026, 2, 18)
END_DATE = datetime(2026, 3, 3)

# Games with target session counts
TOP_GAMES = [
    ("catan", 28), ("ticket-to-ride", 24), ("wingspan", 20),
    ("codenames", 17), ("azul", 15),
]
MID_GAMES = [
    ("splendor", 10), ("pandemic", 9), ("carcassonne", 8),
    ("7-wonders", 7), ("king-of-tokyo", 7), ("sushi-go-party", 6),
    ("coup", 5), ("love-letter", 5), ("dominion", 4), ("kingdomino", 4),
]
TAIL_GAMES = [
    "agricola", "terraforming-mars", "root", "scythe", "everdell",
    "spirit-island", "cascadia", "parks", "clank", "quacks-of-quedlinburg",
    "patchwork", "jaipur", "santorini",
]

# ── Questions per game ──────────────────────────────────────
QUESTIONS = {
    "catan": [
        "How do I set up Catan for 3 players?",
        "What happens when you roll a 7?",
        "How does trading work?",
        "Can I build a road through another player's settlement?",
        "How many resource cards can I hold?",
        "What does the robber do?",
        "How do I get a development card?",
        "When can I trade with the bank?",
        "What's the longest road bonus?",
        "Can I place a settlement between two other settlements?",
        "How many victory points do I need to win?",
        "Can I trade on the same turn I build?",
        "What are the different port trades?",
        "Do I get resources for my second settlement during setup?",
        "Can the robber block a port?",
        "How do you win with a development card strategy?",
        "What's the best opening settlement placement?",
        "Can I play two development cards in one turn?",
        "What resources does each hex produce?",
        "When do I collect resources?",
        "Can I build a settlement on a port without connecting roads?",
        "What's the hand limit when a 7 is rolled?",
        "Do cities count for longest road?",
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
        "What if there aren't enough trains to claim a route?",
        "Can two players claim the same route?",
        "What's the best strategy for long routes?",
        "Do I have to draw destination tickets?",
        "How many trains do I start with?",
        "Can I claim two routes in one turn?",
        "What triggers the final round?",
        "Are the double routes available in 2-player games?",
        "How do you count the longest continuous path?",
        "Can I discard destination tickets I already kept?",
        "What happens to unused locomotive cards?",
        "Should I go for long or short routes?",
        "How many face-up cards are there?",
    ],
    "wingspan": [
        "How do you score birds in the wetlands?",
        "What are the end-of-round goals?",
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
        "How many eggs do you need for the 4th column?",
        "What's a good first-round strategy?",
        "How does the automa work for solo play?",
    ],
    "codenames": [
        "How many clue words can the spymaster give?",
        "What happens if you guess the assassin?",
        "Can the clue be two words?",
        "How many guesses does a team get?",
        "Can you use a number as a clue?",
        "What if nobody can figure out the clue?",
        "Can you give a zero clue?",
        "Is the spymaster allowed to react to guesses?",
        "When does the other team get a turn?",
        "Can we pass instead of guessing?",
    ],
    "azul": [
        "What's a good opening strategy?",
        "What happens to leftover tiles?",
        "How does the floor line penalty work?",
        "Can I take tiles from the center and a factory on the same turn?",
        "How do you score a completed row?",
        "When does the game end?",
        "What's the bonus for completing a column?",
        "Can I put tiles in a row that already has a different color?",
        "What happens to tiles that overflow a pattern line?",
        "How do you break ties at the end?",
    ],
    "splendor": [
        "How many gems can I hold?",
        "When can I reserve a card?",
        "How do nobles work?",
        "Can I take three different gems?",
        "What triggers the end of the game?",
    ],
    "pandemic": [
        "How many actions do I get per turn?",
        "What happens during an outbreak?",
        "How do I share knowledge cards?",
        "When do we lose?",
        "What does the medic do differently?",
    ],
    "carcassonne": [
        "How do you score a farm?",
        "Can I steal a city with my meeple?",
        "When do I get my meeple back?",
        "How does the monastery scoring work?",
        "Can two players share a road?",
    ],
    "7-wonders": [
        "How does the military work?",
        "Can I build the same card twice?",
        "What are the science scoring combos?",
        "How does trading with neighbors work?",
    ],
    "king-of-tokyo": [
        "How do I enter Tokyo?",
        "When should I leave Tokyo?",
        "How does healing work inside Tokyo?",
        "What do three hearts do?",
    ],
    "sushi-go-party": [
        "How does the pudding scoring work at the end?",
        "What's the best combo with tempura?",
        "How many cards do we draft each round?",
    ],
    "coup": [
        "Can I bluff about being the Duke?",
        "When can someone challenge my action?",
        "What happens if I get caught lying?",
    ],
    "love-letter": [
        "What does the Guard do?",
        "When is the Princess eliminated?",
        "How does the Countess interact with the King?",
    ],
    "dominion": [
        "How many actions do I get per turn?",
        "What's a good opening buy?",
        "When should I start buying victory cards?",
    ],
    "kingdomino": [
        "How does the drafting order work?",
        "What's the 5x5 grid rule?",
        "How do you score connected terrains?",
    ],
}

# ── Phone models ────────────────────────────────────────────
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
    ("Google Pixel 9 / Android 15", "Android"),
    ("Samsung Galaxy A15 / Android 14", "Android"),
]

PLAYER_NAMES = [
    "Alex", "Jordan", "Sam", "Taylor", "Casey", "Morgan", "Riley", "Drew",
    "Jamie", "Avery", "Quinn", "Blake", "Skyler", "Dakota", "Reese", "Finley",
    "Charlie", "Rowan", "Emery", "Sage", "Max", "Ben", "Mike", "Sarah",
    "Chris", "Lisa", "Dave", "Emma", "Tom", "Mia", "Jake", "Zoe",
]

# ── Menu items ──────────────────────────────────────────────
MENU_ITEMS = {
    "coffee": [
        {"name": "Latte", "price_cents": 550},
        {"name": "Cold Brew", "price_cents": 500},
        {"name": "Drip Coffee", "price_cents": 350},
        {"name": "Cappuccino", "price_cents": 575},
        {"name": "Mocha", "price_cents": 625},
    ],
    "snacks": [
        {"name": "Loaded Fries", "price_cents": 899},
        {"name": "Nachos", "price_cents": 1099},
        {"name": "Pretzel Bites", "price_cents": 799},
        {"name": "Mozzarella Sticks", "price_cents": 899},
        {"name": "Chips & Guac", "price_cents": 749},
    ],
    "meals": [
        {"name": "Classic Burger", "price_cents": 1399},
        {"name": "Grilled Chicken Sandwich", "price_cents": 1299},
        {"name": "Margherita Pizza", "price_cents": 1199},
        {"name": "Fish Tacos", "price_cents": 1349},
    ],
    "beer_wine": [
        {"name": "IPA Draft", "price_cents": 799},
        {"name": "Lager Draft", "price_cents": 699},
        {"name": "House Red Wine", "price_cents": 899},
        {"name": "House White Wine", "price_cents": 899},
    ],
    "soft": [
        {"name": "Sparkling Water", "price_cents": 350},
        {"name": "Lemonade", "price_cents": 450},
        {"name": "Soda", "price_cents": 299},
    ],
}

# Category weights: coffee 30%, snacks 25%, meals 20%, beer 15%, soft 10%
CATEGORY_WEIGHTS = [("coffee", 30), ("snacks", 25), ("meals", 20), ("beer_wine", 15), ("soft", 10)]


def _random_ts(day: datetime, hour_min: int, hour_max: int) -> str:
    """Generate a random ISO timestamp within a day's hour range."""
    h = random.randint(hour_min, hour_max)
    m = random.randint(0, 59)
    s = random.randint(0, 59)
    return (day.replace(hour=h, minute=m, second=s)).isoformat() + "Z"


def _weighted_hour(day_of_week: int) -> int:
    """Return a weighted random hour based on day of week patterns."""
    is_weekend = day_of_week in (5, 6)  # Sat=5, Sun=6

    # Build weighted hour distribution
    weights = {}
    for h in range(10, 23):
        w = 1
        if 18 <= h <= 21:  # Peak evening
            w = 10
        elif 17 <= h <= 22:  # Extended evening
            w = 5
        elif 12 <= h <= 14 and is_weekend:  # Weekend lunch
            w = 4
        elif 15 <= h <= 17:  # Afternoon
            w = 2
        weights[h] = w

    hours = list(weights.keys())
    ws = list(weights.values())
    return random.choices(hours, weights=ws, k=1)[0]


def _pick_order_items() -> list:
    """Pick 1-3 menu items weighted by category."""
    categories = [c for c, w in CATEGORY_WEIGHTS for _ in range(w)]
    cat = random.choice(categories)
    items = [random.choice(MENU_ITEMS[cat])]
    # 60% chance of a second item
    if random.random() < 0.6:
        cat2 = random.choice(categories)
        items.append(random.choice(MENU_ITEMS[cat2]))
    # 25% chance of a third
    if random.random() < 0.25:
        cat3 = random.choice(categories)
        items.append(random.choice(MENU_ITEMS[cat3]))
    return items


@router.post("/api/seed-meepleville")
async def seed_meepleville():
    """Generate and insert realistic 2-week analytics data for Meepleville."""
    db = get_analytics_db()

    # ── Step 1: Generate devices ────────────────────────────
    num_devices = random.randint(48, 55)
    devices = []
    for i in range(num_devices):
        phone = random.choice(PHONE_MODELS)
        device_id = f"mv-device-{uuid.uuid4().hex[:12]}"
        devices.append({
            "device_id": device_id,
            "device_name": phone[0],
            "platform": phone[1],
            "visit_count": 1,  # will be updated
            "total_sessions": 0,
            "total_events": 0,
        })

    # Mark 15-20% as returning (visit_count > 1)
    returning_count = random.randint(8, 11)
    for d in random.sample(devices, returning_count):
        d["visit_count"] = random.randint(2, 5)

    # ── Step 2: Build session schedule ──────────────────────
    all_games = [(g, c) for g, c in TOP_GAMES] + [(g, c) for g, c in MID_GAMES]
    tail_sessions = [(g, random.randint(1, 3)) for g in random.sample(TAIL_GAMES, random.randint(10, 13))]
    all_games.extend(tail_sessions)

    # Expand into individual session entries
    game_session_list = []
    for game_id, count in all_games:
        for _ in range(count):
            game_session_list.append(game_id)
    random.shuffle(game_session_list)

    total_sessions = len(game_session_list)

    # Generate dates with day-of-week weighting
    days = []
    d = START_DATE
    while d <= END_DATE:
        days.append(d)
        d += timedelta(days=1)

    # Target sessions per day based on day of week
    day_targets = {}
    for day in days:
        dow = day.weekday()  # 0=Mon
        if dow == 0:  # Monday (dip)
            target = random.randint(8, 12)
        elif dow in (1, 2, 3):  # Tue-Thu
            target = random.randint(10, 15)
        elif dow == 4:  # Friday
            target = random.randint(20, 28)
        elif dow == 5:  # Saturday (busiest)
            target = random.randint(25, 38)
        else:  # Sunday
            target = random.randint(15, 24)
        day_targets[day] = target

    # Normalize targets to match total sessions
    total_target = sum(day_targets.values())
    scale = total_sessions / total_target if total_target > 0 else 1
    for day in days:
        day_targets[day] = max(1, round(day_targets[day] * scale))

    # Distribute game sessions across days
    session_assignments = []  # (day, game_id, device)
    game_idx = 0
    device_pool = list(range(num_devices))

    for day in days:
        n = day_targets[day]
        for _ in range(n):
            if game_idx >= len(game_session_list):
                break
            game_id = game_session_list[game_idx]
            dev_idx = random.choice(device_pool)
            session_assignments.append((day, game_id, dev_idx))
            game_idx += 1

    # ── Step 3: Build events, sessions, device_names ────────
    all_events = []
    all_sessions = []
    all_device_names = []

    # Track per-device stats
    device_sessions_count = {i: 0 for i in range(num_devices)}
    device_events_count = {i: 0 for i in range(num_devices)}
    device_first_seen = {}
    device_last_seen = {}

    # Distribute questions across games proportional to sessions
    # Duplicate pool so same question can be asked by different users (realistic)
    game_question_pool = {}
    for game_id, _ in TOP_GAMES + MID_GAMES + [(g, 1) for g in TAIL_GAMES]:
        if game_id in QUESTIONS:
            pool = list(QUESTIONS[game_id]) * 3  # allow repeats
            random.shuffle(pool)
            game_question_pool[game_id] = pool

    # Decide which sessions get questions (~90 sessions ask 1-3 questions → ~140 total)
    question_session_indices = set(random.sample(
        range(len(session_assignments)),
        min(90, len(session_assignments))
    ))

    # Decide which sessions place orders (~48 sessions)
    order_session_indices = set(random.sample(
        range(len(session_assignments)),
        min(48, len(session_assignments))
    ))

    # Sessions that are "learners" (short) vs "score trackers" (long)
    # 50/50 split
    long_session_indices = set(random.sample(
        range(len(session_assignments)),
        len(session_assignments) // 2
    ))

    total_questions = 0
    total_orders = 0
    total_revenue_cents = 0

    for idx, (day, game_id, dev_idx) in enumerate(session_assignments):
        device = devices[dev_idx]
        device_id = device["device_id"]
        session_id = f"mv-sess-{uuid.uuid4().hex[:12]}"

        # Session timing
        dow = day.weekday()
        hour = _weighted_hour(dow)
        minute = random.randint(0, 59)
        session_start = day.replace(hour=hour, minute=minute, second=random.randint(0, 59))

        # Duration: bimodal
        if idx in long_session_indices:
            duration_seconds = random.randint(3600, 5400)  # 60-90 min
        else:
            duration_seconds = random.randint(720, 1200)  # 12-20 min

        session_end = session_start + timedelta(seconds=duration_seconds)
        start_ts = session_start.isoformat() + "Z"
        end_ts = session_end.isoformat() + "Z"

        # Track device timing
        device_sessions_count[dev_idx] += 1
        if dev_idx not in device_first_seen or session_start < device_first_seen[dev_idx]:
            device_first_seen[dev_idx] = session_start
        if dev_idx not in device_last_seen or session_start > device_last_seen[dev_idx]:
            device_last_seen[dev_idx] = session_start

        events_in_session = []

        # session_start event
        events_in_session.append({
            "event_type": "session_start",
            "venue_id": VENUE_ID,
            "device_id": device_id,
            "session_id": session_id,
            "game_id": game_id,
            "timestamp": start_ts,
            "payload": json.dumps({}),
        })

        # game_selected event
        sel_ts = (session_start + timedelta(seconds=random.randint(5, 30))).isoformat() + "Z"
        events_in_session.append({
            "event_type": "game_selected",
            "venue_id": VENUE_ID,
            "device_id": device_id,
            "session_id": session_id,
            "game_id": game_id,
            "timestamp": sel_ts,
            "payload": json.dumps({"source": random.choice(["browse", "search", "recommendation", "browse", "browse"])}),
        })

        # Questions
        questions_in_session = 0
        if idx in question_session_indices:
            n_questions = random.randint(1, 3)
            available = game_question_pool.get(game_id, [])
            for qi in range(min(n_questions, len(available))):
                q_text = available.pop(0) if available else f"How does {game_id} work?"
                q_offset = random.randint(60, max(61, duration_seconds - 120))
                q_ts = (session_start + timedelta(seconds=q_offset)).isoformat() + "Z"
                events_in_session.append({
                    "event_type": "question_asked",
                    "venue_id": VENUE_ID,
                    "device_id": device_id,
                    "session_id": session_id,
                    "game_id": game_id,
                    "timestamp": q_ts,
                    "payload": json.dumps({"question": q_text}),
                })
                questions_in_session += 1
                total_questions += 1

        # Order
        orders_in_session = 0
        if idx in order_session_indices:
            order_items = _pick_order_items()
            order_total = sum(item["price_cents"] for item in order_items)
            minutes_into = random.randint(4, 12)
            o_offset = minutes_into * 60
            o_ts = (session_start + timedelta(seconds=min(o_offset, duration_seconds - 60))).isoformat() + "Z"
            events_in_session.append({
                "event_type": "order_placed",
                "venue_id": VENUE_ID,
                "device_id": device_id,
                "session_id": session_id,
                "game_id": game_id,
                "timestamp": o_ts,
                "payload": json.dumps({
                    "items": order_items,
                    "total_cents": order_total,
                    "minutes_since_game_start": minutes_into,
                }),
            })
            orders_in_session += 1
            total_orders += 1
            total_revenue_cents += order_total

        # page_dwell events (2-4 per session)
        for _ in range(random.randint(2, 4)):
            dwell_offset = random.randint(30, max(31, duration_seconds - 30))
            dwell_ts = (session_start + timedelta(seconds=dwell_offset)).isoformat() + "Z"
            events_in_session.append({
                "event_type": "page_dwell",
                "venue_id": VENUE_ID,
                "device_id": device_id,
                "session_id": session_id,
                "game_id": game_id,
                "timestamp": dwell_ts,
                "payload": json.dumps({
                    "page": random.choice(["game_detail", "rules", "score", "qa", "menu"]),
                    "dwell_seconds": random.randint(15, 180),
                }),
            })

        # tab_dwell events
        for tab in random.sample(["rules", "score", "qa", "notes"], k=random.randint(1, 3)):
            td_offset = random.randint(30, max(31, duration_seconds - 30))
            td_ts = (session_start + timedelta(seconds=td_offset)).isoformat() + "Z"
            events_in_session.append({
                "event_type": "tab_dwell",
                "venue_id": VENUE_ID,
                "device_id": device_id,
                "session_id": session_id,
                "game_id": game_id,
                "timestamp": td_ts,
                "payload": json.dumps({
                    "tab": tab,
                    "dwell_seconds": random.randint(20, 300),
                }),
            })

        # session_ended event
        events_in_session.append({
            "event_type": "session_ended",
            "venue_id": VENUE_ID,
            "device_id": device_id,
            "session_id": session_id,
            "game_id": game_id,
            "timestamp": end_ts,
            "payload": json.dumps({
                "total_duration_seconds": duration_seconds,
                "pages_visited": random.randint(3, 8),
            }),
        })

        device_events_count[dev_idx] += len(events_in_session)
        all_events.extend(events_in_session)

        # Session record
        all_sessions.append({
            "session_id": session_id,
            "device_id": device_id,
            "venue_id": VENUE_ID,
            "started_at": start_ts,
            "ended_at": end_ts,
            "duration_seconds": duration_seconds,
            "games_viewed": random.randint(1, 4),
            "games_played": 1,
            "questions_asked": questions_in_session,
            "orders_placed": orders_in_session,
            "tts_uses": random.randint(0, 2) if random.random() < 0.3 else 0,
            "voice_inputs": 0,
            "pages_visited": json.dumps(["games", "game_detail", "rules"]),
        })

        # Player name (60% chance)
        if random.random() < 0.6:
            name = random.choice(PLAYER_NAMES)
            all_device_names.append({
                "device_id": device_id,
                "name": name,
                "session_id": session_id,
                "seen_at": start_ts,
            })

    # ── Step 4: Insert into DB ──────────────────────────────

    # Clear existing Meepleville data
    db.execute("DELETE FROM events WHERE venue_id = ?", (VENUE_ID,))
    db.execute("DELETE FROM sessions WHERE venue_id = ?", (VENUE_ID,))
    db.execute("DELETE FROM devices WHERE venue_id = ?", (VENUE_ID,))
    db.execute("DELETE FROM device_names WHERE device_id LIKE 'mv-device-%'")

    # Insert devices
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
            d["visit_count"],
            device_sessions_count[i],
            device_events_count[i],
        ))

    # Insert sessions
    for s in all_sessions:
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

    # Insert events
    for e in all_events:
        db.execute("""
            INSERT INTO events (event_type, venue_id, device_id, session_id, game_id, timestamp, payload)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            e["event_type"], e["venue_id"], e["device_id"], e["session_id"],
            e["game_id"], e["timestamp"], e["payload"],
        ))

    # Insert device names
    for dn in all_device_names:
        db.execute("""
            INSERT INTO device_names (device_id, name, session_id, seen_at)
            VALUES (?, ?, ?, ?)
        """, (dn["device_id"], dn["name"], dn["session_id"], dn["seen_at"]))

    db.commit()

    return {
        "status": "ok",
        "devices": len(devices),
        "returning_devices": returning_count,
        "sessions": len(all_sessions),
        "events": len(all_events),
        "questions": total_questions,
        "orders": total_orders,
        "revenue_cents": total_revenue_cents,
        "revenue_dollars": round(total_revenue_cents / 100, 2),
    }
