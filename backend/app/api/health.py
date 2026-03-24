"""Health check endpoints."""

import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.repositories.analytics import AnalyticsRepository

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])

# Track application start time
_start_time = time.time()


def _runtime_status() -> dict[str, Any]:
    return {
        "database_configured": bool(settings.database_url),
        "csv_fallback_enabled": settings.use_csv_fallback,
    }


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Comprehensive health check endpoint."""
    uptime_seconds = time.time() - _start_time

    health_data = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": round(uptime_seconds, 2),
        "version": "1.0.0",
        "components": {
            "api": "healthy",
            "runtime": _runtime_status(),
        },
    }

    return health_data


@router.get("/health/liveness")
async def liveness() -> Dict[str, str]:
    """Liveness probe for Kubernetes."""
    return {"status": "alive"}


@router.get("/health/readiness")
async def readiness() -> JSONResponse:
    """Readiness probe with minimal runtime and data checks."""
    repo = AnalyticsRepository()
    data_probe_rows = len(repo._read_csv("route_competition_metrics.csv"))

    reasons: list[str] = []
    if not settings.database_url and not settings.use_csv_fallback:
        reasons.append("No database configured and CSV fallback is disabled")

    if settings.use_csv_fallback and data_probe_rows == 0:
        reasons.append("CSV fallback enabled but route_competition_metrics.csv is missing/empty")

    if reasons:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "not_ready",
                "reasons": reasons,
                "runtime": _runtime_status(),
                "data_probe_rows": data_probe_rows,
            },
        )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "ready",
            "runtime": _runtime_status(),
            "data_probe_rows": data_probe_rows,
        },
    )
