"use client";

import { useEffect, useMemo, useState } from "react";

import { MetadataNotice } from "@/components/MetadataNotice";
import { RouteChangesResponse, getRouteChanges } from "@/lib/api";
import { formatMonth } from "@/lib/format";

export default function RouteChangesPage() {
  const [airport, setAirport] = useState("JFK");
  const [changeType, setChangeType] = useState<string>("");
  const [data, setData] = useState<RouteChangesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        setData(
          await getRouteChanges({
            airport_iata: airport,
            change_type: changeType || undefined,
            limit: 100,
          }),
        );
      } catch (e) {
        setData(null);
        setError(e instanceof Error ? e.message : "Failed to load route changes intelligence.");
      }
    };
    void load();
  }, [airport, changeType]);

  const whyThisMatters = useMemo(() => {
    if (!data || data.events.length === 0) return "No events for current filters.";
    const launches = data.events.filter((e) => e.change_type === "launch").length;
    const cuts = data.events.filter((e) => e.change_type === "cut").length;
    const freq = data.events.filter((e) => e.change_type === "frequency_change").length;
    return `Observed ${launches} launches, ${cuts} cuts, and ${freq} major frequency changes in loaded data for this filter.`;
  }, [data]);

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Flagship Wedge · Route Competitiveness</p>
        <h1>Route change intelligence</h1>
        <p>Backend-supported event feed for launches, cuts, resumptions, and significant frequency moves.</p>
      </section>

      <section className="panel">
        <h2>Filters</h2>
        <div className="flex gap-3 mt-4 flex-wrap">
          <input value={airport} onChange={(e) => setAirport(e.target.value.toUpperCase())} className="airport-input" maxLength={3} />
          <select className="airport-select" value={changeType} onChange={(e) => setChangeType(e.target.value)}>
            <option value="">All change types</option>
            <option value="launch">Launch</option>
            <option value="cut">Cut</option>
            <option value="resume">Resume</option>
            <option value="frequency_change">Frequency change</option>
          </select>
        </div>
      </section>

      {error ? <p className="status error">Route changes error: {error}</p> : null}

      {data ? (
        <>
          <MetadataNotice metadata={data.metadata} />
          <section className="panel">
            <h2>Why this matters</h2>
            <p>{whyThisMatters}</p>
            <p className="muted mt-2">{data.intelligence_meta.coverage_summary}</p>
          </section>

          <section className="panel">
            <h2>Event feed</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-orange-200">
                    <th className="py-2">Period</th>
                    <th className="py-2">Route</th>
                    <th className="py-2">Change</th>
                    <th className="py-2">Δ Frequency</th>
                    <th className="py-2">Carrier</th>
                    <th className="py-2">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.map((event, idx) => (
                    <tr key={`${event.route_key}-${event.year}-${event.month}-${event.change_type}-${idx}`} className="border-b border-gray-100">
                      <td className="py-2">{formatMonth(event.year, event.month)}</td>
                      <td className="py-2 font-semibold">{event.route_key}</td>
                      <td className="py-2">{event.change_type}</td>
                      <td className="py-2">{event.frequency_delta ?? "N/A"}</td>
                      <td className="py-2">{event.dominant_carrier ?? "N/A"}</td>
                      <td className="py-2">{event.confidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
