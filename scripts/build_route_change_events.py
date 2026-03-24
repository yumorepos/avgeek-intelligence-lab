"""Build route change events mart from schedule snapshots.

Event taxonomy:
- launch: no previous frequency and current > 0
- cut: previous > 0 and current = 0
- resume: previous = 0 and current > 0
- frequency_change: previous > 0, current > 0 and delta threshold reached
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from pathlib import Path

from pipeline_utils import marts_path, read_csv_rows, write_csv_rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build route_change_events mart")
    parser.add_argument("--input", default=str(marts_path("schedule_snapshots.csv")))
    parser.add_argument("--output", default=str(marts_path("route_change_events.csv")))
    parser.add_argument("--delta-threshold", type=int, default=20)
    return parser.parse_args()


def _to_int(v: str | None) -> int:
    try:
        return int(float(v or 0))
    except ValueError:
        return 0


def main() -> None:
    args = parse_args()
    rows = read_csv_rows(Path(args.input))

    route_month = defaultdict(lambda: defaultdict(int))
    route_carrier = defaultdict(lambda: defaultdict(int))
    for row in rows:
        route_key = row.get("route_key", "")
        carrier = row.get("carrier_code", "")
        year = _to_int(row.get("year"))
        month = _to_int(row.get("month"))
        flights = _to_int(row.get("flights_scheduled"))
        if not route_key or year <= 0 or month <= 0:
            continue
        period = (year, month)
        route_month[route_key][period] += flights
        route_carrier[route_key][carrier] += flights

    output = []
    for route_key, period_map in route_month.items():
        periods = sorted(period_map.keys())
        dominant_carrier = ""
        if route_key in route_carrier and route_carrier[route_key]:
            dominant_carrier = max(route_carrier[route_key].items(), key=lambda x: x[1])[0]

        prev_freq = 0
        for year, month in periods:
            current = period_map[(year, month)]
            change_type = None
            if prev_freq == 0 and current > 0:
                change_type = "launch"
            elif prev_freq > 0 and current == 0:
                change_type = "cut"
            elif prev_freq == 0 and current > 0:
                change_type = "resume"
            elif prev_freq > 0 and current > 0 and abs(current - prev_freq) >= args.delta_threshold:
                change_type = "frequency_change"

            if change_type:
                origin, destination = route_key.split("-", 1)
                delta = current - prev_freq
                abs_delta = abs(delta)
                significance = "high" if abs_delta >= 60 else "moderate" if abs_delta >= args.delta_threshold else "low"
                confidence = "high" if len(periods) >= 6 else "medium" if len(periods) >= 3 else "low"
                output.append(
                    {
                        "route_key": route_key,
                        "origin_iata": origin,
                        "destination_iata": destination,
                        "year": year,
                        "month": month,
                        "change_type": change_type,
                        "previous_frequency": prev_freq,
                        "current_frequency": current,
                        "frequency_delta": delta,
                        "dominant_carrier": dominant_carrier,
                        "significance": significance,
                        "confidence": confidence,
                    }
                )

            prev_freq = current

    write_csv_rows(
        Path(args.output),
        output,
        [
            "route_key",
            "origin_iata",
            "destination_iata",
            "year",
            "month",
            "change_type",
            "previous_frequency",
            "current_frequency",
            "frequency_delta",
            "dominant_carrier",
            "significance",
            "confidence",
        ],
    )


if __name__ == "__main__":
    main()
