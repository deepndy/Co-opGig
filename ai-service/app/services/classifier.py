"""Job classifier: TF-IDF + Logistic Regression blended with keyword rules.

IMPORTANT about "confidence": the number returned is a heuristic score in
[0, 1] produced by blending a tiny model with keyword evidence. It is NOT a
calibrated probability and NOT a measured accuracy. The thresholds in
`Settings` are starting points that should be tuned on real, held-out data.
"""
from __future__ import annotations

import csv
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from ..categories import (
    CATEGORIES,
    CATEGORY_LABELS,
    CATEGORY_NOUNS,
    CONFUSABLE_PAIRS,
)
from ..config import Settings
from . import keywords
from .text import normalize

logger = logging.getLogger("coopgig.ai.classifier")

# Result kinds
CONFIDENT = "confident"
LOW_CONFIDENCE = "low_confidence"
CLOSE_CALL = "close_call"
PAIR_AMBIGUOUS = "pair_ambiguous"
UNKNOWN = "unknown"

_QUESTION_TEMPLATES = {
    "electrician": "Is this an electrical issue that needs a qualified electrician?",
    "plumber": "Is this a water or plumbing issue that needs a plumber?",
    "carpenter": "Is this a woodwork or furniture job that needs a carpenter?",
    "painter": "Is this a painting job?",
}

_PAIR_QUESTION = (
    "Is this a household appliance (like a washing machine, fridge or AC) that needs "
    "repair, or an electronics, network or other device that needs a general technician?"
)

UNKNOWN_QUESTION = (
    "I couldn't tell which service this needs. Could you describe what is wrong or what "
    "work you need done? For example: 'water leaking under the sink' or 'need two rooms painted'."
)


@dataclass
class Candidate:
    category: str
    confidence: float


@dataclass
class ClassificationResult:
    category: Optional[str]
    confidence: float
    alternatives: List[Candidate]
    needs_clarification: bool
    clarifying_question: Optional[str]
    reason: str
    kind: str
    # Categories the clarifying question is about (used by the chat flow to read the answer).
    question_candidates: List[str] = field(default_factory=list)
    matched_terms: List[str] = field(default_factory=list)


def _label(category: str) -> str:
    return CATEGORY_LABELS[category]


def question_for(category: str) -> str:
    """Single-category confirmation question."""
    return _QUESTION_TEMPLATES.get(category, f"Is this a job for {_label(category)}?")


def load_training_data(path: Path) -> Tuple[List[str], List[str]]:
    texts: List[str] = []
    labels: List[str] = []
    with open(path, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            text = (row.get("text") or "").strip()
            label = (row.get("category") or "").strip()
            if not text or label not in CATEGORIES:
                continue
            texts.append(text)
            labels.append(label)
    return texts, labels


def build_pipeline():
    # Imported lazily so that modules which only need the keyword rules stay light.
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import FeatureUnion, Pipeline

    features = FeatureUnion(
        [
            ("word", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)),
            ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True)),
        ]
    )
    return Pipeline(
        [
            ("tfidf", features),
            ("lr", LogisticRegression(C=20.0, max_iter=2000, random_state=0)),
        ]
    )


