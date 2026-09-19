"""Application configuration, read from the environment (never hard-coded)."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # SQLAlchemy async URL, e.g.
    # postgresql+asyncpg://postgres:CHANGE_ME@localhost:5432/taskboard
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/taskboard"

    # Origin allowed to call this API from a browser (the Vite dev server).
    frontend_origin: str = "http://localhost:5173"


settings = Settings()
