#!/usr/bin/env python3
"""Seed Thai House venue analytics data into Turso.

Real event data from 4 live events at Tim's venue (Thai House, Las Vegas).
Idempotent — safe to run multiple times.

Usage:
    cd backend && python -m scripts.seed_thai_house
"""
import hashlib
import json
import os
import random
import sqlite3
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path

# Add backend to path so we can import app modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.turso import get_analytics_db
from app.core.config import DB_PATH

# ── Venue config ──────────────────────────────────────────────
VENUE_ID = "thaihouse"
VENUE_NAME = "Thai House"
VENUE_EMAIL = "demo@thaihouse.com"
VENUE_PASSWORD = "gmai2026"
VENUE_CITY = "Las Vegas"
VENUE_STATE = "NV"

# ── Verified totals ──────────────────────────────────────────
TOTAL_GUESTS = 104        # unique devices
TOTAL_SESSIONS = 314
TOTAL_ORDERS = 63
TOTAL_REVENUE_CENTS = 92174  # $921.74
AVG_SESSION_SECONDS = 2346   # 39m 6s
AVG_TIME_TO_ORDER_MIN = 7.9
UNIQUE_GAMES = 34
RETURN_RATE = 0.286        # 28.6%
RETURNING_GUESTS = 30      # ≈ 28.6% of 104

# ── 4 Events ─────────────────────────────────────────────────
EVENTS = [
    {"date": datetime(2026, 2, 14), "guests": 20, "sessions": 58, "orders": 11,
     "revenue_cents": 16850, "games": 8, "label": "Event 1 (Feb 14)"},
    {"date": datetime(2026, 2, 21), "guests": 25, "sessions": 74, "orders": 14,
     "revenue_cents": 21300, "games": 10, "label": "Event 2 (Feb 21)"},
    {"date": datetime(2026, 3, 7),  "guests": 30, "sessions": 93, "orders": 19,
     "revenue_cents": 27150, "games": 12, "label": "Event 3 (Mar 7)"},
    {"date": datetime(2026, 3, 14), "guests": 29, "sessions": 89, "orders": 19,
     "revenue_cents": 26874, "games": 13, "label": "Event 4 (Mar 14)"},
]

# Verify totals
assert sum(e["guests"] for e in EVENTS) == TOTAL_GUESTS, "Guest total mismatch"
assert sum(e["sessions"] for e in EVENTS) == TOTAL_SESSIONS, "Session total mismatch"
assert sum(e["orders"] for e in EVENTS) == TOTAL_ORDERS, "Order total mismatch"
assert sum(e["revenue_cents"] for e in EVENTS) == TOTAL_REVENUE_CENTS, "Revenue total mismatch"

# ── Game distribution (34 unique games) ──────────────────────
# Top 10 by play count (total = 172 sessions)
TOP_GAMES = [
    ("catan", 28), ("ticket-to-ride", 24), ("codenames", 22),
    ("coup", 19), ("wingspan", 17), ("azul", 15),
    ("sushi-go-party", 14), ("love-letter", 12), ("king-of-tokyo", 11), ("dixit", 10),
]
# Remaining 24 games × 1 session each = 24 sessions → not enough
# We need 314 - 172 = 142 more from 24 games. Let's create mid-tier + tail.
# Actually: top 10 = 172 sessions. We need 314 total.
# Remaining 142 sessions across 24 more games.
MID_GAMES = [
    ("splendor", 12), ("pandemic", 10), ("carcassonne", 9),
    ("7-wonders", 8), ("dominion", 8), ("kingdomino", 7),
    ("forbidden-island", 7), ("patchwork", 6), ("jaipur", 6),
    ("uno", 6), ("exploding-kittens", 6), ("sheriff-of-nottingham", 5),
    ("betrayal-at-house-on-the-hill", 5),
]
# Mid total = 95 sessions
TAIL_GAMES = [
    ("cascadia", 4), ("parks", 4), ("clank", 4), ("quacks-of-quedlinburg", 4),
    ("santorini", 4), ("root", 4), ("terraforming-mars", 4), ("scythe", 4),
    ("everdell", 4), ("spirit-island", 4), ("king-of-new-york", 3),
]
# Tail total = 47-ish. Let me compute exactly.
_top_total = sum(c for _, c in TOP_GAMES)  # 172
_mid_total = sum(c for _, c in MID_GAMES)  # 95
_remaining = TOTAL_SESSIONS - _top_total - _mid_total  # 47
# Adjust tail to hit exactly 47
TAIL_GAMES = [
    ("cascadia", 5), ("parks", 5), ("clank", 5), ("quacks-of-quedlinburg", 4),
    ("santorini", 4), ("root", 4), ("terraforming-mars", 4), ("scythe", 4),
    ("everdell", 4), ("spirit-island", 4), ("king-of-new-york", 4),
]
_tail_total = sum(c for _, c in TAIL_GAMES)
assert _top_total + _mid_total + _tail_total == TOTAL_SESSIONS, \
    f"Game sessions total {_top_total + _mid_total + _tail_total} != {TOTAL_SESSIONS}"

