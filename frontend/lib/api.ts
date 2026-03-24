export type DataProvenance = {
  data_source: string;
  is_fallback: boolean;
  data_complete: boolean;
  note: string | null;
  last_refreshed_at: string | null;
};

export type Airport = {
  iata: string;
  airport_name: string;
  city: string | null;
  state: string | null;
  country: string;
};

export type AirportSearchResponse = {
  query: string;
  results: Airport[];
  metadata: DataProvenance;
};

export type RouteExploreCard = {
  destination: Airport;
  latest_route_attractiveness_score: number | null;
  latest_deal_signal: string | null;
  headline_fare_insight: string | null;
  reliability_summary: {
    avg_ontime_rate: number | null;
    avg_cancellation_rate: number | null;
  };
  score_confidence: string | null;
};

export type RouteExploreResponse = {
  origin: string;
  routes: RouteExploreCard[];
  metadata: DataProvenance;
};

export type RouteDetailResponse = {
  route_summary: {
    origin: Airport;
    destination: Airport;
  };
  monthly_fare_trend: {
    year: number;
    month: number;
    avg_fare_usd: number;
  }[];
  reliability_trend: {
    year: number;
    month: number;
    ontime_rate: number | null;
    cancellation_rate: number | null;
  }[];
  latest_score_breakdown: {
    year: number;
    month: number;
    reliability_score: number | null;
    fare_volatility: number | null;
    route_attractiveness_score: number | null;
    deal_signal: string;
  } | null;
  cheapest_month: {
    year: number;
    month: number;
    avg_fare_usd: number;
  } | null;
  methodology_hint: string;
  metadata: DataProvenance;
};

export type AirportContextResponse = {
  airport: Airport;
  latest_enplanement: {
    year: number;
    total_enplanements: number;
  } | null;
  related_routes: {
    destination_iata: string;
    destination_city: string | null;
    destination_airport_name: string;
    latest_route_attractiveness_score: number | null;
    latest_deal_signal: string | null;
  }[];
  metadata: DataProvenance;
};


export type AirlineOverviewResponse = {
  airlines: {
    carrier_code: string;
    airline_name: string;
    route_count: number;
    avg_route_score: number;
    avg_ontime_rate: number;
  }[];
  metadata: DataProvenance;
};

export type AirlineDetailResponse = {
  carrier_code: string;
  airline_name: string;
  routes: {
    origin: string;
    destination: string;
    route_score: number;
    latest_fare: number;
    latest_deal_signal: string;
  }[];
  monthly_trend: {
    year: number;
    month: number;
    avg_fare_usd: number;
    avg_ontime_rate: number;
  }[];
  metadata: DataProvenance;
};

export type NetworkHubResponse = {
  hubs: {
    origin: string;
    destinations: string[];
    route_count: number;
  }[];
  metadata: DataProvenance;
};

export type NetworkGeoResponse = {
  airports: {
    iata: string;
    airport_name: string;
    lat: number;
    lon: number;
  }[];
  routes: {
    origin: string;
    destination: string;
    dominant_carrier: string;
    score: number;
  }[];
  metadata: DataProvenance;
};

export type SeasonalityResponse = {
  baseline_average_fare_usd: number;
  rows: {
    month: number;
    average_fare_usd: number;
    seasonal_index: number;
  }[];
  metadata: DataProvenance;
};

export type MethodologyResponse = {
  score_version: string;
  metric_descriptions: Record<string, string>;
  caveats: string[];
  source_coverage_notes: string[];
  metadata?: DataProvenance;
};

export type RouteChangesResponse = {
  filters: Record<string, string | number | null>;
  events: {
    route_key: string;
    origin_iata: string;
    destination_iata: string;
    year: number;
    month: number;
    change_type: "launch" | "cut" | "resume" | "frequency_change" | string;
    previous_frequency: number | null;
    current_frequency: number | null;
    frequency_delta: number | null;
    dominant_carrier: string | null;
    confidence: "low" | "medium" | "high" | string;
    significance: "low" | "moderate" | "high" | string;
  }[];
  metadata: DataProvenance;
  intelligence_meta: {
    methodology_version: string;
    coverage_summary: string;
  };
};

export type AirportRoleResponse = {
  airport: Airport;
  metrics: {
    iata: string;
    year: number;
    month: number;
    outbound_routes: number;
    destination_diversity_index: number;
    carrier_concentration_hhi: number;
    dominant_carrier_share: number;
    role_label: string;
  } | null;
  metadata: DataProvenance;
  intelligence_meta: {
    methodology_version: string;
    coverage_summary: string;
  };
};

