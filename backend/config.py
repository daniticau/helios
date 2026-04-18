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

    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    backend_log_level: str = "INFO"
    backend_allowed_origins: str = "*"

    orthogonal_timeout_seconds: float = 18.0
    orthogonal_parallelism: int = 10
    cache_enabled: bool = True

    zenpower_csv_path: Path = BACKEND_DIR / "data" / "zenpower_permits.csv"

    # Supabase auth — uses the NEW publishable/secret key model with
    # asymmetric JWT signing (JWKS). When supabase_url is unset, all
    # requests are treated as anonymous and auth middleware is a no-op.
    supabase_url: str = Field(default="")
    # sb_publishable_... — safe to expose to browser/mobile clients.
    supabase_publishable_key: str = Field(default="")
    # sb_secret_... — backend admin operations only. Not needed for JWT
    # verification (we use JWKS for that) but reserved for future admin
    # calls against Supabase's `auth.admin.*` endpoints.
    supabase_secret_key: str = Field(default="")
    supabase_jwt_audience: str = "authenticated"


settings = Settings()
