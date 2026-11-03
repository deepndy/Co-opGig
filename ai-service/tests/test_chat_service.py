"""Chat flow tests that run on the service logic directly (no web server needed)."""
import re

from app.categories import CATEGORY_SET
from app.services.chat import ASK_QUESTION, PREFILL_FORM, SAFETY_ADVICE

VALID_ACTIONS = {ASK_QUESTION, PREFILL_FORM, SAFETY_ADVICE}


def test_first_message_creates_a_session_and_the_id_stays_stable(chat):
    first = chat.handle("There is a short circuit in my room")
    assert first.session_id
    second = chat.handle("it is in the bedroom", session_id=first.session_id)
    third = chat.handle("yes", session_id=second.session_id)
    assert first.session_id == second.session_id == third.session_id


def test_spec_example_short_circuit_in_kothrud(chat):
    out = chat.handle("There is a short circuit in my room", location_text="Kothrud")
    assert out.suggested_category == "electrician"
    assert out.category == "electrician"
    assert out.location_text == "Kothrud"
    assert out.needs_clarification is True  # safety-related: ask the user to confirm
    assert out.next_action == ASK_QUESTION
    assert "electrician" in out.reply.lower()
    assert out.description == "There is a short circuit in my room"
    assert out.safety_notice


def test_full_happy_path_ends_in_prefill_and_never_books(chat):
    out = chat.handle("Water leaking below the kitchen sink")
    assert out.suggested_category == "plumber"
    assert out.needs_clarification is False
    assert out.next_action == ASK_QUESTION  # asks for the locality
    assert "locality" in out.reply.lower()

    out = chat.handle("Kothrud", session_id=out.session_id)
    assert out.location_text == "Kothrud"
    assert out.next_action == ASK_QUESTION  # asks for urgency

    out = chat.handle("urgent please", session_id=out.session_id)
    assert out.next_action == PREFILL_FORM
    assert out.urgency == "high"
    assert out.category == "plumber"
    assert out.description == "Water leaking below the kitchen sink"
    assert "nothing has been booked" in out.reply.lower()
    assert "confirm the booking yourself" in out.reply.lower()


def test_user_can_skip_locality_and_urgency(chat):
    out = chat.handle("Need the whole house painted")
    out = chat.handle("skip", session_id=out.session_id)
    assert "how soon" in out.reply.lower()
    out = chat.handle("not sure", session_id=out.session_id)
    assert out.next_action == PREFILL_FORM
    assert out.location_text is None and out.urgency is None


def test_ambiguous_appliance_then_user_answers(chat):
    out = chat.handle("My washing machine is not starting")
    assert out.needs_clarification is True
    assert out.next_action == ASK_QUESTION
    assert out.suggested_category in ("appliance-repair", "technician")
    assert "household appliance" in out.reply.lower()

    out = chat.handle("it is a household appliance", session_id=out.session_id)
    assert out.category == "appliance-repair"
    assert out.needs_clarification is False
    assert out.confidence == 1.0  # the user confirmed it


def test_user_can_pick_the_technician_side(chat):
    out = chat.handle("My tv is not turning on")
    assert out.needs_clarification is True
    out = chat.handle("it is an electronics device, I want a technician", session_id=out.session_id)
    assert out.category == "technician"


def test_rejecting_a_suggestion_does_not_suggest_it_again(chat):
    out = chat.handle("I think my bathroom tile is leaking")
    assert out.needs_clarification is True
    out = chat.handle("no", session_id=out.session_id)
    assert out.category is None
    assert out.needs_clarification is True
    out = chat.handle("water is dripping from the ceiling in the bathroom", session_id=out.session_id)
    assert out.category != "plumber"


def test_bare_yes_to_an_either_or_question_asks_which_one(chat):
    out = chat.handle("bathroom tile is leaking")
    assert "plumber" in out.reply and "mason" in out.reply
    out = chat.handle("yes", session_id=out.session_id)
    assert out.needs_clarification is True
    assert out.category is None or out.confidence < 1.0


