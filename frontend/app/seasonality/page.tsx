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
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-orange-200">
                    <th className="py-3">Month</th>
                    <th className="py-3">Avg fare</th>
                    <th className="py-3">Seasonal index</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.month} className="border-b border-gray-100">
                      <td className="py-3 font-semibold">{MONTH_NAMES[row.month - 1]}</td>
                      <td className="py-3">{formatCurrency(row.average_fare_usd)}</td>
                      <td className="py-3 text-gray-700">{row.seasonal_index.toFixed(3)}</td>
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
