import { NextRequest, NextResponse } from "next/server";
import { findAirport, findRoute } from "@/lib/demo-data";
import { demoMetadata } from "@/lib/server-metadata";

export async function GET(_request: NextRequest, { params }: { params: { origin: string; destination: string } }) {
  const origin = params.origin.toUpperCase();
  const destination = params.destination.toUpperCase();

  const route = findRoute(origin, destination);
  if (!route) {
    return NextResponse.json({ detail: "Route not found in mock demo data." }, { status: 404 });
  }

  const originAirport = findAirport(origin);
  const destinationAirport = findAirport(destination);
  const cheapest = route.fare_history.reduce((p, c) => (c.avg_fare_usd < p.avg_fare_usd ? c : p), route.fare_history[0]);

  return NextResponse.json({
    route_summary: {
      origin: {
        iata: origin,
        airport_name: originAirport?.airport_name ?? `${origin} Airport`,
        city: originAirport?.city ?? null,
        state: originAirport?.state ?? null,
        country: "US",
      },
      destination: {
        iata: destination,
        airport_name: destinationAirport?.airport_name ?? `${destination} Airport`,
        city: destinationAirport?.city ?? null,
        state: destinationAirport?.state ?? null,
        country: "US",
      },
    },
    monthly_fare_trend: route.fare_history,
    reliability_trend: route.fare_history.map((f, idx) => ({
      year: f.year,
      month: f.month,
      ontime_rate: Number((route.ontime_rate - 0.01 + (idx % 3) * 0.01).toFixed(3)),
      cancellation_rate: route.cancellation_rate,
    })),
    latest_score_breakdown: {
      year: route.fare_history[route.fare_history.length - 1].year,
      month: route.fare_history[route.fare_history.length - 1].month,
      reliability_score: Math.round(route.ontime_rate * 100),
      fare_volatility: 12.8,
      route_attractiveness_score: route.score,
      deal_signal: route.deal_signal,
    },
    cheapest_month: cheapest,
    methodology_hint: "Scores are generated via v1_heuristic methodology; consult /meta/methodology for caveats.",
    metadata: await demoMetadata("Mock route detail for demo parity. Replace with backend for full dataset coverage."),
  });
}
