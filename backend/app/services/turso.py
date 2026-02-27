"""Turso (libsql) connection manager for analytics."""
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
