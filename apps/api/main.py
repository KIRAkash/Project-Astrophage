from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .db.database import init_db
from .services.sse import SSEManager
from .routers import orgs, kb, webhooks

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

app.include_router(orgs.router)
app.include_router(kb.router)
app.include_router(webhooks.router)

@app.get("/api/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}
