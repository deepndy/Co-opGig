# Co-opGig Remote Sensing Service

CPU-only FastAPI prototype for **visible area-level building/infrastructure change indicators** and an **experimental potential service-demand estimate**. It does not classify an individual household repair request.

## Implemented

- Multipart `imageT1` / `imageT2` upload for PNG, JPEG, and WEBP.
- File size, dimensions, format, readability, and empty-file validation.
- EXIF orientation normalization and strict equal-dimension check.
- CPU image differencing, configurable threshold, connected changed-region summary, and PNG overlay.
- Synchronous result retrieval by UUID analysis ID; JSON result and overlay persisted locally.
- Transparent heuristic demand mapping to canonical Co-opGig category slugs.
- Standard `{data, requestId}` success and `{error, requestId}` error envelopes.
- Health endpoints, request IDs, duration logging, retention cleanup, synthetic tests, and optional mask evaluation script.

## Important interpretation

The change count is the number of connected changed-pixel regions, **not a verified count of buildings**. The feature label is an unclassified visible surface-change indicator. Matching dimensions do not prove that images share geographic extent, CRS, resolution, or pixel registration. The service warns about unknown alignment and should only be used for co-registered imagery.

The demand estimator is an explainable prototype rule, not an empirically validated prediction. It emits potential categories only when change indicators are present; it does not predict worker numbers. Confidence is always `null`. Aerial imagery cannot reliably reveal hidden plumbing leaks, internal wiring faults, appliance failures, or exact household needs. No U-Net/Siamese model, pretrained weights, GPU, or model accuracy claim is included.

## Run locally

Python 3.11 recommended.

```bash
cd remote-sensing-service
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # optional; defaults work without it
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000/docs` for interactive API documentation.

## Test

```bash
pytest -q
```

Tests use small generated synthetic fixtures; no dataset download is required.

## API

### `GET /health` and `GET /api/v1/health`

Returns `{data:{status,version,optionalModelWeightsLoaded:false},requestId:null}`.

### `POST /api/v1/imagery/change-detection`

Multipart form fields:
- `imageT1`: earlier image
- `imageT2`: later image

Example:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/imagery/change-detection \\
  -F "imageT1=@earlier.png" -F "imageT2=@later.png"
```

Synchronous response follows the common contract. `overlayUrl` is a controlled relative API route. Retrieve it using the same service base URL.

### `GET /api/v1/imagery/analysis/{analysisId}`

Returns the stored completed result. Results expire after `RETENTION_HOURS`.

### `GET /api/v1/imagery/analysis/{analysisId}/overlay`

Returns a PNG overlay with changed pixels highlighted in red.

### `POST /api/v1/demand/estimate`

Pass either an `analysisId` from the previous endpoint, or a `features` array, plus optional `areaId`:

```json
{
  "analysisId": "replace-with-analysis-uuid",
  "areaId": "ward-01",
  "features": []
}
```

If `analysisId` is supplied, stored analysis features take precedence. All emitted categories use the shared canonical slugs.

## Configuration

See `.env.example`. Defaults: 10 MiB per upload, 6000 px maximum per side, mean RGB difference threshold 30/255, minimum connected component 12 pixels, local result storage, 24-hour retention. `UPLOAD_DIR` is reserved for a configurable local upload location; original image uploads are processed in memory and are not persisted. `RESULT_DIR` stores result JSON and overlay only.

## Docker

```bash
docker build -t coopgig-remote-sensing .
docker run --rm -p 8000:8000 \\
  -e RESULT_DIR=/data/results \\
  -v "$PWD/data:/data" coopgig-remote-sensing
```

For production, use a private persistent volume, HTTPS at the ingress, authentication/authorization at the core backend, request rate limits, and scheduled retention cleanup. This standalone service intentionally does not implement user authentication; keep it private behind the core backend. The core backend should call it via `REMOTE_SENSING_SERVICE_URL`, apply a timeout, and enforce the upload limit at its own boundary too.

## Evaluation and datasets

`scripts/evaluate.py` calculates IoU, precision, recall, and F1 for a supplied predicted mask and labelled mask. No ground-truth dataset or fabricated score is included; quantitative accuracy evaluation is pending. No public dataset download is required. Before using LEVIR-CD, WHU-CD, SpaceNet, or Inria Aerial Image Labeling, verify current licence/terms and whether its imagery, labels, geography, and resolution fit the proposed experiment. See `data/README.md`.

## Limitations / future work

- No geospatial reprojection, orthorectification, CRS/extent comparison, or automatic registration. Different raster dimensions are rejected.
- PNG/JPEG/WEBP only; GeoTIFF is not currently supported. This avoids GDAL native dependency complexity.
- Pixel differences are sensitive to illumination, season, shadows, sensor differences, vegetation, and misalignment.
- Region count is not a building count; no building-mask extraction is implemented.
- Demand categories are heuristic associations, not verified local demand. No exact worker counts or household-level predictions.
- No labelled local ground truth; model-based demand prediction remains future work.
- Synchronous processing is intended for small prototype images, not large-area production workloads.
