"""PostgreSQL integration tests for AnalyticsRepository.

These tests require TEST_DATABASE_URL and are intended for CI Postgres service job.
"""

from __future__ import annotations

import os
from pathlib import Path

import psycopg2
import pytest
from psycopg2.extras import DictCursor

from app.core.config import settings
from app.repositories.analytics import AnalyticsRepository


def _dsn() -> str:
    dsn = os.getenv("TEST_DATABASE_URL")
    if not dsn:
        pytest.skip("TEST_DATABASE_URL not set; skipping Postgres integration tests")
    return dsn


def _exec_sql_file(dsn: str, path: Path) -> None:
    sql = path.read_text(encoding="utf-8")
    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()


def _seed_fixture_data(dsn: str) -> None:
    with psycopg2.connect(dsn) as conn:
        with conn.cursor(cursor_factory=DictCursor) as cur:
            cur.execute("INSERT INTO airports (iata_code, airport_name, city, state_code, country_code) VALUES (%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING", ("JFK", "John F Kennedy Intl", "New York", "NY", "US"))
            cur.execute("INSERT INTO airports (iata_code, airport_name, city, state_code, country_code) VALUES (%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING", ("LAX", "Los Angeles Intl", "Los Angeles", "CA", "US"))
            cur.execute("INSERT INTO airlines (carrier_code, airline_name) VALUES (%s,%s) ON CONFLICT DO NOTHING", ("AA", "American Airlines"))

            cur.execute("SELECT airport_id FROM airports WHERE iata_code='JFK'")
            jfk = cur.fetchone()[0]
            cur.execute("SELECT airport_id FROM airports WHERE iata_code='LAX'")
            lax = cur.fetchone()[0]
            cur.execute("SELECT airline_id FROM airlines WHERE carrier_code='AA'")
            aa = cur.fetchone()[0]

            cur.execute(
                "INSERT INTO routes (origin_airport_id, destination_airport_id) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                (jfk, lax),
            )
            cur.execute("SELECT route_id FROM routes WHERE origin_airport_id=%s AND destination_airport_id=%s", (jfk, lax))
            route_id = cur.fetchone()[0]

            cur.execute(
                """
                INSERT INTO monthly_fares (route_id, year, month, avg_fare_usd, passengers_estimated)
                VALUES (%s, 2026, 1, 301.00, 1200)
                ON CONFLICT (route_id, year, month) DO UPDATE SET avg_fare_usd=EXCLUDED.avg_fare_usd
                """,
                (route_id,),
            )
            cur.execute(
                """
                INSERT INTO ontime_stats (route_id, airline_id, year, month, flights_total, flights_ontime, ontime_rate, avg_arrival_delay_minutes)
                VALUES (%s, %s, 2026, 1, 100, 88, 0.88, 8.2)
                ON CONFLICT (route_id, airline_id, year, month) DO UPDATE SET ontime_rate=EXCLUDED.ontime_rate
                """,
                (route_id, aa),
            )
            cur.execute(
                """
                INSERT INTO cancellations (route_id, airline_id, year, month, flights_total, cancellations_count, cancellation_rate)
                VALUES (%s, %s, 2026, 1, 100, 2, 0.02)
                ON CONFLICT (route_id, airline_id, year, month) DO UPDATE SET cancellation_rate=EXCLUDED.cancellation_rate
                """,
                (route_id, aa),
            )
            cur.execute(
                """
                INSERT INTO route_scores (route_id, year, month, reliability_score, fare_volatility, deal_signal, route_attractiveness_score)
                VALUES (%s, 2026, 1, 86.0, 10.0, 'deal', 79.0)
                ON CONFLICT (route_id, year, month) DO UPDATE SET route_attractiveness_score=EXCLUDED.route_attractiveness_score
                """,
                (route_id,),
            )
            cur.execute(
                """
                INSERT INTO airport_enplanements (airport_id, year, total_enplanements)
                VALUES (%s, 2024, 31200000)
                ON CONFLICT (airport_id, year) DO UPDATE SET total_enplanements=EXCLUDED.total_enplanements
                """,
                (jfk,),
            )
        conn.commit()


def test_postgres_repository_roundtrip() -> None:
    dsn = _dsn()
    repo_root = Path(__file__).resolve().parents[2]
    _exec_sql_file(dsn, repo_root / "sql" / "schema.sql")
    _seed_fixture_data(dsn)

    settings.database_url = dsn
    settings.use_csv_fallback = False

    repo = AnalyticsRepository()

    airports = repo.search_airports("JFK")
    assert airports
    assert airports[0]["iata"] == "JFK"

    explore = repo.get_route_explorer("JFK")
    assert explore
    assert explore[0]["destination_iata"] == "LAX"

    detail = repo.get_route_detail("JFK", "LAX")
    assert detail is not None
    assert detail["route"]["origin_iata"] == "JFK"
    assert detail["fares"]

    context = repo.get_airport_context("JFK")
    assert context is not None
    assert context["airport"]["iata"] == "JFK"

    # Edge: unknown route should return None
    missing_detail = repo.get_route_detail("JFK", "SFO")
    assert missing_detail is None

    # Edge: unknown airport should return None
    missing_context = repo.get_airport_context("ZZZ")
    assert missing_context is None

    # Edge: airport with no enplanement row should return context with null enplanement
    lax_context = repo.get_airport_context("LAX")
    assert lax_context is not None
    assert lax_context["enplanement"] is None
