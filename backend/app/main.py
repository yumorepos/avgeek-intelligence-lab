from fastapi import FastAPI

from app.api.health import router as health_router


def create_app() -> FastAPI:
    """Application factory for the Flight Price Intelligence backend."""
    app = FastAPI(
        title="Flight Price Intelligence API",
        description="Backend foundation scaffold for route intelligence services.",
        version="0.1.0",
    )
    app.include_router(health_router)
    return app


app = create_app()
