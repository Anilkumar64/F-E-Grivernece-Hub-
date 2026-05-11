"""
Async MongoDB connection using Motor.
Shares a single client across the process lifetime.
"""
import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None
_connected = False


async def connect_db() -> None:
    global _client, _db, _connected
    logger.info("Connecting to MongoDB …")
    try:
        _client = AsyncIOMotorClient(settings.mongodb_url, serverSelectionTimeoutMS=5000)
        _db = _client[settings.mongodb_db]
        # Ping to confirm connection
        await _client.admin.command("ping")
        _connected = True
        logger.info("MongoDB connected ✅")
    except Exception as exc:
        _connected = False
        if _client:
            _client.close()
        _client = None
        _db = None
        logger.error("MongoDB unavailable; DB-backed AI endpoints will be disabled: %s", exc)


async def close_db() -> None:
    global _client, _db, _connected
    if _client:
        _client.close()
        logger.info("MongoDB connection closed")
    _client = None
    _db = None
    _connected = False


def is_db_connected() -> bool:
    return _connected


def get_db() -> AsyncIOMotorDatabase:
    if _db is None or not _connected:
        raise RuntimeError("Database not connected. Call connect_db() first.")
    return _db


def get_collection(name: str):
    return get_db()[name]
