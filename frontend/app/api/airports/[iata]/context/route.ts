import { NextRequest, NextResponse } from "next/server";

const CONTEXT: Record<string, { airport_name: string; city: string; state: string; enplanements: number; routes: string[] }> = {
  JFK: { airport_name: "John F Kennedy Intl", city: "New York", state: "NY", enplanements: 31200000, routes: ["LAX", "SFO", "MIA", "ATL"] },
  LAX: { airport_name: "Los Angeles Intl", city: "Los Angeles", state: "CA", enplanements: 35900000, routes: ["JFK", "SEA", "ORD", "DFW"] },
  ATL: { airport_name: "Hartsfield Jackson Atlanta Intl", city: "Atlanta", state: "GA", enplanements: 47400000, routes: ["LGA", "MCO", "DFW", "BOS"] },
  DFW: { airport_name: "Dallas Fort Worth Intl", city: "Dallas", state: "TX", enplanements: 40700000, routes: ["LAX", "DEN", "PHX", "ORD"] },
  SFO: { airport_name: "San Francisco Intl", city: "San Francisco", state: "CA", enplanements: 25800000, routes: ["JFK", "SEA", "SAN", "LAS"] },
};

export async function GET(_request: NextRequest, { params }: { params: { iata: string } }) {
  const iata = params.iata.toUpperCase();
  const c = CONTEXT[iata];

  if (!c) {
    return NextResponse.json({ detail: "Airport not found in mock demo data." }, { status: 404 });
  }

  return NextResponse.json({
    airport: {
      iata,
      airport_name: c.airport_name,
      city: c.city,
      state: c.state,
      country: "US",
    },
    latest_enplanement: {
      year: 2024,
      total_enplanements: c.enplanements,
    },
    related_routes: c.routes.map((dest, idx) => ({
      destination_iata: dest,
      destination_city: null,
      destination_airport_name: `${dest} Airport`,
      latest_route_attractiveness_score: 70 + idx * 3,
      latest_deal_signal: idx % 2 === 0 ? "deal" : "neutral",
    })),
    metadata: {
      data_source: "mock_demo_data",
      is_fallback: true,
      data_complete: false,
      note: "Mock airport context for demo parity. Replace with backend for full real coverage.",
    },
  });
}
