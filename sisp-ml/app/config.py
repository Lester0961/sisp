from functools import lru_cache
from pathlib import Path

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
    groq_model: str = "qwen/qwen3.6-27b"
    gemini_model: str = "gemini-3.5-flash"
    openrouter_model: str = "openrouter/free"
    llm_provider_order: str = "groq,gemini,openrouter"
    llm_request_timeout_seconds: float = 18.0
    llm_max_tokens: int = 900
    groq_enabled: bool = True
    gemini_enabled: bool = True
    openrouter_enabled: bool = True

    # ML Config
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dimension: int = 384
    confidence_threshold: float = 0.7
    advisory_supported_languages: str = "en,fil,ceb,ilo,hil,war"

    # ML Admin Secret
    ml_secret_token: str = "local-ml-service-only"

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""

    class Config:
        env_file = str(env_path)
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