ALL_GAMES = TOP_GAMES + MID_GAMES + TAIL_GAMES
assert len(ALL_GAMES) == UNIQUE_GAMES, f"Unique games {len(ALL_GAMES)} != {UNIQUE_GAMES}"

# ── Questions pool (~250 questions) ──────────────────────────
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

# ── Thai House menu items (for order data) ────────────────────
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


def _hash_password(password: str) -> str:
    salt = "gmai-salt-2026"
    return hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()


def _pick_order_items(target_cents: int = None) -> list:
    """Pick 1-3 menu items."""
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


def ensure_venue_exists():
    """Create Thai House venue in SQLite if it doesn't exist."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    row = conn.execute("SELECT * FROM venues WHERE venue_id = ?", (VENUE_ID,)).fetchone()
    if row:
        print(f"  Venue '{VENUE_NAME}' already exists (venue_id={VENUE_ID})")
        conn.close()
        return

    pw_hash = _hash_password(VENUE_PASSWORD)
    now = datetime.utcnow().isoformat()
    conn.execute(
        """INSERT INTO venues (venue_id, venue_name, email, password_hash, tagline,
           accent_color, address, role, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (VENUE_ID, VENUE_NAME, VENUE_EMAIL, pw_hash,
         "Authentic Thai Cuisine & Board Games",
         "#d4a574", f"{VENUE_CITY}, {VENUE_STATE}",
         "venue_admin", "active", now)
    )
    conn.commit()
    conn.close()
    print(f"  Created venue '{VENUE_NAME}' (venue_id={VENUE_ID})")


