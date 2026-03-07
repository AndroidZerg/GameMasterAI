"""Game selection endpoints — activate/deactivate games with seat enforcement."""

import os
import sqlite3
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_venue_admin
from app.core.config import DB_PATH

router = APIRouter(prefix="/api/v1/venues", tags=["game-selection"])

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _telegram_notify(text: str):
    """Fire-and-forget Telegram notification."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    try:
        httpx.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": text},
            timeout=10,
        )
    except Exception:
        pass


def _check_venue_access(user: dict, venue_id: str):
    """Ensure user can access this venue."""
    if user.get("role") != "super_admin" and user.get("venue_id") != venue_id:
        raise HTTPException(status_code=403, detail="Not authorized for this venue")


class GameActionRequest(BaseModel):
    game_id: str


@router.get("/{venue_id}/game-selection")
async def get_game_selection(venue_id: str, user: dict = Depends(get_current_venue_admin)):
    """Get venue's active games with seat info for the game selection UI."""
    _check_venue_access(user, venue_id)

    conn = _get_conn()
    try:
        venue = conn.execute(
            "SELECT subscription_tier, game_seat_limit FROM venues WHERE venue_id = ?",
            (venue_id,),
        ).fetchone()
        if not venue:
            raise HTTPException(status_code=404, detail="Venue not found")

        tier = venue["subscription_tier"] or "starter"
        seat_limit = venue["game_seat_limit"] if venue["game_seat_limit"] is not None else 10

        # Get active games with metadata
        rows = conn.execute(
            """SELECT vg.game_id, COALESCE(g.title, vg.game_id) as title,
                      COALESCE(g.complexity, '') as complexity,
                      g.player_count_min, g.player_count_max,
                      vg.activated_at
               FROM venue_games vg
               LEFT JOIN games g ON g.game_id = vg.game_id
               WHERE vg.venue_id = ? AND vg.is_active = 1
               ORDER BY COALESCE(g.title, vg.game_id)""",
            (venue_id,),
        ).fetchall()

        active_games = []
        for r in rows:
            game = {
                "game_id": r["game_id"],
                "title": r["title"],
                "activated_at": r["activated_at"],
                "complexity": r["complexity"],
            }
            if r["player_count_min"] or r["player_count_max"]:
                game["player_count"] = {
                    "min": r["player_count_min"] or 0,
                    "max": r["player_count_max"] or 0,
                }
            active_games.append(game)

        seats_used = len(active_games)
        seats_remaining = -1 if seat_limit == -1 else max(0, seat_limit - seats_used)

        return {
            "tier": tier,
            "seat_limit": seat_limit,
            "seats_used": seats_used,
            "seats_remaining": seats_remaining,
            "active_games": active_games,
        }
    finally:
        conn.close()


@router.post("/{venue_id}/games/activate")
async def activate_game(venue_id: str, req: GameActionRequest,
                        user: dict = Depends(get_current_venue_admin)):
    """Activate a game for a venue, enforcing seat limits."""
    _check_venue_access(user, venue_id)

    conn = _get_conn()
    try:
        venue = conn.execute(
            "SELECT venue_id, venue_name, game_seat_limit, lgs_id FROM venues WHERE venue_id = ?",
            (venue_id,),
        ).fetchone()
        if not venue:
            raise HTTPException(status_code=404, detail="Venue not found")

        seat_limit = venue["game_seat_limit"] if venue["game_seat_limit"] is not None else 10

        # Count currently active games
        active_count = conn.execute(
            "SELECT COUNT(*) as cnt FROM venue_games WHERE venue_id = ? AND is_active = 1",
            (venue_id,),
        ).fetchone()["cnt"]

        # Seat limit check
        if seat_limit != -1 and active_count >= seat_limit:
            raise HTTPException(status_code=409, detail={
                "error": "Seat limit reached. Deactivate a game or upgrade your tier.",
                "seats_used": active_count,
                "seat_limit": seat_limit,
            })

        # Get game title for notification
        game_row = conn.execute(
            "SELECT title FROM games WHERE game_id = ?", (req.game_id,)
        ).fetchone()
        game_title = game_row["title"] if game_row else req.game_id

        now = datetime.now(timezone.utc).isoformat()

        # Upsert: if row exists, update; if not, insert
        existing = conn.execute(
            "SELECT id FROM venue_games WHERE venue_id = ? AND game_id = ?",
            (venue_id, req.game_id),
        ).fetchone()

        if existing:
            conn.execute(
                """UPDATE venue_games
                   SET is_active = 1, activated_at = ?, deactivated_at = NULL
                   WHERE venue_id = ? AND game_id = ?""",
                (now, venue_id, req.game_id),
            )
        else:
            conn.execute(
                """INSERT INTO venue_games (venue_id, game_id, is_active, activated_at, added_at)
                   VALUES (?, ?, 1, ?, ?)""",
                (venue_id, req.game_id, now, now),
            )
        conn.commit()

        new_seats_used = active_count + 1
        seats_remaining = -1 if seat_limit == -1 else max(0, seat_limit - new_seats_used)

        # Telegram notify paired LGS
        if venue["lgs_id"]:
            lgs = conn.execute(
                "SELECT telegram_chat_id FROM lgs_partners WHERE id = ?",
                (venue["lgs_id"],),
            ).fetchone()
            if lgs and lgs["telegram_chat_id"]:
                _telegram_notify(
                    f"{venue['venue_name']} activated {game_title} — ensure it's stocked."
                )

        return {
            "game_id": req.game_id,
            "title": game_title,
            "seats_used": new_seats_used,
            "seats_remaining": seats_remaining,
            "seat_limit": seat_limit,
        }
    finally:
        conn.close()


@router.post("/{venue_id}/games/deactivate")
async def deactivate_game(venue_id: str, req: GameActionRequest,
                          user: dict = Depends(get_current_venue_admin)):
    """Deactivate a game for a venue."""
    _check_venue_access(user, venue_id)

    conn = _get_conn()
    try:
        venue = conn.execute(
            "SELECT game_seat_limit FROM venues WHERE venue_id = ?",
            (venue_id,),
        ).fetchone()
        if not venue:
            raise HTTPException(status_code=404, detail="Venue not found")

        seat_limit = venue["game_seat_limit"] if venue["game_seat_limit"] is not None else 10
        now = datetime.now(timezone.utc).isoformat()

        conn.execute(
            """UPDATE venue_games
               SET is_active = 0, deactivated_at = ?
               WHERE venue_id = ? AND game_id = ?""",
            (now, venue_id, req.game_id),
        )
        conn.commit()

        # Get updated count
        seats_used = conn.execute(
            "SELECT COUNT(*) as cnt FROM venue_games WHERE venue_id = ? AND is_active = 1",
            (venue_id,),
        ).fetchone()["cnt"]

        seats_remaining = -1 if seat_limit == -1 else max(0, seat_limit - seats_used)

        return {
            "game_id": req.game_id,
            "seats_used": seats_used,
            "seats_remaining": seats_remaining,
            "seat_limit": seat_limit,
        }
    finally:
        conn.close()
