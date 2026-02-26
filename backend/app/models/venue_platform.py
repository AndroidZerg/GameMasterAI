"""Venue Platform — DB migrations for onboarding, menus, analytics, game stats."""

import sqlite3

from app.core.config import DB_PATH


def run_migrations():
    """Run all venue platform migrations. Idempotent — safe to call on every startup."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # --- ALTER venues table: add new columns ---
    _add_column(cur, "venues", "address", "TEXT DEFAULT ''")
    _add_column(cur, "venues", "city", "TEXT DEFAULT ''")
    _add_column(cur, "venues", "state", "TEXT DEFAULT ''")
    _add_column(cur, "venues", "zip_code", "TEXT DEFAULT ''")
    _add_column(cur, "venues", "hours_json", "TEXT DEFAULT '{}'")
    _add_column(cur, "venues", "contact_name", "TEXT DEFAULT ''")
    _add_column(cur, "venues", "phone", "TEXT DEFAULT ''")
    _add_column(cur, "venues", "logo_filename", "TEXT DEFAULT ''")
    _add_column(cur, "venues", "onboarding_step", "INTEGER DEFAULT 0")
    _add_column(cur, "venues", "onboarding_completed_at", "TEXT DEFAULT NULL")

    # --- NEW TABLE: venue_logos ---
    cur.execute("""
        CREATE TABLE IF NOT EXISTS venue_logos (
            venue_id TEXT PRIMARY KEY,
            logo_data BLOB NOT NULL,
            content_type TEXT NOT NULL,
            uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (venue_id) REFERENCES venues(venue_id)
        )
    """)

    # --- NEW TABLE: venue_games ---
    cur.execute("""
        CREATE TABLE IF NOT EXISTS venue_games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venue_id TEXT NOT NULL,
            game_id TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            is_featured INTEGER NOT NULL DEFAULT 0,
            is_priority INTEGER NOT NULL DEFAULT 0,
            added_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (venue_id) REFERENCES venues(venue_id),
            UNIQUE(venue_id, game_id)
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_venue_games_venue ON venue_games(venue_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_venue_games_active ON venue_games(venue_id, is_active)")

    # --- NEW TABLE: venue_menu_categories ---
    cur.execute("""
        CREATE TABLE IF NOT EXISTS venue_menu_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venue_id TEXT NOT NULL,
            name TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (venue_id) REFERENCES venues(venue_id)
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_menu_cats_venue ON venue_menu_categories(venue_id)")

    # --- NEW TABLE: venue_menu_items ---
    cur.execute("""
        CREATE TABLE IF NOT EXISTS venue_menu_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venue_id TEXT NOT NULL,
            category_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            price_cents INTEGER NOT NULL,
            is_available INTEGER NOT NULL DEFAULT 1,
            is_eighty_sixed INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (venue_id) REFERENCES venues(venue_id),
            FOREIGN KEY (category_id) REFERENCES venue_menu_categories(id)
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_menu_items_venue ON venue_menu_items(venue_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_menu_items_cat ON venue_menu_items(category_id)")

    # --- NEW TABLE: venue_analytics_daily ---
    cur.execute("""
        CREATE TABLE IF NOT EXISTS venue_analytics_daily (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venue_id TEXT NOT NULL,
            date TEXT NOT NULL,
            sessions_count INTEGER NOT NULL DEFAULT 0,
            questions_count INTEGER NOT NULL DEFAULT 0,
            games_played_count INTEGER NOT NULL DEFAULT 0,
            avg_session_seconds INTEGER NOT NULL DEFAULT 0,
            menu_views_count INTEGER NOT NULL DEFAULT 0,
            orders_count INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (venue_id) REFERENCES venues(venue_id),
            UNIQUE(venue_id, date)
        )
    """)
    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_analytics_daily_venue_date
        ON venue_analytics_daily(venue_id, date)
    """)

    # --- NEW TABLE: venue_analytics_hourly ---
    cur.execute("""
        CREATE TABLE IF NOT EXISTS venue_analytics_hourly (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venue_id TEXT NOT NULL,
            day_of_week INTEGER NOT NULL,
            hour INTEGER NOT NULL,
            sessions_count INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (venue_id) REFERENCES venues(venue_id),
            UNIQUE(venue_id, day_of_week, hour)
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_analytics_hourly_venue ON venue_analytics_hourly(venue_id)")

    # --- NEW TABLE: venue_game_stats ---
    cur.execute("""
        CREATE TABLE IF NOT EXISTS venue_game_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venue_id TEXT NOT NULL,
            game_id TEXT NOT NULL,
            sessions_count INTEGER NOT NULL DEFAULT 0,
            questions_count INTEGER NOT NULL DEFAULT 0,
            last_played_at TEXT DEFAULT NULL,
            FOREIGN KEY (venue_id) REFERENCES venues(venue_id),
            UNIQUE(venue_id, game_id)
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_game_stats_venue ON venue_game_stats(venue_id)")

    # --- NEW TABLE: venue_top_questions ---
    cur.execute("""
        CREATE TABLE IF NOT EXISTS venue_top_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venue_id TEXT NOT NULL,
            game_id TEXT NOT NULL,
            question_text TEXT NOT NULL,
            ask_count INTEGER NOT NULL DEFAULT 1,
            last_asked_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(venue_id, game_id, question_text)
        )
    """)
    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_top_questions_venue
        ON venue_top_questions(venue_id, game_id)
    """)

    conn.commit()
    conn.close()
    print("[GMAI] Venue platform migrations complete")


def _add_column(cur, table: str, column: str, col_type: str):
    """Add a column to a table if it doesn't already exist."""
    cur.execute(f"PRAGMA table_info({table})")
    existing = [row[1] for row in cur.fetchall()]
    if column not in existing:
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
