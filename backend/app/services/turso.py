"""Turso (libsql) connection manager for analytics and drink club."""
import os
import logging

logger = logging.getLogger(__name__)

_connection = None


class _LibsqlCompat:
    """Thin wrapper around a libsql connection that auto-converts params to tuples.

    libsql_experimental requires parameters as tuples, but sqlite3 accepts both
    lists and tuples. This wrapper normalises params so callers don't need to care.
    """

    def __init__(self, conn):
        self._conn = conn

    def execute(self, sql, params=()):
        return self._conn.execute(sql, tuple(params) if params else ())

    def commit(self):
        return self._conn.commit()

    def close(self):
        return self._conn.close()

    def __getattr__(self, name):
        return getattr(self._conn, name)


def get_analytics_db():
    global _connection
    if _connection is not None:
        return _connection

    url = os.getenv("TURSO_DATABASE_URL", "")
    token = os.getenv("TURSO_AUTH_TOKEN", "")

    if url and token:
        import libsql_experimental as libsql
        raw = libsql.connect(url, auth_token=token)
        _connection = _LibsqlCompat(raw)
        logger.info(f"Connected to Turso: {url[:40]}...")
    else:
        # Local fallback — regular SQLite file
        import sqlite3
        os.makedirs("data", exist_ok=True)
        _connection = sqlite3.connect("data/analytics.db", check_same_thread=False)
        logger.warning("No Turso credentials — using local SQLite for analytics")

    return _connection


