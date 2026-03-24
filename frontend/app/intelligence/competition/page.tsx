"use client";

import { useEffect, useMemo, useState } from "react";

import { MetadataNotice } from "@/components/MetadataNotice";
import {
  AirportCompetitionResponse,
  AirportInsightsResponse,
  RouteCompetitionResponse,
  InsightQualityResponse,
  RouteInsightsResponse,
  getAirportCompetition,
  getAirportInsights,
  getRouteCompetition,
  getRouteInsights,
  getInsightQuality,
} from "@/lib/api";
import { formatPercent } from "@/lib/format";

export default function CompetitionIntelPage() {
  const [airport, setAirport] = useState("JFK");
  const [routeData, setRouteData] = useState<RouteCompetitionResponse | null>(null);
  const [airportData, setAirportData] = useState<AirportCompetitionResponse | null>(null);
  const [routeInsights, setRouteInsights] = useState<RouteInsightsResponse | null>(null);
  const [airportInsights, setAirportInsights] = useState<AirportInsightsResponse | null>(null);
  const [quality, setQuality] = useState<InsightQualityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const [routes, airportComp, routeInsightResp, airportInsightResp, qualityResp] = await Promise.all([
          getRouteCompetition({ airport_iata: airport, limit: 25 }),
          getAirportCompetition(airport),
          getRouteInsights({ airport_iata: airport, limit: 10 }),
          getAirportInsights(airport),
          getInsightQuality(),
        ]);
        setRouteData(routes);
        setAirportData(airportComp);
        setRouteInsights(routeInsightResp);
        setAirportInsights(airportInsightResp);
        setQuality(qualityResp);
      } catch (e) {
        setRouteData(null);
        setAirportData(null);
        setRouteInsights(null);
        setAirportInsights(null);
        setQuality(null);
        setError(e instanceof Error ? e.message : "Failed to load competition intelligence.");
      }
    };
    void load();
  }, [airport]);

  const why = useMemo(() => {
    if (!airportData?.metrics) return "No airport competition metrics for current filter.";
    return `${airportData.airport.iata} is ${airportData.metrics.competition_label} with ${airportData.metrics.active_carriers} active carriers and ${formatPercent(airportData.metrics.dominant_carrier_share)} dominant share in current slice.`;
  }, [airportData]);

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Carrier Competition Intelligence</p>
        <h1>Route and airport competition metrics</h1>
        <p>Backend-first concentration metrics with entrant pressure signals, confidence, and coverage caveats.</p>
      </section>

      <section className="panel">
        <h2>Airport filter</h2>
        <input value={airport} onChange={(e) => setAirport(e.target.value.toUpperCase())} className="airport-input mt-3" maxLength={3} />
      </section>

      {error ? <p className="status error">Competition intelligence error: {error}</p> : null}

      {routeData ? <MetadataNotice metadata={routeData.metadata} /> : null}

      {airportData ? (
        <section className="panel">
          <h2>Why this matters</h2>
          <p>{why}</p>
          <p className="muted mt-2">{airportData.intelligence_meta.coverage_summary}</p>
        </section>
      ) : null}

      {quality ? (
        <section className="panel">
          <h2>Trust layer</h2>
          <p>
            Total generated insights: {quality.total_insights_generated}. Suppressed low confidence: {quality.suppressed_low_confidence_count} (
            {quality.suppressed_rate_pct.toFixed(1)}%).
          </p>
          <p className="muted mt-2">
            Coverage rows: {quality.data_coverage_stats.route_competition_rows}. Confidence distribution: high{" "}
            {quality.confidence_distribution.high ?? 0}, medium {quality.confidence_distribution.medium ?? 0}, low{" "}
            {quality.confidence_distribution.low ?? 0}.
          </p>
        </section>
      ) : null}

      {airportInsights && airportInsights.insights.length > 0 ? (
        <section className="panel">
          <h2>Airport insight cards</h2>
          <div className="route-grid mt-4">
            {airportInsights.insights.map((insight, idx) => (
              <article className="route-card" key={`${insight.insight_label}-${idx}`}>
                <h3>{insight.insight_label}</h3>
                <p>{insight.explanation}</p>
                <p className="muted">Confidence: {insight.confidence}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {airportData?.metrics ? (
        <section className="panel">
          <h2>Airport competition profile</h2>
          <dl className="kv-grid mt-4">
            <div><dt>Label</dt><dd>{airportData.metrics.competition_label}</dd></div>
            <div><dt>Active carriers</dt><dd>{airportData.metrics.active_carriers}</dd></div>
            <div><dt>Dominant share</dt><dd>{formatPercent(airportData.metrics.dominant_carrier_share)}</dd></div>
            <div><dt>Concentration HHI</dt><dd>{airportData.metrics.carrier_concentration_hhi.toFixed(1)}</dd></div>
            <div><dt>Contested route share</dt><dd>{formatPercent(airportData.metrics.contested_route_share)}</dd></div>
            <div><dt>Confidence</dt><dd>{airportData.metrics.confidence}</dd></div>
          </dl>
        </section>
      ) : null}

      {routeData ? (
        <section className="panel">
          <h2>Route competition rows</h2>
          <p className="muted">{routeData.intelligence_meta.coverage_summary}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-orange-200">
                  <th className="py-2">Route</th>
                  <th className="py-2">Active carriers</th>
                  <th className="py-2">Dominant share</th>
                  <th className="py-2">HHI</th>
                  <th className="py-2">Entrant signal</th>
                  <th className="py-2">Label</th>
                  <th className="py-2">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {routeData.rows.map((row) => (
                  <tr key={`${row.route_key}-${row.year}-${row.month}`} className="border-b border-gray-100">
                    <td className="py-2 font-semibold">{row.route_key}</td>
                    <td className="py-2">{row.active_carriers}</td>
                    <td className="py-2">{formatPercent(row.dominant_carrier_share)}</td>
                    <td className="py-2">{row.carrier_concentration_hhi.toFixed(1)}</td>
                    <td className="py-2">{row.entrant_pressure_signal}</td>
                    <td className="py-2">{row.competition_label}</td>
                    <td className="py-2">{row.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {routeInsights && routeInsights.insights.length > 0 ? (
        <section className="panel">
          <h2>Route insight cards</h2>
          <p className="muted">
            Methodology: {routeInsights.intelligence_meta.methodology_version}. {routeInsights.intelligence_meta.coverage_summary}
          </p>
          <div className="mt-3 text-sm text-gray-700">
            <p>Generated insights: {routeInsights.generated_count}</p>
            <p>Suppressed (low confidence): {routeInsights.suppressed_low_confidence_count}</p>
            <p>
              Confidence distribution: high {routeInsights.confidence_distribution.high ?? 0}, medium{" "}
              {routeInsights.confidence_distribution.medium ?? 0}, low {routeInsights.confidence_distribution.low ?? 0}
            </p>
          </div>
          <div className="route-grid mt-4">
            {routeInsights.insights.map((insight, idx) => (
              <article className="route-card" key={`${insight.route_key}-${insight.insight_label}-${idx}`}>
                <h3>
                  {insight.route_key} · {insight.insight_label}
                </h3>
                <p>{insight.explanation}</p>
                <p className="muted">Confidence: {insight.confidence}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
