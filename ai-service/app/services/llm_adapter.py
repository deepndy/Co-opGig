"""Optional generative-LLM adapter (extension point only).

The service does NOT need an LLM. The chat assistant is a structured,
template-based slot-filling assistant on top of the classifier. This module
exists so a provider can be plugged in later without changing the API:

  * Provider keys would be read from environment variables on the server only
    and are never returned to a client.
  * If the variable is missing or the provider is unknown, the service keeps
    working with the built-in assistant.

In this version only the "none" provider is implemented.
"""
from __future__ import annotations

import logging
from typing import Optional, Protocol

logger = logging.getLogger("coopgig.ai.llm")


class LLMProvider(Protocol):
    name: str
    enabled: bool

    def polish(self, reply: str) -> Optional[str]:
        """Return a reworded reply, or None to keep the template reply."""


class NullProvider:
    name = "none"
    enabled = False

    def polish(self, reply: str) -> Optional[str]:
        return None


def get_provider(provider_name: str) -> LLMProvider:
    if provider_name not in ("", "none"):
        logger.warning(
            "LLM_PROVIDER=%r is not implemented in this version; using the built-in assistant.",
            provider_name,
        )
    return NullProvider()
