from datetime import datetime, timezone

from fastapi import HTTPException

from app.core.config import settings
from app.core.db import DatabaseUnavailableError
from app.repositories.analytics import AnalyticsRepository
from app.schemas.airport import (
    AirportContextAirport,
    AirportContextResponse,
    AirportEnplanementContext,
    AirportSearchResponse,
    AirportSearchResult,
    RelatedRouteContext,
)
from app.schemas.common import DataProvenance
from app.schemas.intelligence import (
    AirportCompetitionMetrics,
    AirportCompetitionResponse,
    AirportInsight,
    AirportInsightsResponse,
    AirportPeer,
    AirportPeersResponse,
    AirportRoleMetrics,
    AirportRoleResponse,
    IntelligenceMeta,
    RouteCompetitionRecord,
    RouteCompetitionResponse,
    RouteInsight,
    RouteInsightsResponse,
    RouteChangeEvent,
    RouteChangesResponse,
)
from app.schemas.meta import EvidenceCoverageRow, EvidenceResponse, MethodologyResponse
from app.schemas.route import (
    CheapestMonth,
    MonthlyFarePoint,
    ReliabilityPoint,
    ReliabilitySummary,
    RouteDetailResponse,
    RouteExploreCard,
    RouteExploreResponse,
    RouteSummary,
    ScoreBreakdown,
)


