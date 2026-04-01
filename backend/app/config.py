from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    HAPI_FHIR_BASE_URL: str = "https://hapi.fhir.org/baseR4"
    # Turso — leave blank to fall back to local :memory: SQLite (useful for CI/offline dev)
    TURSO_DATABASE_URL: str = ""   # e.g. libsql://your-db.turso.io
    TURSO_AUTH_TOKEN: str = ""
    ANTHROPIC_API_KEY: str = ""
    PORT: int = 9100

    # Load from root .env (one level up from backend/) — single source of truth
    model_config = {"env_file": "../.env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
