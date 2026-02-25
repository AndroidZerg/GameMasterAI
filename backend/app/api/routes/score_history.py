"""Score history endpoints — save and retrieve score tracker results."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.auth import get_current_venue, get_optional_venue
from app.models.score_history import save_score, get_score_history, get_leaderboard

router = APIRouter(prefix="/api", tags=["scores"])


class ScoreSubmitRequest(BaseModel):
    game_id: str
    players: list[dict]
    scoring_type: Optional[str] = "calculator"
    winner_name: Optional[str] = None
    duration_seconds: Optional[int] = None
    venue_id: Optional[str] = None
    table_number: Optional[str] = None


@router.post("/scores/history")
async def submit_score(
    req: ScoreSubmitRequest,
    venue: Optional[dict] = Depends(get_optional_venue),
):
    """Save a completed score session. Public — called from customer tablets."""
    if not req.game_id or not req.game_id.strip():
        raise HTTPException(status_code=400, detail="game_id is required")
    if not req.players:
        raise HTTPException(status_code=400, detail="players list is required")

    vid = req.venue_id or (venue["venue_id"] if venue else None)
    sid = save_score(
        game_id=req.game_id,
        players=req.players,
        scoring_type=req.scoring_type,
        winner_name=req.winner_name,
        duration_seconds=req.duration_seconds,
        venue_id=vid,
        table_number=req.table_number,
    )
    return {"id": sid, "status": "ok"}


@router.get("/scores/history")
async def list_score_history(
    game_id: str = Query(..., description="Game ID"),
    venue: Optional[dict] = Depends(get_optional_venue),
):
    """Get score history for a game. If authenticated, filters to venue."""
    vid = venue["venue_id"] if venue else None
    return get_score_history(game_id=game_id, venue_id=vid)


@router.get("/leaderboard/{game_id}")
async def get_public_leaderboard(game_id: str):
    """Public leaderboard for a game. Returns entries (may be empty)."""
    try:
        entries = get_leaderboard(game_id=game_id, venue_id=None)
        return {"entries": entries if isinstance(entries, list) else []}
    except Exception:
        return {"entries": []}


@router.get("/admin/scores/leaderboard")
async def get_game_leaderboard(
    game_id: str = Query(..., description="Game ID"),
    venue: dict = Depends(get_current_venue),
):
    """Top scores for a game at this venue. Requires auth."""
    return get_leaderboard(game_id=game_id, venue_id=venue["venue_id"])
