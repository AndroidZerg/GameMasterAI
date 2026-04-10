"""Score history model — Supabase (score_history table).

Wave 3 (2026-04-10): migrated off /tmp/games.db to Supabase Postgres so
score histories and leaderboards persist across Render deploys.

Game titles used to be resolved via LEFT JOIN to a local games mirror;
now we look them up through the in-memory game_service cache.
"""

from typing import Optional

from app.services.supabase_client import get_admin_client


def init_score_history_table():
    """No-op — score_history table lives in Supabase."""
    return None


def _resolve_game_title(game_id: str) -> str:
    """Look up a game title from the game_service cache; fall back to the id."""
    try:
        from app.services import game_service
        game = game_service.get_game(game_id)
        if game:
            return game.get("title") or game_id
    except Exception:
        pass
    return game_id


def save_score(game_id: str, players: list[dict], scoring_type: str = "calculator",
               winner_name: str = None, duration_seconds: int = None,
               venue_id: str = None, table_number: str = None) -> int:
    admin = get_admin_client()
    result = admin.table("score_history").insert({
        "game_id": game_id,
        "venue_id": venue_id,
        "table_number": table_number,
        "players": players or [],  # jsonb
        "scoring_type": scoring_type,
        "winner_name": winner_name,
        "duration_seconds": duration_seconds,
    }).execute()
    return result.data[0]["id"] if result.data else 0


def get_score_history(game_id: str, venue_id: str = None, limit: int = 20) -> list[dict]:
    admin = get_admin_client()
    query = admin.table("score_history").select("*").eq("game_id", game_id)
    if venue_id:
        query = query.eq("venue_id", venue_id)
    result = query.order("created_at", desc=True).limit(limit).execute()
    rows = result.data or []

    game_title = _resolve_game_title(game_id)
    return [
        {
            "id": r.get("id"),
            "game_id": r.get("game_id"),
            "game_title": game_title,
            "players": r.get("players") or [],  # already a list from jsonb
            "scoring_type": r.get("scoring_type"),
            "winner_name": r.get("winner_name"),
            "duration_seconds": r.get("duration_seconds"),
            "created_at": r.get("created_at"),
        }
        for r in rows
    ]


def get_leaderboard(game_id: str, venue_id: str = None, limit: int = 10) -> list[dict]:
    """Get top scores for a game. Extracts max score per entry from players JSON."""
    admin = get_admin_client()
    query = admin.table("score_history").select("*").eq("game_id", game_id)
    if venue_id:
        query = query.eq("venue_id", venue_id)
    result = query.order("created_at", desc=True).execute()
    rows = result.data or []

    entries = []
    for r in rows:
        players = r.get("players") or []
        for p in players:
            if not isinstance(p, dict):
                continue
            entries.append({
                "player_name": p.get("name", "Unknown"),
                "score": p.get("score", 0),
                "game_id": r.get("game_id"),
                "date": r.get("created_at"),
                "winner": p.get("name") == r.get("winner_name"),
            })

    entries.sort(key=lambda x: x["score"], reverse=True)
    return entries[:limit]
