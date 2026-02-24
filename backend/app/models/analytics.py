"""SQLite analytics model."""

import json
import sqlite3
from datetime import datetime, timezone

from app.core.config import DB_PATH


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_analytics_table():
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS analytics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            event_data TEXT DEFAULT '{}',
            venue_id TEXT,
            table_number TEXT,
            timestamp TIMESTAMP NOT NULL,
            ip_address TEXT
        )
    """)
    conn.commit()
    conn.close()


def log_event(event_type: str, event_data: dict, venue_id: str = None,
              table_number: str = None, ip_address: str = None) -> int:
    conn = _get_conn()
    cur = conn.execute(
        """INSERT INTO analytics (event_type, event_data, venue_id, table_number, timestamp, ip_address)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (event_type, json.dumps(event_data), venue_id, table_number,
         datetime.now(timezone.utc).isoformat(), ip_address),
    )
    eid = cur.lastrowid
    conn.commit()
    conn.close()
    return eid


def get_analytics_summary(venue_id: str = None) -> dict:
    conn = _get_conn()
    vid_clause = "AND venue_id = ?" if venue_id else ""
    vid_params = [venue_id] if venue_id else []

    # Today's midnight
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    # Today counts
    today_row = conn.execute(f"""
        SELECT
            COALESCE(SUM(CASE WHEN event_type = 'game_view' THEN 1 ELSE 0 END), 0) as views,
            COALESCE(SUM(CASE WHEN event_type = 'search' THEN 1 ELSE 0 END), 0) as searches,
            COALESCE(SUM(CASE WHEN event_type = 'filter' THEN 1 ELSE 0 END), 0) as filters,
            COALESCE(SUM(CASE WHEN event_type = 'score_complete' THEN 1 ELSE 0 END), 0) as scores
        FROM analytics
        WHERE timestamp >= ? {vid_clause}
    """, [today] + vid_params).fetchone()

    # Top viewed games
    top_viewed = conn.execute(f"""
        SELECT json_extract(event_data, '$.game_id') as game_id,
               COALESCE(g.title, json_extract(event_data, '$.game_id')) as title,
               COUNT(*) as views
        FROM analytics a
        LEFT JOIN games g ON json_extract(a.event_data, '$.game_id') = g.game_id
        WHERE a.event_type = 'game_view' {vid_clause.replace('venue_id', 'a.venue_id')}
        GROUP BY json_extract(event_data, '$.game_id')
        ORDER BY views DESC
        LIMIT 10
    """, vid_params).fetchall()

    # Top searched terms
    top_searched = conn.execute(f"""
        SELECT json_extract(event_data, '$.term') as term, COUNT(*) as count
        FROM analytics
        WHERE event_type = 'search' AND json_extract(event_data, '$.term') IS NOT NULL {vid_clause}
        GROUP BY json_extract(event_data, '$.term')
        ORDER BY count DESC
        LIMIT 10
    """, vid_params).fetchall()

    # Popular filters
    popular_filters = conn.execute(f"""
        SELECT json_extract(event_data, '$.filter_type') || ':' || json_extract(event_data, '$.filter_value') as filter,
               COUNT(*) as count
        FROM analytics
        WHERE event_type = 'filter' {vid_clause}
        GROUP BY filter
        ORDER BY count DESC
        LIMIT 10
    """, vid_params).fetchall()

    # Hourly activity
    hourly = conn.execute(f"""
        SELECT CAST(strftime('%H', timestamp) AS INTEGER) as hour, COUNT(*) as event_count
        FROM analytics
        WHERE timestamp >= ? {vid_clause}
        GROUP BY hour
        ORDER BY hour
    """, [today] + vid_params).fetchall()

    conn.close()

    return {
        "today": {
            "views": today_row["views"],
            "searches": today_row["searches"],
            "filters": today_row["filters"],
            "scores": today_row["scores"],
        },
        "top_viewed_games": [{"game_id": r["game_id"], "title": r["title"], "views": r["views"]} for r in top_viewed],
        "top_searched_terms": [{"term": r["term"], "count": r["count"]} for r in top_searched],
        "popular_filters": [{"filter": r["filter"], "count": r["count"]} for r in popular_filters],
        "hourly_activity": [{"hour": r["hour"], "event_count": r["event_count"]} for r in hourly],
    }
