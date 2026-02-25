"""Feedback endpoints — star ratings, reactions, post-game surveys, and admin aggregates."""

import os
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.core.auth import get_current_venue
from app.models.feedback import (
    create_feedback, get_feedback, get_game_rating,
    create_survey_feedback, get_survey_stats, get_all_survey_feedback,
)

router = APIRouter(prefix="/api", tags=["feedback"])

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")


def _send_telegram_feedback(game_id: str, game_rating: int, venue_id: str,
                            helpful_setup: int, helpful_rules: int,
                            helpful_strategy: int, helpful_scoring: int,
                            would_use_again: bool):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    stars = "\u2b50" * game_rating
    venue_label = (venue_id or "local").replace("-", " ").title()
    use_again = "Yes" if would_use_again else "No"
    text = (
        f"\U0001f4ca New Feedback \u2014 {game_id.replace('-', ' ').title()} at {venue_label}\n"
        f"Rating: {stars} ({game_rating}/5)\n"
        f"Would use again: {use_again}\n"
        f"Setup: {helpful_setup}/5 | Rules: {helpful_rules}/5 | "
        f"Strategy: {helpful_strategy}/5 | Scoring: {helpful_scoring}/5"
    )
    try:
        httpx.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": text},
            timeout=10,
        )
    except Exception:
        pass


class FeedbackRequest(BaseModel):
    game_id: str
    rating: int  # 1-5 stars, or legacy 1/-1 thumbs
    question: Optional[str] = ""
    response: Optional[str] = ""
    reaction: Optional[str] = ""  # loved, fun, okay, meh
    comment: Optional[str] = ""
    session_id: Optional[int] = None


class SurveyFeedbackRequest(BaseModel):
    game_id: str
    lobby_id: Optional[str] = None
    venue_id: Optional[str] = None
    player_name: Optional[str] = None
    game_rating: int
    played_before: Optional[bool] = None
    helpful_setup: Optional[int] = None
    helpful_rules: Optional[int] = None
    helpful_strategy: Optional[int] = None
    helpful_scoring: Optional[int] = None
    would_use_again: Optional[bool] = None
    feedback_text: Optional[str] = None
    submitted_at: Optional[str] = None


@router.post("/feedback")
async def submit_feedback(req: FeedbackRequest):
    """Submit feedback. rating: 1-5 stars (or legacy -1/1 thumbs)."""
    if not req.game_id or not req.game_id.strip():
        raise HTTPException(status_code=400, detail="game_id is required")
    if req.rating not in (-1, 1, 2, 3, 4, 5):
        raise HTTPException(status_code=400, detail="rating must be 1-5 (or legacy -1/1)")
    if req.reaction and req.reaction not in ("loved", "fun", "okay", "meh", ""):
        raise HTTPException(status_code=400, detail="reaction must be: loved, fun, okay, or meh")
    fb_id = create_feedback(
        game_id=req.game_id,
        rating=req.rating,
        question=req.question or "",
        response=req.response or "",
        reaction=req.reaction or "",
        comment=req.comment or "",
        session_id=req.session_id,
    )
    return {"id": fb_id}


@router.post("/feedback/survey")
async def submit_survey_feedback(req: SurveyFeedbackRequest):
    """Submit post-game survey feedback with helpfulness ratings."""
    if not req.game_id or not req.game_id.strip():
        raise HTTPException(status_code=400, detail="game_id is required")
    if req.game_rating < 1 or req.game_rating > 5:
        raise HTTPException(status_code=400, detail="game_rating must be 1-5")

    fb_id = create_survey_feedback(
        game_id=req.game_id,
        game_rating=req.game_rating,
        lobby_id=req.lobby_id,
        venue_id=req.venue_id,
        player_name=req.player_name,
        played_before=req.played_before,
        helpful_setup=req.helpful_setup,
        helpful_rules=req.helpful_rules,
        helpful_strategy=req.helpful_strategy,
        helpful_scoring=req.helpful_scoring,
        would_use_again=req.would_use_again,
        feedback_text=req.feedback_text,
    )

    # Telegram notification (fire-and-forget)
    _send_telegram_feedback(
        game_id=req.game_id,
        game_rating=req.game_rating,
        venue_id=req.venue_id or "",
        helpful_setup=req.helpful_setup or 0,
        helpful_rules=req.helpful_rules or 0,
        helpful_strategy=req.helpful_strategy or 0,
        helpful_scoring=req.helpful_scoring or 0,
        would_use_again=req.would_use_again or False,
    )

    return {"id": fb_id, "success": True}


@router.get("/feedback")
async def list_feedback(game_id: Optional[str] = None):
    return get_feedback(game_id=game_id)


@router.get("/games/{game_id}/rating")
async def game_rating(game_id: str):
    """Aggregate star rating for a game."""
    return get_game_rating(game_id)


@router.get("/admin/feedback")
async def admin_feedback(venue: dict = Depends(get_current_venue)):
    """Return survey stats + all survey entries for admin dashboard."""
    stats = get_survey_stats()
    entries = get_all_survey_feedback()
    return {"stats": stats, "entries": entries}
