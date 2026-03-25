from pathlib import Path

from fastapi.testclient import TestClient

from app.api import intelligence
from app.main import app
from app.repositories.analytics import AnalyticsRepository
from app.services.analytics import AnalyticsService


class StubIntelService:
    def supported_airports(self):
        return {
            "airports": [{"iata": "JFK"}, {"iata": "LAX"}],
            "readiness": {
                "is_ready": True,
                "reason": None,
                "required_marts": {
                    "airport_role_metrics": 2,
                    "airport_competition_metrics": 2,
                    "route_competition_metrics": 4,
                },
            },
            "metadata": {
                "data_source": "postgres",
                "is_fallback": False,
                "data_complete": True,
                "note": None,
                "last_refreshed_at": None,
            },
            "intelligence_meta": {"methodology_version": "v0_competitiveness", "coverage_summary": "stub"},
        }

    def route_changes(self, **_kwargs):
        return {
            "filters": {"airport_iata": "JFK", "limit": 100},
            "events": [
                {
                    "route_key": "JFK-LAX",
                    "origin_iata": "JFK",
                    "destination_iata": "LAX",
                    "year": 2026,
                    "month": 1,
                    "change_type": "frequency_change",
                    "previous_frequency": 100,
                    "current_frequency": 130,
                    "frequency_delta": 30,
                    "dominant_carrier": "AA",
                    "confidence": "medium",
                    "significance": "moderate",
                }
            ],
            "metadata": {
                "data_source": "postgres",
                "is_fallback": False,
                "data_complete": True,
                "note": None,
                "last_refreshed_at": None,
            },
            "intelligence_meta": {"methodology_version": "v0_competitiveness", "coverage_summary": "stub"},
        }

    def airport_role(self, iata: str):
        return {
            "airport": {"iata": iata, "airport_name": "John F Kennedy Intl", "city": "New York", "state": "NY", "country": "US"},
            "metrics": {
                "iata": iata,
                "year": 2026,
                "month": 1,
                "outbound_routes": 110,
                "destination_diversity_index": 4.7,
                "carrier_concentration_hhi": 1800,
                "dominant_carrier_share": 0.31,
                "role_label": "multi_carrier_hub",
            },
            "metadata": {
                "data_source": "postgres",
                "is_fallback": False,
                "data_complete": True,
                "note": None,
                "last_refreshed_at": None,
            },
            "intelligence_meta": {"methodology_version": "v0_competitiveness", "coverage_summary": "stub"},
        }

    def airport_peers(self, iata: str, limit: int = 5):
        return {
            "airport": {"iata": iata, "airport_name": "John F Kennedy Intl", "city": "New York", "state": "NY", "country": "US"},
            "peers": [{"iata": "LAX", "outbound_routes": 105, "destination_diversity_index": 4.6, "dominant_carrier_share": 0.33, "role_label": "multi_carrier_hub"}],
            "comparison_basis": "stub",
            "metadata": {
                "data_source": "postgres",
                "is_fallback": False,
                "data_complete": True,
                "note": None,
                "last_refreshed_at": None,
            },
            "intelligence_meta": {"methodology_version": "v0_competitiveness", "coverage_summary": "stub"},
        }

    def route_competition(self, **_kwargs):
        return {
            "filters": {"airport_iata": "JFK", "limit": 100},
            "rows": [
                {
                    "route_key": "JFK-LAX",
                    "origin_iata": "JFK",
                    "destination_iata": "LAX",
                    "year": 2026,
                    "month": 1,
                    "active_carriers": 3,
                    "dominant_carrier_share": 0.52,
                    "carrier_concentration_hhi": 3400.0,
                    "entrant_count": 1,
                    "exit_count": 0,
                    "entrant_pressure_signal": "pressure_up",
                    "competition_label": "concentrated",
                    "confidence": "high",
                    "flights_observed": 310,
                }
            ],
            "metadata": {
                "data_source": "postgres",
                "is_fallback": False,
                "data_complete": True,
                "note": None,
                "last_refreshed_at": None,
            },
            "intelligence_meta": {"methodology_version": "v0_competition", "coverage_summary": "stub"},
        }

    def airport_competition(self, iata: str):
        return {
            "airport": {"iata": iata, "airport_name": "John F Kennedy Intl", "city": "New York", "state": "NY", "country": "US"},
            "metrics": {
                "iata": iata,
                "year": 2026,
                "month": 1,
                "active_outbound_routes": 120,
                "active_carriers": 8,
                "dominant_carrier_share": 0.35,
                "carrier_concentration_hhi": 1800.0,
                "contested_route_count": 65,
                "monopoly_route_count": 20,
                "contested_route_share": 0.54,
                "competition_label": "competitive_but_concentrated",
                "confidence": "high",
                "flights_observed": 900,
            },
            "metadata": {
                "data_source": "postgres",
                "is_fallback": False,
                "data_complete": True,
                "note": None,
                "last_refreshed_at": None,
            },
            "intelligence_meta": {"methodology_version": "v0_competition", "coverage_summary": "stub"},
        }

    def route_insights(self, **_kwargs):
        return {
            "filters": {"airport_iata": "JFK", "limit": 50},
            "insights": [
                {
                    "route_key": "JFK-LAX",
                    "origin_iata": "JFK",
                    "destination_iata": "LAX",
                    "year": 2026,
                    "month": 1,
                    "insight_label": "competition increasing",
                    "explanation": "Concentration dropped and entrant appeared.",
                    "confidence": "high",
                    "metrics_snapshot": {"values": {"hhi_delta_vs_prev": -300}},
                    "methodology_version": "v0_competition_insights",
                }
            ],
            "generated_count": 1,
            "suppressed_low_confidence_count": 0,
            "confidence_distribution": {"high": 1, "medium": 0, "low": 0},
            "metadata": {
                "data_source": "postgres",
                "is_fallback": False,
                "data_complete": True,
                "note": None,
                "last_refreshed_at": None,
            },
            "intelligence_meta": {"methodology_version": "v0_competition_insights", "coverage_summary": "stub"},
        }

    def airport_insights(self, iata: str):
        return {
            "airport": {"iata": iata, "airport_name": "John F Kennedy Intl", "city": "New York", "state": "NY", "country": "US"},
            "insights": [
                {
                    "iata": iata,
                    "year": 2026,
                    "month": 1,
                    "insight_label": "stable dominance",
                    "explanation": "Dominant share above threshold.",
                    "confidence": "high",
                    "metrics_snapshot": {"values": {"dominant_carrier_share": 0.55}},
                    "methodology_version": "v0_competition_insights",
                }
            ],
            "generated_count": 1,
            "suppressed_low_confidence_count": 0,
            "confidence_distribution": {"high": 1, "medium": 0, "low": 0},
            "metadata": {
                "data_source": "postgres",
                "is_fallback": False,
                "data_complete": True,
                "note": None,
                "last_refreshed_at": None,
            },
            "intelligence_meta": {"methodology_version": "v0_competition_insights", "coverage_summary": "stub"},
        }

    def route_insight_timeline(self, origin: str, destination: str, periods: int = 12):
        return {
            "route_key": f"{origin}-{destination}",
            "points": [
                {
                    "year": 2025,
                    "month": 12,
                    "carrier_concentration_hhi": 3800.0,
                    "active_carriers": 2,
                    "dominant_carrier_share": 0.66,
                    "entrant_count": 0,
                    "exit_count": 1,
                    "inferred_label": None,
                },
                {
                    "year": 2026,
                    "month": 1,
                    "carrier_concentration_hhi": 3400.0,
                    "active_carriers": 3,
                    "dominant_carrier_share": 0.52,
                    "entrant_count": 1,
                    "exit_count": 0,
                    "inferred_label": "competition increasing",
                },
            ],
            "metadata": {"data_source": "postgres", "is_fallback": False, "data_complete": True, "note": None, "last_refreshed_at": None},
            "intelligence_meta": {"methodology_version": "v0_competition_insights", "coverage_summary": "stub"},
        }


