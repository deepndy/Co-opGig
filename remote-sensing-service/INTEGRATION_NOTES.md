# Integration Notes — Mansi Remote Sensing

## Repository placement

Extract `remote-sensing-service/` into the shared repository root beside `frontend/`, `backend/`, `ai-service/`, and `blockchain/`. Root-level notes in this ZIP can be copied into the repository docs or retained for review.

## Contract

- `GET /health` and `/api/v1/health`
- `POST /api/v1/imagery/change-detection` — multipart `imageT1`, `imageT2`
- `GET /api/v1/imagery/analysis/{analysisId}`
- `GET /api/v1/imagery/analysis/{analysisId}/overlay`
- `POST /api/v1/demand/estimate` — JSON `{analysisId?, areaId?, features?}`

Success envelope: `{ "data": ..., "requestId": "..." }`. Errors: `{ "error": { "code": "...", "message": "..." }, "requestId": "..." }`.

The service implements the common category slugs: `electrician`, `plumber`, `carpenter`, `painter`, `cleaner`, `gardener`, `driver`, `caregiver`, `technician`, `domestic-helper`, `mason`, `appliance-repair`. This heuristic currently emits only mason, electrician, plumber, carpenter, and painter.

## Backend integration

Configure the core backend's `REMOTE_SENSING_SERVICE_URL` to this service's private base URL, for example `http://remote-sensing-service:8000`. The core backend owns public endpoint `POST /api/v1/demand/estimate` and proxies to this service; the browser must not call this service directly in production. Configure a finite HTTP timeout (suggested 30 seconds for this small synchronous prototype), enforce the same or smaller upload limit, and propagate a correlation/request ID if available.

Do not connect this endpoint to the per-job classifier. The imagery output is an area-level administrative signal only.

## Configuration and storage

See `remote-sensing-service/.env.example`: `MAX_UPLOAD_BYTES`, `MAX_IMAGE_DIMENSION`, `CHANGE_THRESHOLD`, `MIN_COMPONENT_PIXELS`, `UPLOAD_DIR`, `RESULT_DIR`, `RETENTION_HOURS`. Results and overlays are local files. Mount persistent private storage if results must survive container replacement. Original uploads are not stored. Startup cleanup removes expired result/overlay artifacts; deployments that run continuously should schedule periodic cleanup too.

## Dependencies and operation

Python 3.11; FastAPI, Uvicorn, python-multipart, Pillow, NumPy. No GPU, model download, GDAL, rasterio, or pretrained checkpoint. Run `pip install -r requirements.txt`, then `uvicorn app.main:app --host 0.0.0.0 --port 8000`. Run tests with `pytest -q`.

## Assumptions / pending

- Multipart upload chosen; stored asset ID ingestion is not implemented.
- Analysis is synchronous; result retrieval is available for backend consistency and later async migration.
- Pixel dimensions must match; geographic alignment is unknown and explicitly warned.
- GeoTIFF and geospatial CRS validation are future work.
- No empirical training labels or verified local demand data supplied; confidence remains null.
- The backend should protect this service with network isolation/authentication and implement its own public validation/rate limiting.
