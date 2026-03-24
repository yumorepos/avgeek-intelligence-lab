"use client";

import { useEffect, useState } from "react";
import { getMethodology, MethodologyResponse } from "@/lib/api";

export default function LearnPage() {
  const [data, setData] = useState<MethodologyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        setData(await getMethodology());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load methodology.");
      }
    };
    void load();
  }, []);

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Learn</p>
        <h1>Methodology and trust framework</h1>
        <p>Understand what this project can and cannot claim.</p>
      </section>

      {error ? <p className="status error">Methodology error: {error}</p> : null}

      {data ? (
        <>
          {data.metadata ? <section className="panel"><p className="muted">Methodology source: {data.metadata.data_source} · Last refreshed: {data.metadata.last_refreshed_at ?? "unknown"}</p></section> : null}
          <section className="panel">
            <h2>Score version: {data.score_version}</h2>
            <div className="mt-4 space-y-2">
              {Object.entries(data.metric_descriptions).map(([k, v]) => (
                <p key={k}>
                  <strong>{k}:</strong> {v}
                </p>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>Caveats</h2>
            <ul className="list-disc pl-5 space-y-2 mt-4">
              {data.caveats.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <h2>Coverage notes</h2>
            <ul className="list-disc pl-5 space-y-2 mt-4">
              {data.source_coverage_notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </main>
  );
}
