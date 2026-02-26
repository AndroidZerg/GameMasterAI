"""Venue analytics service — queries for the venue owner dashboard."""

import sqlite3
from datetime import datetime, timezone, timedelta

from app.core.config import DB_PATH


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_home_stats(venue_id: str) -> dict:
    """Aggregate live stats for the Home tab."""
    conn = _get_conn()
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    thirty_min_ago = (now - timedelta(minutes=30)).isoformat()
    week_ago = (now - timedelta(days=7)).strftime("%Y-%m-%d")

    # Active sessions (analytics events in last 30 min for this venue)
    active = conn.execute(
        "SELECT COUNT(DISTINCT ip_address) FROM analytics WHERE venue_id = ? AND timestamp >= ?",
        (venue_id, thirty_min_ago),
    ).fetchone()[0] or 0

    # Games being played now (game_view events in last 30 min)
    games_now_rows = conn.execute(
        """SELECT DISTINCT json_extract(event_data, '$.game_id') as gid
           FROM analytics
           WHERE venue_id = ? AND timestamp >= ? AND event_type = 'game_view'
             AND json_extract(event_data, '$.game_id') IS NOT NULL""",
        (venue_id, thirty_min_ago),
    ).fetchall()
    games_playing_now = [r["gid"] for r in games_now_rows if r["gid"]]

    # Questions today (from analytics events)
    questions_today = conn.execute(
        "SELECT COUNT(*) FROM analytics WHERE venue_id = ? AND event_type = 'question' AND timestamp >= ?",
        (venue_id, today),
    ).fetchone()[0] or 0

    # Also check venue_analytics_daily for questions
    daily_q = conn.execute(
        "SELECT questions_count FROM venue_analytics_daily WHERE venue_id = ? AND date = ?",
        (venue_id, today),
    ).fetchone()
    if daily_q:
        questions_today = max(questions_today, daily_q["questions_count"])

    # Top game this week
    top_game_row = conn.execute(
        """SELECT game_id FROM venue_game_stats
           WHERE venue_id = ? AND last_played_at >= ?
           ORDER BY sessions_count DESC LIMIT 1""",
        (venue_id, week_ago),
    ).fetchone()
    top_game = top_game_row["game_id"] if top_game_row else None

    # If no game stats, try analytics
    if not top_game:
        top_row = conn.execute(
            """SELECT json_extract(event_data, '$.game_id') as gid, COUNT(*) as cnt
               FROM analytics
               WHERE venue_id = ? AND event_type = 'game_view' AND timestamp >= ?
                 AND json_extract(event_data, '$.game_id') IS NOT NULL
               GROUP BY gid ORDER BY cnt DESC LIMIT 1""",
            (venue_id, week_ago),
        ).fetchone()
        top_game = top_row["gid"] if top_row else None

    # Orders today
    orders_today = conn.execute(
        "SELECT orders_count FROM venue_analytics_daily WHERE venue_id = ? AND date = ?",
        (venue_id, today),
    ).fetchone()
    orders_today = orders_today["orders_count"] if orders_today else 0

    conn.close()
    return {
        "active_sessions": active,
        "games_playing_now": games_playing_now,
        "questions_today": questions_today,
        "top_game_this_week": top_game,
        "orders_today": orders_today,
    }


