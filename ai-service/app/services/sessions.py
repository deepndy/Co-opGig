"""Lightweight in-memory conversation sessions.

Privacy / retention:
  * Sessions live ONLY in this process's memory. Nothing is written to disk.
  * A session is deleted after SESSION_TTL_MINUTES without activity, on reset,
    or when the process restarts.
  * A session holds the user's description text, an optional locality text and
    the chosen category / urgency. It never holds phone numbers, images or
    user accounts (the service is never given them).
"""
from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Set


@dataclass
class SessionState:
    id: str
    created: float
    last_seen: float
    turns: int = 0

    # Collected "slots"
    parts: List[str] = field(default_factory=list)  # user's job-description messages
    category: Optional[str] = None
    category_source: Optional[str] = None  # "ai" | "user"
    confidence: float = 0.0
    location: Optional[str] = None
    urgency: Optional[str] = None  # low | normal | high | emergency

    # Conversation bookkeeping
    pending: Optional[str] = None  # confirm | choice | pair | location | urgency
    pending_candidates: List[str] = field(default_factory=list)
    last_question: Optional[str] = None
    rejected: Set[str] = field(default_factory=set)
    asked_location: bool = False
    asked_urgency: bool = False
    safety_level: str = "none"
    safety_confirmed: bool = False
    unknown_count: int = 0

    # Last suggestion shown while the category is still unconfirmed
    last_suggestion: Optional[str] = None
    last_confidence: float = 0.0
    last_alternatives: List[tuple] = field(default_factory=list)


class SessionStore:
    def __init__(
        self,
        ttl_seconds: float,
        max_sessions: int = 5000,
        clock: Callable[[], float] = time.monotonic,
    ):
        self.ttl = ttl_seconds
        self.max_sessions = max_sessions
        self._clock = clock
        self._sessions: Dict[str, SessionState] = {}
        # Re-entrant: ChatService holds it for a whole turn.
        self.lock = threading.RLock()

    def __len__(self) -> int:
        with self.lock:
            return len(self._sessions)

    def purge_expired(self) -> int:
        with self.lock:
            now = self._clock()
            dead = [k for k, s in self._sessions.items() if now - s.last_seen > self.ttl]
            for key in dead:
                del self._sessions[key]
            return len(dead)

    def get_or_create(self, session_id: Optional[str]) -> SessionState:
        with self.lock:
            self.purge_expired()
            now = self._clock()
            if session_id and session_id in self._sessions:
                state = self._sessions[session_id]
                state.last_seen = now
                return state
            if len(self._sessions) >= self.max_sessions:
                oldest = min(self._sessions.values(), key=lambda s: s.last_seen)
                del self._sessions[oldest.id]
            new_id = session_id or str(uuid.uuid4())
            state = SessionState(id=new_id, created=now, last_seen=now)
            self._sessions[new_id] = state
            return state

    def reset(self, session_id: str) -> bool:
        """Delete a session. Returns True if one existed. Always safe to call."""
        with self.lock:
            return self._sessions.pop(session_id, None) is not None
