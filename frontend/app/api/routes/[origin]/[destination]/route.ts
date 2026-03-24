import { NextRequest, NextResponse } from "next/server";

function monthlyFare(base: number) {
  return [
    { year: 2025, month: 9, avg_fare_usd: base + 35 },
    { year: 2025, month: 10, avg_fare_usd: base + 20 },
    { year: 2025, month: 11, avg_fare_usd: base + 5 },
    { year: 2025, month: 12, avg_fare_usd: base + 40 },
    { year: 2026, month: 1, avg_fare_usd: base - 10 },
  ];
}

const ROUTE_DETAIL: Record<string, { fareBase: number; score: number; reliability: number; deal: string }> = {
  "JFK-LAX": { fareBase: 290, score: 78, reliability: 0.87, deal: "deal" },
  "JFK-SFO": { fareBase: 275, score: 75, reliability: 0.89, deal: "strong_deal" },
  "JFK-MIA": { fareBase: 190, score: 82, reliability: 0.91, deal: "deal" },
  "LAX-SEA": { fareBase: 140, score: 85, reliability: 0.92, deal: "strong_deal" },
};

export async function GET(_request: NextRequest, { params }: { params: { origin: string; destination: string } }) {
  const origin = params.origin.toUpperCase();
  const destination = params.destination.toUpperCase();
  const key = `${origin}-${destination}`;
  const record = ROUTE_DETAIL[key];

  if (!record) {
    return NextResponse.json({ detail: "Route not found in mock demo data." }, { status: 404 });
  }

  const fares = monthlyFare(record.fareBase);
  const cheapest = fares.reduce((p, c) => (c.avg_fare_usd < p.avg_fare_usd ? c : p), fares[0]);

  return NextResponse.json({
    route_summary: {
      origin: { iata: origin, airport_name: `${origin} Airport`, city: null, state: null, country: "US" },
      destination: { iata: destination, airport_name: `${destination} Airport`, city: null, state: null, country: "US" },
    },
    monthly_fare_trend: fares,
    reliability_trend: fares.map((f) => ({
      year: f.year,
      month: f.month,
      ontime_rate: Number((record.reliability - 0.02 + (f.month % 3) * 0.01).toFixed(3)),
      cancellation_rate: 0.01,
    })),
    latest_score_breakdown: {
      year: 2026,
      month: 1,
      reliability_score: Math.round(record.reliability * 100),
      fare_volatility: 12.8,
      route_attractiveness_score: record.score,
      deal_signal: record.deal,
    },
    cheapest_month: cheapest,
    methodology_hint: "Scores are generated via v1_heuristic methodology; consult /meta/methodology for caveats.",
    metadata: {
      data_source: "mock_demo_data",
      is_fallback: true,
      data_complete: false,
      note: "Mock route detail for demo parity. Replace with backend for full dataset coverage.",
    },
  });
}