def get_analytics(venue_id: str, days: int = 30) -> dict:
    """Full analytics payload for the Analytics tab."""
    conn = _get_conn()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")

    # Daily data
    daily_rows = conn.execute(
        """SELECT date, sessions_count, questions_count, games_played_count
           FROM venue_analytics_daily
           WHERE venue_id = ? AND date >= ?
           ORDER BY date""",
        (venue_id, cutoff),
    ).fetchall()
    daily = [
        {
            "date": r["date"],
            "sessions": r["sessions_count"],
            "questions": r["questions_count"],
            "games_played": r["games_played_count"],
        }
        for r in daily_rows
    ]

    # Top games
    top_games_rows = conn.execute(
        """SELECT vgs.game_id, COALESCE(g.title, vgs.game_id) as title, vgs.sessions_count
           FROM venue_game_stats vgs
           LEFT JOIN games g ON g.game_id = vgs.game_id
           WHERE vgs.venue_id = ?
           ORDER BY vgs.sessions_count DESC LIMIT 10""",
        (venue_id,),
    ).fetchall()
    top_games = [
        {"game_id": r["game_id"], "title": r["title"], "sessions_count": r["sessions_count"]}
        for r in top_games_rows
    ]

    # Top questions
    tq_rows = conn.execute(
        """SELECT game_id, question_text, ask_count
           FROM venue_top_questions
           WHERE venue_id = ?
           ORDER BY game_id, ask_count DESC""",
        (venue_id,),
    ).fetchall()
    # Group top 5 per game
    from collections import defaultdict
    tq_by_game = defaultdict(list)
    for r in tq_rows:
        if len(tq_by_game[r["game_id"]]) < 5:
            tq_by_game[r["game_id"]].append(
                {"game_id": r["game_id"], "question_text": r["question_text"], "ask_count": r["ask_count"]}
            )
    top_questions = []
    for questions in tq_by_game.values():
        top_questions.extend(questions)

    # Hourly heatmap
    heatmap_rows = conn.execute(
        "SELECT day_of_week, hour, sessions_count FROM venue_analytics_hourly WHERE venue_id = ?",
        (venue_id,),
    ).fetchall()
    hourly_heatmap = [
        {"day_of_week": r["day_of_week"], "hour": r["hour"], "sessions_count": r["sessions_count"]}
        for r in heatmap_rows
    ]

    # Avg session seconds
    avg_row = conn.execute(
        """SELECT AVG(avg_session_seconds) as avg_sec
           FROM venue_analytics_daily
           WHERE venue_id = ? AND date >= ? AND avg_session_seconds > 0""",
        (venue_id, cutoff),
    ).fetchone()
    avg_session_seconds = int(avg_row["avg_sec"]) if avg_row and avg_row["avg_sec"] else 0

    # Player count distribution (placeholder — would need event data)
    player_dist = {"2": 0, "3": 0, "4": 0, "5+": 0}

    conn.close()
    return {
        "daily": daily,
        "top_games": top_games,
        "top_questions": top_questions,
        "hourly_heatmap": hourly_heatmap,
        "avg_session_seconds": avg_session_seconds,
        "player_count_distribution": player_dist,
    }


def get_library(venue_id: str) -> list[dict]:
    """Get this venue's game library from venue_games, enriched with game metadata."""
    conn = _get_conn()
    rows = conn.execute(
        """SELECT vg.game_id, COALESCE(g.title, vg.game_id) as title,
                  COALESCE(g.complexity, '') as complexity,
                  vg.is_active, vg.is_featured, vg.is_priority
           FROM venue_games vg
           LEFT JOIN games g ON g.game_id = vg.game_id
           WHERE vg.venue_id = ?
           ORDER BY COALESCE(g.title, vg.game_id)""",
        (venue_id,),
    ).fetchall()
    conn.close()
    return [
        {
            "game_id": r["game_id"],
            "title": r["title"],
            "complexity": r["complexity"],
            "image_url": f"/api/games/{r['game_id']}/image",
            "is_active": bool(r["is_active"]),
            "is_featured": bool(r["is_featured"]),
            "is_priority": bool(r["is_priority"]),
        }
        for r in rows
    ]


def update_game_flags(venue_id: str, game_id: str, updates: dict) -> bool:
    """Update is_active / is_featured / is_priority for a game in venue library."""
    conn = _get_conn()
    allowed = {"is_active", "is_featured", "is_priority"}
    sets = []
    params = []
    for k, v in updates.items():
        if k in allowed and v is not None:
            sets.append(f"{k} = ?")
            params.append(1 if v else 0)
    if not sets:
        conn.close()
        return False
    params.extend([venue_id, game_id])
    conn.execute(
        f"UPDATE venue_games SET {', '.join(sets)} WHERE venue_id = ? AND game_id = ?",
        params,
    )
    conn.commit()
    conn.close()
    return True


