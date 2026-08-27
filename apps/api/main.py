import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("astrophage")

from .db.database import init_db
from .services.sse import SSEManager
from .routers import orgs, kb, webhooks
from .services.source_ingestion.base import IngestionError, IngestionAuthError, IngestionRateLimitError

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB on startup
    await init_db()
    
    # Init SSE Manager
    app.state.sse_manager = SSEManager()
    
    yield

app = FastAPI(title="Astrophage API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to Next.js origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ingestion Exception Handlers
@app.exception_handler(IngestionAuthError)
async def ingestion_auth_exception_handler(request, exc: IngestionAuthError):
    return JSONResponse(
        status_code=401,
        content={"detail": f"Ingestion authentication error: {str(exc)}"},
    )

@app.exception_handler(IngestionRateLimitError)
async def ingestion_rate_limit_exception_handler(request, exc: IngestionRateLimitError):
    return JSONResponse(
        status_code=429,
        content={"detail": f"Ingestion rate limit error: {str(exc)}"},
    )

@app.exception_handler(IngestionError)
async def ingestion_exception_handler(request, exc: IngestionError):
    return JSONResponse(
        status_code=400,
        content={"detail": f"Ingestion error: {str(exc)}"},
    )

app.include_router(orgs.router)
app.include_router(kb.router)
app.include_router(webhooks.router)

@app.get("/api/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}
