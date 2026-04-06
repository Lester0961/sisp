from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    app_name: str = "SISP ML Service — ARIA"
    app_version: str = "1.0.0"
    port: int = 8000
    debug: bool = False

    # Database
    database_url: str = ""

    # Groq API
    groq_api_key: str = ""

    # ML Config
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dimension: int = 384
    confidence_threshold: float = 0.7

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()