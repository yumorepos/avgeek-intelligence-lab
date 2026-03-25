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
import { formatPercent, formatSystemLabel } from "@/lib/format";
import { resolveIntelligenceAirportDefaults } from "@/lib/airport-defaults";

export default function CompetitionIntelPage() {
  const [airport, setAirport] = useState("");
  const [routeData, setRouteData] = useState<RouteCompetitionResponse | null>(null);
  const [airportData, setAirportData] = useState<AirportCompetitionResponse | null>(null);
  const [routeInsights, setRouteInsights] = useState<RouteInsightsResponse | null>(null);
  const [airportInsights, setAirportInsights] = useState<AirportInsightsResponse | null>(null);
  const [quality, setQuality] = useState<InsightQualityResponse | null>(null);
  const [supportedAirports, setSupportedAirports] = useState<string[]>([]);
  const [readinessMessage, setReadinessMessage] = useState<string | null>(null);
  const [bootstrapComplete, setBootstrapComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      const defaults = await resolveIntelligenceAirportDefaults(12);
      setSupportedAirports(defaults.airports);
      setAirport(defaults.defaultAirport ?? "");
      setReadinessMessage(defaults.isReady ? null : defaults.reason ?? "Backend intelligence is not data-ready.");
      setBootstrapComplete(true);
    };
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!bootstrapComplete || !airport) return;

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
  }, [airport, bootstrapComplete]);

  const why = useMemo(() => {
    if (!airportData?.metrics) return "No airport competition metrics for current filter.";
    return `${airportData.airport.iata} is currently ${formatSystemLabel(airportData.metrics.competition_label)} with ${airportData.metrics.active_carriers} active carriers and ${formatPercent(airportData.metrics.dominant_carrier_share)} dominant share in the current slice.`;
  }, [airportData]);

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Carrier Competition Intelligence</p>
        <h1>Route and airport competition metrics</h1>
        <p>Backend-first concentration metrics with entrant pressure signals, confidence, and coverage context.</p>
      </section>

      <section className="panel">
        <h2>Airport filter</h2>
        <input value={airport} onChange={(e) => setAirport(e.target.value.toUpperCase())} className="airport-input mt-3" maxLength={3} />
      </section>

      {bootstrapComplete && supportedAirports.length > 0 ? (
        <section className="panel">
          <h2>Backend-supported airports</h2>
          <div className="flex flex-wrap gap-2 mt-3">
            {supportedAirports.map((code) => (
              <button
                key={code}
                type="button"
                className={`airport-button ${airport === code ? "selected" : ""}`}
                onClick={() => setAirport(code)}
              >
                {code}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {bootstrapComplete && !airport && readinessMessage ? (
        <section className="panel">
          <h2>Backend not data-ready</h2>
          <p className="status">{readinessMessage}</p>
          <p className="muted mt-2">
            Competition intelligence now boots only from backend-supported airports. No supported airports means required marts are missing or empty.
          </p>
        </section>
      ) : null}

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
          <div className="stats-grid">
            <article className="stat-card">
              <p className="stat-label">Generated insights</p>
              <p className="stat-value">{quality.total_insights_generated}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Suppressed (low confidence)</p>
              <p className="stat-value">{quality.suppressed_low_confidence_count}</p>
              <p className="stat-detail">{quality.suppressed_rate_pct.toFixed(1)}% of total</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Coverage rows</p>
              <p className="stat-value">{quality.data_coverage_stats.route_competition_rows}</p>
              <p className="stat-detail">Route competition rows in this run</p>
            </article>
          </div>
          <p className="muted mt-3">
            Confidence distribution: high {quality.confidence_distribution.high ?? 0}, medium {quality.confidence_distribution.medium ?? 0}, low{" "}
            {quality.confidence_distribution.low ?? 0}.
          </p>
        </section>
      ) : null}

      {airportInsights ? (
        <section className="panel">
          <h2>Airport insight cards</h2>
          {airportInsights.insights.length > 0 ? (
            <div className="route-grid mt-4">
              {airportInsights.insights.map((insight, idx) => (
                <article className="route-card" key={`${insight.insight_label}-${idx}`}>
                  <h3>{formatSystemLabel(insight.insight_label)}</h3>
                  <p>{insight.explanation}</p>
                  <p className="muted">Confidence: {insight.confidence}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted mt-4">Airport found, but no airport-level insights met publication thresholds for this slice.</p>
          )}
        </section>
      ) : null}

      {airportData ? (
        <section className="panel">
          <h2>Airport competition profile</h2>
          {airportData.metrics ? (
            <>
              <div className="stats-grid">
                <article className="stat-card">
                  <p className="stat-label">Competition class</p>
                  <p className="stat-value">{formatSystemLabel(airportData.metrics.competition_label)}</p>
                </article>
                <article className="stat-card">
                  <p className="stat-label">Active carriers</p>
                  <p className="stat-value">{airportData.metrics.active_carriers}</p>
                </article>
                <article className="stat-card">
                  <p className="stat-label">Dominant share</p>
                  <p className="stat-value">{formatPercent(airportData.metrics.dominant_carrier_share)}</p>
                </article>
              </div>
              <dl className="kv-grid mt-4">
                <div><dt>Concentration HHI</dt><dd>{airportData.metrics.carrier_concentration_hhi.toFixed(1)}</dd></div>
                <div><dt>Contested route share</dt><dd>{formatPercent(airportData.metrics.contested_route_share)}</dd></div>
                <div><dt>Confidence</dt><dd>{airportData.metrics.confidence}</dd></div>
                <div><dt>Raw label</dt><dd>{airportData.metrics.competition_label}</dd></div>
              </dl>
            </>
          ) : (
            <p className="muted mt-4">Airport found, but airport-level competition metrics are unavailable for the loaded slice.</p>
          )}
        </section>
      ) : null}

      {routeData ? (
        <section className="panel">
          <h2>Route competition rows</h2>
          <p className="muted">{routeData.intelligence_meta.coverage_summary}</p>
          {routeData.rows.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Active carriers</th>
                    <th>Dominant share</th>
                    <th>HHI</th>
                    <th>Entrant signal</th>
                    <th>Label</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {routeData.rows.map((row) => (
                    <tr key={`${row.route_key}-${row.year}-${row.month}`}>
                      <td className="font-semibold">{row.route_key}</td>
                      <td>{row.active_carriers}</td>
                      <td>{formatPercent(row.dominant_carrier_share)}</td>
                      <td>{row.carrier_concentration_hhi.toFixed(1)}</td>
                      <td>{row.entrant_pressure_signal}</td>
                      <td>{formatSystemLabel(row.competition_label)}</td>
                      <td>{row.confidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted mt-4">No route competition records found for the selected filter.</p>
          )}
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
                  {insight.route_key} · {formatSystemLabel(insight.insight_label)}
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
