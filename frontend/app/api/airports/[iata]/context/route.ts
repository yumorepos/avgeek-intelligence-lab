import { NextRequest, NextResponse } from "next/server";
import { findAirport, routesFrom } from "@/lib/demo-data";
import { demoMetadata } from "@/lib/server-metadata";

export async function GET(_request: NextRequest, { params }: { params: { iata: string } }) {
  const iata = params.iata.toUpperCase();
  const airport = findAirport(iata);

  if (!airport) {
    return NextResponse.json({ detail: "Airport not found in mock demo data." }, { status: 404 });
  }

  const relatedRoutes = routesFrom(iata).map((route) => ({
    destination_iata: route.destination,
    destination_city: route.destination_city,
    destination_airport_name: route.destination_airport_name,
    latest_route_attractiveness_score: route.score,
    latest_deal_signal: route.deal_signal,
  }));

  return NextResponse.json({
    airport: {
      iata: airport.iata,
      airport_name: airport.airport_name,
      city: airport.city,
      state: airport.state,
      country: "US",
    },
    latest_enplanement: {
      year: 2024,
      total_enplanements: airport.enplanements,
    },
    related_routes: relatedRoutes,
    metadata: await demoMetadata("Mock airport context for demo parity. Replace with backend for full real coverage."),
  });
}
