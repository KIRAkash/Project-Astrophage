import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

def _find_env_file() -> Optional[str]:
    """Search upwards from current working directory and config file directory for .env."""
    if os.getenv("ENV_FILE") and os.path.exists(os.getenv("ENV_FILE")):
        return os.path.abspath(os.getenv("ENV_FILE"))
    
    # Check cwd and all its parents
    curr = Path.cwd().resolve()
    for parent in [curr] + list(curr.parents):
        candidate = parent / ".env"
        if candidate.is_file():
            return str(candidate)
            
    # Check config.py location and all its parents
    config_dir = Path(__file__).resolve().parent
    for parent in [config_dir] + list(config_dir.parents):
        candidate = parent / ".env"
        if candidate.is_file():
            return str(candidate)
            
    return None

_ENV_FILE = _find_env_file()
_ROOT_DIR = Path(_ENV_FILE).parent if _ENV_FILE else Path(__file__).resolve().parent.parent.parent.parent
if _ENV_FILE:
    load_dotenv(_ENV_FILE, override=True)
else:
    load_dotenv(override=True)

class Settings(BaseSettings):
    # ── AI Mode ───────────────────────────────────────────────────────────────
    # "local"  : All LLM calls go to local Gemma via Ollama.
    # "remote" : All LLM calls go to Gemini Flash.
    # "hybrid" : Smart per-task routing — cheap/small tasks use local Gemma,
    #            complex/large-context tasks use remote Gemini.
    AI_MODE: str = "remote"

    # ── Gemini (Remote) ───────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # ── Gemma / Ollama (Local) ────────────────────────────────────────────────
    GEMMA_OLLAMA_URL: str = "http://localhost:11434"
    GEMMA_MODEL: str = "gemma"

    # ── GitHub / Integrations ─────────────────────────────────────────────────
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_APP_TOKEN: str = ""                         # Legacy PAT fallback
    GITHUB_APP_ID: Optional[str] = None                # GitHub App numeric ID
    GITHUB_APP_INSTALLATION_ID: Optional[str] = None   # Target Org/Repo Installation ID
    GITHUB_APP_PRIVATE_KEY: Optional[str] = None       # Inline PEM key string
    GITHUB_APP_PRIVATE_KEY_PATH: Optional[str] = None  # Path to .pem private key file
    GITHUB_APP_SLUG: str = "astrophage-gitops"         # Bot name slug
    GITHUB_DEFAULT_ORG: str = ""
    CONFLUENCE_API_TOKEN: Optional[str] = None
    NOTION_API_TOKEN: Optional[str] = None
    SLACK_BOT_TOKEN: Optional[str] = None
    SLACK_SIGNING_SECRET: Optional[str] = None
    JIRA_API_TOKEN: Optional[str] = None


    # ── Infrastructure ────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost/astrophage"
    GCS_BUCKET_NAME: str = "astrophage-kbs"
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    REDIS_URL: str = "redis://localhost:6379/0"
    SOURCE_MONITOR_MODE: str = "webhook"
    WEBHOOK_SECRET: str = "supersecret"
    NEXTAUTH_SECRET: str = "supersecret"
    WEBHOOK_BASE_URL: str = "http://localhost:8000"    # Override with public URL in production

    # ── Local Mode Tuning ─────────────────────────────────────────────────────
    LOCAL_MAX_FILES: int = 150
    LOCAL_CHUNK_SIZE: int = 6000
    LOCAL_MAX_PAGES: int = 6
    LOCAL_PAGE_TOKEN_BUDGET: int = 20000  # ~5k tokens at 4 chars/token

    # ── Remote Mode Tuning & Rate Limiting ────────────────────────────────────
    GEMINI_RATE_LIMIT_SAFE_MODE: bool = True
    GEMINI_MAX_CONCURRENCY: int = 2
    GEMINI_REQUEST_DELAY_SECONDS: float = 2.0
    REMOTE_SEMAPHORE_LIMIT: int = 2
    REMOTE_INLINE_THRESHOLD: int = 800000
    REMOTE_MAX_PAGES: int = 25

    # ── Hybrid Mode Tuning ────────────────────────────────────────────────────
    HYBRID_LOCAL_CATEGORIES: str = "summaries,entities"
    HYBRID_REMOTE_CATEGORIES: str = "concepts,decisions"
    HYBRID_MAX_LOCAL_FILES: int = 150
    HYBRID_ENABLE_SYNTHESIS_PASS: bool = True

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE if _ENV_FILE else None,
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()


def get_env_var(key: str, default: str = "") -> str:
    """Read a setting directly from the live .env file on disk, falling back to os.getenv/settings.
    
    This ensures model changes or rate limit tweaks in .env take effect immediately
    without requiring a full process or worker restart.
    """
    env_file = _find_env_file()
    if env_file and os.path.exists(env_file):
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("#") or not line:
                        continue
                    if line.startswith(f"{key}="):
                        val = line.split("=", 1)[1].strip()
                        if not (val.startswith('"') and val.endswith('"')) and not (val.startswith("'") and val.endswith("'")):
                            val = val.split("#", 1)[0].strip()
                        else:
                            val = val[1:-1].strip()
                        if val:
                            return val
        except Exception:
            pass
    return os.environ.get(key) or (str(getattr(settings, key)) if hasattr(settings, key) else default)


