"""
Configuration management for the AI service.
All settings are loaded from environment variables with sensible defaults.
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    # Gemini
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-1.5-flash", alias="GEMINI_MODEL")
    gemini_embedding_model: str = Field(default="models/text-embedding-004")

    # MongoDB
    mongodb_url: str = Field(default="", alias="MONGODB_URL")
    mongodb_db: str = Field(default="EgrievanceHubV2", alias="MONGODB_DB")
    ai_require_db: bool = Field(default=True, alias="AI_REQUIRE_DB")

    # Internal auth (Node.js backend → Python service)
    ai_service_secret: str = Field(default="", alias="AI_SERVICE_SECRET")

    # ML
    embedding_model: str = Field(default="all-MiniLM-L6-v2", alias="EMBEDDING_MODEL")
    similarity_threshold: float = Field(default=0.75, alias="SIMILARITY_THRESHOLD")
    max_similar_results: int = Field(default=5, alias="MAX_SIMILAR_RESULTS")

    # Server
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)

    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
