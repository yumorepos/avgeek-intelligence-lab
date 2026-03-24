"""Evaluate v0_competition_insights quality from mart snapshots.

Outputs JSON with:
- insight frequency
- suppression rate
- label distribution
- confidence distribution
- time consistency summaries
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path

from pipeline_utils import marts_path, read_csv_rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate competition insights quality")
    parser.add_argument("--input", default=str(marts_path("route_competition_metrics.csv")))
    parser.add_argument("--output", default=str(marts_path("insight_quality_report.json")))
    return parser.parse_args()


def _to_int(v: str | None) -> int:
    try:
        return int(float(v or 0))
    except ValueError:
        return 0


def _to_float(v: str | None) -> float:
    try:
        return float(v or 0)
    except ValueError:
        return 0.0


def confidence(flights: int, periods: int) -> str:
    if flights >= 200 and periods >= 3:
        return "high"
    if flights >= 80 and periods >= 2:
        return "medium"
    return "low"


def main() -> None:
    args = parse_args()
    rows = read_csv_rows(Path(args.input))

    parsed = []
    for row in rows:
        parsed.append(
            {
                "route_key": row.get("route_key", ""),
                "year": _to_int(row.get("year")),
                "month": _to_int(row.get("month")),
                "hhi": _to_float(row.get("carrier_concentration_hhi")),
                "entrants": _to_int(row.get("entrant_count")),
                "exits": _to_int(row.get("exit_count")),
                "dominant": _to_float(row.get("dominant_carrier_share")),
                "pressure": row.get("entrant_pressure_signal", "stable"),
                "flights": _to_int(row.get("flights_observed")),
            }
        )

    by_route: dict[str, list[dict]] = defaultdict(list)
    for row in parsed:
        by_route[row["route_key"]].append(row)

    labels = defaultdict(int)
    confidence_dist = defaultdict(int)
    generated = 0
    suppressed = 0

    for history in by_route.values():
        history.sort(key=lambda r: (r["year"], r["month"]), reverse=True)
        if len(history) < 2:
            continue
        latest, prev = history[0], history[1]
        hhi_delta = latest["hhi"] - prev["hhi"]

        label = None
        if hhi_delta <= -200 and latest["entrants"] > 0:
            label = "competition increasing"
        elif hhi_delta >= 200 and latest["exits"] > 0:
            label = "market consolidation"
        elif latest["entrants"] >= 1 and latest["pressure"] in ("pressure_up", "rotation"):
            label = "new entrant pressure"
        elif latest["entrants"] + latest["exits"] >= 2:
            label = "unstable competition"
        elif latest["dominant"] >= 0.6:
            label = "stable dominance"

        if not label:
            continue

        generated += 1
        conf = confidence(latest["flights"], len(history))
        confidence_dist[conf] += 1
        if conf == "low":
            suppressed += 1
            continue
        labels[label] += 1

    report = {
        "methodology_version": "v0_competition_insights",
        "total_routes_seen": len(by_route),
        "total_insights_generated": generated,
        "suppressed_low_confidence_count": suppressed,
        "suppression_rate_pct": round((suppressed / generated * 100.0), 2) if generated else 0.0,
        "label_distribution": dict(labels),
        "confidence_distribution": dict(confidence_dist),
        "consistency": {
            "routes_with_history": sum(1 for h in by_route.values() if len(h) >= 2),
            "routes_with_3plus_periods": sum(1 for h in by_route.values() if len(h) >= 3),
        },
    }

    Path(args.output).write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
