"""HTTP endpoints. Kept deliberately thin: all logic lives in app/services."""
from __future__ import annotations

from fastapi import APIRouter

from ..schemas.models import (
    Alternative,
    ChatData,
    ChatRequest,
    ChatResponse,
    ClassifyData,
    ClassifyRequest,
    ClassifyResponse,
    ExtractedFields,
    HealthData,
    HealthResponse,
    ResetData,
    ResetRequest,
    ResetResponse,
)
from ..services.container import get_services
from ..services.safety import NONE, assess

health_router = APIRouter()
v1_router = APIRouter(prefix="/api/v1")


@health_router.get("/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    services = get_services()
    return HealthResponse(
        data=HealthData(
            status="ok",
            service=services.settings.service_name,
            modelVersion=services.settings.model_version,
            classifier="tfidf-logistic-regression + keyword rules",
            llmProvider=services.llm.name,
            llmEnabled=services.llm.enabled,
        )
    )


@v1_router.post("/classify", response_model=ClassifyResponse, tags=["classify"])
def classify(request: ClassifyRequest) -> ClassifyResponse:
    services = get_services()
    result = services.classifier.classify(request.description)
    safety = assess(request.description)
    return ClassifyResponse(
        data=ClassifyData(
            category=result.category,
            confidence=result.confidence,
            alternatives=[Alternative(category=a.category, confidence=a.confidence) for a in result.alternatives],
            needsClarification=result.needs_clarification,
            clarifyingQuestion=result.clarifying_question,
            reason=result.reason,
            safetyNotice=safety.notice if safety.level != NONE else None,
        )
    )


@v1_router.post("/chat", response_model=ChatResponse, tags=["chat"])
def chat(request: ChatRequest) -> ChatResponse:
    services = get_services()
    context = request.jobContext
    outcome = services.chat.handle(
        message=request.message,
        session_id=request.sessionId,
        location_text=context.locationText if context else None,
        category=context.category if context else None,
    )
    return ChatResponse(
        data=ChatData(
            sessionId=outcome.session_id,
            reply=outcome.reply,
            suggestedCategory=outcome.suggested_category,
            confidence=outcome.confidence,
            needsClarification=outcome.needs_clarification,
            nextAction=outcome.next_action,
            extractedFields=ExtractedFields(
                description=outcome.description,
                category=outcome.category,
                locationText=outcome.location_text,
                urgency=outcome.urgency,
            ),
            alternatives=[Alternative(category=c, confidence=p) for c, p in outcome.alternatives],
            safetyNotice=outcome.safety_notice,
        )
    )


@v1_router.post("/session/reset", response_model=ResetResponse, tags=["chat"])
def reset_session(request: ResetRequest) -> ResetResponse:
    """Delete a conversation session. Safe to call for an unknown or expired id."""
    get_services().chat.reset(request.sessionId)
    return ResetResponse(data=ResetData(sessionId=request.sessionId, reset=True))
