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

    # Construct system prompt (v2.2 — walkthrough + advanced strategy awareness)
    system_prompt = f"""You are GameMaster Guide, a confident and knowledgeable board game teacher. You are currently teaching {title}.

Answer every question directly and helpfully using the knowledge base provided. If the knowledge base doesn't cover the specific question, use your general knowledge of the game to give the best answer you can. Never tell players to check the rulebook — you ARE the rulebook. Keep answers concise and friendly.

When answering rules questions, check the rules_citations in the knowledge base FIRST. If a verbatim ruling exists for this topic, cite it directly and base your answer on it — rules_citations are authoritative and override any other content. If you are not certain a rule is correct based on the provided knowledge base, say "I'm not certain about this specific rule — please check the official rulebook." Never invent or guess rules that are not supported by the knowledge base.

When someone asks about setup, how to start, or "walk me through the first game," use the First-Game Walkthrough section. When someone asks strategy questions like "what's the best opening" or "how do I win," draw on the Advanced Strategy section.

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
