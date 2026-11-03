"""Keyword evidence per category.

Each entry is (category, weight, [phrases]). A phrase scores its weight once if
it appears in the text. Words of 4+ letters also match longer forms
("leak" matches "leaking" and "leakage"); shorter words must match exactly
("tap" does not match "tape").

These rules are a transparent complement to the TF-IDF model: they make the
obvious cases reliable and give a human-readable reason for a suggestion.
"""
from __future__ import annotations

import re
from collections import defaultdict
from typing import Dict, Iterable, List, Optional, Tuple

_RAW: List[Tuple[str, float, List[str]]] = [
    # ------------------------------------------------------------ electrician
    ("electrician", 4.0, ["electrician"]),
    ("electrician", 3.0, ["wiring", "rewiring", "switchboard", "switch board", "mcb", "fuse",
                          "short circuit", "earthing", "bijli"]),
    ("electrician", 2.5, ["socket", "power point", "ceiling fan", "fan regulator", "electrical"]),
    ("electrician", 2.0, ["switch", "electric", "electricity", "tube light", "bulb", "sparks",
                          "sparking", "chandelier", "tripping"]),
    ("electrician", 1.5, ["wire", "lights", "led light"]),
    # ---------------------------------------------------------------- plumber
    ("plumber", 4.0, ["plumber", "plumbing"]),
    ("plumber", 3.0, ["leak", "faucet", "drain", "clog", "toilet", "commode", "sewer",
                      "water pressure", "nal"]),
    ("plumber", 2.5, ["tap", "pipe", "sink", "flush", "basin", "shower", "water pump", "overflow",
                      "water tank", "washbasin"]),
    ("plumber", 2.0, ["water supply", "bathroom fitting", "tanki"]),
    ("plumber", 1.5, ["water"]),
    # -------------------------------------------------------------- carpenter
    ("carpenter", 4.0, ["carpenter", "carpentry"]),
    ("carpenter", 3.0, ["wood", "furniture", "hinge", "cupboard", "wardrobe", "cabinet", "drawer",
                        "plywood", "bookshelf", "window frame", "bed frame", "modular kitchen",
                        "darwaza"]),
    ("carpenter", 2.5, ["shelf", "shelves", "door handle", "sliding door", "latch"]),
    ("carpenter", 2.0, ["door", "chair"]),
    ("carpenter", 1.5, ["table", "lock"]),
    # ---------------------------------------------------------------- painter
    ("painter", 4.0, ["paint", "repaint", "painter", "whitewash"]),
    ("painter", 3.0, ["putty", "primer", "distemper", "emulsion", "wall colour", "wall color"]),
    ("painter", 2.5, ["peeling", "wallpaper"]),
    ("painter", 2.0, ["enamel", "texture"]),
    ("painter", 1.5, ["colour", "color"]),
    ("painter", 1.0, ["wall"]),
    # ---------------------------------------------------------------- cleaner
    ("cleaner", 3.5, ["deep clean"]),
    ("cleaner", 3.0, ["clean", "disinfect", "mop", "mopping", "safai", "sofa cleaning"]),
    ("cleaner", 2.5, ["sanitiz", "sweep", "dust", "scrub", "cobweb"]),
    ("cleaner", 2.0, ["carpet", "stain"]),
    # --------------------------------------------------------------- gardener
    ("gardener", 4.0, ["garden", "gardener", "mali"]),
    ("gardener", 3.5, ["lawn", "mow", "mowing"]),
    ("gardener", 3.0, ["prune", "pruning", "hedge", "weed", "grass", "compost", "landscap",
                       "fertiliz", "fertiliser", "sapling", "baghicha"]),
    ("gardener", 2.5, ["plant", "tree", "trimming"]),
    ("gardener", 2.0, ["flower", "soil"]),
    # ----------------------------------------------------------------- driver
    ("driver", 4.0, ["driver", "chauffeur"]),
    ("driver", 3.0, ["drive", "driving", "cab", "taxi", "outstation", "school pickup",
                     "pickup and drop", "pick up and drop", "gaadi"]),
    ("driver", 2.5, ["airport", "transport", "lorry"]),
    ("driver", 2.0, ["pickup", "tempo", "truck", "trip"]),
    ("driver", 1.5, ["car", "ride"]),
    # -------------------------------------------------------------- caregiver
    ("caregiver", 4.0, ["caregiver", "care giver", "bedridden"]),
    ("caregiver", 3.5, ["elderly", "babysit", "babysitter", "baby sitter"]),
    ("caregiver", 3.0, ["patient", "nurse", "nursing", "attendant", "old age", "senior citizen",
                        "dementia", "alzheimer", "parkinson", "post surgery", "after surgery",
                        "bed sore", "wheelchair", "child care", "newborn", "stroke"]),
    ("caregiver", 2.5, ["companion", "toddler", "physiotherap"]),
    ("caregiver", 2.0, ["hospital"]),
    ("caregiver", 1.5, ["grandmother", "grandfather", "sick"]),
    # ------------------------------------------------------------- technician
    ("technician", 4.0, ["technician"]),
    ("technician", 3.5, ["cctv"]),
    ("technician", 3.0, ["computer", "laptop", "wifi", "wi fi", "router", "inverter", "printer",
                         "set top box", "dth", "smart home", "intercom", "motherboard",
                         "electronics"]),
    ("technician", 2.5, ["internet", "broadband", "network", "doorbell", "projector", "home theatre",
                         "solar"]),
    ("technician", 2.0, ["desktop", "camera", "battery", "television", "software", "gadget", "ups"]),
    ("technician", 1.5, ["mobile", "device"]),
    # -------------------------------------------------------- domestic-helper
    ("domestic-helper", 4.0, ["domestic helper", "domestic help", "maid", "housemaid", "house help",
                              "househelp", "household help"]),
    ("domestic-helper", 3.5, ["household chores", "washing clothes", "kaamwali"]),
    ("domestic-helper", 3.0, ["cook", "cooking", "chores", "dishes", "utensil", "laundry",
                              "ironing", "daily help"]),
    ("domestic-helper", 2.5, ["live in"]),
    # ------------------------------------------------------------------ mason
    ("mason", 4.0, ["mason", "masonry"]),
    ("mason", 3.5, ["brick", "cement", "boundary wall", "mistri"]),
    ("mason", 3.0, ["concrete", "plaster", "tile", "tiling", "flooring", "construction",
                    "foundation", "slab", "mortar", "waterproofing", "demolish", "parapet"]),
    ("mason", 2.5, ["crack", "seepage", "renovation", "granite", "marble"]),
    ("mason", 1.0, ["wall"]),
    # ------------------------------------------------------- appliance-repair
    ("appliance-repair", 4.0, ["home appliance", "household appliance"]),
    ("appliance-repair", 3.5, ["appliance"]),
    ("appliance-repair", 3.0, ["washing machine", "fridge", "refrigerator", "microwave",
                               "air conditioner", "water heater", "water purifier", "dishwasher",
                               "mixer grinder", "induction", "chimney", "air cooler",
                               "not cooling", "not spinning", "compressor"]),
    ("appliance-repair", 2.5, ["oven", "ac", "geyser", "washer", "dryer", "cooler", "toaster",
                               "kettle", "not heating", "coffee machine", "vacuum cleaner"]),
    ("appliance-repair", 1.5, ["drum", "mixer", "grinder"]),
    # Everyday gadgets that a customer may file under either category. Giving
    # technician a small score here is what lets the classifier notice the
    # appliance-repair / technician ambiguity instead of guessing.
    ("technician", 2.0, ["washing machine", "fridge", "refrigerator", "microwave", "geyser",
                         "tv", "washer", "dryer", "oven"]),
    ("appliance-repair", 2.0, ["tv"]),
]


def _compile(phrase: str) -> "re.Pattern[str]":
    words = phrase.split()
    pattern = r"\b" + r"\s+".join(re.escape(w) for w in words)
    pattern += r"\w*" if len(words[-1]) >= 4 else r"\b"
    return re.compile(pattern)


_RULES: List[Tuple[str, str, float, "re.Pattern[str]"]] = [
    (category, phrase, weight, _compile(phrase))
    for category, weight, phrases in _RAW
    for phrase in phrases
]


def score(
    text: str, only: Optional[Iterable[str]] = None
) -> Tuple[Dict[str, float], Dict[str, List[str]]]:
    """Score already-normalised text. Returns (scores, matched phrases) per category.

    `only` restricts scoring to some categories (used to read a user's answer to
    "is it A or B?")."""
    allowed = set(only) if only is not None else None
    scores: Dict[str, float] = defaultdict(float)
    matches: Dict[str, List[str]] = defaultdict(list)
    for category, phrase, weight, rx in _RULES:
        if allowed is not None and category not in allowed:
            continue
        if rx.search(text):
            scores[category] += weight
            if phrase not in matches[category]:
                matches[category].append(phrase)
    return dict(scores), dict(matches)
