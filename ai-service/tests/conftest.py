import pytest

from app.config import Settings
from app.services.chat import ChatService
from app.services.classifier import Classifier
from app.services.sessions import SessionStore


@pytest.fixture(scope="session")
def settings():
    return Settings()


@pytest.fixture(scope="session")
def classifier(settings):
    # Trains from the bundled sample CSV: no API key, no network, no saved file needed.
    return Classifier.load_or_train(settings)


@pytest.fixture()
def chat(classifier, settings):
    """A fresh chat service with its own empty session store for every test."""
    return ChatService(classifier, SessionStore(ttl_seconds=1800), settings)
