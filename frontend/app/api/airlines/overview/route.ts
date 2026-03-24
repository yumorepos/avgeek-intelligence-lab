import { NextResponse } from "next/server";
import { DEMO_AIRLINES, DEMO_ROUTES } from "@/lib/demo-data";
import { demoMetadata } from "@/lib/server-metadata";

export async function GET() {
  const byCarrier = DEMO_ROUTES.reduce<Record<string, { route_count: number; avg_score_total: number; avg_ontime_total: number }>>((acc, route) => {
    if (!acc[route.dominant_carrier]) {
      acc[route.dominant_carrier] = { route_count: 0, avg_score_total: 0, avg_ontime_total: 0 };
    }
    acc[route.dominant_carrier].route_count += 1;
    acc[route.dominant_carrier].avg_score_total += route.score;
    acc[route.dominant_carrier].avg_ontime_total += route.ontime_rate;
    return acc;
  }, {});

  const airlines = Object.entries(byCarrier).map(([carrier_code, agg]) => ({
    carrier_code,
    airline_name: DEMO_AIRLINES.find((a) => a.carrier_code === carrier_code)?.airline_name ?? carrier_code,
    route_count: agg.route_count,
    avg_route_score: Number((agg.avg_score_total / agg.route_count).toFixed(1)),
    avg_ontime_rate: Number((agg.avg_ontime_total / agg.route_count).toFixed(3)),
  }));

  return NextResponse.json({
    airlines,
    metadata: await demoMetadata("Airline overview derived from demo route intelligence records."),
  });
}
