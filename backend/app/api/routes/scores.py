"""Score config endpoint."""

from fastapi import APIRouter

from app.services import game_service

router = APIRouter(prefix="/api", tags=["scores"])


@router.get("/scores/{game_id}")
async def get_score_config(game_id: str):
    game = game_service.get_game(game_id)
    if not game:
        return {"scoring_type": "unavailable", "message": "Score tracker coming soon!"}
    score_config = game.get("score_config") or {}
    if not score_config:
        return {"scoring_type": "unavailable", "message": "Score tracker coming soon!"}
    return score_config
