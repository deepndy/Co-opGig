"""HTTP-level tests (the FastAPI layer).

These need `fastapi` and `httpx` installed (see requirements-dev.txt). If they
are missing the whole file is skipped, so run `pip install -r requirements-dev.txt`
to include it.
"""
import pytest

pytest.importorskip("fastapi")
pytest.importorskip("httpx")

from fastapi.testclient import TestClient  # noqa: E402

from app.categories import CATEGORY_SET  # noqa: E402
from app.main import create_app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(create_app()) as test_client:
        yield test_client


def test_health_reports_status_and_model_version(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "ok"
    assert data["modelVersion"]
    assert data["llmEnabled"] is False


def test_classify_clear_plumber(client):
    response = client.post(
        "/api/v1/classify",
        json={"description": "Water leaking below the kitchen sink", "imageUrl": None, "locale": "en-IN"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["category"] == "plumber"
    assert data["needsClarification"] is False
    assert data["clarifyingQuestion"] is None
    assert 0.0 <= data["confidence"] <= 1.0
    assert set(data) >= {"category", "confidence", "alternatives", "needsClarification", "clarifyingQuestion", "reason"}


def test_classify_clear_electrician(client):
    response = client.post("/api/v1/classify", json={"description": "I need new wiring and switches in a room"})
    assert response.json()["data"]["category"] == "electrician"


def test_classify_ambiguous_appliance_asks_a_question(client):
    response = client.post("/api/v1/classify", json={"description": "My washing machine is not starting"})
    data = response.json()["data"]
    assert data["needsClarification"] is True
    assert data["clarifyingQuestion"]


def test_classify_unknown_text_asks_a_question(client):
    data = client.post("/api/v1/classify", json={"description": "asdf qwerty"}).json()["data"]
    assert data["category"] is None
    assert data["needsClarification"] is True
    assert data["clarifyingQuestion"]


def test_classify_only_returns_canonical_slugs(client):
    for text in ["leaking tap", "wiring", "tile crack", "cook needed", "hello"]:
        data = client.post("/api/v1/classify", json={"description": text}).json()["data"]
        if data["category"] is not None:
            assert data["category"] in CATEGORY_SET
        assert all(a["category"] in CATEGORY_SET for a in data["alternatives"])


@pytest.mark.parametrize("body", [{"description": ""}, {"description": "   "}, {"description": "x" * 5000}, {}])
def test_empty_or_oversized_description_is_rejected(client, body):
    response = client.post("/api/v1/classify", json=body)
    assert response.status_code in (413, 422)
    error = response.json()["error"]
    assert error["code"] in ("VALIDATION_ERROR", "PAYLOAD_TOO_LARGE")
    assert error["message"]


def test_malformed_json_uses_the_error_format(client):
    response = client.post("/api/v1/classify", content="{not json", headers={"content-type": "application/json"})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_validation_error_does_not_echo_input(client):
    response = client.post("/api/v1/classify", json={"description": "secret-9876543210 " * 200})
    assert "9876543210" not in response.text


def test_unknown_route_uses_the_error_format(client):
    response = client.get("/nope")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_chat_session_flow_matches_the_contract(client):
    payload = {
        "sessionId": None,
        "message": "There is a short circuit in my room",
        "jobContext": {"locationText": "Kothrud", "category": None},
        "locale": "en-IN",
    }
    first = client.post("/api/v1/chat", json=payload).json()["data"]
    assert first["sessionId"]
    assert first["suggestedCategory"] == "electrician"
    assert first["nextAction"] == "ASK_QUESTION"
    assert first["needsClarification"] is True
    fields = first["extractedFields"]
    assert fields["description"] == "There is a short circuit in my room"
    assert fields["category"] == "electrician"
    assert fields["locationText"] == "Kothrud"
    assert "urgency" in fields

    second = client.post(
        "/api/v1/chat",
        json={"sessionId": first["sessionId"], "message": "yes", "jobContext": {"locationText": "Kothrud"}},
    ).json()["data"]
    assert second["sessionId"] == first["sessionId"]
    assert second["nextAction"] in ("ASK_QUESTION", "PREFILL_FORM")


def test_chat_rejects_empty_message_and_bad_category(client):
    assert client.post("/api/v1/chat", json={"message": ""}).status_code == 422
    bad = client.post("/api/v1/chat", json={"message": "hi", "jobContext": {"category": "wizard"}})
    assert bad.status_code == 422


def test_chat_emergency_returns_safety_advice(client):
    data = client.post("/api/v1/chat", json={"message": "I can smell gas in my kitchen"}).json()["data"]
    assert data["nextAction"] == "SAFETY_ADVICE"
    assert "112" in data["reply"]


def test_session_reset(client):
    first = client.post("/api/v1/chat", json={"message": "Water leaking below the kitchen sink"}).json()["data"]
    response = client.post("/api/v1/session/reset", json={"sessionId": first["sessionId"]})
    assert response.status_code == 200
    assert response.json()["data"] == {"sessionId": first["sessionId"], "reset": True}
    again = client.post("/api/v1/session/reset", json={"sessionId": first["sessionId"]})
    assert again.status_code == 200  # idempotent


def test_cors_is_off_by_default(client):
    response = client.options(
        "/api/v1/chat",
        headers={"Origin": "http://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in {k.lower() for k in response.headers}
