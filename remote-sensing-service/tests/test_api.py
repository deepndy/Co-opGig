from io import BytesIO
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient
from app.main import app
from app.demand.rules import estimate, CANONICAL_CATEGORIES

client = TestClient(app)

def png(changed=False):
    im = Image.new("RGB", (64, 64), "white")
    if changed:
        ImageDraw.Draw(im).rectangle((20, 20, 39, 39), fill="black")
    out = BytesIO()
    im.save(out, format="PNG")
    return out.getvalue()

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["data"]["optionalModelWeightsLoaded"] is False

def test_no_change_pair():
    r = client.post("/api/v1/imagery/change-detection", files={
        "imageT1": ("t1.png", png(), "image/png"),
        "imageT2": ("t2.png", png(), "image/png")
    })
    assert r.status_code == 200
    assert r.json()["data"]["summary"]["changedAreaPercent"] == 0
    assert r.json()["data"]["summary"]["confidence"] is None

def test_changed_synthetic_shape_and_overlay():
    r = client.post("/api/v1/imagery/change-detection", files={
        "imageT1": ("t1.png", png(), "image/png"),
        "imageT2": ("t2.png", png(True), "image/png")
    })
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["summary"]["changedAreaPercent"] > 0
    assert data["summary"]["buildingChangeCount"] >= 1
    assert "overlay" in data["overlayUrl"]
    assert client.get(data["overlayUrl"]).status_code == 200
    assert any("hidden" in item.lower() for item in data["limitations"])

def test_different_dimensions_rejected():
    im = Image.new("RGB", (32, 32), "white")
    out = BytesIO(); im.save(out, format="PNG")
    r = client.post("/api/v1/imagery/change-detection", files={
        "imageT1": ("a.png", png(), "image/png"),
        "imageT2": ("b.png", out.getvalue(), "image/png")
    })
    assert r.status_code == 422

def test_unsupported_file_type_rejected():
    r = client.post("/api/v1/imagery/change-detection", files={
        "imageT1": ("a.gif", b"GIF89a", "image/gif"),
        "imageT2": ("b.png", png(), "image/png")
    })
    assert r.status_code == 415

def test_empty_file_rejected():
    r = client.post("/api/v1/imagery/change-detection", files={
        "imageT1": ("a.png", b"", "image/png"),
        "imageT2": ("b.png", png(), "image/png")
    })
    assert r.status_code == 422

def test_demand_uses_only_canonical_categories_and_null_confidence():
    data = estimate([{"type": "building_change_indicator", "areaPercent": 2, "count": 4}], "zone-1")
    assert data["potentialDemand"]
    assert {x["category"] for x in data["potentialDemand"]} <= CANONICAL_CATEGORIES
    assert all(x["confidence"] is None for x in data["potentialDemand"])
    assert any("hidden" in x.lower() or "household" in x.lower() for x in data["limitations"])

def test_demand_endpoint():
    r = client.post("/api/v1/demand/estimate", json={
        "areaId": "ward-01",
        "features": [{"type": "building_change_indicator", "areaPercent": 1.2, "count": 3}]
    })
    assert r.status_code == 200
    assert r.json()["data"]["areaId"] == "ward-01"


def test_oversized_file_rejected(monkeypatch):
    import app.main as main_module
    monkeypatch.setattr(main_module, "MAX_UPLOAD_BYTES", 32)
    r = client.post("/api/v1/imagery/change-detection", files={
        "imageT1": ("a.png", b"x" * 33, "image/png"),
        "imageT2": ("b.png", png(), "image/png")
    })
    assert r.status_code == 413
