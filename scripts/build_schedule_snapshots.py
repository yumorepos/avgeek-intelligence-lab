"""Build schedule snapshot mart from on-time stats.

Truth note:
- This MVP approximation uses flights_total as a schedule-frequency proxy.
- seats_scheduled is unavailable in current sources and remains blank.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from pipeline_utils import marts_path, read_csv_rows, write_csv_rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build schedule_snapshots mart")
    parser.add_argument("--input", default=str(marts_path("ontime_stats.csv")))
    parser.add_argument("--output", default=str(marts_path("schedule_snapshots.csv")))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = read_csv_rows(Path(args.input))
    output = []
    for row in rows:
        output.append(
            {
                "route_key": row.get("route_key", ""),
                "carrier_code": row.get("carrier_code", ""),
                "year": row.get("year", ""),
                "month": row.get("month", ""),
                "flights_scheduled": row.get("flights_total", "0"),
                "seats_scheduled": "",
            }
        )

    write_csv_rows(
        Path(args.output),
        output,
        ["route_key", "carrier_code", "year", "month", "flights_scheduled", "seats_scheduled"],
    )


if __name__ == "__main__":
    main()
