import { NextRequest, NextResponse } from 'next/server';

// Mock routes data
const MOCK_ROUTES: Record<string, any[]> = {
  "JFK": [
    {
      destination: { iata: "LAX", airport_name: "Los Angeles Intl", city: "Los Angeles", state: "CA", country: "USA" },
      latest_route_attractiveness_score: 78,
      latest_deal_signal: "deal",
      headline_fare_insight: "Latest fare: $310, trending -11.4% vs 5-month avg",
      reliability_summary: { avg_ontime_rate: 0.87, avg_cancellation_rate: 0.02 },
      score_confidence: "high"
    },
    {
      destination: { iata: "SFO", airport_name: "San Francisco Intl", city: "San Francisco", state: "CA", country: "USA" },
      latest_route_attractiveness_score: 75,
      latest_deal_signal: "strong_deal",
      headline_fare_insight: "Latest fare: $295, trending -15.2% vs 5-month avg",
      reliability_summary: { avg_ontime_rate: 0.89, avg_cancellation_rate: 0.01 },
      score_confidence: "high"
    },
    {
      destination: { iata: "MIA", airport_name: "Miami Intl", city: "Miami", state: "FL", country: "USA" },
      latest_route_attractiveness_score: 82,
      latest_deal_signal: "deal",
      headline_fare_insight: "Latest fare: $198, trending -8.3% vs 5-month avg",
      reliability_summary: { avg_ontime_rate: 0.91, avg_cancellation_rate: 0.01 },
      score_confidence: "high"
    }
  ],
  "LAX": [
    {
      destination: { iata: "JFK", airport_name: "John F Kennedy Intl", city: "New York", state: "NY", country: "USA" },
      latest_route_attractiveness_score: 76,
      latest_deal_signal: "neutral",
      headline_fare_insight: "Latest fare: $315, trending +2.1% vs 5-month avg",
      reliability_summary: { avg_ontime_rate: 0.86, avg_cancellation_rate: 0.02 },
      score_confidence: "medium"
    },
    {
      destination: { iata: "SEA", airport_name: "Seattle Tacoma Intl", city: "Seattle", state: "WA", country: "USA" },
      latest_route_attractiveness_score: 85,
      latest_deal_signal: "strong_deal",
      headline_fare_insight: "Latest fare: $142, trending -18.5% vs 5-month avg",
      reliability_summary: { avg_ontime_rate: 0.92, avg_cancellation_rate: 0.01 },
      score_confidence: "high"
    }
  ]
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const origin = searchParams.get('origin') || '';

  const routes = MOCK_ROUTES[origin.toUpperCase()] || [];

  return NextResponse.json({
    origin: origin.toUpperCase(),
    routes,
    metadata: {
      data_source: "mock_demo_data",
      is_fallback: true,
      data_complete: false,
      note: "Using mock data for demo. Backend not deployed yet."
    }
  });
}
