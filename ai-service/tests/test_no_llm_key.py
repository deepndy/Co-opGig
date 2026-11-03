"""The service must work with no paid LLM key configured anywhere."""
import os

import pytest

from app.config import Settings
from app.services.container import build_services
from app.services.llm_adapter import NullProvider, get_provider

KEY_VARIABLES = [
    "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_API_KEY", "GEMINI_API_KEY",
    "AZURE_OPENAI_API_KEY", "LLM_API_KEY", "LLM_PROVIDER",
]


@pytest.fixture()
def no_keys(monkeypatch):
    for name in KEY_VARIABLES:
        monkeypatch.delenv(name, raising=False)


def test_service_builds_and_answers_with_no_keys(no_keys):
    for name in KEY_VARIABLES:
        assert name not in os.environ
    services = build_services(Settings.from_env())
    assert services.llm.enabled is False
    assert services.llm.name == "none"

    result = services.classifier.classify("Water leaking below the kitchen sink")
    assert result.category == "plumber"

    out = services.chat.handle("I need new wiring and switches in a room")
    assert out.suggested_category == "electrician"
    assert out.reply


def test_unknown_provider_falls_back_instead_of_breaking(no_keys, monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "some-future-provider")
    monkeypatch.setenv("LLM_API_KEY", "not-a-real-key")
    settings = Settings.from_env()
    provider = get_provider(settings.llm_provider)
    assert isinstance(provider, NullProvider)
    services = build_services(settings)
    assert services.chat.handle("my sink is leaking").suggested_category == "plumber"


def test_source_code_contains_no_hard_coded_keys():
    import pathlib
    import re

    root = pathlib.Path(__file__).resolve().parents[1]
    pattern = re.compile(r"(sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_\-]{30,}|api[_-]?key\s*=\s*['\"][^'\"]{12,})")
    for path in list(root.rglob("*.py")) + list(root.rglob("*.example")):
        if "tests" in path.parts:
            continue
        assert not pattern.search(path.read_text(encoding="utf-8")), path
