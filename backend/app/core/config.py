import os
from pathlib import Path

# Load .env if present (local dev only — Render sets env vars directly)
_env_file = Path(__file__).resolve().parent.parent.parent / ".env"
if _env_file.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_file)
    except ImportError:
        pass  # python-dotenv not installed — rely on shell env

# ── LLM Configuration ────────────────────────────────────────────
# LLM_MODE controls which LLM backend to use:
#   "anthropic"     = Production (Render) — hits Anthropic Messages API
#   "gateway"       = Local dev (K2-PC) — hits OpenClaw Gateway on port 18789
#   "openai-direct" = Legacy OpenAI API fallback
LLM_MODE = os.getenv("LLM_MODE", "anthropic")

# Anthropic mode (production default)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", os.getenv("LLM_API_KEY", ""))
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")

# Gateway / OpenAI-compatible mode (local dev: OpenClaw Gateway)
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://127.0.0.1:18789/v1")
LLM_AUTH_TOKEN = os.getenv("LLM_API_KEY", os.getenv("LLM_AUTH_TOKEN", "780a902774909bb7f47b82006b91724aec59b79f795ac401"))
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-5.3-codex")

# OpenAI Direct mode (legacy fallback)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# ── CORS ──────────────────────────────────────────────────────────
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:3100")

# ── Data paths ────────────────────────────────────────────────────
# Local dev: WSL paths. Production (Render): relative to repo root.
_IS_RENDER = os.getenv("RENDER", "")  # Render sets this automatically
CONTENT_DIR = os.getenv("CONTENT_DIR", "../content/games" if _IS_RENDER else "/mnt/d/GameMasterAI/content/games")
HEARTBEAT_DIR = os.getenv("HEARTBEAT_DIR", "/mnt/d/GameMasterAI/agents/heartbeat")
DB_PATH = os.getenv("DB_PATH", "/tmp/games.db" if _IS_RENDER else "/mnt/d/GameMasterAI/backend/games.db")

# ── Telegram — Thai House Orders bot ─────────────────────────────
THAI_HOUSE_BOT_TOKEN = os.getenv("THAI_HOUSE_BOT_TOKEN", "")
THAI_HOUSE_CHAT_ID = os.getenv("THAI_HOUSE_CHAT_ID", "")

# ── Stripe ─────────────────────────────────────────────────────
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_STARTER = os.getenv("STRIPE_PRICE_STARTER", "")
STRIPE_PRICE_STANDARD = os.getenv("STRIPE_PRICE_STANDARD", "")
STRIPE_PRICE_PREMIUM = os.getenv("STRIPE_PRICE_PREMIUM", "")
STRIPE_DRINK_CLUB_PRICE_ID = os.getenv("STRIPE_DRINK_CLUB_PRICE_ID", "")
STRIPE_DRINK_CLUB_PAYMENT_LINK = os.getenv("STRIPE_DRINK_CLUB_PAYMENT_LINK", "")

# ── Drink Club ──────────────────────────────────────────────────
DRINK_CLUB_STAFF_PIN = os.getenv("DRINK_CLUB_STAFF_PIN", "1234")

# ── Print Agent ──────────────────────────────────────────────────
PRINT_AGENT_API_KEY = os.getenv("PRINT_AGENT_API_KEY", "")

# ── Auth / JWT ───────────────────────────────────────────────────
JWT_SECRET = os.getenv("JWT_SECRET", "gmai-dev-secret-change-in-production-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "24"))
