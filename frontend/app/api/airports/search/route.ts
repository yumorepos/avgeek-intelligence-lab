import { NextRequest, NextResponse } from "next/server";
import { DEMO_AIRPORTS } from "@/lib/demo-data";
import { demoMetadata } from "@/lib/server-metadata";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = (searchParams.get("q") || "").toLowerCase();

  const results = DEMO_AIRPORTS.filter(
    (airport) =>
      airport.iata.toLowerCase().includes(query) ||
      airport.airport_name.toLowerCase().includes(query) ||
      airport.city.toLowerCase().includes(query),
  ).map(({ enplanements: _e, lat: _lat, lon: _lon, ...airport }) => airport);

  return NextResponse.json({
    query,
    results,
    metadata: await demoMetadata("Using mock data for demo. Backend not deployed yet."),
  });
}
