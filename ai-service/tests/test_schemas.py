"""Input validation: empty / oversized text is rejected, odd input is tolerated."""
import pytest
from pydantic import ValidationError

from app.config import get_settings
from app.schemas.models import ChatRequest, ClassifyRequest, JobContext, ResetRequest


def test_valid_classify_request_is_cleaned():
    req = ClassifyRequest(description="  Water   leaking\n below the sink  ")
    assert req.description == "Water leaking below the sink"
    assert req.locale == "en-IN"
    assert req.imageUrl is None


@pytest.mark.parametrize("bad", ["", "   ", "\n\t "])
def test_empty_description_is_rejected(bad):
    with pytest.raises(ValidationError):
        ClassifyRequest(description=bad)


def test_oversized_description_is_rejected():
    too_long = "a" * (get_settings().max_text_chars + 1)
    with pytest.raises(ValidationError):
        ClassifyRequest(description=too_long)


def test_description_at_the_limit_is_accepted():
    ClassifyRequest(description="a" * get_settings().max_text_chars)


def test_missing_or_wrong_type_description_is_rejected():
    with pytest.raises(ValidationError):
        ClassifyRequest()
    with pytest.raises(ValidationError):
        ClassifyRequest(description=123)


def test_empty_and_oversized_chat_message_are_rejected():
    with pytest.raises(ValidationError):
        ChatRequest(message="   ")
    with pytest.raises(ValidationError):
        ChatRequest(message="x" * (get_settings().max_text_chars + 1))


def test_image_url_must_be_http_or_https():
    assert ClassifyRequest(description="leak", imageUrl="https://example.com/a.jpg").imageUrl
    for bad in ["file:///etc/passwd", "javascript:alert(1)", "not a url", "ftp://x/y"]:
        with pytest.raises(ValidationError):
            ClassifyRequest(description="leak", imageUrl=bad)


def test_job_context_category_must_be_canonical():
    assert JobContext(category="Plumber").category == "plumber"
    assert JobContext(category="").category is None
    with pytest.raises(ValidationError):
        JobContext(category="wizard")


def test_session_id_format_is_checked():
    assert ChatRequest(message="hi", sessionId=None).sessionId is None
    assert ChatRequest(message="hi", sessionId="abc12345-def").sessionId
    for bad in ["short", "has spaces in it", "x" * 65, "../../etc"]:
        with pytest.raises(ValidationError):
            ChatRequest(message="hi", sessionId=bad)
    with pytest.raises(ValidationError):
        ResetRequest(sessionId="bad id")


def test_locale_format_is_checked_and_extra_fields_are_ignored():
    with pytest.raises(ValidationError):
        ClassifyRequest(description="leak", locale="english please")
    req = ClassifyRequest(description="leak", somethingNew=True)
    assert not hasattr(req, "somethingNew")


def test_validation_errors_do_not_echo_user_text():
    secret = "my-phone-9876543210 " * 100  # also too long
    with pytest.raises(ValidationError) as info:
        ClassifyRequest(description=secret)
    assert "9876543210" not in str([{k: v for k, v in e.items() if k != "input"} for e in info.value.errors()])
