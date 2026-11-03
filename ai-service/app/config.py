"""Service settings, read from environment variables.

Nothing here is secret. There is intentionally NO required API key: the service
runs fully offline with the built-in classifier.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import List

BASE_DIR = Path(__file__).resolve().parent


def _float(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def _int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


@dataclass(frozen=True)
class Settings:
    service_name: str = "co-opgig-ai-service"
    model_version: str = "baseline-tfidf-lr-keywords-0.1.0"

    # Decision thresholds. Starting points, NOT scientific guarantees.
    confidence_threshold: float = 0.60   # below this -> ask a clarifying question
    margin_threshold: float = 0.15       # top-2 closer than this -> ask
    pair_margin_threshold: float = 0.40  # stricter margin for confusable pairs
    unknown_below: float = 0.30          # below this -> "I can't tell" fallback

    # Input limits.
    max_text_chars: int = 1000
    max_body_bytes: int = 16 * 1024
    request_timeout_seconds: float = 15.0

    # Session retention (in memory only, never written to disk).
    session_ttl_minutes: int = 30
    max_sessions: int = 5000

    # CORS is OFF unless origins are listed (production should go via core backend).
    cors_origins: List[str] = field(default_factory=list)

    # Optional generative provider. Only "none" is implemented in this version.
    llm_provider: str = "none"

    training_data_path: Path = BASE_DIR / "data" / "sample_training_data.csv"
    model_path: Path = BASE_DIR / "models" / "classifier.joblib"

    @classmethod
    def from_env(cls) -> "Settings":
        origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
        return cls(
            model_version=os.environ.get("AI_MODEL_VERSION", cls.model_version),
            confidence_threshold=_float("CONFIDENCE_THRESHOLD", cls.confidence_threshold),
            margin_threshold=_float("MARGIN_THRESHOLD", cls.margin_threshold),
            pair_margin_threshold=_float("PAIR_MARGIN_THRESHOLD", cls.pair_margin_threshold),
            unknown_below=_float("UNKNOWN_BELOW", cls.unknown_below),
            max_text_chars=_int("MAX_TEXT_CHARS", cls.max_text_chars),
            max_body_bytes=_int("MAX_BODY_BYTES", cls.max_body_bytes),
            request_timeout_seconds=_float("REQUEST_TIMEOUT_SECONDS", cls.request_timeout_seconds),
            session_ttl_minutes=_int("SESSION_TTL_MINUTES", cls.session_ttl_minutes),
            max_sessions=_int("MAX_SESSIONS", cls.max_sessions),
            cors_origins=origins,
            llm_provider=os.environ.get("LLM_PROVIDER", "none").strip().lower() or "none",
            training_data_path=Path(os.environ.get("TRAINING_DATA_PATH", str(cls.training_data_path))),
            model_path=Path(os.environ.get("MODEL_PATH", str(cls.model_path))),
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings.from_env()
