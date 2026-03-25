import csv
from pathlib import Path
from typing import Iterable

from app.core.config import settings
from app.core.db import DatabaseUnavailableError


class AnalyticsRepository:

    CSV_AIRPORT_UNIVERSE_FILES = (
        "route_scores.csv",
        "monthly_fares.csv",
        "route_competition_metrics.csv",
        "airport_role_metrics.csv",
        "airport_competition_metrics.csv",
    )

    """Analytics read repository.

    Runtime behavior:
    - If FPI_DATABASE_URL/DATABASE_URL is set, query PostgreSQL directly.
    - Otherwise require explicit CSV fallback via FPI_USE_CSV_FALLBACK=true.
    """

    def __init__(self) -> None:
        self.repo_root = Path(__file__).resolve().parents[3]
        backend_scoped_marts = self.repo_root / "backend" / "data" / "marts"
        self.marts_dir = backend_scoped_marts if backend_scoped_marts.exists() else self.repo_root / "data" / "marts"

    def _use_db(self) -> bool:
        return bool(settings.database_url)

    def _guard_data_access(self) -> None:
        if self._use_db():
            return
        if not settings.use_csv_fallback:
            raise DatabaseUnavailableError(
                "PostgreSQL is not configured in this environment. Set FPI_DATABASE_URL for DB access or "
                "FPI_USE_CSV_FALLBACK=true for explicit local marts fallback."
            )

    def _db_rows(self, sql: str, params: tuple = ()) -> list[dict]:
        if not settings.database_url:
            raise DatabaseUnavailableError("Database URL is not configured.")

        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
        except ImportError as exc:
            raise DatabaseUnavailableError("psycopg2 is required for PostgreSQL-backed repository mode.") from exc

        try:
            with psycopg2.connect(settings.database_url) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(sql, params)
                    rows = cur.fetchall()
                    return [dict(row) for row in rows]
        except Exception as exc:  # pragma: no cover - depends on runtime DB
            raise DatabaseUnavailableError(f"PostgreSQL query failed: {exc}") from exc

    def _read_csv(self, filename: str) -> list[dict]:
        path = self.marts_dir / filename
        if not path.exists():
            return []
        with path.open(newline="", encoding="utf-8") as file:
            return list(csv.DictReader(file))

    def _airport_from_iata(self, iata: str) -> dict:
        return {
            "iata": iata,
            "airport_name": f"{iata} (name unavailable in CSV fallback)",
            "city": None,
            "state": None,
            "country": "US",
        }

    @staticmethod
    def _normalize_iata(raw: str | None) -> str | None:
        value = (raw or "").strip().upper()
        if len(value) != 3 or not value.isalpha():
            return None
        return value

    def _iter_route_iatas(self, row: dict) -> Iterable[str]:
        route_key = row.get("route_key", "")
        if "-" in route_key:
            origin, destination = route_key.split("-", 1)
            normalized_origin = self._normalize_iata(origin)
            normalized_destination = self._normalize_iata(destination)
            if normalized_origin:
                yield normalized_origin
            if normalized_destination:
                yield normalized_destination

        for column in ("origin_iata", "destination_iata"):
            normalized = self._normalize_iata(row.get(column))
            if normalized:
                yield normalized

    def _csv_airport_universe(self) -> set[str]:
        iatas: set[str] = set()
        for filename in self.CSV_AIRPORT_UNIVERSE_FILES:
            for row in self._read_csv(filename):
                if "route" in filename:
                    iatas.update(self._iter_route_iatas(row))
                    continue
                normalized = self._normalize_iata(row.get("iata"))
                if normalized:
                    iatas.add(normalized)
        return iatas

    def search_airports(self, query: str, limit: int = 10) -> list[dict]:
        self._guard_data_access()

        if self._use_db():
            q = f"%{query}%"
            return self._db_rows(
                """
                SELECT
                    a.iata_code AS iata,
                    a.airport_name,
                    a.city,
                    a.state_code AS state,
                    a.country_code AS country
                FROM airports a
                WHERE a.iata_code ILIKE %s OR a.airport_name ILIKE %s OR COALESCE(a.city, '') ILIKE %s
                ORDER BY a.iata_code
                LIMIT %s
                """,
                (q, q, q, limit),
            )

        normalized_query = query.strip().upper()
        iatas = self._csv_airport_universe()
        results = [
            self._airport_from_iata(iata)
            for iata in sorted(iatas)
            if not normalized_query or normalized_query in iata
        ]
        return results[:limit]

    def get_route_explorer(self, origin_iata: str, limit: int = 25) -> list[dict]:
        self._guard_data_access()

        if self._use_db():
            return self._db_rows(
                """
                WITH latest_scores AS (
                    SELECT DISTINCT ON (rs.route_id)
                        rs.route_id,
                        rs.route_attractiveness_score,
                        rs.deal_signal,
                        rs.year,
                        rs.month
                    FROM route_scores rs
                    ORDER BY rs.route_id, rs.year DESC, rs.month DESC
                ), latest_fares AS (
                    SELECT DISTINCT ON (mf.route_id)
                        mf.route_id,
                        mf.avg_fare_usd
                    FROM monthly_fares mf
                    ORDER BY mf.route_id, mf.year DESC, mf.month DESC
                ), reliability AS (
                    SELECT
                        os.route_id,
                        AVG(os.ontime_rate) AS avg_ontime_rate,
                        AVG(c.cancellation_rate) AS avg_cancellation_rate
                    FROM ontime_stats os
                    LEFT JOIN cancellations c
                      ON c.route_id = os.route_id
                     AND c.airline_id = os.airline_id
                     AND c.year = os.year
                     AND c.month = os.month
                    GROUP BY os.route_id
                )
                SELECT
                    ad.iata_code AS destination_iata,
                    ad.airport_name AS destination_airport_name,
                    ad.city AS destination_city,
                    ad.state_code AS destination_state,
                    ad.country_code AS destination_country,
                    ls.route_attractiveness_score AS latest_route_attractiveness_score,
                    ls.deal_signal,
                    lf.avg_fare_usd AS latest_avg_fare_usd,
                    rel.avg_ontime_rate,
                    rel.avg_cancellation_rate,
                    NULL::text AS score_confidence
                FROM routes r
                JOIN airports ao ON ao.airport_id = r.origin_airport_id
                JOIN airports ad ON ad.airport_id = r.destination_airport_id
                LEFT JOIN latest_scores ls ON ls.route_id = r.route_id
                LEFT JOIN latest_fares lf ON lf.route_id = r.route_id
                LEFT JOIN reliability rel ON rel.route_id = r.route_id
                WHERE ao.iata_code = %s
                ORDER BY ls.route_attractiveness_score DESC NULLS LAST
                LIMIT %s
                """,
                (origin_iata, limit),
            )

        scores = self._read_csv("route_scores.csv")
        fares = self._read_csv("monthly_fares.csv")
        latest_by_route: dict[str, dict] = {}
        for row in scores:
            route = row.get("route_key", "")
            y, m = int(row.get("year", 0)), int(row.get("month", 0))
            prev = latest_by_route.get(route)
            if prev is None or (y, m) > (prev["_year"], prev["_month"]):
                latest_by_route[route] = {**row, "_year": y, "_month": m}

        latest_fare_by_route: dict[str, float] = {}
        fare_period: dict[str, tuple[int, int]] = {}
        for row in fares:
            route = row.get("route_key", "")
            y, m = int(row.get("year", 0)), int(row.get("month", 0))
            if route not in fare_period or (y, m) > fare_period[route]:
                fare_period[route] = (y, m)
                latest_fare_by_route[route] = float(row.get("avg_fare_usd", 0))

        output: list[dict] = []
        for route_key, score in latest_by_route.items():
            if "-" not in route_key:
                continue
            origin, destination = route_key.split("-", 1)
            if origin != origin_iata:
                continue
            output.append(
                {
                    "destination_iata": destination,
                    "destination_airport_name": f"{destination} (name unavailable in CSV fallback)",
                    "destination_city": None,
                    "destination_state": None,
                    "destination_country": "US",
                    "latest_route_attractiveness_score": float(score["route_attractiveness_score"])
                    if score.get("route_attractiveness_score")
                    else None,
                    "deal_signal": score.get("deal_signal"),
                    "latest_avg_fare_usd": latest_fare_by_route.get(route_key),
                    "avg_ontime_rate": None,
                    "avg_cancellation_rate": None,
                    "score_confidence": score.get("score_confidence"),
                }
            )
        output.sort(key=lambda r: (r["latest_route_attractiveness_score"] is None, -(r["latest_route_attractiveness_score"] or 0)))
        return output[:limit]

    def get_route_detail(self, origin_iata: str, destination_iata: str) -> dict | None:
        self._guard_data_access()

        if self._use_db():
            route_rows = self._db_rows(
                """
                SELECT
                    r.route_id,
                    ao.iata_code AS origin_iata,
                    ao.airport_name AS origin_airport_name,
                    ao.city AS origin_city,
                    ao.state_code AS origin_state,
                    ao.country_code AS origin_country,
                    ad.iata_code AS destination_iata,
                    ad.airport_name AS destination_airport_name,
                    ad.city AS destination_city,
                    ad.state_code AS destination_state,
                    ad.country_code AS destination_country
                FROM routes r
                JOIN airports ao ON ao.airport_id = r.origin_airport_id
                JOIN airports ad ON ad.airport_id = r.destination_airport_id
                WHERE ao.iata_code = %s AND ad.iata_code = %s
                LIMIT 1
                """,
                (origin_iata, destination_iata),
            )
            if not route_rows:
                return None
            route = route_rows[0]
            route_id = route["route_id"]

            fares = self._db_rows(
                """
                SELECT year, month, avg_fare_usd
                FROM monthly_fares
                WHERE route_id = %s
                ORDER BY year, month
                """,
                (route_id,),
            )

            reliability = self._db_rows(
                """
                SELECT
                    os.year,
                    os.month,
                    AVG(os.ontime_rate) AS ontime_rate,
                    AVG(c.cancellation_rate) AS cancellation_rate
                FROM ontime_stats os
                LEFT JOIN cancellations c
                  ON c.route_id = os.route_id
                 AND c.airline_id = os.airline_id
                 AND c.year = os.year
                 AND c.month = os.month
                WHERE os.route_id = %s
                GROUP BY os.year, os.month
                ORDER BY os.year, os.month
                """,
                (route_id,),
            )

            score_rows = self._db_rows(
                """
                SELECT year, month, reliability_score, fare_volatility, route_attractiveness_score, deal_signal
                FROM route_scores
                WHERE route_id = %s
                ORDER BY year DESC, month DESC
                LIMIT 1
                """,
                (route_id,),
            )
            latest_score = score_rows[0] if score_rows else None
            cheapest = min(fares, key=lambda f: float(f["avg_fare_usd"])) if fares else None

            return {
                "route": {
                    "origin_iata": route["origin_iata"],
                    "origin_airport_name": route["origin_airport_name"],
                    "origin_city": route["origin_city"],
                    "origin_state": route["origin_state"],
                    "origin_country": route["origin_country"],
                    "destination_iata": route["destination_iata"],
                    "destination_airport_name": route["destination_airport_name"],
                    "destination_city": route["destination_city"],
                    "destination_state": route["destination_state"],
                    "destination_country": route["destination_country"],
                },
                "fares": fares,
                "reliability": reliability,
                "score": latest_score,
                "cheapest_month": cheapest,
            }

        route_key = f"{origin_iata}-{destination_iata}"
        fares = [r for r in self._read_csv("monthly_fares.csv") if r.get("route_key") == route_key]
        scores = [r for r in self._read_csv("route_scores.csv") if r.get("route_key") == route_key]
        if not fares and not scores:
            return None
        fare_points = [
            {"year": int(r["year"]), "month": int(r["month"]), "avg_fare_usd": float(r["avg_fare_usd"])} for r in fares
        ]
        fare_points.sort(key=lambda f: (f["year"], f["month"]))
        cheapest = min(fare_points, key=lambda f: f["avg_fare_usd"]) if fare_points else None
        latest_score = None
        if scores:
            latest_raw = max(scores, key=lambda r: (int(r.get("year", 0)), int(r.get("month", 0))))
            latest_score = {
                "year": int(latest_raw.get("year", 0)),
                "month": int(latest_raw.get("month", 0)),
                "reliability_score": float(latest_raw["reliability_score"]) if latest_raw.get("reliability_score") else None,
                "fare_volatility": float(latest_raw["fare_volatility"]) if latest_raw.get("fare_volatility") else None,
                "route_attractiveness_score": float(latest_raw["route_attractiveness_score"])
                if latest_raw.get("route_attractiveness_score")
                else None,
                "deal_signal": latest_raw.get("deal_signal", "neutral"),
            }
        return {
            "route": {
                "origin_iata": origin_iata,
                "origin_airport_name": f"{origin_iata} (name unavailable in CSV fallback)",
                "origin_city": None,
                "origin_state": None,
                "origin_country": "US",
                "destination_iata": destination_iata,
                "destination_airport_name": f"{destination_iata} (name unavailable in CSV fallback)",
                "destination_city": None,
                "destination_state": None,
                "destination_country": "US",
            },
            "fares": fare_points,
            "reliability": [],
            "score": latest_score,
            "cheapest_month": cheapest,
        }

    def get_airport_context(self, iata: str) -> dict | None:
        self._guard_data_access()

        if self._use_db():
            airport_rows = self._db_rows(
                """
                SELECT iata_code AS iata, airport_name, city, state_code AS state, country_code AS country, airport_id
                FROM airports
                WHERE iata_code = %s
                LIMIT 1
                """,
                (iata,),
            )
            if not airport_rows:
                return None
            airport = airport_rows[0]

            enpl_rows = self._db_rows(
                """
                SELECT year, total_enplanements
                FROM airport_enplanements
                WHERE airport_id = %s
                ORDER BY year DESC
                LIMIT 1
                """,
                (airport["airport_id"],),
            )

            related_routes = self.get_route_explorer(origin_iata=iata, limit=5)
            return {
                "airport": {k: airport[k] for k in ("iata", "airport_name", "city", "state", "country")},
                "enplanement": enpl_rows[0] if enpl_rows else None,
                "related_routes": related_routes,
            }

        normalized_iata = self._normalize_iata(iata)
        if normalized_iata is None:
            return None

        explore = self.get_route_explorer(origin_iata=normalized_iata, limit=5)
        airport_known = normalized_iata in self._csv_airport_universe()
        if not airport_known and not explore:
            return None

        airport = self._airport_from_iata(normalized_iata)
        return {"airport": airport, "enplanement": None, "related_routes": explore}

    def get_intelligence_supported_airports(self) -> dict:
        self._guard_data_access()

        if self._use_db():
            role_iatas = {
                row["iata"]
                for row in self._db_rows("SELECT DISTINCT iata FROM airport_role_metrics")
                if row.get("iata")
            }
            airport_comp_iatas = {
                row["iata"]
                for row in self._db_rows("SELECT DISTINCT iata FROM airport_competition_metrics")
                if row.get("iata")
            }
            route_comp_rows = self._db_rows("SELECT origin_iata, destination_iata FROM route_competition_metrics")
            route_comp_iatas: set[str] = set()
            for row in route_comp_rows:
                origin = self._normalize_iata(row.get("origin_iata"))
                destination = self._normalize_iata(row.get("destination_iata"))
                if origin:
                    route_comp_iatas.add(origin)
                if destination:
                    route_comp_iatas.add(destination)

            supported = sorted(role_iatas & airport_comp_iatas)
            return {
                "airports": supported,
                "required_marts": {
                    "airport_role_metrics": len(role_iatas),
                    "airport_competition_metrics": len(airport_comp_iatas),
                    "route_competition_metrics": len(route_comp_rows),
                },
                "route_comp_iatas": len(route_comp_iatas),
            }

        role_rows = self._read_csv("airport_role_metrics.csv")
        airport_comp_rows = self._read_csv("airport_competition_metrics.csv")
        route_comp_rows = self._read_csv("route_competition_metrics.csv")

        role_iatas = {iata for iata in (self._normalize_iata(row.get("iata")) for row in role_rows) if iata}
        airport_comp_iatas = {iata for iata in (self._normalize_iata(row.get("iata")) for row in airport_comp_rows) if iata}

        route_comp_iatas: set[str] = set()
        for row in route_comp_rows:
            origin = self._normalize_iata(row.get("origin_iata"))
            destination = self._normalize_iata(row.get("destination_iata"))
            if origin:
                route_comp_iatas.add(origin)
            if destination:
                route_comp_iatas.add(destination)

        supported = sorted(role_iatas & airport_comp_iatas)
        return {
            "airports": supported,
            "required_marts": {
                "airport_role_metrics": len(role_rows),
                "airport_competition_metrics": len(airport_comp_rows),
                "route_competition_metrics": len(route_comp_rows),
            },
            "route_comp_iatas": len(route_comp_iatas),
        }


    def get_route_changes(
        self,
        airport_iata: str | None = None,
        carrier_code: str | None = None,
        year: int | None = None,
        month: int | None = None,
        change_type: str | None = None,
        limit: int = 100,
    ) -> list[dict]:
        self._guard_data_access()

        if self._use_db():
            clauses = []
            params: list[object] = []
            if airport_iata:
                clauses.append("(rc.origin_iata = %s OR rc.destination_iata = %s)")
                params.extend([airport_iata, airport_iata])
            if carrier_code:
                clauses.append("COALESCE(rc.dominant_carrier, '') = %s")
                params.append(carrier_code)
            if year is not None:
                clauses.append("rc.year = %s")
                params.append(year)
            if month is not None:
                clauses.append("rc.month = %s")
                params.append(month)
            if change_type:
                clauses.append("rc.change_type = %s")
                params.append(change_type)

            where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            params.append(limit)

            return self._db_rows(
                f"""
                SELECT
                    rc.route_key,
                    rc.origin_iata,
                    rc.destination_iata,
                    rc.year,
                    rc.month,
                    rc.change_type,
                    rc.previous_frequency,
                    rc.current_frequency,
                    rc.frequency_delta,
                    rc.dominant_carrier,
                    rc.confidence,
                    rc.significance
                FROM route_change_events rc
                {where_sql}
                ORDER BY rc.year DESC, rc.month DESC, ABS(COALESCE(rc.frequency_delta, 0)) DESC
                LIMIT %s
                """,
                tuple(params),
            )

        rows = self._read_csv("route_change_events.csv")
        out: list[dict] = []
        for row in rows:
            if airport_iata and airport_iata not in (row.get("origin_iata"), row.get("destination_iata")):
                continue
            if carrier_code and (row.get("dominant_carrier") or "") != carrier_code:
                continue
            if year is not None and int(row.get("year", 0)) != year:
                continue
            if month is not None and int(row.get("month", 0)) != month:
                continue
            if change_type and row.get("change_type") != change_type:
                continue
            out.append(
                {
                    "route_key": row.get("route_key"),
                    "origin_iata": row.get("origin_iata"),
                    "destination_iata": row.get("destination_iata"),
                    "year": int(row.get("year", 0)),
                    "month": int(row.get("month", 0)),
                    "change_type": row.get("change_type", "frequency_change"),
                    "previous_frequency": int(row["previous_frequency"]) if row.get("previous_frequency") else None,
                    "current_frequency": int(row["current_frequency"]) if row.get("current_frequency") else None,
                    "frequency_delta": int(row["frequency_delta"]) if row.get("frequency_delta") else None,
                    "dominant_carrier": row.get("dominant_carrier") or None,
                    "confidence": row.get("confidence", "low"),
                    "significance": row.get("significance", "moderate"),
                }
            )

        out.sort(key=lambda r: (r["year"], r["month"], abs(r["frequency_delta"] or 0)), reverse=True)
        return out[:limit]

    def get_airport_role_metrics(self, iata: str) -> dict | None:
        self._guard_data_access()

        if self._use_db():
            rows = self._db_rows(
                """
                SELECT
                    arm.iata,
                    arm.year,
                    arm.month,
                    arm.outbound_routes,
                    arm.destination_diversity_index,
                    arm.carrier_concentration_hhi,
                    arm.dominant_carrier_share,
                    arm.role_label
                FROM airport_role_metrics arm
                WHERE arm.iata = %s
                ORDER BY arm.year DESC, arm.month DESC
                LIMIT 1
                """,
                (iata,),
            )
            return rows[0] if rows else None

        rows = [r for r in self._read_csv("airport_role_metrics.csv") if r.get("iata") == iata]
        if not rows:
            return None
        latest = max(rows, key=lambda r: (int(r.get("year", 0)), int(r.get("month", 0))))
        return {
            "iata": iata,
            "year": int(latest.get("year", 0)),
            "month": int(latest.get("month", 0)),
            "outbound_routes": int(latest.get("outbound_routes", 0)),
            "destination_diversity_index": float(latest.get("destination_diversity_index", 0.0)),
            "carrier_concentration_hhi": float(latest.get("carrier_concentration_hhi", 0.0)),
            "dominant_carrier_share": float(latest.get("dominant_carrier_share", 0.0)),
            "role_label": latest.get("role_label", "emerging"),
        }

    def get_airport_peer_metrics(self, iata: str, limit: int = 5) -> list[dict]:
        self._guard_data_access()

        target = self.get_airport_role_metrics(iata)
        if target is None:
            return []

        if self._use_db():
            return self._db_rows(
                """
                WITH latest AS (
                    SELECT DISTINCT ON (arm.iata)
                        arm.iata,
                        arm.year,
                        arm.month,
                        arm.outbound_routes,
                        arm.destination_diversity_index,
                        arm.dominant_carrier_share,
                        arm.role_label
                    FROM airport_role_metrics arm
                    ORDER BY arm.iata, arm.year DESC, arm.month DESC
                )
                SELECT
                    l.iata,
                    l.outbound_routes,
                    l.destination_diversity_index,
                    l.dominant_carrier_share,
                    l.role_label
                FROM latest l
                WHERE l.iata <> %s
                ORDER BY ABS(l.outbound_routes - %s), ABS(l.destination_diversity_index - %s)
                LIMIT %s
                """,
                (
                    iata,
                    target["outbound_routes"],
                    target["destination_diversity_index"],
                    limit,
                ),
            )

        rows = self._read_csv("airport_role_metrics.csv")
        latest: dict[str, dict] = {}
        for row in rows:
            code = row.get("iata")
            if not code or code == iata:
                continue
            key = (int(row.get("year", 0)), int(row.get("month", 0)))
            prev = latest.get(code)
            if prev is None or key > prev["_period"]:
                latest[code] = {
                    "_period": key,
                    "iata": code,
                    "outbound_routes": int(row.get("outbound_routes", 0)),
                    "destination_diversity_index": float(row.get("destination_diversity_index", 0.0)),
                    "dominant_carrier_share": float(row.get("dominant_carrier_share", 0.0)),
                    "role_label": row.get("role_label", "emerging"),
                }

        peers = list(latest.values())
        peers.sort(
            key=lambda r: (
                abs(r["outbound_routes"] - target["outbound_routes"]),
                abs(r["destination_diversity_index"] - target["destination_diversity_index"]),
            )
        )
        return [{k: v for k, v in row.items() if not k.startswith("_")} for row in peers[:limit]]


    def get_route_competition(
        self,
        origin_iata: str | None = None,
        destination_iata: str | None = None,
        airport_iata: str | None = None,
        year: int | None = None,
        month: int | None = None,
        limit: int = 100,
    ) -> list[dict]:
        self._guard_data_access()

        if self._use_db():
            clauses = []
            params: list[object] = []
            if origin_iata:
                clauses.append("rcm.origin_iata = %s")
                params.append(origin_iata)
            if destination_iata:
                clauses.append("rcm.destination_iata = %s")
                params.append(destination_iata)
            if airport_iata:
                clauses.append("(rcm.origin_iata = %s OR rcm.destination_iata = %s)")
                params.extend([airport_iata, airport_iata])
            if year is not None:
                clauses.append("rcm.year = %s")
                params.append(year)
            if month is not None:
                clauses.append("rcm.month = %s")
                params.append(month)

            where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            params.append(limit)
            return self._db_rows(
                f"""
                SELECT route_key, origin_iata, destination_iata, year, month,
                       active_carriers, dominant_carrier_share, carrier_concentration_hhi,
                       entrant_count, exit_count, entrant_pressure_signal, competition_label,
                       confidence, flights_observed
                FROM route_competition_metrics rcm
                {where_sql}
                ORDER BY year DESC, month DESC, flights_observed DESC
                LIMIT %s
                """,
                tuple(params),
            )

        rows = self._read_csv("route_competition_metrics.csv")
        out: list[dict] = []
        for row in rows:
            if origin_iata and row.get("origin_iata") != origin_iata:
                continue
            if destination_iata and row.get("destination_iata") != destination_iata:
                continue
            if airport_iata and airport_iata not in (row.get("origin_iata"), row.get("destination_iata")):
                continue
            if year is not None and int(row.get("year", 0)) != year:
                continue
            if month is not None and int(row.get("month", 0)) != month:
                continue
            out.append(
                {
                    "route_key": row.get("route_key", ""),
                    "origin_iata": row.get("origin_iata", ""),
                    "destination_iata": row.get("destination_iata", ""),
                    "year": int(row.get("year", 0)),
                    "month": int(row.get("month", 0)),
                    "active_carriers": int(row.get("active_carriers", 0)),
                    "dominant_carrier_share": float(row.get("dominant_carrier_share", 0)),
                    "carrier_concentration_hhi": float(row.get("carrier_concentration_hhi", 0)),
                    "entrant_count": int(row.get("entrant_count", 0)),
                    "exit_count": int(row.get("exit_count", 0)),
                    "entrant_pressure_signal": row.get("entrant_pressure_signal", "stable"),
                    "competition_label": row.get("competition_label", "concentrated"),
                    "confidence": row.get("confidence", "low"),
                    "flights_observed": int(row.get("flights_observed", 0)),
                }
            )
        out.sort(key=lambda r: (r["year"], r["month"], r["flights_observed"]), reverse=True)
        return out[:limit]

    def get_airport_competition_metrics(self, iata: str) -> dict | None:
        self._guard_data_access()

        if self._use_db():
            rows = self._db_rows(
                """
                SELECT iata, year, month, active_outbound_routes, active_carriers,
                       dominant_carrier_share, carrier_concentration_hhi,
                       contested_route_count, monopoly_route_count, contested_route_share,
                       competition_label, confidence, flights_observed
                FROM airport_competition_metrics
                WHERE iata = %s
                ORDER BY year DESC, month DESC
                LIMIT 1
                """,
                (iata,),
            )
            return rows[0] if rows else None

        rows = [r for r in self._read_csv("airport_competition_metrics.csv") if r.get("iata") == iata]
        if not rows:
            return None
        latest = max(rows, key=lambda r: (int(r.get("year", 0)), int(r.get("month", 0))))
        return {
            "iata": iata,
            "year": int(latest.get("year", 0)),
            "month": int(latest.get("month", 0)),
            "active_outbound_routes": int(latest.get("active_outbound_routes", 0)),
            "active_carriers": int(latest.get("active_carriers", 0)),
            "dominant_carrier_share": float(latest.get("dominant_carrier_share", 0.0)),
            "carrier_concentration_hhi": float(latest.get("carrier_concentration_hhi", 0.0)),
            "contested_route_count": int(latest.get("contested_route_count", 0)),
            "monopoly_route_count": int(latest.get("monopoly_route_count", 0)),
            "contested_route_share": float(latest.get("contested_route_share", 0.0)),
            "competition_label": latest.get("competition_label", "highly_concentrated"),
            "confidence": latest.get("confidence", "low"),
            "flights_observed": int(latest.get("flights_observed", 0)),
        }


    def get_route_competition_history(self, route_key: str, periods: int = 6) -> list[dict]:
        self._guard_data_access()
        if self._use_db():
            return self._db_rows(
                """
                SELECT route_key, origin_iata, destination_iata, year, month,
                       active_carriers, dominant_carrier_share, carrier_concentration_hhi,
                       entrant_count, exit_count, entrant_pressure_signal, competition_label,
                       confidence, flights_observed
                FROM route_competition_metrics
                WHERE route_key = %s
                ORDER BY year DESC, month DESC
                LIMIT %s
                """,
                (route_key, periods),
            )

        rows = [r for r in self._read_csv("route_competition_metrics.csv") if r.get("route_key") == route_key]
        parsed = []
        for row in rows:
            parsed.append(
                {
                    "route_key": row.get("route_key", ""),
                    "origin_iata": row.get("origin_iata", ""),
                    "destination_iata": row.get("destination_iata", ""),
                    "year": int(row.get("year", 0)),
                    "month": int(row.get("month", 0)),
                    "active_carriers": int(row.get("active_carriers", 0)),
                    "dominant_carrier_share": float(row.get("dominant_carrier_share", 0)),
                    "carrier_concentration_hhi": float(row.get("carrier_concentration_hhi", 0)),
                    "entrant_count": int(row.get("entrant_count", 0)),
                    "exit_count": int(row.get("exit_count", 0)),
                    "entrant_pressure_signal": row.get("entrant_pressure_signal", "stable"),
                    "competition_label": row.get("competition_label", "concentrated"),
                    "confidence": row.get("confidence", "low"),
                    "flights_observed": int(row.get("flights_observed", 0)),
                }
            )
        parsed.sort(key=lambda r: (r["year"], r["month"]), reverse=True)
        return parsed[:periods]

    def get_airport_competition_history(self, iata: str, periods: int = 6) -> list[dict]:
        self._guard_data_access()
        if self._use_db():
            return self._db_rows(
                """
                SELECT iata, year, month, active_outbound_routes, active_carriers,
                       dominant_carrier_share, carrier_concentration_hhi,
                       contested_route_count, monopoly_route_count, contested_route_share,
                       competition_label, confidence, flights_observed
                FROM airport_competition_metrics
                WHERE iata = %s
                ORDER BY year DESC, month DESC
                LIMIT %s
                """,
                (iata, periods),
            )

        rows = [r for r in self._read_csv("airport_competition_metrics.csv") if r.get("iata") == iata]
        parsed = []
        for row in rows:
            parsed.append(
                {
                    "iata": row.get("iata", ""),
                    "year": int(row.get("year", 0)),
                    "month": int(row.get("month", 0)),
                    "active_outbound_routes": int(row.get("active_outbound_routes", 0)),
                    "active_carriers": int(row.get("active_carriers", 0)),
                    "dominant_carrier_share": float(row.get("dominant_carrier_share", 0)),
                    "carrier_concentration_hhi": float(row.get("carrier_concentration_hhi", 0)),
                    "contested_route_count": int(row.get("contested_route_count", 0)),
                    "monopoly_route_count": int(row.get("monopoly_route_count", 0)),
                    "contested_route_share": float(row.get("contested_route_share", 0)),
                    "competition_label": row.get("competition_label", "highly_concentrated"),
                    "confidence": row.get("confidence", "low"),
                    "flights_observed": int(row.get("flights_observed", 0)),
                }
            )
        parsed.sort(key=lambda r: (r["year"], r["month"]), reverse=True)
        return parsed[:periods]
