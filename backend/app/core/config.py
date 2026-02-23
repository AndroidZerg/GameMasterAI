import os

LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://127.0.0.1:18789/v1")
LLM_AUTH_TOKEN = os.getenv("LLM_AUTH_TOKEN", "780a902774909bb7f47b82006b91724aec59b79f795ac401")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-5.3-codex")

CONTENT_DIR = os.getenv("CONTENT_DIR", "/mnt/d/GameMasterAI/content/games")
HEARTBEAT_DIR = os.getenv("HEARTBEAT_DIR", "/mnt/d/GameMasterAI/agents/heartbeat")
DB_PATH = os.getenv("DB_PATH", "/mnt/d/GameMasterAI/backend/games.db")
