import { NextResponse } from "next/server";
import { DEMO_ROUTES } from "@/lib/demo-data";
import { demoMetadata } from "@/lib/server-metadata";

export async function GET() {
  const byHub = DEMO_ROUTES.reduce<Record<string, string[]>>((acc, route) => {
    if (!acc[route.origin]) acc[route.origin] = [];
    acc[route.origin].push(route.destination);
    return acc;
  }, {});

  const hubs = Object.entries(byHub).map(([origin, destinations]) => ({
    origin,
    destinations: Array.from(new Set(destinations)).sort(),
    route_count: Array.from(new Set(destinations)).length,
  }));

  return NextResponse.json({
    hubs,
    metadata: await demoMetadata("Network hub view derived from demo route graph."),
  });
}
