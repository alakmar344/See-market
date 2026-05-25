from functools import lru_cache
from typing import List

from pydantic import Field, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = Field(default="production", alias="APP_ENV")
    app_name: str = "See-market API"
    api_v1_prefix: str = "/api/v1"

    secret_key: str = Field(alias="SECRET_KEY")
    jwt_secret: str = Field(alias="JWT_SECRET")
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 30
    refresh_token_minutes: int = 60 * 24 * 7

    database_url: str = Field(alias="DATABASE_URL")
    redis_url: str = Field(alias="REDIS_URL")

    openrouter_api_key: str = Field(alias="OPENROUTER_API_KEY")
    openrouter_model: str = Field(default="google/gemma-4-26b-a4b-it", alias="OPENROUTER_MODEL")

    binance_api_key: str = Field(default="", alias="BINANCE_API_KEY")
    binance_secret: str = Field(default="", alias="BINANCE_SECRET")
    finnhub_api_key: str = Field(default="", alias="FINNHUB_API_KEY")
    alphavantage_api_key: str = Field(default="", alias="ALPHAVANTAGE_API_KEY")

    cors_origins: List[str] = Field(default_factory=list, alias="CORS_ORIGINS")


@lru_cache
def get_settings() -> Settings:
    try:
        return Settings()
    except ValidationError as exc:
        raise RuntimeError(f"Environment validation failed: {exc}") from exc
