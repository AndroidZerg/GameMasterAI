"""Score config endpoint."""

import json
from pathlib import Path

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["scores"])

_SCORES_DIR = Path(__file__).resolve().parents[4] / "content" / "scores"


@router.get("/scores/{game_id}")
async def get_score_config(game_id: str):
    score_file = _SCORES_DIR / f"{game_id}-score.json"
    if not score_file.exists():
        return {"scoring_type": "unavailable", "message": "Score tracker coming soon!"}
    try:
        return json.loads(score_file.read_text(encoding="utf-8"))
    except Exception:
        return {"scoring_type": "unavailable", "message": "Score tracker coming soon!"}
