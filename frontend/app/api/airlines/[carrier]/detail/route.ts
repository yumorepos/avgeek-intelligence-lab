import { NextRequest, NextResponse } from "next/server";
import { DEMO_AIRLINES, DEMO_ROUTES } from "@/lib/demo-data";
import { demoMetadata } from "@/lib/server-metadata";

export async function GET(_request: NextRequest, { params }: { params: { carrier: string } }) {
  const carrier = params.carrier.toUpperCase();
  const airline = DEMO_AIRLINES.find((a) => a.carrier_code === carrier);
  const routes = DEMO_ROUTES.filter((r) => r.dominant_carrier === carrier);

  if (!airline || routes.length === 0) {
    return NextResponse.json({ detail: "Carrier not found in demo route data." }, { status: 404 });
  }

  const monthly = new Map<string, { total_fare: number; total_ontime: number; count: number }>();
  for (const route of routes) {
    for (const point of route.fare_history) {
      const key = `${point.year}-${String(point.month).padStart(2, "0")}`;
      const agg = monthly.get(key) ?? { total_fare: 0, total_ontime: 0, count: 0 };
      agg.total_fare += point.avg_fare_usd;
      agg.total_ontime += route.ontime_rate;
      agg.count += 1;
      monthly.set(key, agg);
    }
  }

  const trend = Array.from(monthly.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ym, agg]) => {
      const [year, month] = ym.split("-").map(Number);
      return {
        year,
        month,
        avg_fare_usd: Number((agg.total_fare / agg.count).toFixed(2)),
        avg_ontime_rate: Number((agg.total_ontime / agg.count).toFixed(3)),
      };
    });

  return NextResponse.json({
    carrier_code: carrier,
    airline_name: airline.airline_name,
    routes: routes.map((r) => ({
      origin: r.origin,
      destination: r.destination,
      route_score: r.score,
      latest_fare: r.latest_fare,
      latest_deal_signal: r.deal_signal,
    })),
    monthly_trend: trend,
    metadata: await demoMetadata("Carrier drilldown derived from current demo route records."),
  });
}
