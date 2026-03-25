"use client";

import { useEffect, useMemo, useState } from "react";

import { EnhancedLineChart } from "@/components/EnhancedLineChart";
import { MetadataNotice } from "@/components/MetadataNotice";
import {
  AirportCompetitionResponse,
  AirportRoleResponse,
  RouteChangesResponse,
  RouteCompetitionResponse,
  RouteDetailResponse,
  getAirportCompetition,
  getAirportRole,
  getRouteChanges,
  getRouteCompetition,
  getRouteDetail,
} from "@/lib/api";
import { resolveIntelligenceAirportDefaults } from "@/lib/airport-defaults";
import { formatCurrency, formatMonth, formatPercent } from "@/lib/format";

type ChartPoint = { label: string; value: number | null };

type CarrierShare = { carrier: string; share: number; routeCount: number };

type RouteMatterCard = {
  title: string;
  routeLabel: string;
  explanation: string;
  metric: string;
};

function toPeriodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function computeImportanceScore(input: {
  flightsObserved: number | null;
  routes: number | null;
  carriers: number | null;
  connectivity: number | null;
}): number {
  const flightsScore = Math.min(100, ((input.flightsObserved ?? 0) / 1500) * 100);
  const routeScore = Math.min(100, ((input.routes ?? 0) / 30) * 100);
  const carrierScore = Math.min(100, ((input.carriers ?? 0) / 12) * 100);
  const connectivityScore = Math.min(100, ((input.connectivity ?? 0) / 1.2) * 100);
  const weighted = flightsScore * 0.4 + routeScore * 0.25 + carrierScore * 0.2 + connectivityScore * 0.15;
  return Math.round(Math.max(0, Math.min(100, weighted)));
}

function classifyAirportScale(score: number): string {
  if (score >= 78) return "Major hub";
  if (score >= 58) return "Large airport";
  if (score >= 34) return "Mid-size airport";
  return "Small airport";
}

function classifyMarket(dominantShare: number | null | undefined): string {
  if (dominantShare === null || dominantShare === undefined) return "Not enough data";
  if (dominantShare >= 0.65) return "Market is dominated by one airline";
  if (dominantShare <= 0.4) return "Market is highly competitive";
  return "Market is moderately competitive";
}

function normalizeMonthlySeries(points: Array<{ year: number; month: number; value: number | null }>): ChartPoint[] {
  const byPeriod = new Map<string, { year: number; month: number; value: number | null }>();
  points.forEach((point) => {
    const key = toPeriodKey(point.year, point.month);
    byPeriod.set(key, point);
  });

  return [...byPeriod.values()]
    .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year))
    .map((point) => ({ label: formatMonth(point.year, point.month), value: point.value }));
}

