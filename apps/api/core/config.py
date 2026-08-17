import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

_ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
_ENV_FILES = [
    str(_ROOT_DIR / ".env"),
    str(_ROOT_DIR / "apps" / ".env"),
    ".env"
]

class Settings(BaseSettings):
    # ── AI Mode ───────────────────────────────────────────────────────────────
    # "local"  : All LLM calls go to local Gemma via Ollama.
    # "remote" : All LLM calls go to Gemini Flash.
    # "hybrid" : Smart per-task routing — cheap/small tasks use local Gemma,
    #            complex/large-context tasks use remote Gemini.
    AI_MODE: str = "remote"

    # ── Gemini (Remote) ───────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.7-flash"

    # ── Gemma / Ollama (Local) ────────────────────────────────────────────────
    GEMMA_OLLAMA_URL: str = "http://localhost:11434"
    GEMMA_MODEL: str = "gemma"

    # ── GitHub / Integrations ─────────────────────────────────────────────────
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_APP_TOKEN: str = ""
    GITHUB_DEFAULT_ORG: str = ""
    CONFLUENCE_API_TOKEN: Optional[str] = None
    NOTION_API_TOKEN: Optional[str] = None
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
    # MAX_FILES caps ingestion to protect Gemma's VRAM.
    # CHUNK_SIZE is chars per map-reduce chunk (fits inside 8k num_ctx).
    # MAX_PAGES caps the documentation plan so sequential compilation stays fast.
    # PAGE_TOKEN_BUDGET limits prompt size per page (in chars, not tokens).
    LOCAL_MAX_FILES: int = 150
    LOCAL_CHUNK_SIZE: int = 6000
    LOCAL_MAX_PAGES: int = 6
    LOCAL_PAGE_TOKEN_BUDGET: int = 20000  # ~5k tokens at 4 chars/token

    # ── Remote Mode Tuning ────────────────────────────────────────────────────
    # SEMAPHORE_LIMIT controls concurrent Gemini calls to avoid 429 storms.
    # INLINE_THRESHOLD: repos under this many chars skip map-reduce entirely —
    #   the full codebase goes into a single Gemini context window.
    # MAX_PAGES is the upper cap on the documentation plan.
    REMOTE_SEMAPHORE_LIMIT: int = 8
    REMOTE_INLINE_THRESHOLD: int = 800000
    REMOTE_MAX_PAGES: int = 25

    # ── Hybrid Mode Tuning ────────────────────────────────────────────────────
    # LOCAL_CATEGORIES: KB page directory prefixes compiled by Gemma locally.
    # REMOTE_CATEGORIES: KB page directory prefixes compiled by Gemini remotely.
    # ENABLE_SYNTHESIS_PASS: whether to run a Gemini cross-link repair after compilation.
    HYBRID_LOCAL_CATEGORIES: str = "summaries,entities"
    HYBRID_REMOTE_CATEGORIES: str = "concepts,decisions"
    HYBRID_MAX_LOCAL_FILES: int = 150
    HYBRID_ENABLE_SYNTHESIS_PASS: bool = True

    model_config = SettingsConfigDict(
        env_file=_ENV_FILES,
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
