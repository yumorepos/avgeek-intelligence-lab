"""Build route competition metrics from schedule snapshots.

Methodology (v0_competition):
- Active carriers: carriers with flights_scheduled > 0 for route-month.
- Dominant carrier share: max carrier flights / total flights.
- HHI proxy: sum((carrier_share_pct)^2).
- Entrant pressure: compares active carrier set with prior observed route-month.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from pathlib import Path

from pipeline_utils import marts_path, read_csv_rows, write_csv_rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build route_competition_metrics mart")
    parser.add_argument("--input", default=str(marts_path("schedule_snapshots.csv")))
    parser.add_argument("--output", default=str(marts_path("route_competition_metrics.csv")))
    return parser.parse_args()


def _to_int(value: str | None) -> int:
    try:
        return int(float(value or 0))
    except ValueError:
        return 0


def _label(active_carriers: int, hhi: float) -> str:
    if active_carriers <= 1:
        return "monopoly"
    if hhi >= 2500:
        return "concentrated"
    if hhi >= 1500:
        return "contested"
    return "fragmented"


def _confidence(total_flights: int, active_carriers: int) -> str:
    if total_flights >= 200 and active_carriers >= 2:
        return "high"
    if total_flights >= 80:
        return "medium"
    return "low"


def main() -> None:
    args = parse_args()
    rows = read_csv_rows(Path(args.input))

    route_period_carrier = defaultdict(lambda: defaultdict(int))
    for row in rows:
        route_key = row.get("route_key", "")
        carrier = row.get("carrier_code", "")
        year = _to_int(row.get("year"))
        month = _to_int(row.get("month"))
        flights = _to_int(row.get("flights_scheduled"))
        if not route_key or not carrier or year <= 0 or month <= 0:
            continue
        route_period_carrier[(route_key, year, month)][carrier] += flights

    by_route = defaultdict(list)
    for route_key, year, month in route_period_carrier.keys():
        by_route[route_key].append((year, month))

    output = []
    for route_key, periods in by_route.items():
        sorted_periods = sorted(set(periods))
        previous_carriers: set[str] | None = None

        for year, month in sorted_periods:
            carrier_map = route_period_carrier[(route_key, year, month)]
            active = {c for c, f in carrier_map.items() if f > 0}
            total_flights = sum(max(v, 0) for v in carrier_map.values())

            dominant_share = 0.0
            hhi = 0.0
            if total_flights > 0 and active:
                shares = [(carrier_map[c] / total_flights) for c in active]
                dominant_share = max(shares)
                hhi = sum((s * 100) ** 2 for s in shares)

            entrants = 0
            exits = 0
            entrant_signal = "stable"
            if previous_carriers is not None:
                entrants = len(active - previous_carriers)
                exits = len(previous_carriers - active)
                if entrants > exits and entrants > 0:
                    entrant_signal = "pressure_up"
                elif exits > entrants and exits > 0:
                    entrant_signal = "pressure_down"
                elif entrants == exits and entrants > 0:
                    entrant_signal = "rotation"

            label = _label(len(active), hhi)
            confidence = _confidence(total_flights, len(active))
            origin, destination = route_key.split("-", 1)
            output.append(
                {
                    "route_key": route_key,
                    "origin_iata": origin,
                    "destination_iata": destination,
                    "year": year,
                    "month": month,
                    "active_carriers": len(active),
                    "dominant_carrier_share": round(dominant_share, 4),
                    "carrier_concentration_hhi": round(hhi, 3),
                    "entrant_count": entrants,
                    "exit_count": exits,
                    "entrant_pressure_signal": entrant_signal,
                    "competition_label": label,
                    "confidence": confidence,
                    "flights_observed": total_flights,
                }
            )
            previous_carriers = active

    write_csv_rows(
        Path(args.output),
        output,
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
    )


if __name__ == "__main__":
    main()
