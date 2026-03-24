from fastapi import APIRouter

from app.schemas.meta import EvidenceResponse, MethodologyResponse
from app.services.analytics import AnalyticsService

router = APIRouter(prefix="/meta", tags=["meta"])
service = AnalyticsService()


@router.get("/methodology", response_model=MethodologyResponse)
def methodology() -> MethodologyResponse:
    return service.methodology()


@router.get("/evidence", response_model=EvidenceResponse)
def evidence() -> EvidenceResponse:
    return service.evidence()
