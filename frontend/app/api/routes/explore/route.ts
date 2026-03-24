import { NextRequest, NextResponse } from "next/server";
import { routesFrom } from "@/lib/demo-data";
import { demoMetadata } from "@/lib/server-metadata";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const origin = (searchParams.get("origin") || "").toUpperCase();

  const routes = routesFrom(origin).map((route) => ({
    destination: {
      iata: route.destination,
      airport_name: route.destination_airport_name,
      city: route.destination_city,
      state: route.destination_state,
      country: "USA",
    },
    latest_route_attractiveness_score: route.score,
    latest_deal_signal: route.deal_signal,
    headline_fare_insight: `Latest fare: $${route.latest_fare}, route-relative signal: ${route.deal_signal}`,
    reliability_summary: { avg_ontime_rate: route.ontime_rate, avg_cancellation_rate: route.cancellation_rate },
    score_confidence: route.confidence,
  }));

  return NextResponse.json({
    origin,
    routes,
    metadata: await demoMetadata("Using mock data for demo. Backend not deployed yet."),
  });
}
