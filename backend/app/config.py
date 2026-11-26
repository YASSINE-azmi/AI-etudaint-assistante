from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Single source of truth for backend configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    environment: Literal["development", "test", "demo"] = "development"
    log_level: str = "INFO"

    supabase_url: str
    supabase_anon_key: str

    database_url: str
    database_runtime_url: str

    # Teaching and vision run on DeepSeek, which has no embedding or speech models,
    # so those roles keep their own provider (Benchmark.md, ADR 0008).
    chat_provider_base_url: str
    chat_provider_api_key: str
    llm_model_name: str = "deepseek-flash"
    vision_model_name: str = "deepseek-flash"

    # Embeddings run locally (fastembed/ONNX), no provider call (docs/spikes/retrieval-rrf-ch01.md).
    # Keep the cache outside synced folders such as OneDrive: large downloads stall there.
    embedding_model_name: str = "intfloat/multilingual-e5-large"
    embedding_dimensions: int = 1024
    embedding_cache_dir: str = "../data/models"

    # Speech-to-text only: DeepSeek has no STT model.
    ai_provider_base_url: str
    ai_provider_api_key: str
    stt_model_name: str = "gpt-4o-mini-transcribe"

    allowed_origins: str = "http://localhost:5173"

    trial_credit_budget_usd: float = Field(default=5.0, ge=0)
    max_turn_input_tokens: int = Field(default=8000, gt=0)
    max_turn_output_tokens: int = Field(default=1500, gt=0)
    turn_timeout_seconds: int = Field(default=20, gt=0)
    max_turns_per_session: int = Field(default=30, gt=0)

    retrieval_top_k: int = Field(default=12, gt=0)
    rrf_k: int = Field(default=60, gt=0)
    prompt_version: str = "v0.1.0"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def supabase_issuer(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1"

    @property
    def supabase_jwks_url(self) -> str:
        return f"{self.supabase_issuer}/.well-known/jwks.json"


class MigrationSettings(BaseSettings):
    """Settings for Alembic only: migrations need the direct connection and nothing else."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    database_url: str


class AdminSettings(BaseSettings):
    """Privileged settings for the reviewer CLI and ingestion only.

    The API process never instantiates this class, so it starts without the
    service-role key (D-28). `tests/test_service_role_boundary.py` enforces it.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    supabase_url: str
    supabase_service_role_key: str
    database_url: str


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_migration_settings() -> MigrationSettings:
    return MigrationSettings()


def get_admin_settings() -> AdminSettings:
    return AdminSettings()