class AnalyticsService:
    def __init__(self, repository: AnalyticsRepository | None = None) -> None:
        self.repository = repository or AnalyticsRepository()

    def _metadata(self) -> DataProvenance:
        refreshed = datetime.now(timezone.utc).isoformat()
        if settings.use_csv_fallback:
            return DataProvenance(
                data_source="local_marts_csv",
                is_fallback=True,
                data_complete=False,
                note="CSV fallback mode is enabled; airport names/city/state and reliability coverage may be incomplete.",
                last_refreshed_at=refreshed,
            )
        return DataProvenance(last_refreshed_at=refreshed)

    def search_airports(self, query: str) -> AirportSearchResponse:
        try:
            rows = self.repository.search_airports(query=query)
        except DatabaseUnavailableError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        results = [AirportSearchResult(**row) for row in rows]
        return AirportSearchResponse(
            query=query,
            results=results,
            metadata=self._metadata(),
        )

    def explore_routes(self, origin: str) -> RouteExploreResponse:
        try:
            rows = self.repository.get_route_explorer(origin_iata=origin)
        except DatabaseUnavailableError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        cards: list[RouteExploreCard] = []
        for row in rows:
            headline_fare_insight = (
                f"Latest observed average fare: ${row['latest_avg_fare_usd']:.0f}" if row["latest_avg_fare_usd"] is not None else None
            )
            cards.append(
                RouteExploreCard(
                    destination=AirportContextAirport(
                        iata=row["destination_iata"],
                        airport_name=row["destination_airport_name"],
                        city=row["destination_city"],
                        state=row["destination_state"],
                        country=row["destination_country"],
                    ),
                    latest_route_attractiveness_score=row["latest_route_attractiveness_score"],
                    latest_deal_signal=row["deal_signal"],
                    headline_fare_insight=headline_fare_insight,
                    reliability_summary=ReliabilitySummary(
                        avg_ontime_rate=row["avg_ontime_rate"],
                        avg_cancellation_rate=row["avg_cancellation_rate"],
                    ),
                    score_confidence=row["score_confidence"],
                )
            )

        return RouteExploreResponse(origin=origin, routes=cards, metadata=self._metadata())

    def route_detail(self, origin: str, destination: str) -> RouteDetailResponse:
        try:
            payload = self.repository.get_route_detail(origin_iata=origin, destination_iata=destination)
        except DatabaseUnavailableError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        if payload is None:
            raise HTTPException(status_code=404, detail="Route not found.")

        route = payload["route"]
        return RouteDetailResponse(
            route_summary=RouteSummary(
                origin=AirportContextAirport(
                    iata=route["origin_iata"],
                    airport_name=route["origin_airport_name"],
                    city=route["origin_city"],
                    state=route["origin_state"],
                    country=route["origin_country"],
                ),
                destination=AirportContextAirport(
                    iata=route["destination_iata"],
                    airport_name=route["destination_airport_name"],
                    city=route["destination_city"],
                    state=route["destination_state"],
                    country=route["destination_country"],
                ),
            ),
            monthly_fare_trend=[MonthlyFarePoint(**point) for point in payload["fares"]],
            reliability_trend=[ReliabilityPoint(**point) for point in payload["reliability"]],
            latest_score_breakdown=ScoreBreakdown(**payload["score"]) if payload["score"] else None,
            cheapest_month=CheapestMonth(**payload["cheapest_month"]) if payload["cheapest_month"] else None,
            methodology_hint="Scores are generated via v1_heuristic methodology; consult /meta/methodology for caveats.",
            metadata=self._metadata(),
        )

    def airport_context(self, iata: str) -> AirportContextResponse:
        try:
            payload = self.repository.get_airport_context(iata=iata)
        except DatabaseUnavailableError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        if payload is None:
            raise HTTPException(status_code=404, detail="Airport not found.")

        airport = payload["airport"]
        return AirportContextResponse(
            airport=AirportContextAirport(
                iata=airport["iata"],
                airport_name=airport["airport_name"],
                city=airport["city"],
                state=airport["state"],
                country=airport["country"],
            ),
            latest_enplanement=AirportEnplanementContext(**payload["enplanement"]) if payload["enplanement"] else None,
            related_routes=[RelatedRouteContext(**route) for route in payload["related_routes"]],
            metadata=self._metadata(),
        )


    def route_changes(
        self,
        airport_iata: str | None = None,
        carrier_code: str | None = None,
        year: int | None = None,
        month: int | None = None,
        change_type: str | None = None,
        limit: int = 100,
    ) -> RouteChangesResponse:
        try:
            events = self.repository.get_route_changes(
                airport_iata=airport_iata,
                carrier_code=carrier_code,
                year=year,
                month=month,
                change_type=change_type,
                limit=limit,
            )
        except DatabaseUnavailableError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        coverage = (
            "Route change events loaded from route_change_events mart (MVP heuristic event detection)."
            if events
            else "No route change records found for current filters and loaded data slices."
        )
        return RouteChangesResponse(
            filters={
                "airport_iata": airport_iata,
                "carrier_code": carrier_code,
                "year": year,
                "month": month,
                "change_type": change_type,
                "limit": limit,
            },
            events=[RouteChangeEvent(**event) for event in events],
            metadata=self._metadata(),
            intelligence_meta=IntelligenceMeta(
                methodology_version="v0_competitiveness",
                coverage_summary=coverage,
            ),
        )

    def airport_role(self, iata: str) -> AirportRoleResponse:
        try:
            airport_context = self.repository.get_airport_context(iata=iata)
            metrics = self.repository.get_airport_role_metrics(iata=iata)
        except DatabaseUnavailableError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        if airport_context is None:
            raise HTTPException(status_code=404, detail="Airport not found.")

        airport = airport_context["airport"]
        return AirportRoleResponse(
            airport=AirportContextAirport(
                iata=airport["iata"],
                airport_name=airport["airport_name"],
                city=airport["city"],
                state=airport["state"],
                country=airport["country"],
            ),
            metrics=AirportRoleMetrics(**metrics) if metrics else None,
            metadata=self._metadata(),
            intelligence_meta=IntelligenceMeta(
                methodology_version="v0_competitiveness",
                coverage_summary="Airport role metrics derive from airport_role_metrics snapshots and should be treated as directional in MVP mode.",
            ),
        )

    def airport_peers(self, iata: str, limit: int = 5) -> AirportPeersResponse:
        try:
            airport_context = self.repository.get_airport_context(iata=iata)
            peers = self.repository.get_airport_peer_metrics(iata=iata, limit=limit)
        except DatabaseUnavailableError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        if airport_context is None:
            raise HTTPException(status_code=404, detail="Airport not found.")

        airport = airport_context["airport"]
        return AirportPeersResponse(
            airport=AirportContextAirport(
                iata=airport["iata"],
                airport_name=airport["airport_name"],
                city=airport["city"],
                state=airport["state"],
                country=airport["country"],
            ),
            peers=[AirportPeer(**peer) for peer in peers],
            comparison_basis="Closest outbound route count and destination diversity in latest available month.",
            metadata=self._metadata(),
            intelligence_meta=IntelligenceMeta(
                methodology_version="v0_competitiveness",
                coverage_summary="Peer set computed from airport_role_metrics latest snapshots.",
            ),
        )

    def route_competition(
        self,
        origin_iata: str | None = None,
        destination_iata: str | None = None,
        airport_iata: str | None = None,
        year: int | None = None,
        month: int | None = None,
        limit: int = 100,
    ) -> RouteCompetitionResponse:
        try:
            rows = self.repository.get_route_competition(
                origin_iata=origin_iata,
                destination_iata=destination_iata,
                airport_iata=airport_iata,
                year=year,
                month=month,
                limit=limit,
            )
        except DatabaseUnavailableError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        coverage = (
            "Route competition metrics derive from schedule_snapshots and carrier-share concentration proxies."
            if rows
            else "No route competition rows found for current filters and loaded slices."
        )
        return RouteCompetitionResponse(
            filters={
                "origin_iata": origin_iata,
                "destination_iata": destination_iata,
                "airport_iata": airport_iata,
                "year": year,
                "month": month,
                "limit": limit,
            },
            rows=[RouteCompetitionRecord(**row) for row in rows],
            metadata=self._metadata(),
            intelligence_meta=IntelligenceMeta(
                methodology_version="v0_competition",
                coverage_summary=coverage,
            ),
        )

    def airport_competition(self, iata: str) -> AirportCompetitionResponse:
        try:
            airport_context = self.repository.get_airport_context(iata=iata)
            metrics = self.repository.get_airport_competition_metrics(iata=iata)
        except DatabaseUnavailableError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        if airport_context is None:
            raise HTTPException(status_code=404, detail="Airport not found.")

        airport = airport_context["airport"]
        return AirportCompetitionResponse(
            airport=AirportContextAirport(
                iata=airport["iata"],
                airport_name=airport["airport_name"],
                city=airport["city"],
                state=airport["state"],
                country=airport["country"],
            ),
            metrics=AirportCompetitionMetrics(**metrics) if metrics else None,
            metadata=self._metadata(),
            intelligence_meta=IntelligenceMeta(
                methodology_version="v0_competition",
                coverage_summary="Airport competition metrics derive from outbound schedule share and route competition labels.",
            ),
        )

    @staticmethod
    def _confidence_from_coverage(flights_observed: int, consistency_points: int) -> str:
        if flights_observed >= 200 and consistency_points >= 3:
            return "high"
        if flights_observed >= 80 and consistency_points >= 2:
            return "medium"
        return "low"

    def route_insights(
        self,
        airport_iata: str | None = None,
        origin_iata: str | None = None,
        destination_iata: str | None = None,
        limit: int = 50,
    ) -> RouteInsightsResponse:
        try:
            rows = self.repository.get_route_competition(
                airport_iata=airport_iata,
                origin_iata=origin_iata,
                destination_iata=destination_iata,
                limit=500,
            )
        except DatabaseUnavailableError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        by_route: dict[str, list[dict]] = {}
        for row in rows:
            by_route.setdefault(row["route_key"], []).append(row)

        insights: list[RouteInsight] = []
        for route_key, history in by_route.items():
            history.sort(key=lambda r: (r["year"], r["month"]), reverse=True)
            latest = history[0]
            previous = history[1] if len(history) > 1 else None
            label = None
            explanation = None

            hhi_delta = 0.0
            if previous:
                hhi_delta = latest["carrier_concentration_hhi"] - previous["carrier_concentration_hhi"]

            churn = latest["entrant_count"] + latest["exit_count"]
            if previous and hhi_delta <= -200 and latest["entrant_count"] > 0:
                label = "competition increasing"
                explanation = "Concentration dropped and at least one entrant appeared versus prior period."
            elif previous and hhi_delta >= 200 and latest["exit_count"] > 0:
                label = "market consolidation"
                explanation = "Concentration rose and at least one carrier exit appeared versus prior period."
            elif latest["entrant_count"] >= 1 and latest["entrant_pressure_signal"] in ("pressure_up", "rotation"):
                label = "new entrant pressure"
                explanation = "New carrier presence is increasing competitive pressure on the route."
            elif churn >= 2:
                label = "unstable competition"
                explanation = "High entrant/exit churn indicates unstable competitive structure."
            elif latest["dominant_carrier_share"] >= 0.6:
                label = "stable dominance"
                explanation = "One carrier holds durable share dominance in current observed slice."

            if not label:
                continue

            confidence = self._confidence_from_coverage(latest["flights_observed"], len(history))
            if confidence == "low":
                continue

            insights.append(
                RouteInsight(
                    route_key=route_key,
                    origin_iata=latest["origin_iata"],
                    destination_iata=latest["destination_iata"],
                    year=latest["year"],
                    month=latest["month"],
                    insight_label=label,
                    explanation=explanation or "Derived from deterministic competition rules.",
                    confidence=confidence,
                    metrics_snapshot={
                        "values": {
                            "active_carriers": latest["active_carriers"],
                            "dominant_carrier_share": latest["dominant_carrier_share"],
                            "carrier_concentration_hhi": latest["carrier_concentration_hhi"],
                            "entrant_count": latest["entrant_count"],
                            "exit_count": latest["exit_count"],
                            "hhi_delta_vs_prev": round(hhi_delta, 3),
                            "flights_observed": latest["flights_observed"],
                        }
                    },
                )
            )

        insights.sort(key=lambda i: (i.year, i.month), reverse=True)
        return RouteInsightsResponse(
            filters={
                "airport_iata": airport_iata,
                "origin_iata": origin_iata,
                "destination_iata": destination_iata,
                "limit": limit,
            },
            insights=insights[:limit],
            metadata=self._metadata(),
            intelligence_meta=IntelligenceMeta(
                methodology_version="v0_competition_insights",
                coverage_summary="Insights are deterministic rules over route_competition_metrics history; low-confidence insights are suppressed.",
            ),
        )

    def airport_insights(self, iata: str) -> AirportInsightsResponse:
        try:
            airport_context = self.repository.get_airport_context(iata=iata)
            history = self.repository.get_airport_competition_history(iata=iata, periods=6)
            route_rows = self.repository.get_route_competition(airport_iata=iata, limit=500)
        except DatabaseUnavailableError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        if airport_context is None:
            raise HTTPException(status_code=404, detail="Airport not found.")

        airport = airport_context["airport"]
        if not history:
            return AirportInsightsResponse(
                airport=AirportContextAirport(
                    iata=airport["iata"],
                    airport_name=airport["airport_name"],
                    city=airport["city"],
                    state=airport["state"],
                    country=airport["country"],
                ),
                insights=[],
                metadata=self._metadata(),
                intelligence_meta=IntelligenceMeta(
                    methodology_version="v0_competition_insights",
                    coverage_summary="No airport competition history available for current loaded slice.",
                ),
            )

        latest = history[0]
        previous = history[1] if len(history) > 1 else None
        hhi_delta = (latest["carrier_concentration_hhi"] - previous["carrier_concentration_hhi"]) if previous else 0.0

        aggregate_churn = sum((r["entrant_count"] + r["exit_count"]) for r in route_rows[:50])
        insights: list[AirportInsight] = []

        def add(label: str, explanation: str) -> None:
            confidence = self._confidence_from_coverage(latest["flights_observed"], len(history))
            if confidence == "low":
                return
            insights.append(
                AirportInsight(
                    iata=iata,
                    year=latest["year"],
                    month=latest["month"],
                    insight_label=label,
                    explanation=explanation,
                    confidence=confidence,
                    metrics_snapshot={
                        "values": {
                            "active_carriers": latest["active_carriers"],
                            "dominant_carrier_share": latest["dominant_carrier_share"],
                            "carrier_concentration_hhi": latest["carrier_concentration_hhi"],
                            "contested_route_share": latest["contested_route_share"],
                            "hhi_delta_vs_prev": round(hhi_delta, 3),
                            "aggregate_route_churn": aggregate_churn,
                            "flights_observed": latest["flights_observed"],
                        }
                    },
                )
            )

        if previous and hhi_delta <= -150 and latest["contested_route_share"] > previous["contested_route_share"]:
            add("competition increasing", "Airport competition is broadening: concentration down and contested-route share up.")
        if previous and hhi_delta >= 150 and latest["contested_route_share"] < previous["contested_route_share"]:
            add("market consolidation", "Airport concentration is increasing while contested-route share is shrinking.")
        if latest["dominant_carrier_share"] >= 0.5:
            add("stable dominance", "Dominant carrier share remains above 50%, indicating structural carrier pressure zone.")
        if aggregate_churn >= 8:
            add("unstable competition", "High route-level entrant/exit churn suggests unstable airport competition conditions.")

        return AirportInsightsResponse(
            airport=AirportContextAirport(
                iata=airport["iata"],
                airport_name=airport["airport_name"],
                city=airport["city"],
                state=airport["state"],
                country=airport["country"],
            ),
            insights=insights,
            metadata=self._metadata(),
            intelligence_meta=IntelligenceMeta(
                methodology_version="v0_competition_insights",
                coverage_summary="Airport insights are deterministic rules over airport and route competition snapshots; low-confidence outputs are suppressed.",
            ),
        )

    def methodology(self) -> MethodologyResponse:
        return MethodologyResponse(
            score_version="v1_heuristic",
            metric_descriptions={
                "reliability_score": "Scaled 0-100 from route-level on-time and cancellation behavior.",
                "fare_volatility": "Relative variability in observed route fares across available months.",
                "route_attractiveness_score": "Composite score blending fare and reliability indicators.",
                "deal_signal": "Categorical signal: strong_deal, deal, neutral, or expensive.",
            },
            caveats=[
                "Coverage is limited to loaded BTS and FAA slices in the local mart dataset.",
                "Scores are heuristic and intended for MVP decision support, not financial-grade forecasting.",
                "Sparse routes may have low confidence due to limited monthly observations.",
            ],
            source_coverage_notes=[
                "Fares: BTS DB1B-derived monthly aggregates.",
                "Reliability: BTS On-Time Performance-derived on-time and cancellation marts.",
                "Airport context: FAA annual enplanements when available.",
            ],
        )

    def evidence(self) -> EvidenceResponse:
        datasets = [
            "monthly_fares.csv",
            "ontime_stats.csv",
            "cancellations.csv",
            "route_scores.csv",
            "schedule_snapshots.csv",
            "route_change_events.csv",
            "airport_role_metrics.csv",
            "route_competition_metrics.csv",
            "airport_competition_metrics.csv",
        ]
        coverage: list[EvidenceCoverageRow] = []
        for dataset in datasets:
            rows = self.repository._read_csv(dataset)  # intentional shared local reader for evidence endpoint
            coverage.append(EvidenceCoverageRow(dataset=dataset, row_count=len(rows)))

        return EvidenceResponse(
            methodology_version="v0_competitiveness",
            coverage=coverage,
            freshness_note="Counts are based on currently loaded mart CSV files when in fallback mode.",
        )
