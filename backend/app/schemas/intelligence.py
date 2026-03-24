from pydantic import BaseModel, Field

from app.schemas.airport import AirportContextAirport
from app.schemas.common import DataProvenance


class IntelligenceMeta(BaseModel):
    methodology_version: str = Field(default="v0_competitiveness")
    coverage_summary: str


class RouteChangeEvent(BaseModel):
    route_key: str
    origin_iata: str
    destination_iata: str
    year: int
    month: int
    change_type: str
    previous_frequency: int | None = None
    current_frequency: int | None = None
    frequency_delta: int | None = None
    dominant_carrier: str | None = None
    confidence: str = "low"
    significance: str = "moderate"


class RouteChangesResponse(BaseModel):
    filters: dict[str, str | int | None]
    events: list[RouteChangeEvent]
    metadata: DataProvenance
    intelligence_meta: IntelligenceMeta


class AirportRoleMetrics(BaseModel):
    iata: str
    year: int
    month: int
    outbound_routes: int
    destination_diversity_index: float
    carrier_concentration_hhi: float
    dominant_carrier_share: float
    role_label: str


class AirportRoleResponse(BaseModel):
    airport: AirportContextAirport
    metrics: AirportRoleMetrics | None = None
    metadata: DataProvenance
    intelligence_meta: IntelligenceMeta


class AirportPeer(BaseModel):
    iata: str
    outbound_routes: int | None = None
    destination_diversity_index: float | None = None
    dominant_carrier_share: float | None = None
    role_label: str | None = None


class AirportPeersResponse(BaseModel):
    airport: AirportContextAirport
    peers: list[AirportPeer]
    comparison_basis: str
    metadata: DataProvenance
    intelligence_meta: IntelligenceMeta


class RouteCompetitionRecord(BaseModel):
    route_key: str
    origin_iata: str
    destination_iata: str
    year: int
    month: int
    active_carriers: int
    dominant_carrier_share: float
    carrier_concentration_hhi: float
    entrant_count: int
    exit_count: int
    entrant_pressure_signal: str
    competition_label: str
    confidence: str
    flights_observed: int


class RouteCompetitionResponse(BaseModel):
    filters: dict[str, str | int | None]
    rows: list[RouteCompetitionRecord]
    metadata: DataProvenance
    intelligence_meta: IntelligenceMeta


class AirportCompetitionMetrics(BaseModel):
    iata: str
    year: int
    month: int
    active_outbound_routes: int
    active_carriers: int
    dominant_carrier_share: float
    carrier_concentration_hhi: float
    contested_route_count: int
    monopoly_route_count: int
    contested_route_share: float
    competition_label: str
    confidence: str
    flights_observed: int


class AirportCompetitionResponse(BaseModel):
    airport: AirportContextAirport
    metrics: AirportCompetitionMetrics | None = None
    metadata: DataProvenance
    intelligence_meta: IntelligenceMeta


class InsightMetricsSnapshot(BaseModel):
    values: dict[str, float | int | str | None]


class RouteInsight(BaseModel):
    route_key: str
    origin_iata: str
    destination_iata: str
    year: int
    month: int
    insight_label: str
    explanation: str
    confidence: str
    metrics_snapshot: InsightMetricsSnapshot
    prior_period_year: int | None = None
    prior_period_month: int | None = None
    trigger_deltas: dict[str, float | int] = {}
    methodology_version: str = "v0_competition_insights"


class RouteInsightsResponse(BaseModel):
    filters: dict[str, str | int | None]
    insights: list[RouteInsight]
    generated_count: int
    suppressed_low_confidence_count: int
    confidence_distribution: dict[str, int]
    metadata: DataProvenance
    intelligence_meta: IntelligenceMeta


class AirportInsight(BaseModel):
    iata: str
    year: int
    month: int
    insight_label: str
    explanation: str
    confidence: str
    metrics_snapshot: InsightMetricsSnapshot
    prior_period_year: int | None = None
    prior_period_month: int | None = None
    trigger_deltas: dict[str, float | int] = {}
    methodology_version: str = "v0_competition_insights"


class AirportInsightsResponse(BaseModel):
    airport: AirportContextAirport
    insights: list[AirportInsight]
    generated_count: int
    suppressed_low_confidence_count: int
    confidence_distribution: dict[str, int]
    metadata: DataProvenance
    intelligence_meta: IntelligenceMeta


class RouteInsightTimelinePoint(BaseModel):
    year: int
    month: int
    carrier_concentration_hhi: float
    active_carriers: int
    dominant_carrier_share: float
    entrant_count: int
    exit_count: int
    inferred_label: str | None = None


class RouteInsightTimelineResponse(BaseModel):
    route_key: str
    points: list[RouteInsightTimelinePoint]
    metadata: DataProvenance
    intelligence_meta: IntelligenceMeta
