"""Co-opGig AI service: FastAPI application entry point.

Run locally:   uvicorn app.main:app --reload --port 8000
Interactive API page:  http://127.0.0.1:8000/docs
"""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .api.errors import error_response, register_error_handlers
from .api.routes import health_router, v1_router
from .config import get_settings
from .services.container import get_services

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_services()  # load / train the classifier once at start-up
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Co-opGig AI Service",
        description=(
            "Job classification and a structured booking-assistant chat for Co-opGig. "
            "AI suggestions can be wrong: the user always confirms the category and the booking."
        ),
        version=settings.model_version,
        lifespan=lifespan,
    )

    # CORS stays OFF unless origins are listed. In production the core backend
    # calls this service internally, so browsers should not reach it directly.
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_methods=["GET", "POST"],
            allow_headers=["Content-Type"],
        )

    @app.middleware("http")
    async def guard(request: Request, call_next):
        length = request.headers.get("content-length")
        if length and length.isdigit() and int(length) > settings.max_body_bytes:
            return error_response(413, "PAYLOAD_TOO_LARGE", "The request body is too large.")
        try:
            return await asyncio.wait_for(call_next(request), timeout=settings.request_timeout_seconds)
        except asyncio.TimeoutError:
            return error_response(504, "TIMEOUT", "The request took too long. Please try again.")

    register_error_handlers(app)
    app.include_router(health_router)
    app.include_router(v1_router)
    return app


app = create_app()
