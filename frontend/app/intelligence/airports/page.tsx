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
  RouteInsightTimelineResponse,
  getAirportCompetition,
  getAirportRole,
  getRouteChanges,
  getRouteCompetition,
  getRouteDetail,
  getRouteInsightTimeline,
} from "@/lib/api";
import { resolveIntelligenceAirportDefaults } from "@/lib/airport-defaults";
import { formatCurrency, formatMonth, formatPercent, formatSystemLabel } from "@/lib/format";

function classifyCompetition(dominantShare: number | null | undefined): string {
  if (dominantShare === null || dominantShare === undefined) return "Not enough data";
  if (dominantShare >= 0.65) return "Dominated by one airline";
  if (dominantShare <= 0.4) return "Highly competitive";
  return "Balanced competition";
}

export default function AirportInsightsPage() {
  const [iata, setIata] = useState("");
  const [role, setRole] = useState<AirportRoleResponse | null>(null);
  const [competition, setCompetition] = useState<AirportCompetitionResponse | null>(null);
  const [routeCompetition, setRouteCompetition] = useState<RouteCompetitionResponse | null>(null);
  const [routeChanges, setRouteChanges] = useState<RouteChangesResponse | null>(null);
  const [routeDetails, setRouteDetails] = useState<RouteDetailResponse[]>([]);
  const [competitionTimeline, setCompetitionTimeline] = useState<RouteInsightTimelineResponse | null>(null);
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
          getRouteCompetition({ airport_iata: iata, limit: 120 }),
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

          const busiest = topRoutes[0];
          const timeline = await getRouteInsightTimeline(busiest.origin_iata, busiest.destination_iata, 12).catch(() => null);
          setCompetitionTimeline(timeline);
        } else {
          setRouteDetails([]);
          setCompetitionTimeline(null);
        }
      } catch (e) {
        setRole(null);
        setCompetition(null);
        setRouteCompetition(null);
        setRouteChanges(null);
        setRouteDetails([]);
        setCompetitionTimeline(null);
        setError(e instanceof Error ? e.message : "Failed to load airport intelligence.");
      }
    };

    void load();
  }, [bootstrapComplete, iata]);

  const routeRows = useMemo(() => routeCompetition?.rows ?? [], [routeCompetition]);

  const latestMonthLabel = useMemo(() => {
    const latest = routeRows[0];
    if (!latest) return "latest available data";
    return formatMonth(latest.year, latest.month);
  }, [routeRows]);

  const dominantAirline = useMemo(() => {
    if (!routeChanges?.events?.length) return null;
    const counts = new Map<string, number>();
    routeChanges.events.forEach((event) => {
      if (!event.dominant_carrier) return;
      counts.set(event.dominant_carrier, (counts.get(event.dominant_carrier) ?? 0) + 1);
    });
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;
    return { carrier: sorted[0][0], signalShare: sorted[0][1] / routeChanges.events.length };
  }, [routeChanges]);

  const activitySummary = useMemo(() => {
    if (!routeRows.length) return null;
    const sortedByMonth = [...routeRows].sort((a, b) => (a.year === b.year ? b.month - a.month : b.year - a.year));
    const latest = sortedByMonth[0];
    const previous = sortedByMonth.find((row) => row.year < latest.year || row.month < latest.month);
    const flightsDeltaPct =
      previous && previous.flights_observed > 0
        ? ((latest.flights_observed - previous.flights_observed) / previous.flights_observed) * 100
        : null;

    return {
      latestFlights: latest.flights_observed,
      flightsDeltaPct,
      latestRoutes: competition?.metrics?.active_outbound_routes ?? role?.metrics?.outbound_routes ?? null,
      activeCarriers: competition?.metrics?.active_carriers ?? null,
      latestPeriod: formatMonth(latest.year, latest.month),
    };
  }, [routeRows, competition, role]);

  const topRoutes = useMemo(() => {
    if (!routeRows.length) return { busiest: null, mostCompetitive: null, mostConcentrated: null };
    return {
      busiest: [...routeRows].sort((a, b) => b.flights_observed - a.flights_observed)[0],
      mostCompetitive: [...routeRows].sort((a, b) => a.carrier_concentration_hhi - b.carrier_concentration_hhi)[0],
      mostConcentrated: [...routeRows].sort((a, b) => b.carrier_concentration_hhi - a.carrier_concentration_hhi)[0],
    };
  }, [routeRows]);

  const highFareRoute = useMemo(() => {
    if (!routeDetails.length) return null;

    const routesWithFare = routeDetails
      .map((detail) => {
        const latestFare = detail.monthly_fare_trend[detail.monthly_fare_trend.length - 1];
        return latestFare
          ? {
              routeKey: `${detail.route_summary.origin.iata}-${detail.route_summary.destination.iata}`,
              avgFare: latestFare.avg_fare_usd,
            }
          : null;
      })
      .filter((row): row is { routeKey: string; avgFare: number } => row !== null);

    if (!routesWithFare.length) return null;
    return routesWithFare.sort((a, b) => b.avgFare - a.avgFare)[0];
  }, [routeDetails]);

  const fareTrendPoints = useMemo(() => {
    if (!routeDetails.length) return [];
    const fareByPeriod = new Map<string, { total: number; count: number; year: number; month: number }>();

    routeDetails.forEach((detail) => {
      detail.monthly_fare_trend.forEach((point) => {
        const key = `${point.year}-${point.month}`;
        const existing = fareByPeriod.get(key) ?? { total: 0, count: 0, year: point.year, month: point.month };
        existing.total += point.avg_fare_usd;
        existing.count += 1;
        fareByPeriod.set(key, existing);
      });
    });

    return [...fareByPeriod.values()]
      .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year))
      .map((point) => ({
        label: formatMonth(point.year, point.month),
        value: point.count > 0 ? point.total / point.count : null,
      }));
  }, [routeDetails]);

  const reliabilityTrendPoints = useMemo(() => {
    if (!routeDetails.length) return [];
    const reliabilityByPeriod = new Map<string, { total: number; count: number; year: number; month: number }>();

    routeDetails.forEach((detail) => {
      detail.reliability_trend.forEach((point) => {
        if (point.ontime_rate === null) return;
        const key = `${point.year}-${point.month}`;
        const existing = reliabilityByPeriod.get(key) ?? { total: 0, count: 0, year: point.year, month: point.month };
        existing.total += point.ontime_rate;
        existing.count += 1;
        reliabilityByPeriod.set(key, existing);
      });
    });

    return [...reliabilityByPeriod.values()]
      .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year))
      .map((point) => ({
        label: formatMonth(point.year, point.month),
        value: point.count > 0 ? point.total / point.count : null,
      }));
  }, [routeDetails]);

  const routeCompetitionTrend = useMemo(() => {
    if (!competitionTimeline?.points?.length) return [];
    return competitionTimeline.points.map((point) => ({
      label: formatMonth(point.year, point.month),
      value: point.dominant_carrier_share,
    }));
  }, [competitionTimeline]);

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Airport intelligence</p>
        <h1>Airport insight engine</h1>
        <p>
          Understand airport importance, demand pressure, airline control, and which routes matter most in one scan.
        </p>
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
            <h2>Key stats</h2>
            <div className="stats-grid">
              <article className="stat-card">
                <p className="stat-label">Total flights observed</p>
                <p className="stat-value">{competition?.metrics?.flights_observed ?? "N/A"}</p>
                <p className="stat-detail">{latestMonthLabel}</p>
              </article>
              <article className="stat-card">
                <p className="stat-label">Active routes</p>
                <p className="stat-value">{competition?.metrics?.active_outbound_routes ?? role?.metrics?.outbound_routes ?? "N/A"}</p>
              </article>
              <article className="stat-card">
                <p className="stat-label">Airlines serving airport</p>
                <p className="stat-value">{competition?.metrics?.active_carriers ?? "N/A"}</p>
              </article>
              <article className="stat-card">
                <p className="stat-label">Dominant airline</p>
                <p className="stat-value">{dominantAirline?.carrier ?? "Unknown"}</p>
                <p className="stat-detail">Signal share {formatPercent(dominantAirline?.signalShare)}</p>
              </article>
              <article className="stat-card">
                <p className="stat-label">Average fare (top routes)</p>
                <p className="stat-value">{fareTrendPoints.length ? formatCurrency(fareTrendPoints[fareTrendPoints.length - 1].value) : "N/A"}</p>
              </article>
            </div>
          </section>

          <section className="panel">
            <h2>Why this airport matters</h2>
            <p>
              {iata} is currently <strong>{classifyCompetition(competition?.metrics?.dominant_carrier_share)}</strong>.
              {" "}
              {competition?.metrics?.dominant_carrier_share !== undefined
                ? `The leading carrier controls ${formatPercent(competition?.metrics?.dominant_carrier_share)} of observed outbound traffic.`
                : "Dominance share is unavailable in this slice."}
            </p>
            <p className="mt-2">
              This airport shows <strong>{competition?.metrics?.active_carriers ?? 0} active airlines</strong> across
              {" "}
              <strong>{competition?.metrics?.active_outbound_routes ?? role?.metrics?.outbound_routes ?? 0} routes</strong>,
              making it a {formatSystemLabel(role?.metrics?.role_label)} node in the current network snapshot.
            </p>
          </section>

          {activitySummary ? (
            <section className="panel">
              <h2>Traffic & activity</h2>
              <div className="stats-grid">
                <article className="stat-card">
                  <p className="stat-label">Flights observed</p>
                  <p className="stat-value">{activitySummary.latestFlights}</p>
                  <p className="stat-detail">{activitySummary.latestPeriod}</p>
                </article>
                <article className="stat-card">
                  <p className="stat-label">Trend vs previous month</p>
                  <p className="stat-value">
                    {activitySummary.flightsDeltaPct === null ? "N/A" : `${activitySummary.flightsDeltaPct >= 0 ? "+" : ""}${activitySummary.flightsDeltaPct.toFixed(1)}%`}
                  </p>
                </article>
                <article className="stat-card">
                  <p className="stat-label">Active routes</p>
                  <p className="stat-value">{activitySummary.latestRoutes ?? "N/A"}</p>
                </article>
                <article className="stat-card">
                  <p className="stat-label">Active airlines</p>
                  <p className="stat-value">{activitySummary.activeCarriers ?? "N/A"}</p>
                </article>
              </div>
            </section>
          ) : null}

          <section className="panel">
            <h2>Top routes that matter</h2>
            <div className="route-grid mt-4">
              <article className="route-card">
                <h3>Busiest route</h3>
                <p className="font-semibold">{topRoutes.busiest?.route_key ?? "N/A"}</p>
                <p>{topRoutes.busiest ? `${topRoutes.busiest.flights_observed} flights observed` : "No route data available."}</p>
              </article>
              <article className="route-card">
                <h3>Most competitive route</h3>
                <p className="font-semibold">{topRoutes.mostCompetitive?.route_key ?? "N/A"}</p>
                <p>{topRoutes.mostCompetitive ? `${topRoutes.mostCompetitive.active_carriers} active carriers` : "No route data available."}</p>
              </article>
              <article className="route-card">
                <h3>Most expensive tracked route</h3>
                <p className="font-semibold">{highFareRoute?.routeKey ?? "N/A"}</p>
                <p>{highFareRoute ? formatCurrency(highFareRoute.avgFare) : "Insufficient fare history."}</p>
              </article>
            </div>
          </section>

          <section className="panel">
            <h2>Airlines at this airport</h2>
            <p>
              {classifyCompetition(competition?.metrics?.dominant_carrier_share)} • dominant share
              {" "}
              {formatPercent(competition?.metrics?.dominant_carrier_share)}.
            </p>
            <div className="route-grid mt-4">
              {(routeChanges?.events ?? [])
                .filter((event) => !!event.dominant_carrier)
                .slice(0, 6)
                .map((event, idx) => (
                  <article className="route-card" key={`${event.route_key}-${event.month}-${idx}`}>
                    <h3>{event.dominant_carrier}</h3>
                    <p>{event.route_key}</p>
                    <p className="muted">Latest signal: {formatSystemLabel(event.change_type)}</p>
                  </article>
                ))}
            </div>
          </section>

          <section className="panel">
            <h2>Trend charts</h2>
            <p className="muted">Simplified to high-signal trends only.</p>
            <div className="grid lg:grid-cols-2 gap-4 mt-4">
              <EnhancedLineChart
                title="Fare trend (top routes basket)"
                points={fareTrendPoints}
                valueFormatter={(value) => formatCurrency(value)}
                color="#2563eb"
              />
              <EnhancedLineChart
                title="Reliability trend (on-time rate)"
                points={reliabilityTrendPoints}
                valueFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                color="#16a34a"
              />
            </div>
            {routeCompetitionTrend.length > 1 ? (
              <div className="mt-4">
                <EnhancedLineChart
                  title="Route competition over time (busiest route dominance share)"
                  points={routeCompetitionTrend}
                  valueFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                  color="#7c3aed"
                />
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </main>
  );
}
