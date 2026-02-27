"""GameMaster Guide — Backend API server for board game cafe management."""

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
from app.api.routes.recommendations import router as recommendations_router
from app.api.routes.search import router as search_router
from app.api.routes.popular import router as popular_router
from app.api.routes.admin import router as admin_router
from app.api.routes.export import router as export_router
from app.api.routes.auth import router as auth_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.score_history import router as score_history_router
from app.api.routes.menu import router as menu_router
from app.api.routes.lobby import router as lobby_router
from app.api.routes.orders import router as orders_router
from app.api.routes.onboarding import router as onboarding_router
from app.api.routes.venue_dashboard import router as venue_dashboard_router
from app.api.routes.crm import router as crm_router
from app.api.routes.analytics_dashboard import router as analytics_dashboard_router
from app.models.game import rebuild_db, search_games
from app.models.sessions import init_sessions_table
from app.models.feedback import init_feedback_table
from app.models.contacts import init_contacts_table
from app.models.venues import (
    init_venues_table, init_venue_collections_table,
    seed_all_venues, seed_dicetower_accounts, set_venue_collection,
)
from app.models.game import search_limited_library
from app.models.analytics import init_analytics_table
from app.models.score_history import init_score_history_table
from app.models.house_rules import init_house_rules_table
from app.models.orders import init_orders_table
from app.services.turso import init_analytics_tables as init_turso_analytics
from app.core.auth import hash_password
from app.core.config import CORS_ORIGIN
from app.services.admin_config import load_all as _load_admin_config
from app.models.venue_platform import run_migrations as run_venue_platform_migrations


limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: scan game files, populate SQLite, create tables, seed venues."""
    count = rebuild_db()
    init_sessions_table()
    init_feedback_table()
    init_contacts_table()
    init_venues_table()
    init_venue_collections_table()
    init_analytics_table()
    init_score_history_table()
    init_house_rules_table()
    init_orders_table()
    init_turso_analytics()
    run_venue_platform_migrations()

    # Seed all Las Vegas demo venues
    pw_hash = hash_password("gmai2026")
    seeded = seed_all_venues(pw_hash)
    all_games = search_games()
    game_ids = [g["game_id"] for g in all_games]
    if seeded:
        # Give all venues the full game collection
        for vid in seeded:
            set_venue_collection(vid, game_ids)
        print(f"[GMAI] Seeded {len(seeded)} venue(s): {', '.join(seeded)}")

    # Seed Dice Tower West accounts (admin, demo, meetup)
    dt_seeded = seed_dicetower_accounts()
    if dt_seeded:
        # admin + meetup get full library; demo gets limited library
        limited_games = search_limited_library()
        limited_ids = [g["game_id"] for g in limited_games]
        for vid in dt_seeded:
            if vid == "demo-dicetower":
                set_venue_collection(vid, limited_ids)
            else:
                set_venue_collection(vid, game_ids)
        print(f"[GMAI] Seeded Dice Tower accounts: {', '.join(dt_seeded)}")

    # Load admin config (GitHub API → hardcoded defaults)
    admin_cfg = _load_admin_config()
    print(f"[GMAI] Startup: loaded admin config for venues: {list(admin_cfg.keys())}")

    print(f"[GMAI] Loaded {count} game(s) into SQLite")
    yield


app = FastAPI(
    title="GameMaster Guide",
    version="0.7.0",
    description="Backend API for GameMaster Guide — a board game cafe assistant with rules lookup, score tracking, session analytics, venue management, and auth.",
    lifespan=lifespan,
)
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


# --- Auth ---
app.include_router(auth_router)

# --- Game endpoints ---
app.include_router(games_router)
app.include_router(search_router)
app.include_router(popular_router)
app.include_router(recommendations_router)
app.include_router(scores_router)

# --- Session & feedback ---
app.include_router(sessions_router)
app.include_router(feedback_router)
app.include_router(stats_router)

# --- Venue & contact ---
app.include_router(venue_router)
app.include_router(menu_router)
app.include_router(contact_router)

# --- Analytics & Score History ---
app.include_router(analytics_router)
app.include_router(score_history_router)

# --- Admin ---
app.include_router(admin_router)
app.include_router(export_router)

# --- Lobby ---
app.include_router(lobby_router)

# --- Orders ---
app.include_router(orders_router)

# --- Venue Platform (v1) ---
app.include_router(onboarding_router)
app.include_router(venue_dashboard_router)
app.include_router(crm_router)
app.include_router(analytics_dashboard_router)

# --- Misc ---
app.include_router(dashboard_router)
app.include_router(query_router)
app.include_router(images_router)


@app.get("/health", tags=["system"])
async def health():
    """Health check endpoint."""
    return {"status": "ok"}
