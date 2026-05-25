from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = Field(default="production", alias="APP_ENV")
    app_name: str = "See-market API"
    api_v1_prefix: str = "/api/v1"

    database_url: str = Field(default="sqlite+aiosqlite:///./see_market.db", alias="DATABASE_URL")
    cache_dir: str = Field(default="./cache", alias="CACHE_DIR")

    google_api_key: str = Field(alias="GOOGLE_API_KEY")
    gemma_model: str = Field(default="gemma-4-31b-it", alias="GEMMA_MODEL")

    binance_api_key: str = Field(default="", alias="BINANCE_API_KEY")
    binance_secret: str = Field(default="", alias="BINANCE_SECRET")
    finnhub_api_key: str = Field(default="", alias="FINNHUB_API_KEY")
    alphavantage_api_key: str = Field(default="", alias="ALPHAVANTAGE_API_KEY")

    cors_origins: List[str] = Field(default_factory=lambda: ["http://localhost:3000"], alias="CORS_ORIGINS")


@lru_cache
def get_settings() -> Settings:
    try:
        settings = Settings()
        Path(settings.cache_dir).mkdir(parents=True, exist_ok=True)
        return settings
    except ValidationError as exc:
        raise RuntimeError(f"Environment validation failed: {exc}") from exc
