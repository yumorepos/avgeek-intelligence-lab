export type DemoRouteRecord = {
  origin: string;
  destination: string;
  destination_airport_name: string;
  destination_city: string;
  destination_state: string;
  score: number;
  deal_signal: "strong_deal" | "deal" | "neutral" | "expensive";
  latest_fare: number;
  ontime_rate: number;
  cancellation_rate: number;
  confidence: "high" | "medium" | "low";
  dominant_carrier: string;
  fare_history: Array<{ year: number; month: number; avg_fare_usd: number }>;
};

export const DEMO_ROUTES: DemoRouteRecord[] = [
  {
    origin: "JFK",
    destination: "LAX",
    destination_airport_name: "Los Angeles Intl",
    destination_city: "Los Angeles",
    destination_state: "CA",
    score: 78,
    deal_signal: "deal",
    latest_fare: 310,
    ontime_rate: 0.87,
    cancellation_rate: 0.02,
    confidence: "high",
    dominant_carrier: "AA",
    fare_history: [
      { year: 2025, month: 9, avg_fare_usd: 338 },
      { year: 2025, month: 10, avg_fare_usd: 325 },
      { year: 2025, month: 11, avg_fare_usd: 311 },
      { year: 2025, month: 12, avg_fare_usd: 349 },
      { year: 2026, month: 1, avg_fare_usd: 310 },
    ],
  },
  {
    origin: "JFK",
    destination: "SFO",
    destination_airport_name: "San Francisco Intl",
    destination_city: "San Francisco",
    destination_state: "CA",
    score: 75,
    deal_signal: "strong_deal",
    latest_fare: 295,
    ontime_rate: 0.89,
    cancellation_rate: 0.01,
    confidence: "high",
    dominant_carrier: "DL",
    fare_history: [
      { year: 2025, month: 9, avg_fare_usd: 324 },
      { year: 2025, month: 10, avg_fare_usd: 316 },
      { year: 2025, month: 11, avg_fare_usd: 301 },
      { year: 2025, month: 12, avg_fare_usd: 337 },
      { year: 2026, month: 1, avg_fare_usd: 295 },
    ],
  },
  {
    origin: "JFK",
    destination: "MIA",
    destination_airport_name: "Miami Intl",
    destination_city: "Miami",
    destination_state: "FL",
    score: 82,
    deal_signal: "deal",
    latest_fare: 198,
    ontime_rate: 0.91,
    cancellation_rate: 0.01,
    confidence: "high",
    dominant_carrier: "B6",
    fare_history: [
      { year: 2025, month: 9, avg_fare_usd: 222 },
      { year: 2025, month: 10, avg_fare_usd: 218 },
      { year: 2025, month: 11, avg_fare_usd: 207 },
      { year: 2025, month: 12, avg_fare_usd: 238 },
      { year: 2026, month: 1, avg_fare_usd: 198 },
    ],
  },
  {
    origin: "LAX",
    destination: "JFK",
    destination_airport_name: "John F Kennedy Intl",
    destination_city: "New York",
    destination_state: "NY",
    score: 76,
    deal_signal: "neutral",
    latest_fare: 315,
    ontime_rate: 0.86,
    cancellation_rate: 0.02,
    confidence: "medium",
    dominant_carrier: "UA",
    fare_history: [
      { year: 2025, month: 9, avg_fare_usd: 330 },
      { year: 2025, month: 10, avg_fare_usd: 324 },
      { year: 2025, month: 11, avg_fare_usd: 320 },
      { year: 2025, month: 12, avg_fare_usd: 341 },
      { year: 2026, month: 1, avg_fare_usd: 315 },
    ],
  },
  {
    origin: "LAX",
    destination: "SEA",
    destination_airport_name: "Seattle Tacoma Intl",
    destination_city: "Seattle",
    destination_state: "WA",
    score: 85,
    deal_signal: "strong_deal",
    latest_fare: 142,
    ontime_rate: 0.92,
    cancellation_rate: 0.01,
    confidence: "high",
    dominant_carrier: "AS",
    fare_history: [
      { year: 2025, month: 9, avg_fare_usd: 166 },
      { year: 2025, month: 10, avg_fare_usd: 158 },
      { year: 2025, month: 11, avg_fare_usd: 153 },
      { year: 2025, month: 12, avg_fare_usd: 176 },
      { year: 2026, month: 1, avg_fare_usd: 142 },
    ],
  },
];

export const DEMO_AIRPORTS = [
  { iata: "JFK", airport_name: "John F Kennedy Intl", city: "New York", state: "NY", country: "USA", enplanements: 31200000, lat: 40.6413, lon: -73.7781 },
  { iata: "LAX", airport_name: "Los Angeles Intl", city: "Los Angeles", state: "CA", country: "USA", enplanements: 35900000, lat: 33.9416, lon: -118.4085 },
  { iata: "ORD", airport_name: "Chicago O'Hare Intl", city: "Chicago", state: "IL", country: "USA", enplanements: 33500000, lat: 41.9742, lon: -87.9073 },
  { iata: "DFW", airport_name: "Dallas Fort Worth Intl", city: "Dallas", state: "TX", country: "USA", enplanements: 40700000, lat: 32.8998, lon: -97.0403 },
  { iata: "ATL", airport_name: "Hartsfield Jackson Atlanta Intl", city: "Atlanta", state: "GA", country: "USA", enplanements: 47400000, lat: 33.6407, lon: -84.4277 },
  { iata: "SFO", airport_name: "San Francisco Intl", city: "San Francisco", state: "CA", country: "USA", enplanements: 25800000, lat: 37.6213, lon: -122.379 },
  { iata: "MIA", airport_name: "Miami Intl", city: "Miami", state: "FL", country: "USA", enplanements: 21400000, lat: 25.7959, lon: -80.2871 },
  { iata: "SEA", airport_name: "Seattle Tacoma Intl", city: "Seattle", state: "WA", country: "USA", enplanements: 23200000, lat: 47.4502, lon: -122.3088 },
];

export const DEMO_AIRLINES = [
  { carrier_code: "AA", airline_name: "American Airlines" },
  { carrier_code: "DL", airline_name: "Delta Air Lines" },
  { carrier_code: "UA", airline_name: "United Airlines" },
  { carrier_code: "B6", airline_name: "JetBlue Airways" },
  { carrier_code: "AS", airline_name: "Alaska Airlines" },
];

export function findAirport(iata: string) {
  return DEMO_AIRPORTS.find((a) => a.iata === iata.toUpperCase()) ?? null;
}

export function routesFrom(origin: string) {
  return DEMO_ROUTES.filter((r) => r.origin === origin.toUpperCase());
}

export function findRoute(origin: string, destination: string) {
  return DEMO_ROUTES.find((r) => r.origin === origin.toUpperCase() && r.destination === destination.toUpperCase()) ?? null;
}