export type AirportPeersResponse = {
  airport: Airport;
  peers: {
    iata: string;
    outbound_routes: number | null;
    destination_diversity_index: number | null;
    dominant_carrier_share: number | null;
    role_label: string | null;
  }[];
  comparison_basis: string;
  metadata: DataProvenance;
  intelligence_meta: {
    methodology_version: string;
    coverage_summary: string;
  };
};

export type RouteCompetitionResponse = {
  filters: Record<string, string | number | null>;
  rows: {
    route_key: string;
    origin_iata: string;
    destination_iata: string;
    year: number;
    month: number;
    active_carriers: number;
    dominant_carrier_share: number;
    carrier_concentration_hhi: number;
    entrant_count: number;
    exit_count: number;
    entrant_pressure_signal: string;
    competition_label: string;
    confidence: string;
    flights_observed: number;
  }[];
  metadata: DataProvenance;
  intelligence_meta: {
    methodology_version: string;
    coverage_summary: string;
  };
};

export type AirportCompetitionResponse = {
  airport: Airport;
  metrics: {
    iata: string;
    year: number;
    month: number;
    active_outbound_routes: number;
    active_carriers: number;
    dominant_carrier_share: number;
    carrier_concentration_hhi: number;
    contested_route_count: number;
    monopoly_route_count: number;
    contested_route_share: number;
    competition_label: string;
    confidence: string;
    flights_observed: number;
  } | null;
  metadata: DataProvenance;
  intelligence_meta: {
    methodology_version: string;
    coverage_summary: string;
  };
};

export type RouteInsightsResponse = {
  filters: Record<string, string | number | null>;
  insights: {
    route_key: string;
    origin_iata: string;
    destination_iata: string;
    year: number;
    month: number;
    insight_label: string;
    explanation: string;
    confidence: string;
    prior_period_year: number | null;
    prior_period_month: number | null;
    trigger_deltas: Record<string, string | number>;
    metrics_snapshot: { values: Record<string, string | number | null> };
    methodology_version: string;
  }[];
  generated_count: number;
  suppressed_low_confidence_count: number;
  confidence_distribution: Record<string, number>;
  metadata: DataProvenance;
  intelligence_meta: {
    methodology_version: string;
    coverage_summary: string;
  };
};

export type AirportInsightsResponse = {
  airport: Airport;
  insights: {
    iata: string;
    year: number;
    month: number;
    insight_label: string;
    explanation: string;
    confidence: string;
    prior_period_year: number | null;
    prior_period_month: number | null;
    trigger_deltas: Record<string, string | number>;
    metrics_snapshot: { values: Record<string, string | number | null> };
    methodology_version: string;
  }[];
  generated_count: number;
  suppressed_low_confidence_count: number;
  confidence_distribution: Record<string, number>;
  metadata: DataProvenance;
  intelligence_meta: {
    methodology_version: string;
    coverage_summary: string;
  };
};

export type InsightQualityResponse = {
  methodology_version: string;
  thresholds: Record<string, number>;
  total_insights_generated: number;
  suppressed_low_confidence_count: number;
  suppressed_rate_pct: number;
  label_distribution: Record<string, number>;
  confidence_distribution: Record<string, number>;
  data_coverage_stats: Record<string, number>;
};

