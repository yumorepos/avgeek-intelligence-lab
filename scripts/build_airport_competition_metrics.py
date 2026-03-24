"""Build airport competition metrics from schedule snapshots and route competition marts.

Methodology (v0_competition):
- Measures competition at origin-airport level for each year-month.
- Uses carrier frequency shares from outbound schedule snapshots.
- Adds contested/monopoly route counts from route competition mart.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from pathlib import Path

from pipeline_utils import marts_path, read_csv_rows, write_csv_rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build airport_competition_metrics mart")
    parser.add_argument("--schedule-input", default=str(marts_path("schedule_snapshots.csv")))
    parser.add_argument("--route-comp-input", default=str(marts_path("route_competition_metrics.csv")))
    parser.add_argument("--output", default=str(marts_path("airport_competition_metrics.csv")))
    return parser.parse_args()


def _to_int(value: str | None) -> int:
    try:
        return int(float(value or 0))
    except ValueError:
        return 0


def _to_float(value: str | None) -> float:
    try:
        return float(value or 0)
    except ValueError:
        return 0.0


def _label(active_carriers: int, hhi: float) -> str:
    if active_carriers <= 1:
        return "single_carrier_dominant"
    if hhi >= 3000:
        return "highly_concentrated"
    if hhi >= 1800:
        return "competitive_but_concentrated"
    return "broadly_competitive"


def main() -> None:
    args = parse_args()
    schedule_rows = read_csv_rows(Path(args.schedule_input))
    route_comp_rows = read_csv_rows(Path(args.route_comp_input))

    airport_period_carrier = defaultdict(lambda: defaultdict(int))
    airport_period_routes = defaultdict(set)
    for row in schedule_rows:
        route_key = row.get("route_key", "")
        if "-" not in route_key:
            continue
        origin, _dest = route_key.split("-", 1)
        carrier = row.get("carrier_code", "")
        year = _to_int(row.get("year"))
        month = _to_int(row.get("month"))
        flights = _to_int(row.get("flights_scheduled"))
        if not carrier or year <= 0 or month <= 0:
            continue
        airport_period_carrier[(origin, year, month)][carrier] += flights
        airport_period_routes[(origin, year, month)].add(route_key)

    contested_counts = defaultdict(lambda: {"contested_routes": 0, "monopoly_routes": 0})
    for row in route_comp_rows:
        origin = row.get("origin_iata", "")
        year = _to_int(row.get("year"))
        month = _to_int(row.get("month"))
        label = row.get("competition_label", "")
        if not origin or year <= 0 or month <= 0:
            continue
        key = (origin, year, month)
        if label in ("contested", "fragmented"):
            contested_counts[key]["contested_routes"] += 1
        if label == "monopoly":
            contested_counts[key]["monopoly_routes"] += 1

    output = []
    for (iata, year, month), carrier_map in sorted(airport_period_carrier.items()):
        total_flights = sum(max(v, 0) for v in carrier_map.values())
        active_carriers = len([1 for f in carrier_map.values() if f > 0])
        dominant_share = 0.0
        hhi = 0.0
        if total_flights > 0 and active_carriers > 0:
            shares = [(v / total_flights) for v in carrier_map.values() if v > 0]
            dominant_share = max(shares)
            hhi = sum((s * 100) ** 2 for s in shares)

        route_count = len(airport_period_routes[(iata, year, month)])
        contested = contested_counts[(iata, year, month)]["contested_routes"]
        monopoly = contested_counts[(iata, year, month)]["monopoly_routes"]
        contested_share = (contested / route_count) if route_count > 0 else 0.0

        output.append(
            {
                "iata": iata,
                "year": year,
                "month": month,
                "active_outbound_routes": route_count,
                "active_carriers": active_carriers,
                "dominant_carrier_share": round(dominant_share, 4),
                "carrier_concentration_hhi": round(hhi, 3),
                "contested_route_count": contested,
                "monopoly_route_count": monopoly,
                "contested_route_share": round(contested_share, 4),
                "competition_label": _label(active_carriers, hhi),
                "confidence": "high" if total_flights >= 500 else "medium" if total_flights >= 150 else "low",
                "flights_observed": total_flights,
            }
        )

    write_csv_rows(
        Path(args.output),
        output,
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
    )


if __name__ == "__main__":
    main()
