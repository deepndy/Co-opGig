CANONICAL_CATEGORIES = {
    "electrician", "plumber", "carpenter", "painter", "cleaner", "gardener",
    "driver", "caregiver", "technician", "domestic-helper", "mason", "appliance-repair"
}

LIMITATIONS = [
    "Experimental estimate; not a confirmed demand signal.",
    "Not a confirmed need for any specific household.",
    "Satellite/aerial imagery cannot reliably reveal hidden plumbing leaks, internal wiring faults, appliance failures, or exact household needs.",
    "Requires local validation against ground-truth service demand; confidence is uncalibrated and therefore null.",
    "Building-change indicators can be caused by vegetation, shadows, seasonal conditions, sensor differences, roads, or misregistration."
]

def estimate(features: list[dict], area_id: str | None):
    change = next((f for f in features if f.get("type") == "building_change_indicator"), {})
    pct = float(change.get("areaPercent", 0) or 0)
    count = int(change.get("count", 0) or 0)
    demand = []
    if pct >= 0.5 or count >= 1:
        # Prototype rules only: no labelled local demand data is included.
        level = "high" if pct >= 5 else ("medium" if pct >= 1 or count >= 3 else "low")
        categories = [
            ("mason", "New visible construction/change regions may indicate potential future masonry work."),
            ("electrician", "Construction/change indicators may create potential future electrical installation demand."),
            ("plumber", "Construction/change indicators may create potential future plumbing installation demand."),
            ("carpenter", "Building/construction change indicators may create potential future carpentry demand."),
            ("painter", "Building/construction change indicators may create potential future painting demand.")
        ]
        for category, basis in categories:
            demand.append({"category": category, "level": level, "confidence": None, "basis": basis})
    return {
        "areaId": area_id,
        "potentialDemand": demand,
        "explanation": "Experimental area-level estimate based on visible building/infrastructure change indicators and explicit prototype rules. It is not a prediction of exact worker numbers or household jobs.",
        "limitations": LIMITATIONS
    }
