"""
Configuration management for the AI service.
All settings are loaded from environment variables with sensible defaults.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"
    gemini_embedding_model: str = "models/text-embedding-004"

    # MongoDB
    mongodb_url: str = "mongodb://localhost:27017/EgrievanceHub"
    mongodb_db: str = "EgrievanceHub"

    # Internal auth (Node.js backend → Python service)
    ai_service_secret: str = ""

    # ML
    embedding_model: str = "all-MiniLM-L6-v2"
    similarity_threshold: float = 0.75
    max_similar_results: int = 5

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
