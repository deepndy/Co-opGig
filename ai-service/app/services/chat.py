"""Structured slot-filling chat assistant.

This is NOT a general-purpose LLM chatbot. It is a safe, template-driven
assistant built on the classifier. It:

  1. welcomes the user and asks what service they need,
  2. classifies the described problem,
  3. asks one focused follow-up when the category is unclear,
  4. asks for locality and urgency only if they are missing (once each),
  5. returns structured fields so the UI can pre-fill a job request,
  6. never books anything: the user always confirms the category and booking.

Dangerous situations get a safety message (stay away, don't repair it yourself,
call a professional or emergency service) and no repair instructions.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

from ..categories import CATEGORIES, CATEGORY_LABELS, CATEGORY_NOUNS
from ..config import Settings
from . import keywords
from .classifier import (
    CLOSE_CALL,
    LOW_CONFIDENCE,
    PAIR_AMBIGUOUS,
    UNKNOWN,
    UNKNOWN_QUESTION,
    ClassificationResult,
    Classifier,
    question_for,
)
from .safety import CAUTION, EMERGENCY, NONE, assess
from .sessions import SessionState, SessionStore
from .text import clean_text, normalize

# nextAction values (assumption, see INTEGRATION_NOTES.md)
ASK_QUESTION = "ASK_QUESTION"
PREFILL_FORM = "PREFILL_FORM"
SAFETY_ADVICE = "SAFETY_ADVICE"

DISCLAIMER = "AI suggestions can be wrong, so you can always choose a different category yourself."

_GREETING = re.compile(
    r"^(hi+|hello+|hey+|hii+|hola|namaste|namaskar|good (morning|afternoon|evening)|help|start)"
    r"( there| bot| assistant)?[\s.!?]*$"
)
_YES = re.compile(
    r"^(yes|yeah|yep|yup|ya|haan|han|correct|right|sure|ok|okay|exactly|absolutely|that'?s right|thats right)\b"
)
_NO = re.compile(r"^(no|nope|nah|nahi|nai|wrong|incorrect|not really)\b")
_SKIP = re.compile(
    r"^(skip|none|not now|later|don'?t know|dont know|not sure|n/?a|pass|no idea|nahi|no)\b"
)

_URG_LOW = re.compile(
    r"\b(flexible|no rush|not urgent|whenever|anytime|any time|no hurry|next week|next month|not in a hurry)\b"
)
_URG_HIGH_ALWAYS = re.compile(
    r"\b(urgent|urgently|asap|as soon as possible|immediately|right now|right away|emergency)\b"
)
_URG_HIGH_TIME = re.compile(r"\b(today|tonight|now|at once)\b")
_URG_NORMAL = re.compile(
    r"\b(tomorrow|this week|few days|couple of days|soon|within a (few )?days?)\b"
)

_LOC_PREFIX = re.compile(
    r"^(?:(?:it'?s|it is|i am|i'?m|we are|we'?re|my (?:area|location|locality) is|"
    r"(?:the )?(?:area|location|locality) is|located|staying|living|live)\s+)?"
    r"(?:in|at|near|around|from|nearby)\s+",
    re.IGNORECASE,
)
_LOC_CAPITAL = re.compile(r"\b(?:in|at|near)\s+([A-Z][\w.'\- ]{2,40}?)(?:[,.!?]|$)")
_LOC_OK = re.compile(r"^[\w .,'\-/&()]+$", re.UNICODE)

WELCOME = (
    "Hi! I'm the Co-opGig assistant. I can help you describe a job and find the right "
    "service professional: electrician, plumber, carpenter, painter, cleaner, gardener, "
    "driver, caregiver, technician, domestic helper, mason or appliance repair. "
    "What service do you need?"
)
REJECTED = (
    "No problem. Which service do you need? You can name one (for example plumber or "
    "electrician) or describe the job in your own words."
)
ASK_LOCATION = (
    "Which area or locality is this for? You can skip this and add it in the form instead."
)
ASK_URGENCY = (
    "How soon do you need this done: urgent (today), within a few days, or flexible?"
)
_URGENCY_TEXT = {
    "emergency": "an emergency",
    "high": "urgent",
    "normal": "within a few days",
    "low": "flexible timing",
}


@dataclass
class ChatOutcome:
    session_id: str
    reply: str
    suggested_category: Optional[str]
    confidence: float
    needs_clarification: bool
    next_action: str
    description: Optional[str]
    category: Optional[str]
    location_text: Optional[str]
    urgency: Optional[str]
    alternatives: List[Tuple[str, float]] = field(default_factory=list)
    safety_notice: Optional[str] = None


def _is_yes(low: str) -> bool:
    return bool(_YES.match(low)) and len(low.split()) <= 4


def _is_no(low: str) -> bool:
    return bool(_NO.match(low)) and len(low.split()) <= 3


def extract_urgency(low: str, asked: bool) -> Optional[str]:
    """Read urgency from a normalised message. Time words like 'today' are only
    trusted as an answer to the urgency question (not inside a description)."""
    if _URG_LOW.search(low):
        return "low"
    if _URG_HIGH_ALWAYS.search(low):
        return "high"
    if asked:
        if _URG_HIGH_TIME.search(low):
            return "high"
        if _URG_NORMAL.search(low):
            return "normal"
    return None


_SKIPPED = "__skipped__"


def extract_location(text: str) -> Optional[str]:
    """Read a locality from the answer to 'which area?'. Returns _SKIPPED if the
    user declined, None if nothing usable was found."""
    stripped = text.strip().strip(".,!?")
    if _SKIP.match(stripped.lower()):
        return _SKIPPED
    candidate = _LOC_PREFIX.sub("", stripped, count=1).strip()
    if candidate and len(candidate) <= 60 and len(candidate.split()) <= 6 and _LOC_OK.match(candidate):
        return candidate
    match = _LOC_CAPITAL.search(text)
    return clean_text(match.group(1)) if match else None


class ChatService:
    def __init__(self, classifier: Classifier, store: SessionStore, settings: Settings):
        self.classifier = classifier
        self.store = store
        self.settings = settings

    def reset(self, session_id: str) -> bool:
        return self.store.reset(session_id)

    # ------------------------------------------------------------------ public
    def handle(
        self,
        message: str,
        session_id: Optional[str] = None,
        location_text: Optional[str] = None,
        category: Optional[str] = None,
    ) -> ChatOutcome:
        with self.store.lock:
            return self._handle(message, session_id, location_text, category)

    # ---------------------------------------------------------------- internals
    def _handle(
        self,
        message: str,
        session_id: Optional[str],
        location_text: Optional[str],
        category: Optional[str],
    ) -> ChatOutcome:
        st = self.store.get_or_create(session_id)
        st.turns += 1
        text = clean_text(message)[: self.settings.max_text_chars]
        low = normalize(text)

        # --- context sent by the form ------------------------------------
        if location_text:
            st.location = clean_text(location_text)[:120] or st.location
        category_event: Optional[str] = None  # ai | confirmed | context
        if category and category != st.category:
            st.category, st.category_source, st.confidence = category, "user", 1.0
            st.pending, st.pending_candidates, st.last_question = None, [], None
            st.safety_confirmed = True
            category_event = "context"

        # --- safety -------------------------------------------------------
        safety = assess(low)
        if safety.level == EMERGENCY and "self_harm" not in safety.tags:
            st.urgency = "emergency"
        if safety.level == EMERGENCY or (safety.level == CAUTION and st.safety_level == NONE):
            st.safety_level = safety.level
        if "self_harm" in safety.tags:
            # Do not keep or classify this text; just respond with support info.
            return self._finish(st, safety.notice, False, SAFETY_ADVICE, safety.notice)

        # --- answers to the question we asked last -------------------------
        consumed = False
        rejected_now = False
        unclear_answer = False
        if st.pending in ("confirm", "choice", "pair") and category_event is None:
            verdict = self._interpret_answer(st, low)
            if verdict is not None:
                kind, chosen = verdict
                consumed = True
                if kind == "accept":
                    st.category, st.category_source, st.confidence = chosen, "user", 1.0
                    st.safety_confirmed = True
                    category_event = "confirmed"
                    st.pending, st.pending_candidates, st.last_question = None, [], None
                elif kind == "reject":
                    st.rejected.update(st.pending_candidates)
                    st.category = None
                    st.last_suggestion, st.last_confidence, st.last_alternatives = None, 0.0, []
                    st.pending, st.pending_candidates, st.last_question = None, [], None
                    rejected_now = True
                else:  # unclear: keep the same question open
                    unclear_answer = True
            else:
                st.pending, st.pending_candidates, st.last_question = None, [], None
        elif st.pending == "location":
            found = extract_location(text)
            if found == _SKIPPED:
                consumed = True
            elif found:
                st.location, consumed = found, True
            st.pending = None
        elif st.pending == "urgency":
            if _SKIP.match(low):
                consumed = True
            st.pending = None

        asked_urgency_now = st.asked_urgency
        urgency = extract_urgency(low, asked_urgency_now)
        if urgency and st.urgency != "emergency":
            st.urgency = urgency
        # A short reply that only carries urgency is an answer, not a description.
        if urgency and asked_urgency_now and len(low.split()) <= 6 and not consumed:
            consumed = True

        # --- description ---------------------------------------------------
        is_greeting = bool(_GREETING.match(low))
        is_ack = _is_yes(low) or _is_no(low)
        added_part = False
        if text and not consumed and not is_greeting and not is_ack:
            st.parts.append(text)
            st.parts = st.parts[-6:]
            added_part = True

        # --- classify while the category is unknown -------------------------
        result: Optional[ClassificationResult] = None
        if st.category is None and st.parts and not rejected_now and not unclear_answer:
            result = self.classifier.classify(self._joined(st), exclude=st.rejected)
            st.last_suggestion = result.category
            st.last_confidence = result.confidence
            st.last_alternatives = [(a.category, a.confidence) for a in result.alternatives]
            if result.category and not result.needs_clarification:
                st.category, st.category_source = result.category, "ai"
                st.confidence = result.confidence
                category_event = "ai"
                st.unknown_count = 0

        notice = safety.notice if safety.level != NONE else None

        # --- emergency: safety advice only ---------------------------------
        if safety.level == EMERGENCY:
            reply = safety.notice
            if st.category:
                reply += f" When you are safe, I can help you find {CATEGORY_LABELS[st.category]}."
            return self._finish(st, reply, False, SAFETY_ADVICE, notice)

        # --- no category yet: ask --------------------------------------------
        if st.category is None:
            return self._ask_for_category(st, result, rejected_now, unclear_answer, is_greeting, notice)

        # --- safety confirmation before moving on -----------------------------
        if (
            st.category_source == "ai"
            and st.safety_level in (CAUTION, EMERGENCY)
            and not st.safety_confirmed
        ):
            st.pending, st.pending_candidates = "confirm", [st.category]
            question = question_for(st.category)
            st.last_question = question
            lead = (notice + " ") if notice else ""
            reply = f"{lead}I can help identify the service category. {question}"
            return self._finish(st, reply, True, ASK_QUESTION, notice)

        # --- category settled: collect slots / prefill ---------------------------
        label = CATEGORY_LABELS[st.category]
        noun = CATEGORY_NOUNS[st.category]
        lead = ""
        if category_event == "ai":
            reason = self._reason(st)
            lead = f"This looks like a job for {label}. {reason} {DISCLAIMER}"
        elif category_event == "confirmed":
            lead = f"Great, I'll go with {label}."
        elif category_event == "context":
            lead = f"Okay, I'll use the category you selected ({noun})."
        elif added_part:
            lead = "Thanks, I've added that to your job description."
        elif consumed:
            lead = "Thanks, noted."
        if notice:
            lead = f"{notice} {lead}".strip()

        if st.location is None and not st.asked_location:
            st.asked_location, st.pending = True, "location"
            return self._finish(st, f"{lead} {ASK_LOCATION}".strip(), False, ASK_QUESTION, notice)
        if st.urgency is None and not st.asked_urgency:
            st.asked_urgency, st.pending = True, "urgency"
            return self._finish(st, f"{lead} {ASK_URGENCY}".strip(), False, ASK_QUESTION, notice)

        summary = noun
        if st.location:
            summary += f" in {st.location}"
        if st.urgency:
            summary += f", {_URGENCY_TEXT[st.urgency]}"
        reply = (
            f"{lead} I've prepared your job request: {summary}. Please review the details and "
            "change the category if it isn't right. Nothing has been booked. You'll confirm "
            "the booking yourself."
        ).strip()
        return self._finish(st, reply, False, PREFILL_FORM, notice)

    # ------------------------------------------------------------------ helpers
    def _ask_for_category(
        self,
        st: SessionState,
        result: Optional[ClassificationResult],
        rejected_now: bool,
        unclear_answer: bool,
        is_greeting: bool,
        notice: Optional[str],
    ) -> ChatOutcome:
        lead = (notice + " ") if notice else ""
        if rejected_now:
            return self._finish(st, lead + REJECTED, True, ASK_QUESTION, notice)
        if unclear_answer and st.last_question:
            reply = f"Sorry, I need a bit more detail. {st.last_question}"
            return self._finish(st, lead + reply, True, ASK_QUESTION, notice)
        if result is None:
            return self._finish(st, lead + WELCOME, True, ASK_QUESTION, notice)

        if result.kind == UNKNOWN:
            st.unknown_count += 1
            st.pending, st.pending_candidates, st.last_question = None, [], None
            reply = UNKNOWN_QUESTION
            if st.unknown_count >= 2:
                reply += " You can also choose a category yourself in the form."
            return self._finish(st, lead + reply, True, ASK_QUESTION, notice)

        pending = {PAIR_AMBIGUOUS: "pair", CLOSE_CALL: "choice", LOW_CONFIDENCE: "confirm"}[result.kind]
        st.pending, st.pending_candidates = pending, list(result.question_candidates)
        st.last_question = result.clarifying_question
        reply = (
            f"{result.clarifying_question} If that's not right, tell me more about the job or "
            f"choose a category yourself in the form. {DISCLAIMER}"
        )
        return self._finish(st, lead + reply, True, ASK_QUESTION, notice)

    def _interpret_answer(self, st: SessionState, low: str) -> Optional[Tuple[str, Optional[str]]]:
        candidates = st.pending_candidates
        if not candidates:
            return None
        if st.pending == "confirm":
            if _is_yes(low):
                return "accept", candidates[0]
            if _is_no(low):
                return "reject", None
        elif _is_yes(low):
            return "unclear", None  # "yes" to "A or B?" doesn't say which one
        elif _is_no(low):
            return "reject", None  # "no" to "A or B?" means neither
        scores, _ = keywords.score(low, only=candidates)
        ranked = sorted(scores.items(), key=lambda kv: -kv[1])
        if ranked:
            runner_up = ranked[1][1] if len(ranked) > 1 else 0.0
            if ranked[0][1] > runner_up:
                return "accept", ranked[0][0]
        return None

    def _reason(self, st: SessionState) -> str:
        result = self.classifier.classify(self._joined(st), exclude=st.rejected)
        return result.reason if result.category == st.category else ""

    def _joined(self, st: SessionState) -> str:
        return " ".join(st.parts)[-self.settings.max_text_chars :]

    def _finish(
        self,
        st: SessionState,
        reply: str,
        needs_clarification: bool,
        next_action: str,
        notice: Optional[str],
    ) -> ChatOutcome:
        category = st.category or st.last_suggestion
        confidence = st.confidence if st.category else st.last_confidence
        alternatives = [] if st.category else list(st.last_alternatives)
        description = " ".join(st.parts)[: self.settings.max_text_chars] or None
        return ChatOutcome(
            session_id=st.id,
            reply=reply,
            suggested_category=category,
            confidence=round(max(0.0, min(1.0, confidence)), 2),
            needs_clarification=needs_clarification,
            next_action=next_action,
            description=description,
            category=category,
            location_text=st.location,
            urgency=st.urgency,
            alternatives=alternatives,
            safety_notice=notice,
        )
