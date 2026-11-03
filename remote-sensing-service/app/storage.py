import json, re, time
from pathlib import Path
from typing import Any
from .config import RESULT_DIR, RETENTION_HOURS

_ID_RE = re.compile(r"^[a-f0-9-]{36}$")

def ensure_dirs():
    RESULT_DIR.mkdir(parents=True, exist_ok=True)

def safe_id(value: str) -> str:
    if not _ID_RE.fullmatch(value):
        raise ValueError("Invalid analysis ID")
    return value

def save_result(analysis_id: str, result: dict[str, Any], overlay_bytes: bytes):
    ensure_dirs()
    safe_id(analysis_id)
    (RESULT_DIR / f"{analysis_id}.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    (RESULT_DIR / f"{analysis_id}.png").write_bytes(overlay_bytes)

def get_result(analysis_id: str):
    safe_id(analysis_id)
    path = RESULT_DIR / f"{analysis_id}.json"
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None

def get_overlay(analysis_id: str):
    safe_id(analysis_id)
    path = RESULT_DIR / f"{analysis_id}.png"
    return path.read_bytes() if path.is_file() else None

def cleanup_expired():
    ensure_dirs()
    cutoff = time.time() - RETENTION_HOURS * 3600
    for path in RESULT_DIR.iterdir():
        if path.is_file() and path.stat().st_mtime < cutoff:
            try: path.unlink()
            except OSError: pass
