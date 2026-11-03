import re

import pytest

from app.services.safety import CAUTION, EMERGENCY, NONE, assess

EMERGENCIES = [
    "I can smell gas in my kitchen",
    "There is an LPG cylinder leak near the stove",
    "My wall socket gave me an electric shock",
    "The wiring caught fire",
    "There is smoke coming from the switchboard",
    "A live wire has fallen outside my gate",
    "Water is leaking into the switchboard",
    "my grandfather is unconscious",
]

CAUTIONS = [
    "There is a short circuit in my room",
    "The socket is sparking",
    "I get a burning smell from the fan",
    "The pipe burst in the bathroom",
]

SAFE = [
    "Water leaking below the kitchen sink",
    "I need new wiring and switches in a room",
    "The wall needs repainting",
    "Need a cook for lunch and dinner",
]


@pytest.mark.parametrize("text", EMERGENCIES)
def test_emergencies_are_detected(text):
    assert assess(text).level == EMERGENCY


@pytest.mark.parametrize("text", CAUTIONS)
def test_hazards_get_a_caution(text):
    assert assess(text).level == CAUTION


@pytest.mark.parametrize("text", SAFE)
def test_normal_requests_are_not_flagged(text):
    result = assess(text)
    assert result.level == NONE
    assert result.notice == ""


def test_hyphenated_text_is_matched():
    assert assess("There is a short-circuit in my room").level == CAUTION


def test_self_harm_gets_a_support_message_not_a_booking_flow():
    result = assess("I want to die")
    assert result.level == EMERGENCY
    assert "112" in result.notice and "14416" in result.notice


REPAIR_WORDS = re.compile(
    r"\b(unscrew|screw|rewire|reconnect|disconnect|tighten|replace the|turn off the|switch off the|"
    r"remove the|open the|step 1|first,|then )\b",
    re.IGNORECASE,
)


@pytest.mark.parametrize("text", EMERGENCIES + CAUTIONS)
def test_safety_notices_never_contain_repair_instructions(text):
    notice = assess(text).notice
    assert notice
    assert not REPAIR_WORDS.search(notice)
    assert "don't try to" in notice.lower() or "do not try to" in notice.lower() or "attempt repairs" in notice.lower() or "112" in notice


@pytest.mark.parametrize("text", EMERGENCIES)
def test_emergency_notices_say_keep_away_and_name_an_emergency_service(text):
    notice = assess(text).notice
    assert "move away" in notice
    assert "112" in notice
