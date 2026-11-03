from io import BytesIO
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import HTTPException
from ..config import MAX_UPLOAD_BYTES, MAX_IMAGE_DIMENSION, CHANGE_THRESHOLD, MIN_COMPONENT_PIXELS

ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP"}

def decode_image(raw: bytes, label: str):
    if not raw:
        raise HTTPException(422, detail={"code": "VALIDATION_ERROR", "message": f"{label} is empty"})
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, detail={"code": "FILE_TOO_LARGE", "message": f"{label} exceeds the upload size limit"})
    try:
        image = Image.open(BytesIO(raw))
        fmt = image.format
        if fmt not in ALLOWED_FORMATS:
            raise HTTPException(415, detail={"code": "UNSUPPORTED_MEDIA_TYPE", "message": f"{label} must be PNG, JPEG, or WEBP"})
        image = ImageOps.exif_transpose(image).convert("RGB")
        width, height = image.size
        if width < 8 or height < 8:
            raise HTTPException(422, detail={"code": "INVALID_IMAGE", "message": f"{label} dimensions must be at least 8x8"})
        if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
            raise HTTPException(413, detail={"code": "IMAGE_DIMENSIONS_TOO_LARGE", "message": f"{label} dimensions exceed configured maximum"})
        return np.asarray(image, dtype=np.int16), {"format": fmt, "width": width, "height": height, "bytes": len(raw)}
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(415, detail={"code": "INVALID_IMAGE", "message": f"{label} is not a readable supported image"})

def components(mask: np.ndarray, min_pixels: int):
    """Return 8-connected changed-pixel components using a small CPU-only flood fill."""
    h, w = mask.shape
    seen = np.zeros((h, w), dtype=bool)
    found = []
    ys, xs = np.where(mask)
    for y0, x0 in zip(ys.tolist(), xs.tolist()):
        if seen[y0, x0]: continue
        stack = [(y0, x0)]
        seen[y0, x0] = True
        count = minx = maxx = x0
        miny = maxy = y0
        while stack:
            y, x = stack.pop()
            count += 0 if (y, x) == (y0, x0) else 1
            minx, maxx = min(minx, x), max(maxx, x)
            miny, maxy = min(miny, y), max(maxy, y)
            for ny in range(max(0, y-1), min(h, y+2)):
                for nx in range(max(0, x-1), min(w, x+2)):
                    if mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
        if count >= min_pixels:
            found.append({"pixelCount": int(count), "bbox": [int(minx), int(miny), int(maxx+1), int(maxy+1)]})
    return found

def analyze_pair(raw1: bytes, raw2: bytes):
    a, meta1 = decode_image(raw1, "imageT1")
    b, meta2 = decode_image(raw2, "imageT2")
    if a.shape != b.shape:
        raise HTTPException(422, detail={"code": "IMAGE_ALIGNMENT_MISMATCH", "message": "Images must have identical pixel dimensions after orientation correction; automatic geospatial alignment is not supported"})
    # Pixel-wise mean absolute RGB difference; threshold is a transparent baseline, not a learned model.
    diff = np.abs(a - b).mean(axis=2)
    mask = diff >= CHANGE_THRESHOLD
    changed_pixels = int(mask.sum())
    total_pixels = int(mask.size)
    percent = round(changed_pixels / total_pixels * 100, 4)
    regions = components(mask, MIN_COMPONENT_PIXELS)
    # A visual overlay highlights changed pixels in red over a blend of both dates.
    blended = ((a.astype(np.uint16) + b.astype(np.uint16)) // 2).astype(np.uint8)
    blended[mask] = np.array([255, 45, 45], dtype=np.uint8)
    overlay = Image.fromarray(blended, "RGB")
    out = BytesIO()
    overlay.save(out, format="PNG")
    features = []
    if changed_pixels:
        features.append({
            "type": "building_change_indicator",
            "label": "Unclassified visible surface-change regions",
            "count": len(regions),
            "changedPixelCount": changed_pixels,
            "areaPercent": percent,
            "interpretation": "Potential building/construction-change indicator only; regions may include vegetation, shadows, seasonal effects, roads, or image artifacts."
        })
    features.append({"type": "image_metadata", "imageT1": meta1, "imageT2": meta2, "dimensionsComparable": True, "georeferencingAvailable": False})
    return {
        "changedAreaPercent": percent,
        # This is deliberately a count of changed image regions, not confirmed buildings.
        "buildingChangeCount": len(regions),
        "confidence": None,
        "changedPixelCount": changed_pixels,
        "regions": regions,
        "features": features,
        "overlay": out.getvalue(),
        "alignmentWarning": "Pixel dimensions match, but geographic co-registration, extent, CRS, resolution, and acquisition conditions are not verified."
    }
