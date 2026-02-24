"""Feedback endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.models.feedback import create_feedback, get_feedback

router = APIRouter(prefix="/api", tags=["feedback"])


class FeedbackRequest(BaseModel):
    game_id: str
    question: str
    response: str
    rating: int
    session_id: Optional[int] = None


@router.post("/feedback")
async def submit_feedback(req: FeedbackRequest):
    if req.rating not in (1, -1):
        raise HTTPException(status_code=400, detail="rating must be 1 or -1")
    if not req.game_id or not req.game_id.strip():
        raise HTTPException(status_code=400, detail="game_id is required")
    fb_id = create_feedback(
        game_id=req.game_id,
        question=req.question,
        response=req.response,
        rating=req.rating,
        session_id=req.session_id,
    )
    return {"id": fb_id}


@router.get("/feedback")
async def list_feedback(game_id: Optional[str] = None):
    return get_feedback(game_id=game_id)
