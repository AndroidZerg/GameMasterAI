"""Feedback endpoints — star ratings, reactions, and aggregates."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.models.feedback import create_feedback, get_feedback, get_game_rating

router = APIRouter(prefix="/api", tags=["feedback"])


class FeedbackRequest(BaseModel):
    game_id: str
    rating: int  # 1-5 stars, or legacy 1/-1 thumbs
    question: Optional[str] = ""
    response: Optional[str] = ""
    reaction: Optional[str] = ""  # loved, fun, okay, meh
    comment: Optional[str] = ""
    session_id: Optional[int] = None


@router.post("/feedback")
async def submit_feedback(req: FeedbackRequest):
    """Submit feedback. rating: 1-5 stars (or legacy 1/-1 thumbs)."""
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


@router.get("/feedback")
async def list_feedback(game_id: Optional[str] = None):
    return get_feedback(game_id=game_id)


@router.get("/games/{game_id}/rating")
async def game_rating(game_id: str):
    """Aggregate star rating for a game."""
    return get_game_rating(game_id)