class Classifier:
    def __init__(self, settings: Settings, pipeline=None):
        self.settings = settings
        self.pipeline = pipeline

    # ------------------------------------------------------------------ training
    def fit(self, texts: Sequence[str], labels: Sequence[str]) -> "Classifier":
        pipeline = build_pipeline()
        pipeline.fit([normalize(t) for t in texts], list(labels))
        self.pipeline = pipeline
        return self

    def save(self, path: Path) -> None:
        import joblib

        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.pipeline, path)

    @classmethod
    def load_or_train(cls, settings: Settings) -> "Classifier":
        """Load a saved model if present, otherwise train from the sample CSV.

        Training on ~170 short sentences takes well under a second, so the
        service never depends on a pre-built binary file."""
        if settings.model_path.exists():
            try:
                import joblib

                return cls(settings, joblib.load(settings.model_path))
            except Exception as exc:  # corrupted or incompatible file -> retrain
                logger.warning("Could not load saved model (%s); retraining.", type(exc).__name__)
        texts, labels = load_training_data(settings.training_data_path)
        return cls(settings).fit(texts, labels)

    # ----------------------------------------------------------------- inference
    def _lr_probabilities(self, text: str) -> Dict[str, float]:
        probs = {c: 0.0 for c in CATEGORIES}
        if self.pipeline is None or not text:
            return probs
        row = self.pipeline.predict_proba([text])[0]
        for category, p in zip(self.pipeline.classes_, row):
            if category in probs:
                probs[category] = float(p)
        return probs

    def distribution(
        self, text: str, exclude: Iterable[str] = ()
    ) -> Tuple[Dict[str, float], Dict[str, List[str]]]:
        norm = normalize(text)
        p_lr = self._lr_probabilities(norm)
        scores, matches = keywords.score(norm)
        total = sum(scores.values())
        if total > 0:
            p_kw = {c: scores.get(c, 0.0) / total for c in CATEGORIES}
            # The more keyword evidence, the more the rules are trusted.
            weight = min(0.75, 0.30 + 0.12 * total)
            probs = {c: weight * p_kw[c] + (1 - weight) * p_lr[c] for c in CATEGORIES}
        else:
            probs = dict(p_lr)
        for category in exclude:
            if category in probs:
                probs[category] = 0.0
        norm_total = sum(probs.values())
        if norm_total > 0:
            probs = {c: p / norm_total for c, p in probs.items()}
        return probs, matches

    def classify(self, text: str, exclude: Iterable[str] = ()) -> ClassificationResult:
        s = self.settings
        probs, matches = self.distribution(text, exclude)
        ranked = sorted(probs.items(), key=lambda kv: (-kv[1], kv[0]))
        (c1, p1), (c2, p2) = ranked[0], ranked[1]
        margin = p1 - p2
        pair = frozenset((c1, c2)) in CONFUSABLE_PAIRS
        needed_margin = s.pair_margin_threshold if pair else s.margin_threshold

        alternatives = [Candidate(c, round(p, 2)) for c, p in ranked[1:4] if p >= 0.05]

        # ---- unknown -----------------------------------------------------
        if p1 < s.unknown_below:
            return ClassificationResult(
                category=None,
                confidence=0.0,
                alternatives=[Candidate(c, round(p, 2)) for c, p in ranked[:3] if p >= 0.05],
                needs_clarification=True,
                clarifying_question=UNKNOWN_QUESTION,
                reason="I could not match the description to one of the supported services.",
                kind=UNKNOWN,
            )

        terms = matches.get(c1, [])[:3]
        if terms:
            reason = "The description mentions: " + ", ".join(terms) + "."
        else:
            reason = f"The wording is similar to typical {CATEGORY_NOUNS[c1]} requests."

        # ---- decide whether to ask --------------------------------------
        if pair and margin < needed_margin:
            kind, question, candidates = PAIR_AMBIGUOUS, _PAIR_QUESTION, [c1, c2]
        elif p1 < s.confidence_threshold or margin < needed_margin:
            if p2 >= 0.12:
                kind = CLOSE_CALL
                question = f"Is this a job for {_label(c1)} or {_label(c2)}?"
                candidates = [c1, c2]
            else:
                kind = LOW_CONFIDENCE
                question = _QUESTION_TEMPLATES.get(c1, f"Is this a job for {_label(c1)}?")
                candidates = [c1]
        else:
            kind, question, candidates = CONFIDENT, None, []

        needs = kind != CONFIDENT
        if needs:
            reason += " I'm not fully certain, so please check."
        return ClassificationResult(
            category=c1,
            confidence=round(p1, 2),
            alternatives=alternatives,
            needs_clarification=needs,
            clarifying_question=question,
            reason=reason,
            kind=kind,
            question_candidates=candidates,
            matched_terms=terms,
        )
