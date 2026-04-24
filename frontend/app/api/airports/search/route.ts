import { NextRequest, NextResponse } from "next/server";
import { DEMO_AIRPORTS } from "@/lib/demo-data";
import { demoMetadata } from "@/lib/server-metadata";

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawQuery = searchParams.get("q") ?? "";

  // Backend-configured mode: forward to real backend so the "Live now" label is
  // truthful. No silent mock fallback when BACKEND_URL is set — an upstream
  // failure surfaces as an explicit error to the client.
  if (BACKEND_URL) {
    const upstream = `${BACKEND_URL}/airports/search?q=${encodeURIComponent(rawQuery)}`;
    const response = await fetch(upstream, { cache: "no-store" });
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  }

  // Frontend-only mock mode: no backend configured, serve demo fixture.
  const query = rawQuery.toLowerCase();
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
