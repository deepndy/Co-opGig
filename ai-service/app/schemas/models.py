"""Request / response models (pydantic v2).

Field names are camelCase on purpose so they match the JSON contract exactly.
Optional is used instead of `X | None` so the code also runs on Python 3.9/3.10.
"""
from __future__ import annotations

import re
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, field_validator

from ..categories import CATEGORY_SET
from ..config import get_settings
from ..services.text import clean_text

_SESSION_ID = re.compile(r"^[A-Za-z0-9_-]{8,64}$")
_LOCALE = re.compile(r"^[A-Za-z]{2,3}([-_][A-Za-z0-9]{2,8})?$")


def _clean_required_text(value: str, field_name: str) -> str:
    cleaned = clean_text(value)
    if not cleaned:
        raise ValueError(f"{field_name} must not be empty")
    limit = get_settings().max_text_chars
    if len(cleaned) > limit:
        raise ValueError(f"{field_name} must be at most {limit} characters")
    return cleaned


def _check_locale(value: Optional[str]) -> Optional[str]:
    if value is None:
        return value
    value = value.strip()
    if not _LOCALE.match(value):
        raise ValueError("locale must look like 'en-IN'")
    return value


class _Base(BaseModel):
    # Unknown extra fields are ignored so small contract additions don't break callers.
    model_config = ConfigDict(extra="ignore")


# ---------------------------------------------------------------- requests
class ClassifyRequest(_Base):
    description: str
    imageUrl: Optional[str] = None  # accepted, validated, NEVER fetched or stored in v1
    locale: Optional[str] = "en-IN"

    @field_validator("description")
    @classmethod
    def _description(cls, v: str) -> str:
        return _clean_required_text(v, "description")

    @field_validator("imageUrl")
    @classmethod
    def _image(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        v = v.strip()
        if len(v) > 2048 or not re.match(r"^https?://\S+$", v):
            raise ValueError("imageUrl must be an http(s) URL of at most 2048 characters")
        return v

    @field_validator("locale")
    @classmethod
    def _locale(cls, v: Optional[str]) -> Optional[str]:
        return _check_locale(v)


class JobContext(_Base):
    locationText: Optional[str] = None
    category: Optional[str] = None

    @field_validator("locationText")
    @classmethod
    def _location(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = clean_text(v)
        if len(v) > 120:
            raise ValueError("locationText must be at most 120 characters")
        return v or None

    @field_validator("category")
    @classmethod
    def _category(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip().lower()
        if not v:
            return None
        if v not in CATEGORY_SET:
            raise ValueError("category must be one of the supported category slugs")
        return v


class ChatRequest(_Base):
    sessionId: Optional[str] = None
    message: str
    jobContext: Optional[JobContext] = None
    locale: Optional[str] = "en-IN"

    @field_validator("sessionId")
    @classmethod
    def _session(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if not _SESSION_ID.match(v):
            raise ValueError("sessionId has an invalid format")
        return v

    @field_validator("message")
    @classmethod
    def _message(cls, v: str) -> str:
        return _clean_required_text(v, "message")

    @field_validator("locale")
    @classmethod
    def _locale(cls, v: Optional[str]) -> Optional[str]:
        return _check_locale(v)


class ResetRequest(_Base):
    sessionId: str

    @field_validator("sessionId")
    @classmethod
    def _session(cls, v: str) -> str:
        if not _SESSION_ID.match(v):
            raise ValueError("sessionId has an invalid format")
        return v


# --------------------------------------------------------------- responses
class Alternative(BaseModel):
    category: str
    confidence: float


class ClassifyData(BaseModel):
    category: Optional[str]
    confidence: float
    alternatives: List[Alternative]
    needsClarification: bool
    clarifyingQuestion: Optional[str]
    reason: str
    # Additive field (not in the original contract): null when nothing risky was found.
    safetyNotice: Optional[str] = None


class ClassifyResponse(BaseModel):
    data: ClassifyData


class ExtractedFields(BaseModel):
    description: Optional[str]
    category: Optional[str]
    locationText: Optional[str]
    urgency: Optional[str]


class ChatData(BaseModel):
    sessionId: str
    reply: str
    suggestedCategory: Optional[str]
    confidence: float
    needsClarification: bool
    nextAction: str
    extractedFields: ExtractedFields
    # Additive fields (not in the original contract). Safe for clients to ignore.
    alternatives: List[Alternative] = []
    safetyNotice: Optional[str] = None


class ChatResponse(BaseModel):
    data: ChatData


class ResetData(BaseModel):
    sessionId: str
    reset: bool


class ResetResponse(BaseModel):
    data: ResetData


class HealthData(BaseModel):
    status: str
    service: str
    modelVersion: str
    classifier: str
    llmProvider: str
    llmEnabled: bool


class HealthResponse(BaseModel):
    data: HealthData


class ErrorDetail(BaseModel):
    field: Optional[str] = None
    message: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: Optional[List[ErrorDetail]] = None


class ErrorResponse(BaseModel):
    error: ErrorBody
