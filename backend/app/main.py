"""Main FastAPI application with production middleware."""

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from app.api.airports import router as airports_router
from app.api.health import router as health_router
from app.api.intelligence import router as intelligence_router
from app.api.meta import router as meta_router
from app.api.routes import router as routes_router
from app.core.config import settings
from app.core.logging_config import LogConfig, setup_logging
from app.middleware import ErrorHandlerMiddleware, validation_exception_handler

# Setup logging
log_config = LogConfig()
setup_logging(log_config)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info(
        "Application startup",
        extra={
            "version": app.version,
            "database_mode": "postgres" if settings.database_url else "none",
            "csv_fallback": settings.use_csv_fallback,
            "cors_origins": settings.cors_origins,
        },
    )
    yield
    # Shutdown
    logger.info("Application shutdown")


def create_app() -> FastAPI:
    """Application factory for the Flight Price Intelligence backend."""
    app = FastAPI(
        title="Flight Price Intelligence API",
        description="MVP analytics API for route intelligence exploration and context.",
        version="0.2.0",
        lifespan=lifespan,
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Request logging middleware
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        """Log all HTTP requests with duration."""
        start_time = time.time()

        response = await call_next(request)

        duration_ms = (time.time() - start_time) * 1000
        logger.info(
            f"{request.method} {request.url.path}",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
                "client": request.client.host if request.client else "unknown",
            },
        )

        return response

    # Error handling middleware
    app.add_middleware(ErrorHandlerMiddleware)

    # Exception handlers
    app.add_exception_handler(ValidationError, validation_exception_handler)

    # Include routers
    app.include_router(health_router)
    app.include_router(airports_router)
    app.include_router(routes_router)
    app.include_router(meta_router)
    app.include_router(intelligence_router)

    @app.get("/")
    async def root():
        """Root endpoint."""
        return {
            "message": "Flight Price Intelligence API",
            "version": "0.2.0",
            "docs": "/docs",
            "health": "/health",
            "runtime": {
                "database_configured": bool(settings.database_url),
                "csv_fallback_enabled": settings.use_csv_fallback,
            },
        }

    return app


app = create_app()
