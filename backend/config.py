"""Backend configuration, loaded from environment (.env at repo root)."""

from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent
REPO_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    orthogonal_api_key: str = Field(default="")
    anthropic_api_key: str = Field(default="")
    elevenlabs_api_key: str = Field(default="")
    elevenlabs_voice_id: str = Field(default="21m00Tcm4TlvDq8ikWAM")

    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    backend_log_level: str = "INFO"
    backend_allowed_origins: str = "*"

    orthogonal_timeout_seconds: float = 18.0
    orthogonal_parallelism: int = 10
    cache_enabled: bool = True

    zenpower_csv_path: Path = BACKEND_DIR / "data" / "zenpower_permits.csv"


settings = Settings()
