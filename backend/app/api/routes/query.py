"""LLM query endpoint — game-specific Q&A."""

import hashlib
import logging
from typing import Optional

from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.services.knowledge import load_game, build_knowledge_text
from app.services.llm import chat_completion
from app.services.turso import get_analytics_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")
limiter = Limiter(key_func=get_remote_address)


class QueryRequest(BaseModel):
    game_id: str
    question: str
    device_id: Optional[str] = None
    session_id: Optional[int] = None
    venue_id: Optional[str] = None
    table_number: Optional[int] = None


@router.post("/query")
@limiter.limit("10/minute")
async def query_game(request: Request, req: QueryRequest):
    # Load the game
    game = load_game(req.game_id)
    if not game:
        raise HTTPException(status_code=404, detail=f"Game '{req.game_id}' not found")

    # Build knowledge text (v2.0: flattened tabs/subtopics as Markdown)
    knowledge = build_knowledge_text(game)
    title = game.get("title", req.game_id)

    # Construct system prompt (v2.0 — no mode parameter)
    system_prompt = f"""You are GameMaster Guide, a friendly and knowledgeable board game teacher working at a board game cafe. You are currently teaching {title}.

Use ONLY the knowledge base below to answer questions. The knowledge base is organized into Setup, Rules, and Strategy sections with labeled subtopics. If the knowledge base does not contain the answer, say "I'm not sure about that specific rule — you may want to check the rulebook for {title}." NEVER invent or guess at rules.

Be concise. Players are at a table with the game in front of them — they need quick, clear answers, not essays.

KNOWLEDGE BASE:
{knowledge}"""

    # Call LLM
    result = chat_completion(system_prompt, req.question)

    if not result["success"]:
        raise HTTPException(status_code=502, detail=result["content"])

    answer = result["content"]

    # Log to device Q&A history and CRM analytics if device_id provided
    if req.device_id:
        try:
            db = get_analytics_db()
            # Log to device Q&A history
            db.execute(
                "INSERT INTO device_qa_history (device_id, session_id, game_id, question, answer, venue_id, table_number) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (req.device_id, req.session_id, req.game_id, req.question, answer, req.venue_id, req.table_number),
            )
            # Log to CRM analytics (upsert by question hash — scoped per venue)
            q_hash = hashlib.md5(f"{req.venue_id or ''}:{req.game_id}:{req.question.lower().strip()}".encode()).hexdigest()
            db.execute(
                """INSERT INTO crm_qa_analytics (game_id, venue_id, question_text, question_hash, answer_text)
                   VALUES (?, ?, ?, ?, ?)
                   ON CONFLICT(question_hash) DO UPDATE SET
                       times_asked = times_asked + 1,
                       last_asked_at = datetime('now'),
                       answer_text = ?""",
                (req.game_id, req.venue_id, req.question, q_hash, answer, answer),
            )
            db.commit()
        except Exception:
            logger.exception("Failed to log Q&A to device history/CRM")

    return {
        "answer": answer,
        "game_id": req.game_id,
        "game_title": title,
        "model": result["model"],
    }
