"""
FastAPI AI Microservice — E-Griverence
Exposes ML-powered endpoints consumed by the Node.js backend.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from services.db_service import connect_db, close_db
from services.embedding_service import load_embedding_model

from routers import (
    analyze, improve, duplicates,
    response_suggest, summary, similar,
    search, insights, sla_risk, chat,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ai-service")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: connect DB + pre-load embedding model."""
    logger.info("Starting AI service …")
    await connect_db()
    load_embedding_model()          # warm-up; cached after first call
    logger.info("AI service ready ✅")
    yield
    logger.info("Shutting down AI service …")
    await close_db()


app = FastAPI(
    title="E-Griverence AI Service",
    description="ML-powered grievance analysis, search, and insights",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
)

# Allow only the Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],    # tightened via AI_SERVICE_SECRET header check below
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Internal auth guard ──────────────────────────────────────────────────────
@app.middleware("http")
async def require_service_secret(request: Request, call_next):
    """
    Every request must carry the shared secret in X-AI-Secret header.
    Health-check is exempt so Docker can probe it.
    """
    if request.url.path in ("/health", "/docs", "/openapi.json"):
        return await call_next(request)

    secret = request.headers.get("X-AI-Secret", "")
    if settings.ai_service_secret and secret != settings.ai_service_secret:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})

    return await call_next(request)


# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(analyze.router,          prefix="/analyze",          tags=["Analyze"])
app.include_router(improve.router,          prefix="/improve",          tags=["Improve"])
app.include_router(duplicates.router,       prefix="/duplicates",       tags=["Duplicates"])
app.include_router(response_suggest.router, prefix="/suggest-response", tags=["Response"])
app.include_router(summary.router,          prefix="/summary",          tags=["Summary"])
app.include_router(similar.router,          prefix="/similar",          tags=["Similar"])
app.include_router(search.router,           prefix="/search",           tags=["Search"])
app.include_router(insights.router,         prefix="/insights",         tags=["Insights"])
app.include_router(sla_risk.router,         prefix="/sla-risk",         tags=["SLA"])
app.include_router(chat.router,             prefix="/chat",             tags=["Chat"])


# ── Health ───────────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "E-Griverence AI"}


# ── Global exception handler ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal AI service error", "available": False},
    )
