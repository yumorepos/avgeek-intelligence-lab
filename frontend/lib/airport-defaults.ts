import { findAvailableAirportRole, searchAirports } from "@/lib/api";

const FALLBACK_AIRPORTS = ["JFK", "LAX", "DFW", "SFO", "ATL"];

export async function resolveAirportDefaults(
  limit = 5,
  options?: { requireIntelligenceAirport?: boolean },
): Promise<{ defaultAirport: string; airports: string[] }> {
  const requireIntelligenceAirport = options?.requireIntelligenceAirport ?? false;

  try {
    const response = await searchAirports("");
    const discovered = response.results.map((airport) => airport.iata.toUpperCase());
    const unique = Array.from(new Set(discovered));

    if (unique.length > 0) {
      let safeDefault = FALLBACK_AIRPORTS.find((iata) => unique.includes(iata)) ?? unique[0];

      if (requireIntelligenceAirport) {
        const intelligenceDefault = await findAvailableAirportRole(unique);
        if (intelligenceDefault) {
          safeDefault = intelligenceDefault;
        }
      }

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