def init_analytics_tables():
    db = get_analytics_db()
    db.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            venue_id TEXT NOT NULL DEFAULT 'demo',
            device_id TEXT NOT NULL,
            session_id TEXT,
            game_id TEXT,
            timestamp TEXT NOT NULL,
            payload TEXT NOT NULL DEFAULT '{}'
        )
    """)
    db.execute("CREATE INDEX IF NOT EXISTS idx_events_venue_date ON events(venue_id, timestamp)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_events_type_venue ON events(event_type, venue_id, timestamp)")

    db.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            venue_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            game_id TEXT NOT NULL,
            player_name TEXT,
            game_rating INTEGER NOT NULL,
            ai_helpfulness_overall INTEGER NOT NULL,
            would_use_again BOOLEAN NOT NULL,
            played_before BOOLEAN,
            helpful_setup INTEGER,
            helpful_rules INTEGER,
            helpful_strategy INTEGER,
            helpful_scoring INTEGER,
            feedback_text TEXT,
            submitted_at TEXT NOT NULL
        )
    """)
    db.execute("CREATE INDEX IF NOT EXISTS idx_feedback_venue ON feedback(venue_id, submitted_at)")

    db.execute("""
        CREATE TABLE IF NOT EXISTS daily_rollups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venue_id TEXT NOT NULL,
            date TEXT NOT NULL,
            total_sessions INTEGER DEFAULT 0,
            unique_devices INTEGER DEFAULT 0,
            total_questions INTEGER DEFAULT 0,
            avg_game_rating REAL,
            avg_ai_rating REAL,
            top_game_id TEXT,
            top_game_sessions INTEGER DEFAULT 0,
            completion_rate REAL,
            error_count INTEGER DEFAULT 0
        )
    """)
    db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_rollups_venue_date ON daily_rollups(venue_id, date)")

    # ── Device tracking ──
    db.execute("""
        CREATE TABLE IF NOT EXISTS devices (
            device_id TEXT PRIMARY KEY,
            device_name TEXT,
            platform TEXT,
            screen_resolution TEXT,
            user_agent TEXT,
            venue_id TEXT,
            first_seen_at TEXT,
            last_seen_at TEXT,
            visit_count INTEGER DEFAULT 1,
            total_sessions INTEGER DEFAULT 0,
            total_events INTEGER DEFAULT 0
        )
    """)
    db.execute("CREATE INDEX IF NOT EXISTS idx_devices_venue ON devices(venue_id)")

    # ── Session tracking ──
    db.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            device_id TEXT NOT NULL,
            venue_id TEXT,
            started_at TEXT,
            ended_at TEXT,
            duration_seconds INTEGER,
            games_viewed INTEGER DEFAULT 0,
            games_played INTEGER DEFAULT 0,
            questions_asked INTEGER DEFAULT 0,
            orders_placed INTEGER DEFAULT 0,
            tts_uses INTEGER DEFAULT 0,
            voice_inputs INTEGER DEFAULT 0,
            pages_visited TEXT
        )
    """)
    db.execute("CREATE INDEX IF NOT EXISTS idx_sessions_device ON sessions(device_id)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_sessions_venue ON sessions(venue_id)")

    # ── Device names (player names associated with devices) ──
    db.execute("""
        CREATE TABLE IF NOT EXISTS device_names (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            name TEXT NOT NULL,
            session_id TEXT,
            seen_at TEXT
        )
    """)
    db.execute("CREATE INDEX IF NOT EXISTS idx_device_names_device ON device_names(device_id)")

    # ── Additional indexes on events table ──
    db.execute("CREATE INDEX IF NOT EXISTS idx_events_device ON events(device_id)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_events_game ON events(game_id)")

    db.commit()
    logger.info("Analytics tables initialized")


def get_drink_club_db():
    """Return the shared Turso connection for drink club tables.

    Reuses the same Turso database as analytics — no need for a separate DB.
    """
    return get_analytics_db()


def init_drink_club_tables():
    """Create drink_subscribers and drink_redemptions tables in Turso."""
    db = get_drink_club_db()
    db.execute("""
        CREATE TABLE IF NOT EXISTS drink_subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT,
            stripe_customer_id TEXT,
            stripe_subscription_id TEXT,
            subscription_status TEXT DEFAULT 'inactive',
            qr_code TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS drink_redemptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subscriber_id INTEGER NOT NULL,
            redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            redeemed_by TEXT,
            drink_name TEXT,
            week_start TEXT NOT NULL,
            FOREIGN KEY (subscriber_id) REFERENCES drink_subscribers(id),
            UNIQUE(subscriber_id, week_start)
        )
    """)
    db.execute("""
        CREATE INDEX IF NOT EXISTS idx_drink_subscribers_phone
        ON drink_subscribers(phone)
    """)
    db.commit()

    # Seed Gershon as manual subscriber if not already present
    existing = db.execute(
        "SELECT id FROM drink_subscribers WHERE phone = '7029185658'"
    ).fetchone()
    if not existing:
        import secrets
        db.execute(
            """INSERT INTO drink_subscribers
               (name, email, phone, stripe_customer_id, subscription_status, qr_code, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))""",
            ("Gershon", "", "7029185658", "manual_entry", "active", secrets.token_urlsafe(16)),
        )
        db.commit()
        logger.info("Seeded Gershon as drink club subscriber")

    logger.info("Drink club tables initialized")


def get_menu_db():
    """Return the shared Turso connection for menu/floor/loyalty/orders tables."""
    return get_analytics_db()


def _seed_beverage_menu(db):
    """Migrate old Beverages category to new drink categories with toppings/sweetness."""
    import json as _json
    import re

    # Check if migration already ran (look for new category)
    existing = db.execute(
        "SELECT id FROM menu_categories WHERE name = 'Traditional Thai Drinks'"
    ).fetchone()
    if existing:
        return  # already migrated

    logger.info("Running beverage menu migration...")

    def _slugify(name):
        s = name.lower()
        s = re.sub(r"[^a-z0-9]+", "-", s)
        return s.strip("-")

    # 1. Create drink toggles
    db.execute(
        "INSERT OR REPLACE INTO menu_toggles (id, name, required, options, sort_order, multi_select) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        ("drink-temp", "Temperature", 1,
         _json.dumps([{"name": "Iced", "upcharge": 0}, {"name": "Frappe", "upcharge": 0.70}]),
         10, 0)
    )
    db.execute(
        "INSERT OR REPLACE INTO menu_toggles (id, name, required, options, sort_order, multi_select) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        ("sweetness", "Sweetness", 0,
         _json.dumps([
             {"name": "25%", "upcharge": 0}, {"name": "50%", "upcharge": 0},
             {"name": "75%", "upcharge": 0}, {"name": "100%", "upcharge": 0},
         ]),
         11, 0)
    )
    db.execute(
        "INSERT OR REPLACE INTO menu_toggles (id, name, required, options, sort_order, multi_select) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        ("toppings", "Toppings", 0,
         _json.dumps([
             {"name": "Boba", "upcharge": 0.35},
             {"name": "Lychee Jelly", "upcharge": 0.35},
             {"name": "Fresh Strawberries", "upcharge": 0.35},
             {"name": "Fresh Mango", "upcharge": 0.35},
         ]),
         12, 1)
    )

    # 2. Delete old Beverages category and its items
    old_bev = db.execute("SELECT id FROM menu_categories WHERE name = 'Beverages'").fetchone()
    if old_bev:
        db.execute("DELETE FROM menu_items WHERE category_id = ?", (old_bev[0],))
        db.execute("DELETE FROM menu_categories WHERE id = ?", (old_bev[0],))

    # 3. Determine sort_order for new categories (after existing food categories)
    max_sort = db.execute("SELECT COALESCE(MAX(sort_order), 0) FROM menu_categories").fetchone()[0]

    # 4. Create new drink categories and items
    drink_categories = [
        ("Traditional Thai Drinks", "\U0001F375", [
            ("Thai Iced Coffee", 5.25, ["drink-temp", "sweetness", "toppings"]),
            ("Thai Iced Tea", 5.25, ["drink-temp", "sweetness", "toppings"]),
            ("Black Milk Tea", 5.25, ["drink-temp", "sweetness", "toppings"]),
        ]),
        ("Matcha", "\U0001F35B", [
            ("Matcha Iced", 5.50, ["sweetness", "toppings"]),
            ("Matcha Frappe", 5.75, ["sweetness", "toppings"]),
            ("Chocolate Chip Matcha Frappe", 5.95, ["sweetness", "toppings"]),
            ("Matcha Milk Strawberry", 6.25, ["sweetness", "toppings"]),
            ("Strawberry Matcha Frappe", 6.25, ["sweetness", "toppings"]),
        ]),
        ("Milk Tea", "\U0001F95B", [
            ("Mango Milk Tea", 5.25, ["sweetness", "toppings"]),
            ("Taro Milk Tea", 5.25, ["sweetness", "toppings"]),
            ("Banana Milk Tea", 5.25, ["sweetness", "toppings"]),
            ("Strawberry Milk Tea", 5.25, ["sweetness", "toppings"]),
            ("Honeydew Milk Tea", 5.25, ["sweetness", "toppings"]),
            ("Watermelon Milk Tea", 5.25, ["sweetness", "toppings"]),
        ]),
        ("Smoothies", "\U0001F353", [
            ("Strawberry Smoothie", 5.25, ["sweetness", "toppings"]),
            ("Watermelon Smoothie", 5.25, ["sweetness", "toppings"]),
            ("Mango Smoothie", 5.25, ["sweetness", "toppings"]),
            ("Taro Smoothie", 5.25, ["sweetness", "toppings"]),
            ("Coconut Smoothie", 5.25, ["sweetness", "toppings"]),
            ("Banana Smoothie", 5.25, ["sweetness", "toppings"]),
            ("Honeydew Smoothie", 5.25, ["sweetness", "toppings"]),
        ]),
        ("Fruit Teas", "\U0001F34A", [
            ("Strawberry Fruit Tea", 5.75, ["sweetness", "toppings"]),
            ("Mango Fruit Tea", 5.75, ["sweetness", "toppings"]),
            ("Strawberry Tajin Fruit Tea", 5.75, ["sweetness", "toppings"]),
        ]),
        ("Specialty", "\U00002728", [
            ("Butterfly Lychee Soda", 5.50, ["sweetness", "toppings"]),
        ]),
    ]

    for cat_idx, (cat_name, icon, items) in enumerate(drink_categories):
        sort = max_sort + 1 + cat_idx
        db.execute(
            "INSERT INTO menu_categories (name, icon, sort_order) VALUES (?, ?, ?)",
            (cat_name, icon, sort)
        )
        cat_row = db.execute("SELECT id FROM menu_categories WHERE name = ?", (cat_name,)).fetchone()
        cat_id = cat_row[0]

        for item_idx, (name, price, toggles) in enumerate(items):
            slug = _slugify(name)
            db.execute(
                """INSERT OR IGNORE INTO menu_items
                   (slug, category_id, name, description, price, image, toggles,
                    allows_modifications, active, sort_order)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (slug, cat_id, name, "", price, None,
                 _json.dumps(toggles), 1, 1, item_idx)
            )

    db.commit()
    item_count = sum(len(items) for _, _, items in drink_categories)
    logger.info(f"Beverage menu migrated: 6 categories, {item_count} items, 3 toggles (drink-temp, sweetness, toppings)")