def test_greeting_gets_a_welcome_and_asks_what_service(chat):
    out = chat.handle("hi")
    assert "what service do you need" in out.reply.lower()
    assert out.suggested_category is None
    assert out.next_action == ASK_QUESTION
    assert out.description is None  # the greeting is not a job description


def test_unknown_request_asks_for_details_and_offers_manual_choice_later(chat):
    out = chat.handle("asdf qwerty")
    assert out.suggested_category is None
    assert out.needs_clarification is True
    out = chat.handle("hmm blah blah", session_id=out.session_id)
    out = chat.handle("zzz", session_id=out.session_id)
    assert "choose a category yourself" in out.reply.lower()


def test_user_selected_category_from_the_form_is_respected(chat):
    out = chat.handle("need help with my place", category="painter")
    assert out.category == "painter"
    assert out.confidence == 1.0
    assert "selected" in out.reply.lower()
    # A later AI guess must not override the user's choice.
    out = chat.handle("water leaking from the sink", session_id=out.session_id)
    assert out.category == "painter"


def test_gas_smell_gets_safety_advice_only(chat):
    out = chat.handle("I can smell gas in my kitchen")
    assert out.next_action == SAFETY_ADVICE
    assert out.needs_clarification is False
    assert out.urgency == "emergency"
    assert "112" in out.reply
    assert out.safety_notice


def test_emergency_reply_has_no_repair_steps(chat):
    for text in ["My wall socket gave me an electric shock", "The wiring caught fire", "I smell gas"]:
        out = chat.handle(text)
        assert out.next_action == SAFETY_ADVICE
        assert not re.search(r"\b(unscrew|rewire|disconnect|tighten|step 1)\b", out.reply, re.I)


def test_self_harm_message_is_not_stored_or_classified(chat):
    out = chat.handle("I want to die")
    assert out.next_action == SAFETY_ADVICE
    assert out.description is None
    assert out.suggested_category is None
    assert "14416" in out.reply


def test_every_response_has_the_fields_the_bubble_needs(chat):
    messages = [
        "hi", "Water leaking below the kitchen sink", "There is a short circuit in my room",
        "My washing machine is not starting", "asdf", "I can smell gas", "I need a mason",
    ]
    for text in messages:
        out = chat.handle(text)
        assert isinstance(out.session_id, str) and out.session_id
        assert isinstance(out.reply, str) and out.reply.strip()
        assert out.next_action in VALID_ACTIONS
        assert isinstance(out.needs_clarification, bool)
        assert 0.0 <= out.confidence <= 1.0
        if out.suggested_category is not None:
            assert out.suggested_category in CATEGORY_SET
        if out.category is not None:
            assert out.category in CATEGORY_SET


def test_prefill_reply_always_leaves_the_decision_to_the_user(chat):
    out = chat.handle("Need the whole house painted", location_text="Baner")
    out = chat.handle("urgent", session_id=out.session_id)
    assert out.next_action == PREFILL_FORM
    assert "nothing has been booked" in out.reply.lower()


def test_suggestions_mention_that_ai_can_be_wrong(chat):
    out = chat.handle("Water leaking below the kitchen sink")
    assert "can be wrong" in out.reply.lower()


def test_reset_clears_the_conversation(chat):
    out = chat.handle("Water leaking below the kitchen sink", location_text="Kothrud")
    sid = out.session_id
    assert chat.reset(sid) is True
    again = chat.handle("hi", session_id=sid)
    assert again.session_id == sid
    assert again.location_text is None
    assert again.suggested_category is None
    assert chat.reset("never-existed-id") is False  # safe to call twice / unknown id


def test_location_from_the_form_is_used_and_not_asked_again(chat):
    out = chat.handle("Water leaking below the kitchen sink", location_text="Kothrud")
    assert "how soon" in out.reply.lower()  # went straight to urgency


def test_urgency_words_inside_a_description_are_picked_up(chat):
    out = chat.handle("Urgent: water leaking below the kitchen sink", location_text="Kothrud")
    assert out.urgency == "high"
    assert out.next_action == PREFILL_FORM


def test_time_words_in_a_description_do_not_set_urgency(chat):
    out = chat.handle("My sink started leaking today", location_text="Kothrud")
    assert out.urgency is None
