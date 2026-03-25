"use client";

import { useEffect, useState } from "react";
import { MetadataNotice } from "@/components/MetadataNotice";
import { SeasonalityResponse, getSeasonalityIndex } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function SeasonalityPage() {
  const [data, setData] = useState<SeasonalityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        setData(await getSeasonalityIndex());
      } catch (e) {
        setData(null);
        setError(e instanceof Error ? e.message : "Failed to load seasonality index.");
      }
    };
    void load();
  }, []);

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Seasonality</p>
        <h1>Monthly pricing pattern explorer</h1>
        <p>Route-relative seasonality snapshots with caveat-first interpretation.</p>
      </section>
      <section className="panel">
        <p className="status">
          Demo-only surface: this module currently uses frontend mock API routes, not backend intelligence endpoints.
        </p>
      </section>

      {error ? <p className="status error">Seasonality error: {error}</p> : null}

      {data ? (
        <>
          <MetadataNotice metadata={data.metadata} />
          <section className="panel">
            <h2>Observed seasonal index</h2>
            <p className="muted">
              Baseline across loaded fares: <strong>{formatCurrency(data.baseline_average_fare_usd)}</strong>. Index &lt; 1.0 indicates below-route baseline pricing.
            </p>
            <div className="mt-6 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Avg fare</th>
                    <th>Seasonal index</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.month}>
                      <td className="font-semibold">{MONTH_NAMES[row.month - 1]}</td>
                      <td>{formatCurrency(row.average_fare_usd)}</td>
                      <td>{row.seasonal_index.toFixed(3)}</td>
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