def test_intelligence_endpoints_with_stubbed_service() -> None:
    intelligence.service = StubIntelService()
    client = TestClient(app)

    route_resp = client.get("/intelligence/routes/changes?airport_iata=JFK")
    assert route_resp.status_code == 200
    assert route_resp.json()["events"][0]["change_type"] == "frequency_change"

    role_resp = client.get("/intelligence/airports/JFK/role")
    assert role_resp.status_code == 200
    assert role_resp.json()["metrics"]["role_label"] == "multi_carrier_hub"

    peers_resp = client.get("/intelligence/airports/JFK/peers")
    assert peers_resp.status_code == 200
    assert peers_resp.json()["peers"][0]["iata"] == "LAX"

    route_comp = client.get("/intelligence/routes/competition?airport_iata=JFK")
    assert route_comp.status_code == 200
    assert route_comp.json()["rows"][0]["active_carriers"] == 3

    airport_comp = client.get("/intelligence/airports/JFK/competition")
    assert airport_comp.status_code == 200
    assert airport_comp.json()["metrics"]["competition_label"] == "competitive_but_concentrated"

    route_insights = client.get("/intelligence/routes/insights?airport_iata=JFK")
    assert route_insights.status_code == 200
    assert route_insights.json()["insights"][0]["insight_label"] == "competition increasing"

    airport_insights = client.get("/intelligence/airports/JFK/insights")
    assert airport_insights.status_code == 200
    assert airport_insights.json()["insights"][0]["insight_label"] == "stable dominance"

    timeline = client.get("/intelligence/routes/JFK/LAX/insight-timeline")
    assert timeline.status_code == 200
    assert timeline.json()["points"][1]["inferred_label"] == "competition increasing"

    supported = client.get("/intelligence/airports/supported")
    assert supported.status_code == 200
    assert supported.json()["readiness"]["is_ready"] is True
    assert supported.json()["airports"][0]["iata"] == "JFK"


