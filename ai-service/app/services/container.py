"""Builds the long-lived objects once (classifier, sessions, chat service)."""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from ..config import Settings, get_settings
from .chat import ChatService
from .classifier import Classifier
from .llm_adapter import LLMProvider, get_provider
from .sessions import SessionStore


@dataclass
class Services:
    settings: Settings
    classifier: Classifier
    store: SessionStore
    chat: ChatService
    llm: LLMProvider


def build_services(settings: Settings) -> Services:
    classifier = Classifier.load_or_train(settings)
    store = SessionStore(
        ttl_seconds=settings.session_ttl_minutes * 60,
        max_sessions=settings.max_sessions,
    )
    return Services(
        settings=settings,
        classifier=classifier,
        store=store,
        chat=ChatService(classifier, store, settings),
        llm=get_provider(settings.llm_provider),
    )


@lru_cache(maxsize=1)
def get_services() -> Services:
    return build_services(get_settings())
