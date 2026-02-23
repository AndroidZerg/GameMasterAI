"""LLM query endpoint — game-specific Q&A via the OpenClaw gateway."""

from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from app.services.knowledge import load_game, build_knowledge_text
from app.services.llm import chat_completion

router = APIRouter(prefix="/api")

MODE_INSTRUCTIONS = {
    "setup": "Walk the group through setting up this game step by step.",
    "rules": "Answer rules questions accurately and concisely.",
    "strategy": "Provide strategic advice for players learning this game.",
    "qa": "Answer the question as briefly and clearly as possible — the game is in progress.",
}


class QueryRequest(BaseModel):
    game_id: str
    question: str
    mode: str = "rules"


@router.post("/query")
async def query_game(req: QueryRequest):
    # Load the game
    game = load_game(req.game_id)
    if not game:
        raise HTTPException(status_code=404, detail=f"Game '{req.game_id}' not found")

    # Build knowledge text
    knowledge = build_knowledge_text(game)
    title = game.get("title", req.game_id)

    # Get mode instruction
    mode_instruction = MODE_INSTRUCTIONS.get(req.mode, MODE_INSTRUCTIONS["rules"])

    # Construct system prompt
    system_prompt = f"""You are GameMaster AI, a friendly and knowledgeable board game teacher working at a board game cafe. You are currently teaching {title}.

Use ONLY the knowledge base below to answer questions. If the knowledge base does not contain the answer, say "I'm not sure about that specific rule — you may want to check the rulebook for {title}." NEVER invent or guess at rules.

Be concise. Players are at a table with the game in front of them — they need quick, clear answers, not essays.

MODE: {req.mode}
{mode_instruction}

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
        "mode": req.mode,
        "model": result["model"],
    }