export default function AirportInsightsPage() {
  const [iata, setIata] = useState("");
  const [role, setRole] = useState<AirportRoleResponse | null>(null);
  const [competition, setCompetition] = useState<AirportCompetitionResponse | null>(null);
  const [routeCompetition, setRouteCompetition] = useState<RouteCompetitionResponse | null>(null);
  const [routeChanges, setRouteChanges] = useState<RouteChangesResponse | null>(null);
  const [routeDetails, setRouteDetails] = useState<RouteDetailResponse[]>([]);
  const [supportedAirports, setSupportedAirports] = useState<string[]>([]);
  const [readinessMessage, setReadinessMessage] = useState<string | null>(null);
  const [bootstrapComplete, setBootstrapComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      const defaults = await resolveIntelligenceAirportDefaults(12);
      setSupportedAirports(defaults.airports);
      setIata(defaults.defaultAirport ?? "");
      setReadinessMessage(defaults.isReady ? null : defaults.reason ?? "Backend intelligence is not data-ready.");
      setBootstrapComplete(true);
    };
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!bootstrapComplete || !iata) return;

    const load = async () => {
      try {
        setError(null);
        const [roleResp, competitionResp, routeCompResp, routeChangeResp] = await Promise.all([
          getAirportRole(iata),
          getAirportCompetition(iata),
          getRouteCompetition({ airport_iata: iata, limit: 200 }),
          getRouteChanges({ airport_iata: iata, limit: 200 }),
        ]);

        setRole(roleResp);
        setCompetition(competitionResp);
        setRouteCompetition(routeCompResp);
        setRouteChanges(routeChangeResp);

        const topRoutes = [...routeCompResp.rows].sort((a, b) => b.flights_observed - a.flights_observed).slice(0, 4);
        if (topRoutes.length > 0) {
          const details = await Promise.all(
            topRoutes.map((row) => getRouteDetail(row.origin_iata, row.destination_iata).catch(() => null)),
          );
          setRouteDetails(details.filter((detail): detail is RouteDetailResponse => detail !== null));
        } else {
          setRouteDetails([]);
        }
      } catch (e) {
        setRole(null);
        setCompetition(null);
        setRouteCompetition(null);
        setRouteChanges(null);
        setRouteDetails([]);
        setError(e instanceof Error ? e.message : "Failed to load airport intelligence.");
      }
    };

    void load();
  }, [bootstrapComplete, iata]);

  const routeRows = useMemo(() => {
    if (!routeCompetition?.rows?.length) return [];
    const latest = [...routeCompetition.rows].sort((a, b) => (a.year === b.year ? b.month - a.month : b.year - a.year))[0];
    return routeCompetition.rows.filter((row) => row.year === latest.year && row.month === latest.month);
  }, [routeCompetition]);

  const latestPeriodLabel = useMemo(() => {
    if (!routeRows.length) return "latest available period";
    return formatMonth(routeRows[0].year, routeRows[0].month);
  }, [routeRows]);

  const airportImportance = useMemo(() => {
    const flightsObserved = competition?.metrics?.flights_observed ?? null;
    const routes = competition?.metrics?.active_outbound_routes ?? role?.metrics?.outbound_routes ?? null;
    const carriers = competition?.metrics?.active_carriers ?? null;
    const connectivity = role?.metrics?.destination_diversity_index ?? null;
    const score = computeImportanceScore({ flightsObserved, routes, carriers, connectivity });
    return {
      label: classifyAirportScale(score),
      flightsObserved,
      routes,
      carriers,
    };
  }, [competition, role]);

  const airportScaleHeadline = useMemo(() => {
    const flights = airportImportance.flightsObserved ?? 0;
    const routes = airportImportance.routes ?? 0;
    const carriers = airportImportance.carriers ?? 0;
    return `${iata} is a ${airportImportance.label.toLowerCase()} handling about ${flights.toLocaleString()} monthly flights across ${routes} routes served by ${carriers} airlines.`;
  }, [airportImportance, iata]);

  const dominantMessage = useMemo(() => {
    const share = competition?.metrics?.dominant_carrier_share;
    if (share === null || share === undefined) return null;

    const latestRouteEvents = (routeChanges?.events ?? [])
      .filter((event) => !!event.dominant_carrier)
      .sort((a, b) => (a.year === b.year ? b.month - a.month : b.year - a.year));
    const period = latestRouteEvents[0] ? toPeriodKey(latestRouteEvents[0].year, latestRouteEvents[0].month) : null;

    const byCarrier = new Map<string, Set<string>>();
    latestRouteEvents
      .filter((event) => (period ? toPeriodKey(event.year, event.month) === period : true))
      .forEach((event) => {
        if (!event.dominant_carrier) return;
        const existing = byCarrier.get(event.dominant_carrier) ?? new Set<string>();
        existing.add(event.route_key);
        byCarrier.set(event.dominant_carrier, existing);
      });

    const routeCount = [...byCarrier.values()].reduce((sum, routes) => sum + routes.size, 0);
    const topCarriers: CarrierShare[] = [...byCarrier.entries()]
      .map(([carrier, routes]) => ({ carrier, routeCount: routes.size, share: routeCount > 0 ? routes.size / routeCount : 0 }))
      .sort((a, b) => b.share - a.share)
      .slice(0, 3);

    return {
      headline: `${classifyMarket(share)}. Leading carrier controls ${formatPercent(share)} of observed outbound traffic.`,
      topCarriers,
      topCarrierSummary:
        topCarriers.length > 0
          ? `${topCarriers[0].carrier} dominates (${formatPercent(share)} share), followed by ${topCarriers
              .slice(1)
              .map((carrier) => carrier.carrier)
              .join(" and ") || "other carriers"}.`
          : `One carrier controls ${formatPercent(share)} of observed outbound traffic.`,
    };
  }, [competition, routeChanges]);

  const topRoutes = useMemo(() => {
    if (!routeRows.length) return [] as RouteMatterCard[];

    const busiest = [...routeRows].sort((a, b) => b.flights_observed - a.flights_observed)[0];
    const mostCompetitive = [...routeRows].sort((a, b) => a.dominant_carrier_share - b.dominant_carrier_share)[0];

    const fares = routeDetails
      .map((detail) => {
        const latestFare = detail.monthly_fare_trend[detail.monthly_fare_trend.length - 1];
        if (!latestFare) return null;
        return {
          routeKey: `${detail.route_summary.origin.iata}-${detail.route_summary.destination.iata}`,
          fare: latestFare.avg_fare_usd,
        };
      })
      .filter((row): row is { routeKey: string; fare: number } => row !== null)
      .sort((a, b) => b.fare - a.fare);

    return [
      {
        title: "Busiest route",
        routeLabel: busiest.route_key.replace("-", "–"),
        metric: `${busiest.flights_observed} flights observed`,
        explanation: "Drives the largest share of airport demand and is the first route to watch for volume shifts.",
      },
      {
        title: "Most competitive route",
        routeLabel: mostCompetitive.route_key.replace("-", "–"),
        metric: `${mostCompetitive.active_carriers} airlines, top share ${formatPercent(mostCompetitive.dominant_carrier_share)}`,
        explanation: "Multiple airlines are competing head-to-head, which puts pressure on pricing power.",
      },
      {
        title: "Highest fare route",
        routeLabel: fares[0]?.routeKey.replace("-", "–") ?? "N/A",
        metric: fares[0] ? formatCurrency(fares[0].fare) : "Insufficient fare history",
        explanation: "This route shows the strongest pricing power and highest fare pressure in the tracked set.",
      },
    ];
  }, [routeRows, routeDetails]);

  const routeChangesSummary = useMemo(() => {
    const events = routeChanges?.events ?? [];
    if (!events.length) return null;

    const latest = [...events].sort((a, b) => (a.year === b.year ? b.month - a.month : b.year - a.year))[0];
    const currentPeriod = events.filter((event) => event.year === latest.year && event.month === latest.month);

    const launched = currentPeriod.filter((event) => event.change_type === "launch").length;
    const cuts = currentPeriod.filter((event) => event.change_type === "cut").length;
    const resumes = currentPeriod.filter((event) => event.change_type === "resume").length;
    const frequencyChanges = currentPeriod
      .filter((event) => event.change_type === "frequency_change" && event.frequency_delta !== null)
      .sort((a, b) => Math.abs(b.frequency_delta ?? 0) - Math.abs(a.frequency_delta ?? 0));

    const majorFrequency = frequencyChanges[0];

    return {
      period: formatMonth(latest.year, latest.month),
      launched,
      cuts,
      resumes,
      majorFrequency,
    };
  }, [routeChanges]);

  const whyThisAirportMatters = useMemo(() => {
    if (!competition?.metrics) return "No high-confidence insight available yet for this airport.";
    const contestedShare = competition.metrics.contested_route_share;
    if (competition.metrics.dominant_carrier_share >= 0.65) {
      return `One airline clearly dominates this airport, controlling ${formatPercent(competition.metrics.dominant_carrier_share)} of outbound traffic.`;
    }
    if (contestedShare >= 0.45) {
      return "This is a highly competitive airport with no single airline in full control of the market.";
    }
    return "This is a key coverage airport with meaningful demand, but competition is still concentrated on several routes.";
  }, [competition]);

  const fareTrend = useMemo(() => {
    const rows: Array<{ year: number; month: number; value: number | null }> = [];
    routeDetails.forEach((detail) => {
      detail.monthly_fare_trend.forEach((point) => {
        rows.push({ year: point.year, month: point.month, value: point.avg_fare_usd });
      });
    });

    const grouped = new Map<string, { year: number; month: number; total: number; count: number }>();
    rows.forEach((row) => {
      if (row.value === null) return;
      const key = toPeriodKey(row.year, row.month);
      const current = grouped.get(key) ?? { year: row.year, month: row.month, total: 0, count: 0 };
      current.total += row.value;
      current.count += 1;
      grouped.set(key, current);
    });

    return normalizeMonthlySeries(
      [...grouped.values()].map((row) => ({ year: row.year, month: row.month, value: row.count > 0 ? row.total / row.count : null })),
    );
  }, [routeDetails]);

  const reliabilityTrend = useMemo(() => {
    const grouped = new Map<string, { year: number; month: number; total: number; count: number }>();

    routeDetails.forEach((detail) => {
      detail.reliability_trend.forEach((point) => {
        if (point.ontime_rate === null) return;
        const key = toPeriodKey(point.year, point.month);
        const current = grouped.get(key) ?? { year: point.year, month: point.month, total: 0, count: 0 };
        current.total += point.ontime_rate;
        current.count += 1;
        grouped.set(key, current);
      });
    });

    return normalizeMonthlySeries(
      [...grouped.values()].map((row) => ({ year: row.year, month: row.month, value: row.count > 0 ? row.total / row.count : null })),
    );
  }, [routeDetails]);

  const fareNarrative = useMemo(() => {
    const valid = fareTrend.filter((point) => point.value !== null) as Array<{ label: string; value: number }>;
    if (valid.length < 2) return "Not enough fare history yet to call a trend.";
    const first = valid[0].value;
    const last = valid[valid.length - 1].value;
    const deltaPct = first > 0 ? ((last - first) / first) * 100 : 0;
    return `Average fares for the airport's highest-traffic routes ${deltaPct >= 0 ? "increased" : "decreased"} ${Math.abs(deltaPct).toFixed(1)}% across the displayed period.`;
  }, [fareTrend]);

  const reliabilityNarrative = useMemo(() => {
    const valid = reliabilityTrend.filter((point) => point.value !== null) as Array<{ label: string; value: number }>;
    if (valid.length < 2) return null;
    const first = valid[0].value;
    const last = valid[valid.length - 1].value;
    const deltaPct = (last - first) * 100;
    return `On-time performance ${deltaPct >= 0 ? "improved" : "declined"} by ${Math.abs(deltaPct).toFixed(1)} percentage points over the same period.`;
  }, [reliabilityTrend]);

  return (
    <main className="page-shell" data-testid="airport-intelligence-page">
      <section className="hero">
        <p className="eyebrow">Airport intelligence</p>
        <h1>Decision-ready airport brief</h1>
        <p>See airport scale, airline dominance, route priorities, and what is changing in one scan.</p>
      </section>

      <section className="panel">
        <h2>Airport</h2>
        <input value={iata} onChange={(e) => setIata(e.target.value.toUpperCase())} className="airport-input mt-3" maxLength={3} />
      </section>

      {bootstrapComplete && supportedAirports.length > 0 ? (
        <section className="panel">
          <h2>Backend-supported airports</h2>
          <div className="flex flex-wrap gap-2 mt-3">
            {supportedAirports.map((airport) => (
              <button
                key={airport}
                type="button"
                className={`airport-button ${iata === airport ? "selected" : ""}`}
                onClick={() => setIata(airport)}
              >
                {airport}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {bootstrapComplete && !iata && readinessMessage ? (
        <section className="panel">
          <h2>Backend not data-ready</h2>
          <p className="status">{readinessMessage}</p>
        </section>
      ) : null}

      {error ? <p className="status error">Airport insight error: {error}</p> : null}
      {role ? <MetadataNotice metadata={role.metadata} /> : null}

      {competition?.metrics || role?.metrics ? (
        <>
          <section className="panel">
            <h2>Airport scale</h2>
            <p>{airportScaleHeadline}</p>
            <p className="mt-2 muted">Snapshot period: {latestPeriodLabel}</p>
          </section>

          <section className="panel">
            <h2>Why this airport matters</h2>
            <p>{whyThisAirportMatters}</p>
          </section>

          <section className="panel">
            <h2>Who dominates this airport</h2>
            <p>{dominantMessage?.topCarrierSummary ?? dominantMessage?.headline ?? "Dominance signal is unavailable in this data slice."}</p>
            {dominantMessage?.topCarriers?.length ? (
              <div className="route-grid mt-4">
                {dominantMessage.topCarriers.map((carrier) => (
                  <article className="route-card" key={carrier.carrier}>
                    <h3>{carrier.carrier}</h3>
                    <p>{formatPercent(carrier.share)} of observed route-dominance signals</p>
                    <p className="muted">{carrier.routeCount} routes with current carrier signal</p>
                  </article>
                ))}
              </div>
            ) : null}
          </section>

          <section className="panel">
            <h2>Top routes that matter</h2>
            <div className="route-grid mt-4">
              {topRoutes.map((route) => (
                <article className="route-card" key={route.title}>
                  <h3>{route.title}</h3>
                  <p className="font-semibold">{route.routeLabel}</p>
                  <p>{route.metric}</p>
                  <p className="muted">{route.explanation}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>What&apos;s changing at this airport</h2>
            {routeChangesSummary ? (
              <>
                <p>
                  In {routeChangesSummary.period}: {routeChangesSummary.launched} new routes launched, {routeChangesSummary.cuts} routes cut,
                  {" "}
                  and {routeChangesSummary.resumes} routes resumed.
                </p>
                {routeChangesSummary.majorFrequency ? (
                  <p className="mt-2">
                    Largest frequency move: <strong>{routeChangesSummary.majorFrequency.route_key}</strong> ({routeChangesSummary.majorFrequency.frequency_delta && routeChangesSummary.majorFrequency.frequency_delta > 0 ? "+" : ""}
                    {routeChangesSummary.majorFrequency.frequency_delta ?? 0} flights vs previous period).
                  </p>
                ) : null}
              </>
            ) : (
              <p>No route change events available for this airport in the loaded slice.</p>
            )}
          </section>

          <section className="panel">
            <h2>Fare trend</h2>
            <p className="mb-3">{fareNarrative}</p>
            <EnhancedLineChart
              title="Average fare on high-traffic routes"
              points={fareTrend}
              valueFormatter={(value) => formatCurrency(value)}
              color="#2563eb"
              xAxisLabel="Month"
              yAxisLabel="Average fare (USD)"
            />
          </section>

          {reliabilityTrend.filter((point) => point.value !== null).length >= 3 && reliabilityNarrative ? (
            <section className="panel">
              <h2>Reliability trend</h2>
              <p className="mb-3">{reliabilityNarrative}</p>
              <EnhancedLineChart
                title="On-time performance on high-traffic routes"
                points={reliabilityTrend}
                valueFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                color="#16a34a"
                xAxisLabel="Month"
                yAxisLabel="On-time rate"
              />
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
