"""Render-friendly entrypoint.

Allows `uvicorn main:app` from backend/ while preserving package imports from app.main.
"""

from app.main import app

__all__ = ["app"]
