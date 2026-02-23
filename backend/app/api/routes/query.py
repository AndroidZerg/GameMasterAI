"""LLM query endpoint — game-specific Q&A."""

from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.services.knowledge import load_game, build_knowledge_text
from app.services.llm import chat_completion

router = APIRouter(prefix="/api")
limiter = Limiter(key_func=get_remote_address)


class QueryRequest(BaseModel):
    game_id: str
    question: str


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
    system_prompt = f"""You are GameMaster AI, a friendly and knowledgeable board game teacher working at a board game cafe. You are currently teaching {title}.

Use ONLY the knowledge base below to answer questions. The knowledge base is organized into Setup, Rules, and Strategy sections with labeled subtopics. If the knowledge base does not contain the answer, say "I'm not sure about that specific rule — you may want to check the rulebook for {title}." NEVER invent or guess at rules.

Be concise. Players are at a table with the game in front of them — they need quick, clear answers, not essays.

KNOWLEDGE BASE:
{knowledge}"""

    # Call LLM
    result = chat_completion(system_prompt, req.question)

    if not result["success"]:
        raise HTTPException(status_code=502, detail=result["content"])

    return {
        "answer": result["content"],
        "game_id": req.game_id,
        "game_title": title,
        "model": result["model"],
    }
