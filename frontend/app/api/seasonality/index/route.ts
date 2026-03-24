import { NextResponse } from "next/server";
import { DEMO_ROUTES } from "@/lib/demo-data";
import { demoMetadata } from "@/lib/server-metadata";

export async function GET() {
  const monthAgg = new Map<number, { total: number; count: number }>();
  const allFares: number[] = [];

  for (const route of DEMO_ROUTES) {
    for (const point of route.fare_history) {
      allFares.push(point.avg_fare_usd);
      const existing = monthAgg.get(point.month) ?? { total: 0, count: 0 };
      existing.total += point.avg_fare_usd;
      existing.count += 1;
      monthAgg.set(point.month, existing);
    }
  }

  const baseline = allFares.reduce((acc, v) => acc + v, 0) / allFares.length;

  const rows = Array.from(monthAgg.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([month, agg]) => {
      const avg = agg.total / agg.count;
      const index = avg / baseline;
      return {
        month,
        average_fare_usd: Number(avg.toFixed(2)),
        seasonal_index: Number(index.toFixed(3)),
      };
    });

  return NextResponse.json({
    baseline_average_fare_usd: Number(baseline.toFixed(2)),
    rows,
    metadata: await demoMetadata("Seasonality index is route-relative, derived from demo fare histories."),
  });
}