def get_menu(venue_id: str) -> list[dict]:
    """Get full menu (categories + items) for this venue."""
    conn = _get_conn()
    cats = conn.execute(
        """SELECT id, name, sort_order FROM venue_menu_categories
           WHERE venue_id = ? AND is_active = 1 ORDER BY sort_order, name""",
        (venue_id,),
    ).fetchall()

    result = []
    for cat in cats:
        items = conn.execute(
            """SELECT id, name, description, price_cents, is_available, is_eighty_sixed, sort_order
               FROM venue_menu_items
               WHERE category_id = ? AND venue_id = ?
               ORDER BY sort_order, name""",
            (cat["id"], venue_id),
        ).fetchall()
        result.append({
            "id": cat["id"],
            "name": cat["name"],
            "sort_order": cat["sort_order"],
            "items": [
                {
                    "id": it["id"],
                    "name": it["name"],
                    "description": it["description"] or "",
                    "price_cents": it["price_cents"],
                    "is_available": bool(it["is_available"]),
                    "is_eighty_sixed": bool(it["is_eighty_sixed"]),
                }
                for it in items
            ],
        })

    conn.close()
    return result


def update_menu_item(venue_id: str, item_id: int, updates: dict) -> bool:
    """Update a menu item (86, availability, price, etc). Returns True if found."""
    conn = _get_conn()
    # Verify item belongs to venue
    row = conn.execute(
        "SELECT id FROM venue_menu_items WHERE id = ? AND venue_id = ?",
        (item_id, venue_id),
    ).fetchone()
    if not row:
        conn.close()
        return False

    allowed = {"is_eighty_sixed", "is_available", "price_cents", "name", "description"}
    sets = ["updated_at = datetime('now')"]
    params = []
    for k, v in updates.items():
        if k in allowed and v is not None:
            sets.append(f"{k} = ?")
            if k in ("is_eighty_sixed", "is_available"):
                params.append(1 if v else 0)
            else:
                params.append(v)
    params.extend([item_id, venue_id])
    conn.execute(
        f"UPDATE venue_menu_items SET {', '.join(sets)} WHERE id = ? AND venue_id = ?",
        params,
    )
    conn.commit()
    conn.close()
    return True


def delete_menu_item(venue_id: str, item_id: int) -> bool:
    """Soft-delete a menu item (set is_available=0)."""
    conn = _get_conn()
    row = conn.execute(
        "SELECT id FROM venue_menu_items WHERE id = ? AND venue_id = ?",
        (item_id, venue_id),
    ).fetchone()
    if not row:
        conn.close()
        return False
    conn.execute(
        "UPDATE venue_menu_items SET is_available = 0 WHERE id = ? AND venue_id = ?",
        (item_id, venue_id),
    )
    conn.commit()
    conn.close()
    return True


def create_category(venue_id: str, name: str, sort_order: int = 0) -> int:
    """Create a new menu category. Returns the new category ID."""
    conn = _get_conn()
    cur = conn.execute(
        """INSERT INTO venue_menu_categories (venue_id, name, sort_order)
           VALUES (?, ?, ?)""",
        (venue_id, name, sort_order),
    )
    cat_id = cur.lastrowid
    conn.commit()
    conn.close()
    return cat_id


def create_menu_item(venue_id: str, category_id: int, name: str,
                     description: str, price_cents: int, is_available: bool = True) -> int:
    """Create a new menu item. Returns the new item ID."""
    conn = _get_conn()
    # Verify category belongs to venue
    cat = conn.execute(
        "SELECT id FROM venue_menu_categories WHERE id = ? AND venue_id = ?",
        (category_id, venue_id),
    ).fetchone()
    if not cat:
        conn.close()
        raise ValueError("Category not found for this venue")
    cur = conn.execute(
        """INSERT INTO venue_menu_items (venue_id, category_id, name, description, price_cents, is_available)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (venue_id, category_id, name, description, price_cents, 1 if is_available else 0),
    )
    item_id = cur.lastrowid
    conn.commit()
    conn.close()
    return item_id