def init_menu_tables():
    """Create menu, floor plan, loyalty, and venue order tables in Turso."""
    db = get_menu_db()

    db.execute("""
        CREATE TABLE IF NOT EXISTS menu_toggles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            required INTEGER DEFAULT 1,
            options TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0
        )
    """)

    db.execute("""
        CREATE TABLE IF NOT EXISTS menu_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            icon TEXT DEFAULT '',
            sort_order INTEGER DEFAULT 0
        )
    """)

    db.execute("""
        CREATE TABLE IF NOT EXISTS menu_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT NOT NULL UNIQUE,
            category_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            price REAL NOT NULL,
            image TEXT,
            toggles TEXT DEFAULT '[]',
            allows_modifications INTEGER DEFAULT 1,
            active INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES menu_categories(id)
        )
    """)

    db.execute("""
        CREATE TABLE IF NOT EXISTS floor_tables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            num INTEGER NOT NULL,
            x REAL NOT NULL,
            y REAL NOT NULL,
            w REAL DEFAULT 90,
            h REAL DEFAULT 50,
            type TEXT DEFAULT 'table',
            seats INTEGER DEFAULT 4,
            label TEXT DEFAULT 'Table',
            zone TEXT DEFAULT ''
        )
    """)

    db.execute("""
        CREATE TABLE IF NOT EXISTS floor_zones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL,
            x REAL NOT NULL,
            y REAL NOT NULL,
            w REAL NOT NULL,
            h REAL NOT NULL,
            color TEXT DEFAULT '#2a3025',
            is_entrance INTEGER DEFAULT 0
        )
    """)

    db.execute("""
        CREATE TABLE IF NOT EXISTS loyalty_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT UNIQUE,
            email TEXT,
            points INTEGER DEFAULT 0,
            total_spent REAL DEFAULT 0,
            visits INTEGER DEFAULT 0,
            last_visit TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    db.execute("""
        CREATE TABLE IF NOT EXISTS venue_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_number INTEGER NOT NULL,
            source TEXT DEFAULT 'in_house',
            table_number INTEGER,
            customer_name TEXT NOT NULL,
            customer_phone TEXT,
            items TEXT NOT NULL,
            total REAL NOT NULL,
            order_status TEXT DEFAULT 'new',
            print_status TEXT DEFAULT 'pending',
            drink_club_phone TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            confirmed_at TIMESTAMP,
            completed_at TIMESTAMP,
            rejected_reason TEXT
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS order_counters (
            venue_id TEXT PRIMARY KEY,
            last_number INTEGER DEFAULT 0
        )
    """)

    db.execute("CREATE INDEX IF NOT EXISTS idx_venue_orders_status ON venue_orders(order_status)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_venue_orders_created ON venue_orders(created_at)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_loyalty_phone ON loyalty_members(phone)")

    # multi_select support for toggles (e.g. toppings)
    try:
        db.execute("ALTER TABLE menu_toggles ADD COLUMN multi_select INTEGER DEFAULT 0")
    except Exception:
        pass  # column already exists

    db.execute("""
        CREATE TABLE IF NOT EXISTS loyalty_rewards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venue_id TEXT DEFAULT 'meetup',
            points_required INTEGER NOT NULL,
            description TEXT NOT NULL,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    db.execute("""
        CREATE TABLE IF NOT EXISTS loyalty_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            member_phone TEXT NOT NULL,
            type TEXT NOT NULL,
            points_change INTEGER NOT NULL,
            reward_id INTEGER,
            order_number INTEGER,
            note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    db.execute("CREATE INDEX IF NOT EXISTS idx_loyalty_tx_phone ON loyalty_transactions(member_phone)")

    # Seed default loyalty rewards
    existing_rewards = db.execute("SELECT COUNT(*) FROM loyalty_rewards").fetchone()[0]
    if existing_rewards == 0:
        db.execute(
            "INSERT INTO loyalty_rewards (venue_id, points_required, description) VALUES (?, ?, ?)",
            ("meetup", 10, "Free Entree")
        )
        db.execute(
            "INSERT INTO loyalty_rewards (venue_id, points_required, description) VALUES (?, ?, ?)",
            ("meetup", 10, "1 Month Cha Club")
        )

    # ── Menu item images (gallery + A/B testing) ──
    db.execute("""
        CREATE TABLE IF NOT EXISTS menu_item_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            image_url TEXT,
            image_blob BLOB,
            image_thumb_blob BLOB,
            image_filename TEXT,
            alt_text TEXT DEFAULT '',
            source TEXT DEFAULT 'manual',
            status TEXT DEFAULT 'candidate',
            sort_order INTEGER DEFAULT 0,
            clicks INTEGER DEFAULT 0,
            orders INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    """)
    db.execute("CREATE INDEX IF NOT EXISTS idx_mii_item_status ON menu_item_images(item_id, status)")

    db.commit()
    logger.info("Menu/floor/loyalty/orders tables initialized")

    # Run beverage menu migration if needed
    _seed_beverage_menu(db)


def get_swp_rental_db():
    """Return the shared Turso connection for SWP rental tables."""
    return get_analytics_db()


def init_swp_rental_tables():
    """Create SWP rental subscription tables in Turso."""
    db = get_swp_rental_db()

    db.execute("""
        CREATE TABLE IF NOT EXISTS rental_subscribers_swp (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stripe_customer_id TEXT UNIQUE NOT NULL,
            stripe_subscription_id TEXT UNIQUE,
            email TEXT NOT NULL,
            name TEXT NOT NULL,
            phone TEXT,
            venue_id TEXT NOT NULL DEFAULT 'shallweplay',
            status TEXT NOT NULL DEFAULT 'active',
            credit_used INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)

    db.execute("""
        CREATE TABLE IF NOT EXISTS rental_inventory_swp (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venue_id TEXT NOT NULL DEFAULT 'shallweplay',
            game_title TEXT NOT NULL,
            game_id TEXT,
            image_url TEXT,
            copies_total INTEGER NOT NULL DEFAULT 1,
            copies_available INTEGER NOT NULL DEFAULT 1,
            status TEXT NOT NULL DEFAULT 'available',
            current_renter_id INTEGER,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)

    db.execute("""
        CREATE TABLE IF NOT EXISTS rental_reservations_swp (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subscriber_id INTEGER NOT NULL,
            inventory_id INTEGER NOT NULL,
            venue_id TEXT NOT NULL DEFAULT 'shallweplay',
            reservation_type TEXT NOT NULL DEFAULT 'new',
            pickup_deadline TEXT NOT NULL,
            return_deadline TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            checked_out_at TEXT,
            returned_at TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)

    db.execute("""
        CREATE TABLE IF NOT EXISTS rental_history_swp (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subscriber_id INTEGER NOT NULL,
            inventory_id INTEGER NOT NULL,
            game_title TEXT NOT NULL,
            checked_out_at TEXT,
            returned_at TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)

    db.execute("CREATE INDEX IF NOT EXISTS idx_rental_inv_swp_venue ON rental_inventory_swp(venue_id, status)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_rental_res_swp_sub ON rental_reservations_swp(subscriber_id, status)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_rental_sub_swp_stripe ON rental_subscribers_swp(stripe_customer_id)")

    db.commit()
    logger.info("SWP rental tables initialized")


def seed_swp_rental_inventory():
    """Seed rental_inventory_swp from swp-rental-catalog.json if table is empty."""
    import json as _json
    from pathlib import Path

    db = get_swp_rental_db()

    count = db.execute("SELECT COUNT(*) FROM rental_inventory_swp").fetchone()[0]
    if count > 0:
        logger.info("SWP rental inventory already seeded (%d games), skipping", count)
        return

    catalog_path = Path(__file__).resolve().parents[3] / "content" / "swp-rental-catalog.json"
    if not catalog_path.exists():
        logger.warning("SWP rental catalog not found at %s — skipping seed", catalog_path)
        return

    with open(catalog_path, "r", encoding="utf-8") as f:
        data = _json.load(f)

    games = data.get("games", [])
    inserted = 0
    for game in games:
        title = game.get("title", "").strip()
        if not title:
            continue
        image_url = game.get("image_url", "")
        db.execute(
            """INSERT INTO rental_inventory_swp
               (venue_id, game_title, image_url, copies_total, copies_available, status)
               VALUES (?, ?, ?, 1, 1, 'available')""",
            ("shallweplay", title, image_url),
        )
        inserted += 1

    db.commit()
    logger.info("SWP rental inventory seeded: %d games from catalog", inserted)


def get_next_order_number(venue_id="meetup"):
    """Atomically increment and return the next order number (persisted in Turso)."""
    db = get_menu_db()
    db.execute(
        "INSERT INTO order_counters (venue_id, last_number) VALUES (?, 1) "
        "ON CONFLICT(venue_id) DO UPDATE SET last_number = last_number + 1",
        (venue_id,)
    )
    db.commit()
    row = db.execute(
        "SELECT last_number FROM order_counters WHERE venue_id = ?",
        (venue_id,)
    ).fetchone()
    return row[0]


def seed_menu_from_json():
    """One-time seed: load content/menus/meetup.json into Turso menu tables."""
    import json as _json
    from pathlib import Path

    menu_path = Path(__file__).resolve().parents[3] / "content" / "menus" / "meetup.json"
    if not menu_path.exists():
        logger.warning(f"Menu JSON not found at {menu_path} — skipping seed")
        return

    db = get_menu_db()
    with open(menu_path, "r", encoding="utf-8") as f:
        data = _json.load(f)

    # Seed toggles
    for t in data.get("toggles", []):
        db.execute(
            "INSERT OR REPLACE INTO menu_toggles (id, name, required, options, sort_order) VALUES (?, ?, ?, ?, ?)",
            (t["id"], t["name"], 1 if t.get("required", True) else 0, _json.dumps(t["options"]), 0)
        )

    # Seed categories + items
    import re
    def _slugify(name):
        s = name.lower()
        s = re.sub(r"\([^)]*\)", "", s).strip()
        s = re.sub(r"[&]", "and", s)
        s = re.sub(r"[^a-z0-9]+", "-", s)
        return s.strip("-")

    for idx, section in enumerate(data.get("sections", [])):
        db.execute(
            "INSERT OR IGNORE INTO menu_categories (name, icon, sort_order) VALUES (?, ?, ?)",
            (section["name"], section.get("icon", ""), idx)
        )
        cat_row = db.execute("SELECT id FROM menu_categories WHERE name = ?", (section["name"],)).fetchone()
        cat_id = cat_row[0]

        for item_idx, item in enumerate(section["items"]):
            slug = item.get("image") or _slugify(item["name"])
            db.execute(
                """INSERT OR REPLACE INTO menu_items
                (slug, category_id, name, description, price, image, toggles,
                 allows_modifications, active, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (slug, cat_id, item["name"], item.get("description", ""),
                 item["price"], item.get("image"),
                 _json.dumps(item.get("toggles", [])),
                 1 if item.get("allows_modifications", True) else 0,
                 1 if item.get("active", True) else 0, item_idx)
            )

    db.commit()
    count = db.execute("SELECT COUNT(*) FROM menu_items").fetchone()[0]
    cats = db.execute("SELECT COUNT(*) FROM menu_categories").fetchone()[0]
    toggles = db.execute("SELECT COUNT(*) FROM menu_toggles").fetchone()[0]
    logger.info(f"Menu seeded from JSON: {cats} categories, {count} items, {toggles} toggles")
