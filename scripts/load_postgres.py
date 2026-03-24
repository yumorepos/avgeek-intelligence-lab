"""Load MVP marts into PostgreSQL schema v1.

This loader is intentionally simple and batch-oriented:
1) Read canonical mart/raw CSV files.
2) Build dimension entities (airports, airlines, routes).
3) Upsert dimensions, then facts into Postgres tables.

Supported modes:
- `--dry-run` (default): validates files and logs row counts only.
- execution mode: requires `psycopg2` and `--dsn`.

Notes:
- Uses route_key format ORG-DEST to resolve route_id.
- Designed for maintainability over performance for MVP volume.
"""

from __future__ import annotations

import argparse
import logging
from pathlib import Path

from pipeline_utils import marts_path, raw_path, read_csv_rows, setup_logging

LOGGER = logging.getLogger("load_postgres")


TABLE_FILES = {
    "monthly_fares": marts_path("monthly_fares.csv"),
    "ontime_stats": marts_path("ontime_stats.csv"),
    "cancellations": marts_path("cancellations.csv"),
    "route_scores": marts_path("route_scores.csv"),
    "airport_enplanements": raw_path("faa_enplanements_raw.csv"),
    "schedule_snapshots": marts_path("schedule_snapshots.csv"),
    "route_change_events": marts_path("route_change_events.csv"),
    "airport_role_metrics": marts_path("airport_role_metrics.csv"),
    "route_competition_metrics": marts_path("route_competition_metrics.csv"),
    "airport_competition_metrics": marts_path("airport_competition_metrics.csv"),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Load marts into Postgres schema")
    parser.add_argument("--dsn", default=None, help="Postgres DSN (required unless --dry-run)")
    parser.add_argument("--dry-run", action="store_true", help="Validate inputs without DB writes")
    parser.add_argument("--log-level", default="INFO")
    return parser.parse_args()


def route_parts(route_key: str) -> tuple[str, str]:
    origin, destination = route_key.split("-", 1)
    return origin, destination


def build_dimensions(monthly_rows: list[dict], ontime_rows: list[dict], cancel_rows: list[dict], enpl_rows: list[dict]) -> tuple[set[str], set[str], set[tuple[str, str]]]:
    airports: set[str] = set()
    airlines: set[str] = set()
    routes: set[tuple[str, str]] = set()

    for row in monthly_rows:
        o, d = route_parts(row["route_key"])
        airports.update([o, d])
        routes.add((o, d))

    for row in ontime_rows + cancel_rows:
        o, d = route_parts(row["route_key"])
        airports.update([o, d])
        routes.add((o, d))
        airlines.add(row["carrier_code"])

    for row in enpl_rows:
        airports.add(row["airport_iata"])

    return airports, airlines, routes


def main() -> None:
    args = parse_args()
    setup_logging(args.log_level)

    missing = [str(path) for path in TABLE_FILES.values() if not Path(path).exists()]
    if missing:
        raise FileNotFoundError(f"Required input files missing: {missing}")

    monthly_rows = read_csv_rows(TABLE_FILES["monthly_fares"])
    ontime_rows = read_csv_rows(TABLE_FILES["ontime_stats"])
    cancel_rows = read_csv_rows(TABLE_FILES["cancellations"])
    route_score_rows = read_csv_rows(TABLE_FILES["route_scores"])
    enpl_rows = read_csv_rows(TABLE_FILES["airport_enplanements"])
    schedule_rows = read_csv_rows(TABLE_FILES["schedule_snapshots"])
    route_change_rows = read_csv_rows(TABLE_FILES["route_change_events"])
    airport_role_rows = read_csv_rows(TABLE_FILES["airport_role_metrics"])
    route_comp_rows = read_csv_rows(TABLE_FILES["route_competition_metrics"])
    airport_comp_rows = read_csv_rows(TABLE_FILES["airport_competition_metrics"])

    airports, airlines, routes = build_dimensions(monthly_rows, ontime_rows, cancel_rows, enpl_rows)
    LOGGER.info(
        "Prepared entities | airports=%s airlines=%s routes=%s monthly_fares=%s ontime=%s cancellations=%s enplanements=%s scores=%s schedule=%s route_changes=%s airport_roles=%s route_comp=%s airport_comp=%s",
        len(airports),
        len(airlines),
        len(routes),
        len(monthly_rows),
        len(ontime_rows),
        len(cancel_rows),
        len(enpl_rows),
        len(route_score_rows),
        len(schedule_rows),
        len(route_change_rows),
        len(airport_role_rows),
        len(route_comp_rows),
        len(airport_comp_rows),
    )

    if args.dry_run or not args.dsn:
        LOGGER.info("Dry run only. No database writes were executed.")
        return

    try:
        import psycopg2
    except ImportError as exc:
        raise RuntimeError("psycopg2 is required for non-dry-run loading") from exc

    with psycopg2.connect(args.dsn) as conn:
        with conn.cursor() as cur:
            for code in sorted(airports):
                cur.execute(
                    """
                    INSERT INTO airports (iata_code, airport_name)
                    VALUES (%s, %s)
                    ON CONFLICT (iata_code) DO NOTHING
                    """,
                    (code, code),
                )

            for code in sorted(airlines):
                cur.execute(
                    """
                    INSERT INTO airlines (carrier_code, airline_name)
                    VALUES (%s, %s)
                    ON CONFLICT (carrier_code) DO NOTHING
                    """,
                    (code, code),
                )

            cur.execute("SELECT airport_id, iata_code FROM airports")
            airport_map = {code: airport_id for airport_id, code in cur.fetchall()}
            cur.execute("SELECT airline_id, carrier_code FROM airlines")
            airline_map = {code: airline_id for airline_id, code in cur.fetchall()}

            for origin, destination in sorted(routes):
                cur.execute(
                    """
                    INSERT INTO routes (origin_airport_id, destination_airport_id)
                    VALUES (%s, %s)
                    ON CONFLICT (origin_airport_id, destination_airport_id) DO NOTHING
                    """,
                    (airport_map[origin], airport_map[destination]),
                )

            cur.execute(
                """
                SELECT r.route_id, ao.iata_code AS origin_iata, ad.iata_code AS destination_iata
                FROM routes r
                JOIN airports ao ON ao.airport_id = r.origin_airport_id
                JOIN airports ad ON ad.airport_id = r.destination_airport_id
                """
            )
            route_map = {(o, d): route_id for route_id, o, d in cur.fetchall()}

            for row in monthly_rows:
                o, d = route_parts(row["route_key"])
                cur.execute(
                    """
                    INSERT INTO monthly_fares (route_id, year, month, avg_fare_usd, passengers_estimated)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (route_id, year, month)
                    DO UPDATE SET avg_fare_usd = EXCLUDED.avg_fare_usd,
                                  passengers_estimated = EXCLUDED.passengers_estimated
                    """,
                    (
                        route_map[(o, d)],
                        int(row["year"]),
                        int(row["month"]),
                        float(row["avg_fare_usd"]),
                        int(row["passengers_estimated"]) if row.get("passengers_estimated") else None,
                    ),
                )

            for row in ontime_rows:
                o, d = route_parts(row["route_key"])
                cur.execute(
                    """
                    INSERT INTO ontime_stats (route_id, airline_id, year, month, flights_total, flights_ontime, ontime_rate, avg_arrival_delay_minutes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (route_id, airline_id, year, month)
                    DO UPDATE SET flights_total = EXCLUDED.flights_total,
                                  flights_ontime = EXCLUDED.flights_ontime,
                                  ontime_rate = EXCLUDED.ontime_rate,
                                  avg_arrival_delay_minutes = EXCLUDED.avg_arrival_delay_minutes
                    """,
                    (
                        route_map[(o, d)],
                        airline_map[row["carrier_code"]],
                        int(row["year"]),
                        int(row["month"]),
                        int(row["flights_total"]),
                        int(row["flights_ontime"]),
                        float(row["ontime_rate"]) if row.get("ontime_rate") else None,
                        float(row["avg_arrival_delay_minutes"]) if row.get("avg_arrival_delay_minutes") else None,
                    ),
                )

            for row in cancel_rows:
                o, d = route_parts(row["route_key"])
                cur.execute(
                    """
                    INSERT INTO cancellations (route_id, airline_id, year, month, flights_total, cancellations_count, cancellation_rate)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (route_id, airline_id, year, month)
                    DO UPDATE SET flights_total = EXCLUDED.flights_total,
                                  cancellations_count = EXCLUDED.cancellations_count,
                                  cancellation_rate = EXCLUDED.cancellation_rate
                    """,
                    (
                        route_map[(o, d)],
                        airline_map[row["carrier_code"]],
                        int(row["year"]),
                        int(row["month"]),
                        int(row["flights_total"]),
                        int(row["cancellations_count"]),
                        float(row["cancellation_rate"]) if row.get("cancellation_rate") else None,
                    ),
                )

            for row in enpl_rows:
                cur.execute(
                    """
                    INSERT INTO airport_enplanements (airport_id, year, total_enplanements)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (airport_id, year)
                    DO UPDATE SET total_enplanements = EXCLUDED.total_enplanements
                    """,
                    (
                        airport_map[row["airport_iata"]],
                        int(row["year"]),
                        int(row["total_enplanements"]),
                    ),
                )

            for row in schedule_rows:
                o, d = route_parts(row["route_key"])
                cur.execute(
                    """
                    INSERT INTO schedule_snapshots (route_id, airline_id, year, month, flights_scheduled, seats_scheduled)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (route_id, airline_id, year, month)
                    DO UPDATE SET flights_scheduled = EXCLUDED.flights_scheduled,
                                  seats_scheduled = EXCLUDED.seats_scheduled
                    """,
                    (
                        route_map[(o, d)],
                        airline_map[row["carrier_code"]],
                        int(row["year"]),
                        int(row["month"]),
                        int(row["flights_scheduled"]),
                        int(row["seats_scheduled"]) if row.get("seats_scheduled") else None,
                    ),
                )

            for row in route_change_rows:
                o, d = route_parts(row["route_key"])
                cur.execute(
                    """
                    INSERT INTO route_change_events (
                        route_id, route_key, origin_iata, destination_iata, dominant_carrier,
                        year, month, change_type, previous_frequency, current_frequency,
                        frequency_delta, significance, confidence
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (route_id, year, month, change_type)
                    DO UPDATE SET previous_frequency = EXCLUDED.previous_frequency,
                                  current_frequency = EXCLUDED.current_frequency,
                                  frequency_delta = EXCLUDED.frequency_delta,
                                  significance = EXCLUDED.significance,
                                  confidence = EXCLUDED.confidence,
                                  dominant_carrier = EXCLUDED.dominant_carrier
                    """,
                    (
                        route_map[(o, d)],
                        row["route_key"],
                        row["origin_iata"],
                        row["destination_iata"],
                        row.get("dominant_carrier") or None,
                        int(row["year"]),
                        int(row["month"]),
                        row["change_type"],
                        int(row["previous_frequency"]) if row.get("previous_frequency") else None,
                        int(row["current_frequency"]) if row.get("current_frequency") else None,
                        int(row["frequency_delta"]) if row.get("frequency_delta") else None,
                        row.get("significance") or "moderate",
                        row.get("confidence") or "low",
                    ),
                )

            for row in airport_role_rows:
                cur.execute(
                    """
                    INSERT INTO airport_role_metrics (
                        iata, year, month, outbound_routes, destination_diversity_index,
                        carrier_concentration_hhi, dominant_carrier_share, role_label
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (iata, year, month)
                    DO UPDATE SET outbound_routes = EXCLUDED.outbound_routes,
                                  destination_diversity_index = EXCLUDED.destination_diversity_index,
                                  carrier_concentration_hhi = EXCLUDED.carrier_concentration_hhi,
                                  dominant_carrier_share = EXCLUDED.dominant_carrier_share,
                                  role_label = EXCLUDED.role_label
                    """,
                    (
                        row["iata"],
                        int(row["year"]),
                        int(row["month"]),
                        int(row["outbound_routes"]),
                        float(row["destination_diversity_index"]),
                        float(row["carrier_concentration_hhi"]),
                        float(row["dominant_carrier_share"]),
                        row["role_label"],
                    ),
                )

            for row in route_comp_rows:
                o, d = route_parts(row["route_key"])
                cur.execute(
                    """
                    INSERT INTO route_competition_metrics (
                        route_id, route_key, origin_iata, destination_iata, year, month,
                        active_carriers, dominant_carrier_share, carrier_concentration_hhi,
                        entrant_count, exit_count, entrant_pressure_signal, competition_label,
                        confidence, flights_observed
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (route_id, year, month)
                    DO UPDATE SET active_carriers = EXCLUDED.active_carriers,
                                  dominant_carrier_share = EXCLUDED.dominant_carrier_share,
                                  carrier_concentration_hhi = EXCLUDED.carrier_concentration_hhi,
                                  entrant_count = EXCLUDED.entrant_count,
                                  exit_count = EXCLUDED.exit_count,
                                  entrant_pressure_signal = EXCLUDED.entrant_pressure_signal,
                                  competition_label = EXCLUDED.competition_label,
                                  confidence = EXCLUDED.confidence,
                                  flights_observed = EXCLUDED.flights_observed
                    """,
                    (
                        route_map[(o, d)],
                        row["route_key"],
                        row["origin_iata"],
                        row["destination_iata"],
                        int(row["year"]),
                        int(row["month"]),
                        int(row["active_carriers"]),
                        float(row["dominant_carrier_share"]),
                        float(row["carrier_concentration_hhi"]),
                        int(row["entrant_count"]),
                        int(row["exit_count"]),
                        row["entrant_pressure_signal"],
                        row["competition_label"],
                        row["confidence"],
                        int(row["flights_observed"]),
                    ),
                )

            for row in airport_comp_rows:
                cur.execute(
                    """
                    INSERT INTO airport_competition_metrics (
                        iata, year, month, active_outbound_routes, active_carriers,
                        dominant_carrier_share, carrier_concentration_hhi, contested_route_count,
                        monopoly_route_count, contested_route_share, competition_label, confidence, flights_observed
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (iata, year, month)
                    DO UPDATE SET active_outbound_routes = EXCLUDED.active_outbound_routes,
                                  active_carriers = EXCLUDED.active_carriers,
                                  dominant_carrier_share = EXCLUDED.dominant_carrier_share,
                                  carrier_concentration_hhi = EXCLUDED.carrier_concentration_hhi,
                                  contested_route_count = EXCLUDED.contested_route_count,
                                  monopoly_route_count = EXCLUDED.monopoly_route_count,
                                  contested_route_share = EXCLUDED.contested_route_share,
                                  competition_label = EXCLUDED.competition_label,
                                  confidence = EXCLUDED.confidence,
                                  flights_observed = EXCLUDED.flights_observed
                    """,
                    (
                        row["iata"],
                        int(row["year"]),
                        int(row["month"]),
                        int(row["active_outbound_routes"]),
                        int(row["active_carriers"]),
                        float(row["dominant_carrier_share"]),
                        float(row["carrier_concentration_hhi"]),
                        int(row["contested_route_count"]),
                        int(row["monopoly_route_count"]),
                        float(row["contested_route_share"]),
                        row["competition_label"],
                        row["confidence"],
                        int(row["flights_observed"]),
                    ),
                )

            for row in route_score_rows:
                o, d = route_parts(row["route_key"])
                cur.execute(
                    """
                    INSERT INTO route_scores (route_id, year, month, reliability_score, fare_volatility, deal_signal, route_attractiveness_score)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (route_id, year, month)
                    DO UPDATE SET reliability_score = EXCLUDED.reliability_score,
                                  fare_volatility = EXCLUDED.fare_volatility,
                                  deal_signal = EXCLUDED.deal_signal,
                                  route_attractiveness_score = EXCLUDED.route_attractiveness_score,
                                  calculated_at = NOW()
                    """,
                    (
                        route_map[(o, d)],
                        int(row["year"]),
                        int(row["month"]),
                        float(row["reliability_score"]) if row.get("reliability_score") else None,
                        float(row["fare_volatility"]) if row.get("fare_volatility") else None,
                        row.get("deal_signal", "neutral"),
                        float(row["route_attractiveness_score"]) if row.get("route_attractiveness_score") else None,
                    ),
                )

        conn.commit()

    LOGGER.info("Postgres load completed successfully")


if __name__ == "__main__":
    main()
