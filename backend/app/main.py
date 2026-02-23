from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.games import router as games_router
from app.api.routes.query import router as query_router
from app.models.game import rebuild_db
from app.core.config import CORS_ORIGIN


limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: scan game files and populate SQLite
    count = rebuild_db()
    print(f"[GMAI] Loaded {count} game(s) into SQLite")
    yield


app = FastAPI(title="GameMaster AI", version="0.2.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — allow production origin and optionally localhost for dev
origins = [o.strip() for o in CORS_ORIGIN.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
