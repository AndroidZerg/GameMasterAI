"""GameMaster Guide — Backend API server for board game cafe management."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter

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
from app.api.routes.print_queue import router as print_queue_router
from app.api.routes.onboarding import router as onboarding_router
from app.api.routes.venue_dashboard import router as venue_dashboard_router
from app.api.routes.crm import router as crm_router
from app.api.routes.analytics_dashboard import router as analytics_dashboard_router
from app.api.routes.device_sessions import router as device_sessions_router
from app.api.routes.device_sessions import init_device_session_tables
from app.api.routes.rentals import router as rentals_router
from app.api.routes.rentals import init_rental_tables
from app.api.routes.swp_rentals import router as swp_rentals_router
from app.api.routes.lgs import router as lgs_router
from app.api.routes.venue_subscriptions import router as venue_sub_router
from app.api.routes.webhooks import router as webhooks_router
from app.api.routes.game_selection import router as game_selection_router
from app.api.routes.lgs_dashboard import router as lgs_dashboard_router
from app.api.routes.shop import router as shop_router
from app.api.routes.thaihouse import router as thaihouse_router
from app.api.routes.drink_club import router as drink_club_router
from app.api.routes.menu_admin import router as menu_admin_router
from app.api.routes.order_management import router as order_mgmt_router
from app.api.routes.loyalty import router as loyalty_router
from app.api.routes.floor import router as floor_router
from app.api.routes.thaihouse_crm import router as thaihouse_crm_router
from app.api.routes.menu_images import router as menu_images_router
from app.api.routes.seed_thaihouse import router as seed_thaihouse_router
from app.api.routes.cover_art import router as cover_art_router
from app.api.routes.venue_config import router as venue_config_router
from app.models.game import rebuild_db, search_games
from app.models.sessions import init_sessions_table
from app.models.feedback import init_feedback_table
from app.models.contacts import init_contacts_table
from app.models.venues import (
    init_venues_table, init_venue_collections_table,
    seed_all_venues, seed_dicetower_accounts, set_venue_collection,
)
from app.models.game import search_limited_library, search_convention_library
from app.models.analytics import init_analytics_table
from app.models.score_history import init_score_history_table
from app.models.house_rules import init_house_rules_table
from app.models.orders import init_orders_table, init_print_queue_tables
from app.services.turso import init_analytics_tables as init_turso_analytics
from app.services.turso import init_swp_rental_tables, seed_swp_rental_inventory, match_shopify_inventory
from app.core.auth import hash_password
from app.core.config import CORS_ORIGIN
from app.models.venue_platform import run_migrations as run_venue_platform_migrations
from app.models.marketplace import init_marketplace_tables
from app.services.turso import init_drink_club_tables, init_menu_tables, seed_menu_from_json, get_menu_db, init_signups_table, init_admin_config_tables, init_cover_art_tables


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
    init_print_queue_tables()
    init_rental_tables()
    init_turso_analytics()
    init_device_session_tables()
    run_venue_platform_migrations()
    init_marketplace_tables()
    init_drink_club_tables()
    init_menu_tables()
    init_swp_rental_tables()
    init_signups_table()
    init_admin_config_tables()
    init_cover_art_tables()
    seed_swp_rental_inventory()
    match_shopify_inventory()

    # Auto-seed menu from JSON if tables are empty
    try:
        _mdb = get_menu_db()
        _menu_count = _mdb.execute("SELECT COUNT(*) FROM menu_items").fetchone()[0]
        if _menu_count == 0:
            seed_menu_from_json()
    except Exception as e:
        print(f"[GMAI] Menu auto-seed skipped: {e}")

    # Seed all Las Vegas demo venues
    pw_hash = hash_password("gmg2026")
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

    # Seed GOTD + Staff Picks into Turso if not already set
    from app.services.turso import has_turso_venue_config, set_turso_staff_picks, set_turso_gotd

    # Global defaults
    if not has_turso_venue_config("global"):
        global_picks = [
            "above-and-below", "carcassonne", "ark-nova", "dune-imperium",
            "blood-on-the-clocktower", "brass-birmingham", "gloomhaven",
            "twilight-imperium-4th-edition", "terraforming-mars", "castles-of-burgundy",
        ]
        set_turso_staff_picks("global", global_picks)
        set_turso_gotd("global", "wingspan", "manual")
        print("[GMAI] Seeded global staff picks + GOTD in Turso")

    # Convention defaults
    if not has_turso_venue_config("convention"):
        convention_picks = ["wingspan", "wyrmspan", "tapestry", "viticulture", "scythe", "tokaido"]
        set_turso_staff_picks("convention", convention_picks)
        set_turso_gotd("convention", "wingspan", "manual")
        print("[GMAI] Seeded convention staff picks + GOTD in Turso")

    # Migrate _default → global if _default exists but global doesn't
    if has_turso_venue_config("_default") and not has_turso_venue_config("global"):
        from app.services.turso import get_turso_staff_picks, get_turso_gotd
        old_picks = get_turso_staff_picks("_default")
        old_gotd = get_turso_gotd("_default")
        if old_picks:
            set_turso_staff_picks("global", old_picks)
        if old_gotd:
            set_turso_gotd("global", old_gotd["game_id"], old_gotd["mode"])
        print("[GMAI] Migrated _default config to global in Turso")

    # Load system config (meetup toggle, clear-recent)
    from app.services.admin_config import load_all as _load_admin_config
    _load_admin_config()

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

# CORS — allow production origins and optionally localhost for dev
# Always include both domains for backward compatibility during migration
_PROD_ORIGINS = ["https://playgmg.com", "https://playgmai.com"]
origins = [o.strip() for o in CORS_ORIGIN.split(",") if o.strip()]
for _po in _PROD_ORIGINS:
    if _po not in origins:
        origins.append(_po)
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

# --- Orders & Print Queue ---
app.include_router(orders_router)
app.include_router(print_queue_router)

# --- Rentals ---
app.include_router(swp_rentals_router)  # SWP subscription rentals (new system, takes priority)
app.include_router(rentals_router)      # Legacy rental requests

# --- LGS Marketplace ---
app.include_router(lgs_router, prefix="/api/v1/admin")
app.include_router(venue_sub_router)
app.include_router(webhooks_router)
app.include_router(game_selection_router)
app.include_router(lgs_dashboard_router)
app.include_router(shop_router)

# --- Thai House Public ---
app.include_router(thaihouse_router)
app.include_router(drink_club_router)
app.include_router(menu_admin_router)
app.include_router(order_mgmt_router)
app.include_router(loyalty_router)
app.include_router(floor_router)
app.include_router(thaihouse_crm_router)
app.include_router(menu_images_router)
app.include_router(seed_thaihouse_router)

# --- Venue Platform (v1) ---
app.include_router(onboarding_router)
app.include_router(venue_dashboard_router)
app.include_router(crm_router)
app.include_router(analytics_dashboard_router)
app.include_router(device_sessions_router)

# --- Misc ---
app.include_router(dashboard_router)
app.include_router(query_router)
app.include_router(images_router)

# --- Cover Art Admin ---
app.include_router(cover_art_router)

# --- Venue Config (GOTD + Staff Picks) ---
app.include_router(venue_config_router)


@app.get("/health", tags=["system"])
async def health():
    """Health check endpoint."""
    return {"status": "ok"}
