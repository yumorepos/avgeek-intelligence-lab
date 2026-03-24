"""Build airport role metrics from schedule snapshots.

Truth note:
- Metrics are directional proxies and depend on loaded schedule snapshot coverage.
"""

from __future__ import annotations

import argparse
import math
from collections import defaultdict
from pathlib import Path

from pipeline_utils import marts_path, read_csv_rows, write_csv_rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build airport_role_metrics mart")
    parser.add_argument("--input", default=str(marts_path("schedule_snapshots.csv")))
    parser.add_argument("--output", default=str(marts_path("airport_role_metrics.csv")))
    return parser.parse_args()


def _to_int(v: str | None) -> int:
    try:
        return int(float(v or 0))
    except ValueError:
        return 0


def main() -> None:
    args = parse_args()
    rows = read_csv_rows(Path(args.input))

    grouped = defaultdict(lambda: {"destinations": set(), "carrier_freq": defaultdict(int), "total_freq": 0})
    for row in rows:
        route_key = row.get("route_key", "")
        if "-" not in route_key:
            continue
        origin, destination = route_key.split("-", 1)
        year = _to_int(row.get("year"))
        month = _to_int(row.get("month"))
        carrier = row.get("carrier_code", "")
        freq = _to_int(row.get("flights_scheduled"))
        if year <= 0 or month <= 0:
            continue

        key = (origin, year, month)
        grouped[key]["destinations"].add(destination)
        grouped[key]["carrier_freq"][carrier] += freq
        grouped[key]["total_freq"] += freq

    output = []
    for (iata, year, month), agg in sorted(grouped.items()):
        outbound_routes = len(agg["destinations"])
        total_freq = agg["total_freq"]
        shares = []
        if total_freq > 0:
            for freq in agg["carrier_freq"].values():
                shares.append(freq / total_freq)
        hhi = sum((s * 100) ** 2 for s in shares) if shares else 0.0
        dominant_share = max(shares) if shares else 0.0

        if outbound_routes >= 80 and dominant_share < 0.35:
            role = "diversified_global_hub"
        elif outbound_routes >= 40 and dominant_share < 0.55:
            role = "multi_carrier_hub"
        elif outbound_routes >= 20:
            role = "focused_regional_hub"
        else:
            role = "emerging_or_sparse"

        diversity = math.log1p(outbound_routes)
        output.append(
            {
                "iata": iata,
                "year": year,
                "month": month,
                "outbound_routes": outbound_routes,
                "destination_diversity_index": round(diversity, 4),
                "carrier_concentration_hhi": round(hhi, 4),
                "dominant_carrier_share": round(dominant_share, 4),
                "role_label": role,
            }
        )

    write_csv_rows(
        Path(args.output),
        output,
        [
            "iata",
            "year",
            "month",
            "outbound_routes",
            "destination_diversity_index",
            "carrier_concentration_hhi",
            "dominant_carrier_share",
            "role_label",
        ],
    )


if __name__ == "__main__":
    main()
