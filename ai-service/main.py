"""
FastAPI AI Microservice — E-Griverence
Exposes ML-powered endpoints consumed by the Node.js backend.
"""
import logging
import os
from contextlib import asynccontextmanager
from logging.handlers import RotatingFileHandler
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from services.db_service import connect_db, close_db, is_db_connected
from services.embedding_service import load_embedding_model, is_embedding_model_loaded

from routers import (
    analyze, improve, duplicates,
    response_suggest, summary, similar,
    search, insights, sla_risk, chat,
)

def configure_logging() -> None:
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    root = logging.getLogger()
    root.setLevel(log_level)
    root.handlers.clear()

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    root.addHandler(console_handler)

    log_dir = Path(os.getenv("LOG_DIR", "logs"))
    try:
        log_dir.mkdir(parents=True, exist_ok=True)
        app_handler = RotatingFileHandler(log_dir / "ai-service.log", maxBytes=5_000_000, backupCount=5)
        app_handler.setFormatter(formatter)
        root.addHandler(app_handler)

        error_handler = RotatingFileHandler(log_dir / "ai-service-error.log", maxBytes=5_000_000, backupCount=5)
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(formatter)
        root.addHandler(error_handler)
    except OSError as exc:
        root.warning("File logging disabled: %s", exc)


configure_logging()
logger = logging.getLogger("ai-service")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: connect DB + pre-load embedding model."""
    logger.info("Starting AI service …")
    if not settings.ai_service_secret or len(settings.ai_service_secret) < 32:
        raise RuntimeError("AI_SERVICE_SECRET must be set and at least 32 characters")
    if not settings.gemini_api_key or settings.gemini_api_key == "your-gemini-api-key-here":
        logger.warning("GEMINI_API_KEY is not configured; Gemini-backed AI endpoints will run in degraded mode")
    try:
        await connect_db()
    except Exception as exc:
        if settings.ai_require_db:
            raise
        logger.warning("AI service continuing without MongoDB in degraded mode: %s", exc)
    if os.getenv("PRELOAD_EMBEDDING_MODEL", "false").lower() == "true":
        try:
            load_embedding_model()          # warm-up; cached after first call
        except Exception as exc:
            logger.error("Embedding model unavailable; similarity endpoints will be disabled: %s", exc)
    else:
        logger.info("Embedding model preload disabled; similarity model will lazy-load on first use")
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
    allow_origins=[os.getenv("BACKEND_ORIGIN", "http://localhost:5000")],
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
    ok = is_db_connected()
    return {
        "status": "ok" if ok else "degraded",
        "timestamp": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "services": {
            "database": "connected" if is_db_connected() else "disconnected",
            "aiModel": "loaded" if is_embedding_model_loaded() else "lazy",
            "gemini": "configured" if bool(settings.gemini_api_key) else "missing",
        },
    }


@app.get("/ready", tags=["Health"])
async def ready():
    ok = is_db_connected()
    return {
        "status": "ok" if ok else "degraded",
        "timestamp": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "services": {
            "database": "connected" if is_db_connected() else "disconnected",
            "aiModel": "loaded" if is_embedding_model_loaded() else "lazy",
            "gemini": "configured" if bool(settings.gemini_api_key) else "missing",
        },
    }


# ── Global exception handler ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error: %s", exc, exc_info=True)
    if "Database not connected" in str(exc):
        return JSONResponse(
            status_code=503,
            content={"detail": "AI database unavailable", "available": False},
        )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal AI service error", "available": False},
    )
