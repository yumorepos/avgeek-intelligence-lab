from fastapi import APIRouter, Query

from app.schemas.intelligence import (
    IntelligenceSupportedAirportsResponse,
    AirportCompetitionResponse,
    AirportInsightsResponse,
    AirportPeersResponse,
    AirportRoleResponse,
    RouteChangesResponse,
    RouteCompetitionResponse,
    RouteInsightTimelineResponse,
    RouteInsightsResponse,
)
from app.services.analytics import AnalyticsService

router = APIRouter(prefix="/intelligence", tags=["intelligence"])
service = AnalyticsService()


@router.get("/airports/supported", response_model=IntelligenceSupportedAirportsResponse)
def supported_airports() -> IntelligenceSupportedAirportsResponse:
    return service.supported_airports()


@router.get("/routes/changes", response_model=RouteChangesResponse)
def route_changes(
    airport_iata: str | None = Query(default=None, min_length=3, max_length=3),
    carrier_code: str | None = Query(default=None, min_length=2, max_length=3),
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    change_type: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
) -> RouteChangesResponse:
    return service.route_changes(
        airport_iata=airport_iata.strip().upper() if airport_iata else None,
        carrier_code=carrier_code.strip().upper() if carrier_code else None,
        year=year,
        month=month,
        change_type=change_type,
        limit=limit,
    )


@router.get("/airports/{iata}/role", response_model=AirportRoleResponse)
def airport_role(iata: str) -> AirportRoleResponse:
    return service.airport_role(iata=iata.strip().upper())


@router.get("/airports/{iata}/peers", response_model=AirportPeersResponse)
def airport_peers(iata: str, limit: int = Query(default=5, ge=1, le=20)) -> AirportPeersResponse:
    return service.airport_peers(iata=iata.strip().upper(), limit=limit)


@router.get("/routes/competition", response_model=RouteCompetitionResponse)
def route_competition(
    origin_iata: str | None = Query(default=None, min_length=3, max_length=3),
    destination_iata: str | None = Query(default=None, min_length=3, max_length=3),
    airport_iata: str | None = Query(default=None, min_length=3, max_length=3),
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    limit: int = Query(default=100, ge=1, le=500),
) -> RouteCompetitionResponse:
    return service.route_competition(
        origin_iata=origin_iata.strip().upper() if origin_iata else None,
        destination_iata=destination_iata.strip().upper() if destination_iata else None,
        airport_iata=airport_iata.strip().upper() if airport_iata else None,
        year=year,
        month=month,
        limit=limit,
    )


@router.get("/airports/{iata}/competition", response_model=AirportCompetitionResponse)
def airport_competition(iata: str) -> AirportCompetitionResponse:
    return service.airport_competition(iata=iata.strip().upper())


@router.get("/routes/insights", response_model=RouteInsightsResponse)
def route_insights(
    airport_iata: str | None = Query(default=None, min_length=3, max_length=3),
    origin_iata: str | None = Query(default=None, min_length=3, max_length=3),
    destination_iata: str | None = Query(default=None, min_length=3, max_length=3),
    limit: int = Query(default=50, ge=1, le=200),
) -> RouteInsightsResponse:
    return service.route_insights(
        airport_iata=airport_iata.strip().upper() if airport_iata else None,
        origin_iata=origin_iata.strip().upper() if origin_iata else None,
        destination_iata=destination_iata.strip().upper() if destination_iata else None,
        limit=limit,
    )


@router.get("/airports/{iata}/insights", response_model=AirportInsightsResponse)
def airport_insights(iata: str) -> AirportInsightsResponse:
    return service.airport_insights(iata=iata.strip().upper())


@router.get("/routes/{origin}/{destination}/insight-timeline", response_model=RouteInsightTimelineResponse)
def route_insight_timeline(origin: str, destination: str, periods: int = Query(default=12, ge=2, le=36)) -> RouteInsightTimelineResponse:
    return service.route_insight_timeline(origin=origin.strip().upper(), destination=destination.strip().upper(), periods=periods)
