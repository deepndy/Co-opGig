"""Small text helpers shared by the classifier, safety checks and chat logic."""
from __future__ import annotations

import re

_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_SPACES = re.compile(r"\s+")


def clean_text(value: str) -> str:
    """Remove control characters, collapse whitespace, strip the ends."""
    return _SPACES.sub(" ", _CONTROL.sub(" ", value)).strip()


def normalize(value: str) -> str:
    """Lower-case text used for matching. Hyphens/underscores become spaces so
    'short-circuit' and 'short circuit' match the same rule."""
    return clean_text(value).lower().replace("-", " ").replace("_", " ")
