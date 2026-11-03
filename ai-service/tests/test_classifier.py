import pytest

from app.categories import CATEGORIES, CATEGORY_SET

EXAMPLES = [
    ("Water leaking below the kitchen sink", "plumber"),
    ("There is water leaking below the kitchen sink.", "plumber"),
    ("I need new wiring and switches in a room.", "electrician"),
    ("A wooden door hinge is broken.", "carpenter"),
    ("The wall needs repainting.", "painter"),
    ("Need deep cleaning of the whole flat", "cleaner"),
    ("The lawn needs mowing and the hedge needs cutting", "gardener"),
    ("Need a driver for my car every morning", "driver"),
    ("Need a nurse for my bedridden grandfather", "caregiver"),
    ("Please install two CCTV cameras outside the shop", "technician"),
    ("Need a maid to do daily chores and wash dishes", "domestic-helper"),
    ("Need bricks and cement work to build a new room", "mason"),
    ("My refrigerator is not cooling at all", "appliance-repair"),
]


@pytest.mark.parametrize("text,expected", EXAMPLES)
def test_clear_requests_are_classified_without_asking(classifier, text, expected):
    result = classifier.classify(text)
    assert result.category == expected
    assert result.needs_clarification is False
    assert result.clarifying_question is None
    assert result.confidence >= 0.60
    assert result.reason


def test_clear_plumber_description(classifier):
    result = classifier.classify("Water leaking below the kitchen sink")
    assert result.category == "plumber"
    assert "leak" in result.reason.lower()


def test_clear_electrician_description(classifier):
    result = classifier.classify("I need new wiring and switches in a room")
    assert result.category == "electrician"


def test_ambiguous_appliance_or_technician_asks_for_clarification(classifier):
    result = classifier.classify("My washing machine is not starting.")
    assert result.needs_clarification is True
    assert result.clarifying_question
    top_two = {result.category} | {a.category for a in result.alternatives[:1]}
    assert top_two == {"appliance-repair", "technician"}


def test_two_close_categories_ask_which_one(classifier):
    result = classifier.classify("bathroom tile is leaking")
    assert result.needs_clarification is True
    assert "plumber" in result.clarifying_question and "mason" in result.clarifying_question


@pytest.mark.parametrize("text", ["asdf qwerty", "what is the weather today", "something is broken at home"])
def test_unknown_text_falls_back_to_a_clarifying_question(classifier, text):
    result = classifier.classify(text)
    assert result.category is None
    assert result.confidence == 0.0
    assert result.needs_clarification is True
    assert result.clarifying_question


def test_low_confidence_always_asks(classifier, settings):
    for text in ["need someone", "I want to buy a car", "my fan is not working", "fix it"]:
        result = classifier.classify(text)
        if result.confidence < settings.confidence_threshold:
            assert result.needs_clarification is True


def test_only_canonical_slugs_are_ever_returned(classifier):
    samples = [t for t, _ in EXAMPLES] + [
        "asdf", "hello", "need someone", "tile leak", "tv not working", "बिजली का स्विच खराब है",
    ]
    for text in samples:
        result = classifier.classify(text)
        if result.category is not None:
            assert result.category in CATEGORY_SET
        for alt in result.alternatives:
            assert alt.category in CATEGORY_SET


def test_confidence_values_are_between_zero_and_one(classifier):
    for text in ["Water leaking", "asdf", "My washing machine is not starting", "need someone"]:
        result = classifier.classify(text)
        assert 0.0 <= result.confidence <= 1.0
        for alt in result.alternatives:
            assert 0.0 <= alt.confidence <= 1.0


def test_excluded_categories_are_never_returned(classifier):
    result = classifier.classify("bathroom tile is leaking", exclude={"plumber"})
    assert result.category != "plumber"


def test_every_category_is_learnable(classifier):
    # Guards against a typo in the category list or the training CSV.
    seen = set(classifier.pipeline.classes_)
    assert seen == set(CATEGORIES)
