from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.games import router as games_router
from app.api.routes.query import router as query_router
from app.models.game import rebuild_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: scan game files and populate SQLite
    count = rebuild_db()
    print(f"[GMAI] Loaded {count} game(s) into SQLite")
    yield


app = FastAPI(title="GameMaster AI", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3100"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(dashboard_router)
app.include_router(games_router)
app.include_router(query_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
