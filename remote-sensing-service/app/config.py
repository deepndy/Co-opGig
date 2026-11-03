import os
from pathlib import Path

SERVICE_NAME = "Co-opGig Remote Sensing Service"
VERSION = "1.0.0"
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./data/uploads"))
RESULT_DIR = Path(os.getenv("RESULT_DIR", "./data/results"))
RETENTION_HOURS = int(os.getenv("RETENTION_HOURS", "24"))
CHANGE_THRESHOLD = int(os.getenv("CHANGE_THRESHOLD", "30"))
MIN_COMPONENT_PIXELS = int(os.getenv("MIN_COMPONENT_PIXELS", "12"))
MAX_IMAGE_DIMENSION = int(os.getenv("MAX_IMAGE_DIMENSION", "6000"))
