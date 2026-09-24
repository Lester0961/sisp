from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings


base_dir = Path(__file__).resolve().parents[1]
env_path = base_dir / ".env"

class Settings(BaseSettings):
    # Application
    app_name: str = "SISP ML Service — ARIA"
    app_version: str = "1.0.0"
    port: int = 8000
    debug: bool = False

    # Database
    database_url: str = ""

    # LLM providers (server-side only)
    groq_api_key: str = ""
    google_ai_api_key: str = ""
    openrouter_api_key: str = ""
    nvidia_api_key: str = ""
    deepseek_api_key: str = ""
    groq_model: str = "qwen/qwen3.8-27b"
    gemini_model: str = "gemini-3.5-flash"
    openrouter_model: str = "openrouter/free"
    nvidia_model: str = "z-ai/glm-5.3-flash"
    deepseek_model: str = "deepseek-flash"
    llm_provider_order: str = "nvidia"
    llm_request_timeout_seconds: float = 18.0
    nvidia_request_timeout_seconds: float = 18.0
    deepseek_request_timeout_seconds: float = 18.0
    llm_max_tokens: int = 280
    # Paid/third-party providers stay opt-in so a failure never triggers
    # unexpected billable fallback requests.
    groq_enabled: bool = False
    gemini_enabled: bool = False
    openrouter_enabled: bool = False
    nvidia_enabled: bool = True
    # Explicit opt-in. A request-scoped budget guard in DeepSeekProvider still
    # caps local QA usage even when this provider is enabled.
    deepseek_enabled: bool = False

    # ML Config
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dimension: int = 384
    confidence_threshold: float = 0.7
    intent_min_confidence: float = Field(default=0.55, ge=0.0, le=1.0)
    intent_min_margin: float = Field(default=0.15, ge=0.0, le=1.0)
    retrieval_similarity_threshold: float = Field(default=0.36, ge=0.0, le=1.0)
    require_pgvector: bool = False
    # Load the embedding model at startup only when the host has headroom
    # (Render's 512 MB free instance OOMs on eager ONNX load).
    embedding_eager_load: bool = False
    advisory_supported_languages: str = "en,fil,ceb,ilo,hil,war"

    # ML Admin Secret
    ml_secret_token: str = ""

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""

    class Config:
        env_file = (str(env_path), str(env_path.with_name(".env.local")))
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
