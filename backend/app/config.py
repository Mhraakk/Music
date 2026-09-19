"""Central configuration (12-factor) for the RESONANT AI backend.

Every external dependency is optional: the service boots with in-process
adapters (memory vector store, SQLite, in-memory cache, local LLM) and upgrades
to Qdrant / Postgres / Redis / hosted LLMs purely through environment variables.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "var"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Service ---
    app_name: str = "resonant-ai-backend"
    environment: Literal["development", "test", "production"] = "development"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:3000"]

    # --- Security (block 2) ---
    api_keys: list[str] = []  # empty => auth disabled (local dev)
    rate_limit_requests: int = 60
    rate_limit_window_seconds: int = 60

    # --- LLM (block 7) ---
    llm_provider: Literal["local", "openai", "anthropic", "ollama"] = "local"
    llm_model: str = "resonant-local-v1"
    llm_temperature: float = 0.2
    llm_max_tokens: int = 800
    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    anthropic_api_key: str | None = None
    ollama_base_url: str = "http://localhost:11434"

    # --- Embeddings (block 5) ---
    embedding_provider: Literal["local", "openai"] = "local"
    embedding_model: str = "resonant-hash-256"
    embedding_dim: int = 256

    # --- Vector store (data layer) ---
    vector_store: Literal["memory", "qdrant"] = "memory"
    vector_collection: str = "resonant_knowledge"
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str | None = None

    # --- Relational DB (data layer) ---
    database_url: str = f"sqlite:///{DATA_DIR / 'resonant.db'}"

    # --- Cache / sessions (block 9) ---
    cache_backend: Literal["memory", "redis"] = "memory"
    redis_url: str = "redis://localhost:6379/0"
    session_ttl_seconds: int = 60 * 60 * 24

    # --- File / object storage ---
    file_storage_dir: Path = DATA_DIR / "files"

    # --- RAG tuning (block 5) ---
    chunk_size: int = 900
    chunk_overlap: int = 150
    retrieval_top_k: int = 12
    rerank_top_n: int = 4
    min_relevance_score: float = 0.05

    # --- Orchestrator (block 3) ---
    max_agent_steps: int = 6
    enable_reflexion: bool = True
    groundedness_threshold: float = 0.35

    # --- Knowledge seed ---
    knowledge_seed_dir: Path = BASE_DIR / "data" / "knowledge"

    @property
    def auth_enabled(self) -> bool:
        return bool(self.api_keys)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    settings.file_storage_dir.mkdir(parents=True, exist_ok=True)
    return settings
