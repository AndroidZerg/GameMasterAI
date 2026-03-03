"""Lobby system — in-memory multiplayer game sessions with polling sync."""

import random
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/lobby", tags=["lobby"])

# ── In-memory lobby storage ──────────────────────────────────────
_lobbies: dict[str, dict] = {}

LOBBY_TTL_HOURS = 4


# ── Pydantic models ─────────────────────────────────────────────
class CreateLobby(BaseModel):
    game_id: str
    host_name: str


class JoinLobby(BaseModel):
    code: str
    player_name: str


class UpdateScores(BaseModel):
    player_id: str
    scores: dict


class KickPlayer(BaseModel):
    host_id: str
    kick_player_id: str


class LeaveBody(BaseModel):
    player_id: str


class EndGameBody(BaseModel):
    host_id: str


# ── Helpers ──────────────────────────────────────────────────────
def _cleanup():
    """Remove lobbies older than LOBBY_TTL_HOURS."""
    now = datetime.now(timezone.utc)
    expired = [
        lid for lid, lobby in _lobbies.items()
        if (now - datetime.fromisoformat(lobby["created_at"])).total_seconds()
        > LOBBY_TTL_HOURS * 3600
    ]
    for lid in expired:
        del _lobbies[lid]


def _unique_code() -> str:
    """Generate a unique 4-digit code among active lobbies."""
    existing = {lobby["lobby_code"] for lobby in _lobbies.values()}
    for _ in range(500):
        code = f"{random.randint(0, 9999):04d}"
        if code not in existing:
            return code
    raise HTTPException(503, "No available lobby codes — try again later")


def _get_lobby(lobby_id: str) -> dict:
    _cleanup()
    lobby = _lobbies.get(lobby_id)
    if not lobby:
        raise HTTPException(404, "Session not found")
    return lobby


def _find_by_code(code: str) -> dict:
    _cleanup()
    for lobby in _lobbies.values():
        if lobby["lobby_code"] == code and lobby["status"] == "active":
            return lobby
    raise HTTPException(404, "Session not found")


# ── Routes ───────────────────────────────────────────────────────
@router.post("/create")
async def create_lobby(body: CreateLobby):
    """Create a new lobby. Returns lobby_id, code, host player id, QR url."""
    _cleanup()
    code = _unique_code()
    lobby_id = f"GMAI-{code}"
    host_id = str(uuid.uuid4())

    _lobbies[lobby_id] = {
        "lobby_id": lobby_id,
        "lobby_code": code,
        "game_id": body.game_id,
        "host_id": host_id,
        "players": [
            {"id": host_id, "name": body.host_name, "is_host": True},
        ],
        "scores": {},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "active",
        "kicked": [],
    }

    return {
        "lobby_id": lobby_id,
        "lobby_code": code,
        "host_id": host_id,
        "qr_url": f"https://playgmg.com/join/{code}",
    }


@router.post("/join")
async def join_lobby(body: JoinLobby):
    """Join an existing lobby by 4-digit code."""
    lobby = _find_by_code(body.code)
    player_id = str(uuid.uuid4())
    lobby["players"].append(
        {"id": player_id, "name": body.player_name, "is_host": False}
    )
    return {
        "lobby_id": lobby["lobby_id"],
        "player_id": player_id,
        "game_id": lobby["game_id"],
        "players": lobby["players"],
    }


@router.get("/{lobby_id}")
async def get_lobby(lobby_id: str):
    """Poll lobby state — players, scores, game_id, status."""
    lobby = _get_lobby(lobby_id)
    return {
        "lobby_id": lobby["lobby_id"],
        "lobby_code": lobby["lobby_code"],
        "game_id": lobby["game_id"],
        "host_id": lobby["host_id"],
        "players": lobby["players"],
        "scores": lobby["scores"],
        "status": lobby["status"],
        "kicked": lobby.get("kicked", []),
    }


@router.post("/{lobby_id}/scores")
async def update_scores(lobby_id: str, body: UpdateScores):
    """Merge score data for a player into the lobby."""
    lobby = _get_lobby(lobby_id)
    lobby["scores"][body.player_id] = body.scores
    return {"ok": True}


@router.post("/{lobby_id}/kick")
async def kick_player(lobby_id: str, body: KickPlayer):
    """Host removes a player from the lobby."""
    lobby = _get_lobby(lobby_id)
    if lobby["host_id"] != body.host_id:
        raise HTTPException(403, "Only the host can kick players")
    lobby["players"] = [
        p for p in lobby["players"] if p["id"] != body.kick_player_id
    ]
    lobby.get("kicked", []).append(body.kick_player_id)
    lobby["scores"].pop(body.kick_player_id, None)
    return {"ok": True}


@router.post("/{lobby_id}/leave")
async def leave_lobby(lobby_id: str, body: LeaveBody):
    """Player voluntarily leaves the lobby."""
    lobby = _get_lobby(lobby_id)
    lobby["players"] = [p for p in lobby["players"] if p["id"] != body.player_id]
    lobby["scores"].pop(body.player_id, None)
    return {"ok": True}


@router.post("/{lobby_id}/end")
async def end_game(lobby_id: str, body: EndGameBody):
    """Host ends the game — sets status to 'ended' so all clients see results."""
    lobby = _get_lobby(lobby_id)
    if lobby["host_id"] != body.host_id:
        raise HTTPException(403, "Only the host can end the game")
    lobby["status"] = "ended"
    return {"ok": True}
