import os
from pathlib import Path
from typing import Tuple
from dotenv import dotenv_values
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE_PATH = Path(os.environ.get("MEDCONNECT_ENV_FILE") or (BACKEND_DIR / ".env"))


class Settings(BaseSettings):
    """Application settings loaded from backend/.env and environment variables."""

    model_config = SettingsConfigDict(env_file=str(ENV_FILE_PATH), extra="ignore")

    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"
    GEMINI_CHAT_TIMEOUT_SECONDS: float = 45.0
    GEMINI_REPORT_TIMEOUT_SECONDS: float = 90.0
    UPLOAD_TIMEOUT_SECONDS: float = 30.0

    DATABASE_URL: str = "sqlite:///./medconnect.db"
    UPLOAD_DIR: str = "app/storage/uploads"
    MAX_UPLOAD_SIZE: int = 20971520  # 20 MB

    CORS_ORIGINS: str = "http://localhost:5173"


def get_settings() -> Settings:
    """Return fresh settings anchored to backend/.env (restarting backend is still recommended after .env edits)."""
    return Settings()


def resolve_gemini_config() -> Tuple[str, str, bool]:
    """Resolve authoritative Gemini config strictly using GEMINI_API_KEY.

    Precedence:
      1. GEMINI_API_KEY defined in backend/.env (authoritative local config)
      2. GEMINI_API_KEY defined in process environment

    GOOGLE_API_KEY is never used as an override; if present in os.environ,
    we report `google_key_present=True` so callers can neutralize it cleanly.
    """
    dotenv_map = dotenv_values(ENV_FILE_PATH) if ENV_FILE_PATH.exists() else {}

    dot_key = (dotenv_map.get("GEMINI_API_KEY") or "").strip()
    env_key = (os.environ.get("GEMINI_API_KEY") or "").strip()
    api_key = dot_key or env_key

    dot_model = (dotenv_map.get("GEMINI_MODEL") or "").strip()
    env_model = (os.environ.get("GEMINI_MODEL") or "").strip()
    model_name = dot_model or env_model or "gemini-3.8-flash"

    google_key_present = bool((os.environ.get("GOOGLE_API_KEY") or "").strip())
    return api_key, model_name, google_key_present


def _read_float_setting(name: str, default: float) -> float:
    dotenv_map = dotenv_values(ENV_FILE_PATH) if ENV_FILE_PATH.exists() else {}
    raw = (dotenv_map.get(name) or os.environ.get(name) or "").strip()
    if raw:
        try:
            val = float(raw)
            if val > 0:
                return val
        except ValueError:
            pass
    return default


def get_timeout_config() -> Tuple[float, float, float]:
    """Return (chat_timeout_seconds, report_timeout_seconds, upload_timeout_seconds)."""
    return (
        _read_float_setting("GEMINI_CHAT_TIMEOUT_SECONDS", 45.0),
        _read_float_setting("GEMINI_REPORT_TIMEOUT_SECONDS", 90.0),
        _read_float_setting("UPLOAD_TIMEOUT_SECONDS", 30.0),
    )
