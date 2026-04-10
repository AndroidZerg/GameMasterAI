"""Game feedback model — Supabase (game_feedback table).

Supports star ratings, reactions, and post-game surveys.

Wave 3 (2026-04-10): migrated off /tmp/games.db to Supabase Postgres so
feedback and survey data persist across Render deploys.
"""

from typing import Optional

from app.services.supabase_client import get_admin_client


def init_feedback_table():
    """No-op — game_feedback table lives in Supabase."""
    return None


def create_feedback(game_id: str, rating: int, question: str = "",
                    response: str = "", reaction: str = "",
                    comment: str = "", session_id: Optional[int] = None) -> int:
    admin = get_admin_client()
    result = admin.table("game_feedback").insert({
        "session_id": session_id,
        "game_id": game_id,
        "question": question or "",
        "response": response or "",
        "rating": rating,
        "reaction": reaction or "",
        "comment": comment or "",
    }).execute()
    return result.data[0]["id"] if result.data else 0


def create_survey_feedback(
    game_id: str,
    game_rating: int,
    lobby_id: Optional[str] = None,
    venue_id: Optional[str] = None,
    player_name: Optional[str] = None,
    played_before: Optional[bool] = None,
    helpful_setup: Optional[int] = None,
    helpful_rules: Optional[int] = None,
    helpful_strategy: Optional[int] = None,
    helpful_scoring: Optional[int] = None,
    would_use_again: Optional[bool] = None,
    feedback_text: Optional[str] = None,
) -> int:
    admin = get_admin_client()

    def _bool_to_int(v):
        if v is None:
            return None
        return 1 if v else 0

    payload = {
        "game_id": game_id,
        "rating": game_rating,
        "lobby_id": lobby_id,
        "venue_id": venue_id,
        "player_name": player_name,
        "played_before": _bool_to_int(played_before),
        "helpful_setup": helpful_setup,
        "helpful_rules": helpful_rules,
        "helpful_strategy": helpful_strategy,
        "helpful_scoring": helpful_scoring,
        "would_use_again": _bool_to_int(would_use_again),
        "feedback_text": feedback_text or "",
    }
    result = admin.table("game_feedback").insert(payload).execute()
    return result.data[0]["id"] if result.data else 0


def get_survey_stats() -> dict:
    """Aggregate stats for admin feedback dashboard."""
    admin = get_admin_client()
    result = (
        admin.table("game_feedback")
        .select("rating,helpful_setup,helpful_rules,helpful_strategy,helpful_scoring,would_use_again")
        .not_.is_("rating", "null")
        .not_.is_("helpful_setup", "null")
        .execute()
    )
    rows = result.data or []

    if not rows:
        return {
            "total": 0, "avg_game_rating": 0,
            "avg_setup": 0, "avg_rules": 0, "avg_strategy": 0, "avg_scoring": 0,
            "would_use_again_pct": 0,
        }

    total = len(rows)
    def avg(vals):
        filtered = [v for v in vals if v]
        return round(sum(filtered) / max(len(filtered), 1), 1) if filtered else 0

    ratings = [r.get("rating") for r in rows if r.get("rating")]
    setups = [r.get("helpful_setup") for r in rows if r.get("helpful_setup")]
    rules = [r.get("helpful_rules") for r in rows if r.get("helpful_rules")]
    strats = [r.get("helpful_strategy") for r in rows if r.get("helpful_strategy")]
    scores = [r.get("helpful_scoring") for r in rows if r.get("helpful_scoring")]
    use_again = [r.get("would_use_again") for r in rows if r.get("would_use_again") is not None]

    return {
        "total": total,
        "avg_game_rating": avg(ratings),
        "avg_setup": avg(setups),
        "avg_rules": avg(rules),
        "avg_strategy": avg(strats),
        "avg_scoring": avg(scores),
        "would_use_again_pct": round(sum(1 for v in use_again if v) / max(len(use_again), 1) * 100),
    }


def get_all_survey_feedback() -> list[dict]:
    """Return all survey feedback entries for admin view."""
    admin = get_admin_client()
    result = (
        admin.table("game_feedback")
        .select("id,game_id,rating,lobby_id,venue_id,player_name,played_before,"
                "helpful_setup,helpful_rules,helpful_strategy,helpful_scoring,"
                "would_use_again,feedback_text,created_at")
        .not_.is_("helpful_setup", "null")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


def get_feedback(game_id: Optional[str] = None) -> list[dict]:
    admin = get_admin_client()
    query = admin.table("game_feedback").select("*")
    if game_id:
        query = query.eq("game_id", game_id)
    result = query.order("created_at", desc=True).execute()
    return result.data or []


def get_game_rating(game_id: str) -> dict:
    """Get aggregate rating for a game. Maps old thumbs (1/-1) to star scale."""
    admin = get_admin_client()
    result = (
        admin.table("game_feedback")
        .select("rating")
        .eq("game_id", game_id)
        .not_.is_("rating", "null")
        .execute()
    )
    rows = result.data or []

    if not rows:
        return {"average_rating": 0, "total_ratings": 0, "distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}}

    stars = []
    for r in rows:
        val = r.get("rating")
        if val is None:
            continue
        if val == -1:
            stars.append(1)
        elif val == 1:
            # Legacy thumbs-up — treat as 5 stars
            stars.append(5)
        else:
            stars.append(max(1, min(5, val)))

    if not stars:
        return {"average_rating": 0, "total_ratings": 0, "distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}}

    dist = {i: 0 for i in range(1, 6)}
    for s in stars:
        dist[s] = dist.get(s, 0) + 1
    avg = round(sum(stars) / len(stars), 1)
    return {"average_rating": avg, "total_ratings": len(stars), "distribution": dist}


def get_all_game_ratings() -> dict[str, float]:
    """Get average rating for all games that have ratings."""
    admin = get_admin_client()
    result = (
        admin.table("game_feedback")
        .select("game_id,rating")
        .not_.is_("rating", "null")
        .execute()
    )
    rows = result.data or []

    game_ratings: dict[str, list[int]] = {}
    for r in rows:
        gid = r.get("game_id")
        val = r.get("rating")
        if not gid or val is None:
            continue
        if val == -1:
            star = 1
        elif val == 1:
            star = 5
        else:
            star = max(1, min(5, val))
        game_ratings.setdefault(gid, []).append(star)

    return {
        gid: round(sum(stars) / len(stars), 1)
        for gid, stars in game_ratings.items()
    }
