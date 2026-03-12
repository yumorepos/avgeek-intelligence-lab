from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str]:
    """Simple liveness endpoint for local development."""
    return {"status": "ok"}