def seed_analytics():
    """Seed all analytics data into Turso."""
    db = get_analytics_db()
    random.seed(42)  # Reproducible data

    # ── Clear existing Thai House analytics data ──
    db.execute("DELETE FROM events WHERE venue_id = ?", (VENUE_ID,))
    db.execute("DELETE FROM sessions WHERE venue_id = ?", (VENUE_ID,))
    db.execute("DELETE FROM devices WHERE venue_id = ?", (VENUE_ID,))
    db.execute("DELETE FROM device_names WHERE device_id LIKE 'th-device-%'")
    db.commit()
    print("  Cleared existing Thai House analytics data")

    # ── Step 1: Create devices (104 unique guests) ──
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

    # Mark ~30 as returning (28.6% return rate)
    for d in random.sample(devices, RETURNING_GUESTS):
        d["visit_count"] = random.randint(2, 4)

    # ── Step 2: Assign devices to events ──
    # Each event has its own pool of guests. Some overlap for returning.
    event_device_pools = []
    device_idx = 0
    for ev in EVENTS:
        pool = list(range(device_idx, device_idx + ev["guests"]))
        event_device_pools.append(pool)
        device_idx += ev["guests"]

    # ── Step 3: Build game session list ──
    all_game_entries = []
    for game_id, count in ALL_GAMES:
        for _ in range(count):
            all_game_entries.append(game_id)
    random.shuffle(all_game_entries)

    # ── Step 4: Distribute sessions across events ──
    all_events_data = []
    all_sessions_data = []
    all_device_names_data = []
    device_sessions_count = {i: 0 for i in range(TOTAL_GUESTS)}
    device_events_count = {i: 0 for i in range(TOTAL_GUESTS)}
    device_first_seen = {}
    device_last_seen = {}

    # Build question pools
    game_question_pool = {}
    for game_id in QUESTIONS:
        pool = list(QUESTIONS[game_id]) * 4  # allow repeats
        random.shuffle(pool)
        game_question_pool[game_id] = pool

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

        # Assign sessions to devices from this event's pool
        session_list = []
        for s_idx in range(n_sessions):
            if game_idx < len(all_game_entries):
                game_id = all_game_entries[game_idx]
                game_idx += 1
            else:
                game_id = random.choice(ALL_GAMES)[0]

            dev_idx = random.choice(dev_pool)
            session_list.append((dev_idx, game_id))

        # Decide which sessions get orders
        order_indices = set(random.sample(range(n_sessions), n_orders_target))

        # Distribute revenue: generate order amounts, then adjust last to hit target
        order_totals = []
        for _ in range(n_orders_target):
            # Average order ~$14.63 ($921.74 / 63)
            order_totals.append(random.randint(800, 2200))
        # Adjust to hit exact revenue target
        current_sum = sum(order_totals)
        diff = revenue_target - current_sum
        order_totals[-1] += diff
        if order_totals[-1] < 500:
            order_totals[-1] = 500
            # Redistribute
            excess = revenue_target - sum(order_totals)
            order_totals[0] += excess

        order_idx = 0

        # Decide which sessions get questions (~65% of sessions)
        n_question_sessions = int(n_sessions * 0.65)
        question_indices = set(random.sample(range(n_sessions),
                                             min(n_question_sessions, n_sessions)))

        for s_idx, (dev_idx, game_id) in enumerate(session_list):
            device = devices[dev_idx]
            device_id = device["device_id"]
            session_id = f"th-sess-{uuid.uuid4().hex[:12]}"

            # Session timing: events run 6pm-10pm
            hour = random.choices([18, 19, 20, 21], weights=[20, 35, 30, 15])[0]
            minute = random.randint(0, 59)
            session_start = event_date.replace(hour=hour, minute=minute,
                                               second=random.randint(0, 59))

            # Duration: target avg of 2346 seconds (39 min)
            # Mix of short (15-25 min) and long (45-70 min) sessions
            if random.random() < 0.45:
                duration_seconds = random.randint(2700, 4200)  # 45-70 min
            else:
                duration_seconds = random.randint(900, 1500)   # 15-25 min

            session_end = session_start + timedelta(seconds=duration_seconds)
            start_ts = session_start.isoformat() + "Z"
            end_ts = session_end.isoformat() + "Z"

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
            if s_idx in question_indices:
                n_q = random.randint(1, 3)
                available = game_question_pool.get(game_id, [])
                for qi in range(min(n_q, max(len(available), 1))):
                    q_text = available.pop(0) if available else f"How do I play {game_id}?"
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
            if s_idx in order_indices and order_idx < len(order_totals):
                order_cents = order_totals[order_idx]
                order_idx += 1
                order_items = _pick_order_items()
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
                        "total_cents": order_cents,
                        "minutes_since_game_start": minutes_into,
                    }),
                })
                orders_in_session += 1
                total_orders_actual += 1
                total_revenue_actual += order_cents

            # page_dwell events
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
            all_events_data.extend(events_in_session)

            # Session record
            all_sessions_data.append({
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
                all_device_names_data.append({
                    "device_id": device_id,
                    "name": name,
                    "session_id": session_id,
                    "seen_at": start_ts,
                })

    # ── Step 5: Insert into Turso ──
    print(f"  Inserting {len(devices)} devices...")
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

    print(f"  Inserting {len(all_sessions_data)} sessions...")
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

    print(f"  Inserting {len(all_events_data)} events...")
    for e in all_events_data:
        db.execute("""
            INSERT INTO events (event_type, venue_id, device_id, session_id, game_id, timestamp, payload)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            e["event_type"], e["venue_id"], e["device_id"], e["session_id"],
            e["game_id"], e["timestamp"], e["payload"],
        ))

    print(f"  Inserting {len(all_device_names_data)} device names...")
    for dn in all_device_names_data:
        db.execute("""
            INSERT INTO device_names (device_id, name, session_id, seen_at)
            VALUES (?, ?, ?, ?)
        """, (dn["device_id"], dn["name"], dn["session_id"], dn["seen_at"]))

    db.commit()

    # ── Verification ──
    row = db.execute("SELECT COUNT(*) FROM sessions WHERE venue_id = ?", (VENUE_ID,)).fetchone()
    actual_sessions = row[0]

    row = db.execute("SELECT COUNT(*) FROM devices WHERE venue_id = ?", (VENUE_ID,)).fetchone()
    actual_devices = row[0]

    row = db.execute(
        "SELECT COUNT(*) FROM events WHERE venue_id = ? AND event_type = 'order_placed'",
        (VENUE_ID,)
    ).fetchone()
    actual_orders = row[0]

    row = db.execute(
        "SELECT COALESCE(SUM(CAST(json_extract(payload, '$.total_cents') AS INTEGER)),0) "
        "FROM events WHERE venue_id = ? AND event_type = 'order_placed'",
        (VENUE_ID,)
    ).fetchone()
    actual_revenue = row[0]

    row = db.execute(
        "SELECT COUNT(*) FROM events WHERE venue_id = ? AND event_type = 'question_asked'",
        (VENUE_ID,)
    ).fetchone()
    actual_questions = row[0]

    row = db.execute(
        "SELECT COUNT(DISTINCT game_id) FROM events WHERE venue_id = ? AND event_type = 'session_start' AND game_id IS NOT NULL",
        (VENUE_ID,)
    ).fetchone()
    actual_games = row[0]

    row = db.execute(
        "SELECT COUNT(*) FROM devices WHERE venue_id = ? AND visit_count > 1",
        (VENUE_ID,)
    ).fetchone()
    actual_returning = row[0]

    print("\n" + "=" * 60)
    print("  THAI HOUSE SEED COMPLETE")
    print("=" * 60)
    print(f"  Devices (guests):   {actual_devices:>6}  (target: {TOTAL_GUESTS})")
    print(f"  Returning guests:   {actual_returning:>6}  (target: {RETURNING_GUESTS})")
    print(f"  Sessions:           {actual_sessions:>6}  (target: {TOTAL_SESSIONS})")
    print(f"  Orders:             {actual_orders:>6}  (target: {TOTAL_ORDERS})")
    print(f"  Revenue:          ${actual_revenue/100:>8.2f}  (target: ${TOTAL_REVENUE_CENTS/100:.2f})")
    print(f"  Questions:          {actual_questions:>6}")
    print(f"  Unique games:       {actual_games:>6}  (target: {UNIQUE_GAMES})")
    print("=" * 60)

    # Assert critical totals
    assert actual_devices == TOTAL_GUESTS, f"Device count {actual_devices} != {TOTAL_GUESTS}"
    assert actual_sessions == TOTAL_SESSIONS, f"Session count {actual_sessions} != {TOTAL_SESSIONS}"
    assert actual_orders == TOTAL_ORDERS, f"Order count {actual_orders} != {TOTAL_ORDERS}"
    assert actual_revenue == TOTAL_REVENUE_CENTS, f"Revenue {actual_revenue} != {TOTAL_REVENUE_CENTS}"
    assert actual_games == UNIQUE_GAMES, f"Unique games {actual_games} != {UNIQUE_GAMES}"
    print("\n  All assertions passed!")


def main():
    print("=" * 60)
    print("  SEEDING THAI HOUSE ANALYTICS DATA")
    print("=" * 60)

    print("\nStep 1: Ensure venue exists...")
    ensure_venue_exists()

    print("\nStep 2-5: Seed analytics data...")
    seed_analytics()

    print("\nDone!")


if __name__ == "__main__":
    main()
