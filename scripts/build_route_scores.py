"""Build route-level score mart from fares and reliability marts.

Input marts:
- data/marts/monthly_fares.csv
- data/marts/ontime_stats.csv
- data/marts/cancellations.csv

Output:
- data/marts/route_scores.csv (grain: route + year + month)

MVP scoring intent:
- Keep formulas transparent and explainable (heuristic, not ML).
- Degrade gracefully toward neutral values when sample sizes are thin.
- Keep score version metadata so future iterations are traceable.
"""

from __future__ import annotations

import argparse
import logging
from collections import defaultdict
from pathlib import Path
from statistics import median, pstdev

from pipeline_utils import marts_path, read_csv_rows, setup_logging, write_csv_rows

LOGGER = logging.getLogger("build_route_scores")
SCORE_VERSION = "v1_heuristic"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build route_scores mart")
    parser.add_argument("--fares-input", default=str(marts_path("monthly_fares.csv")))
    parser.add_argument("--ontime-input", default=str(marts_path("ontime_stats.csv")))
    parser.add_argument("--cancel-input", default=str(marts_path("cancellations.csv")))
    parser.add_argument("--output", default=str(marts_path("route_scores.csv")))
    parser.add_argument("--log-level", default="INFO")
    return parser.parse_args()


def to_int(value: object) -> int | None:
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def to_float(value: object) -> float | None:
    try:
        value_str = str(value).strip()
        if value_str == "":
            return None
        return float(value_str)
    except (TypeError, ValueError):
        return None


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def confidence_label(confidence: float) -> str:
    if confidence >= 0.8:
        return "high"
    if confidence >= 0.5:
        return "medium"
    return "low"