def _write_csv(path: Path, headers: list[str], rows: list[list[object]]) -> None:
    path.write_text("\n".join([",".join(headers)] + [",".join(str(v) for v in row) for row in rows]), encoding="utf-8")


def test_csv_intelligence_repository_contract(monkeypatch, tmp_path: Path) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "database_url", None)
    monkeypatch.setattr(settings, "use_csv_fallback", True)

    marts = tmp_path / "marts"
    marts.mkdir(parents=True, exist_ok=True)

    _write_csv(
        marts / "route_change_events.csv",
        ["route_key", "origin_iata", "destination_iata", "year", "month", "change_type", "previous_frequency", "current_frequency", "frequency_delta", "dominant_carrier", "significance", "confidence"],
        [["JFK-LAX", "JFK", "LAX", 2026, 1, "frequency_change", 100, 130, 30, "AA", "moderate", "medium"]],
    )
    _write_csv(
        marts / "airport_role_metrics.csv",
        ["iata", "year", "month", "outbound_routes", "destination_diversity_index", "carrier_concentration_hhi", "dominant_carrier_share", "role_label"],
        [["JFK", 2026, 1, 110, 4.7, 1800, 0.31, "multi_carrier_hub"], ["LAX", 2026, 1, 105, 4.6, 1900, 0.33, "multi_carrier_hub"]],
    )
    _write_csv(
        marts / "route_competition_metrics.csv",
        [
            "route_key",
            "origin_iata",
            "destination_iata",
            "year",
            "month",
            "active_carriers",
            "dominant_carrier_share",
            "carrier_concentration_hhi",
            "entrant_count",
            "exit_count",
            "entrant_pressure_signal",
            "competition_label",
            "confidence",
            "flights_observed",
        ],
        [["JFK-LAX", "JFK", "LAX", 2026, 1, 3, 0.52, 3400.0, 1, 0, "pressure_up", "concentrated", "high", 310], ["JFK-LAX", "JFK", "LAX", 2025, 12, 2, 0.66, 3800.0, 0, 1, "pressure_down", "concentrated", "high", 280]],
    )
    _write_csv(
        marts / "airport_competition_metrics.csv",
        [
            "iata",
            "year",
            "month",
            "active_outbound_routes",
            "active_carriers",
            "dominant_carrier_share",
            "carrier_concentration_hhi",
            "contested_route_count",
            "monopoly_route_count",
            "contested_route_share",
            "competition_label",
            "confidence",
            "flights_observed",
        ],
        [
            ["JFK", 2026, 1, 120, 8, 0.55, 1800, 65, 20, 0.54, "competitive_but_concentrated", "high", 900],
            ["JFK", 2025, 12, 118, 7, 0.52, 1950, 60, 24, 0.50, "competitive_but_concentrated", "high", 860],
        ],
    )
    _write_csv(marts / "route_scores.csv", ["route_key", "year", "month", "route_attractiveness_score", "deal_signal"], [["JFK-LAX", 2026, 1, 80, "deal"]])
    _write_csv(marts / "monthly_fares.csv", ["route_key", "year", "month", "avg_fare_usd"], [["JFK-LAX", 2026, 1, 301]])

    repo = AnalyticsRepository()
    repo.marts_dir = marts
    service = AnalyticsService(repository=repo)

    changes = service.route_changes(airport_iata="JFK")
    assert len(changes.events) == 1

    role = service.airport_role("JFK")
    assert role.metrics is not None

    peers = service.airport_peers("JFK")
    assert peers.peers

    route_comp = service.route_competition(airport_iata="JFK")
    assert route_comp.rows

    airport_comp = service.airport_competition("JFK")
    assert airport_comp.metrics is not None

    route_insights = service.route_insights(airport_iata="JFK")
    assert route_insights.insights

    airport_insights = service.airport_insights("JFK")
    assert airport_insights.insights

    timeline = service.route_insight_timeline("JFK", "LAX")
    assert timeline.points

    supported = service.supported_airports()
    assert supported.readiness.is_ready is True
    assert "JFK" in [airport.iata for airport in supported.airports]


