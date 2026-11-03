"""Safety screening for dangerous situations.

Rules from the brief:
  * On dangerous electrical / gas / water situations do NOT give repair
    instructions.
  * Tell the user to keep away from the danger and contact a qualified
    professional or the appropriate emergency service.

So every message here is "stay away, don't fix it yourself, call for help" and
never a how-to. Emergency numbers are for India (en-IN): 112 national
emergency, 101 fire, 108 ambulance. Tele-MANAS 14416 is India's free mental
health helpline. Please verify numbers before a public launch.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List

from .text import normalize

NONE = "none"
CAUTION = "caution"
EMERGENCY = "emergency"

_EMERGENCY_PATTERNS = {
    "gas": [
        r"\b(gas|lpg|cylinder)\b.{0,25}\b(leak\w*|smell\w*|hiss\w*)\b",
        r"\b(smell\w*|odou?r)\b.{0,15}\b(of )?(gas|lpg)\b",
    ],
    "fire": [
        r"\b(on fire|caught fire|catch\w* fire|catching fire|fire broke|flames?)\b",
        r"\bsmoke\b.{0,20}\b(coming|from|filling|everywhere|room|house)\b",
    ],
    "shock": [
        r"\belectrocut\w*",
        r"\belectric(al)? shock\b",
        r"\b(got|get|getting|gives?|giving|received) (a |an )?(electric )?shock\b",
        r"\bshock\w*\b.{0,15}\b(touch\w*|switch|wall|tap|plug|socket)\b",
    ],
    "live_wire": [
        r"\b(live|exposed|bare|fallen|snapped)\b (electric )?(wire|wires|cable|cables)\b",
        r"\b(power|electric) ?line\b.{0,15}\b(fell|fallen|down|snapped)\b",
    ],
    "water_electric": [
        r"\b(water|flood\w*|leak\w*)\b.{0,30}\b(socket|switchboard|switch board|mcb|wiring|electric\w*)\b",
        r"\b(socket|switchboard|switch board|mcb|wiring)\b.{0,30}\b(water|wet|flood\w*)\b",
    ],
    "medical": [
        r"\b(unconscious|unresponsive|not breathing|stopped breathing|cannot breathe|can t breathe)\b",
        r"\b(heart attack|cardiac arrest|severe bleeding|bleeding heavily|having a seizure|overdose)\b",
    ],
    "self_harm": [
        r"\b(suicid\w*|kill myself|want to die|end my life|end it all)\b",
    ],
}

_CAUTION_PATTERNS = {
    "electrical": [
        r"\bshort circuit\b",
        r"\bspark(s|ing|ed)?\b",
        r"\b(burning|burnt|burned) smell\b",
        r"\bsmell\w* (of )?(burning|burnt)\b",
        r"\boverheat\w*",
        r"\b(loose|hanging|cut|open|damaged) (electric )?(wire|wires|cable|cables)\b",
    ],
    "water": [
        r"\b(pipe|pipeline)\b.{0,10}\bburst\b",
        r"\bburst\b.{0,10}\bpipe\b",
        r"\bflood\w*",
    ],
    "gas": [r"\bgas\b"],
}

_EMERGENCY_NUMBERS = (
    "If anyone is hurt or in danger, call 112 (national emergency number in India), "
    "101 (fire) or 108 (ambulance) straight away."
)

_NOTICE_EMERGENCY = (
    "This could be dangerous. Please move away from the area now, keep other people and "
    "pets away, and do not try to fix it yourself. " + _EMERGENCY_NUMBERS
)
_NOTICE_GAS_EXTRA = " For a gas smell, also call your gas supplier's emergency helpline."
_NOTICE_SELF_HARM = (
    "I'm really sorry you're going through this. You don't have to face it alone. If you "
    "might act on these thoughts or are in immediate danger, please call 112 now. In India "
    "you can also call Tele-MANAS on 14416 (free, 24x7), or reach out to someone you trust "
    "right away. I'm a service-booking assistant, so I can't give you the support a person can."
)
_NOTICE_CAUTION_ELECTRICAL = (
    "Safety note: electrical faults can cause shocks or fires. Please keep away from the "
    "affected area and don't try to repair it yourself. A qualified electrician should "
    "inspect it. If you see smoke or fire, call 112."
)
_NOTICE_CAUTION_WATER = (
    "Safety note: please keep electrical items and sockets away from the water and don't "
    "attempt repairs yourself. A qualified plumber should look at it."
)
_NOTICE_CAUTION_GAS = (
    "Safety note: gas problems should only be handled by a qualified professional. If you "
    "smell gas, keep away from the area and call 112."
)

_COMPILED_E = {tag: [re.compile(p) for p in pats] for tag, pats in _EMERGENCY_PATTERNS.items()}
_COMPILED_C = {tag: [re.compile(p) for p in pats] for tag, pats in _CAUTION_PATTERNS.items()}


@dataclass
class SafetyAssessment:
    level: str = NONE
    tags: List[str] = field(default_factory=list)
    notice: str = ""


def assess(text: str) -> SafetyAssessment:
    norm = normalize(text)
    if not norm:
        return SafetyAssessment()

    emergency_tags = [t for t, rxs in _COMPILED_E.items() if any(rx.search(norm) for rx in rxs)]
    if emergency_tags:
        if "self_harm" in emergency_tags:
            return SafetyAssessment(EMERGENCY, emergency_tags, _NOTICE_SELF_HARM)
        notice = _NOTICE_EMERGENCY + (_NOTICE_GAS_EXTRA if "gas" in emergency_tags else "")
        return SafetyAssessment(EMERGENCY, emergency_tags, notice)

    caution_tags = [t for t, rxs in _COMPILED_C.items() if any(rx.search(norm) for rx in rxs)]
    if caution_tags:
        if "electrical" in caution_tags:
            notice = _NOTICE_CAUTION_ELECTRICAL
        elif "gas" in caution_tags:
            notice = _NOTICE_CAUTION_GAS
        else:
            notice = _NOTICE_CAUTION_WATER
        return SafetyAssessment(CAUTION, caution_tags, notice)

    return SafetyAssessment()
