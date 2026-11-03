"""Canonical Co-opGig worker categories.

This is the ONLY place where category slugs are defined. Every other module
imports from here, so the service can never return a slug that is not in this
list. The list is identical to the one in the Task 02 brief.
"""
from __future__ import annotations

CATEGORIES = (
    "electrician",
    "plumber",
    "carpenter",
    "painter",
    "cleaner",
    "gardener",
    "driver",
    "caregiver",
    "technician",
    "domestic-helper",
    "mason",
    "appliance-repair",
)

CATEGORY_SET = frozenset(CATEGORIES)

# "a plumber", "an electrician" ... used inside chat sentences.
CATEGORY_LABELS = {
    "electrician": "an electrician",
    "plumber": "a plumber",
    "carpenter": "a carpenter",
    "painter": "a painter",
    "cleaner": "a cleaner",
    "gardener": "a gardener",
    "driver": "a driver",
    "caregiver": "a caregiver",
    "technician": "a technician",
    "domestic-helper": "a domestic helper",
    "mason": "a mason",
    "appliance-repair": "an appliance repair technician",
}

# Plain names without an article.
CATEGORY_NOUNS = {
    "electrician": "electrician",
    "plumber": "plumber",
    "carpenter": "carpenter",
    "painter": "painter",
    "cleaner": "cleaner",
    "gardener": "gardener",
    "driver": "driver",
    "caregiver": "caregiver",
    "technician": "technician",
    "domestic-helper": "domestic helper",
    "mason": "mason",
    "appliance-repair": "appliance repair",
}

# Pairs of categories that real users often cannot tell apart. For these the
# classifier asks a follow-up unless one side is clearly ahead.
CONFUSABLE_PAIRS = frozenset(
    {
        frozenset({"appliance-repair", "technician"}),
    }
)


def is_valid_category(value: object) -> bool:
    return isinstance(value, str) and value in CATEGORY_SET
