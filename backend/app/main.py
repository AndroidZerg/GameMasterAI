from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.games import router as games_router
from app.api.routes.query import router as query_router
from app.api.routes.venue import router as venue_router
from app.api.routes.sessions import router as sessions_router
from app.api.routes.feedback import router as feedback_router
from app.api.routes.stats import router as stats_router
from app.api.routes.scores import router as scores_router
from app.api.routes.contact import router as contact_router
from app.api.routes.images import router as images_router
from app.models.game import rebuild_db
from app.models.sessions import init_sessions_table
from app.models.feedback import init_feedback_table
from app.models.contacts import init_contacts_table
from app.core.config import CORS_ORIGIN


limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: scan game files and populate SQLite
    count = rebuild_db()
    init_sessions_table()
    init_feedback_table()
    init_contacts_table()
    print(f"[GMAI] Loaded {count} game(s) into SQLite")
    yield


app = FastAPI(title="GameMaster AI", version="0.3.0", lifespan=lifespan)
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
app.include_router(venue_router)
app.include_router(sessions_router)
app.include_router(feedback_router)
app.include_router(stats_router)
app.include_router(scores_router)
app.include_router(contact_router)
app.include_router(images_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
