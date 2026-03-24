"use client";

import { useEffect, useState } from "react";
import { MetadataNotice } from "@/components/MetadataNotice";
import { AirportContextResponse, getAirportContext } from "@/lib/api";
import { formatLocation } from "@/lib/format";

const AIRPORTS = ["JFK", "LAX", "ATL", "DFW", "SFO"];

export default function AirportIntelligencePage() {
  const [selected, setSelected] = useState("JFK");
  const [data, setData] = useState<AirportContextResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const response = await getAirportContext(selected);
        setData(response);
      } catch (e) {
        setData(null);
        setError(e instanceof Error ? e.message : "Failed to load airport context.");
      }
    };
    void load();
  }, [selected]);

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Airport Intelligence</p>
        <h1>Airport context and outbound route signals</h1>
        <p>Inspect airport profile context and related route deal signals.</p>
      </section>

      <section className="panel">
        <h2>Select airport</h2>
        <div className="flex flex-wrap gap-2 mt-4">
          {AIRPORTS.map((iata) => (
            <button key={iata} type="button" className={`airport-button ${selected === iata ? "selected" : ""}`} onClick={() => setSelected(iata)}>
              {iata}
            </button>
          ))}
        </div>
      </section>

      {error ? <p className="status error">Airport intelligence error: {error}</p> : null}

      {data ? (
        <>
          <MetadataNotice metadata={data.metadata} />
          <section className="panel">
            <h2>
              {data.airport.iata} · {data.airport.airport_name}
            </h2>
            <p className="muted">{formatLocation(data.airport.city, data.airport.state, data.airport.country)}</p>
            <p className="mt-3">
              Latest enplanement: {data.latest_enplanement ? `${data.latest_enplanement.total_enplanements.toLocaleString()} (${data.latest_enplanement.year})` : "Not available in current mode"}
            </p>
          </section>

          <section className="panel">
            <h2>Related outbound routes</h2>
            <div className="route-grid">
              {data.related_routes.map((route) => (
                <article className="route-card" key={route.destination_iata}>
                  <h3>{route.destination_iata}</h3>
                  <p>{route.destination_airport_name}</p>
                  <p className="muted">Deal signal: {route.latest_deal_signal ?? "N/A"}</p>
                  <p className="muted">Route score: {route.latest_route_attractiveness_score ?? "N/A"}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