export type RouteInsightTimelineResponse = {
  route_key: string;
  points: {
    year: number;
    month: number;
    carrier_concentration_hhi: number;
    active_carriers: number;
    dominant_carrier_share: number;
    entrant_count: number;
    exit_count: number;
    inferred_label: string | null;
  }[];
  metadata: DataProvenance;
  intelligence_meta: {
    methodology_version: string;
    coverage_summary: string;
  };
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

function withApiHint(detail: string): string {
  return `${detail} Verify the backend is running and reachable (default: http://localhost:8000).`;
}

async function apiFetch<T>(path: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`);
  } catch {
    throw new Error(withApiHint("Unable to reach the API service."));
  }

  if (!response.ok) {
    const fallbackError = `Request failed (${response.status})`;
    let detail = fallbackError;

    try {
      const body = (await response.json()) as { detail?: string };
      detail = body.detail ?? fallbackError;
    } catch {
      detail = fallbackError;
    }

    throw new Error(withApiHint(detail));
  }

  return (await response.json()) as T;
}

export function searchAirports(query: string): Promise<AirportSearchResponse> {
  return apiFetch(`/airports/search?q=${encodeURIComponent(query)}`);
}

export function exploreRoutes(origin: string): Promise<RouteExploreResponse> {
  return apiFetch(`/routes/explore?origin=${encodeURIComponent(origin)}`);
}

export function getRouteDetail(origin: string, destination: string): Promise<RouteDetailResponse> {
  return apiFetch(`/routes/${encodeURIComponent(origin)}/${encodeURIComponent(destination)}`);
}

export function getAirportContext(iata: string): Promise<AirportContextResponse> {
  return apiFetch(`/airports/${encodeURIComponent(iata)}/context`);
}

export function getMethodology(): Promise<MethodologyResponse> {
  return apiFetch("/meta/methodology");
}


export function getNetworkHubs(): Promise<NetworkHubResponse> {
  return apiFetch("/network/hubs");
}

export function getSeasonalityIndex(): Promise<SeasonalityResponse> {
  return apiFetch("/seasonality/index");
}


export function getAirlineOverview(): Promise<AirlineOverviewResponse> {
  return apiFetch("/airlines/overview");
}

export function getNetworkGeo(): Promise<NetworkGeoResponse> {
  return apiFetch("/network/geo");
}


export function getAirlineDetail(carrier: string): Promise<AirlineDetailResponse> {
  return apiFetch(`/airlines/${encodeURIComponent(carrier)}/detail`);
}

export function getRouteChanges(params: {
  airport_iata?: string;
  carrier_code?: string;
  year?: number;
  month?: number;
  change_type?: string;
  limit?: number;
}): Promise<RouteChangesResponse> {
  const q = new URLSearchParams();
  if (params.airport_iata) q.set("airport_iata", params.airport_iata);
  if (params.carrier_code) q.set("carrier_code", params.carrier_code);
  if (params.year) q.set("year", String(params.year));
  if (params.month) q.set("month", String(params.month));
  if (params.change_type) q.set("change_type", params.change_type);
  if (params.limit) q.set("limit", String(params.limit));
  return apiFetch(`/intelligence/routes/changes?${q.toString()}`);
}

export function getAirportRole(iata: string): Promise<AirportRoleResponse> {
  return apiFetch(`/intelligence/airports/${encodeURIComponent(iata)}/role`);
}

export function getAirportPeers(iata: string, limit = 5): Promise<AirportPeersResponse> {
  return apiFetch(`/intelligence/airports/${encodeURIComponent(iata)}/peers?limit=${limit}`);
}

export function getRouteCompetition(params: {
  origin_iata?: string;
  destination_iata?: string;
  airport_iata?: string;
  year?: number;
  month?: number;
  limit?: number;
}): Promise<RouteCompetitionResponse> {
  const q = new URLSearchParams();
  if (params.origin_iata) q.set("origin_iata", params.origin_iata);
  if (params.destination_iata) q.set("destination_iata", params.destination_iata);
  if (params.airport_iata) q.set("airport_iata", params.airport_iata);
  if (params.year) q.set("year", String(params.year));
  if (params.month) q.set("month", String(params.month));
  if (params.limit) q.set("limit", String(params.limit));
  return apiFetch(`/intelligence/routes/competition?${q.toString()}`);
}

export function getAirportCompetition(iata: string): Promise<AirportCompetitionResponse> {
  return apiFetch(`/intelligence/airports/${encodeURIComponent(iata)}/competition`);
}

export function getRouteInsights(params: {
  airport_iata?: string;
  origin_iata?: string;
  destination_iata?: string;
  limit?: number;
}): Promise<RouteInsightsResponse> {
  const q = new URLSearchParams();
  if (params.airport_iata) q.set("airport_iata", params.airport_iata);
  if (params.origin_iata) q.set("origin_iata", params.origin_iata);
  if (params.destination_iata) q.set("destination_iata", params.destination_iata);
  if (params.limit) q.set("limit", String(params.limit));
  return apiFetch(`/intelligence/routes/insights?${q.toString()}`);
}

export function getAirportInsights(iata: string): Promise<AirportInsightsResponse> {
  return apiFetch(`/intelligence/airports/${encodeURIComponent(iata)}/insights`);
}

export function getInsightQuality(): Promise<InsightQualityResponse> {
  return apiFetch("/meta/insight-quality");
}

export function getRouteInsightTimeline(origin: string, destination: string, periods = 12): Promise<RouteInsightTimelineResponse> {
  return apiFetch(
    `/intelligence/routes/${encodeURIComponent(origin)}/${encodeURIComponent(destination)}/insight-timeline?periods=${periods}`,
  );
}
