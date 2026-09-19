"""FastAPI application: the API gateway in front of the AI stack."""

from __future__ import annotations

import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes import health_router, router
from app.config import get_settings
from app.core.logging import configure_logging, get_logger, new_request_id, request_id_ctx
from app.core.observability import REQUEST_LATENCY, REQUESTS
from app.core.security import build_rate_limiter, client_key
from app.services import get_container

log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging(settings.log_level)
    container = get_container()
    seeded = container.seed_knowledge()
    log.info(
        "startup",
        environment=settings.environment,
        llm_provider=container.llm.name,
        vector_store=settings.vector_store,
        seeded_chunks=seeded,
        indexed_chunks=container.vector_store.count(),
    )
    yield
    log.info("shutdown")


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(
        title="RESONANT AI Backend",
        description=(
            "End-to-end AI application backend: RAG, LangGraph agent, guardrails, "
            "memory and LLMOps instrumentation."
        ),
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    limiter = build_rate_limiter(settings)
    app.state.rate_limiter = limiter

    @app.middleware("http")
    async def request_pipeline(request: Request, call_next):  # type: ignore[no-untyped-def]
        request_id = request.headers.get("x-request-id") or new_request_id()
        token = request_id_ctx.set(request_id)
        started = time.perf_counter()
        path = request.url.path

        if path.startswith(settings.api_prefix):
            verdict = limiter.check(client_key(request))
            if not verdict.allowed:
                log.warning("http.rate_limited", path=path)
                REQUESTS.labels(request.method, path, "429").inc()
                request_id_ctx.reset(token)
                return JSONResponse(
                    status_code=429,
                    content={"error": "rate_limited", "detail": "Too many requests"},
                    headers={
                        "Retry-After": str(verdict.retry_after),
                        "RateLimit-Limit": str(verdict.limit),
                        "RateLimit-Remaining": str(verdict.remaining),
                        "X-Request-ID": request_id,
                    },
                )

        try:
            response = await call_next(request)
        except Exception as exc:
            REQUESTS.labels(request.method, path, "500").inc()
            log.error("http.unhandled", path=path, error=str(exc))
            request_id_ctx.reset(token)
            return JSONResponse(
                status_code=500,
                content={"error": "internal_error", "request_id": request_id},
                headers={"X-Request-ID": request_id},
            )

        elapsed = time.perf_counter() - started
        REQUEST_LATENCY.labels(request.method, path).observe(elapsed)
        REQUESTS.labels(request.method, path, str(response.status_code)).inc()
        response.headers["X-Request-ID"] = request_id
        log.info(
            "http.request",
            method=request.method,
            path=path,
            status=response.status_code,
            duration_ms=round(elapsed * 1000, 2),
        )
        request_id_ctx.reset(token)
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError):  # type: ignore[no-untyped-def]
        return JSONResponse(
            status_code=422,
            content={
                "error": "validation_error",
                "detail": exc.errors()[:5],
                "request_id": request_id_ctx.get(),
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_handler(request: Request, exc: StarletteHTTPException):  # type: ignore[no-untyped-def]
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": "http_error",
                "detail": exc.detail,
                "request_id": request_id_ctx.get(),
            },
            headers=getattr(exc, "headers", None),
        )

    @app.get("/metrics", include_in_schema=False)
    def metrics() -> Response:
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    @app.get("/", include_in_schema=False)
    def root() -> dict[str, str]:
        return {
            "service": settings.app_name,
            "docs": "/docs",
            "health": "/health",
            "api": settings.api_prefix,
        }

    app.include_router(health_router)
    app.include_router(router, prefix=settings.api_prefix)
    return app


app = create_app()
