import logging, time, uuid
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.responses import Response, JSONResponse
from .config import VERSION, MAX_UPLOAD_BYTES, UPLOAD_DIR
from .schemas import DemandRequest
from .processing.images import analyze_pair
from .storage import save_result, get_result, get_overlay, cleanup_expired
from .demand.rules import estimate

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("remote-sensing")
app = FastAPI(title="Co-opGig Remote Sensing Service", version=VERSION,
              description="CPU-only experimental area-level imagery change analysis.")

LIMITATIONS = [
    "Prototype output; validate against labelled imagery.",
    "Images must be co-registered for reliable pixel-level comparison.",
    "Matching dimensions do not prove matching geographic extent, CRS, resolution, or alignment.",
    "Visible image changes do not identify hidden household faults or exact service needs."
]

@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

@app.exception_handler(HTTPException)
async def http_error_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail:
        error = detail
    else:
        error = {"code": "REQUEST_ERROR", "message": str(detail), "details": {}}
    return JSONResponse(status_code=exc.status_code, content={"error": error, "requestId": getattr(request.state, "request_id", None)})

@app.on_event("startup")
def startup():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    cleanup_expired()

@app.get("/health")
def health():
    return {"data": {"status": "ok", "version": VERSION, "optionalModelWeightsLoaded": False}, "requestId": None}

@app.get("/api/v1/health")
def versioned_health():
    return health()

async def read_limited(upload: UploadFile, field: str):
    if not upload.filename:
        raise HTTPException(422, detail={"code": "VALIDATION_ERROR", "message": f"{field} filename is required"})
    # Filename is never used as a filesystem path. Read one byte beyond limit to detect oversize.
    content = await upload.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, detail={"code": "FILE_TOO_LARGE", "message": f"{field} exceeds the upload size limit"})
    return content

@app.post("/api/v1/imagery/change-detection")
async def change_detection(request: Request,
    imageT1: UploadFile = File(..., description="Earlier PNG/JPEG/WEBP image"),
    imageT2: UploadFile = File(..., description="Later PNG/JPEG/WEBP image")):
    started = time.perf_counter()
    raw1 = await read_limited(imageT1, "imageT1")
    raw2 = await read_limited(imageT2, "imageT2")
    result = analyze_pair(raw1, raw2)
    analysis_id = str(uuid.uuid4())
    overlay_url = f"/api/v1/imagery/analysis/{analysis_id}/overlay"
    data = {
        "analysisId": analysis_id,
        "status": "completed",
        "summary": {
            "changedAreaPercent": result["changedAreaPercent"],
            "buildingChangeCount": result["buildingChangeCount"],
            "confidence": None
        },
        "features": result["features"],
        "limitations": LIMITATIONS + [result["alignmentWarning"]],
        "overlayUrl": overlay_url
    }
    save_result(analysis_id, {"data": data}, result["overlay"])
    elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
    logger.info("analysis_id=%s status=completed duration_ms=%s changed_area_percent=%s", analysis_id, elapsed_ms, result["changedAreaPercent"])
    return {"data": data, "requestId": request.state.request_id}

@app.get("/api/v1/imagery/analysis/{analysis_id}")
def analysis_status(analysis_id: str, request: Request):
    result = get_result(analysis_id)
    if result is None:
        raise HTTPException(404, detail={"code": "ANALYSIS_NOT_FOUND", "message": "Analysis result was not found or has expired"})
    return {"data": result["data"], "requestId": request.state.request_id}

@app.get("/api/v1/imagery/analysis/{analysis_id}/overlay")
def analysis_overlay(analysis_id: str):
    content = get_overlay(analysis_id)
    if content is None:
        raise HTTPException(404, detail={"code": "OVERLAY_NOT_FOUND", "message": "Overlay was not found or has expired"})
    return Response(content=content, media_type="image/png", headers={"Cache-Control": "private, max-age=300"})

@app.post("/api/v1/demand/estimate")
def demand_estimate(body: DemandRequest, request: Request):
    features = body.features
    if body.analysisId:
        stored = get_result(body.analysisId)
        if stored is None:
            raise HTTPException(404, detail={"code": "ANALYSIS_NOT_FOUND", "message": "Analysis result was not found or has expired"})
        features = stored["data"].get("features", [])
    data = estimate(features, body.areaId)
    return {"data": data, "requestId": request.state.request_id}
