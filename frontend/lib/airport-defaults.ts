import { getSupportedIntelligenceAirports, searchAirports } from "@/lib/api";

const FALLBACK_AIRPORTS = ["JFK", "LAX", "DFW", "SFO", "ATL"];

export async function resolveAirportDefaults(
  limit = 5,
): Promise<{ defaultAirport: string; airports: string[] }> {
  try {
    const response = await searchAirports("");
    const discovered = response.results.map((airport) => airport.iata.toUpperCase());
    const unique = Array.from(new Set(discovered));

    if (unique.length > 0) {
      const safeDefault = FALLBACK_AIRPORTS.find((iata) => unique.includes(iata)) ?? unique[0];

      const ordered = [safeDefault, ...unique.filter((iata) => iata !== safeDefault)];
      return {
        defaultAirport: safeDefault,
        airports: ordered.slice(0, limit),
      };
    }
  } catch {
    // Keep deterministic fallback defaults when search endpoint is unavailable.
  }

  return {
    defaultAirport: FALLBACK_AIRPORTS[0],
    airports: FALLBACK_AIRPORTS.slice(0, limit),
  };
}

export async function resolveIntelligenceAirportDefaults(limit = 5): Promise<{
  defaultAirport: string | null;
  airports: string[];
  isReady: boolean;
  reason: string | null;
}> {
  try {
    const response = await getSupportedIntelligenceAirports();
    const airports = response.airports.map((airport) => airport.iata.toUpperCase());
    const unique = Array.from(new Set(airports));
    const defaultAirport = unique.length > 0 ? unique[0] : null;
    return {
      defaultAirport,
      airports: unique.slice(0, limit),
      isReady: response.readiness.is_ready && unique.length > 0,
      reason: response.readiness.reason,
    };
  } catch (error) {
    return {
      defaultAirport: null,
      airports: [],
      isReady: false,
      reason: error instanceof Error ? error.message : "Unable to resolve backend-supported airports.",
    };
  }
}