def main() -> None:
    args = parse_args()
    setup_logging(args.log_level)

    fares_rows = read_csv_rows(Path(args.fares_input))
    ontime_rows = read_csv_rows(Path(args.ontime_input))
    cancel_rows = read_csv_rows(Path(args.cancel_input))

    keys: set[tuple[str, int, int]] = set()

    # Route-month fare values + route history.
    fare_by_key: dict[tuple[str, int, int], float] = {}
    route_fare_history: dict[str, list[float]] = defaultdict(list)

    for row in fares_rows:
        route_key = row.get("route_key", "")
        year = to_int(row.get("year"))
        month = to_int(row.get("month"))
        avg_fare = to_float(row.get("avg_fare_usd"))
        if not route_key or year is None or month is None:
            continue

        key = (route_key, year, month)
        keys.add(key)
        if avg_fare is not None and avg_fare > 0:
            fare_by_key[key] = avg_fare
            route_fare_history[route_key].append(avg_fare)

    # Route-level baseline fare stats used for cheapest-month and deal logic.
    route_fare_stats: dict[str, dict[str, float | int | None]] = {}
    for route_key, fares in route_fare_history.items():
        if not fares:
            continue
        hist_median = median(fares)
        hist_mean = sum(fares) / len(fares)
        vol_pct = ""
        if len(fares) >= 3 and hist_mean > 0:
            vol_pct = round((pstdev(fares) / hist_mean) * 100, 3)

        # Cheapest month: choose month with lowest historical average fare.
        month_to_fares: dict[int, list[float]] = defaultdict(list)
        for (k_route, _k_year, k_month), fare in fare_by_key.items():
            if k_route == route_key:
                month_to_fares[k_month].append(fare)
        cheapest_month = ""
        if month_to_fares:
            cheapest_month = min(
                month_to_fares.items(),
                key=lambda x: (
                    sum(x[1]) / len(x[1]),  # lower average fare wins
                    -len(x[1]),  # prefer better-covered months when tied
                    x[0],  # deterministic tie-break
                ),
            )[0]

        route_fare_stats[route_key] = {
            "history_months": len(fares),
            "median": hist_median,
            "mean": hist_mean,
            "fare_volatility": vol_pct,
            "cheapest_month": cheapest_month,
        }

    # Aggregate reliability by route-month across airlines.
    route_month_reliability = defaultdict(lambda: {"flights": 0, "ontime": 0, "cancel": 0, "cancel_flights": 0})

    for row in ontime_rows:
        route_key = row.get("route_key", "")
        year = to_int(row.get("year"))
        month = to_int(row.get("month"))
        flights = to_int(row.get("flights_total"))
        ontime = to_int(row.get("flights_ontime"))
        if not route_key or year is None or month is None:
            continue
        key = (route_key, year, month)
        keys.add(key)
        route_month_reliability[key]["flights"] += max(flights or 0, 0)
        route_month_reliability[key]["ontime"] += max(ontime or 0, 0)

    for row in cancel_rows:
        route_key = row.get("route_key", "")
        year = to_int(row.get("year"))
        month = to_int(row.get("month"))
        flights = to_int(row.get("flights_total"))
        cancel = to_int(row.get("cancellations_count"))
        if not route_key or year is None or month is None:
            continue
        key = (route_key, year, month)
        keys.add(key)
        route_month_reliability[key]["cancel"] += max(cancel or 0, 0)
        route_month_reliability[key]["cancel_flights"] += max(flights or 0, 0)

    output_rows = []

    for route_key, year, month in sorted(keys):
        key = (route_key, year, month)

        fare_stats = route_fare_stats.get(route_key, {})
        history_months = int(fare_stats.get("history_months", 0) or 0)
        route_median_fare = to_float(fare_stats.get("median"))
        fare_volatility = fare_stats.get("fare_volatility", "")
        cheapest_month = fare_stats.get("cheapest_month", "")

        current_fare = fare_by_key.get(key)
        price_index = ""
        if current_fare is not None and route_median_fare and route_median_fare > 0:
            price_index = current_fare / route_median_fare

        rel = route_month_reliability[key]
        flights_total = rel["flights"] or rel["cancel_flights"]
        reliability_score = ""
        if flights_total > 0:
            ontime_rate = clamp(rel["ontime"] / flights_total, 0.0, 1.0)
            cancel_rate = clamp(rel["cancel"] / flights_total, 0.0, 1.0)
            raw_reliability = clamp((ontime_rate - cancel_rate) * 100, 0, 100)
            flight_confidence = clamp(flights_total / 50.0, 0.0, 1.0)
            reliability_score = round(50 + (raw_reliability - 50) * flight_confidence, 3)

        # Deal classification (DB-friendly codes + human label for UX transparency).
        deal_signal = "neutral"
        deal_signal_label = "Insufficient fare history"
        if isinstance(price_index, float) and history_months >= 4:
            if price_index <= 0.85:
                deal_signal = "strong_deal"
                deal_signal_label = "Great deal"
            elif price_index <= 0.97:
                deal_signal = "deal"
                deal_signal_label = "Fair price"
            elif price_index <= 1.10:
                deal_signal = "neutral"
                deal_signal_label = "Typical price"
            else:
                deal_signal = "expensive"
                deal_signal_label = "Above typical"
        elif current_fare is None:
            deal_signal_label = "No fare data"

        # Route attractiveness = weighted blend of price, reliability, and stability.
        # Missing components are skipped and weights are renormalized.
        components: list[tuple[float, float]] = []

        if isinstance(price_index, float):
            # 0.8x of baseline fare -> very attractive (100), 1.2x+ -> unattractive (0).
            price_score = 100 * clamp((1.2 - price_index) / 0.4, 0.0, 1.0)
            components.append((price_score, 0.45))

        if isinstance(reliability_score, float):
            components.append((reliability_score, 0.35))

        if isinstance(fare_volatility, float):
            # <=0 volatility is best (100); >=40% volatility is poor (0).
            stability_score = 100 * clamp((40 - fare_volatility) / 40, 0.0, 1.0)
            components.append((stability_score, 0.20))

        route_attractiveness_score = ""
        score_confidence = "low"
        if components:
            weight_total = sum(weight for _score, weight in components)
            base_score = sum(score * weight for score, weight in components) / weight_total

            history_conf = clamp(history_months / 6.0, 0.0, 1.0)
            flights_conf = clamp(flights_total / 50.0, 0.0, 1.0) if flights_total > 0 else 0.0
            # If either side is sparse, confidence drops.
            overall_conf = min(history_conf, flights_conf) if len(components) > 1 else max(history_conf, flights_conf)

            route_attractiveness_score = round(50 + (base_score - 50) * overall_conf, 3)
            score_confidence = confidence_label(overall_conf)

        output_rows.append(
            {
                "route_key": route_key,
                "year": year,
                "month": month,
                "cheapest_month": cheapest_month,
                "fare_volatility": fare_volatility,
                "reliability_score": reliability_score,
                "deal_signal": deal_signal,
                "deal_signal_label": deal_signal_label,
                "route_attractiveness_score": route_attractiveness_score,
                "score_confidence": score_confidence,
                "score_version": SCORE_VERSION,
                "history_months_available": history_months,
                "flights_observed": flights_total,
            }
        )

    write_csv_rows(
        Path(args.output),
        output_rows,
        [
            "route_key",
            "year",
            "month",
            "cheapest_month",
            "fare_volatility",
            "reliability_score",
            "deal_signal",
            "deal_signal_label",
            "route_attractiveness_score",
            "score_confidence",
            "score_version",
            "history_months_available",
            "flights_observed",
        ],
    )
    LOGGER.info("Wrote %s route_scores rows to %s", len(output_rows), args.output)


if __name__ == "__main__":
    main()
