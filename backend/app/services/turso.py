"""Turso (libsql) connection manager for analytics."""
import os
import logging

logger = logging.getLogger(__name__)

_connection = None


def get_analytics_db():
    global _connection
    if _connection is not None:
        return _connection

    url = os.getenv("TURSO_DATABASE_URL", "")
    token = os.getenv("TURSO_AUTH_TOKEN", "")

    if url and token:
        import libsql_experimental as libsql
        _connection = libsql.connect(url, auth_token=token)
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

    db.commit()
    logger.info("Analytics tables initialized")
