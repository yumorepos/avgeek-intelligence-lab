from pathlib import Path

from app.core.config import settings
from app.repositories.analytics import AnalyticsRepository
from app.schemas.route import ReliabilitySummary, RouteExploreCard


def _write_csv(path: Path, headers: list[str], rows: list[list[object]]) -> None:
    path.write_text(
        "\n".join([",".join(headers)] + [",".join(str(v) for v in row) for row in rows]),
        encoding="utf-8",
    )


def test_csv_route_explorer_exposes_confidence(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(settings, "database_url", None)
    monkeypatch.setattr(settings, "use_csv_fallback", True)

    marts = tmp_path / "marts"
    marts.mkdir(parents=True, exist_ok=True)

    _write_csv(
        marts / "route_scores.csv",
        [
            "route_key",
            "year",
            "month",
            "route_attractiveness_score",
            "deal_signal",
            "score_confidence",
        ],
        [["JFK-LAX", 2026, 1, 77.2, "deal", "high"]],
    )
    _write_csv(marts / "monthly_fares.csv", ["route_key", "year", "month", "avg_fare_usd"], [["JFK-LAX", 2026, 1, 299]])

    repo = AnalyticsRepository()
    repo.marts_dir = marts

    rows = repo.get_route_explorer("JFK")
    assert len(rows) == 1
    assert rows[0]["score_confidence"] == "high"


def test_route_schema_accepts_categorical_confidence() -> None:
    card = RouteExploreCard(
        destination={"iata": "LAX", "airport_name": "Los Angeles Intl", "city": "Los Angeles", "state": "CA", "country": "US"},
        latest_route_attractiveness_score=80.0,
        latest_deal_signal="deal",
        headline_fare_insight="Latest observed average fare: $300",
        reliability_summary=ReliabilitySummary(avg_ontime_rate=0.9, avg_cancellation_rate=0.01),
        score_confidence="medium",
    )
    assert card.score_confidence == "medium"


class StubDbRepo(AnalyticsRepository):
    def _db_rows(self, sql: str, params: tuple = ()) -> list[dict]:  # type: ignore[override]
        if "FROM airports" in sql:
            return [{"iata": "JFK", "airport_name": "John F Kennedy Intl", "city": "New York", "state": "NY", "country": "US"}]
        return []


def test_repository_uses_db_mode_when_database_url_present(monkeypatch) -> None:
    monkeypatch.setattr(settings, "database_url", "postgres://example")
    monkeypatch.setattr(settings, "use_csv_fallback", False)

    repo = StubDbRepo()
    rows = repo.search_airports("JFK")
    assert rows[0]["iata"] == "JFK"


from app.core.db import DatabaseUnavailableError


class FailingDbRepo(AnalyticsRepository):
    def _db_rows(self, sql: str, params: tuple = ()) -> list[dict]:  # type: ignore[override]
        raise DatabaseUnavailableError("simulated db failure")


def test_repository_db_error_raises_unavailable(monkeypatch) -> None:
    monkeypatch.setattr(settings, "database_url", "postgres://example")
    monkeypatch.setattr(settings, "use_csv_fallback", False)

    repo = FailingDbRepo()
    try:
        repo.search_airports("JFK")
        assert False, "expected DatabaseUnavailableError"
    except DatabaseUnavailableError as exc:
        assert "simulated db failure" in str(exc)
