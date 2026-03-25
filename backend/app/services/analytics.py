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
    IntelligenceReadiness,
    IntelligenceSupportedAirport,
    IntelligenceSupportedAirportsResponse,
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
    RouteInsightTimelinePoint,
    RouteInsightTimelineResponse,
    RouteInsightsResponse,
    RouteChangeEvent,
    RouteChangesResponse,
)
from app.schemas.meta import EvidenceCoverageRow, EvidenceResponse, InsightQualityResponse, MethodologyResponse
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

    def supported_airports(self) -> IntelligenceSupportedAirportsResponse:
        try:
            payload = self.repository.get_intelligence_supported_airports()
        except DatabaseUnavailableError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        required_marts = payload["required_marts"]
        required_non_empty = (
            required_marts.get("airport_role_metrics", 0) > 0
            and required_marts.get("airport_competition_metrics", 0) > 0
            and required_marts.get("route_competition_metrics", 0) > 0
        )
        ready = required_non_empty and len(payload["airports"]) > 0
        reason = None
        if not ready:
            reason = (
                "Backend intelligence marts are not data-ready. "
                "Expected non-empty airport_role_metrics, airport_competition_metrics, and route_competition_metrics."
            )

        return IntelligenceSupportedAirportsResponse(
            airports=[IntelligenceSupportedAirport(iata=iata) for iata in payload["airports"]],
            readiness=IntelligenceReadiness(is_ready=ready, reason=reason, required_marts=required_marts),
            metadata=self._metadata(),
            intelligence_meta=IntelligenceMeta(
                methodology_version="v0_competitiveness",
                coverage_summary=(
                    "Supported airports are computed from overlap of airport_role_metrics and airport_competition_metrics in loaded backend data."
                ),
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

    @staticmethod
    def _quantile(values: list[float], q: float) -> float:
        if not values:
            return 0.0
        ordered = sorted(values)
        idx = int((len(ordered) - 1) * q)
        return float(ordered[idx])

    def _calibrated_thresholds(self, rows: list[dict]) -> dict[str, float]:
        hhi_deltas: list[float] = []
        by_route: dict[str, list[dict]] = {}
        for row in rows:
            by_route.setdefault(row["route_key"], []).append(row)
        for history in by_route.values():
            history.sort(key=lambda r: (r["year"], r["month"]), reverse=True)
            for i in range(len(history) - 1):
                hhi_deltas.append(abs(history[i]["carrier_concentration_hhi"] - history[i + 1]["carrier_concentration_hhi"]))

        hhi_q75 = self._quantile(hhi_deltas, 0.75) if hhi_deltas else 0.0
        return {
            "hhi_delta_trigger": max(150.0, min(350.0, hhi_q75)),
            "route_dominance_share": 0.6,
            "airport_dominance_share": 0.5,
            "route_churn_trigger": 2.0,
            "airport_churn_trigger": 8.0,
        }

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

        thresholds = self._calibrated_thresholds(rows)
        by_route: dict[str, list[dict]] = {}
        for row in rows:
            by_route.setdefault(row["route_key"], []).append(row)

        insights: list[RouteInsight] = []
        suppressed_low_confidence_count = 0
        generated_count = 0
        confidence_distribution = {"high": 0, "medium": 0, "low": 0}
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
            if previous and hhi_delta <= -thresholds["hhi_delta_trigger"] and latest["entrant_count"] > 0:
                label = "competition increasing"
                explanation = "Concentration dropped and at least one entrant appeared versus prior period."
            elif previous and hhi_delta >= thresholds["hhi_delta_trigger"] and latest["exit_count"] > 0:
                label = "market consolidation"
                explanation = "Concentration rose and at least one carrier exit appeared versus prior period."
            elif latest["entrant_count"] >= 1 and latest["entrant_pressure_signal"] in ("pressure_up", "rotation"):
                label = "new entrant pressure"
                explanation = "New carrier presence is increasing competitive pressure on the route."
            elif churn >= thresholds["route_churn_trigger"]:
                label = "unstable competition"
                explanation = "High entrant/exit churn indicates unstable competitive structure."
            elif latest["dominant_carrier_share"] >= thresholds["route_dominance_share"]:
                label = "stable dominance"
                explanation = "One carrier holds durable share dominance in current observed slice."

            if not label:
                continue

            generated_count += 1
            confidence = self._confidence_from_coverage(latest["flights_observed"], len(history))
            confidence_distribution[confidence] = confidence_distribution.get(confidence, 0) + 1
            if confidence == "low":
                suppressed_low_confidence_count += 1
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
                    prior_period_year=previous["year"] if previous else None,
                    prior_period_month=previous["month"] if previous else None,
                    trigger_deltas={
                        "hhi_delta_vs_prev": round(hhi_delta, 3),
                        "entrant_minus_exit": latest["entrant_count"] - latest["exit_count"],
                        "churn": churn,
                    },
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
            generated_count=generated_count,
            suppressed_low_confidence_count=suppressed_low_confidence_count,
            confidence_distribution=confidence_distribution,
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
                generated_count=0,
                suppressed_low_confidence_count=0,
                confidence_distribution={"high": 0, "medium": 0, "low": 0},
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
        thresholds = self._calibrated_thresholds(route_rows)
        insights: list[AirportInsight] = []
        generated_count = 0
        suppressed_low_confidence_count = 0
        confidence_distribution = {"high": 0, "medium": 0, "low": 0}

        def add(label: str, explanation: str) -> None:
            nonlocal generated_count, suppressed_low_confidence_count
            generated_count += 1
            confidence = self._confidence_from_coverage(latest["flights_observed"], len(history))
            confidence_distribution[confidence] = confidence_distribution.get(confidence, 0) + 1
            if confidence == "low":
                suppressed_low_confidence_count += 1
                return
            insights.append(
                AirportInsight(
                    iata=iata,
                    year=latest["year"],
                    month=latest["month"],
                    insight_label=label,
                    explanation=explanation,
                    confidence=confidence,
                    prior_period_year=previous["year"] if previous else None,
                    prior_period_month=previous["month"] if previous else None,
                    trigger_deltas={
                        "hhi_delta_vs_prev": round(hhi_delta, 3),
                        "aggregate_route_churn": aggregate_churn,
                    },
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

        if previous and hhi_delta <= -thresholds["hhi_delta_trigger"] and latest["contested_route_share"] > previous["contested_route_share"]:
            add("competition increasing", "Airport competition is broadening: concentration down and contested-route share up.")
        if previous and hhi_delta >= thresholds["hhi_delta_trigger"] and latest["contested_route_share"] < previous["contested_route_share"]:
            add("market consolidation", "Airport concentration is increasing while contested-route share is shrinking.")
        if latest["dominant_carrier_share"] >= thresholds["airport_dominance_share"]:
            add("stable dominance", "Dominant carrier share remains above 50%, indicating structural carrier pressure zone.")
        if aggregate_churn >= thresholds["airport_churn_trigger"]:
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
            generated_count=generated_count,
            suppressed_low_confidence_count=suppressed_low_confidence_count,
            confidence_distribution=confidence_distribution,
            metadata=self._metadata(),
            intelligence_meta=IntelligenceMeta(
                methodology_version="v0_competition_insights",
                coverage_summary="Airport insights are deterministic rules over airport and route competition snapshots; low-confidence outputs are suppressed.",
            ),
        )

    def route_insight_timeline(self, origin: str, destination: str, periods: int = 12) -> RouteInsightTimelineResponse:
        route_key = f"{origin}-{destination}"
        try:
            history = self.repository.get_route_competition_history(route_key=route_key, periods=periods)
        except DatabaseUnavailableError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        thresholds = self._calibrated_thresholds(history)
        points: list[RouteInsightTimelinePoint] = []
        sorted_history = sorted(history, key=lambda r: (r["year"], r["month"]))
        for idx, row in enumerate(sorted_history):
            prev = sorted_history[idx - 1] if idx > 0 else None
            label = None
            if prev:
                hhi_delta = row["carrier_concentration_hhi"] - prev["carrier_concentration_hhi"]
                churn = row["entrant_count"] + row["exit_count"]
                if hhi_delta <= -thresholds["hhi_delta_trigger"] and row["entrant_count"] > 0:
                    label = "competition increasing"
                elif hhi_delta >= thresholds["hhi_delta_trigger"] and row["exit_count"] > 0:
                    label = "market consolidation"
                elif row["entrant_count"] >= 1 and row["entrant_pressure_signal"] in ("pressure_up", "rotation"):
                    label = "new entrant pressure"
                elif churn >= thresholds["route_churn_trigger"]:
                    label = "unstable competition"
                elif row["dominant_carrier_share"] >= thresholds["route_dominance_share"]:
                    label = "stable dominance"

            points.append(
                RouteInsightTimelinePoint(
                    year=row["year"],
                    month=row["month"],
                    carrier_concentration_hhi=row["carrier_concentration_hhi"],
                    active_carriers=row["active_carriers"],
                    dominant_carrier_share=row["dominant_carrier_share"],
                    entrant_count=row["entrant_count"],
                    exit_count=row["exit_count"],
                    inferred_label=label,
                )
            )

        return RouteInsightTimelineResponse(
            route_key=route_key,
            points=points,
            metadata=self._metadata(),
            intelligence_meta=IntelligenceMeta(
                methodology_version="v0_competition_insights",
                coverage_summary="Timeline labels are inferred by applying insight rules period-over-period on route competition history.",
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

    def insight_quality(self) -> InsightQualityResponse:
        rows = self.repository._read_csv("route_competition_metrics.csv")
        parsed = []
        for row in rows:
            try:
                parsed.append(
                    {
                        "route_key": row.get("route_key", ""),
                        "year": int(row.get("year", 0)),
                        "month": int(row.get("month", 0)),
                        "carrier_concentration_hhi": float(row.get("carrier_concentration_hhi", 0)),
                        "entrant_count": int(row.get("entrant_count", 0)),
                        "exit_count": int(row.get("exit_count", 0)),
                        "dominant_carrier_share": float(row.get("dominant_carrier_share", 0)),
                        "entrant_pressure_signal": row.get("entrant_pressure_signal", "stable"),
                        "flights_observed": int(row.get("flights_observed", 0)),
                    }
                )
            except ValueError:
                continue

        thresholds = self._calibrated_thresholds(parsed)
        by_route: dict[str, list[dict]] = {}
        for row in parsed:
            by_route.setdefault(row["route_key"], []).append(row)

        label_distribution: dict[str, int] = {}
        confidence_distribution = {"high": 0, "medium": 0, "low": 0}
        generated = 0
        suppressed = 0
        for history in by_route.values():
            history.sort(key=lambda r: (r["year"], r["month"]), reverse=True)
            latest = history[0]
            prev = history[1] if len(history) > 1 else None
            if not prev:
                continue
            hhi_delta = latest["carrier_concentration_hhi"] - prev["carrier_concentration_hhi"]
            label = None
            if hhi_delta <= -thresholds["hhi_delta_trigger"] and latest["entrant_count"] > 0:
                label = "competition increasing"
            elif hhi_delta >= thresholds["hhi_delta_trigger"] and latest["exit_count"] > 0:
                label = "market consolidation"
            elif latest["entrant_count"] >= 1 and latest["entrant_pressure_signal"] in ("pressure_up", "rotation"):
                label = "new entrant pressure"
            elif latest["entrant_count"] + latest["exit_count"] >= thresholds["route_churn_trigger"]:
                label = "unstable competition"
            elif latest["dominant_carrier_share"] >= thresholds["route_dominance_share"]:
                label = "stable dominance"
            if not label:
                continue
            generated += 1
            conf = self._confidence_from_coverage(latest["flights_observed"], len(history))
            confidence_distribution[conf] = confidence_distribution.get(conf, 0) + 1
            if conf == "low":
                suppressed += 1
            else:
                label_distribution[label] = label_distribution.get(label, 0) + 1

        suppressed_rate = (suppressed / generated * 100.0) if generated else 0.0
        avg_conf = 0.0
        if generated:
            score_map = {"low": 1, "medium": 2, "high": 3}
            avg_conf = sum(score_map[k] * v for k, v in confidence_distribution.items()) / generated

        return InsightQualityResponse(
            methodology_version="v0_competition_insights",
            thresholds=thresholds,
            total_insights_generated=generated,
            suppressed_low_confidence_count=suppressed,
            suppressed_rate_pct=round(suppressed_rate, 2),
            label_distribution=label_distribution,
            confidence_distribution=confidence_distribution,
            data_coverage_stats={
                "route_competition_rows": len(parsed),
                "routes_with_history": len(by_route),
                "avg_confidence_score_1_to_3": round(avg_conf, 3),
            },
        )
