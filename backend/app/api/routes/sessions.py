"""Session tracking endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.models.sessions import create_session, end_session, increment_questions, set_score_tracked

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class StartSessionRequest(BaseModel):
    game_id: str
    table_number: Optional[str] = None
    venue_id: Optional[str] = None


@router.post("/start")
async def start_session(req: StartSessionRequest):
    """Start a new game session. Accepts optional venue_id and table_number from QR codes."""
    if not req.game_id or not req.game_id.strip():
        raise HTTPException(status_code=400, detail="game_id is required")
    session_id = create_session(req.game_id, req.table_number, req.venue_id)
    return {"session_id": session_id}


@router.post("/{session_id}/end")
async def end_session_endpoint(session_id: int):
    if not end_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "ok"}


@router.post("/{session_id}/question")
async def record_question(session_id: int):
    if not increment_questions(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "ok"}


@router.post("/{session_id}/scored")
async def mark_scored(session_id: int):
    if not set_score_tracked(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "ok"}
