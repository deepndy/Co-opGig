"""Error responses in one consistent shape.

    {"error": {"code": "VALIDATION_ERROR", "message": "...", "details": [{"field": "...", "message": "..."}]}}

User input is never echoed back in error details.
"""
from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("coopgig.ai.api")

_HTTP_CODES = {
    400: "BAD_REQUEST",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    413: "PAYLOAD_TOO_LARGE",
    415: "UNSUPPORTED_MEDIA_TYPE",
}


def error_response(
    status: int, code: str, message: str, details: Optional[List[dict]] = None
) -> JSONResponse:
    body = {"error": {"code": code, "message": message, "details": details}}
    return JSONResponse(status_code=status, content=body)


def _clean_message(message: str) -> str:
    return message[len("Value error, "):] if message.startswith("Value error, ") else message


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError):
        details = []
        for err in exc.errors():
            loc = [str(part) for part in err.get("loc", ()) if part not in ("body", "query")]
            details.append(
                {"field": ".".join(loc) or None, "message": _clean_message(str(err.get("msg", "invalid value")))}
            )
        return error_response(422, "VALIDATION_ERROR", "The request is not valid.", details)

    @app.exception_handler(StarletteHTTPException)
    async def http_handler(request: Request, exc: StarletteHTTPException):
        code = _HTTP_CODES.get(exc.status_code, "HTTP_ERROR")
        return error_response(exc.status_code, code, str(exc.detail))

    @app.exception_handler(Exception)
    async def unhandled_handler(request: Request, exc: Exception):
        # Log only the exception type: messages could contain user text.
        logger.error("Unhandled error: %s", type(exc).__name__)
        return error_response(500, "INTERNAL_ERROR", "Something went wrong. Please try again.")
