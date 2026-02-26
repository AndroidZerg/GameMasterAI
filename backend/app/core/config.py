import os

# ── LLM Configuration ────────────────────────────────────────────
# LLM_MODE controls which LLM backend to use:
#   "openai-direct" = Production (Render) — hits OpenAI API directly
#   "gateway"       = Local dev (K2-PC) — hits OpenClaw Gateway on port 18789
#   "anthropic"     = Anthropic Messages API (fallback)
LLM_MODE = os.getenv("LLM_MODE", "gateway")

# OpenAI Direct mode (production)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# Gateway / OpenAI-compatible mode (local dev: OpenClaw Gateway, prod: OpenRouter)
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://127.0.0.1:18789/v1")
LLM_AUTH_TOKEN = os.getenv("LLM_API_KEY", os.getenv("LLM_AUTH_TOKEN", "780a902774909bb7f47b82006b91724aec59b79f795ac401"))
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-5.3-codex")

# Anthropic mode (fallback)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5")

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

# ── Auth / JWT ───────────────────────────────────────────────────
JWT_SECRET = os.getenv("JWT_SECRET", "gmai-dev-secret-change-in-production-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "24"))
