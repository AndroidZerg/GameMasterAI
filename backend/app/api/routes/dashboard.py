import json
import os
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from app.core.config import HEARTBEAT_DIR

router = APIRouter()

GAMES_50 = [
    "Catan", "Ticket to Ride", "Carcassonne", "Azul", "Splendor",
    "Codenames", "Kingdomino", "Sushi Go Party!", "Patchwork", "Century: Spice Road",
    "Wingspan", "7 Wonders", "Pandemic", "Dominion", "Everdell",
    "Terraforming Mars", "Sagrada", "Above and Below", "Lords of Waterdeep", "Clank!",
    "Dixit", "Wavelength", "Just One", "The Crew", "Coup",
    "Love Letter", "Skull", "One Night Ultimate Werewolf", "Telestrations", "Decrypto",
    "Betrayal at House on the Hill", "Mysterium", "Villainous", "Photosynthesis", "Takenoko",
    "Sheriff of Nottingham", "Dead of Winter", "Cosmic Encounter", "King of Tokyo", "Quacks of Quedlinburg",
    "Scythe", "Spirit Island", "Brass: Birmingham", "Root", "Agricola",
    "Concordia", "Great Western Trail", "Viticulture", "Castles of Burgundy", "Power Grid",
]

ROGUE_ASSIGNMENTS = {
    "halfling": GAMES_50[0:10],
    "elf": GAMES_50[10:20],
    "dwarf": GAMES_50[20:30],
    "human": GAMES_50[30:40],
    "goblin": GAMES_50[40:50],
}

STATUS_COLORS = {
    "not_started": "#6b7280",
    "in_progress": "#eab308",
    "in_qa": "#3b82f6",
    "approved": "#22c55e",
    "rejected": "#ef4444",
    "failed": "#ef4444",
}


def _load_heartbeats():
    heartbeats = {}
    hb_dir = Path(HEARTBEAT_DIR)
    if not hb_dir.exists():
        return heartbeats
    for f in hb_dir.glob("*.json"):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            agent = data.get("agent", f.stem)
            heartbeats[agent] = data
        except Exception:
            pass
    return heartbeats


def _build_game_status(heartbeats):
    game_status = {g: "not_started" for g in GAMES_50}
    for agent, hb in heartbeats.items():
        assigned = ROGUE_ASSIGNMENTS.get(agent, [])
        current = hb.get("current_game", "")
        bp = hb.get("batch_progress", {})
        completed_count = bp.get("completed", 0)
        in_qa_count = bp.get("in_qa", 0)
        approved_count = bp.get("approved", 0)
        failed_count = bp.get("failed", 0)
        # Mark current game
        for g in assigned:
            title_lower = g.lower().replace(" ", "-").replace(":", "").replace("!", "").replace("'", "")
            if current and current.lower() == title_lower:
                game_status[g] = "in_progress"
    # Also check content/games for completed files
    content_dir = Path(os.getenv("CONTENT_DIR", r"D:\GameMasterAI\content\games"))
    if content_dir.exists():
        for gf in content_dir.glob("*.json"):
            if gf.name == "_template.json":
                continue
            try:
                gdata = json.loads(gf.read_text(encoding="utf-8"))
                title = gdata.get("title", "")
                vs = gdata.get("metadata", {}).get("validation_status", "pending")
                if title in game_status:
                    if vs == "approved":
                        game_status[title] = "approved"
                    elif vs == "rejected":
                        game_status[title] = "rejected"
                    elif vs == "pending":
                        game_status[title] = "in_qa"
            except Exception:
                pass
    return game_status


@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard():
    heartbeats = _load_heartbeats()
    game_status = _build_game_status(heartbeats)

    game_cells = ""
    for g in GAMES_50:
        status = game_status[g]
        color = STATUS_COLORS.get(status, "#6b7280")
        game_cells += f'<div class="game-cell" style="background:{color}">{g}</div>\n'

    agent_rows = ""
    for agent in ["halfling", "elf", "dwarf", "human", "goblin"]:
        hb = heartbeats.get(agent)
        if hb:
            current = hb.get("current_game", "—")
            bp = hb.get("batch_progress", {})
            done = bp.get("completed", 0) + bp.get("approved", 0)
            total = bp.get("total", 10)
            status = hb.get("status", "unknown")
            agent_rows += f'<tr><td>{agent}</td><td>{status}</td><td>{current}</td><td>{done}/{total}</td></tr>\n'
        else:
            agent_rows += f'<tr><td>{agent}</td><td>no heartbeat</td><td>—</td><td>0/10</td></tr>\n'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GMAI Dashboard</title>
<meta http-equiv="refresh" content="60">
<style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#111; color:#eee; padding:16px; }}
  h1 {{ text-align:center; margin-bottom:8px; font-size:1.5rem; }}
  .subtitle {{ text-align:center; color:#888; margin-bottom:16px; font-size:0.85rem; }}
  .legend {{ display:flex; gap:12px; justify-content:center; margin-bottom:16px; flex-wrap:wrap; }}
  .legend-item {{ display:flex; align-items:center; gap:4px; font-size:0.8rem; }}
  .legend-dot {{ width:12px; height:12px; border-radius:3px; }}
  .grid {{ display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:8px; margin-bottom:24px; }}
  .game-cell {{ padding:10px 8px; border-radius:6px; text-align:center; font-size:0.75rem; font-weight:600; color:#fff; text-shadow:0 1px 2px rgba(0,0,0,0.5); }}
  table {{ width:100%; border-collapse:collapse; margin-top:8px; }}
  th, td {{ padding:8px 12px; text-align:left; border-bottom:1px solid #333; font-size:0.85rem; }}
  th {{ color:#aaa; font-weight:600; }}
  h2 {{ font-size:1.1rem; margin-top:16px; margin-bottom:8px; }}
</style>
</head>
<body>
<h1>GameMaster AI — Sprint Dashboard</h1>
<p class="subtitle">Auto-refreshes every 60 seconds</p>
<div class="legend">
  <div class="legend-item"><div class="legend-dot" style="background:#6b7280"></div>Not Started</div>
  <div class="legend-item"><div class="legend-dot" style="background:#eab308"></div>In Progress</div>
  <div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>In QA</div>
  <div class="legend-item"><div class="legend-dot" style="background:#22c55e"></div>Approved</div>
  <div class="legend-item"><div class="legend-dot" style="background:#ef4444"></div>Rejected</div>
</div>
<div class="grid">
{game_cells}
</div>
<h2>Rogue Agents</h2>
<table>
<tr><th>Agent</th><th>Status</th><th>Current Game</th><th>Progress</th></tr>
{agent_rows}
</table>
</body>
</html>"""
    return HTMLResponse(content=html)