def test_sparse_single_carrier_competition_case(monkeypatch, tmp_path: Path) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "database_url", None)
    monkeypatch.setattr(settings, "use_csv_fallback", True)

    marts = tmp_path / "marts"
    marts.mkdir(parents=True, exist_ok=True)
    _write_csv(
        marts / "route_competition_metrics.csv",
        [
            "route_key",
            "origin_iata",
            "destination_iata",
            "year",
            "month",
            "active_carriers",
            "dominant_carrier_share",
            "carrier_concentration_hhi",
            "entrant_count",
            "exit_count",
            "entrant_pressure_signal",
            "competition_label",
            "confidence",
            "flights_observed",
        ],
        [["JFK-BOS", "JFK", "BOS", 2026, 1, 1, 1.0, 10000, 0, 0, "stable", "monopoly", "low", 22]],
    )
    _write_csv(
        marts / "airport_competition_metrics.csv",
        [
            "iata",
            "year",
            "month",
            "active_outbound_routes",
            "active_carriers",
            "dominant_carrier_share",
            "carrier_concentration_hhi",
            "contested_route_count",
            "monopoly_route_count",
            "contested_route_share",
            "competition_label",
            "confidence",
            "flights_observed",
        ],
        [["JFK", 2026, 1, 1, 1, 1.0, 10000, 0, 1, 0.0, "single_carrier_dominant", "low", 22]],
    )
    _write_csv(marts / "route_scores.csv", ["route_key", "year", "month", "route_attractiveness_score", "deal_signal"], [["JFK-BOS", 2026, 1, 50, "neutral"]])
    _write_csv(marts / "monthly_fares.csv", ["route_key", "year", "month", "avg_fare_usd"], [["JFK-BOS", 2026, 1, 180]])

    repo = AnalyticsRepository()
    repo.marts_dir = marts
    service = AnalyticsService(repository=repo)

    route_comp = service.route_competition(airport_iata="JFK")
    assert route_comp.rows[0].competition_label == "monopoly"

    airport_comp = service.airport_competition("JFK")
    assert airport_comp.metrics is not None
    assert airport_comp.metrics.competition_label == "single_carrier_dominant"


def test_airport_role_returns_404_for_unknown_airport(monkeypatch, tmp_path: Path) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "database_url", None)
    monkeypatch.setattr(settings, "use_csv_fallback", True)

    marts = tmp_path / "marts"
    marts.mkdir(parents=True, exist_ok=True)

    _write_csv(
        marts / "airport_role_metrics.csv",
        ["iata", "year", "month", "outbound_routes", "destination_diversity_index", "carrier_concentration_hhi", "dominant_carrier_share", "role_label"],
        [["ATL", 2026, 1, 70, 4.2, 1650, 0.29, "multi_carrier_hub"]],
    )

    service = AnalyticsService(repository=AnalyticsRepository())
    service.repository.marts_dir = marts
    intelligence.service = service

    client = TestClient(app)
    response = client.get("/intelligence/airports/ZZZ/role")

    assert response.status_code == 404
    assert response.json()["detail"] == "Airport not found."


def test_supported_airports_reports_not_ready_when_marts_missing(monkeypatch, tmp_path: Path) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "database_url", None)
    monkeypatch.setattr(settings, "use_csv_fallback", True)

    marts = tmp_path / "marts"
    marts.mkdir(parents=True, exist_ok=True)

    service = AnalyticsService(repository=AnalyticsRepository())
    service.repository.marts_dir = marts

    supported = service.supported_airports()
    assert supported.readiness.is_ready is False
    assert supported.airports == []
    assert supported.readiness.required_marts["airport_role_metrics"] == 0
